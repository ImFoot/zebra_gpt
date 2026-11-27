import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeCity, sidewalkWidth } from './city.js';
import { makeCinematicRenderer } from './cinematic-renderer.js';
import { loadEnvironmentKit } from './environment-kit.js';
import { makeDowntownActivity } from './downtown-activity.js';
import { makeMaglevTerminal } from './maglev-terminal.js';
import { makeMaglevTraffic } from './maglev-traffic.js';
import { makeRunnerObstacles } from './runner-obstacles.js';
import { sampleSlide, slideCrossing, slideDuration } from './slide-stunt.js';
import { finishLap, lapBottleCount, loadBest, makeRecord, makeWinePickups, multiplierFor, saveBest, scoreFor } from './wine-pickups.js';
import { makeCourseScenery } from './course-scenery.js';
import { makeEffects } from './effects.js';
import { makePursuit } from './pursuit.js';
import { CodeRain } from './code-rain.js';
import { WetStreet } from './wet-street.js';
import { busRoof, chunkLength, crashMark, cruiseSpeed, districtAt, droneSectors, maglevEnd, maglevStart, roadWidth, routeAt, routeCenter, routeHeading, routeLength, runnerHazards, runnerLanes, stages, startingDistance, tunnelStart, wineMark } from './route.js';
import { loadRiders } from './riders.js';
import { createAudio } from './audio.js';
import './style.css';

const find = (id) => document.getElementById(id);
const ui = Object.fromEntries([
  'game', 'viewport', 'intro', 'start', 'load-error', 'mute', 'pause', 'hud', 'sector', 'distance', 'progress', 'hint', 'touch', 'loop-fade',
  'caption', 'speaker', 'line', 'panel', 'panel-label', 'panel-title', 'panel-detail', 'panel-action', 'flash',
  'health', 'pressure', 'boost', 'bottle-status', 'wine-status', 'rocket-status', 'wake-status', 'reticle', 'restart',
  'run-score', 'best-score', 'bottle-count', 'score-pop',
].map((id) => [id, find(id)]));

const clamp = THREE.MathUtils.clamp;
const damp = THREE.MathUtils.damp;
const ease = THREE.MathUtils.smoothstep;
const isFlooded = (s) => s >= maglevStart && s < maglevEnd;
const jumpDuration = .84;
const fullBurstSeconds = 1 / .26;
const meters = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const controls = new Map([
  ['KeyA', 'left'], ['ArrowLeft', 'left'], ['KeyD', 'right'], ['ArrowRight', 'right'],
  ['KeyS', 'slide'], ['ArrowDown', 'slide'], ['KeyW', 'jump'], ['ArrowUp', 'jump'], ['Space', 'jump'], ['KeyC', 'hero'],
  ['ShiftLeft', 'burst'], ['ShiftRight', 'burst'], ['KeyQ', 'bottle'], ['KeyE', 'wine'],
]);
const keyboard = new Set();
const touches = new Map();
const swipes = new Map();
const touchButtons = [...ui.touch.querySelectorAll('button')];
const moves = ['bottle', 'wine'];
const moveButtons = Object.fromEntries(moves.map((move) => [move, ui.touch.querySelector(`[data-control="${move}"]`)]));
const queuedMoves = new Set();
const audio = createAudio();
const preferStill = matchMedia('(prefers-reduced-motion: reduce)');
const narrow = matchMedia('(max-width: 600px)');
const touchScreen = navigator.maxTouchPoints > 0 || matchMedia('(any-pointer: coarse)').matches;
const compactGraphics = matchMedia('(pointer: coarse)').matches;
const spillOrigin = new THREE.Vector3();
const setpieceTime = 4.25;
const spillCue = 1.10;
const gamepad = { connected: false, steer: 0, jump: false, slide: false, hero: false, pause: false, burst: false, wine: false, bottle: false };
const opening = { at: startingDistance, lap: 0, travelled: 0 };
const lampPowers = {
  subway: [49, 36], ghostline: [58, 28], spillway: [78, 56],
  museum: [20, 24], factory: [62, 42], grid: [36, 32],
};

let state = 'loading';
let renderer;
let cinematic;
let riders;
let city;
let downtownActivity;
let terminal;
let maglev;
let obstacles;
let bottles;
let course;
let effects;
let pursuit;
let wetStreet;
let codeRain;
let scene;
let camera;
let fill;
let streetLamp;
let windowLight;
let key;
let upperSky;
let cameraTarget = new THREE.Vector3();
const bodyFocus = new THREE.Vector3();
const desiredCamera = new THREE.Vector3();
const desiredTarget = new THREE.Vector3();
const projectedTarget = new THREE.Vector3();
const districtHaze = new THREE.Color();
let muted = false;
let captionUntil = 0;
let scorePopUntil = 0;
let best = loadBest();
let savedBest = best;
let bestWrittenAt = -Infinity;
let checkpoint = opening;
let queuedJump = false;
let queuedSlide = false;
let queuedLane = 0;
let queuedBurst = false;
let run;
let lastFrame = 0;
let clock = 0;
let renderScale = 1;
let slowFrames = 0;
let weatherQuality = touchScreen ? 'low' : 'medium';

function clearControls() {
  keyboard.clear();
  touches.clear();
  swipes.clear();
  queuedMoves.clear();
  paintTouchControls();
  queuedJump = false;
  queuedSlide = false;
  queuedLane = 0;
  queuedBurst = false;
}

function paintTouchControls() {
  const pressed = new Set(touches.values());
  for (const button of touchButtons) button.toggleAttribute('data-held', pressed.has(button.dataset.control));
}

function releaseTouch(event) {
  swipes.delete(event.pointerId);
  if (touches.delete(event.pointerId)) paintTouchControls();
}

function pressing(action) {
  for (const code of keyboard) if (controls.get(code) === action) return true;
  for (const control of touches.values()) if (control === action) return true;
  return false;
}

