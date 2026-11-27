import * as THREE from 'three';
import { routeAt } from './route.js';

const { smoothstep } = THREE.MathUtils;

const noiseGLSL = /* glsl */ `
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
`;

const waveVertex = /* glsl */ `
  uniform float side;
  uniform float progress;
  uniform float height;
  varying vec2 face;
  varying vec3 world;
  #include <fog_pars_vertex>
  void main() {
    face = uv;
    float u = uv.x, v = uv.y;
    float spread = 4.65 + progress * 1.8;
    float edge = pow(max(0.0, sin(u * 3.1415926)), .52);
    float crest = (v - .67) / .186;
    float backwash = (v - .32) / .16;
    float steep = exp(-crest * crest);
    float rebound = exp(-backwash * backwash) * .23;
    float peak = edge * (.81 + .13 * sin(u * 20.0 + progress * 9.5) + .07 * sin(u * 53.0 - progress * 8.0));
    float fold = .87 * smoothstep(.60, .90, v) * peak;
    float displacement = edge * (sin(u * 17.0 - progress * 11.0) * .52 + sin(u * 38.0) * .19);
    vec3 local = vec3(-side * ((v - .67) * spread + fold + displacement),
      (steep + rebound) * peak * height, position.x + .32 * sin(v * 6.0 + u * 18.0) * edge);
    world = (modelMatrix * vec4(local, 1.0)).xyz;
    vec4 mvPosition = modelViewMatrix * vec4(local, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const waveFragment = /* glsl */ `
  uniform float progress;
  uniform float opacity;
  varying vec2 face;
  varying vec3 world;
  #include <fog_pars_fragment>
  ${noiseGLSL}
  void main() {
    vec3 view = normalize(cameraPosition - world);
    vec3 normal = normalize(cross(dFdx(world), dFdy(world)));
    if (dot(normal, view) < 0.0) normal = -normal;
    float grain = noise(face * vec2(48.0, 15.0) + vec2(progress * -10.0, progress * 6.0));
    float micro = noise(face * vec2(124.0, 37.0) - vec2(progress * 23.0));
    normal = normalize(normal + vec3(.18 * grain - .09, .04, .27 * micro - .135));
    float fresnel = pow(1.0 - clamp(dot(view, normal), 0.0, 1.0), 3.4);
    vec3 reflected = reflect(-view, normal);
    float source = pow(max(0.0, dot(reflected, normalize(vec3(-.38, .78, .41)))), 7.0);
    float glint = pow(max(0.0, dot(reflected, normalize(vec3(.31, .83, .22)))), 22.0);
    float crest = (face.y - .706) / .16;
    float peak = exp(-crest * crest);
    float breaking = smoothstep(.33, .86, peak * (.48 + grain * .67 + .25 * micro));
    float holes = smoothstep(.25, .74, grain * .53 + micro * .47);
    float whitewater = breaking * (.38 + holes * .62);
    vec3 liquid = mix(vec3(.012, .1, .129), vec3(.12, .42, .54), .38 * grain + .56 * fresnel);
    liquid += vec3(.41, .66, .72) * (source * .67 + glint * .81);
    vec3 hue = mix(liquid, vec3(.64, .92, 1.0) * (.62 + .67 * micro), whitewater);
    float ends = smoothstep(0.0, .15, face.x) * (1.0 - smoothstep(.85, 1.0, face.x));
    float base = smoothstep(.0, .29, face.y) * (1.0 - smoothstep(.86, 1.0, face.y));
    gl_FragColor = vec4(hue, ends * base * opacity * (.54 + fresnel * .27 + whitewater * .24));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

const foamVertex = /* glsl */ `
  varying vec2 face;
  #include <fog_pars_vertex>
  void main() {
    face = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const foamFragment = /* glsl */ `
  uniform float progress;
  uniform float opacity;
  varying vec2 face;
  #include <fog_pars_fragment>
  ${noiseGLSL}
  void main() {
    vec2 p = face * 2.0 - 1.0;
    float boundary = 1.0 - smoothstep(.59, 1.0, length(p));
    float bend = noise(vec2(p.x * 5.0 + progress * 4.1, p.y * 4.0));
    vec2 stream = vec2((p.x + bend * .13) * 31.0, (p.y + bend * .17) * 8.0 - progress * 5.0);
    float webbing = noise(stream) * .62 + noise(stream * 2.15) * .38;
    float scud = smoothstep(.48, .81, webbing) * boundary;
    gl_FragColor = vec4(.56, .82, .88, scud * opacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

export function makeRollingWake(scene, side, span, compact) {
  const group = new THREE.Group();
  group.name = `Maglev wake ${side < 0 ? 'left' : 'right'}`;
  const waveUniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    side: { value: side }, height: { value: 0 }, opacity: { value: 0 }, progress: { value: 0 },
  }]);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(span, 1, compact ? 39 : 62, compact ? 10 : 17), new THREE.ShaderMaterial({
    vertexShader: waveVertex, fragmentShader: waveFragment, uniforms: waveUniforms,
    side: THREE.DoubleSide, transparent: true, depthWrite: false, fog: true,
  }));
  face.frustumCulled = false;
  face.renderOrder = 4;
  const foamUniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { progress: { value: 0 }, opacity: { value: 0 } }]);
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(span * 1.45, 8.5), new THREE.ShaderMaterial({
    vertexShader: foamVertex, fragmentShader: foamFragment, uniforms: foamUniforms,
    transparent: true, depthWrite: false, fog: true,
  }));
  foam.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
  foam.renderOrder = 2;
  foam.position.set(side * 2.52, .004, .26);
  group.add(foam, face);
  group.visible = false;
  scene.add(group);

  function draw(at, x, p, still) {
    const weight = smoothstep(p, 0, .15) * (1 - smoothstep(p, .78, 1)) * (1.04 + .16 * Math.sin(p * Math.PI));
    routeAt(at, x, .026, group.position);
    group.visible = true;
    waveUniforms.height.value = 1.78 * weight;
    waveUniforms.progress.value = still ? 0 : p;
    waveUniforms.opacity.value = Math.min(1, weight * .97);
    foamUniforms.progress.value = still ? 0 : p;
    foamUniforms.opacity.value = Math.min(.73, weight * .61);
    foam.position.x = side * (2.05 + p * 2.14);
  }
  return { group, draw };
}

