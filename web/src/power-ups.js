import * as THREE from 'three';
import { busHalfLength, routeAt, routeLength, runnerHazards, runnerLanes, stages, trainHalfLength } from './route.js';

export const powerKinds = {
  magnet: { name: 'Cork Magnet', seconds: 8, color: 0xd085fa, line: 'BOTTLES PULL IN' },
  shield: { name: 'Bubble Wrap', seconds: 12, color: 0x5ee9ed, line: 'ABSORBS ONE HIT' },
  double: { name: 'Double Pour', seconds: 8, color: 0xffc96e, line: 'DOUBLE POINTS' },
};

const cycle = Object.keys(powerKinds);
const placements = [{ at: 94, lane: 0, kind: 'magnet' }, { at: 216, lane: 0, kind: 'shield' }, { at: 385, lane: 3.65, kind: 'double' }];
for (const [index, stage] of stages.entries()) {
  if (!index) continue;
  const end = stages[index + 1]?.at ?? routeLength;
  for (let at = stage.at + 74, row = 0; at < end - 28; at += 164, row++) {
    const choices = runnerLanes.filter((lane) => !runnerHazards.some(hazard => {
      const depth = hazard.kind === 'train' ? trainHalfLength : hazard.kind === 'bus' ? busHalfLength : 2;
      return hazard.lane === lane && Math.abs(hazard.at - at) < depth + 10;
    }));
    if (choices.length) placements.push({ at, lane: choices[(index + row) % choices.length], kind: cycle[(index + row) % cycle.length] });
  }
}

export function activePower(run, kind) {
  return run.powers[kind] > run.time;
}

export function makePowerUps(scene) {
  const octahedron = new THREE.OctahedronGeometry(.49);
  const dial = new THREE.TorusGeometry(.42, .036, 8, 30);
  const wire = new THREE.EdgesGeometry(octahedron);
  const magnet = new THREE.TorusGeometry(.233, .075, 10, 20, Math.PI * 1.62).rotateZ(-Math.PI * .32);
  const bubble = new THREE.IcosahedronGeometry(.265, 1);
  const flask = new THREE.CapsuleGeometry(.102, .33, 6, 12);
  const hoop = new THREE.Group();
  hoop.name = 'Route power-ups';
  scene.add(hoop);

  const materials = Object.fromEntries(Object.entries(powerKinds).map(([kind, { color }]) => [kind, {
    halo: new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .71, toneMapped: false }),
    outline: new THREE.LineBasicMaterial({ color, transparent: true, opacity: .60 }),
    core: new THREE.MeshPhysicalMaterial({ emissive: color, emissiveIntensity: .66, color, metalness: .32, roughness: .23, clearcoat: .52 }),
  }]));
  const entries = placements.map((entry) => {
    const group = new THREE.Group();
    group.name = powerKinds[entry.kind].name;
    const { halo, outline, core } = materials[entry.kind];
    const border = new THREE.Mesh(dial, halo);
    border.position.y = -.40;
    border.rotation.x = Math.PI / 2;
    group.add(border, new THREE.LineSegments(wire, outline));
    if (entry.kind === 'magnet') group.add(new THREE.Mesh(magnet, core));
    else if (entry.kind === 'shield') group.add(new THREE.Mesh(bubble, core));
    else for (const side of [-1, 1]) {
      const piece = new THREE.Mesh(flask, core);
      piece.position.set(side * .137, side * .07, 0);
      piece.rotation.z = side * .16;
      group.add(piece);
    }
    group.visible = false;
    hoop.add(group);
    return { ...entry, group };
  });
  let cursor = 0;

  function reset(distance) {
    const index = entries.findIndex(entry => entry.at >= distance - 1.6);
    cursor = index < 0 ? entries.length : index;
    for (const { group } of entries) group.visible = false;
  }

  function take(run, previous) {
    let power;
    for (; cursor < entries.length; cursor++) {
      const { at, lane, kind, group } = entries[cursor];
      if (run.s < at - 1.7) break;
      if (previous <= at + 1.85 && Math.abs(run.x - lane) < 1.02 && run.jump < 1.08) {
        run.powers[kind] = run.time + powerKinds[kind].seconds;
        power = kind;
      } else if (run.s <= at + 1.85) break;
      group.visible = false;
    }
    return power;
  }

  function draw(distance, time, still) {
    for (let index = cursor; index < entries.length; index++) {
      const { at, lane, group } = entries[index];
      if (at > distance + 112) break;
      group.visible = at >= distance - 2.1;
      if (!group.visible) continue;
      const bob = still ? 0 : Math.sin(time * 4.5 + at * .22) * .11;
      routeAt(at, lane, 1.12 + bob, group.position);
      group.rotation.y = still ? .24 : time * 1.5 + index * .52;
    }
  }

  return { reset, take, draw };
}