function showCaption(speaker, line, seconds) {
  ui.speaker.textContent = speaker;
  ui.line.textContent = line;
  ui.caption.hidden = false;
  captionUntil = run.time + seconds;
}

function showScore(message, duration, perfect = false) {
  if (ui['score-pop'].hasAttribute('data-perfect') && run.time < scorePopUntil && !perfect) return;
  ui['score-pop'].textContent = message;
  ui['score-pop'].toggleAttribute('data-perfect', perfect);
  ui['score-pop'].hidden = false;
  scorePopUntil = run.time + duration;
}

function updateBest(force = false) {
  best = Math.max(best, scoreFor(run));
  const now = performance.now();
  if (best > savedBest && (force || now - bestWrittenAt > 1500)) {
    saveBest(best);
    savedBest = best;
    bestWrittenAt = now;
  }
}

function saveCheckpoint(at) {
  checkpoint = { at, lap: run.lap, travelled: run.travelled + at - run.s, record: { ...run.record } };
}

function startChase(location = opening) {
  checkpoint = location;
  const { at, lap, travelled } = location;
  const fullRestart = location === opening;
  const time = fullRestart ? 0 : run.time;
  run = {
    s: at, x: 0, steer: 0, laneTarget: null, speed: fullRestart ? 0 : cruiseSpeed, jump: 0, jumpAt: -1, slide: 0, slideAt: -1, time, wineAt: -1,
    spilled: at > wineMark, grazeUntil: -1, hurtUntil: -1, rocketStunUntil: -1, hero: 0,
    mounted: fullRestart ? 0 : 1, section: districtAt(at), pressure: .095, boost: 1,
    health: 1, lap, travelled, loopAt: -1, bursting: false, burstUntil: -1, waterLanding: false, waterLandingAt: -Infinity,
    slideCrossing: .47, driftSide: 1, skidSprayAt: -Infinity,
    deck: null, jumpBase: 0, jumpPeak: 1.33, jumpSpan: jumpDuration, fallAt: -1,
    record: makeRecord(location.record), bestToBeat: best,
  };
  if (!fullRestart) {
    run.record.clean = false;
    run.record.streak = 0;
  }
  pursuit.reset();
  maglev.reset();
  obstacles.reset();
  bottles.reset(at);
  effects.skid.reset();
  state = 'running';
  clearControls();
  ui.intro.hidden = true;
  ui.panel.hidden = true;
  ui.hud.hidden = false;
  ui.caption.hidden = true;
  ui['score-pop'].hidden = true;
  ui['score-pop'].removeAttribute('data-perfect');
  scorePopUntil = time;
  ui.pause.hidden = false;
  ui.pause.textContent = 'Pause';
  ui.restart.hidden = true;
  ui.pause.blur();
  ui['panel-action'].blur();
  ui.flash.style.opacity = 0;
  ui['loop-fade'].style.opacity = 0;
  audio.start();
  updateHUD();
  updateScene(0, true);
  if (fullRestart) showCaption('ZEBRA', 'Are we escaping or are you getting in?', 3.6);
  else showCaption('ZEBRA', `${districtAt(at).name}. Take a breath. We’re moving.`, 3.2);
}

function showPanel(label, title, detail, action) {
  ui['panel-label'].textContent = label;
  ui['panel-title'].textContent = title;
  ui['panel-detail'].textContent = detail;
  ui['panel-action'].textContent = action;
  ui.panel.hidden = false;
  ui['panel-action'].focus({ preventScroll: true });
  audio.rest();
}

function pause() {
  if (state !== 'running') return;
  updateBest(true);
  state = 'paused';
  city.stopScreens(preferStill.matches);
  clearControls();
  ui.restart.hidden = false;
  ui.reticle.hidden = true;
  ui.pause.textContent = 'Resume';
  showPanel('CONTINUUM CHASE', 'Paused', 'Your place on the route is saved.', 'Resume chase');
}

function resume() {
  state = 'running';
  clearControls();
  ui.panel.hidden = true;
  ui.restart.hidden = true;
  ui.pause.textContent = 'Pause';
  audio.start();
}

function togglePause() {
  if (state === 'paused') resume();
  else pause();
}

function finish() {
  updateBest(true);
  state = 'caught';
  city.stopScreens(preferStill.matches);
  clearControls();
  ui.pause.hidden = true;
  ui.caption.hidden = true;
  ui['score-pop'].hidden = true;
  ui.reticle.hidden = true;
  ui.restart.hidden = checkpoint === opening;
  ui.flash.style.opacity = 0;
  audio.play('signal', .27, .65);
  const { record } = run;
  const detail = `${meters.format(scoreFor(run))} points · ${meters.format(best)} best · ${record.bottles} bottles · ${record.longest} longest streak`;
  showPanel(scoreFor(run) > run.bestToBeat ? 'NEW PERSONAL BEST' : 'CONTINUUM SECURITY', 'Intercepted',
    record.perfects ? `${detail} · ${record.perfects} perfect laps` : detail, 'Ride again');
}

function activatePanel() {
  if (state === 'paused') resume();
  else if (state === 'caught') startChase();
}