const sprayVertex = /* glsl */ `
  uniform float pixels;
  attribute vec4 drop;
  varying vec3 particle;
  #include <fog_pars_vertex>
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float depth = max(.2, -mvPosition.z);
    particle = vec3(drop.y * smoothstep(.50, 2.17, depth), drop.z, drop.w);
    gl_PointSize = clamp(drop.x * pixels * .49 * projectionMatrix[1][1] / depth, 1.0, 134.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const sprayFragment = /* glsl */ `
  varying vec3 particle;
  #include <fog_pars_fragment>
  ${noiseGLSL}
  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float angle = particle.z;
    p = mat2(cos(angle), sin(angle), -sin(angle), cos(angle)) * p;
    float mist = particle.y;
    float edge = length(p * mix(vec2(1.9, .87), vec2(.9, 1.10), mist));
    float irregular = noise(p * 4.0 + vec2(particle.z * 4.7));
    float shape = mix(1.0 - smoothstep(.54, .93, edge),
      (1.0 - smoothstep(.20, .87, edge + (irregular - .49) * .36)) * (.39 + .6 * irregular), mist);
    float sparkle = exp(-length((p - vec2(-.13, -.35)) * vec2(3.0, 1.51)) * 3.1);
    vec3 color = mix(vec3(.28, .53, .64) + sparkle * vec3(.91, .95, .87), vec3(.58, .76, .83), mist);
    gl_FragColor = vec4(color, shape * particle.x);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

