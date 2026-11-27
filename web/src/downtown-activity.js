import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { roadWidth, routeAt, routeHeading, sectionAt, tunnelStart } from './route.js';

const cube = new THREE.BoxGeometry();
const ellipsoid = new THREE.SphereGeometry(1, 12, 8);
const figureVolume = new THREE.SphereGeometry(1, 8, 5);
const pillar = new THREE.CylinderGeometry(1, 1, 1, 6);
const axisY = new THREE.Vector3(0, 1, 0);
const pose = new THREE.Object3D();
const vehicleLane = roadWidth * .5 - .85;
const sidewalkLane = roadWidth * .5 + .99;
const curbHeight = .144;
const tau = Math.PI * 2;

function part(geometry, location, size, angles = [0, 0, 0]) {
  const result = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  pose.position.fromArray(location);
  pose.scale.fromArray(size);
  pose.rotation.fromArray(angles);
  pose.updateMatrix();
  result.applyMatrix4(pose.matrix);
  return result;
}

function combine(pieces) {
  const geometry = mergeGeometries(pieces);
  for (const piece of pieces) piece.dispose();
  return geometry;
}

function pillarBetween(start, end, radius) {
  const origin = new THREE.Vector3(...start);
  const direction = new THREE.Vector3(...end).sub(origin);
  pose.position.copy(origin).addScaledVector(direction, .5);
  pose.scale.set(radius, direction.length(), radius);
  pose.quaternion.setFromUnitVectors(axisY, direction.normalize());
  pose.updateMatrix();
  return pillar.toNonIndexed().applyMatrix4(pose.matrix);
}

function loft(sections) {
  const ringSize = 16;
  const vertices = [];
  const uv = [];
  const indices = [];
  for (const [index, [z, width, bottom, top]] of sections.entries()) {
    for (let point = 0; point < ringSize; point++) {
      const angle = point / ringSize * tau;
      const slope = Math.cos(angle);
      const crown = .5 + .5 * Math.sign(slope) * Math.abs(slope) ** .62;
      vertices.push(width * Math.sin(angle), THREE.MathUtils.lerp(bottom, top, crown), z);
      uv.push(point / ringSize, index / (sections.length - 1));
    }
  }
  for (let row = 0; row < sections.length - 1; row++) {
    for (let point = 0; point < ringSize; point++) {
      const here = row * ringSize + point;
      const next = row * ringSize + (point + 1) % ringSize;
      indices.push(here, here + ringSize, next, next, here + ringSize, next + ringSize);
    }
  }
  for (const [index, reversed] of [[0, false], [sections.length - 1, true]]) {
    const [z, , bottom, top] = sections[index];
    const cap = vertices.length / 3;
    vertices.push(0, (bottom + top) * .5, z);
    uv.push(.5, .5);
    for (let point = 0; point < ringSize; point++) {
      const here = index * ringSize + point;
      const next = index * ringSize + (point + 1) % ringSize;
      indices.push(cap, reversed ? next : here, reversed ? here : next);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function canvasTexture(width, height, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext('2d'));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function emissive(color, gain = 1) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(gain), toneMapped: false });
}

function batch(group, geometry, material, capacity) {
  const mesh = new THREE.InstancedMesh(geometry, material, capacity);
  mesh.count = 0;
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(mesh);
  return mesh;
}