function updateHUD() {
  const { name: district } = run.section;
  ui.sector.textContent = run.lap ? `${district} · Lap ${run.lap + 1}` : district;
  ui.distance.textContent = `${meters.format(run.travelled)} m`;
  updateBest();
  ui['run-score'].textContent = meters.format(scoreFor(run));
  ui['best-score'].textContent = meters.format(best);
  ui['best-score'].toggleAttribute('data-record', run.bestToBeat > 0 && scoreFor(run) > run.bestToBeat);
  ui['bottle-count'].textContent = `${run.record.lapBottles}/${lapBottleCount}`;
  if (run.time >= scorePopUntil) ui['score-pop'].hidden = true;
  ui.progress.style.transform = `scaleX(${run.s / routeLength})`;
  ui.health.value = run.health;
  ui.pressure.value = run.pressure;
  ui.boost.value = run.boost;
  for (const move of moves) {
    const remainingCharge = pursuit.status(move, run.time);
    const label = move === 'bottle' ? 'Bottle' : 'Wine slick';
    const indicator = ui[`${move}-status`];
    indicator.textContent = remainingCharge ? `${label} ${remainingCharge.toFixed(1)}s` : `${label} ready`;
    indicator.toggleAttribute('data-cooling', remainingCharge > 0);
    moveButtons[move].toggleAttribute('data-cooling', remainingCharge > 0);
  }
  const firstCar = run.s > 86 && run.s < runnerHazards[0].at;
  ui['rocket-status'].hidden = !pursuit.warning;
  const wake = maglev.warning;
  ui['wake-status'].hidden = !wake;
  if (wake) {
    const warning = `Train wake from ${wake < 0 ? 'left' : 'right'} · jump or steer`;
    if (ui['wake-status'].textContent !== warning) ui['wake-status'].textContent = warning;
  }
  ui.game.toggleAttribute('data-bursting', run.bursting);
  ui.game.toggleAttribute('data-sliding', run.slide > .6);
  const target = obstacles.target || pursuit.target;
  const hazard = obstacles.upcoming;
  ui.hint.textContent = pursuit.warning ? '' : hazard?.kind === 'bus' && !run.deck ? 'Bus ahead · jump onto the roof' : hazard?.dodge === 'slide' ?
    'Low clearance · slide or steer' : target ? (gamepad.connected ? 'Target locked · A to fire' : touchScreen ? 'Target locked · tap Fire' : 'Target locked · Q to fire') :
    hazard || firstCar ? 'Traffic ahead · jump or change lanes' : run.s < 88 ? 'Collect the wine bottles to build your score' : '';
  if (run.time >= captionUntil) ui.caption.hidden = true;
}

function readGamepad() {
  const pad = Array.from(navigator.getGamepads?.() || []).find(Boolean);
  if (gamepad.connected !== Boolean(pad)) {
    gamepad.connected = Boolean(pad);
    ui.game.classList.toggle('has-gamepad', gamepad.connected);
  }
  const axis = pad?.axes[0] ?? 0;
  gamepad.steer = (Math.abs(axis) > .16 ? axis : 0) + Number(pad?.buttons[15]?.pressed ?? false) - Number(pad?.buttons[14]?.pressed ?? false);
  const vertical = pad?.axes[1] ?? 0;
  const jump = vertical < (gamepad.jump ? -.34 : -.62) || Boolean(pad?.buttons[12]?.pressed);
  const slide = vertical > (gamepad.slide ? .34 : .62) || Boolean(pad?.buttons[13]?.pressed);
  if (state === 'running') {
    if (jump && !gamepad.jump) queuedJump = true;
    if (slide && !gamepad.slide) queuedSlide = true;
  }
  gamepad.jump = jump;
  gamepad.slide = slide;
  gamepad.hero = pad?.buttons[11]?.pressed ?? false;
  const burst = pad?.buttons[1]?.pressed ?? false;
  if (burst && !gamepad.burst && state === 'running') queuedBurst = true;
  gamepad.burst = burst;
  for (const [move, index] of [['bottle', 0], ['wine', 2]]) {
    const pressed = pad?.buttons[index]?.pressed ?? false;
    if (pressed && !gamepad[move] && state === 'running') queuedMoves.add(move);
    gamepad[move] = pressed;
  }
  const menu = pad?.buttons[9]?.pressed ?? false;
  if (menu && !gamepad.pause) togglePause();
  gamepad.pause = menu;
}

function takeDamage(amount) {
  if (run.time < run.hurtUntil) return false;
  run.health = Math.max(0, run.health - amount);
  run.hurtUntil = run.time + .77;
  run.record.clean = false;
  run.record.streak = 0;
  return true;
}

function loopRoute() {
  const count = run.record.lapBottles;
  const perfect = finishLap(run.record);
  run.lap++;
  run.s = startingDistance;
  run.section = districtAt(run.s);
  run.wineAt = run.jumpAt = run.slideAt = -1;
  run.spilled = false;
  run.jump = run.slide = 0;
  run.deck = null;
  run.fallAt = -1;
  run.skidSprayAt = -Infinity;
  run.laneTarget = null;
  run.hero = 0;
  run.loopAt = run.time;
  run.pressure = Math.max(run.pressure * .58, Math.min(.32, .095 + run.lap * .034));
  saveCheckpoint(run.s);
  pursuit.reset();
  maglev.reset();
  obstacles.reset();
  bottles.reset(run.s);
  effects.skid.reset();
  audio.play('whoosh', .38, .75);
  audio.play('signal', .19, .86, .12);
  showCaption('ZEBRA', 'Same city. Faster bikes. Of course.', 2.5);
  if (perfect) {
    showScore('PERFECT LAP · +10,000', 3.1, true);
    audio.pickup(1, true);
  } else showScore(`LAP COMPLETE · ${count}/${lapBottleCount} BOTTLES`, 2.4);
}

