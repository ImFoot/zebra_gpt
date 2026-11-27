import * as THREE from 'three';
import { makeDroneCrash } from './drone-crash.js';
import { makeDroneRockets } from './drone-rockets.js';
import { makePursuitActors } from './pursuit-actors.js';
import { crashMark, cruiseSpeed, droneSectors, routeAt, routeHeading, tunnelStart } from './route.js';

const { clamp, damp, lerp, smoothstep } = THREE.MathUtils;
const charge = { bottle: 1.18, wine: 3.6 };
const releaseAt = { bottle: .20, wine: .26 };
const bikeCrashEnd = crashMark + 52;
const releasePoint = new THREE.Vector3();
const targetPoint = new THREE.Vector3();
const dronePoint = new THREE.Vector3();

export function makePursuit(scene, droneVisual, compact) {
  const actors = makePursuitActors(scene);
  const crash = makeDroneCrash(scene, droneVisual, compact);
  const rockets = makeDroneRockets(scene, droneVisual.drone, compact);
  const bikes = actors.bikes.map((object) => ({ object, distance: 0, lane: 0, speed: cruiseSpeed, skid: null }));
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
    for (const bike of bikes) {
      bike.distance = 0;
      bike.lane = 0;
      bike.speed = cruiseSpeed;
      bike.skid = null;
      bike.object.visible = false;
    }
    actors.bottle.visible = false;
    actors.slick.visible = false;
    actors.sparks();
    crash.reset();
    rockets.reset();
    droneVisual.pose(null);
  }

  function request(kind, time) {
    if (time < readyAt[kind] || (move && time - move.start < .6)) return false;
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

  function updateBikes(dt, run) {
    let hit = false;
    const script = smoothstep(run.s, crashMark, bikeCrashEnd);
    const forcedCrash = run.s >= crashMark && run.s < bikeCrashEnd;
    const open = run.s > 95 && run.s < tunnelStart + 2;
    const enabled = [
      open && (run.s < bikeCrashEnd || run.s > 2600),
      open && ((run.s > 270 && run.s < 1080) || (run.s > 1560 && run.s < 2110) || run.s > 2650),
    ];
    for (const [index, bike] of bikes.entries()) {
      const { object } = bike;
      if (!enabled[index]) {
        object.visible = false;
        bike.skid = null;
        continue;
      }
      if (!index && forcedCrash) bike.skid = null;
      if (bike.skid && run.time - bike.skid.time > 5.8) bike.skid = null;
      const entering = !object.visible && !bike.skid;
      const wave = Math.sin(run.time * (index ? 1.15 : .91) + index * 2.2);
      const vulnerable = index === 0 && run.s < 260;
      const lane = clamp(run.x * .84 + wave * (vulnerable ? .62 : 1.48) + index * 2.25, -5.2, 5.2);
      const desiredGap = lerp(7.2, 2.7, run.pressure) + index * 2.6 - wave * .65;
      const topSpeed = cruiseSpeed + Math.min(6.2, 3.1 + run.lap * .6);
      if (entering) {
        bike.distance = run.s - desiredGap;
        bike.speed = cruiseSpeed;
      }
      const previous = bike.distance;
      if (!entering && !bike.skid) {
        const gapError = run.s - bike.distance - run.speed * dt - desiredGap;
        const target = clamp(cruiseSpeed + gapError * 1.75 + (run.speed - cruiseSpeed) * .22, 9, topSpeed);
        bike.speed = damp(bike.speed, target, 4.3, dt);
        bike.distance = Math.min(run.s - 2.05 - index * 1.75, bike.distance + bike.speed * dt);
      }
      bike.lane = !object.visible || dt === 0 ? lane : damp(bike.lane, lane, 5.8, dt);
      object.visible = !bike.skid || run.time - bike.skid.time < 1.48;
      if (!object.visible) continue;

      let roll = -(lane - bike.lane) * .22 + wave * .082;
      let yaw = routeHeading(bike.distance) + (bike.lane - lane) * .23;
      if (!index && forcedCrash) {
        bike.distance = run.s + lerp(.3, -13, script);
        bike.lane = lerp(3.18, 7.7, script);
        yaw += -script * 1.58;
        roll = -script * 1.49;
      } else if (!bike.skid && slick && previous > 0 && previous + .76 <= slick.distance + 1.3 &&
          bike.distance + .76 >= slick.distance - 1.3 && Math.abs(bike.lane - slick.lane) < 1.16) {
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
      actors.spin(index, Math.max(0, bike.distance - previous));
      if (forcedCrash && index === 0 && script > .12 && !sparks) {
        sparks = { position: object.position.clone(), age: 0, style: 'skid', yaw };
      } else if (bike.skid && run.time - bike.skid.time < .12 && !sparks) {
        sparks = { position: object.position.clone(), age: 0, style: 'skid', yaw };
      }
    }
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
        slick = { distance: run.s - 1.48, lane: run.x, time: run.time };
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
    const bikeHit = updateBikes(dt, run);
    if (sparks && sparks.age < .68) {
      actors.sparks(sparks);
      sparks.age += dt;
    } else {
      actors.sparks();
      sparks = null;
    }
    const incoming = rockets.update(dt, run, active, still);
    return { droneHit, bikeHit, crashImpact, bottleHit, sentryHit, released, ...incoming };
  }

  function status(kind, time) {
    return Math.max(0, readyAt[kind] - time);
  }

  reset();
  return {
    reset, request, action, tick, status,
    bikes,
    get target() { return locked ? dronePoint : null; },
    get drone() { return active >= 0 ? dronePoint : null; },
    get warning() { return rockets.warning; },
    get hasDrone() { return active >= 0; },
    get crashKick() { return crash.kick + rockets.kick; },
  };
}
