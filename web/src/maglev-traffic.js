import * as THREE from 'three';
import { makeMaglevTrain } from './maglev-train.js';
import { makeHoofRipples, makeMaglevSpray, makeRollingWake } from './maglev-water.js';
import { maglevStart, routeAt } from './route.js';

const { lerp, smoothstep } = THREE.MathUtils;
const approaches = [120, 248, 383, 526].map((offset, index) => ({ at: maglevStart + offset, side: index % 2 ? 1 : -1 }));
const leadDistance = 72;
const surgeDelay = 1.69;
const crossingTime = 1.34;
const wakeLength = 14.4;
const railOffset = 10.15;

function makeWarning(scene, side) {
  const group = new THREE.Group();
  group.name = 'Maglev wake warning';
  const bar = new THREE.MeshBasicMaterial({ color: 0xffac60, transparent: true, opacity: .68, depthWrite: false, toneMapped: false });
  const chevron = new THREE.Shape();
  chevron.moveTo(-.52, -.52);
  chevron.lineTo(0, -.51);
  chevron.lineTo(.55, 0);
  chevron.lineTo(0, .51);
  chevron.lineTo(-.52, .52);
  chevron.lineTo(.02, 0);
  const arrow = new THREE.ShapeGeometry(chevron);
  const edgeGeometry = new THREE.PlaneGeometry(13.1, .087);
  for (const z of [-5.5, 5.5]) {
    const edge = new THREE.Mesh(edgeGeometry, bar);
    edge.rotation.x = -Math.PI / 2;
    edge.position.z = z;
    group.add(edge);
  }
  for (let index = -2; index <= 2; index++) {
    const piece = new THREE.Mesh(arrow, bar);
    piece.rotation.x = -Math.PI / 2;
    piece.rotation.z = side < 0 ? 0 : Math.PI;
    piece.position.set(index * 2.45, .004, 1.7);
    group.add(piece);
  }
  group.visible = false;
  scene.add(group);

  function draw(at, age, still) {
    group.visible = true;
    routeAt(at, 0, .025, group.position);
    bar.opacity = still ? .78 : .58 + .22 * Math.sin(age * 6 - .6);
  }
  return { group, draw };
}

export function makeMaglevTraffic(scene, compact, metalMaps) {
  const tracks = [-1, 1].map((side) => ({
    side, train: makeMaglevTrain(scene, side, metalMaps, compact), wake: makeRollingWake(scene, side, wakeLength, compact),
    signal: makeWarning(scene, side), event: null,
  }));
  const reflect = new THREE.PointLight(0xa6eaff, 0, 23, 2);
  scene.add(reflect);
  const spray = makeMaglevSpray(scene, compact);
  const ripples = makeHoofRipples(scene, compact);
  let warning = 0;

  function reset() {
    for (const track of tracks) {
      track.train.visible = track.wake.group.visible = track.signal.group.visible = false;
      track.event = null;
    }
    spray.reset();
    ripples.reset();
    reflect.intensity = warning = 0;
  }

  function update(dt, run, previous, still) {
    const cues = { train: 0, wave: 0, damage: 0 };
    if (run.s < maglevStart) return cues;
    for (const { at, side } of approaches) {
      if (previous < at - leadDistance && run.s >= at - leadDistance) {
        tracks[side < 0 ? 0 : 1].event = { at, age: 0, splashed: false, hit: false, bowAt: 0, crestAt: 0 };
        cues.train = side;
      }
    }

    warning = reflect.intensity = 0;
    for (const track of tracks) {
      const { event, train, side, wake, signal } = track;
      if (!event) continue;
      const age = (event.age += dt);
      wake.group.visible = signal.group.visible = false;
      if (age > 4.18) {
        train.visible = false;
        track.event = null;
        continue;
      }

      const at = event.at;
      const nose = at + 98 - age * 58;
      routeAt(nose, side * railOffset, 0, train.position);
      train.visible = true;
      const gap = Math.abs(nose - run.s);
      const intensity = 148 * (1 - smoothstep(gap, 10, 35));
      if (intensity > reflect.intensity) {
        reflect.position.copy(train.position);
        reflect.position.x -= side * 1.1;
        reflect.position.y = 1.65;
        reflect.position.z += 3.6;
        reflect.intensity = intensity;
      }
      if (!still && gap < 52 && age >= event.bowAt) {
        event.bowAt = age + .038;
        spray.bow(nose, side, run.time);
      }

      const p = (age - surgeDelay) / crossingTime;
      if (p >= 1 || run.s > at + wakeLength * .63) continue;
      warning = side;
      if (p < 0) {
        signal.draw(at, age, still);
        continue;
      }
      if (!event.splashed) {
        event.splashed = true;
        cues.wave = side;
      }
      const x = side * lerp(7.72, -7.2, p);
      wake.draw(at, x, p, still);
      if (!still && age >= event.crestAt) {
        event.crestAt = age + .037;
        spray.crest(at, x, side, run.time, p, wakeLength);
      }
      if (!event.hit && run.jump < .60 && Math.abs(run.s - at) < 5.8 && Math.abs(run.x - x) < 1.25) {
        event.hit = true;
        cues.damage = .21;
      }
    }
    return cues;
  }

  function hoof(position, time, side, landing, speed) {
    spray.hoof(position, time, side, landing, speed);
    ripples.emit(position, time, landing);
  }

  function draw(time) {
    spray.draw(time);
    ripples.draw(time);
  }

  return { update, reset, hoof, skid: spray.skid, draw, get warning() { return warning; } };
}
