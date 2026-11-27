import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { batches } from './city.js';

const { lerp } = THREE.MathUtils;
const tau = Math.PI * 2;

// Longitudinal station, half-beam, sill and roof. The last six metres taper into the nose.
const cabStations = [
  [-16.55, .04, 1.81, 1.87], [-16.38, 1.51, .57, 3.47], [-16.16, 1.76, .43, 3.65],
  [-14.2, 1.82, .38, 3.72], [-6.15, 1.83, .38, 3.72], [-4.00, 1.78, .42, 3.62],
  [-2.34, 1.69, .45, 3.38], [-.87, 1.57, .51, 2.92], [.36, 1.37, .58, 2.47],
  [1.48, 1.10, .67, 2.05], [2.48, .86, .79, 1.70], [3.16, .53, .92, 1.46],
  [3.48, .26, 1.04, 1.35], [3.58, .02, 1.16, 1.20],
];
const coachStations = [
  [-7.30, .02, 1.79, 1.84], [-7.22, 1.45, .57, 3.46], [-7.04, 1.77, .42, 3.66],
  [-6.58, 1.83, .38, 3.72], [0, 1.83, .38, 3.72], [6.58, 1.83, .38, 3.72],
  [7.04, 1.77, .42, 3.66], [7.22, 1.45, .57, 3.46], [7.30, .02, 1.79, 1.84],
];

function hullAt(stations, z, out) {
  let index = 0;
  while (index < stations.length - 2 && stations[index + 1][0] < z) index++;
  const from = stations[index];
  const to = stations[index + 1];
  const before = stations[Math.max(0, index - 1)];
  const after = stations[Math.min(stations.length - 1, index + 2)];
  const length = to[0] - from[0];
  const u = THREE.MathUtils.clamp((z - from[0]) / length, 0, 1);
  const u2 = u * u, u3 = u2 * u;
  for (let slot = 1; slot <= 3; slot++) {
    const a = from[slot], b = to[slot];
    const slopeA = length * (b - before[slot]) / (to[0] - before[0]);
    const slopeB = length * (after[slot] - a) / (after[0] - from[0]);
    const value = (2 * u3 - 3 * u2 + 1) * a + (u3 - 2 * u2 + u) * slopeA + (-2 * u3 + 3 * u2) * b + (u3 - u2) * slopeB;
    out[slot - 1] = THREE.MathUtils.clamp(value, Math.min(a, b), Math.max(a, b));
  }
}

