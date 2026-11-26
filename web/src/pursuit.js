import * as THREE from 'three';
import { makePursuitActors } from './pursuit-actors.js';
import { crashMark, droneSectors, routeAt, routeHeading, tunnelStart } from './route.js';

const { clamp, damp, lerp, smoothstep } = THREE.MathUtils;
const charge = { bottle: 1.18, oil: 3.6 };
const releaseAt = { bottle: .20, oil: .26 };
const releasePoint = new THREE.Vector3();
const targetPoint = new THREE.Vector3();
const dronePoint = new THREE.Vector3();

export function makePursuit(scene, droneVisual) {
  const actors = makePursuitActors(scene);
  const bikes = actors.bikes.map((object) => ({ object, distance: 0, lane: 0, skid: null }));
  let suppressed = -1;
  let falling;
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
    falling = move = projectile = slick = sparks = null;
    readyAt = { bottle: 0, oil: 0 };
    for (const bike of bikes) {
      bike.distance = 0;
      bike.lane = 0;
      bike.skid = null;
      bike.object.visible = false;
    }
    actors.bottle.visible = false;
    actors.slick.visible = false;
    actors.sparks();
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

  function updateDrone(dt, run) {
    const next = droneSectors.findIndex(([start, end]) => run.s >= start && run.s < end);
    active = next === suppressed ? -1 : next;
    locked = false;
    if (falling) {
      falling.age += dt;
      if (falling.age > 1.22) falling = null;
    }
    if (falling) {
      const age = falling.age;
      dronePoint.copy(falling.origin);
      dronePoint.x += age * 1.9;
      dronePoint.y = Math.max(.17, dronePoint.y - age * age * 3.8);
      dronePoint.z -= age * (run.speed * .67 + 1.4);
      droneVisual.pose(dronePoint, run.time, age * 4.7, age * 1.25, age * 3.8);
    } else if (active >= 0) {
      const [start, end] = droneSectors[active];
      const entry = smoothstep(run.s, start, start + 45);
      const exit = smoothstep(run.s, end - 44, end);
      const lead = lerp(25, 10.5, entry) + exit * 23 + Math.sin(run.time * 1.23) * 2.6;
      const sine = Math.cos(run.time * .87 + active);
      const lane = run.x * .36 + sine * (2.45 + exit * 3.7);
      routeAt(run.s + lead, lane, 2.65 + Math.sin(run.time * 1.4) * .31 + (1 - entry) * 2.2 + exit * 5.5, dronePoint);
      locked = lead < 26 && Math.abs(run.x - lane) < 4.0 && exit < .32;
      droneVisual.pose(dronePoint, run.time, routeHeading(run.s + lead) + sine * .17, .08, sine * .17 - exit * .55);
    } else {
      droneVisual.pose(null);
    }
  }

  function updateBikes(dt, run) {
    let hit = false;
    const script = smoothstep(run.s, crashMark, crashMark + 38);
    const forcedCrash = run.s >= crashMark && run.s < crashMark + 38;
    const open = run.s > 95 && run.s < tunnelStart + 2;
    const enabled = [
      open && (run.s < crashMark + 38 || run.s > 2600),
      open && ((run.s > 270 && run.s < 1080) || (run.s > 1560 && run.s < 2110) || run.s > 2650),
    ];
    for (const [index, bike] of bikes.entries()) {
      const { object } = bike;
      if (bike.skid && run.time - bike.skid.time > 5.8) bike.skid = null;
      const previous = bike.distance;
      const wave = Math.sin(run.time * (index ? 1.15 : .91) + index * 2.2);
      const vulnerable = index === 0 && run.s < 260;
      const lane = clamp(run.x * .84 + wave * (vulnerable ? .62 : 1.48) + index * 2.25, -5.2, 5.2);
      bike.distance = run.s - lerp(4.7, 1.95, run.pressure) - index * 2.25 + wave * .7;
      bike.lane = !object.visible || dt === 0 ? lane : damp(bike.lane, lane, 5.8, dt);
      object.visible = enabled[index] && (!bike.skid || run.time - bike.skid.time < 1.48);
      if (!object.visible) continue;

      let roll = -(lane - bike.lane) * .22 + wave * .082;
      let yaw = routeHeading(bike.distance) + (bike.lane - lane) * .23;
      if (!index && forcedCrash) {
        bike.skid = null;
        bike.distance = run.s + lerp(.3, -13, script);
        bike.lane = lerp(3.18, 7.7, script);
        yaw += -script * 1.58;
        roll = -script * 1.49;
      } else if (!bike.skid && slick && previous > 0 && previous + .76 <= slick.distance + 1.3 &&
          bike.distance + .76 >= slick.distance - 1.3 && Math.abs(bike.lane - slick.lane) < 1.16) {
        bike.skid = { time: run.time, distance: bike.distance, lane: bike.lane, direction: bike.lane < slick.lane ? -1 : 1 };
        hit = true;
      }
      if (bike.skid) {
        const age = run.time - bike.skid.time;
        bike.distance = bike.skid.distance + age * Math.max(run.speed * .42, 4);
        bike.lane = bike.skid.lane + bike.skid.direction * age * 2.4;
        yaw = routeHeading(bike.distance) - bike.skid.direction * age * 1.8;
        roll = -bike.skid.direction * Math.min(age * 2.8, 1.48);
      }
      routeAt(bike.distance, bike.lane, 0, object.position);
      object.rotation.set(0, yaw, roll, 'YXZ');
      actors.spin(index, dt * run.speed);
      if (forcedCrash && index === 0 && script > .12 && !sparks) {
        sparks = { position: object.position.clone(), age: 0, style: 'skid', yaw };
      } else if (bike.skid && run.time - bike.skid.time < .12 && !sparks) {
        sparks = { position: object.position.clone(), age: 0, style: 'skid', yaw };
      }
    }
    return hit;
  }

  function tick(dt, run, glass) {
    updateDrone(dt, run);
    let droneHit = false;
    if (slick && run.time - slick.time > 6) {
      actors.slick.visible = false;
      slick = null;
    }
    if (move && !move.released && run.time - move.start >= releaseAt[move.kind]) {
      move.released = true;
      if (move.kind === 'bottle') {
        glass.updateWorldMatrix(true, false);
        glass.getWorldPosition(releasePoint);
        routeAt(run.s + 24, run.x, .22, targetPoint);
        projectile = { origin: releasePoint.clone(), goal: targetPoint.clone(), sector: locked ? active : -1, age: 0 };
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
      actors.bottle.position.copy(projectile.origin).lerp(tracking ? dronePoint : projectile.goal, travel);
      actors.bottle.position.y += Math.sin(travel * Math.PI) * .78;
      actors.bottle.rotation.set(travel * 14, travel * 3, -.3 - travel * 6);
      if (travel === 1) {
        sparks = { position: actors.bottle.position.clone(), age: 0, style: 'impact', yaw: routeHeading(run.s) };
        if (tracking) {
          suppressed = active;
          active = -1;
          locked = false;
          falling = { origin: dronePoint.clone(), age: 0 };
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
    return { droneHit, bikeHit };
  }

  function status(kind, time) {
    return Math.max(0, readyAt[kind] - time);
  }

  reset();
  return { reset, request, action, tick, status, get target() { return locked ? dronePoint : null; }, get hasDrone() { return active >= 0; } };
}
