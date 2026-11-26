import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const cube = new THREE.BoxGeometry();
const panel = new THREE.IcosahedronGeometry(1, 1);
const localZ = new THREE.Vector3(0, 0, 1);

function makePlates() {
  const layers = new Map();
  const pose = new THREE.Object3D();
  const start = new THREE.Vector3();
  const length = new THREE.Vector3();

  function collect(geometry, material) {
    pose.updateMatrix();
    const piece = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    piece.applyMatrix4(pose.matrix);
    if (!layers.has(material)) layers.set(material, []);
    layers.get(material).push(piece);
  }

  function part(geometry, material, at, scale = [1, 1, 1], angles = [0, 0, 0]) {
    pose.position.fromArray(at);
    pose.scale.fromArray(scale);
    pose.rotation.fromArray(angles);
    collect(geometry, material);
  }

  function trace(material, a, b, width = .021, height = .013) {
    start.fromArray(a);
    length.fromArray(b).sub(start);
    pose.position.copy(start).addScaledVector(length, .5);
    pose.scale.set(width, height, length.length() + width * .3);
    pose.quaternion.setFromUnitVectors(localZ, length.normalize());
    collect(cube, material);
  }

  function plate(material, outline, y, depth, bevel = .027) {
    const shape = new THREE.Shape();
    outline.forEach(([x, z], index) => {
      if (index === 0) shape.moveTo(x, z);
      else shape.lineTo(x, z);
    });
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, steps: 1,
    });
    part(geometry, material, [0, y + depth * .5, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
    geometry.dispose();
  }

  function joinInto(group) {
    for (const [material, geometries] of layers) {
      group.add(new THREE.Mesh(mergeGeometries(geometries), material));
      for (const geometry of geometries) geometry.dispose();
    }
  }

  return { part, trace, plate, joinInto };
}

function makeCanard(materials) {
  const { armor, chrome, seam, printed, status } = materials;
  const wing = new THREE.Group();
  const pieces = makePlates();
  pieces.plate(armor, [[0, .30], [.36, .12], [.95, -.71], [.92, -.87], [.64, -.76], [.49, -.48], [.18, -.51], [-.055, -.36]], .01, .092);
  pieces.plate(chrome, [[.06, .22], [.30, .08], [.84, -.69], [.81, -.726], [.57, -.53], [.32, -.17]], .06, .026, .011);
  pieces.plate(seam, [[.16, .042], [.29, -.078], [.49, -.38], [.452, -.456], [.28, -.41], [.14, -.2]], -.05, .028, .013);
  pieces.plate(armor, [[.48, -.23], [.74, -.44], [1.17, -.68], [1.19, -.91], [.96, -.84], [.84, -.61], [.52, -.52]], -.075, .056, .017);
  pieces.trace(printed, [.05, .092, .20], [.229, .086, .081], .022);
  pieces.trace(printed, [.229, .086, .081], [.547, .086, -.379], .022);
  pieces.trace(status, [.598, .087, -.446], [.714, .087, -.611], .027);
  pieces.trace(printed, [.838, -.033, -.547], [1.103, -.042, -.74], .029);
  pieces.trace(status, [1.105, -.07, -.75], [1.144, -.075, -.854], .03);
  pieces.trace(printed, [.285, -.065, .016], [.54, -.067, -.331], .022);
  pieces.trace(status, [.581, -.072, -.394], [.727, -.073, -.581], .025);
  pieces.trace(printed, [.79, -.12, -.559], [1.039, -.12, -.73], .024);
  for (let slot = 0; slot < 4; slot++) {
    const x = .26 + slot * .059;
    const z = -.346 - slot * .064;
    pieces.part(cube, seam, [x, .057, z], [.067, .016, .023], [0, -.41, 0]);
  }
  pieces.joinInto(wing);
  return wing;
}

function addHalo(group, map, color, at, size, opacity) {
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity,
  }));
  glow.position.fromArray(at);
  glow.scale.set(size, size * .76, 1);
  group.add(glow);
  return glow;
}

