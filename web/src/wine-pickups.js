import * as THREE from 'three';
import { activePower } from './power-ups.js';
import { boardingTrains, busRoof, maglevStart, routeAt, routeLength, runnerHazards, runnerLanes, stages, trafficRows, trainHalfLength, trainRoof } from './route.js';

const path = [59, 66, 73, 80].map((at) => ({ at, lane: 0, y: 1.01 }));
function trail(at, lane, offsets, heights) {
  offsets.forEach((offset, index) => path.push({ at: at + offset, lane, y: heights[index] }));
}
for (const { at, reward: { kind, lane } } of trafficRows) {
  if (kind === 'bus') trail(at, lane, [-.1, 3.3, 6.25], [busRoof + .92, busRoof + .92, busRoof + .92]);
  else if (kind === 'car' || kind === 'supercar') trail(at, lane, [-5.1, .05, 5.1], [1.78, 2.08, 1.78]);
  else if (kind === 'sign') trail(at, lane, [-5.5, 0, 5.5], [.82, .76, .84]);
  else trail(at, lane, [-6.1, -.15, 5.9], [1.03, 1.03, 1.03]);
}
for (const [index, offset] of [60, 182, 312, 453, 582].entries()) {
  const at = maglevStart + offset;
  if (boardingTrains.some(train => Math.abs(train.at - at) < trainHalfLength + 22)) continue;
  const options = runnerLanes.filter(lane => !runnerHazards.some(hazard => hazard.lane === lane && Math.abs(hazard.at - at) < 13));
  if (options.length) trail(at, options[index % options.length], [-6, 0, 6], [1.02, 1.02, 1.02]);
}
const roofSpacings = [-11.3, -5.3, .7, 6.7, 12.7, 18.7];
for (const { at, lane } of boardingTrains) trail(at, lane, roofSpacings, roofSpacings.map(() => trainRoof + .98));
for (const [index, stage] of stages.slice(5).entries()) {
  if (stage.at === maglevStart) continue;
  const end = stages[stages.indexOf(stage) + 1]?.at ?? routeLength;
  let row = 0;
  for (let at = stage.at + 42; at < end - 19; at += 61) {
    if (boardingTrains.some(train => Math.abs(train.at - at) < trainHalfLength + (at < train.at ? 32 : 21))) continue;
    const busy = runnerHazards.filter((hazard) => {
      const contact = hazard.at - (hazard.kind === 'sentry' ? 9.65 : 0);
      return Math.abs(contact - at) < 14;
    });
    const options = runnerLanes.filter((lane) => !busy.some((hazard) => hazard.lane === lane));
    if (!options.length) continue;
    const lane = options[(row + index) % options.length];
    trail(at, lane, [-5.5, 0, 5.5], [1.03, 1.03, 1.03]);
    row++;
  }
}
path.sort((a, b) => a.at - b.at);
export const bottlePath = path;
export const lapBottleCount = path.length;

const scoreKey = 'zebra-chase-best-v1';
export const scoreFor = (run) => Math.floor(run.travelled + run.record.distanceBonus) + run.record.points;
export const multiplierFor = (streak) => Math.min(5, 1 + Math.floor(Math.max(0, streak - 1) / 3));
export const scoreMultiplierFor = (run) => multiplierFor(run.record.streak) * (activePower(run, 'double') ? 2 : 1);

export function makeRecord(saved) {
  return { points: 0, distanceBonus: 0, bottles: 0, lapBottles: 0, streak: 0, longest: 0, perfects: 0, clean: true, ...saved };
}

export function finishLap(record) {
  const perfect = record.clean && record.lapBottles === lapBottleCount;
  if (perfect) {
    record.perfects++;
    record.points += 10000;
  }
  record.lapBottles = 0;
  record.clean = true;
  return perfect;
}

export function loadBest() {
  try {
    const value = Number(localStorage.getItem(scoreKey));
    return Number.isSafeInteger(value) && value > 0 ? value : 0;
  } catch { return 0; }
}

export function saveBest(best) {
  try { localStorage.setItem(scoreKey, String(best)); } catch { /* Continue to display the session best. */ }
}

function glassGeometry() {
  const outline = [[0, -.39], [.139, -.39], [.182, -.35], [.184, -.30], [.184, .085], [.169, .12],
    [.102, .192], [.062, .226], [.060, .349], [.069, .37], [.069, .394], [.056, .412], [0, .412]];
  return new THREE.LatheGeometry(outline.map(([r, h]) => new THREE.Vector2(r, h)), 18);
}

function labelTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#280c2e';
  ctx.fillRect(0, 0, 256, 96);
  ctx.strokeStyle = '#edb669';
  ctx.lineWidth = 3;
  ctx.strokeRect(5, 5, 246, 86);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff2d5';
  for (const x of [64, 192]) {
    ctx.font = 'bold 25px serif';
    ctx.fillText('ZEBRA', x, 49, 110);
    ctx.fillStyle = '#ffce7b';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('CABERNET', x, 72);
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

function haloTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 72;
  const ctx = canvas.getContext('2d');
  const spot = ctx.createRadialGradient(36, 36, 1, 36, 36, 36);
  spot.addColorStop(0, '#ffdb9cc0');
  spot.addColorStop(.29, '#ffbb5858');
  spot.addColorStop(1, '#f4902000');
  ctx.fillStyle = spot;
  ctx.fillRect(0, 0, 72, 72);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}

