import * as THREE from 'three';
import { makePlates } from './airframe.js';
import { routeAt, stages } from './route.js';

const causeway = stages.find(({ id }) => id === 'causeway');
const box = new THREE.BoxGeometry();
const puck = new THREE.CylinderGeometry(1, 1, 1, 24);
const bolt = new THREE.CylinderGeometry(1, 1, 1, 6);
const bead = new THREE.SphereGeometry(1, 16, 8);
const ring = new THREE.TorusGeometry(1, .054, 8, 40);
const duct = new THREE.LatheGeometry([
  [1.10, -.67], [1.21, -.62], [1.30, -.47], [1.34, .24], [1.25, .50], [1.15, .56],
  [1.07, .50], [1.02, .33], [1.02, -.44], [1.05, -.61], [1.10, -.67],
].map(([radius, height]) => new THREE.Vector2(radius, height)), 44);
const beamShape = new THREE.ConeGeometry(1, 1, 28, 1, true).translate(0, -.5, 0);
const tailProfile = new THREE.Shape()
  .moveTo(-.53, 0).lineTo(.54, 0).lineTo(.82, .73).lineTo(.35, .86).lineTo(-.19, .27).lineTo(-.53, 0);
const tailFin = new THREE.ExtrudeGeometry(tailProfile, {
  depth: .080, bevelThickness: .037, bevelSize: .035, bevelSegments: 2, steps: 1,
});

const flybys = [
  { entry: 0, exit: 154, from: [60, 12.1, 48], to: [-32, 13.0, 15], dip: 5.1, scale: 1.05 },
  { entry: 104, exit: 289, from: [-78, 13.9, 67], to: [56, 14.7, 31], dip: 4.0, scale: .94 },
  { entry: 310, exit: 526, from: [91, 13.5, 68], to: [-53, 13.7, 22], dip: 5.4, scale: 1.14 },
];