function makeScanner(materials, halo) {
  const optic = new THREE.Group();
  const housing = new THREE.CylinderGeometry(.186, .205, .143, 8);
  const torus = new THREE.TorusGeometry(.153, .016, 5, 16);
  const glass = new THREE.MeshStandardMaterial({ color: 0x210a13, roughness: .11, metalness: .52, emissive: 0x831621, emissiveIntensity: .29 });
  const ember = new THREE.MeshBasicMaterial({ color: 0xff4837, toneMapped: false });
  const core = new THREE.MeshBasicMaterial({ color: 0xffd7a5, toneMapped: false });
  const pieces = makePlates();
  pieces.part(housing, materials.chrome, [0, 0, .06], [1.21, 1, .89], [Math.PI / 2, 0, 0]);
  pieces.part(torus, materials.seam, [0, 0, .139], [1.17, .84, 1]);
  pieces.part(panel, glass, [0, 0, .137], [.162, .105, .058]);
  for (const side of [-1, 1]) pieces.part(cube, materials.status, [side * .157, -.028, .153], [.018, .05, .008], [0, 0, side * -.26]);
  pieces.joinInto(optic);
  housing.dispose();
  torus.dispose();

  const sweep = new THREE.Group();
  const bars = makePlates();
  bars.part(panel, ember, [0, 0, .196], [.126, .034, .010]);
  bars.part(panel, core, [0, 0, .202], [.063, .013, .008]);
  bars.joinInto(sweep);
  optic.add(sweep);
  const glow = addHalo(optic, halo, 0xff492f, [0, 0, .220], .56, .37);
  return { optic, sweep, glow };
}

