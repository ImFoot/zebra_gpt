import * as THREE from 'three';

const columnsByQuality = { low: [3, 4, 5], medium: [5, 6, 8], high: [7, 9, 11] };
const depthLayers = [
  { inset: 2.9, spread: 3.9, floor: .16, height: 8.4, size: .30, reach: 43, opacity: .88 },
  { inset: 1.68, spread: 5.9, floor: .58, height: 14.5, size: .39, reach: 79, opacity: .70 },
  { inset: .95, spread: 9.1, floor: 2.4, height: 24.5, size: .54, reach: 127, opacity: .57 },
];
const segmentLength = 11;
const firstSegment = -2;
const lastSegment = 11;
const minRows = 11;
const maxRows = 24;
const maxColumns = columnsByQuality.high.reduce((total, count) => total + count, 0);
const maxGlyphs = (lastSegment - firstSegment + 1) * maxColumns * maxRows;

// Continuum diagnostics mix stencil lettering and original angular circuit glyphs.
const glyphs = [
  '0', '1', '2', '7', '9', 'A', 'E', 'F', 'K', 'N', 'R', 'S', 'Z', '+', ':', '>',
  ['15 11 51 55', '23 43'], ['13 33 31 51', '35 55 53'],
  ['11 51 53 33 35 15', '23 13'], ['15 51 55', '11 33 53'],
  ['11 15 55 53', '22 42 44'], ['13 31 53 35 13', '31 35'],
  ['11 51 55 15 11', '32 33'], ['15 13 51 53', '32 35'],
  ['51 31 13 35 55', '13 53'], ['11 45 55', '15 33 51'],
  ['21 25', '41 45', '13 53'], ['51 11 13 53 55 15'],
  ['13 33 35 55', '31 51'], ['12 32 54 34 12'],
  ['21 14 25', '41 54 45', '33 34'], ['11 13 23 25 55', '31 51 54'],
  ['11 51 35 11', '23 43'], ['15 11 32 51 55', '23 43'],
  ['15 52 31 54', '11 24'], ['12 31 52 54 35 14 12', '23 43'],
  ['11 33 15', '51 33 55', '31 35'], ['11 55', '15 51', '12 52'],
  ['51 21 23 43 45 15', '55 54'], ['15 13 53 51', '23 21', '43 45'],
  ['11 51 33', '15 32'], ['13 53', '32 35', '24 15', '44 55'],
  ['11 23', '31 43', '53 25'], ['11 52 34 15', '23 54'],
  ['12 52 54', '14 44', '31 35'], ['13 53', '51 22 24 55'],
  ['11 51 55', '12 34 15', '32 53'], ['21 42 24', '12 53', '44 35'],
];

function makeGlyphAtlas() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = ctx.fillStyle = '#fff';
  ctx.lineWidth = 2.55;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 23px monospace';
  for (const [index, marks] of glyphs.entries()) {
    const left = (index % 8) * 32;
    const top = Math.floor(index / 8) * 32;
    if (typeof marks === 'string') {
      ctx.fillText(marks, left + 16, top + 16);
      continue;
    }
    for (const mark of marks) {
      ctx.beginPath();
      for (const [point, [x, y]] of mark.split(' ').entries()) {
        const paintX = left + 3 + Number(x) * 4.3;
        const paintY = top + 2.5 + Number(y) * 4.6;
        if (point === 0) ctx.moveTo(paintX, paintY);
        else ctx.lineTo(paintX, paintY);
      }
      ctx.stroke();
    }
  }
  return new THREE.CanvasTexture(canvas);
}

const vertexShader = /* glsl */`
  uniform float clock;
  uniform float tunnelStart;
  attribute vec3 anchor;
  attribute vec4 trail;
  attribute vec4 field;
  attribute vec3 glyph;
  varying vec2 vUv;
  varying float vGlyph;
  varying float vOpacity;
  varying float vEnergy;
  #include <common>
  #include <logdepthbuf_pars_vertex>

  float hash(float p) {
    return fract(sin(p * 89.37) * 43758.5453);
  }

  void main() {
    float row = glyph.x;
    float seed = anchor.y;
    float head = mod(trail.x - clock * trail.y, field.y);
    float height = field.x + head + row * trail.z;
    vec3 center = vec3(anchor.x + sin(clock * .62 + seed) * .036, height, anchor.z);
    vec3 toCamera = cameraPosition - center;
    vec3 right = normalize(vec3(toCamera.z, 0.0, -toCamera.x) + vec3(.0001, 0.0, 0.0));
    vec3 world = center + right * position.x * trail.w * .82 + vec3(0.0, position.y * trail.w, 0.0);
    float cameraRange = length(toCamera);
    float headroom = 1.0 - smoothstep(field.x + field.y - 2.0, field.x + field.y, height);
    float outerAir = 1.0 - smoothstep(tunnelStart - 7.0, tunnelStart + 2.0, -anchor.z);
    float depth = smoothstep(1.9, 4.4, cameraRange)
      * (1.0 - smoothstep(field.w * .56, field.w, cameraRange));
    float lead = 1.0 - step(.5, row);
    float rowFade = pow(max(.0, 1.0 - row / glyph.y), 1.65);
    float signal = hash(seed + row * 6.57);
    float gaps = mix(.15, 1.0, smoothstep(.055, .23, signal));
    vOpacity = field.z * mix(rowFade * gaps, 1.0, lead)
      * depth * headroom * outerAir * smoothstep(field.x, field.x + 1.1, height);
    vEnergy = mix(.16 + .28 * signal + .38 * exp(-row * .23), 1.0, lead);
    float refresh = floor(clock * mix(.85, 3.25, signal) + glyph.z);
    vGlyph = min(47.0, floor(hash(seed + row * 2.17 + refresh * .11) * 48.0));
    vUv = uv;
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
    #include <logdepthbuf_vertex>
  }
`;

