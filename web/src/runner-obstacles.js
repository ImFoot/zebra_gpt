import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { batches } from './city.js';
import { makeRunnerCarFactory } from './downtown-activity.js';
import { createRunnerBus } from './runner-bus.js';
import { makeBoardableTrainFactory } from './runner-train.js';
import { busHalfLength, busRoof, routeAt, routeHeading, runnerHazards, trainHalfLength, trainRoof } from './route.js';

const { smoothstep } = THREE.MathUtils;
const specifications = {
  car: [1.29, 1.81, 'jump', 0xff6050],
  supercar: [1.34, 2.05, 'jump', 0xff8263],
  bus: [1.36, busHalfLength, 'jump', 0xffc566],
  train: [1.42, trainHalfLength, 'jump', 0xffc566],
  cart: [1.26, 1.1, 'jump', 0xe8a34d],
  cache: [1.18, 1.04, 'jump', 0x7bffb0],
  plinth: [1.22, .94, 'jump', 0xffcf93],
  vent: [1.23, 1.06, 'jump', 0xff864e],
  pixel: [1.24, 1.05, 'jump', 0x90e7ff],
  hatch: [1.29, 1.10, 'jump', 0x8fe8ff],
  scrap: [1.26, 1.03, 'jump', 0xffae73],
  barrels: [1.28, 1.06, 'jump', 0xf4c47a],
  sign: [1.37, .48, 'slide', 0xffcb7f],
  cable: [1.34, .43, 'slide', 0xff906a],
  codebar: [1.36, .48, 'slide', 0xa7ff93],
  duct: [1.38, .50, 'slide', 0xf879c7],
  display: [1.30, .48, 'slide', 0xffb178],
  press: [1.33, .53, 'slide', 0xff7f51],
  sweeper: [1.39, .54, 'slide', 0x88e9ff],
  bulkhead: [1.37, .56, 'slide', 0xa7acfd],
  awning: [1.39, .61, 'slide', 0xf78cbc],
  hook: [1.36, .49, 'slide', 0xffa76c],
  brace: [1.36, .52, 'slide', 0xffd07b],
  marquee: [1.37, .51, 'slide', 0xffc27e],
  sentry: [1.16, .64, 'slide', 0xff4f61],
};

const armor = new THREE.MeshStandardMaterial({ metalness: .73, roughness: .42 });
const edge = new THREE.MeshStandardMaterial({ metalness: .55, roughness: .28 });
const rubber = new THREE.MeshStandardMaterial({ color: 0x202832, roughness: .67 });
const dark = new THREE.MeshStandardMaterial({ color: 0x111b28, metalness: .57, roughness: .39 });
const porcelain = new THREE.MeshPhysicalMaterial({ color: 0xbeb2aa, roughness: .42, clearcoat: .45 });
const bronze = new THREE.MeshStandardMaterial({ color: 0xb39370, metalness: .73, roughness: .31 });
const oak = new THREE.MeshStandardMaterial({ color: 0x765749, roughness: .76 });
const awningFabric = new THREE.MeshStandardMaterial({ color: 0x73516b, roughness: .82 });
const glows = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
const frame = new RoundedBoxGeometry(1, 1, 1, 2, .125);
const ring = new THREE.TorusGeometry(1, .12, 9, 31);
const sphere = new THREE.SphereGeometry(1, 20, 13);
const tube = new THREE.CylinderGeometry(1, 1, 1, 16);
const beam = new THREE.BoxGeometry(1, 1, 1);
const arrow = new THREE.Shape();
arrow.moveTo(-.31, .13);
arrow.lineTo(0, -.12);
arrow.lineTo(.31, .13);
arrow.lineTo(.31, -.04);
arrow.lineTo(0, -.29);
arrow.lineTo(-.31, -.04);
const arrowFace = new THREE.ShapeGeometry(arrow);
const paints = [0xb72c43, 0xb6bdcd, 0x275c72, 0xd09932, 0x505864, 0x57476d];
const tall = new Set(['sign', 'codebar', 'sweeper', 'press', 'bulkhead', 'marquee']);

function part(parent, geometry, material, x, y, z, width, height, depth) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(width, height, depth);
  parent.add(mesh);
  return mesh;
}

function material(color) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(1.46), toneMapped: false });
}

