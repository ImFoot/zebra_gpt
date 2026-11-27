import * as THREE from 'three';
import { routeAt, routeCenter, routeHeading } from './route.js';

const { clamp, lerp, smoothstep } = THREE.MathUtils;
const skidDuration = .92;
const aftermath = 3.35;
const tau = Math.PI * 2;

const cloudVertex = /* glsl */ `
  attribute vec3 center;
  attribute vec4 shape;
  attribute vec2 life;
  varying vec2 cloudUv;
  varying vec3 cloudState;
  #include <fog_pars_vertex>
  void main() {
    cloudUv = uv * 2.0 - 1.0;
    vec2 size = position.xy * shape.xy;
    float c = cos(shape.z), s = sin(shape.z);
    vec4 mvPosition = modelViewMatrix * vec4(center, 1.0);
    mvPosition.xy += mat2(c, s, -s, c) * size;
    cloudState = vec3(life.x, life.y * smoothstep(.55, 3.75, -mvPosition.z), shape.w);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const cloudFragment = /* glsl */ `
  varying vec2 cloudUv;
  varying vec3 cloudState;
  #include <fog_pars_fragment>
  float hash(vec2 p) {
    vec3 q = fract(vec3(p.xyx) * .1031);
    q += dot(q, q.yzx + 33.33);
    return fract((q.x + q.y) * q.z);
  }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
               mix(hash(i + vec2(0, 1)), hash(i + 1.0), f.x), f.y);
  }
  void main() {
    float age = cloudState.x;
    vec2 p = cloudUv;
    vec2 q = p * vec2(2.4, 2.1) + vec2(cloudState.z * 17.0, -age * 2.4);
    float grain = .66 * noise(q) + .34 * noise(q * 2.9 + 3.2);
    float radius = length(p * vec2(1.1, 1.03));
    float brokenEdge = radius + .81 * (grain - .5);
    float fade = (1.0 - smoothstep(.71, 1.0, radius)) * cloudState.y;
    #ifdef SMOKE
      float body = 1.0 - smoothstep(.21, .86, brokenEdge);
      vec3 dusk = mix(vec3(.024, .026, .029), vec3(.091, .083, .074), grain);
      gl_FragColor = vec4(dusk, body * fade * (.46 + grain * .37));
    #else
      float body = 1.0 - smoothstep(.22, .86, brokenEdge);
      float heat = clamp(body + (grain - .54) * .75 - age * .48, 0.0, 1.0);
      vec3 cinnamon = mix(vec3(.52, .023, .003), vec3(1.85, .31, .027), smoothstep(.16, .65, heat));
      vec3 core = mix(cinnamon, vec3(2.8, 1.28, .31), smoothstep(.70, .99, heat));
      gl_FragColor = vec4(core, body * fade * (.69 + .30 * grain));
    #endif
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

function makeClouds(scene, smoke, capacity) {
  const plane = new THREE.PlaneGeometry();
  const geometry = new THREE.InstancedBufferGeometry().copy(plane);
  plane.dispose();
  const center = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3).setUsage(THREE.DynamicDrawUsage);
  const shape = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4).setUsage(THREE.DynamicDrawUsage);
  const life = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 2), 2).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('center', center).setAttribute('shape', shape).setAttribute('life', life);
  const material = new THREE.ShaderMaterial({
    vertexShader: cloudVertex, fragmentShader: cloudFragment,
    fog: true, uniforms: THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
    defines: smoke ? { SMOKE: 1 } : {},
    transparent: true, depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = smoke ? 'Drone crash smoke' : 'Drone crash flames';
  mesh.renderOrder = smoke ? 1 : 2;
  mesh.frustumCulled = false;
  mesh.visible = false;
  scene.add(mesh);

  const particles = Array.from({ length: capacity }, () => ({ origin: new THREE.Vector3(), born: -Infinity }));
  let cursor = 0;
  function emit(at, born, size, seconds, vx, vy, vz, seed) {
    const particle = particles[cursor++ % capacity];
    particle.origin.copy(at);
    Object.assign(particle, { born, size, seconds, vx, vy, vz, seed });
  }

  function draw(time) {
    let count = 0;
    for (let i = 0; i < capacity; i++) {
      const { origin, born, size, seconds, vx, vy, vz, seed } = particles[(cursor + i) % capacity];
      const age = time - born;
      if (age < 0 || !(age < seconds)) continue;
      const t = age / seconds;
      const spread = size * (smoke ? .48 + t * 1.36 : .77 + t * .95);
      center.setXYZ(count, origin.x + vx * age, origin.y + vy * age, origin.z + vz * age);
      shape.setXYZW(count, spread, spread * (smoke ? 1 : 1.36), (seed - .5) * .98 + age * .38, seed);
      life.setXY(count++, t, (1 - t ** 1.6) * (smoke ? .78 : .94));
    }
    geometry.instanceCount = count;
    mesh.visible = count > 0;
    center.needsUpdate = shape.needsUpdate = life.needsUpdate = true;
  }

  function reset() {
    for (const particle of particles) particle.born = -Infinity;
    cursor = 0;
    mesh.visible = false;
  }
  return { emit, draw, reset };
}

function makeEmbers(scene, capacity) {
  const geometry = new THREE.BufferGeometry();
  const position = new THREE.BufferAttribute(new Float32Array(capacity * 6), 3).setUsage(THREE.DynamicDrawUsage);
  const color = new THREE.BufferAttribute(new Float32Array(capacity * 6), 3).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', position).setAttribute('color', color);
  const material = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const mesh = new THREE.LineSegments(geometry, material);
  mesh.name = 'Drone crash sparks';
  mesh.renderOrder = 3;
  mesh.frustumCulled = false;
  mesh.visible = false;
  scene.add(mesh);

  const particles = Array.from({ length: capacity }, () => ({ origin: new THREE.Vector3(), born: -Infinity }));
  let cursor = 0;
  function emit(at, born, vx, vy, vz, seconds) {
    const particle = particles[cursor++ % capacity];
    particle.origin.copy(at);
    Object.assign(particle, { born, vx, vy, vz, seconds });
  }

  function draw(time) {
    let count = 0;
    for (const { origin, born, vx, vy, vz, seconds } of particles) {
      const age = time - born;
      if (age < 0 || !(age < seconds)) continue;
      const tail = Math.max(age - .055, 0);
      const energy = 1 - age / seconds;
      position.setXYZ(count, origin.x + vx * tail, Math.max(.035, origin.y + vy * tail - 6 * tail * tail), origin.z + vz * tail);
      color.setXYZ(count++, energy * .52, energy * .094, energy * .018);
      position.setXYZ(count, origin.x + vx * age, Math.max(.035, origin.y + vy * age - 6 * age * age), origin.z + vz * age);
      color.setXYZ(count++, energy * 1.34, energy * .57, energy * .15);
    }
    geometry.setDrawRange(0, count);
    mesh.visible = count > 0;
    position.needsUpdate = color.needsUpdate = true;
  }

  function reset() {
    for (const particle of particles) particle.born = -Infinity;
    cursor = 0;
    mesh.visible = false;
  }
  return { emit, draw, reset };
}

export function makeDroneCrash(scene, droneVisual, compact) {
  const fire = makeClouds(scene, false, compact ? 34 : 54);
  const smoke = makeClouds(scene, true, compact ? 25 : 42);
  const embers = makeEmbers(scene, compact ? 70 : 124);
  const light = new THREE.PointLight(0xff7b31, 0, 12.5, 2);
  light.name = 'Drone crash light';
  scene.add(light);

  const shardCount = compact ? 9 : 17;
  const shards = new THREE.InstancedMesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({
    color: 0x354149, metalness: .75, roughness: .36, emissive: 0x7a2409, emissiveIntensity: .28,
  }), shardCount);
  shards.name = 'Drone crash fragments';
  shards.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  shards.frustumCulled = false;
  shards.visible = false;
  scene.add(shards);

  const pose = new THREE.Object3D();
  const point = new THREE.Vector3();
  const impact = new THREE.Vector3();
  const tail = new THREE.Vector3();
  const startRotation = new THREE.Euler();
  const { tornWing } = droneVisual;
  let crash;
  let kick = 0;

  function reset() {
    crash = null;
    kick = light.intensity = 0;
    shards.visible = tornWing.visible = false;
    fire.reset();
    smoke.reset();
    embers.reset();
  }

  function sample(age, target) {
    const { fall, distance, speed, lane, landingLane, exitLane, height, verticalSpeed } = crash;
    if (age <= fall) {
      const t = age / fall;
      return routeAt(distance + age * speed, lerp(lane, landingLane, t * (1.6 - .6 * t)),
        lerp(height, .49, t ** 2) + Math.sin(t * Math.PI) * verticalSpeed, target);
    }
    const t = clamp((age - fall) / skidDuration, 0, 1);
    const slide = 1 - (1 - t) ** 2.6;
    const bounce = Math.abs(Math.sin(t * 9.6)) * .46 * (1 - t) ** 2;
    return routeAt(distance + fall * speed + slide * speed * .45, lerp(landingLane, exitLane, slide),
      lerp(.49, .30, smoothstep(t, 0, .4)) + bounce, target);
  }

  function start(origin, run) {
    reset();
    const distance = -origin.z;
    const lane = origin.x - routeCenter(distance);
    const direction = lane < run.x ? -1 : 1;
    const landingLane = clamp(lane + direction * 2.35, -5.6, 5.6);
    const fall = clamp(.61 + origin.y * .092, .86, 1.16);
    crash = {
      age: 0, nextEmission: 0, emission: 0, landed: false,
      distance, lane, direction, landingLane, fall, height: origin.y, verticalSpeed: .29,
      exitLane: clamp(landingLane + direction * 2.1, -6.65, 6.65), speed: 4.8 + run.speed * .48,
    };
    startRotation.copy(droneVisual.drone.rotation);
    sample(fall, impact);
    impact.y = .21;
    for (let i = 0; i < 14; i++) {
      const angle = i * 2.39996;
      embers.emit(origin, 0, Math.cos(angle) * (2.2 + i % 4), Math.sin(angle) * 3, Math.sin(angle) * 3.6, .37 + (i % 4) * .067);
    }
    droneVisual.pose(origin, 0, startRotation.y, startRotation.x, startRotation.z, 1);
  }

  function hitStreet(still) {
    const { fall, speed, direction } = crash;
    const count = compact || still ? 30 : 54;
    for (let i = 0; i < count; i++) {
      const angle = i * 2.39996;
      const reach = 1.9 + (i % 11) * .79;
      embers.emit(impact, fall, Math.cos(angle) * reach + direction * 1.8, 1.4 + (i % 8) * .67,
        Math.sin(angle) * reach + speed * .16, .47 + (i % 7) * .071);
    }
    for (let i = 0; i < 12; i++) {
      const angle = i * 2.39996;
      fire.emit(impact, fall, 1.12 + (i % 6) * .24, .37 + (i % 5) * .095,
        Math.cos(angle) * (1.7 + i % 3), 1.64 + (i % 4) * 1.56, Math.sin(angle) * (1.9 + i % 3), i / 12);
      const spread = 1.0 + (i % 5) * .41;
      smoke.emit(impact, fall, 1.25 + (i % 5) * .31, 1.22 + (i % 4) * .27,
        Math.cos(angle) * spread, 1.28 + (i % 3) * .63, Math.sin(angle) * spread, i / 12);
    }
  }

  function trail(age, still) {
    const { fall, direction, speed } = crash;
    while (crash.nextEmission <= age && crash.nextEmission < fall + 2.18) {
      const time = crash.nextEmission;
      const index = crash.emission++;
      const phase = index * 2.39996;
      const seed = (index % 17) / 17;
      const after = time - fall;
      const falling = after < 0;
      const sliding = after >= 0 && after < skidDuration;
      sample(time, tail);
      tail.x += Math.cos(phase) * .37 - (falling ? direction * .29 : 0);
      tail.y = Math.max(.17, tail.y + (falling ? -.08 : .03) + Math.sin(phase) * .13);
      tail.z += (falling ? .52 + .57 * smoothstep(time, 0, .35) : .54) + Math.sin(phase) * .49;
      const size = falling ? .77 + seed * .73 : (1.3 + seed) * (1 - smoothstep(after, .7, 2.4) * .72);
      fire.emit(tail, time, size, .29 + seed * .29, .66 * Math.sin(phase), falling ? 1.4 : 1.82, falling ? 1.8 : .92, seed);
      if (index % 2 === 0) smoke.emit(tail, time, .82 + seed + (falling ? 0 : .44), 1.08 + seed * .7,
        .56 + .33 * Math.sin(phase), 1.44 + seed, falling ? 2.42 : .64, seed);
      if (falling || sliding) {
        for (let i = 0, count = compact || still ? 2 : 5; i < count; i++) {
          embers.emit(tail, time, Math.cos(phase + i) * (2.12 + i) + direction, .65 + i * .52,
            speed * .54 + i * .54, .33 + seed * .36);
        }
      }
      crash.nextEmission += (compact ? .070 : .041) + (falling || sliding ? 0 : .074);
    }
  }

  function wreck(age) {
    tornWing.visible = age < 2.85;
    const slide = 1 - Math.exp(-age * 2.8);
    const { direction } = crash;
    tornWing.position.copy(impact);
    tornWing.position.x += direction * (.38 + slide * 1.28);
    tornWing.position.y = .18 + Math.max(0, (age * 4.1 - age ** 2 * 5.9));
    tornWing.position.z += slide * 4.35;
    tornWing.rotation.set(.34 + slide * (tau - .25), startRotation.y - direction * slide * 3.2, .14 + slide * (tau - .10));

    shards.visible = age < 2.7;
    if (!shards.visible) return;
    for (let i = 0; i < shardCount; i++) {
      const angle = i * 2.39996;
      const range = 1.14 + (i % 7) * .63;
      const spin = slide * (i % 8 + 2.4);
      const size = (.067 + (i % 8) * .021) * (1 - smoothstep(age, 1.73, 2.7));
      pose.position.set(impact.x + (Math.cos(angle) * range + direction * .65) * slide,
        .076 + Math.max(0, age * (2.1 + i % 5 * .62) - age * age * 5.9), impact.z + Math.sin(angle) * range * slide);
      pose.rotation.set(spin, spin * .67 + angle, angle + spin * .48);
      pose.scale.set(size, size * .24, size * 1.67);
      pose.updateMatrix();
      shards.setMatrixAt(i, pose.matrix);
    }
    shards.instanceMatrix.needsUpdate = true;
  }

  function update(dt, still) {
    const { fall, direction } = crash;
    const age = (crash.age += dt);
    const after = age - fall;
    if (after > aftermath) {
      reset();
      droneVisual.pose(null);
      return false;
    }

    sample(age, point);
    const airborne = after < 0;
    const t = airborne ? age / fall : clamp(after / skidDuration, 0, 1);
    const roll = airborne ? startRotation.z + direction * (tau + .32) * t ** 1.21 : direction * (.32 + (1 - t) * .34 * Math.sin(t * 8));
    const pitch = airborne ? lerp(startRotation.x, -.56, t) - Math.sin(t * Math.PI) * .44 : lerp(-.56, .07, smoothstep(t, 0, .82));
    const yaw = airborne ? startRotation.y + direction * .87 * t : routeHeading(-point.z) + direction * lerp(.87, 1.96, t);
    droneVisual.pose(point, age, yaw, pitch, roll, airborne ? 1 : 2);

    const landed = !airborne && !crash.landed;
    if (landed) {
      crash.landed = true;
      hitStreet(still);
    }
    trail(age, still);
    if (!airborne) wreck(after);
    fire.draw(age);
    smoke.draw(age);
    embers.draw(age);

    const flash = airborne ? 0 : (1 - smoothstep(after, .018, .37));
    const burning = airborne ? smoothstep(age, 0, .22) : 1 - smoothstep(after, .54, 2.66);
    const flutter = !still ? 8 * Math.sin(age * 39) + 5 * Math.sin(age * 19) : 0;
    light.position.copy(point);
    light.position.y += airborne ? .14 : .58;
    light.intensity = (117 + flutter) * burning + (still ? 105 : 218) * flash;
    kick = still || airborne ? 0 : Math.sin(after * 32) * Math.exp(-after * 14);
    return landed;
  }

  return { start, update, reset, get active() { return Boolean(crash); }, get kick() { return kick; } };
}