function fleet(group, capacity) {
  const shell = loft([
    [-1.63, .43, .28, .45], [-1.52, .56, .24, .51], [-1.21, .635, .225, .595], [-.74, .654, .212, .638],
    [-.02, .652, .208, .658], [.70, .643, .21, .644], [1.21, .574, .232, .589], [1.50, .495, .254, .515],
  ]);
  const glass = loft([
    [-.98, .444, .514, .583], [-.713, .487, .522, .724], [-.415, .473, .52, .919],
    [-.17, .453, .52, .990], [.46, .433, .513, .990], [.68, .419, .502, .901], [1.105, .450, .508, .588],
  ]);
  const roof = loft([[-.36, .338, .928, .951], [-.19, .354, .950, 1.006], [.43, .349, .945, 1.005], [.59, .322, .916, .954]]);
  const body = batch(group, combine([shell.toNonIndexed(), roof.toNonIndexed()]), new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: .267, metalness: .46,
  }), capacity);
  shell.dispose();
  roof.dispose();
  const cabin = batch(group, glass, new THREE.MeshStandardMaterial({ color: 0x102d2e, metalness: .58, roughness: .155 }), capacity);
  const details = [part(ellipsoid, [0, .299, -1.47], [.507, .07, .186]), part(ellipsoid, [0, .291, 1.43], [.524, .078, .127])];
  const front = [];
  const rear = [];
  const strips = [];
  const bright = [];
  for (const side of [-1, 1]) {
    details.push(part(ellipsoid, [side * .526, .267, .093], [.107, .091, .95]));
    details.push(pillarBetween([side * .476, .622, -.704], [side * .25, .957, -.261], .017));
    details.push(pillarBetween([side * .433, .588, .917], [side * .24, .967, .530], .020));
    details.push(pillarBetween([side * .432, .600, .062], [side * .286, .961, .091], .012));
    details.push(part(ellipsoid, [side * .606, .651, -.581], [.110, .038, .079]));
    front.push(part(ellipsoid, [side * .321, .387, -1.543], [.168, .044, .039], [0, side * -.26, 0]));
    bright.push(part(cube, [side * .477, .282, -1.529], [.073, .026, .027], [0, side * -.26, 0]));
    rear.push(part(ellipsoid, [side * .34, .391, 1.447], [.17, .05, .026], [0, side * .16, 0]));
    strips.push(part(ellipsoid, [side * .612, .223, -.014], [.025, .021, .646]));
  }
  const trim = batch(group, combine(details), new THREE.MeshStandardMaterial({ color: 0x657c78, roughness: .32, metalness: .8 }), capacity);
  const headlights = batch(group, combine(front.concat(bright)), emissive(0xffffff, 2.1), capacity);
  const taillights = batch(group, combine(rear), emissive(0xff3e26, 1.65), capacity);
  const lift = batch(group, combine(strips), emissive(0x71e7cb, .85), capacity);

  const rooftop = batch(group, combine([part(cube, [0, 1.04, .11], [.40, .083, .17])]), emissive(0xffb653, 1.3), capacity);
  const lettering = canvasTexture(160, 45, (ctx) => {
    ctx.fillStyle = '#eabe63';
    ctx.fillRect(0, 0, 160, 45);
    ctx.fillStyle = '#170f10';
    ctx.textAlign = 'center';
    ctx.font = '900 30px sans-serif';
    ctx.fillText('TAXI', 80, 33);
    for (const x of [11, 24, 127, 140]) for (let i = 0; i < 2; i++) {
      ctx.fillRect(x, 12 + ((x + i) % 2 ? 12 : 0), 8, 7);
    }
  });
  const tag = new THREE.PlaneGeometry(.403, .086);
  const label = batch(group, combine([part(tag, [0, 1.04, .197], [1, 1, 1]), part(tag, [0, 1.04, .023], [1, 1, 1], [0, Math.PI, 0])]),
    new THREE.MeshBasicMaterial({ map: lettering, toneMapped: false }), capacity);
  tag.dispose();

  const diffusion = canvasTexture(64, 64, (ctx) => {
    const gradient = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
    gradient.addColorStop(0, '#fffa');
    gradient.addColorStop(.42, '#fff4');
    gradient.addColorStop(1, '#fff0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
  });
  const washGeometry = new THREE.PlaneGeometry(2.05, 4.44).rotateX(-Math.PI / 2).translate(0, .024, -1.37);
  const wash = batch(group, washGeometry, new THREE.MeshBasicMaterial({
    map: diffusion, transparent: true, opacity: .36, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  }), capacity);
  wash.renderOrder = 3;
  return { forms: [body, cabin, trim, headlights, taillights, lift], taxi: [rooftop, label], wash, body, headlights };
}