export function makeMaglevSpray(scene, compact) {
  const max = compact ? 234 : 505;
  const position = new THREE.BufferAttribute(new Float32Array(max * 3), 3).setUsage(THREE.DynamicDrawUsage);
  const drop = new THREE.BufferAttribute(new Float32Array(max * 4), 4).setUsage(THREE.DynamicDrawUsage);
  const geometry = new THREE.BufferGeometry().setAttribute('position', position).setAttribute('drop', drop);
  const material = new THREE.ShaderMaterial({
    vertexShader: sprayVertex, fragmentShader: sprayFragment, fog: true, transparent: true, depthWrite: false,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { pixels: { value: 720 } }]),
  });
  const spray = new THREE.Points(geometry, material);
  spray.name = 'Maglev water droplets and mist';
  spray.visible = false;
  spray.frustumCulled = false;
  spray.renderOrder = 6;
  const viewport = new THREE.Vector4();
  spray.onBeforeRender = (renderer) => { material.uniforms.pixels.value = renderer.getCurrentViewport(viewport).w; };
  scene.add(spray);

  const pool = Array.from({ length: max }, () => ({ origin: new THREE.Vector3(), born: -Infinity }));
  const emitter = new THREE.Vector3();
  let cursor = 0;
  let seed = 14203;
  function random() {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  function emit(at, born, vx, vy, vz, size, duration, mist) {
    const entry = pool[cursor++ % max];
    entry.origin.copy(at);
    Object.assign(entry, { born, vx, vy, vz, size, duration, mist, angle: random() * Math.PI * 2 });
  }

  function fan(at, time, side, count, power, drift, vapors, forward = 0) {
    for (let index = 0; index < count; index++) {
      const grit = random();
      emit(at, time, side * power * (1.2 + random() * 2.9), power * (.64 + random() * 2.35),
        drift * (.30 + random() * .7) - forward * grit, .049 + Math.pow(grit, 1.6) * .123, .32 + random() * .48, 0);
    }
    for (let index = 0; index < vapors; index++) {
      emit(at, time, side * power * (.66 + random()), .69 + random() * 1.72,
        drift * (.21 + random() * .41) - forward * .42, .34 + random() * power * .38, .56 + random() * .49, 1);
    }
  }

  function hoof(at, time, side, landing, speed) {
    emitter.copy(at);
    emitter.y = .041;
    const power = landing ? 1.63 : 1.07;
    fan(emitter, time, side, compact ? (landing ? 18 : 11) : (landing ? 28 : 17), power, 2.3, landing ? 3 : 2, speed * .27);
  }

  function skid(at, time, side, speed) {
    emitter.copy(at);
    emitter.y = .037;
    fan(emitter, time, side, compact ? 5 : 8, .62, speed * .31, 1);
  }

  function bow(at, side, time) {
    routeAt(at + random() * 4, side * (7.99 + random() * .46), .18, emitter);
    fan(emitter, time, -side, compact ? 5 : 9, 1.48, 4.7, compact ? 1 : 2);
  }

  function crest(at, x, side, time, progress, span) {
    const lift = 1.52 * smoothstep(progress, 0, .17) * (1 - smoothstep(progress, .77, 1));
    for (let index = 0; index < (compact ? 2 : 4); index++) {
      const z = (random() - .5) * span * .92;
      routeAt(at + z, x - side * random() * .91, lift * Math.cos(z * Math.PI / span) + .105, emitter);
      fan(emitter, time, -side, compact ? 2 : 3, 1.20 + progress * .27, (random() - .48) * 4.1, index % 2);
    }
  }

  function draw(time) {
    let count = 0;
    for (const item of pool) {
      const age = time - item.born;
      if (!(age >= 0 && age < item.duration)) continue;
      const y = item.origin.y + item.vy * age - (item.mist ? .58 : 5.9) * age * age;
      if (y < .023) continue;
      const life = age / item.duration;
      const size = item.size * (item.mist ? .63 + life * 1.80 : 1.11 - life * .4);
      const fade = item.mist ? Math.sin(life * Math.PI) * .31 : (1 - life ** 1.28) * .88;
      position.setXYZ(count, item.origin.x + item.vx * age, y, item.origin.z + item.vz * age);
      drop.setXYZW(count++, size, fade, item.mist, item.angle + age * (item.mist ? .75 : 2.2));
    }
    geometry.setDrawRange(0, count);
    position.needsUpdate = drop.needsUpdate = true;
    spray.visible = count > 0;
  }

  function reset() {
    for (const item of pool) item.born = -Infinity;
    geometry.setDrawRange(0, 0);
    spray.visible = false;
    cursor = 0;
  }
  reset();
  return { hoof, skid, bow, crest, draw, reset };
}