const fragmentShader = /* glsl */`
  uniform sampler2D atlas;
  uniform float strength;
  varying vec2 vUv;
  varying float vGlyph;
  varying float vOpacity;
  varying float vEnergy;
  #include <logdepthbuf_pars_fragment>

  void main() {
    #include <logdepthbuf_fragment>
    vec2 tile = vec2(mod(vGlyph, 8.0), 5.0 - floor(vGlyph / 8.0));
    float ink = texture2D(atlas, (tile + vUv) / vec2(8.0, 6.0)).a;
    vec2 center = (vUv - .5) * vec2(1.4, .96);
    float head = smoothstep(.77, 1.0, vEnergy);
    float phosphor = exp(-9.3 * dot(center, center)) * head * .20;
    float alpha = clamp((ink + phosphor) * vOpacity * strength, 0.0, 1.0);
    if (alpha < .017) discard;
    vec3 codeGreen = mix(vec3(.004, .26, .025), vec3(.016, .98, .12), vEnergy);
    codeGreen = mix(codeGreen, vec3(.61, 1.0, .54), head * smoothstep(.15, .76, ink));
    gl_FragColor = vec4(codeGreen, alpha);
    #include <colorspace_fragment>
  }
`;

function randomFrom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function dynamicAttribute(geometry, name, size) {
  const attribute = new THREE.InstancedBufferAttribute(new Float32Array(maxGlyphs * size), size);
  attribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute(name, attribute);
  return attribute;
}

export class CodeRain {
  constructor({
    quality = 'high',
    reducedMotion = false,
    roadCenter = () => 0,
    tunnelStart = Infinity,
    intensity = 1,
  } = {}) {
    this.roadCenter = roadCenter;
    this.intensity = intensity;
    this.time = 0;
    this.atlas = makeGlyphAtlas();
    this.geometry = new THREE.InstancedBufferGeometry();
    this.geometry.setIndex([0, 1, 2, 2, 1, 3]);
    this.geometry.setAttribute('position', new THREE.Float32BufferAttribute([
      -.5, .5, 0, -.5, -.5, 0, .5, .5, 0, .5, -.5, 0,
    ], 3));
    this.geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 1, 1, 0], 2));
    this.attributes = {
      anchor: dynamicAttribute(this.geometry, 'anchor', 3),
      trail: dynamicAttribute(this.geometry, 'trail', 4),
      field: dynamicAttribute(this.geometry, 'field', 4),
      glyph: dynamicAttribute(this.geometry, 'glyph', 3),
    };
    const material = new THREE.ShaderMaterial({
      name: 'Continuum code rain',
      uniforms: {
        atlas: { value: this.atlas },
        clock: { value: this.time },
        tunnelStart: { value: Number.isFinite(tunnelStart) ? tunnelStart : 1e6 },
        strength: { value: intensity },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      blending: THREE.AdditiveBlending,
    });
    this.object = new THREE.Mesh(this.geometry, material);
    this.object.name = 'Depth layered green code rain';
    this.object.frustumCulled = false;
    this.setQuality(quality);
    this.setReducedMotion(reducedMotion);
    this.update(0, 0);
  }

  setQuality(quality) {
    this.columns = columnsByQuality[quality] ?? columnsByQuality.high;
    this.segment = null;
  }

  setReducedMotion(reducedMotion) {
    this.reducedMotion = reducedMotion;
    this.object.material.uniforms.strength.value = this.intensity * (reducedMotion ? .73 : 1);
  }

  update(delta, playerDistance) {
    if (!this.reducedMotion) this.time += delta;
    this.object.material.uniforms.clock.value = this.time;
    const segment = Math.floor(playerDistance / segmentLength);
    if (segment !== this.segment) this.fillSegmentWindow(segment);
  }

  fillSegmentWindow(segment) {
    this.segment = segment;
    const { anchor, trail, field, glyph } = this.attributes;
    let instance = 0;
    for (let offset = firstSegment; offset <= lastSegment; offset++) {
      const worldSegment = segment + offset;
      for (const [layerIndex, layer] of depthLayers.entries()) {
        const random = randomFrom(0x54524143 + worldSegment * 179 + layerIndex * 7517);
        for (let column = 0; column < this.columns[layerIndex]; column++) {
          const distance = (worldSegment + .1 + random() * .8) * segmentLength;
          const side = (column + worldSegment + layerIndex) % 2 === 0 ? -1 : 1;
          const x = this.roadCenter(distance) + side * (layer.inset + random() * layer.spread);
          const seed = random() * 179;
          const startHeight = random() * layer.height;
          const speed = 2.9 + random() * 5.9 + layerIndex * .24;
          const width = layer.size * (.78 + random() * .52);
          const space = width * (.77 + random() * .28);
          const opacity = layer.opacity * (.64 + random() * .36);
          const rows = minRows + Math.floor(random() * (maxRows - minRows + 1));
          const shuffle = random() * 22;
          for (let row = 0; row < rows; row++) {
            anchor.setXYZ(instance, x, seed, -distance);
            trail.setXYZW(instance, startHeight, speed, space, width);
            field.setXYZW(instance, layer.floor, layer.height, opacity, layer.reach);
            glyph.setXYZ(instance, row, rows, shuffle);
            instance++;
          }
        }
      }
    }
    this.geometry.instanceCount = instance;
    for (const attribute of Object.values(this.attributes)) attribute.needsUpdate = true;
  }

  dispose() {
    this.object.removeFromParent();
    this.geometry.dispose();
    this.object.material.dispose();
    this.atlas.dispose();
  }
}