export function makeDrone(scene, halo) {
  const drone = new THREE.Group();
  const materials = {
    armor: new THREE.MeshStandardMaterial({ color: 0x33464a, metalness: .76, roughness: .238 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0x7b9694, metalness: .85, roughness: .235 }),
    seam: new THREE.MeshStandardMaterial({ color: 0x111c20, metalness: .58, roughness: .46 }),
    printed: new THREE.MeshBasicMaterial({ color: 0x48d5a1, toneMapped: false }),
    status: new THREE.MeshBasicMaterial({ color: 0xabffdf, toneMapped: false }),
  };
  const { armor, chrome, seam, printed, status } = materials;
  const body = makePlates();
  body.plate(armor, [[-.20, -.802], [.20, -.802], [.45, -.444], [.562, .05], [.51, .303], [.360, .506], [.188, .632], [-.188, .632], [-.360, .506], [-.51, .303], [-.562, .05], [-.45, -.444]], .035, .178, .056);
  body.plate(seam, [[-.19, -.63], [.19, -.63], [.38, -.23], [.35, .28], [.16, .542], [-.16, .542], [-.35, .28], [-.38, -.23]], -.107, .125);
  body.plate(chrome, [[-.12, -.694], [.12, -.694], [.24, -.39], [.22, .26], [.10, .46], [-.10, .46], [-.22, .26], [-.24, -.39]], .129, .047, .029);
  body.part(panel, seam, [0, -.04, .52], [.305, .158, .143]);
  body.part(panel, armor, [0, -.167, -.09], [.23, .113, .38], [.10, 0, 0]);
  body.part(panel, chrome, [0, .056, -.772], [.234, .124, .179]);
  body.plate(armor, [[-.224, .51], [.224, .51], [.187, .652], [.0, .735], [-.187, .652]], .043, .047, .023);
  body.trace(chrome, [-.126, .075, .665], [0, .075, .728], .032, .017);
  body.trace(chrome, [0, .075, .728], [.126, .075, .665], .032, .017);
  body.trace(seam, [-.171, .043, -.862], [.171, .043, -.862], .083, .087);
  body.trace(status, [-.116, .049, -.909], [.116, .049, -.909], .033, .031);
  for (const side of [-1, 1]) {
    body.part(panel, chrome, [side * .425, .012, -.12], [.185, .113, .265]);
    body.plate(seam, [[side * .253, -.491], [side * .342, -.347], [side * .387, .016], [side * .345, .231], [side * .278, .128]], .139, .019, .011);
    body.trace(printed, [side * .22, .184, -.357], [side * .226, .186, -.024], .019);
    body.trace(printed, [side * .226, .186, -.024], [side * .143, .187, .117], .019);
    body.trace(status, [side * .145, .189, .163], [side * .145, .189, .258], .029);
    body.trace(chrome, [side * .57, -.026, .115], [side * .458, -.031, .383], .021, .023);
    body.trace(printed, [side * .457, -.034, .395], [side * .326, -.033, .524], .021, .02);
    body.trace(printed, [side * .384, -.173, .2], [side * .276, -.203, .336], .019);
    body.trace(printed, [side * .276, -.203, .336], [side * .105, -.207, .377], .019);
    body.plate(armor, [[side * .101, -.562], [side * .244, -.532], [side * .407, -.846], [side * .368, -1.059], [side * .265, -.945]], -.024, .071, .023);
    body.trace(printed, [side * .255, .037, -.647], [side * .335, .033, -.841], .026);
    for (let socket = 0; socket < 3; socket++) {
      body.part(cube, chrome, [side * (.299 + socket * .049), .174, -.215], [.035, .018, .016]);
    }
  }
  body.joinInto(drone);

  const wings = [-1, 1].map((side) => {
    const wing = makeCanard(materials);
    wing.position.set(side * .405, -.027, -.045);
    wing.scale.x = side;
    drone.add(wing);
    return wing;
  });
  const { optic, sweep, glow } = makeScanner(materials, halo);
  optic.position.set(0, -.086, .568);
  drone.add(optic);
  addHalo(drone, halo, 0x4dfab6, [0, .055, -.912], .49, .23);
  drone.visible = false;
  scene.add(drone);

  const fanGeometry = new THREE.BufferGeometry();
  const fanPoints = new THREE.BufferAttribute(new Float32Array(12), 3).setUsage(THREE.DynamicDrawUsage);
  fanGeometry.setAttribute('position', fanPoints);
  fanGeometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2));
  fanGeometry.setIndex([0, 1, 2, 1, 3, 2]);
  const fanMaterial = new THREE.ShaderMaterial({
    uniforms: { clock: { value: 0 } },
    vertexShader: 'varying vec2 scanUv; void main() { scanUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float clock; varying vec2 scanUv;
      void main() {
        float edge = sin(scanUv.x * 3.141593);
        float rays = .23 + .58 * pow(.5 + .5 * cos(scanUv.x * 57.0 + clock * 2.1), 5.0);
        float fade = smoothstep(0.0, .12, scanUv.y) * (1.0 - .66 * scanUv.y);
        gl_FragColor = vec4(.12, 1.0, .43, .23 * rays * fade * edge);
      }`,
    side: THREE.DoubleSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const fan = new THREE.Mesh(fanGeometry, fanMaterial);
  fan.frustumCulled = false;
  const floorScan = new THREE.Mesh(new THREE.RingGeometry(.92, 1, 32), new THREE.MeshBasicMaterial({
    color: 0x66ff9f, transparent: true, opacity: .30, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  }));
  floorScan.rotation.x = -Math.PI / 2;
  floorScan.scale.set(1.03, .67, 1);
  fan.visible = floorScan.visible = false;
  scene.add(fan, floorScan);

  function pose(position, time, yaw, pitch, roll) {
    drone.visible = Boolean(position);
    fan.visible = floorScan.visible = Boolean(position && position.y > .9 && position.y < 6.5 && Math.abs(roll) < .54);
    if (!position) return;
    drone.position.copy(position);
    drone.rotation.set(pitch, yaw, roll);
    const sweepPhase = Math.sin(time * 1.87);
    optic.rotation.y = sweepPhase * .27;
    optic.rotation.x = -.05 + Math.sin(time * 2.6) * .074;
    sweep.position.y = Math.sin(time * 4.42) * .048;
    glow.position.y = sweep.position.y * .7;
    glow.material.opacity = .42 + .09 * Math.sin(time * 4.42 + Math.PI / 3);
    const banking = Math.sin(time * 3.1) * .043;
    wings[0].rotation.set(-.092 + banking, -.035 + roll * .15, .15 + banking);
    wings[1].rotation.set(-.092 - banking, .035 + roll * .15, -.15 + banking);

    if (fan.visible) {
      const angle = yaw + sweepPhase * .46;
      const x = Math.sin(angle);
      const z = Math.cos(angle);
      const reach = position.y * 1.36;
      const groundX = position.x + x * reach;
      const groundZ = position.z + z * reach;
      floorScan.position.set(groundX, .031, groundZ);
      floorScan.rotation.z = -angle;
      fanPoints.setXYZ(0, position.x + x * .77 - z * .044, position.y - .10, position.z + z * .77 + x * .044);
      fanPoints.setXYZ(1, position.x + x * .77 + z * .044, position.y - .10, position.z + z * .77 - x * .044);
      fanPoints.setXYZ(2, groundX - z * 1.02, .043, groundZ + x * 1.02);
      fanPoints.setXYZ(3, groundX + z * 1.02, .043, groundZ - x * 1.02);
      fanPoints.needsUpdate = true;
      fanMaterial.uniforms.clock.value = time;
    }
  }

  return { drone, pose };
}
