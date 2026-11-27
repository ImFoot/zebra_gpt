import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { batches } from './city.js';
import { maglevStart, routeAt } from './route.js';

const { clamp, lerp, smoothstep } = THREE.MathUtils;
const approaches = [120, 248, 383, 526].map((offset, index) => ({ at: maglevStart + offset, side: index % 2 ? 1 : -1 }));
const leadDistance = 72;
const surgeDelay = 1.69;
const crossingTime = 1.34;
const wakeLength = 14.4;
const railOffset = 10.15;
const trainUnit = new RoundedBoxGeometry(3.57, 2.77, 14.35, 2, .22);
const noseUnit = new RoundedBoxGeometry(3.37, 2.34, 4.4, 3, .45);

function makeTrain(scene, side) {
  const train = new THREE.Group();
  train.name = `Maglev train ${side < 0 ? 'left' : 'right'}`;
  scene.add(train);
  const steel = new THREE.MeshStandardMaterial({ color: 0x7c919b, metalness: .77, roughness: .29 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x647f89, metalness: .65, roughness: .42 });
  const livery = new THREE.MeshStandardMaterial({ color: side < 0 ? 0x4b9099 : 0x805547, metalness: .31, roughness: .42 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x1b3840, emissive: 0x163840, emissiveIntensity: .67, metalness: .55, roughness: .18 });
  const light = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const details = batches(train);

  for (let car = 0; car < 5; car++) {
    const z = -8.68 - car * 14.92;
    const cabin = new THREE.Mesh(trainUnit, steel);
    cabin.position.set(0, 1.94, z);
    train.add(cabin);
    details.add(trim, 0, .64, z, 3.25, .23, 12.96, 0x415058);
    details.add(trim, 0, 3.33, z - 1.48, 1.24, .21, 7.75, 0x728b94);
    details.add(trim, 0, 1.40, z - 7.4, 2.42, 1.79, .62, 0x33424b);
    for (const wall of [-1, 1]) {
      details.add(livery, wall * 1.789, 1.34, z, .029, .34, 13.65);
      details.add(trim, wall * 1.793, .95, z, .044, .18, 13.7, 0x435b64);
      details.add(light, wall * 1.81, 2.93, z, .024, .038, 13.1, 0x90c7c8);
      for (let window = 0; window < 7; window++) {
        const station = z - 5.9 + window * 1.89;
        details.add(trim, wall * 1.796, 2.23, station, .052, .98, 1.68, 0x253840);
        details.add(glass, wall * 1.829, 2.26, station, .032, .82, 1.51, 0x80a9aa);
        details.add(light, wall * 1.853, 2.58, station, .022, .043, 1.33, window % 3 ? 0x85c9c9 : 0xbcc99e);
      }
    }
  }
  const cab = new THREE.Mesh(noseUnit, steel);
  cab.position.set(0, 1.74, -.85);
  train.add(cab);
  details.add(glass, 0, 2.22, 1.26, 2.53, .89, .17, 0x5c818c, 0);
  details.add(trim, 0, 1.22, 1.36, 2.98, .31, .14, 0x4b6773);
  details.add(livery, 0, 1.55, 1.349, 2.91, .25, .13);
  details.add(light, 0, 1.13, 1.444, 2.47, .074, .045, 0xb8f5ff);
  for (const lamp of [-1, 1]) {
    details.add(light, lamp * 1.02, 1.55, 1.441, .57, .15, .071, 0xfffabb);
    details.add(light, lamp * 1.18, 2.81, 1.09, .12, .12, .064, 0xff7959);
  }
  details.finish();
  train.visible = false;
  return train;
}

