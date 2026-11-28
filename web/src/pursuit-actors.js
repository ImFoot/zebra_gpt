import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const axisY = new THREE.Vector3(0, 1, 0);
const wheelRadius = .35;
const unitBox = new THREE.BoxGeometry();
const unitPod = new THREE.IcosahedronGeometry(1, 1);
const unitLink = new THREE.CylinderGeometry(1, 1, 1, 7);
const unitJoint = new THREE.SphereGeometry(1, 10, 6);

function makeParts() {
  const layers = new Map();
  const pose = new THREE.Object3D();
  const from = new THREE.Vector3();
  const direction = new THREE.Vector3();

  function add(geometry, material) {
    pose.updateMatrix();
    const copy = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    copy.applyMatrix4(pose.matrix);
    if (!layers.has(material)) layers.set(material, []);
    layers.get(material).push(copy);
  }

  function shape(geometry, material, position, size, rotation = [0, 0, 0]) {
    pose.position.fromArray(position);
    pose.scale.fromArray(size);
    pose.rotation.fromArray(rotation);
    add(geometry, material);
  }

  function link(material, start, end, radius) {
    from.fromArray(start);
    direction.fromArray(end).sub(from);
    pose.position.copy(from).addScaledVector(direction, .5);
    pose.scale.set(radius, direction.length(), radius);
    pose.quaternion.setFromUnitVectors(axisY, direction.normalize());
    add(unitLink, material);
  }

  function build() {
    const group = new THREE.Group();
    for (const [material, geometries] of layers) {
      group.add(new THREE.Mesh(mergeGeometries(geometries), material));
      for (const geometry of geometries) geometry.dispose();
    }
    return group;
  }

  return { shape, link, build };
}

function glowMap() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, '#fffffff7');
  gradient.addColorStop(.25, '#ffffff75');
  gradient.addColorStop(.65, '#ffffff20');
  gradient.addColorStop(1, '#ffffff00');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