function warningDecal() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#302523';
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = '#f8ad49';
  for (let x = -55; x < 280; x += 47) {
    ctx.beginPath();
    ctx.moveTo(x + 29, 0);
    ctx.lineTo(x + 49, 0);
    ctx.lineTo(x + 22, 64);
    ctx.lineTo(x + 2, 64);
    ctx.fill();
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map, roughness: .49, metalness: .22 });
}

function gantry(group, batch, kind, color, glow) {
  const width = 2.69;
  const banner = tall.has(kind);
  if (kind === 'duct' || kind === 'cable') {
    part(group, tube, edge, 0, 2.429, .026, .305, width, .305).rotation.z = Math.PI / 2;
    for (const x of [-1.07, .05, 1.07]) {
      part(group, ring, dark, x, 2.429, .026, .31, .31, .36).rotation.y = Math.PI / 2;
    }
  } else part(group, frame, kind === 'awning' ? awningFabric : dark, 0, 2.41, -.012, width, banner ? .63 : .48, kind === 'awning' ? 1.51 : .87);
  batch.add(edge, 0, 2.149, .365, width - .14, .074, .086, 0x4b525e);
  batch.add(glows, 0, 2.15, .472, width - .17, .028, .046, color);
  batch.add(glows, 0, 2.68, .414, width - .18, .031, .046, color);
  for (const x of [-.84, 0, .84]) {
    part(group, arrowFace, glow, x, 2.46, .455, .81, .81, 1);
  }
  batch.add(dark, 0, 5.32, -.09, width + .53, .11, .43);
  for (const side of [-1, 1]) {
    batch.add(armor, side * 1.34, 3.94, -.04, .083, 2.78, .09, 0x4f605d);
    batch.add(edge, side * 1.28, 2.78, -.045, .27, .14, .34, 0x5f6a72);
    batch.add(glows, side * 1.19, 2.47, .45, .073, .1, .03, 0xfcecdf);
    batch.add(glows, side * 1.20, .025, 1.56, .053, .014, 1.94, color);
  }
  for (let strip = 0; strip < 4; strip++) {
    batch.add(edge, 0, 2.61, -.29 + strip * .18, width + .07, .082, .074, 0x59626c);
  }
  if (kind === 'press') for (const x of [-.92, .92]) {
    part(group, tube, bronze, x * 1.65, 4.06, -.05, .18, 2.67, .18);
    part(group, tube, dark, x * 1.65, 4.74, -.05, .25, 1.12, .25);
  }
  if (kind === 'bulkhead' || kind === 'brace' || kind === 'awning') for (let segment = -2; segment <= 2; segment++) {
    batch.add(kind === 'awning' ? awningFabric : armor, segment * .52, 2.576, -.124, .30, .092, kind === 'awning' ? 1.28 : .92,
      kind === 'awning' ? (segment % 2 ? 0xba91af : 0x548ca8) : 0x8590a2);
  }
  if (kind === 'hook') for (const x of [-.97, .97]) {
    const shackle = part(group, ring, bronze, x, 2.68, -.13, .265, .27, .24);
    shackle.rotation.y = .35;
  }
  if (kind === 'marquee') {
    batch.add(bronze, 0, 2.63, -.02, width + .05, .053, .92);
    for (const x of [-1.13, -.76, -.38, 0, .38, .76, 1.13]) part(group, sphere, glow, x, 2.64, .457, .03, .031, .024);
  }
}