const wakeVertex = /* glsl */ `
  uniform float side;
  uniform float progress;
  uniform float height;
  varying vec2 faceUv;
  #include <fog_pars_vertex>
  void main() {
    faceUv = uv;
    float arch = pow(max(0.0, sin(uv.x * 3.141593)), .52);
    float curl = sin(uv.x * 13.1 + progress * 9.0) * .17 + sin(uv.x * 33.1 - progress * 6.7) * .068;
    float crest = arch * ( .57 + curl + .34 * sin(uv.x * 3.14159 + .3));
    vec3 local = vec3(side * (.94 * uv.y * uv.y - .72 * (1.0 - arch)), max(.03, uv.y * crest * height), position.x);
    vec4 mvPosition = modelViewMatrix * vec4(local, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const wakeFragment = /* glsl */ `
  uniform float progress;
  uniform float opacity;
  varying vec2 faceUv;
  #include <fog_pars_fragment>
  float cells(vec2 p) {
    return fract(sin(dot(p, vec2(78.23, 119.89))) * 8127.782);
  }
  void main() {
    vec2 p = faceUv;
    float fade = smoothstep(0.0, .115, p.x) * (1.0 - smoothstep(.85, 1.0, p.x));
    vec2 streak = p * vec2(100.0, 29.0) + vec2(sin(p.y * 6.1 + progress * 9.1) * 5.4, progress * 9.0);
    float laces = .63 * cells(floor(streak)) + .37 * (.5 + .5 * sin(p.x * 104.0 + p.y * 68.0 - progress * 23.0));
    float crown = smoothstep(.57, .98, p.y + laces * .22);
    vec3 color = mix(vec3(.022, .23, .32), vec3(.75, 1.13, 1.26), crown * (.62 + laces * .36));
    gl_FragColor = vec4(color, fade * opacity * (.45 + crown * .52));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

function mistMap() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 32;
  const ctx = canvas.getContext('2d');
  const spot = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  spot.addColorStop(0, '#fff');
  spot.addColorStop(.26, '#e2ffffbd');
  spot.addColorStop(.68, '#aeffff3b');
  spot.addColorStop(1, '#aeffff00');
  ctx.fillStyle = spot;
  ctx.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(canvas);
}

function mist(count, map, size) {
  const data = new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage);
  const geometry = new THREE.BufferGeometry().setAttribute('position', data);
  const cloud = new THREE.Points(geometry, new THREE.PointsMaterial({
    map, color: 0xb2f1fc, size, transparent: true, opacity: .72, depthWrite: false,
  }));
  cloud.frustumCulled = false;
  cloud.visible = false;
  cloud.renderOrder = 4;
  return { cloud, data };
}

function makeWave(scene, side, compact, map) {
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(wakeLength, 1, 28, 5), new THREE.ShaderMaterial({
    vertexShader: wakeVertex, fragmentShader: wakeFragment, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      side: { value: side }, height: { value: 1 }, opacity: { value: 0 }, progress: { value: 0 },
    }]),
    side: THREE.DoubleSide, transparent: true, depthWrite: false,
  }));
  surface.name = `Maglev wake ${side < 0 ? 'left' : 'right'}`;
  surface.renderOrder = 3;
  surface.frustumCulled = false;
  surface.visible = false;
  const spray = mist(compact ? 39 : 81, map, .135);
  surface.add(spray.cloud);
  scene.add(surface);

  const warnings = new THREE.Group();
  warnings.name = 'Maglev wake warning';
  const bar = new THREE.MeshBasicMaterial({ color: 0xffac60, transparent: true, opacity: .68, depthWrite: false, toneMapped: false });
  const chevron = new THREE.Shape();
  chevron.moveTo(-.52, -.52);
  chevron.lineTo(0, -.51);
  chevron.lineTo(.55, 0);
  chevron.lineTo(0, .51);
  chevron.lineTo(-.52, .52);
  chevron.lineTo(.02, 0);
  const arrow = new THREE.ShapeGeometry(chevron);
  for (const z of [-5.5, 5.5]) {
    const edge = new THREE.Mesh(new THREE.PlaneGeometry(13.1, .087), bar);
    edge.rotation.x = -Math.PI / 2;
    edge.position.z = z;
    warnings.add(edge);
  }
  for (let index = -2; index <= 2; index++) {
    const piece = new THREE.Mesh(arrow, bar);
    piece.rotation.x = -Math.PI / 2;
    piece.rotation.z = side < 0 ? 0 : Math.PI;
    piece.position.set(index * 2.45, .004, 1.7);
    warnings.add(piece);
  }
  warnings.renderOrder = 5;
  warnings.visible = false;
  scene.add(warnings);

  function draw(at, x, p, still) {
    const motion = still ? 0 : p;
    const strength = smoothstep(p, 0, .13) * (1 - smoothstep(p, .82, 1));
    const crest = 1.22 + .23 * Math.sin(p * Math.PI);
    routeAt(at, x, .036, surface.position);
    surface.visible = true;
    const uniform = surface.material.uniforms;
    uniform.height.value = crest * strength;
    uniform.progress.value = motion;
    uniform.opacity.value = strength * .91;

    spray.cloud.visible = true;
    spray.cloud.material.opacity = strength * .72;
    for (let index = 0; index < spray.data.count; index++) {
      const z = (index / spray.data.count - .5) * wakeLength;
      const seed = index * 2.39996;
      const drop = (index * .618 + motion * (1.7 + index % 3)) % 1;
      const arc = Math.sin(drop * Math.PI) * (.16 + (index % 5) * .11);
      const arch = Math.sqrt(Math.max(0, Math.cos(z * Math.PI / wakeLength)));
      spray.data.setXYZ(index, side * (.38 - drop * (1 + .36 * Math.sin(seed))),
        strength * (crest * arch * .6 + arc), z + drop * Math.sin(seed) * .54);
    }
    spray.data.needsUpdate = true;
  }

  function warn(at, age, still) {
    warnings.visible = true;
    routeAt(at, 0, .025, warnings.position);
    bar.opacity = still ? .78 : .58 + .22 * Math.sin(age * 6 - .6);
  }

  return { surface, warnings, draw, warn };
}