function placeGlow(group, map, color, position, size, opacity) {
  const material = new THREE.SpriteMaterial({
    map, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.position.fromArray(position);
  sprite.scale.fromArray(size);
  group.add(sprite);
}

function makeWheel(materials, width, z) {
  const { rubber, chrome, dark } = materials;
  const parts = makeParts();
  const tire = new THREE.TorusGeometry(.29, .06, 8, 22);
  const lip = new THREE.TorusGeometry(.229, .016, 6, 18);
  const disc = new THREE.CylinderGeometry(.138, .138, .025, 16);
  parts.shape(tire, rubber, [0, 0, 0], [1, 1, width], [0, Math.PI / 2, 0]);
  for (const side of [-1, 1]) {
    parts.shape(lip, chrome, [side * width * .043, 0, 0], [1, 1, 1], [0, Math.PI / 2, 0]);
    parts.shape(disc, dark, [side * width * .042, 0, 0], [1, 1, 1], [0, 0, Math.PI / 2]);
    for (let spoke = 0; spoke < 5; spoke++) {
      const angle = spoke * Math.PI * .4;
      parts.link(chrome, [side * .067, .062 * Math.cos(angle - .25), .062 * Math.sin(angle - .25)],
        [side * .07, .223 * Math.cos(angle), .223 * Math.sin(angle)], .014);
    }
  }
  for (let block = 0; block < 20; block++) {
    const angle = block * Math.PI / 10;
    parts.shape(unitBox, rubber, [block % 2 ? -.035 : .035, .344 * Math.cos(angle), .344 * Math.sin(angle)],
      [width * .058, .012, .067], [angle, .22 * (block % 2 ? 1 : -1), 0]);
  }
  parts.link(chrome, [-.133, 0, 0], [.133, 0, 0], .05);
  const wheel = parts.build();
  wheel.position.set(0, wheelRadius, z);
  tire.dispose();
  lip.dispose();
  disc.dispose();
  return wheel;
}

function fender(parts, paint, z, width) {
  for (let panel = -3; panel <= 3; panel++) {
    const angle = panel * .24;
    parts.shape(unitBox, paint, [0, wheelRadius + .382 * Math.cos(angle), z + .382 * Math.sin(angle)],
      [width, .032, .102], [angle, 0, 0]);
  }
}

function makeBike(materials, paint, lamp, lampColor, halo) {
  const { chrome, dark, rubber, red, visor } = materials;
  const parts = makeParts();
  const frontZ = -.76;
  const rearZ = .74;
  fender(parts, paint, frontZ, .20);
  fender(parts, paint, rearZ, .25);

  parts.shape(unitPod, dark, [0, .59, .08], [.27, .25, .69]);
  parts.shape(unitPod, paint, [0, .8, -.19], [.31, .205, .57], [-.12, 0, 0]);
  parts.shape(unitPod, paint, [0, .85, -.57], [.32, .19, .37], [.17, 0, 0]);
  parts.shape(unitPod, visor, [0, 1.017, -.63], [.219, .074, .23], [-.32, 0, 0]);
  parts.shape(unitPod, rubber, [0, .899, .31], [.196, .061, .36], [-.12, 0, 0]);
  parts.shape(unitPod, paint, [0, .831, .59], [.205, .103, .34], [-.22, 0, 0]);
  parts.shape(unitBox, red, [0, .849, .864], [.232, .041, .025]);

  for (const side of [-1, 1]) {
    parts.link(chrome, [side * .116, wheelRadius, frontZ], [side * .185, .879, -.50], .036);
    parts.link(dark, [side * .14, .448, frontZ + .049], [side * .166, .659, -.625], .043);
    parts.link(chrome, [side * .125, .36, rearZ], [side * .13, .574, .114], .038);
    parts.link(paint, [side * .191, .56, .54], [side * .181, .731, -.32], .042);
    parts.link(dark, [side * .234, .486, -.16], [side * .292, .592, .759], .054);
    parts.link(chrome, [side * .28, .577, .681], [side * .287, .591, .79], .057);
    parts.link(chrome, [side * .15, 1.008, -.462], [side * .319, 1.021, -.547], .018);
    parts.shape(unitBox, lamp, [side * .143, .856, -.913], [.172, .05, .025], [.10, side * .12, side * -.11]);
    parts.shape(unitBox, chrome, [side * .258, .68, -.213], [.038, .12, .115], [.11, 0, 0]);
    parts.shape(unitBox, lamp, [side * .306, .818, -.44], [.024, .03, .192], [.16, 0, 0]);
  }

  // The security rider's smooth helmet and exposed hinge joints share the chassis metal.
  parts.shape(unitPod, dark, [0, 1.116, .155], [.203, .156, .175], [-.30, 0, 0]);
  parts.link(chrome, [0, 1.145, .128], [0, 1.438, -.155], .066);
  parts.shape(unitPod, paint, [0, 1.302, -.029], [.254, .236, .147], [-.57, 0, 0]);
  parts.shape(unitPod, dark, [0, 1.421, -.175], [.112, .09, .105]);
  const helmet = makeParts();
  helmet.shape(unitPod, chrome, [0, .077, -.032], [.154, .156, .155], [-.17, 0, 0]);
  helmet.shape(unitPod, visor, [0, .081, -.142], [.124, .064, .059], [-.18, 0, 0]);
  helmet.shape(unitPod, dark, [0, .026, -.102], [.112, .074, .081], [-.37, 0, 0]);

  for (const side of [-1, 1]) {
    const shoulder = [side * .242, 1.336, -.078];
    const elbow = [side * .322, 1.163, -.263];
    const grip = [side * .305, 1.027, -.542];
    const hip = [side * .139, 1.034, .166];
    const knee = [side * .269, .743, -.164];
    const ankle = [side * .293, .576, .231];
    parts.link(chrome, shoulder, elbow, .042);
    parts.link(chrome, elbow, grip, .031);
    parts.link(chrome, hip, knee, .07);
    parts.link(chrome, knee, ankle, .048);
    parts.shape(unitPod, paint, shoulder, [.089, .077, .125], [-.52, side * .2, 0]);
    parts.shape(unitJoint, dark, elbow, [.052, .05, .054]);
    parts.shape(unitJoint, dark, knee, [.072, .072, .071]);
    parts.shape(unitPod, paint, knee, [.08, .066, .072]);
    parts.shape(unitPod, rubber, grip, [.052, .044, .062]);
    parts.shape(unitPod, dark, [ankle[0], ankle[1], ankle[2] - .052], [.062, .046, .125]);
    helmet.shape(unitBox, red, [side * .062, .088, -.198], [.057, .027, .014], [-.15, side * .11, side * -.15]);
  }

  const model = parts.build();
  const wheels = [makeWheel(materials, 1.38, frontZ), makeWheel(materials, 1.65, rearZ)];
  const head = helmet.build();
  head.position.set(0, 1.46, -.20);
  model.add(...wheels, head);
  placeGlow(model, halo, lampColor, [0, .854, -.932], [1.02, .44, 1], .72);
  placeGlow(head, halo, 0xff472e, [0, .087, -.202], [.37, .18, 1], .56);
  placeGlow(model, halo, 0xff472e, [0, .849, .88], [.54, .21, 1], .35);
  model.visible = false;
  return { model, wheels, head };
}

function makeBottle() {
  const outline = [
    [0, -.154], [.047, -.154], [.056, -.145], [.057, -.131], [.057, .038], [.051, .058],
    [.022, .088], [.019, .143], [.021, .149], [.021, .163], [.016, .168], [0, .168],
  ];
  const wineGlass = new THREE.MeshStandardMaterial({ color: 0x40162b, roughness: .14, metalness: .27, emissive: 0x27040d, emissiveIntensity: .35 });
  const foil = new THREE.MeshStandardMaterial({ color: 0xa44553, roughness: .28, metalness: .48 });
  const paper = new THREE.MeshStandardMaterial({ color: 0xe8d6ab, roughness: .47 });
  const labelStripe = new THREE.MeshBasicMaterial({ color: 0x6c3045 });
  const bottle = new THREE.Group();
  const body = new THREE.Mesh(new THREE.LatheGeometry(outline.map(([x, y]) => new THREE.Vector2(x, y)), 14), wineGlass);
  const label = new THREE.Mesh(new THREE.CylinderGeometry(.058, .058, .088, 14, 1, true), paper);
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(.059, .059, .018, 14, 1, true), labelStripe);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(.022, .019, .048, 12), foil);
  label.position.y = -.051;
  stripe.position.y = -.026;
  cap.position.y = .144;
  bottle.add(body, label, stripe, cap);
  bottle.visible = false;
  return bottle;
}