function cargo(group, batch, kind, color, stripe) {
  const industrial = kind === 'cart' || kind === 'vent';
  const digital = kind === 'pixel' || kind === 'cache';
  if (kind === 'barrels') {
    batch.add(dark, 0, .10, 0, 2.55, .2, 1.74);
    for (const x of [-.78, 0, .78]) {
      part(group, tube, oak, x, .51, x * .21, .324, .76, .324);
      for (const y of [.24, .78]) part(group, ring, bronze, x, y, x * .21, .319, .319, .23).rotation.x = Math.PI / 2;
    }
    batch.add(glows, 0, .175, .872, 2.11, .026, .036, color);
    return;
  }
  part(group, frame, kind === 'plinth' ? porcelain : dark, 0, .43, 0, 2.48, .70, 1.9);
  if (kind === 'plinth') {
    part(group, frame, porcelain, 0, .78, 0, 2.37, .18, 1.76);
    part(group, frame, bronze, 0, .59, 0, 2.53, .064, 1.94);
    batch.add(glows, 0, .674, .971, 2.03, .04, .022, color);
    return;
  }
  for (const x of [-.86, 0, .86]) {
    part(group, frame, digital ? armor : edge, x, .64, .04, .73, .55, 1.56);
    batch.add(glows, x, .687, .837, .54, .063, .04, color);
    batch.add(dark, x, .91, .04, .57, .043, 1.38, 0x222c30);
    if (digital) {
      batch.add(glows, x, .937, .07, .038, .022, 1.40, color);
      batch.add(glows, x, .94, -.49, .57, .025, .055, color);
    }
    if (kind === 'hatch') part(group, sphere, edge, x, .80, .04, .31, .16, .54);
    if (kind === 'scrap') {
      const cog = part(group, ring, bronze, x, .75, .56, .23, .23, .30);
      cog.rotation.y = x * .37;
    }
  }
  batch.add(industrial ? stripe : glows, 0, .299, .955, 2.24, .13, .041, color);
  for (const side of [-1, 1]) {
    batch.add(armor, side * 1.19, .17, 0, .12, .20, 1.59, 0x7c8797);
    batch.add(glows, side * 1.064, .477, .967, .164, .107, .02, 0xffead2);
    if (industrial) for (let index = 0; index < 5; index++) {
      batch.add(rubber, side * .8, .93, -.55 + index * .27, .48, .035, .095, 0x35393e);
    }
  }
}

function makeSentry(group, color) {
  const red = material(color);
  const amber = material(0xffbd7a);
  const hull = new THREE.Group();
  hull.name = 'Subway and district security sentry';
  hull.position.y = 1.99;
  const polished = new THREE.MeshPhysicalMaterial({ color: 0x82949d, metalness: .72, roughness: .29, clearcoat: .72 });
  part(hull, sphere, polished, 0, 0, 0, .75, .40, .66);
  part(hull, sphere, dark, 0, -.12, .26, .62, .24, .48);
  part(hull, sphere, red, 0, .02, .642, .31, .073, .037);
  part(hull, frame, dark, 0, .259, -.07, .42, .20, .65);
  for (const side of [-1, 1]) {
    part(hull, frame, dark, side * .73, -.16, .05, .83, .28, .60).rotation.z = -side * .17;
    part(hull, tube, polished, side * .91, -.21, .019, .258, .19, .258);
    part(hull, ring, amber, side * .92, -.317, .019, .18, .18, .14).rotation.x = Math.PI / 2;
    part(hull, sphere, red, side * .82, -.13, .359, .126, .056, .048);
    part(hull, frame, polished, side * .69, .119, -.095, .52, .077, .46);
  }
  const scanner = part(group, beam, new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: .22, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  }), 0, .02, 9.12, 2.25, .006, 18);
  const pulse = part(group, sphere, red, 0, 1.96, 0, .26, .12, .92);
  const pulseCore = part(pulse, sphere, amber, 0, 0, 0, .55, .51, .96);
  pulseCore.position.z = .14;
  pulse.visible = false;
  group.add(hull);
  return { hull, scanner, pulse };
}