function makeCrowd(group, capacity) {
  const coat = combine([
    part(figureVolume, [0, 1.131, .006], [.229, .327, .139]),
    part(figureVolume, [0, .933, .029], [.217, .275, .127]),
    part(figureVolume, [0, 1.475, -.034], [.129, .159, .119]),
    part(figureVolume, [-.207, 1.044, .016], [.075, .251, .073], [-.22, 0, -.14]),
    part(figureVolume, [.212, 1.087, -.043], [.073, .202, .075], [.25, 0, .12]),
  ]);
  const human = batch(group, coat, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .54, metalness: .08 }), capacity);
  const limbs = combine([part(figureVolume, [0, .35, 0], [.076, .381, .071]), part(figureVolume, [0, .056, -.045], [.080, .056, .142])]);
  const legs = batch(group, limbs, new THREE.MeshStandardMaterial({ color: 0x141c22, roughness: .79 }), capacity * 2);
  const fabric = new THREE.LatheGeometry([
    new THREE.Vector2(.60, 0), new THREE.Vector2(.59, .021), new THREE.Vector2(.49, .098),
    new THREE.Vector2(.32, .178), new THREE.Vector2(.14, .229), new THREE.Vector2(.003, .235),
  ], 9);
  const canopy = batch(group, fabric, new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: .39, metalness: .12 }), capacity);
  const ribs = new THREE.CylinderGeometry(.014, .014, .73, 5).translate(0, -.343, 0);
  const handles = batch(group, ribs, new THREE.MeshStandardMaterial({ color: 0x4b655e, roughness: .29, metalness: .66 }), capacity);
  return { human, legs, canopy, handles };
}

const taxis = [0xc68a2d, 0xb77a29, 0xe3ac42, 0xb58d4e].map((value) => new THREE.Color(value));
const privateCars = [0x2d646c, 0x626a83, 0x596173, 0x7b4d61].map((value) => new THREE.Color(value));
const lamps = [0xffdfbf, 0xc7faff, 0xe5ffd4].map((value) => new THREE.Color(value));
const coats = [0x553c33, 0x2d3443, 0x45554f, 0x605d53, 0x3a4544, 0x48384b].map((value) => new THREE.Color(value));
const umbrellas = [0x77463b, 0x2e4759, 0x574464, 0x796241, 0x405d51].map((value) => new THREE.Color(value));
const titleCoats = coats.map((value) => value.clone().multiplyScalar(.48));
const titleUmbrellas = umbrellas.map((value) => value.clone().multiplyScalar(.54));

function seedFor(number) {
  const value = Math.imul(number + 162, 0x27d4eb2d);
  return (value ^ value >>> 15) >>> 0;
}

function setPose(station, lane, height, yaw, scale = 1, pitch = 0, roll = 0) {
  routeAt(station, lane, height, pose.position);
  pose.rotation.set(pitch, yaw, roll);
  pose.scale.setScalar(scale);
  pose.updateMatrix();
}

