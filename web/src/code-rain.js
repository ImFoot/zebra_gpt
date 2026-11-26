import * as THREE from 'three';

const columnsByQuality = { low: [2, 2, 2], medium: [3, 4, 4], high: [5, 5, 6] };
const depthLayers = [
  { inset: 2.5, spread: 4.3, floor: .16, height: 6.2, size: .37, reach: 35, opacity: .92 },
  { inset: 3.9, spread: 3.5, floor: .42, height: 11.2, size: .47, reach: 69, opacity: .79 },
  { inset: 4.8, spread: 3.6, floor: 3.5, height: 18.5, size: .68, reach: 112, opacity: .58 },
];
const segmentLength = 12;
const firstSegment = -2;
const lastSegment = 9;
const maxRows = 13;
const maxGlyphs = (lastSegment - firstSegment + 1) * (5 + 5 + 6) * maxRows;

// Continuum diagnostics combine letters, binary, operators and original circuit glyphs.
const glyphs = [
  ['0'], ['1'], ['A'], ['F'], ['N'], ['R'], ['>'], ['+'],
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
];

function makeGlyphAtlas() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = ctx.fillStyle = '#fff';
  ctx.lineWidth = 2.55;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 25px monospace';
  for (const [index, marks] of glyphs.entries()) {
    const left = (index % 8) * 32;
    const top = Math.floor(index / 8) * 32;
    if (index < 8) {
      ctx.fillText(marks[0], left + 16, top + 16);
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
  varying float vGreen;
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
    vec3 center = vec3(anchor.x + sin(clock * .63 + seed) * .13 + row * .008, height, anchor.z);
    vec3 toCamera = cameraPosition - center;
    vec3 right = normalize(vec3(toCamera.z, 0.0, -toCamera.x) + vec3(.0001, 0.0, 0.0));
    vec3 world = center + right * position.x * trail.w * .77 + vec3(0.0, position.y * trail.w, 0.0);
    float cameraRange = length(toCamera);
    float headroom = 1.0 - smoothstep(field.x + field.y - 1.7, field.x + field.y, height);
    float outerAir = 1.0 - smoothstep(tunnelStart - 7.0, tunnelStart + 2.0, -anchor.z);
    float depth = smoothstep(2.1, 6.2, cameraRange)
      * (1.0 - smoothstep(field.w * .49, field.w, cameraRange));
    float channel = fract(seed * 1.13);
    float rowFade = pow(max(.0, 1.0 - row / glyph.y), 1.38);
    float gaps = mix(.48, 1.0, step(.17, hash(seed + row)));
    vOpacity = field.z * mix(rowFade * gaps, headroom, 1.0 - step(.5, row))
      * depth * headroom * outerAir * smoothstep(field.x, field.x + .9, height);
    vGreen = mix(.29 + .24 * channel, 1.0, 1.0 - step(.5, row));
    vGlyph = floor(hash(seed + row * 2.17 + floor(clock * .72 + glyph.z) * .11) * 32.0);
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
  varying float vGreen;
  #include <logdepthbuf_pars_fragment>

  void main() {
    #include <logdepthbuf_fragment>
    vec2 tile = vec2(mod(vGlyph, 8.0), 3.0 - floor(vGlyph / 8.0));
    float ink = texture2D(atlas, (tile + vUv) / vec2(8.0, 4.0)).a;
    float alpha = ink * vOpacity * strength;
    if (alpha < .022) discard;
    vec3 codeGreen = mix(vec3(.008, .38, .105), vec3(.17, 1.0, .42), vGreen);
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
          const speed = 1.35 + random() * 2.65 + layerIndex * .23;
          const width = layer.size * (.78 + random() * .47);
          const space = width * (.93 + random() * .16);
          const opacity = layer.opacity * (.61 + random() * .39);
          const rows = 7 + Math.floor(random() * 7);
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