export function makeWinePickups(scene, compact) {
  const capacity = compact ? 34 : 50;
  const actor = new THREE.Group();
  actor.name = 'Collectible wine bottles';
  scene.add(actor);
  const shape = glassGeometry();
  const wrap = new THREE.CylinderGeometry(.188, .188, .245, 18, 1, true).translate(0, -.14, 0);
  const foil = new THREE.CylinderGeometry(.073, .064, .105, 14).translate(0, .34, 0);
  const ring = new THREE.TorusGeometry(.28, .016, 7, 25).rotateX(Math.PI / 2).translate(0, -.38, 0);
  const halo = new THREE.PlaneGeometry(.96, 1.14);
  const amber = new THREE.Color(0xffc07b);
  const glow = new THREE.MeshBasicMaterial({ color: amber, toneMapped: false });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x355030, emissive: 0x5e3c1d, emissiveIntensity: .69,
    roughness: .18, metalness: .5, clearcoat: .8 });
  const paper = new THREE.MeshBasicMaterial({ map: labelTexture(), toneMapped: false });
  const bloom = new THREE.MeshBasicMaterial({ map: haloTexture(), transparent: true, opacity: .77, depthWrite: false,
    blending: THREE.AdditiveBlending, toneMapped: false });
  function batch(geometry, material) {
    const mesh = new THREE.InstancedMesh(geometry, material, capacity);
    mesh.count = 0;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    actor.add(mesh);
    return mesh;
  }
  const stand = [batch(shape, glass), batch(wrap, paper), batch(foil, glow), batch(ring, glow)];
  const aura = batch(halo, bloom);
  aura.renderOrder = 3;
  const flashes = Array.from({ length: 12 }, () => {
    const mesh = new THREE.Mesh(halo, bloom.clone());
    mesh.visible = false;
    scene.add(mesh);
    return { mesh, born: -Infinity };
  });
  const pose = new THREE.Object3D();
  let cursor = 0;
  let flash = 0;

  function reset(at) {
    const next = path.findIndex((token) => token.at >= at - 1.8);
    cursor = next < 0 ? path.length : next;
    for (const mesh of [...stand, aura]) mesh.count = 0;
    for (const spark of flashes) {
      spark.born = -Infinity;
      spark.mesh.visible = false;
    }
  }

  function take(run, previous, still) {
    let award = 0;
    const magnet = activePower(run, 'magnet');
    for (; cursor < path.length; cursor++) {
      const { at, lane, y } = path[cursor];
      if (run.s < at - 1.7) break;
      const close = previous <= at + 1.85 && Math.abs(run.x - lane) < (magnet ? 4.12 : .86) &&
        Math.abs(run.jump + .98 - run.slide * .29 - y) < (magnet ? .99 : .71);
      if (!close) {
        if (run.s <= at + 1.85) break;
        run.record.streak = 0;
        continue;
      }
      run.record.streak++;
      run.record.bottles++;
      run.record.lapBottles++;
      run.record.longest = Math.max(run.record.streak, run.record.longest);
      const value = 100 * scoreMultiplierFor(run);
      run.record.points += value;
      award += value;
      if (!still) {
        const spark = flashes[flash++ % flashes.length];
        spark.born = run.time;
        routeAt(at, lane, y, spark.mesh.position);
      }
    }
    return award;
  }

  function draw(distance, time, still, run) {
    const magnet = run && activePower(run, 'magnet');
    let count = 0;
    for (let index = cursor; index < path.length && count < capacity; index++) {
      const { at, lane, y } = path[index];
      if (at > distance + 124) break;
      if (at < distance - 2.2) continue;
      const wobble = still ? 0 : Math.sin(time * 4.7 + at * .23) * .082;
      const reaches = magnet && Math.abs(lane - run.x) < 4.12 && Math.abs(y - run.jump - .98) < .99;
      const pull = reaches ? 1 - THREE.MathUtils.smoothstep(at - distance, 1.6, 11) : 0;
      routeAt(at, pull ? THREE.MathUtils.lerp(lane, run.x, pull) : lane, y + wobble, pose.position);
      pose.rotation.set(0, still ? .38 : time * 1.85 + index * .71, .035);
      pose.scale.setScalar(1);
      pose.updateMatrix();
      for (const mesh of stand) mesh.setMatrixAt(count, pose.matrix);
      pose.rotation.set(0, 0, 0);
      pose.updateMatrix();
      aura.setMatrixAt(count++, pose.matrix);
    }
    for (const mesh of [...stand, aura]) {
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
    }
    for (const { mesh, born } of flashes) {
      const age = time - born;
      mesh.visible = !still && age >= 0 && age < .26;
      if (!mesh.visible) continue;
      mesh.scale.setScalar(.82 + age * 9.6);
      mesh.material.opacity = .9 * (1 - age / .26);
    }
  }
  return { take, reset, draw };
}