function makeSlick() {
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { filmTime: { value: 0 } }]);
  const material = new THREE.ShaderMaterial({
    uniforms,
    fog: true,
    transparent: true,
    depthWrite: false,
    vertexShader: `
      #include <common>
      #include <fog_pars_vertex>
      varying vec2 vSlickUv;
      void main() {
        vSlickUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: `
      #include <common>
      #include <fog_pars_fragment>
      uniform float filmTime;
      varying vec2 vSlickUv;
      void main() {
        vec2 p = vSlickUv * 2.0 - 1.0;
        float angle = atan(p.y, p.x);
        float limit = .88 + .064 * sin(angle * 7.0 + .6) + .045 * sin(angle * 11.0);
        float radius = length(p);
        float alpha = 1.0 - smoothstep(limit - .023, limit, radius);
        if (alpha < .004) discard;
        float rim = smoothstep(limit - .21, limit - .041, radius);
        float flow = p.x * 14.0 + p.y * 8.0 + sin(p.y * 6.0 - p.x * 3.0) * 2.7
          + sin(p.x * 7.0 + p.y * 4.0) * 1.4 + filmTime * 1.1;
        vec3 sheen = vec3(.28, .052, .083) * (.73 + .27 * cos(flow));
        float filaments = pow(.5 + .5 * sin(flow * 1.31 + radius * 6.0), 8.0);
        float streak = (1.0 - smoothstep(.01, .07, abs(p.x + .32 + p.y * .23))) * .16;
        vec3 wine = vec3(.072, .006, .017) + sheen * (.11 + rim * .59 + filaments * .27 + streak);
        gl_FragColor = vec4(wine, alpha * .89);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
  });
  const group = new THREE.Group();
  const film = new THREE.Mesh(new THREE.PlaneGeometry(2.15, 3.35), material);
  film.rotation.x = -Math.PI / 2;
  film.position.y = .002;
  film.renderOrder = 5;
  film.onBeforeRender = () => { uniforms.filmTime.value = performance.now() * .001; };
  group.add(film);
  group.visible = false;
  return group;
}