export function makeHoofRipples(scene, compact) {
  const count = compact ? 12 : 22;
  const quad = new THREE.PlaneGeometry();
  const geometry = new THREE.InstancedBufferGeometry().copy(quad);
  quad.dispose();
  const origin = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage);
  const ring = new THREE.InstancedBufferAttribute(new Float32Array(count * 4), 4).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('origin', origin).setAttribute('ring', ring);
  const material = new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `
      attribute vec3 origin;
      attribute vec4 ring;
      varying vec2 surface;
      varying float alpha;
      #include <fog_pars_vertex>
      void main() {
        surface = uv * 2.0 - 1.0;
        alpha = ring.z;
        vec3 p = origin + vec3(position.x * ring.x, 0.0, -position.y * ring.y);
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 surface;
      varying float alpha;
      #include <fog_pars_fragment>
      void main() {
        float angle = atan(surface.y, surface.x);
        float d = length(surface) + sin(angle * 7.0) * .035 + cos(angle * 13.0) * .021;
        float wake = exp(-abs(d - .73) * 39.0) + .55 * exp(-abs(d - .43) * 39.0);
        float breaks = .52 + .31 * sin(angle * 4.0 + .35) + .16 * sin(angle * 15.0);
        gl_FragColor = vec4(.46, .69, .76, wake * breaks * alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
    transparent: true, depthWrite: false, fog: true,
    uniforms: THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'Maglev hoof ripples';
  mesh.renderOrder = 4;
  mesh.visible = false;
  mesh.frustumCulled = false;
  const sheet = new THREE.PlaneGeometry(1, 1, compact ? 20 : 30, 3);
  const crownGeometry = new THREE.InstancedBufferGeometry().copy(sheet);
  sheet.dispose();
  crownGeometry.setAttribute('origin', origin).setAttribute('ring', ring);
  const crown = new THREE.Mesh(crownGeometry, new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `
      attribute vec3 origin;
      attribute vec4 ring;
      varying vec2 face;
      varying float shade;
      varying float alpha;
      #include <fog_pars_vertex>
      void main() {
        face = uv;
        float theta = uv.x * 6.2831853;
        float life = clamp(ring.w / .19, 0.0, 1.0);
        float power = ring.x / (.40 + ring.w * 4.4);
        float gust = sin(theta * 3.0 + origin.z * 1.7) * .25 + sin(theta * 7.0) * .11;
        float arc = sin(life * 3.1415926);
        shade = .49 + gust;
        alpha = ring.z * (1.0 - life) * smoothstep(.0, .12, life);
        float spread = power * (.079 + life * .38 + uv.y * arc * (.15 + gust * .14));
        vec3 p = origin + vec3(spread * cos(theta), uv.y * arc * (.36 + gust * .72) * power,
          spread * sin(theta) * 1.28 - life * .28);
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 face;
      varying float shade;
      varying float alpha;
      #include <fog_pars_fragment>
      void main() {
        float scallop = .83 + .09 * sin(face.x * 62.83185) + .06 * sin(face.x * 106.81415);
        float edge = smoothstep(.23, .86, face.y);
        float thin = 1.0 - smoothstep(scallop - .072, scallop, face.y);
        if (alpha * thin < .001) discard;
        vec3 water = mix(vec3(.07, .28, .36), vec3(.76, .97, 1.12), edge);
        gl_FragColor = vec4(water, alpha * thin * (shade + edge * .72) * 1.27);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
    side: THREE.DoubleSide, transparent: true, depthWrite: false, fog: true,
    uniforms: THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
  }));
  crown.name = 'Maglev hoof splash sheets';
  crown.visible = false;
  crown.frustumCulled = false;
  crown.renderOrder = 5;
  scene.add(mesh, crown);
  const steps = Array.from({ length: count }, () => ({ point: new THREE.Vector3(), time: -Infinity, power: 1 }));
  let cursor = 0;

  function emit(at, time, landing) {
    const step = steps[cursor++ % count];
    step.point.copy(at);
    step.point.y = .028;
    step.time = time;
    step.power = landing ? 1.36 : 1;
  }

  function draw(now) {
    let active = 0;
    let breaking = false;
    for (const { point, time, power } of steps) {
      const age = now - time;
      if (age < 0 || age > .61) continue;
      const size = (.40 + age * 4.4) * power;
      origin.setXYZ(active, point.x, point.y, point.z);
      ring.setXYZW(active++, size, size * 1.32, .51 * (1 - age / .61) ** 1.35, age);
      if (age < .19) breaking = true;
    }
    geometry.instanceCount = crownGeometry.instanceCount = active;
    mesh.visible = active > 0;
    crown.visible = breaking;
    origin.needsUpdate = ring.needsUpdate = true;
  }

  function reset() {
    for (const step of steps) step.time = -Infinity;
    geometry.instanceCount = crownGeometry.instanceCount = 0;
    cursor = 0;
    mesh.visible = crown.visible = false;
  }
  reset();
  return { emit, draw, reset };
}