function simulate(dt) {
  run.time += dt;
  run.waterLanding = false;
  if (run.mounted < 1) {
    run.mounted = Math.min(1, run.mounted + dt / 1.65);
    updateHUD();
    updateScene(dt);
    return;
  }
  const previous = run.s;
  const wineAge = run.wineAt < 0 ? -1 : run.time - run.wineAt;
  const wineShot = wineAge >= 0 && wineAge < setpieceTime;
  const timeScale = wineShot ? .30 + .70 * ease(wineAge, 3.3, setpieceTime) : 1;
  const step = dt * timeScale;
  const directional = clamp(Number(pressing('right')) - Number(pressing('left')) + gamepad.steer, -1, 1);
  if (queuedLane) {
    const lane = Math.round((run.laneTarget ?? run.x) / runnerLanes[2]) + 1;
    run.laneTarget = runnerLanes[clamp(lane + queuedLane, 0, runnerLanes.length - 1)];
  }
  queuedLane = 0;
  if (directional) run.laneTarget = null;
  const steer = run.laneTarget === null ? directional : clamp((run.laneTarget - run.x) * .62, -1, 1);
  if (queuedBurst && run.time >= run.burstUntil && run.boost >= .025) {
    run.burstUntil = run.time + fullBurstSeconds * run.boost;
    run.boost = 0;
    audio.play('whoosh', .43, .78);
  }
  queuedBurst = false;
  const bursting = run.time < run.burstUntil;
  if (!bursting) run.boost = Math.min(1, run.boost + dt * .09);
  const slowdown = 6.2 * (1 - ease(run.time, run.grazeUntil - .72, run.grazeUntil));
  const cruisingSpeed = cruiseSpeed + Number(bursting) * 7.6;
  run.speed = damp(run.speed, Math.max(3, cruisingSpeed - slowdown), 3.65, step);
  run.bursting = bursting;
  run.steer = damp(run.steer, steer, 13, dt);
  const laneSpeed = 3.05 + Math.min(run.speed, cruiseSpeed) * .15;
  if (run.laneTarget === null) run.x = clamp(run.x + run.steer * step * laneSpeed, -5.7, 5.7);
  else run.x += clamp(run.laneTarget - run.x, -step * laneSpeed * 1.5, step * laneSpeed * 1.5);
  run.s = Math.min(routeLength, run.s + run.speed * step);
  run.travelled += run.s - previous;
  const roof = obstacles.roofAt(run.s, run.x);
  if (run.deck && run.deck !== roof) {
    run.deck = null;
    run.fallAt = run.time;
  }
  if (run.slideAt >= 0 && run.time - run.slideAt >= slideDuration) run.slideAt = -1;
  const actionReady = run.jumpAt < 0 && run.slideAt < 0 && run.fallAt < 0 && !wineShot;
  if (queuedJump && actionReady) {
    const bus = run.deck || obstacles.busAhead(run.s, run.x);
    run.jumpBase = run.deck ? busRoof : 0;
    run.jumpPeak = bus && !run.deck ? 2.74 : 1.33;
    run.jumpSpan = bus && !run.deck ? .77 : jumpDuration;
    run.deck = null;
    run.jumpAt = run.time;
    audio.hoof(.43, .84);
  } else if (queuedSlide && actionReady && !run.deck) {
    run.slideAt = run.time;
    run.slideCrossing = slideCrossing(obstacles.slideDistance(run), run.speed);
    run.driftSide = run.x < -.1 ? 1 : -1;
    audio.play('skid', .29, 1.21);
    audio.play('whoosh', .19, 1.12, .06);
  }
  queuedJump = queuedSlide = false;
  const slideAge = run.time - run.slideAt;
  run.slide = run.slideAt < 0 ? 0 : ease(slideAge, 0, .13) * (1 - ease(slideAge, slideDuration - .21, slideDuration));
  const previousHeight = run.jump;
  const jumpAge = run.jumpAt < 0 ? 0 : (run.time - run.jumpAt) / run.jumpSpan;
  const fallAge = run.fallAt < 0 ? 0 : (run.time - run.fallAt) / .43;
  if (run.jumpAt >= 0) run.jump = Math.max(0, (1 - jumpAge) * (run.jumpBase + 4 * jumpAge * run.jumpPeak));
  else if (run.fallAt >= 0) run.jump = Math.max(0, busRoof * (1 - fallAge * fallAge));
  else run.jump = run.deck ? busRoof : 0;
  if (roof && jumpAge > .50 && previousHeight >= busRoof && run.jump <= busRoof) {
    run.deck = roof;
    run.jump = busRoof;
    run.jumpAt = -1;
    audio.play('metal', .31, 1.25);
  } else if (jumpAge >= 1 || fallAge >= 1) {
    run.jumpAt = run.fallAt = -1;
    run.waterLanding = isFlooded(run.s);
    if (run.waterLanding) run.waterLandingAt = run.time;
    audio.hoof(.53, .73);
  }

  const obstacle = obstacles.update(run, previous, preferStill.matches);
  if (obstacle && takeDamage(obstacle.kind === 'sentry' ? .19 : .16)) {
    run.speed *= .68;
    run.pressure += .26;
    run.grazeUntil = run.time + .59;
    audio.play('metal', .63, .82);
    showCaption('ZEBRA', obstacle.dodge === 'slide' ? 'Duck. That’s a verb, Stan.' : 'Apparently I’m also a stunt horse.', 2.0);
  }
  for (const move of queuedMoves) {
    if (!wineShot && pursuit.request(move, run.time)) {
      showCaption('STAN', move === 'bottle' ? 'A robust finish, with notes of rotor.' : 'Best served on asphalt.', 1.9);
    }
  }
  queuedMoves.clear();
  const combat = pursuit.tick(step, run, riders.glass, preferStill.matches, obstacles.target);
  if (combat.released === 'bottle') audio.play('whoosh', .34, 1.24);
  if (combat.released === 'wine') audio.play('splash', .46);
  if (combat.bottleHit) audio.play('glass', .57);
  if (combat.sentryHit) {
    audio.play('metal', .39, 1.27);
    showCaption('ZEBRA', 'Inspection failed.', 1.8);
  }
  if (combat.rocketLock) audio.play('alert', .26, 1.05);
  if (combat.rocketLaunch) audio.play('whoosh', .56, .69);
  if (combat.rocketImpact) {
    audio.play('boom', .61, .91);
    audio.play('metal', .22, 1.17, .03);
  }
  if (run.s > 95 && run.s < tunnelStart) {
    const rate = bursting ? -.15 : run.speed < cruiseSpeed * .61 ? .102 : run.speed < cruiseSpeed * .86 ? .031 : -.026;
    run.pressure += step * (rate + (pursuit.hasDrone ? .038 : 0));
  }
  if (combat.droneHit || combat.bikeHit) {
    run.pressure -= combat.droneHit ? .29 : .22;
    showCaption('ZEBRA', combat.droneHit ? 'Drone down.' : 'Bike down. Nice aim, technically.', 2.1);
    if (combat.bikeHit) audio.play('skid', .58);
    if (combat.droneHit) audio.play('metal', .31, 1.14);
  }
  if (combat.crashImpact) {
    audio.play('boom', .83, .70);
    audio.play('metal', .62, .87, .048);
    audio.play('skid', .32, .78, .14);
  }
  if (combat.rocketDamage && takeDamage(combat.rocketDamage)) {
    run.pressure += .13;
    if (combat.rocketDirect) {
      run.speed *= .83;
      run.rocketStunUntil = run.time + .38;
    }
    showCaption('ZEBRA', combat.rocketDirect ? 'That one hit. I felt it.' : 'That one was a little close.', 1.65);
  }
  if (run.pressure >= .98 && pursuit.bikes.some((bike) => bike.object.visible && !bike.skid && run.s - bike.distance < 6.5) && takeDamage(.12)) {
    run.pressure -= .24;
    audio.play('metal', .48, .91);
    showCaption('ZEBRA', 'They’re on our tail. Burst!', 1.45);
  }
  const transit = maglev.update(step, run, previous, preferStill.matches);
  if (transit.train) audio.play('maglev', .75, 1.16, 0, transit.train * .68);
  if (transit.wave) audio.play('wake', .59, 1, 0, transit.wave * .34);
  if (transit.damage && takeDamage(transit.damage)) {
    run.speed *= .78;
    run.grazeUntil = run.time + .43;
    audio.play('splash', .71, .80);
    showCaption('ZEBRA', 'Dry seats were an upgrade.', 2.0);
  }
  const award = bottles.take(run, previous, preferStill.matches);
  if (award) {
    const multiplier = multiplierFor(run.record.streak);
    showScore(`+${meters.format(award)}${multiplier > 1 ? ` · ×${multiplier} STREAK` : ' · BOTTLE'}`, .79);
    audio.pickup(run.record.streak);
  }

  const crossed = (mark) => previous < mark && run.s >= mark;
  if (crossed(59)) showCaption('CONTINUUM SECURITY', 'Unresolved narrative inconsistency detected.', 2.6);
  if (crossed(95)) showCaption('ZEBRA', 'Bike behind us. If you’re going to be sick, make it count.', 3.6);
  if (crossed(droneSectors[0][0])) {
    showCaption('STAN', 'A drone. Hold my glass. I have a worse idea.', 3.6);
    audio.play('signal', .23, .83);
  }
  if (crossed(901)) showCaption('STAN', 'ZEBRA!! Not that way!', 2.2);
  if (crossed(941)) showCaption('ZEBRA', 'You haven’t told me which way!', 2.6);
  if (crossed(1160)) showCaption('CURATOR DRONE', 'Your escape has been selected for further optimization.', 3.7);
  if (run.wineAt < 0 && !run.spilled && run.s >= wineMark && run.slideAt < 0) run.wineAt = run.time;
  if (wineAge >= 1.83 && wineAge - dt < 1.83) showCaption('STAN', 'That was a very respectable cabernet.', 3.2);
  if (crossed(crashMark)) {
    showCaption('CURATOR SYSTEM', 'Pursuit interrupted. Your target may violate our guidelines.', 4.65);
    run.pressure *= .48;
    audio.play('skid', .62);
    audio.play('metal', .45, .83, .36);
  }
  if (crossed(3210)) showCaption('ZEBRA', 'Tunnel. Please tell me this one is real.', 4.1);
  if (crossed(3330)) showCaption('KEVIN', 'They’re still revising my orders. Keep going.', 2.8);
  const section = districtAt(run.s);
  if (section !== run.section) {
    run.section = section;
    const at = section.at + startingDistance;
    saveCheckpoint(at);
    showCaption(section.speaker ?? section.name.toUpperCase(), section.line ?? 'Checkpoint reached', 2.85);
    audio.play('signal', .25, 1.34);
  }
  run.pressure = clamp(run.pressure, .03, 1);
  ui.flash.style.opacity = preferStill.matches ? 0 : Math.max(0, (run.hurtUntil - run.time - .35) * .76);
  const looping = run.s >= routeLength && run.health > 0;
  if (looping) loopRoute();
  ui['loop-fade'].style.opacity = run.s > routeLength - 10 ? ease(run.s, routeLength - 10, routeLength) :
    run.loopAt < 0 ? 0 : 1 - ease(run.time, run.loopAt, run.loopAt + .39);
  updateHUD();
  updateScene(step, looping);
  if (run.health <= 0) finish();
}