export function makeRunnerObstacles(scene, metalMaps, compact) {
  const makeCar = makeRunnerCarFactory();
  const makeTrain = makeBoardableTrainFactory(metalMaps, compact);
  const stripe = warningDecal();
  let target = null;
  let time = 0;
  let upcoming = null;
  const placements = runnerHazards.map((config, index) => {
    const { at, kind, lane } = config;
    const [width, length, dodge, color] = specifications[kind];
    const group = new THREE.Group();
    group.name = `Runner ${kind} ${at.toFixed(0)}`;
    routeAt(at, lane, 0, group.position);
    group.rotation.y = routeHeading(at);
    const batch = batches(group);
    let sentry;
    if (kind === 'sentry') sentry = makeSentry(group, color);
    else if (dodge === 'slide') gantry(group, batch, kind, color, material(color));
    else if (kind === 'bus') createRunnerBus(group, index);
    else if (kind === 'train') makeTrain(group, index);
    else if (kind === 'car' || kind === 'supercar') {
      group.add(makeCar(paints[index % paints.length], kind === 'supercar'));
      for (const side of [-1, 1]) batch.add(glows, side * 1.29, .016, 2.23, .06, .016, 1.37, 0xff6c40);
    } else cargo(group, batch, kind, color, stripe);
    batch.finish();
    group.visible = false;
    scene.add(group);
    const roof = kind === 'bus' ? busRoof : kind === 'train' ? trainRoof : 0;
    const entry = { ...config, width, length, dodge, roof, group, sentry, passed: false, disabledAt: -Infinity };
    if (sentry) entry.aim = {
      position: new THREE.Vector3(),
      hit() {
        if (entry.disabledAt > -Infinity || entry.passed) return false;
        entry.disabledAt = time;
        return true;
      },
    };
    return entry;
  });
  const decks = placements.filter(({ roof }) => roof);

  function roofAt(distance, lane) {
    return decks.find(({ at, lane: deckLane, length, kind }) => Math.abs(lane - deckLane) < 1.14 &&
      distance > at - length + (kind === 'train' ? 3.85 : .28) && distance < at + length - .28) ?? null;
  }

  function deckAhead(distance, lane) {
    return decks.find(({ at, lane: deckLane, length, passed }) => !passed && Math.abs(lane - deckLane) < 1.65 &&
      at - length - distance >= 3.4 && at - length - distance <= 23) ?? null;
  }

  function reset() {
    upcoming = target = null;
    for (const entry of placements) {
      entry.passed = false;
      entry.disabledAt = -Infinity;
      entry.group.visible = false;
    }
  }

  function slideDistance(run) {
    for (const entry of placements) {
      if (entry.at > run.s + 36) break;
      if (entry.dodge !== 'slide' || entry.passed || entry.disabledAt > -Infinity) continue;
      const distance = entry.at - (entry.sentry ? 9.65 : 0) - run.s;
      if (distance >= -.45 && Math.abs(entry.lane - run.x) < entry.width + .30) return distance;
    }
    return Infinity;
  }

  function update(run, previous, still) {
    time = run.time;
    target = upcoming = null;
    let impact;
    for (const entry of placements) {
      const { at, group, sentry, length, width, dodge } = entry;
      const gap = at - run.s;
      group.visible = gap > -Math.max(13, length + 13) && gap < 124 + length;
      if (!group.visible) continue;
      let lane = entry.lane;
      let distance = at;
      let depth = length;
      if (sentry) {
        const { hull, pulse, scanner } = sentry;
        const burnt = entry.disabledAt > -Infinity;
        const age = time - entry.disabledAt;
        const weave = still ? 0 : (1 - smoothstep(-gap, -39, -24)) * .77 * Math.sin(time * 3.2 + at * .12);
        lane += weave;
        routeAt(at, lane, 0, group.position);
        hull.visible = !burnt || age < .48;
        hull.position.y = 1.99 + (still ? 0 : Math.sin(time * 7 + at) * .074) +
          (burnt ? -1.9 * smoothstep(age, 0, .45) : 1.55 * (1 - smoothstep(gap, -3, 7)));
        hull.rotation.z = burnt ? smoothstep(age, 0, .46) * 1.8 : weave * .13;
        scanner.visible = !burnt && gap > 4 && gap < 39;
        scanner.material.opacity = still ? .23 : .18 + .16 * smoothstep(gap, 31, 42) + Math.sin(time * 17) * .05;
        pulse.visible = !burnt && gap > -1 && gap < 19.3;
        pulse.position.z = pulse.visible ? 19.3 - Math.max(gap, 0) : 0;
        if (burnt) continue;
        if (!entry.passed && gap > 8.5 && gap < 46 && Math.abs(run.x - lane) < 2.65 && !target) {
          routeAt(at, lane, hull.position.y, entry.aim.position);
          target = entry.aim;
        }
        // The energized scan crosses its marked lane in front of the hull.
        distance = at - 9.65;
        depth = 1.1;
      }
      if (!upcoming && !entry.passed && gap > (entry.roof ? length - 1 : 2.5) && gap < (entry.roof ? length + 34 : 36) &&
          Math.min(Math.abs(run.x - lane), Math.abs((run.laneTarget ?? run.x) - lane)) < width + .59) upcoming = entry;
      if (entry.passed) continue;
      const overlaps = run.s >= distance - depth - .41 && previous <= distance + depth + .38 && Math.abs(run.x - lane) < width + .31;
      const clear = dodge === 'jump' ? run.jump >= (entry.roof ? entry.roof - .12 : .85) : run.slide >= .60;
      if (overlaps && !clear) {
        entry.passed = true;
        impact = entry;
      }
      if (run.s > distance + depth + .38) entry.passed = true;
    }
    return impact;
  }
  return { update, reset, slideDistance, roofAt, deckAhead, get target() { return target; }, get upcoming() { return upcoming; } };
}