function skin(stations, from, to, angles, lift, lengthSteps, arcSteps) {
  const points = [], uv = [], triangles = [];
  const section = [];
  for (let zStep = 0; zStep <= lengthSteps; zStep++) {
    const along = zStep / lengthSteps;
    const z = lerp(from, to, along);
    hullAt(stations, z, section);
    const [width, sill, roof] = section;
    const [left, right] = angles(along);
    for (let arcStep = 0; arcStep <= arcSteps; arcStep++) {
      const around = arcStep / arcSteps;
      const angle = lerp(left, right, around);
      const x = Math.sin(angle), y = Math.cos(angle);
      points.push(width * Math.sign(x) * Math.abs(x) ** .74 + x * lift,
        (sill + roof) * .5 + (roof - sill) * .5 * Math.sign(y) * Math.abs(y) ** .72 + y * lift, z);
      uv.push(along, around);
      if (zStep === lengthSteps || arcStep === arcSteps) continue;
      const vertex = zStep * (arcSteps + 1) + arcStep;
      const next = vertex + arcSteps + 1;
      triangles.push(vertex, next, vertex + 1, vertex + 1, next, next + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(triangles);
  geometry.computeVertexNormals();
  return geometry;
}

function windowImage() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 128);
  gradient.addColorStop(0, '#192b36');
  gradient.addColorStop(.39, '#487482');
  gradient.addColorStop(.52, '#2e475a');
  gradient.addColorStop(1, '#101b29');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = '#9ed6d4';
  ctx.fillRect(9, 13, 236, 3);
  ctx.fillStyle = '#11202d';
  for (const x of [17, 85, 166, 220]) {
    ctx.beginPath();
    ctx.roundRect(x, 57 + x % 14, 39, 73, 11);
    ctx.fill();
  }
  ctx.fillStyle = '#ccecf61b';
  ctx.beginPath();
  ctx.moveTo(56, 0);
  ctx.lineTo(170, 0);
  ctx.lineTo(107, 128);
  ctx.lineTo(5, 128);
  ctx.fill();
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

function passengerShell(stations, materials, compact) {
  const object = new THREE.Group();
  const byMaterial = new Map();
  const last = stations[stations.length - 1][0];
  const first = stations[0][0];
  const radial = compact ? 22 : 32;
  function add(material, geometry) {
    if (!byMaterial.has(material)) byMaterial.set(material, []);
    byMaterial.get(material).push(geometry);
  }
  add(materials.pearl, skin(stations, first, last, () => [0, tau], 0, compact ? 42 : 68, radial));

  function band(material, xmin, xmax, side, a, b, depth, steps = 16, slices = 4) {
    const angle = side > 0 ? [a, b] : [-b, -a];
    add(material, skin(stations, xmin, xmax, () => angle, depth, steps, slices));
  }

  function finish() {
    for (const [material, pieces] of byMaterial) {
      const geometry = pieces.length === 1 ? pieces[0] : mergeGeometries(pieces);
      object.add(new THREE.Mesh(geometry, material));
      if (pieces.length > 1) for (const piece of pieces) piece.dispose();
    }
    return object;
  }
  return { add, band, finish };
}

function makeCab(materials, compact, rear) {
  const cab = passengerShell(cabStations, materials, compact);
  const marker = rear ? materials.tailLight : materials.headLight;
  cab.add(materials.trim, skin(cabStations, -4.71, .23, t => [-lerp(.98, .73, t), lerp(.98, .73, t)], .018, 25, 14));
  cab.add(materials.visor, skin(cabStations, -4.60, .13, t => [-lerp(.91, .67, t), lerp(.91, .67, t)], .041, 25, 14));
  cab.add(materials.visorGlint, skin(cabStations, -3.98, .05, t => [-.54 + .34 * t, -.49 + .34 * t], .046, 20, 2));
  for (const side of [-1, 1]) {
    cab.band(materials.navy, -16.09, 3.45, side, 1.48, 2.04, .023, 62);
    cab.band(materials.livery, -16.1, 3.38, side, 1.42, 1.56, .035, 62, 3);
    cab.band(materials.guidance, -15.89, 2.99, side, 1.657, 1.683, .042, 41, 2);
    cab.band(materials.trim, -.99, 2.90, side, .91, 1.18, .052, 22, 4);
    cab.band(marker, -.80, 2.69, side, .977, 1.088, .063, 22, 4);
    cab.band(materials.windowTrim, -10.99, -6.73, side, .993, 1.425, .03, 17, 4);
    cab.band(materials.window, -10.87, -6.85, side, 1.024, 1.39, .05, 17, 5);
    cab.band(materials.trim, -15.12, -13.58, side, .92, 2.09, .027, 5, 9);
    cab.band(materials.livery, -9.69, -9.57, side, 1.01, 1.40, .058, 1, 3);
    cab.band(materials.livery, -8.11, -7.989, side, 1.01, 1.40, .058, 1, 3);
  }
  return cab.finish();
}

function makeCoach(materials, compact) {
  const coach = passengerShell(coachStations, materials, compact);
  for (const side of [-1, 1]) {
    coach.band(materials.navy, -7.07, 7.07, side, 1.48, 2.04, .019, 35);
    coach.band(materials.livery, -7.06, 7.06, side, 1.42, 1.56, .031, 35, 3);
    coach.band(materials.guidance, -6.89, 6.89, side, 1.654, 1.68, .046, 30, 2);
    coach.band(materials.windowTrim, -6.41, 6.41, side, .947, 1.408, .023, 34, 5);
    for (let index = 0; index < 6; index++) {
      const z = -4.08 + index * 1.62;
      coach.band(materials.window, z - .69, z + .69, side, .982, 1.376, .046, 4, 4);
      coach.band(materials.windowLight, z - .52, z + .55, side, .995, 1.025, .055, 3, 2);
    }
    for (const door of [-5.88, 5.88]) {
      coach.band(materials.trim, door - .62, door + .62, side, .92, 2.01, .042, 5, 10);
      coach.band(materials.pearl, door - .55, door + .55, side, .956, 1.982, .053, 5, 11);
      coach.band(materials.window, door - .34, door + .34, side, 1.018, 1.465, .061, 3, 4);
      coach.band(materials.guidance, door - .55, door - .51, side, 1.52, 1.86, .065, 1, 3);
    }
  }
  return coach.finish();
}

export function makeMaglevTrain(scene, side, metalMaps, compact) {
  const train = new THREE.Group();
  train.name = `Maglev train ${side < 0 ? 'left' : 'right'}`;
  const interior = windowImage();
  const lamp = (color, energy = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(energy), toneMapped: false });
  const materials = {
    pearl: new THREE.MeshPhysicalMaterial({ ...metalMaps, color: side < 0 ? 0xc2dde1 : 0xe3ddd0,
      metalness: .49, roughness: .42, envMapIntensity: .86, normalScale: new THREE.Vector2(.19, .19), clearcoat: .78, clearcoatRoughness: .16 }),
    trim: new THREE.MeshStandardMaterial({ color: 0x263746, metalness: .61, roughness: .34 }),
    navy: new THREE.MeshPhysicalMaterial({ color: side < 0 ? 0x11627c : 0x6e4246, roughness: .31, metalness: .38, clearcoat: .59 }),
    livery: new THREE.MeshStandardMaterial({ color: side < 0 ? 0x40bfc7 : 0xe48b4d, metalness: .44, roughness: .34, emissive: 0x153440, emissiveIntensity: .2 }),
    visor: new THREE.MeshPhysicalMaterial({ color: 0x15283d, roughness: .15, metalness: .44, envMapIntensity: 1.08,
      emissive: 0x1b5365, emissiveIntensity: .16, clearcoat: .93, clearcoatRoughness: .092 }),
    visorGlint: new THREE.MeshStandardMaterial({ color: 0x709cad, metalness: .64, roughness: .26, emissive: 0x2b4860, emissiveIntensity: .33 }),
    window: new THREE.MeshPhysicalMaterial({ color: 0x94aebe, map: interior, emissiveMap: interior, emissive: 0x5a93a1,
      emissiveIntensity: .52, metalness: .3, roughness: .24, clearcoat: .71 }),
    windowTrim: new THREE.MeshStandardMaterial({ color: 0x12242e, metalness: .56, roughness: .37 }),
    guidance: lamp(side < 0 ? 0x43e6ff : 0xffab69, 1.32),
    headLight: lamp(side < 0 ? 0xc8fbff : 0xffecbc, 2.1),
    tailLight: lamp(0xff463d, 1.54),
    windowLight: lamp(0x94d2d7),
  };
  const lead = makeCab(materials, compact, false);
  lead.name = 'Sculpted maglev nose';
  train.add(lead);
  const passenger = makeCoach(materials, compact);
  const underbody = batches(train);
  const carOffsets = Array.from({ length: 3 }, (_, index) => -24.16 - index * 14.99);
  const carPlacement = new THREE.Matrix4();
  for (const { geometry, material } of passenger.children) {
    const coaches = new THREE.InstancedMesh(geometry, material, carOffsets.length);
    carOffsets.forEach((z, index) => coaches.setMatrixAt(index, carPlacement.makeTranslation(0, 0, z)));
    coaches.computeBoundingSphere();
    train.add(coaches);
  }
  for (const z of carOffsets) {
    underbody.add(materials.trim, 0, 1.51, z + 7.43, 2.55, 1.78, .78, 0x47505c);
    underbody.add(materials.trim, 0, .46, z, 2.94, .22, 13.25, 0x586770);
    underbody.add(materials.guidance, 0, .345, z, 2.54, .036, 11.74, 0x547f86);
  }
  underbody.finish();
  const tail = makeCab(materials, compact, true);
  tail.rotation.y = Math.PI;
  tail.position.z = -78.34;
  train.add(tail);
  train.visible = false;
  scene.add(train);
  return train;
}