export function makeDowntownActivity(scene, { compact = false } = {}) {
  const group = new THREE.Group();
  group.name = 'Downtown traffic and sidewalks';
  scene.add(group);
  const vehiclesPerLane = compact ? 2 : 3;
  const cells = compact ? 7 : 9;
  const peoplePerCell = compact ? 2 : 3;
  const vehicles = fleet(group, vehiclesPerLane * 2);
  const crowd = makeCrowd(group, cells * peoplePerCell * 2);
  let time = 0;

  function update(dt, distance, intro, reducedMotion) {
    group.visible = distance < tunnelStart + 4;
    if (!group.visible) return;
    if (!reducedMotion) time += dt * (intro ? .43 : 1);
    const exchange = sectionAt(distance) === 2;
    const matchingLanes = [
      { side: -1, offset: 48, rate: -11.65 }, { side: 1, offset: 42, rate: 7.8 },
    ];
    let active = 0;
    let cabCount = 0;
    for (const { side, offset, rate } of matchingLanes) {
      const spacing = side > 0 ? 34 : 38;
      const progress = offset + time * rate;
      const first = Math.ceil((distance - 22 - progress) / spacing);
      for (let index = first; index < first + vehiclesPerLane; index++) {
        const station = progress + index * spacing;
        if (station > tunnelStart - 6 || station < -10) continue;
        const seed = seedFor(index * 2 + side);
        const lane = side * vehicleLane;
        const heading = routeHeading(station) + (rate < 0 ? Math.PI : 0);
        const taxi = side > 0 || seed % 3 === 0;
        const colors = taxi ? taxis : privateCars;
        const palette = (seed >>> 3) % colors.length;
        const light = lamps[seed % lamps.length];
        const bob = reducedMotion ? 0 : Math.sin(time * 4 + index * 1.8) * .035;
        setPose(station, lane, bob, heading, 1, bob * .21, bob * .32);
        for (const form of vehicles.forms) form.setMatrixAt(active, pose.matrix);
        if (taxi) {
          for (const detail of vehicles.taxi) detail.setMatrixAt(cabCount, pose.matrix);
          cabCount++;
        }
        vehicles.body.setColorAt(active, colors[palette]);
        vehicles.headlights.setColorAt(active, light);
        setPose(station, lane, .002, heading);
        vehicles.wash.setMatrixAt(active, pose.matrix);
        vehicles.wash.setColorAt(active, light);
        active++;
      }
    }
    for (const form of vehicles.forms) form.count = active;
    for (const detail of vehicles.taxi) detail.count = cabCount;
    vehicles.wash.count = active;

    let walkers = 0;
    let covered = 0;
    const spacing = 15.5;
    const firstCell = Math.floor((distance - 27) / spacing);
    const coatColors = intro ? titleCoats : coats;
    const umbrellaColors = intro ? titleUmbrellas : umbrellas;
    for (let cell = firstCell; cell < firstCell + cells; cell++) for (const side of [-1, 1]) {
      for (let member = 0; member < peoplePerCell; member++) {
        const seed = seedFor(cell * 53 + side * 13 + member);
        const flicker = seed % 100 / 99;
        const walking = (seed >>> 6) % 5 !== 0;
        // Each visible sidewalk block contains its own small groups. They stay out of the road.
        const phase = time * (.50 + flicker * .13) + seed % 31;
        const travel = walking ? Math.sin(phase) * 2.2 : 0;
        const station = cell * spacing + 2.7 + member * 3.3 + flicker * 3 + (reducedMotion ? 0 : travel);
        if (station >= tunnelStart - 5 || station < -8 || (intro && Math.abs(station - distance) < 12.5)) continue;
        const lane = side * (sidewalkLane + ((seed >>> 4) % 89 - 44) * .013);
        const stature = .88 + flicker * .17;
        const direction = Math.cos(phase);
        const turn = THREE.MathUtils.smoothstep(-direction, -.44, .44) * Math.PI;
        const angle = routeHeading(station) + (walking ? turn + .07 : -side * 1.12);
        const gait = walking && !reducedMotion ? Math.sin(time * 7.4 + station * .61) * Math.min(1, Math.abs(direction) * 1.6) : 0;
        const bob = Math.abs(gait) * .028;
        setPose(station, lane, curbHeight + bob, angle, stature, 0, gait * .035);
        crowd.human.setMatrixAt(walkers, pose.matrix);
        crowd.human.setColorAt(walkers, coatColors[seed % coatColors.length]);
        for (const [leg, bias] of [-1, 1].entries()) {
          const step = gait * bias;
          const localZ = .134 * step * stature;
          const localX = .099 * bias * stature;
          setPose(station, lane, curbHeight + Math.max(0, step) * .055, angle, stature, .28 * step);
          pose.position.x += localX * Math.cos(angle) + localZ * Math.sin(angle);
          pose.position.z += localZ * Math.cos(angle) - localX * Math.sin(angle);
          pose.updateMatrix();
          crowd.legs.setMatrixAt(walkers * 2 + leg, pose.matrix);
        }
        if (exchange || seed % 4 !== 0) {
          setPose(station, lane + side * .058, curbHeight + bob + 1.705 * stature, angle, stature, .095, side * -.085);
          pose.scale.x *= .93;
          pose.scale.z *= .93;
          pose.updateMatrix();
          crowd.canopy.setMatrixAt(covered, pose.matrix);
          crowd.canopy.setColorAt(covered, umbrellaColors[(seed >>> 10) % umbrellaColors.length]);
          crowd.handles.setMatrixAt(covered, pose.matrix);
          covered++;
        }
        walkers++;
      }
    }
    crowd.human.count = walkers;
    crowd.legs.count = walkers * 2;
    crowd.canopy.count = crowd.handles.count = covered;
    for (const mesh of group.children) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }

  return { update };
}
