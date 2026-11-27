import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';

const settings = {
  low: { longEdge: 280, secondsPerFrame: .094, ldr: true },
  medium: { longEdge: 432, secondsPerFrame: .052, ldr: false },
  high: { longEdge: 640, secondsPerFrame: .032, ldr: false },
};

const streetShader = {
  name: 'WetStreet',
  uniforms: {
    color: { value: null },
    tDiffuse: { value: null },
    textureMatrix: { value: null },
    time: { value: 0 },
    strength: { value: 1 },
    motion: { value: 1 },
    floodStart: { value: 100000 },
    texelSize: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: /* glsl */`
    uniform mat4 textureMatrix;
    varying vec4 vReflection;
    varying vec3 vWorld;
    varying float vRoadAcross;
    #include <common>
    #include <logdepthbuf_pars_vertex>

    void main() {
      vReflection = textureMatrix * vec4(position, 1.0);
      vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
      vRoadAcross = uv.x * 2.0 - 1.0;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      #include <logdepthbuf_vertex>
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float strength;
    uniform float motion;
    uniform float floodStart;
    uniform vec2 texelSize;
    varying vec4 vReflection;
    varying vec3 vWorld;
    varying float vRoadAcross;
    #include <common>
    #include <logdepthbuf_pars_fragment>

    float hash(vec2 p) {
      vec3 q = fract(vec3(p.xyx) * .1031);
      q += dot(q, q.yzx + 33.33);
      return fract((q.x + q.y) * q.z);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
        mix(hash(i + vec2(0, 1)), hash(i + 1.0), f.x), f.y);
    }

    void main() {
      #include <logdepthbuf_fragment>
      if (vReflection.w <= .01) discard;

      vec2 p = vWorld.xz;
      float flooded = smoothstep(floodStart - 5.0, floodStart + 10.0, -p.y);
      float roadAcross = abs(vRoadAcross);
      float gutter = smoothstep(.38, .88, roadAcross);
      float roadEdge = 1.0 - smoothstep(.89, 1.0, roadAcross);
      vec2 rainDrainage = p * vec2(.75, .26);
      float mottling = noise(p * vec2(.19, .13));
      rainDrainage.x += (mottling - .5) * 1.6;
      float pooling = .76 * noise(rainDrainage) + .24 * noise(p * vec2(1.85, .9));
      float puddle = smoothstep(.41, .69, pooling + gutter * .14);
      float dampness = mix(mix(.08, .86, puddle), .93, flooded) * roadEdge;

      vec2 tile = p * 1.56;
      vec2 tileId = floor(tile);
      vec2 impact = vec2(hash(tileId + 21.7), hash(tileId - 9.2)) * .28 + .36;
      vec2 rippleVector = fract(tile) - impact;
      float rippleRadius = length(rippleVector);
      float age = fract(time * (.57 + .8 * hash(tileId + 3.1)) + hash(tileId));
      float ripple = sin(154.0 * (rippleRadius - age * .32))
        * (1.0 - smoothstep(.027, .078, abs(rippleRadius - age * .32)))
        * (1.0 - age) * smoothstep(.03, .14, age);
      vec2 disturbance = (vec2(mottling, noise(rainDrainage + 11.7)) - .5)
        * mix(.015, .003, puddle);
      disturbance += rippleVector * ripple * motion * .071;
      vec2 current = vec2(sin(p.x * 1.6 + p.y * .48 + time * 2.2), sin(p.y * 2.53 - p.x * 2.1 + time * 3.1));
      disturbance += current * flooded * motion * vec2(.009, .0065);

      vec2 projected = vReflection.xy / vReflection.w;
      vec2 reflectedUv = projected + disturbance;
      vec2 border = min(reflectedUv, 1.0 - reflectedUv);
      float reflectionEdge = smoothstep(.002, .052, min(border.x, border.y));
      if (reflectionEdge <= .0) discard;
      vec2 roughSample = texelSize * mix(1.92, .24, puddle);
      vec3 reflected = texture2D(tDiffuse, reflectedUv).rgb * .56;
      reflected += texture2D(tDiffuse, reflectedUv + roughSample).rgb * .22;
      reflected += texture2D(tDiffuse, reflectedUv - roughSample).rgb * .22;

      float grazing = 1.0 - clamp(abs(normalize(cameraPosition - vWorld).y), .0, 1.0);
      float fresnel = mix(.28, 1.0, grazing * grazing);
      float nearField = 1.0 - smoothstep(62.0, 136.0, distance(cameraPosition, vWorld));
      // Suppress the fog-color floor while retaining the color of each light source.
      vec3 light = max(reflected - vec3(.019, .023, .023), vec3(0.0));
      light *= vec3(.89, .98, .95);
      gl_FragColor = vec4(light, clamp(dampness * fresnel * reflectionEdge * nearField * strength, .0, 1.0));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
};

function roadRibbon(roadCenter, width, start, end, floodStart, floodWidth) {
  const length = end - start;
  const center = (start + end) * .5;
  const geometry = new THREE.PlaneGeometry(width, length, 1, Math.ceil(length / 2.5));
  const points = geometry.getAttribute('position');
  for (let index = 0; index < points.count; index++) {
    const distance = center + points.getY(index);
    const spread = THREE.MathUtils.smoothstep(distance, floodStart - 1, floodStart + 14);
    points.setX(index, points.getX(index) * THREE.MathUtils.lerp(1, floodWidth / width, spread) + roadCenter(distance));
  }
  geometry.computeBoundingSphere();
  return { geometry, center };
}

export class WetStreet {
  constructor(renderer, {
    quality = 'high',
    reducedMotion = false,
    roadCenter = () => 0,
    roadWidth = 12.8,
    rangeStart = -50,
    rangeEnd = 780,
    reflectionStrength = 1,
    floodStart = 100000,
    floodWidth = roadWidth,
  } = {}) {
    const { geometry, center } = roadRibbon(roadCenter, roadWidth, rangeStart, rangeEnd, floodStart, floodWidth);
    this.object = new Reflector(geometry, {
      shader: streetShader, textureWidth: 16, textureHeight: 16, multisample: 0, clipBias: .002,
    });
    this.object.name = 'Wet street reflections';
    this.object.rotation.x = -Math.PI / 2;
    this.object.position.set(0, .008, -center);
    this.object.material.transparent = true;
    this.object.material.depthWrite = false;
    this.object.material.blending = THREE.AdditiveBlending;
    this.object.material.uniforms.strength.value = reflectionStrength;
    this.object.material.uniforms.floodStart.value = floodStart;
    this.elapsed = 0;
    this.reflectedAt = -Infinity;
    this.previousDistance = null;
    this.lastCamera = new THREE.Vector3();
    this.lastOrientation = new THREE.Quaternion();
    this.cameraPosition = new THREE.Vector3();
    this.cameraOrientation = new THREE.Quaternion();
    this.drawSize = new THREE.Vector2();
    this.floatTargetSupported = renderer.extensions.has('EXT_color_buffer_float');
    this.setReducedMotion(reducedMotion);
    this.setQuality(quality);

    const reflect = this.object.onBeforeRender;
    this.object.onBeforeRender = (activeRenderer, scene, camera) => {
      camera.getWorldPosition(this.cameraPosition);
      camera.getWorldQuaternion(this.cameraOrientation);
      const rapidMove = this.lastCamera.distanceToSquared(this.cameraPosition) > 8;
      const rapidTurn = Math.abs(this.lastOrientation.dot(this.cameraOrientation)) < .994;
      const resized = this.resizeTarget(activeRenderer);
      if (!resized && !rapidMove && !rapidTurn && this.elapsed - this.reflectedAt < this.quality.secondsPerFrame) return;
      this.lastCamera.copy(this.cameraPosition);
      this.lastOrientation.copy(this.cameraOrientation);
      this.reflectedAt = this.elapsed;
      reflect.call(this.object, activeRenderer, scene, camera);
    };
  }

  setQuality(quality) {
    this.quality = settings[quality] ?? settings.high;
    const target = this.object.getRenderTarget();
    const targetType = this.quality.ldr || !this.floatTargetSupported
      ? THREE.UnsignedByteType
      : THREE.HalfFloatType;
    if (target.texture.type !== targetType) {
      target.dispose();
      target.texture.type = targetType;
    }
    this.reflectedAt = -Infinity;
  }

  setReducedMotion(reducedMotion) {
    this.object.material.uniforms.motion.value = reducedMotion ? 0 : 1;
  }

  resizeTarget(renderer) {
    renderer.getDrawingBufferSize(this.drawSize);
    const longest = Math.max(1, this.drawSize.x, this.drawSize.y);
    const shortEdge = (size) => Math.max(16, Math.round(size / longest * this.quality.longEdge / 16) * 16);
    const width = shortEdge(this.drawSize.x);
    const height = shortEdge(this.drawSize.y);
    const target = this.object.getRenderTarget();
    if (target.width === width && target.height === height) return false;
    target.setSize(width, height);
    this.object.material.uniforms.texelSize.value.set(1 / width, 1 / height);
    return true;
  }

  update(delta, playerDistance) {
    this.elapsed += delta;
    this.object.material.uniforms.time.value = this.elapsed;
    if (this.previousDistance !== null && Math.abs(playerDistance - this.previousDistance) > 5) {
      this.reflectedAt = -Infinity;
    }
    this.previousDistance = playerDistance;
  }

  dispose() {
    this.object.removeFromParent();
    this.object.geometry.dispose();
    this.object.dispose();
  }
}