function updateScene(dt, snap = false) {
  const intro = state === 'ready' || state === 'loading';
  const s = intro ? startingDistance : run.s;
  const x = intro ? 0 : run.x;
  const speed = intro ? 0 : run.speed;
  const age = intro || run.wineAt < 0 ? -1 : run.time - run.wineAt;
  const toast = age < 0 ? 0 : ease(age, 0, 1.05) * (1 - ease(age, 2.7, setpieceTime));
  const heroShot = age < 0 ? 0 : ease(age, 0, .55) * (1 - ease(age, 3.23, setpieceTime));
  const mountShot = intro ? 0 : 1 - ease(run.mounted, .52, 1);
  const hero = !intro && state === 'running' && (pressing('hero') || gamepad.hero) ? 1 : Math.max(heroShot, mountShot);
  const jump = intro ? 0 : run.jump;
  const deckHeight = !intro && run.deck ? busRoof : 0;
  const slide = intro ? 0 : run.slide;
  const vault = sampleSlide(!intro && run.slideAt >= 0 ? run.time - run.slideAt : 0, intro ? .47 : run.slideCrossing);
  city.update(s, preferStill.matches);
  course.update(s, clock, preferStill.matches);
  terminal.update(s, clock, preferStill.matches);
  downtownActivity.update(dt, s, intro, preferStill.matches);
  const district = districtAt(s);
  bottles.draw(s, intro ? clock : run.time, preferStill.matches);
  effects.rain(dt, s, speed, district.id === 'spillway' ? .17 : undefined);
  codeRain.object.visible = s < maglevStart + 3;
  if (codeRain.object.visible) codeRain.update(dt, s);
  wetStreet.update(dt, s, district.id === 'museum' ? .38 : 1);
  routeAt(s - .13, x, deckHeight + .018, effects.shadow.position);
  effects.shadow.rotation.z = routeHeading(s);
  effects.shadow.material.opacity = Math.max(.05, .47 - (jump - deckHeight) * .22);
  routeAt(s + 1.55, x + 2.2, 3.05 + deckHeight * .62, fill.position);
  const lampDistance = 6 + Math.round((s - 6) / 12) * 12;
  const [leftPower, rightPower] = lampPowers[district.id] ?? [80, 89];
  routeAt(lampDistance, -6.85, 4.38, streetLamp.position);
  streetLamp.color.set(district.lamp);
  streetLamp.intensity = leftPower * (1 - ease(Math.abs(lampDistance - s), 3.5, 6));
  routeAt(lampDistance + 5.7, 7.45, 3.86, windowLight.position);
  windowLight.color.set(district.accent);
  windowLight.intensity = rightPower * (1 - ease(Math.abs(lampDistance + 5.7 - s), 7.9, 12));
  routeAt(s, x, .9, key.target.position);
  routeAt(s + 4.1, x - 4.85, 7.4, key.position);
  districtHaze.set(district.fog);
  scene.fog.color.lerp(districtHaze, snap ? 1 : 1 - Math.exp(-3.6 * dt));
  upperSky.material.uniforms.haze.value.copy(scene.fog.color);
  if (!riders) return;

  routeAt(s, x, deckHeight, riders.mount.position);
  riders.mount.rotation.y = routeHeading(s) + (intro ? -.05 : -run.steer * .15);
  const flooded = !intro && isFlooded(s);
  const impact = !flooded ? 0 : run.jumpAt >= 0 ? ease(run.time - run.jumpAt, jumpDuration * .76, jumpDuration) :
    1 - ease(run.time - run.waterLandingAt, .015, .15);
  const contacts = riders.pose({
    dt, time: clock, speed, steer: intro ? 0 : run.steer, jump: jump - deckHeight, slide, driftSide: intro ? 1 : run.driftSide, vault, toast,
    spilled: wineShotActive(age) && run.spilled,
    mounted: intro ? 1 : run.mounted, action: intro ? null : pursuit.action(run.time),
    recoil: intro ? 0 : ease(run.rocketStunUntil - run.time, 0, .38),
    water: flooded && !preferStill.matches && run.jumpAt < 0,
    landing: !intro && run.waterLanding,
    impact,
  });
  if (!intro) {
    const drone = pursuit.drone;
    audio.update({
      speed: speed / cruiseSpeed, bursting: run.bursting, tunnel: s > tunnelStart && s < maglevEnd,
      drone: drone && {
        level: .39 * (1 - ease(Math.abs(s + drone.z), 10, 48)),
        pan: clamp((drone.x - riders.mount.position.x) * .16, -.75, .75),
      },
    });
    if (run.jumpAt < 0 && run.fallAt < 0) for (let index = 0; index < contacts; index++) {
      if (deckHeight) audio.play('metal', .12, 1.32);
      else audio.hoof(contacts > 1 ? .23 : .31, wineShotActive(age) ? .79 : 1);
    }
    if (flooded) {
      for (const { strikePoint, left } of riders.hoofContacts) maglev.hoof(strikePoint, run.time, left ? -1 : 1, run.waterLanding, speed);
      if (run.waterLanding) audio.play('splash', .32, 1.09);
      else if (contacts && run.jumpAt < 0) audio.play('splash', .12, 1.32);
    }
    const wetSkid = flooded || s < tunnelStart || district.id === 'spillway';
    if (!preferStill.matches && slide > .64 && run.time - run.skidSprayAt > .049) {
      const yaw = routeHeading(s);
      for (const { strikePoint, left } of riders.skidHooves) {
        if (wetSkid) maglev.skid(strikePoint, run.time, left ? -1 : 1, speed);
        effects.skid.emit(strikePoint, run.time, yaw, speed, wetSkid);
      }
      run.skidSprayAt = run.time;
    }
    if (run.time - run.skidSprayAt < 1.25) effects.skid.draw(run.time);
    if (flooded || run.time - run.skidSprayAt < 1.25) maglev.draw(run.time);
  }
  if (age >= spillCue && !run.spilled) {
    riders.glass.getWorldPosition(spillOrigin);
    spillOrigin.y += .11;
    run.spilled = true;
    audio.play('splash', .4, .83);
  }
  effects.spill(age < spillCue ? -1 : age - spillCue, spillOrigin);

  if (intro) {
    const drift = preferStill.matches ? 0 : Math.sin(clock * .49) * .18;
    routeAt(s + (narrow.matches ? 6.8 : 4.65), 3.35 + drift, 1.69, desiredCamera);
    routeAt(s - .24, narrow.matches ? .0 : 1.39, narrow.matches ? 1.02 : 1.48, desiredTarget);
  } else {
    const step = wineShotActive(age) ? Math.max(dt / .25, dt) : dt;
    run.hero = snap ? hero : damp(run.hero, hero, 5.7, step);
    const chaseHeight = narrow.matches ? 3.75 : 3.51;
    const frameVault = ease(vault.rise, .02, 2.89);
    const swing = preferStill.matches ? 0 : frameVault * (.68 + x * .21);
    routeAt(s - (narrow.matches ? 7.4 : 6.5) - frameVault * .48, (narrow.matches ? x * .95 + .18 : x * .82 + .33) - swing,
      chaseHeight + jump * .49 - slide * .22 + frameVault * .37, desiredCamera);
    routeAt(s + 7.35, x * (narrow.matches ? .88 + frameVault * .10 : .66 + frameVault * .25),
      1.20 + jump * .28 - slide * .18 + frameVault * 1.17, desiredTarget);
    routeAt(s + 2.74, x + 3.55 - mountShot * 1.05, 1.94 + jump, bodyFocus);
    desiredCamera.lerp(bodyFocus, run.hero);
    routeAt(s - .35, x + .13 - mountShot * .72, 1.92 + jump - mountShot * .28 + frameVault * .61, bodyFocus);
    desiredTarget.lerp(bodyFocus, run.hero);
    const kick = preferStill.matches ? 0 : pursuit.crashKick * (1 - run.hero);
    desiredCamera.y += .15 * kick;
    desiredTarget.x += .13 * kick;
    desiredTarget.y -= .08 * kick;
  }
  if (snap || intro) {
    camera.position.copy(desiredCamera);
    cameraTarget.copy(desiredTarget);
  } else {
    // Follow the longitudinal route immediately and ease the lateral movement independently.
    camera.position.x = damp(camera.position.x, desiredCamera.x, 12, Math.max(dt, .009));
    camera.position.y = damp(camera.position.y, desiredCamera.y, 11, Math.max(dt, .009));
    camera.position.z = desiredCamera.z;
    cameraTarget.copy(desiredTarget);
  }
  camera.lookAt(cameraTarget);
  camera.updateMatrixWorld();
  updateReticle(intro ? null : pursuit.target || obstacles.target?.position);
}

