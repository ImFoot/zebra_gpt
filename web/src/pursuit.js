import * as THREE from 'three';
import { makeDroneCrash } from './drone-crash.js';
import { makeDroneRockets } from './drone-rockets.js';
import { makePursuitActors } from './pursuit-actors.js';
import { crashMark, cruiseSpeed, droneSectors, routeAt, routeHeading, tunnelStart } from './route.js';

const { clamp, damp, lerp, smoothstep } = THREE.MathUtils;
const charge = { bottle: 1.18, wine: 3.6 };
const releaseAt = { bottle: .20, wine: .26 };
const bikeCrashEnd = crashMark + 52;
const bikeWindows = [
  [95, droneSectors[0][0]], [droneSectors[0][1], droneSectors[1][0]],
  [droneSectors[1][1], bikeCrashEnd], [2600, droneSectors[2][0]], [droneSectors[2][1], tunnelStart + 2],
];
const frontTyre = .76;
const slickSetback = 1.48;
const slickReach = 1.3;
const slickWidth = 1.16;
const releasePoint = new THREE.Vector3();
const targetPoint = new THREE.Vector3();
const dronePoint = new THREE.Vector3();

function chaseLane(x, time) {
  return x + .64 + Math.sin(time * .91) * .17;
}

export function makePursuit(scene, droneVisual, compact) {
  const actors = makePursuitActors(scene);
  const crash = makeDroneCrash(scene, droneVisual, compact);
  const rockets = makeDroneRockets(scene, droneVisual.drone, compact);
  const bike = { distance: 0, lane: 0, speed: cruiseSpeed, skid: null };
  let suppressed = -1;
  let active = -1;
  let locked = false;
  let move;
  let projectile;
  let slick;
  let sparks;
  let readyAt;

  function reset() {
    suppressed = -1;
    active = -1;
    locked = false;
    move = projectile = slick = sparks = null;
    readyAt = { bottle: 0, wine: 0 };
    bike.distance = bike.lane = 0;
    bike.speed = cruiseSpeed;
    bike.skid = null;
    actors.bike.visible = actors.bottle.visible = actors.slick.visible = false;
    actors.sparks();
    crash.reset();
    rockets.reset();
    droneVisual.pose(null);
  }

  function canRequest(kind, time) {
    return time >= readyAt[kind] && (!move || time - move.start >= .6);
  }

  function request(kind, time) {
    if (!canRequest(kind, time)) return false;
    move = { kind, start: time, released: false };
    readyAt[kind] = time + charge[kind];
    return true;
  }

  function action(time) {
    return move && time - move.start < .72 ? { kind: move.kind, age: time - move.start } : null;
  }

  function updateDrone(dt, run, still) {
    const next = droneSectors.findIndex(([start, end]) => run.s >= start && run.s < end);
    active = next === suppressed || crash.active ? -1 : next;
    locked = false;
    if (crash.active) return crash.update(dt, still);
    if (active >= 0) {
      const [start, end] = droneSectors[active];
      const entry = smoothstep(run.s, start, start + 54);
      const exit = smoothstep(run.s, end - 59, end);
      const lead = lerp(32, 16.5, entry) + exit * 23 + Math.sin(run.time * 1.23) * 2.6;
      const sine = Math.cos(run.time * .87 + active);
      const lane = run.x * .36 + sine * (2.45 + exit * 3.7);
      routeAt(run.s + lead, lane, 2.65 + Math.sin(run.time * 1.4) * .31 + (1 - entry) * 2.2 + exit * 5.5, dronePoint);
      locked = lead < 33 && Math.abs(run.x - lane) < 4.4 && exit < .32;
      droneVisual.pose(dronePoint, run.time, routeHeading(run.s + lead) + sine * .17, .08, sine * .17 - exit * .55);
    } else {
      droneVisual.pose(null);
    }
    return false;
  }

  function updateBike(dt, run) {
    const object = actors.bike;
    const window = bikeWindows.find(([start, end]) => run.s >= start && run.s < end);
    if (!window || crash.active || rockets.warning) {
      object.visible = false;
      bike.skid = null;
      return false;
    }

    const [start, end] = window;
    const forcedCrash = run.s >= crashMark && run.s < bikeCrashEnd;
    if (forcedCrash || (bike.skid && run.time - bike.skid.time > 5.8)) bike.skid = null;
    const entering = !object.visible && !bike.skid;
    const arrival = 1 - smoothstep(run.s, start, start + 27);
    const exit = smoothstep(run.s, end - 22, end);
    const lane = chaseLane(run.x, run.time);
    const gap = lerp(3.85, 2.7, run.pressure) + 3.85 * arrival + 7.0 * exit;
    const closingSpeed = 7.4 * (1 - smoothstep(run.s, start + 16, start + 42));
    const topSpeed = cruiseSpeed + Math.min(4.8, 2.9 + run.lap * .45) + closingSpeed;
    if (entering) {
      bike.distance = run.s - gap;
      bike.speed = cruiseSpeed;
    }

    const previous = bike.distance;
    if (!entering && !bike.skid) {
      const gapError = run.s - bike.distance - run.speed * dt - gap;
      const target = clamp(cruiseSpeed + gapError * 3.9 + (run.speed - cruiseSpeed) * .20, 7.5, topSpeed);
      bike.speed = damp(bike.speed, target, 7, dt);
      bike.distance = Math.min(run.s - 2.15, bike.distance + bike.speed * dt);
    }
    bike.lane = entering || dt === 0 ? lane : damp(bike.lane, lane, 5.8, dt);
    object.visible = !bike.skid || run.time - bike.skid.time < 1.48;
    if (!object.visible) return false;

    let hit = false;
    let roll = -(lane - bike.lane) * .25;
    let yaw = routeHeading(bike.distance) + (bike.lane - lane) * .28;
    if (forcedCrash) {
      const script = smoothstep(run.s, crashMark, bikeCrashEnd);
      bike.distance = run.s + lerp(.3, -13, script);
      bike.lane = lerp(3.18, 7.7, script);
      yaw -= script * 1.58;
      roll = -script * 1.49;
      if (script > .12 && !sparks) {
        sparks = { position: routeAt(bike.distance, bike.lane), age: 0, style: 'skid', yaw };
      }
    } else if (!bike.skid && slick && previous > 0 && previous + frontTyre <= slick.distance + slickReach &&
        bike.distance + frontTyre >= slick.distance - slickReach && Math.abs(bike.lane - slick.lane) < slickWidth) {
      bike.skid = { time: run.time, distance: bike.distance, lane: bike.lane, speed: bike.speed, direction: bike.lane < slick.lane ? -1 : 1 };
      hit = true;
    }
    if (bike.skid) {
      const age = run.time - bike.skid.time;
      bike.distance = bike.skid.distance + bike.skid.speed * (1 - Math.exp(-age * 1.7)) / 1.7;
      bike.lane = bike.skid.lane + bike.skid.direction * age * 2.4;
      yaw = routeHeading(bike.distance) - bike.skid.direction * age * 1.8;
      roll = -bike.skid.direction * Math.min(age * 2.8, 1.48);
    }
    routeAt(bike.distance, bike.lane, 0, object.position);
    object.rotation.set(0, yaw, roll, 'YXZ');
    actors.look(clamp((lane - bike.lane) * -.2, -.35, .35));
    actors.spin(Math.max(0, bike.distance - previous));
    if (hit && !sparks) sparks = { position: object.position.clone(), age: 0, style: 'skid', yaw };
    return hit;
  }

  function tick(dt, run, glass, still, sentry) {
    const crashImpact = updateDrone(dt, run, still);
    let droneHit = false;
    let bottleHit = false;
    let sentryHit = false;
    let released;
    if (slick && run.time - slick.time > 6) {
      actors.slick.visible = false;
      slick = null;
    }
    if (move && !move.released && run.time - move.start >= releaseAt[move.kind]) {
      move.released = true;
      released = move.kind;
      if (move.kind === 'bottle') {
        glass.updateWorldMatrix(true, false);
        glass.getWorldPosition(releasePoint);
        routeAt(run.s + 24, run.x, .22, targetPoint);
        projectile = { origin: releasePoint.clone(), goal: targetPoint.clone(), sector: locked ? active : -1, sentry: locked ? null : sentry, age: 0 };
        actors.bottle.visible = true;
      } else {
        slick = { distance: run.s - slickSetback, lane: run.x, time: run.time };
        routeAt(slick.distance, slick.lane, .031, actors.slick.position);
        actors.slick.rotation.y = routeHeading(slick.distance);
        actors.slick.visible = true;
      }
    }

    if (projectile) {
      projectile.age += dt;
      const travel = clamp(projectile.age / .46, 0, 1);
      const tracking = projectile.sector >= 0 && projectile.sector === active;
      actors.bottle.position.copy(projectile.origin).lerp(tracking ? dronePoint : projectile.sentry?.position ?? projectile.goal, travel);
      actors.bottle.position.y += Math.sin(travel * Math.PI) * .78;
      actors.bottle.rotation.set(travel * 14, travel * 3, -.3 - travel * 6);
      if (travel === 1) {
        bottleHit = true;
        sentryHit = projectile.sentry?.hit() ?? false;
        sparks = { position: actors.bottle.position.clone(), age: 0, style: 'impact', yaw: routeHeading(run.s) };
        if (tracking) {
          suppressed = active;
          active = -1;
          locked = false;
          crash.start(dronePoint, run);
          crash.update(0, still);
          droneHit = true;
        }
        actors.bottle.visible = false;
        projectile = null;
      }
    }
    const incoming = rockets.update(dt, run, active, still);
    const bikeHit = updateBike(dt, run);
    if (sparks && sparks.age < .68) {
      actors.sparks(sparks);
      sparks.age += dt;
    } else {
      actors.sparks();
      sparks = null;
    }
    return { droneHit, bikeHit, crashImpact, bottleHit, sentryHit, released, ...incoming };
  }

  function bikeClosing(run, reach) {
    const gap = run.s - bike.distance;
    return actors.bike.visible && !bike.skid && (run.s < crashMark || run.s >= bikeCrashEnd) && gap > 0 && gap <= reach;
  }

  function wineOpportunity(run) {
    if (!canRequest('wine', run.time) || !bikeClosing(run, 13) || Math.abs(run.x - run.laneTarget) > .14) return false;
    const delay = releaseAt.wine;
    const spillAt = run.s + run.speed * delay - slickSetback;
    const tyre = bike.distance + frontTyre;
    const eta = Math.max(delay, (spillAt - tyre) / bike.speed);
    const window = bikeWindows.find(([start, end]) => run.s >= start && run.s < end);
    return Boolean(window) && eta <= .72 && run.s + run.speed * eta < window[1] && tyre + bike.speed * delay <= spillAt + slickReach * .8 &&
      Math.abs(damp(bike.lane, chaseLane(run.x, run.time + eta), 5.8, eta) - run.x) < slickWidth * .78;
  }

  reset();
  return {
    reset, request, canRequest, action, tick, wineOpportunity, bikeClosing,
    get rider() { return actors.bike.visible ? actors.bike : null; },
    get target() { return locked ? dronePoint : null; },
    get drone() { return active >= 0 ? dronePoint : null; },
    get warning() { return rockets.warning; },
    get hasDrone() { return active >= 0; },
    get crashKick() { return crash.kick + rockets.kick; },
  };
}
