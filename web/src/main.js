import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeCity, routeLength, droneMark, wineMark } from './city.js';
import { makeEffects } from './effects.js';
import { loadRiders } from './riders.js';
import { createAudio } from './audio.js';
import './style.css';

const find = (id) => document.getElementById(id);
const ui = Object.fromEntries([
  'game', 'viewport', 'intro', 'start', 'load-error', 'mute', 'pause', 'hud', 'sector', 'distance', 'progress', 'speed', 'hint', 'touch',
  'caption', 'speaker', 'line', 'panel', 'panel-label', 'panel-title', 'panel-detail', 'panel-action', 'flash',
].map((id) => [id, find(id)]));

const clamp = THREE.MathUtils.clamp;
const damp = THREE.MathUtils.damp;
const ease = THREE.MathUtils.smoothstep;
const jumpDuration = .84;
const textClock = new Intl.NumberFormat('en-US', { minimumIntegerDigits: 2, maximumFractionDigits: 0 });
const controls = new Map([
  ['KeyA', 'left'], ['ArrowLeft', 'left'], ['KeyD', 'right'], ['ArrowRight', 'right'], ['KeyW', 'sprint'], ['ArrowUp', 'sprint'],
  ['KeyS', 'brake'], ['ArrowDown', 'brake'], ['Space', 'jump'], ['KeyC', 'hero'],
]);
const keyboard = new Set();
const touches = new Map();
const audio = createAudio();
const preferStill = matchMedia('(prefers-reduced-motion: reduce)');
const narrow = matchMedia('(max-width: 600px)');
const touchScreen = matchMedia('(pointer: coarse)');
const spillOrigin = new THREE.Vector3();
const setpieceTime = 4.25;
const spillCue = 1.10;
const startingDistance = 8;
const gamepad = { steer: 0, sprint: 0, brake: 0, jump: false, hero: false, pause: false };

let state = 'loading';
let renderer;
let riders;
let city;
let effects;
let scene;
let camera;
let fill;
let streetLamp;
let cameraTarget = new THREE.Vector3();
const bodyFocus = new THREE.Vector3();
const desiredCamera = new THREE.Vector3();
const desiredTarget = new THREE.Vector3();
let muted = false;
let captionUntil = 0;
let checkpoint = startingDistance;
let queuedJump = false;
let run;
let lastFrame = 0;
let clock = 0;
let renderScale = 1;
let slowFrames = 0;