export function makeMaglevTraffic(scene, compact) {
  const map = mistMap();
  const tracks = [-1, 1].map((side) => ({ side, train: makeTrain(scene, side), wave: makeWave(scene, side, compact, map), event: null }));
  const reflect = new THREE.PointLight(0x90e8ff, 0, 19, 2);
  scene.add(reflect);
  const hooves = mist(compact ? 24 : 38, map, .102);
  hooves.cloud.name = 'Maglev hoof spray';
  scene.add(hooves.cloud);
  let warning = 0;

  function reset() {
    for (const { train, wave } of tracks) train.visible = wave.surface.visible = wave.warnings.visible = false;
    for (const track of tracks) track.event = null;
    hooves.cloud.visible = false;
    reflect.intensity = warning = 0;
  }

  function update(dt, run, previous, still) {
    const cues = { train: 0, wave: 0, damage: 0 };
    if (run.s < maglevStart) return cues;
    hooves.cloud.visible = !still && run.jump < .48 && run.speed > 4;
    if (hooves.cloud.visible) {
      routeAt(run.s - .31, run.x, .05, hooves.cloud.position);
      for (let index = 0; index < hooves.data.count; index++) {
        const t = (run.time * 3.6 + index * .141) % 1;
        const side = index % 2 ? 1 : -1;
        const ripple = Math.sin(t * Math.PI);
        const drift = index % 6 * .16 + .41;
        hooves.data.setXYZ(index, side * (.25 + t * drift), ripple * (.13 + index % 5 * .058), t * (1.14 + index % 7 * .23));
      }
      hooves.data.needsUpdate = true;
    }
    for (const { at, side } of approaches) {
      if (previous < at - leadDistance && run.s >= at - leadDistance) {
        tracks[side < 0 ? 0 : 1].event = { at, age: 0, splashed: false, hit: false };
        cues.train = side;
      }
    }
    warning = reflect.intensity = 0;
    for (const track of tracks) {
      const { event, train, side, wave } = track;
      if (!event) continue;
      const age = (event.age += dt);
      if (age > 4.18) {
        train.visible = wave.warnings.visible = wave.surface.visible = false;
        track.event = null;
        continue;
      }
      const at = event.at;
      const nose = at + 98 - age * 58;
      routeAt(nose, side * railOffset, 0, train.position);
      train.visible = true;
      const intensity = 127 * (1 - smoothstep(Math.abs(nose - run.s), 10, 32));
      if (intensity > reflect.intensity) {
        reflect.position.copy(train.position);
        reflect.position.y = 1.74;
        reflect.position.z += 2.5;
        reflect.intensity = intensity;
      }

      const p = (age - surgeDelay) / crossingTime;
      wave.surface.visible = wave.warnings.visible = false;
      if (p >= 1 || run.s > at + wakeLength * .63) continue;
      warning = side;
      if (p < 0) {
        wave.warn(at, age, still);
        continue;
      }
      if (!event.splashed) {
        event.splashed = true;
        cues.wave = side;
      }
      const x = side * lerp(7.72, -7.2, p);
      wave.draw(at, x, p, still);
      if (!event.hit && run.jump < .60 && Math.abs(run.s - at) < 5.8 && Math.abs(run.x - x) < 1.25) {
        event.hit = true;
        cues.damage = .21;
      }
    }
    return cues;
  }

  return { update, reset, get warning() { return warning; } };
}