function abrasionMap() {
  let seed = 549924;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#b3b3ba';
  ctx.fillRect(0, 0, 256, 256);
  for (let index = 0; index < 60; index++) {
    const x = random() * 256;
    const y = random() * 256;
    const radius = 12 + random() * 48;
    const stain = ctx.createRadialGradient(x, y, 0, x, y, radius);
    stain.addColorStop(0, index % 3 ? '#28273328' : '#e8d0a035');
    stain.addColorStop(1, '#00000000');
    ctx.fillStyle = stain;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  for (let index = 0; index < 1250; index++) {
    ctx.fillStyle = index % 3 ? '#f1eeee29' : '#201a223d';
    ctx.fillRect(random() * 256, random() * 256, 2 + random() * 23, .28 + random() * .77);
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 4;
  return map;
}

function makeBeamMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { opacity: { value: .37 } },
    vertexShader: /* glsl */ `
      varying float down;
      varying vec3 viewNormal;
      varying vec3 viewRay;
      void main() {
        vec4 point = modelViewMatrix * vec4(position, 1.0);
        down = -position.y;
        viewNormal = normalMatrix * normal;
        viewRay = -point.xyz;
        gl_Position = projectionMatrix * point;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float opacity;
      varying float down;
      varying vec3 viewNormal;
      varying vec3 viewRay;
      void main() {
        float center = pow(abs(dot(normalize(viewNormal), normalize(viewRay))), 1.4);
        float fade = smoothstep(0.0, .14, down) * pow(1.0 - smoothstep(.35, 1.0, down), 1.6);
        gl_FragColor = vec4(.30, .66, 1.0, opacity * center * fade);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
    depthWrite: false,
    toneMapped: false,
  });
}

function makeCraft() {
  const map = abrasionMap();
  const steel = new THREE.MeshStandardMaterial({ color: 0x7d98a8, map, metalness: .62, roughness: .38 });
  const armor = new THREE.MeshStandardMaterial({ color: 0x3b5264, map, metalness: .49, roughness: .46 });
  const gunmetal = new THREE.MeshStandardMaterial({ color: 0x222830, map, metalness: .56, roughness: .52 });
  const copper = new THREE.MeshStandardMaterial({ color: 0xa77849, map, metalness: .67, roughness: .31 });
  const stripe = new THREE.MeshStandardMaterial({ color: 0xd2a067, metalness: .19, roughness: .53 });
  const scanner = new THREE.MeshStandardMaterial({ color: 0x7b1221, emissive: 0xff162d, emissiveIntensity: 1.65, metalness: .32, roughness: .20 });
  const lens = new THREE.MeshStandardMaterial({ color: 0xb5d9f4, emissive: 0x6fbbff, emissiveIntensity: 2.4, metalness: .20, roughness: .24 });
  const nav = new THREE.MeshStandardMaterial({ color: 0xc15b34, emissive: 0xff6537, emissiveIntensity: 1.7, roughness: .43 });
  const body = makePlates();
  const outline = [[-.83, 2.45], [-1.49, 1.64], [-1.73, .67], [-1.44, -1.51], [-.86, -2.68], [-.47, -3.35],
    [.47, -3.35], [.86, -2.68], [1.44, -1.51], [1.73, .67], [1.49, 1.64], [.83, 2.45]];
  body.plate(armor, outline, -.02, .84, .14);
  body.plate(steel, [[-.60, 2.28], [-1.16, 1.15], [-1.04, -.44], [-.61, -2.06], [.61, -2.06],
    [1.04, -.44], [1.16, 1.15], [.60, 2.28]], .48, .22, .11);
  body.plate(gunmetal, [[-.87, 1.98], [-1.13, .89], [-.97, -.54], [-.61, -2.60], [.61, -2.60],
    [.97, -.54], [1.13, .89], [.87, 1.98]], -.52, .38, .12);
  body.part(bead, gunmetal, [0, -.17, 2.12], [1.12, .36, .49]);
  body.part(bead, scanner, [0, -.24, 2.48], [.51, .095, .21]);
  body.part(box, scanner, [0, -.60, 1.09], [.81, .057, .14]);
  body.trace(copper, [0, .71, -.22], [0, .68, -2.01], .078, .043);

  for (const side of [-1, 1]) {
    const shape = (points) => points.map(([x, z]) => [x * side, z]);
    body.plate(steel, shape([[.69, 2.49], [1.06, 3.15], [1.65, 3.32], [1.95, 2.88], [1.78, .91], [1.18, .51]]), -.12, .47, .10);
    body.plate(armor, shape([[1.04, 2.75], [1.53, 2.89], [1.67, 2.63], [1.49, 1.24], [1.16, 1.42]]), -.40, .16, .055);
    body.plate(gunmetal, shape([[1.24, 1.56], [3.67, 1.10], [4.24, .51], [3.81, -.40], [1.59, -1.41]]), -.08, .64, .12);
    body.plate(steel, shape([[1.47, 1.65], [2.92, 1.29], [3.62, .70], [2.68, .11], [1.51, .31]]), .34, .19, .07);
    body.plate(armor, shape([[.70, -.96], [1.68, -1.38], [3.76, -1.80], [4.83, -2.43], [4.42, -2.98],
      [2.82, -2.86], [1.26, -3.04], [.63, -2.69]]), .00, .24, .08);
    body.plate(steel, shape([[2.67, -1.70], [3.66, -1.81], [4.82, -2.43], [4.62, -2.65], [3.54, -2.37]]), .17, .12, .042);
    body.part(tailFin, armor, [side * 2.98, .10, -2.36], [1, 1, 1], [0, Math.PI / 2, side * -.30]);
    body.part(bead, gunmetal, [side * 2.31, -.20, -2.01], [.67, .43, 1.00]);
    body.part(box, nav, [side * 4.80, .01, -2.44], [.20, .13, .24], [0, side * .37, 0]);
    body.part(box, scanner, [side * 1.38, -.38, 3.18], [.29, .12, .12], [0, side * .48, 0]);
    body.trace(copper, [side * 1.58, -.47, 1.29], [side * 2.57, -.41, .84], .095, .089);
    body.trace(steel, [side * .91, -.72, .63], [side * .59, -.71, -2.18], .075, .065);
    for (let slot = 0; slot < 6; slot++) {
      body.part(box, steel, [side * .68, -.71, .83 - slot * .198], [.29, .08, .066], [0, side * -.24, 0]);
    }
    for (let tick = 0; tick < 3; tick++) {
      body.part(box, stripe, [side * (1.60 + tick * .205), -.427, 2 - tick * .55], [.116, .028, .21], [0, side * .32, 0]);
    }
  }
  const hull = new THREE.Group();
  body.joinInto(hull);

  const engineParts = makePlates();
  engineParts.part(duct, steel, [0, 0, 0]);
  engineParts.part(ring, copper, [0, .27, 0], [1.32, 1.32, 1.12], [Math.PI / 2, 0, 0]);
  engineParts.part(ring, gunmetal, [0, -.43, 0], [1.30, 1.30, 1.21], [Math.PI / 2, 0, 0]);
  engineParts.part(ring, lens, [0, -.63, 0], [1.058, 1.058, .50], [Math.PI / 2, 0, 0]);
  engineParts.part(puck, gunmetal, [0, .14, 0], [1.015, .075, 1.015]);
  for (let detail = 0; detail < 12; detail++) {
    const angle = detail * Math.PI / 6;
    const x = Math.sin(angle);
    const z = Math.cos(angle);
    engineParts.part(box, armor, [x * 1.30, -.07, z * 1.30], [.24, .48, .105], [0, angle, 0]);
    engineParts.part(bolt, copper, [x * 1.167, -.583, z * 1.167], [.043, .085, .043]);
  }
  const engine = new THREE.Group();
  engineParts.joinInto(engine);

  const fanParts = makePlates();
  fanParts.part(bead, steel, [0, 0, 0], [.32, .19, .32]);
  fanParts.part(puck, copper, [0, -.14, 0], [.19, .07, .19]);
  for (let fin = 0; fin < 11; fin++) {
    const angle = fin * Math.PI * 2 / 11;
    fanParts.part(box, armor, [Math.sin(angle) * .596, 0, Math.cos(angle) * .596], [.174, .060, .71],
      [.13, angle + .35, .24]);
  }
  const fan = new THREE.Group();
  fanParts.joinInto(fan);

  const lampParts = makePlates();
  lampParts.part(puck, gunmetal, [0, -.16, 0], [.35, .39, .35]);
  lampParts.part(ring, steel, [0, -.33, 0], [.278, .278, .68], [Math.PI / 2, 0, 0]);
  lampParts.part(bead, lens, [0, -.349, 0], [.255, .084, .255]);
  const lamp = new THREE.Group();
  lampParts.joinInto(lamp);

  return { hull, engine, fan, lamp };
}

export function makeCausewayPatrol(scene) {
  const model = makeCraft();
  const wing = new THREE.Group();
  wing.name = 'Sunbreak patrol';
  wing.visible = false;
  scene.add(wing);

  const patrol = flybys.map((pass) => {
    const craft = model.hull.clone();
    craft.name = 'Continuum patrol craft';
    craft.scale.setScalar(pass.scale);
    craft.visible = false;
    wing.add(craft);
    const fans = [];
    const lights = [];
    for (const side of [-1, 1]) {
      const nacelle = model.engine.clone();
      nacelle.position.set(side * 3.46, -.16, .28);
      nacelle.scale.set(1.07, 1.19, 1.07);
      nacelle.rotation.z = side * -.13;
      const fan = model.fan.clone();
      fan.position.y = -.30;
      fans.push(fan);
      const upperFan = model.fan.clone();
      upperFan.position.y = .30;
      fans.push(upperFan);
      nacelle.add(fan, upperFan);
      craft.add(nacelle);

      const lamp = model.lamp.clone();
      lamp.position.set(side * 1.34, -.49, 2.27);
      const beam = new THREE.Mesh(beamShape, makeBeamMaterial());
      beam.name = 'Patrol searchlight';
      beam.position.y = -.40;
      beam.scale.set(2.8, 12, 2.8);
      lamp.add(beam);
      craft.add(lamp);
      lights.push({ lamp, beam, side });
    }
    return { pass, craft, fans, lights };
  });
  const sound = { level: 0, pan: 0 };
  const riderPosition = new THREE.Vector3();

  function update(distance, lane, time, still) {
    const offset = distance - causeway.at;
    wing.visible = offset >= 0 && offset < causeway.length;
    if (!wing.visible) return null;
    routeAt(distance, lane, 2.0, riderPosition);
    sound.level = 0;
    patrol.forEach(({ pass, craft, fans, lights }, index) => {
      craft.visible = offset >= pass.entry && offset < pass.exit;
      if (!craft.visible) return;
      const progress = (offset - pass.entry) / (pass.exit - pass.entry);
      const sweep = THREE.MathUtils.smoothstep(progress, 0, 1);
      const [fromX, fromY, fromLead] = pass.from;
      const [toX, toY, toLead] = pass.to;
      const direction = Math.sign(toX - fromX);
      const cross = THREE.MathUtils.lerp(fromX, toX, sweep);
      const height = THREE.MathUtils.lerp(fromY, toY, sweep) - Math.sin(sweep * Math.PI) * pass.dip;
      const ahead = distance + THREE.MathUtils.lerp(fromLead, toLead, sweep);
      const phase = time * 1.5 + index * 2.1;
      routeAt(ahead, cross, height + (still ? 0 : Math.sin(phase) * .26), craft.position);
      const bank = Math.sin(sweep * Math.PI);
      craft.rotation.set(still ? -.17 : -.17 - bank * .14, direction * (.70 + Math.cos(sweep * Math.PI) * .55),
        still ? 0 : -direction * (.08 + bank * .24));
      fans.forEach((fan, rotor) => {
        fan.rotation.y = still ? 0 : (rotor < 2 ? -1 : 1) * time * 24 + index * .8;
      });
      for (const { lamp, beam, side } of lights) {
        lamp.rotation.set(still ? -.24 : -.24 + Math.sin(phase * .58 + side * .45) * .16, 0,
          still ? -side * .10 : -side * .10 + Math.sin(phase + side * .65) * .23);
        beam.visible = !still;
      }
      const range = riderPosition.distanceTo(craft.position);
      const level = .30 * (1 - THREE.MathUtils.smoothstep(range, 14, 76));
      if (level > sound.level) {
        sound.level = level;
        sound.pan = THREE.MathUtils.clamp((craft.position.x - riderPosition.x) / 24, -.85, .85);
      }
    });
    return sound.level > 0 ? sound : null;
  }

  return { update };
}