function clearControls() {
  keyboard.clear();
  touches.clear();
  queuedJump = false;
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

function startChase(from = startingDistance) {
  checkpoint = from;
  const fullRestart = from === startingDistance;
  const time = fullRestart ? 0 : run.time;
  run = {
    s: from, x: 0, steer: 0, speed: 15.3, jump: 0, jumpAt: -1, time, droneAt: -1, wineAt: -1,
    spilled: from > wineMark, hits: 0, grazeUntil: -1, nextHoof: time, hadJump: false, hero: 0,
  };
  state = 'running';
  clearControls();
  ui.intro.hidden = true;
  ui.panel.hidden = true;
  ui.hud.hidden = false;
  ui.caption.hidden = true;
  ui.pause.hidden = false;
  ui.pause.textContent = 'Pause';
  ui.pause.blur();
  ui['panel-action'].blur();
  ui.flash.style.opacity = 0;
  audio.start();
  updateHUD();
  updateScene(0, true);
  if (fullRestart) showCaption('ZEBRA', 'You drive. I’ll do the running.', 2.1);
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
  state = 'paused';
  clearControls();
  ui.pause.textContent = 'Resume';
  showPanel('CONTINUUM CHASE', 'Paused', 'Your place on the route is saved.', 'Resume chase');
}

function resume() {
  state = 'running';
  clearControls();
  ui.panel.hidden = true;
  ui.pause.textContent = 'Pause';
  audio.start();
}

function togglePause() {
  if (state === 'paused') resume();
  else pause();
}

function finish(escaped) {
  state = escaped ? 'escaped' : 'caught';
  ui.pause.hidden = true;
  ui.caption.hidden = true;
  ui.flash.style.opacity = 0;
  if (escaped) {
    const seconds = Math.round(run.time);
    showPanel('TRANSIT TUNNEL', 'You escaped', `Zebra made the tunnel in ${Math.floor(seconds / 60)}:${textClock.format(seconds % 60)}. The cabernet had a shorter run.`, 'Ride again');
    audio.pulse(130, 265, .5, .15);
  } else {
    const retry = checkpoint === startingDistance ? 'Retry chase' : 'Retry checkpoint';
    showPanel('CONTINUUM SECURITY', 'Intercepted', 'Steer around the lit barriers or jump at the last moment.', retry);
  }
}

function activatePanel() {
  if (state === 'paused') resume();
  else if (state === 'caught') startChase(checkpoint);
  else if (state === 'escaped') startChase();
}

function updateHUD() {
  const remaining = Math.ceil(routeLength - run.s);
  ui.sector.textContent = run.s < 270 ? 'Cinema Row' : run.s < 570 ? 'Curator Boulevard' : 'Transit Tunnel';
  ui.distance.textContent = `${remaining} m`;
  ui.progress.style.transform = `scaleX(${run.s / routeLength})`;
  ui.speed.textContent = textClock.format(run.speed * 3.6);
  const firstBarrier = run.s > 29 && run.s < 49;
  ui.hint.textContent = firstBarrier ? 'Barrier ahead · steer or jump' : run.s < 21 && !touchScreen.matches ? 'Hold C for hero view' : '';
  if (run.time >= captionUntil) ui.caption.hidden = true;
}

function readGamepad() {
  const pad = Array.from(navigator.getGamepads?.() || []).find(Boolean);
  const axis = pad?.axes[0] ?? 0;
  gamepad.steer = (Math.abs(axis) > .16 ? axis : 0) + Number(pad?.buttons[15]?.pressed ?? false) - Number(pad?.buttons[14]?.pressed ?? false);
  gamepad.sprint = pad?.buttons[7]?.value ?? 0;
  gamepad.brake = pad?.buttons[6]?.value ?? 0;
  gamepad.jump = pad?.buttons[0]?.pressed ?? false;
  gamepad.hero = pad?.buttons[11]?.pressed ?? false;
  const menu = pad?.buttons[9]?.pressed ?? false;
  if (menu && !gamepad.pause) togglePause();
  gamepad.pause = menu;
}

function simulate(dt) {
  run.time += dt;
  const previous = run.s;
  const wineAge = run.wineAt < 0 ? -1 : run.time - run.wineAt;
  const wineShot = wineAge >= 0 && wineAge < setpieceTime;
  const timeScale = wineShot ? .19 + .81 * ease(wineAge, 3.3, setpieceTime) : 1;
  const step = dt * timeScale;
  const steer = clamp(Number(pressing('right')) - Number(pressing('left')) + gamepad.steer, -1, 1);
  const sprint = Math.max(Number(pressing('sprint')), gamepad.sprint);
  const brake = Math.max(Number(pressing('brake')), gamepad.brake);
  const slowdown = 4.4 * (1 - ease(run.time, run.grazeUntil - .48, run.grazeUntil));
  run.speed = damp(run.speed, 15.65 + sprint * 5.55 - brake * 6.2 - slowdown, 3.4, step);
  run.steer = damp(run.steer, steer, 13, dt);
  run.x = clamp(run.x + run.steer * step * (3.5 + run.speed * .17), -4.7, 4.7);
  run.s = Math.min(routeLength, run.s + run.speed * step);
  const jumping = pressing('jump') || gamepad.jump;
  if ((queuedJump || (jumping && !run.hadJump)) && run.jumpAt < 0 && !wineShot) {
    run.jumpAt = run.time;
    audio.pulse(115, 49, .11, .13);
  }
  queuedJump = false;
  run.hadJump = jumping;
  const jumpAge = run.jumpAt < 0 ? 0 : (run.time - run.jumpAt) / jumpDuration;
  run.jump = run.jumpAt < 0 ? 0 : Math.max(0, 4 * jumpAge * (1 - jumpAge) * 1.04);
  if (jumpAge >= 1) run.jumpAt = -1;

  for (const { at, x } of city.barriers) {
    if (previous < at && run.s >= at && Math.abs(run.x - x) < 1.64 && run.jump < .42) {
      run.hits++;
      run.grazeUntil = run.time + .57;
      audio.pulse(112, 31, .24, .36, 'triangle');
      if (run.hits < 3) showCaption('ZEBRA', 'That barrier was there the whole time.', 1.65);
      else finish(false);
      break;
    }
  }

  if (previous < droneMark && run.s >= droneMark) {
    checkpoint = 258;
    run.droneAt = run.time;
    showCaption('CONTINUUM SECURITY', 'Unresolved narrative inconsistency detected.', 2.3);
    audio.pulse(208, 67, .6, .20, 'triangle');
  }
  const droneAge = run.droneAt < 0 ? -1 : run.time - run.droneAt;
  if (droneAge >= 2.65 && droneAge - dt < 2.65) {
    showCaption('DRONE', 'Your current target may violate our content guidelines.', 2.7);
    audio.pulse(540, 512, .2, .12);
  }
  if (previous < wineMark && run.s >= wineMark) run.wineAt = run.time;
  if (wineAge >= setpieceTime && wineAge - dt < setpieceTime) checkpoint = 554;
  if (wineAge >= 1.83 && wineAge - dt < 1.83) showCaption('STAN', 'That was a very respectable cabernet.', 3.2);
  if (run.s >= routeLength) finish(true);
  if (run.time > run.nextHoof && run.jumpAt < 0 && state === 'running') {
    run.nextHoof = run.time + (.56 - run.speed * .013) / timeScale;
    audio.pulse(95 + Math.random() * 13, 36, .095, .12 * timeScale, 'triangle');
  }
  ui.flash.style.opacity = state !== 'running' || preferStill.matches ? 0 : Math.max(0, (run.grazeUntil - run.time) * .38);
  updateHUD();
  updateScene(step);
}

function updateScene(dt, snap = false) {
  const intro = state === 'ready' || state === 'loading';
  const s = intro ? startingDistance : run.s;
  const x = intro ? 0 : run.x;
  const speed = intro ? 0 : run.speed;
  const age = intro || run.wineAt < 0 ? -1 : run.time - run.wineAt;
  const toast = age < 0 ? 0 : ease(age, 0, 1.05) * (1 - ease(age, 2.7, setpieceTime));
  const heroShot = age < 0 ? 0 : ease(age, 0, .55) * (1 - ease(age, 3.23, setpieceTime));
  const hero = !intro && state === 'running' && (pressing('hero') || gamepad.hero) ? 1 : heroShot;
  const jump = intro ? 0 : run.jump;
  city.update(s);
  effects.rain(dt, s, speed);
  effects.drone(intro || run.droneAt < 0 ? -1 : run.time - run.droneAt, clock, x, s);
  effects.shadow.position.set(x, .018, -s + .13);
  effects.shadow.material.opacity = .77 - jump * .31;
  fill.position.set(x + 2.7, 3.4, -s - 1.8);
  const lampDistance = 6 + Math.round((s - 6) / 12.5) * 12.5;
  streetLamp.position.set(-4.3, 3.2, -lampDistance);
  streetLamp.intensity = 58 * (1 - ease(Math.abs(lampDistance - s), 3.9, 6.25));
  if (!riders) return;

  riders.mount.position.set(x, 0, -s);
  riders.mount.rotation.y = intro ? -.11 : -run.steer * .15;
  riders.pose({ dt, time: clock, speed, steer: intro ? 0 : run.steer, jump, toast, spilled: !intro && run.spilled });
  if (age >= spillCue && !run.spilled) {
    riders.glass.getWorldPosition(spillOrigin);
    spillOrigin.y += .11;
    run.spilled = true;
    audio.pulse(419, 309, .45, .115);
  }
  effects.spill(age < spillCue ? -1 : age - spillCue, spillOrigin);

  if (intro) {
    const drift = preferStill.matches ? 0 : Math.sin(clock * .49) * .18;
    desiredCamera.set(3.76 + drift, 1.63, -s - (narrow.matches ? 6.8 : 4.65));
    desiredTarget.set(narrow.matches ? .0 : 1.37, narrow.matches ? 1.02 : 1.44, -s + .24);
  } else {
    const step = wineShotActive(age) ? Math.max(dt / .25, dt) : dt;
    run.hero = snap ? hero : damp(run.hero, hero, 5.7, step);
    const chaseHeight = narrow.matches ? 3.62 : 3.5;
    desiredCamera.set(narrow.matches ? x * .95 + .19 : x * .78 + .35, chaseHeight + jump * .49, -s + (narrow.matches ? 6.5 : 5.75));
    desiredTarget.set(x * (narrow.matches ? .88 : .68), 1.22 + jump * .28, -s - 5.25);
    bodyFocus.set(x + 3.55, 1.95 + jump, -s - 2.58);
    desiredCamera.lerp(bodyFocus, run.hero);
    bodyFocus.set(x + .13, 1.92 + jump, -s + .38);
    desiredTarget.lerp(bodyFocus, run.hero);
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
}

function wineShotActive(age) {
  return age >= 0 && age < setpieceTime;
}

function configureScene() {
  renderer = new THREE.WebGLRenderer({ canvas: ui.viewport, antialias: true, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.29;
  renderer.setClearColor(0x102b2a);
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x173833, .018);
  scene.background = new THREE.Color(0x173833);
  camera = new THREE.PerspectiveCamera(53, 1, .06, 180);
  const environment = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(environment, .05, .1, 100, { size: 64 }).texture;
  scene.environmentIntensity = .38;
  environment.dispose();
  pmrem.dispose();
  const sky = new THREE.HemisphereLight(0x90cfcd, 0x575a46, 1.63);
  const key = new THREE.DirectionalLight(0xb9e9e4, 2.17);
  key.position.set(-4, 10, -7);
  const rim = new THREE.DirectionalLight(0xf5b875, 1.03);
  rim.position.set(3, 4, 6);
  fill = new THREE.PointLight(0x85dcb2, 24, 9);
  streetLamp = new THREE.PointLight(0x4cf4a0, 50, 14);
  scene.add(sky, key, rim, fill, streetLamp);
  city = makeCity(scene);
  effects = makeEffects(scene);
  resize();
}

function resize() {
  const { clientWidth: width, clientHeight: height } = ui.game;
  const maxDensity = Math.sqrt(1_650_000 / Math.max(1, width * height));
  renderer.setPixelRatio(renderScale * Math.min(devicePixelRatio, maxDensity, touchScreen.matches ? 1.15 : 1.35));
  renderer.setSize(width, height, false);
  camera.aspect = width / Math.max(1, height);
  camera.fov = width < 600 ? 57 : 53;
  camera.updateProjectionMatrix();
  if (riders && state !== 'running') renderer.render(scene, camera);
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
      resize();
    }
    simulate(dt);
  } else if (state === 'ready') updateScene(dt);
  renderer.render(scene, camera);
}

function onKeyDown(event) {
  if (event.code === 'Escape' || event.code === 'KeyP') {
    if (!event.repeat) togglePause();
    return;
  }
  if (!controls.has(event.code)) return;
  if (state === 'running') {
    if (event.code === 'Space' && event.target instanceof HTMLButtonElement) return;
    event.preventDefault();
    keyboard.add(event.code);
    if (event.code === 'Space' && !event.repeat) queuedJump = true;
  }
}

async function boot() {
  try {
    configureScene();
    riders = await loadRiders(scene);
    state = 'ready';
    updateScene(0, true);
    renderer.render(scene, camera);
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
ui.mute.addEventListener('click', () => {
  muted = !muted;
  audio.setMuted(muted);
  ui.mute.textContent = muted ? 'Sound off' : 'Sound on';
  ui.mute.setAttribute('aria-pressed', String(muted));
  ui.mute.blur();
});
for (const button of ui.touch.querySelectorAll('button')) {
  button.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    touches.set(event.pointerId, button.dataset.control);
    if (button.dataset.control === 'jump') queuedJump = true;
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    button.addEventListener(event, (pointer) => touches.delete(pointer.pointerId));
  }
}
addEventListener('keydown', onKeyDown);
addEventListener('keyup', (event) => keyboard.delete(event.code));
addEventListener('blur', pause);
addEventListener('resize', () => { if (camera) resize(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
boot();