export function makeSparks(scene) {
  const count = 30;
  const instance = new THREE.InstancedMesh(unitBox, new THREE.MeshBasicMaterial({ toneMapped: false }), count);
  const pose = new THREE.Object3D();
  const velocity = new THREE.Vector3();
  const previous = new THREE.Vector3();
  const baseColor = new THREE.Color();
  const particles = Array.from({ length: count }, (_, index) => ({
    angle: (index * 2.39996) % (Math.PI * 2),
    force: 2.1 + (index % 7) * .76,
    up: .8 + (index % 6) * .68,
    delay: (index % 5) * .018,
    length: .06 + (index % 6) * .016,
  }));
  instance.frustumCulled = false;
  instance.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  instance.visible = false;
  scene.add(instance);

  return function sparks(effect) {
    instance.visible = Boolean(effect && effect.age >= 0 && effect.age < .77);
    if (!instance.visible) return;
    const { position, age, style = 'impact', yaw = 0 } = effect;
    const skid = style === 'skid';
    instance.position.copy(position);
    for (const [index, particle] of particles.entries()) {
      const time = Math.max(0, age - particle.delay);
      const alpha = age < particle.delay ? 0 : Math.max(0, 1 - time / .66);
      const heading = yaw + (skid ? Math.sin(particle.angle) * .72 : particle.angle);
      velocity.set(Math.sin(heading) * particle.force, particle.up * (skid ? .6 : 1), Math.cos(heading) * particle.force);
      pose.position.copy(velocity).multiplyScalar(time);
      pose.position.y -= 5.9 * time * time;
      pose.position.y = Math.max(pose.position.y, .02 - position.y);
      previous.copy(pose.position).addScaledVector(velocity, .08);
      previous.y -= .94 * time;
      pose.lookAt(previous);
      pose.scale.set(.018 * alpha, .019 * alpha, particle.length * alpha);
      pose.updateMatrix();
      instance.setMatrixAt(index, pose.matrix);
      baseColor.set(index % 3 === 0 ? 0xfffbc7 : 0xff8f44).multiplyScalar(.35 + alpha * .65);
      instance.setColorAt(index, baseColor);
    }
    instance.instanceMatrix.needsUpdate = true;
    instance.instanceColor.needsUpdate = true;
  };
}

export function makePursuitActors(scene) {
  const materials = {
    chrome: new THREE.MeshStandardMaterial({ color: 0x9caeb0, roughness: .21, metalness: .75 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x263235, roughness: .34, metalness: .69 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x161d1f, roughness: .67, metalness: .05 }),
    red: new THREE.MeshBasicMaterial({ color: 0xff3c24, toneMapped: false }),
    visor: new THREE.MeshStandardMaterial({ color: 0x202a37, roughness: .12, metalness: .56 }),
  };
  const halo = glowMap();
  const { model: bike, wheels, head } = makeBike(materials,
    new THREE.MeshStandardMaterial({ color: 0x667f81, roughness: .2, metalness: .65 }),
    new THREE.MeshBasicMaterial({ color: 0xbaffdc, toneMapped: false }), 0x73ffc4, halo);
  const bottle = makeBottle();
  const slick = makeSlick();
  bike.name = 'Continuum pursuit bike';
  scene.add(bike, bottle, slick);

  function spin(displacement) {
    for (const wheel of wheels) wheel.rotation.x -= displacement / wheelRadius;
  }

  function look(angle) {
    head.rotation.y = angle;
  }

  return { bike, bottle, slick, sparks: makeSparks(scene), spin, look };
}