function updateReticle(target) {
  const marker = ui.reticle;
  if (!target || state !== 'running') {
    marker.hidden = true;
    return;
  }
  projectedTarget.copy(target).project(camera);
  marker.hidden = Math.abs(projectedTarget.x) > .92 || Math.abs(projectedTarget.y) > .88 || projectedTarget.z > 1 || projectedTarget.z < -1;
  if (!marker.hidden) {
    marker.style.left = `${(projectedTarget.x + 1) * 50}%`;
    marker.style.top = `${(1 - projectedTarget.y) * 50}%`;
  }
}

function wineShotActive(age) {
  return age >= 0 && age < setpieceTime;
}

function configureScene() {
  renderer = new THREE.WebGLRenderer({ canvas: ui.viewport, antialias: true, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  renderer.setClearColor(0x102824);
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x162d2b, .0126);
  scene.background = new THREE.Color(0x111c24);
  camera = new THREE.PerspectiveCamera(53, 1, .06, 235);
  upperSky = new THREE.Mesh(new THREE.SphereGeometry(205, 30, 16), new THREE.ShaderMaterial({
    uniforms: { haze: { value: new THREE.Color(0x162d2b) } },
    vertexShader: `varying vec3 direction;
      void main() {
        direction = normalize(position);
        vec3 view = mat3(viewMatrix) * position;
        vec4 clip = projectionMatrix * vec4(view, 1.0);
        gl_Position = vec4(clip.xy, clip.w * .9999, clip.w);
      }`,
    fragmentShader: `varying vec3 direction; uniform vec3 haze;
      void main() {
        float high = smoothstep(-.04, .66, direction.y);
        float horizon = exp(-max(0.0, direction.y) * 8.8);
        vec3 color = mix(haze * (1.18 + .28 * horizon), vec3(.006, .009, .022), high);
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide, depthWrite: false,
  }));
  upperSky.frustumCulled = false;
  upperSky.renderOrder = -100;
  scene.add(upperSky);
  const sky = new THREE.HemisphereLight(0x84b4be, 0x333134, 1.06);
  key = new THREE.DirectionalLight(0xc9e6f5, 1.62);
  if (!compactGraphics) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    key.castShadow = true;
    key.shadow.mapSize.set(512, 512);
    Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: .2, far: 17 });
    key.shadow.camera.updateProjectionMatrix();
    key.shadow.normalBias = .018;
  }
  const rim = new THREE.DirectionalLight(0xb7d2d7, .88);
  rim.position.set(3, 3.5, 6);
  fill = new THREE.PointLight(0xa2eacb, 24, 8.5);
  streetLamp = new THREE.PointLight(0x4cf4a0, 80, 13);
  windowLight = new THREE.PointLight(0x79d7e4, 89, 14.8);
  scene.add(sky, key, key.target, rim, fill, streetLamp, windowLight);
  cinematic = makeCinematicRenderer(renderer, scene, camera, compactGraphics);
  effects = makeEffects(scene);
  pursuit = makePursuit(scene, effects.drone, compactGraphics);
  wetStreet = new WetStreet(renderer, {
    quality: weatherQuality, reducedMotion: preferStill.matches, roadCenter: routeCenter, roadWidth,
    rangeStart: -62, rangeEnd: routeLength + 23, reflectionStrength: .88, floodStart: maglevStart, floodEnd: maglevEnd, floodWidth: 35.2,
  });
  codeRain = new CodeRain({ quality: weatherQuality, reducedMotion: preferStill.matches, roadCenter: routeCenter, tunnelStart });
  scene.add(wetStreet.object, codeRain.object);
  resize();
}

function resize() {
  const { clientWidth: width, clientHeight: height } = ui.game;
  const maxDensity = Math.sqrt(1_650_000 / Math.max(1, width * height));
  renderer.setPixelRatio(renderScale * Math.min(devicePixelRatio, maxDensity, touchScreen ? 1.15 : 1.35));
  renderer.setSize(width, height, false);
  cinematic.resize(width, height);
  camera.aspect = width / Math.max(1, height);
  camera.fov = width < 600 ? 57 : 53;
  camera.updateProjectionMatrix();
  if (riders && state !== 'running') cinematic.render();
}

function frame(now) {
  const dt = Math.min((now - (lastFrame || now)) / 1000, .065);
  lastFrame = now;
  clock += dt;
  readGamepad();
  if (state === 'running') {
    slowFrames = dt > .037 ? slowFrames + dt : Math.max(0, slowFrames - dt * .35);
    if (slowFrames > 1.3 && renderScale > .66) {
      renderScale = Math.max(.66, renderScale * .86);
      slowFrames = 0;
      cinematic.reduce();
      resize();
      if (weatherQuality !== 'low') {
        weatherQuality = 'low';
        wetStreet.setQuality(weatherQuality);
        codeRain.setQuality(weatherQuality);
      }
    }
    simulate(dt);
  } else if (state === 'ready') updateScene(dt);
  cinematic.render();
}

function onKeyDown(event) {
  if (event.code === 'Escape' || event.code === 'KeyP') {
    if (!event.repeat) togglePause();
    return;
  }
  if (event.code === 'KeyR' && !event.repeat && (state === 'running' || state === 'paused' || state === 'caught')) {
    startChase(checkpoint);
    return;
  }
  if (!controls.has(event.code)) return;
  if (state === 'running') {
    if (event.code === 'Space' && event.target instanceof HTMLButtonElement) return;
    event.preventDefault();
    keyboard.add(event.code);
    const move = controls.get(event.code);
    if (move === 'jump' && !event.repeat) queuedJump = true;
    if (move === 'slide' && !event.repeat) queuedSlide = true;
    if (move === 'burst' && !event.repeat) queuedBurst = true;
    if (!event.repeat && moves.includes(move)) queuedMoves.add(move);
  }
}

async function boot() {
  try {
    configureScene();
    const [loadedRiders, kit] = await Promise.all([
      loadRiders(scene),
      loadEnvironmentKit({ roadWidth, chunkLength, sidewalkWidth }),
    ]);
    riders = loadedRiders;
    riders.mount.traverse((mesh) => { if (mesh.isSkinnedMesh) mesh.castShadow = !compactGraphics; });
    if (kit.night) {
      scene.environment = kit.night;
      scene.environmentRotation.y = .52;
      scene.environmentIntensity = .19;
    } else {
      const environment = new RoomEnvironment();
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(environment, .05, .1, 100, { size: 64 }).texture;
      scene.environmentIntensity = .35;
      environment.dispose();
      pmrem.dispose();
    }
    city = makeCity(scene, kit, compactGraphics);
    course = makeCourseScenery(scene, kit, compactGraphics);
    terminal = makeMaglevTerminal(scene, kit, compactGraphics);
    maglev = makeMaglevTraffic(scene, compactGraphics, kit.trainMetal);
    obstacles = makeRunnerObstacles(scene);
    bottles = makeWinePickups(scene, compactGraphics);
    bottles.reset(startingDistance);
    downtownActivity = makeDowntownActivity(scene, { compact: compactGraphics });
    state = 'ready';
    updateScene(0, true);
    cinematic.render();
    ui.start.disabled = false;
    ui.start.textContent = 'Start chase';
    renderer.setAnimationLoop(frame);
  } catch (error) {
    console.error(error);
    ui.start.textContent = 'Chase unavailable';
    ui['load-error'].textContent = renderer ? 'The chase assets could not load. Reload the page to try again.' : 'This chase needs WebGL 2. Enable graphics acceleration or try another browser.';
    ui['load-error'].hidden = false;
  }
}

ui.start.addEventListener('click', () => startChase());
ui.pause.addEventListener('click', togglePause);
ui['panel-action'].addEventListener('click', activatePanel);
ui.restart.addEventListener('click', () => startChase(checkpoint));
ui.mute.addEventListener('click', () => {
  muted = !muted;
  audio.setMuted(muted);
  ui.mute.textContent = muted ? 'Sound off' : 'Sound on';
  ui.mute.setAttribute('aria-pressed', String(muted));
  ui.mute.blur();
});
ui.game.classList.toggle('has-touch-controls', touchScreen);
for (const { at } of stages.slice(1)) {
  const marker = document.createElement('span');
  marker.style.left = `${at / routeLength * 100}%`;
  ui.progress.parentElement.append(marker);
}
for (const button of touchButtons) {
  button.addEventListener('pointerdown', (event) => {
    if (state !== 'running' || event.button !== 0) return;
    event.preventDefault();
    if (event.pointerType !== 'touch') button.setPointerCapture(event.pointerId);
    touches.set(event.pointerId, button.dataset.control);
    paintTouchControls();
    if (button.dataset.control === 'jump') queuedJump = true;
    if (button.dataset.control === 'slide') queuedSlide = true;
    if (button.dataset.control === 'burst') queuedBurst = true;
    if (moves.includes(button.dataset.control)) queuedMoves.add(button.dataset.control);
  });
  button.addEventListener('lostpointercapture', releaseTouch);
}
ui.touch.addEventListener('contextmenu', (event) => event.preventDefault());
ui.viewport.addEventListener('pointerdown', (event) => {
  if (state !== 'running' || event.pointerType === 'mouse' || event.button !== 0) return;
  ui.viewport.setPointerCapture(event.pointerId);
  swipes.set(event.pointerId, { x: event.clientX, y: event.clientY });
});
ui.viewport.addEventListener('pointermove', (event) => {
  const start = swipes.get(event.pointerId);
  if (!start) return;
  const x = event.clientX - start.x;
  const y = event.clientY - start.y;
  const across = Math.abs(x), vertical = Math.abs(y);
  if (Math.max(across, vertical) < 28 || Math.min(across, vertical) > Math.max(across, vertical) * .79) return;
  swipes.delete(event.pointerId);
  if (vertical > across) {
    if (y < 0) queuedJump = true;
    else queuedSlide = true;
  } else queuedLane = Math.sign(x);
});
ui.viewport.addEventListener('lostpointercapture', (event) => swipes.delete(event.pointerId));
addEventListener('pointerup', releaseTouch, true);
addEventListener('pointercancel', releaseTouch, true);
addEventListener('keydown', onKeyDown);
addEventListener('keyup', (event) => keyboard.delete(event.code));
addEventListener('blur', pause);
addEventListener('resize', () => { if (camera) resize(); });
preferStill.addEventListener('change', ({ matches }) => {
  wetStreet?.setReducedMotion(matches);
  codeRain?.setReducedMotion(matches);
  if (state !== 'running' && state !== 'ready') city?.stopScreens(matches);
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) return;
  if (state === 'ready') city.stopScreens(preferStill.matches);
  pause();
});
boot();
