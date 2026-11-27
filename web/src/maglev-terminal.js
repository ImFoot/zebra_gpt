import * as THREE from 'three';
import { batches } from './city.js';
import { maglevStart, routeAt, routeLength } from './route.js';

const bayLength = 44;
const hallWidth = 36;

const waterVertex = /* glsl */ `
  varying vec2 ground;
  #include <fog_pars_vertex>
  void main() {
    ground = (modelMatrix * vec4(position, 1.0)).xz;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const waterFragment = /* glsl */ `
  uniform float clock;
  varying vec2 ground;
  #include <fog_pars_fragment>
  void main() {
    vec2 p = ground;
    vec2 flow = vec2(sin(p.x * 1.16 + p.y * .87 + clock * 1.81), sin(p.x * .68 - p.y * 1.39 - clock * 1.47));
    vec2 panel = (p + flow * .047) * vec2(.35, .27);
    panel.x += mod(floor(panel.y), 2.0) * .5;
    vec2 joint = abs(fract(panel) - .5);
    float seam = smoothstep(.465, .498, max(joint.x, joint.y));
    float broad = .5 + .5 * sin(p.y * .32 + flow.x * .34);
    float caustic1 = sin(dot(p, vec2(3.2, 4.75)) + flow.x * 2.5 + clock * 2.6);
    float caustic2 = sin(dot(p, vec2(-3.5, 4.0)) + flow.y * 1.8 - clock * 2.13);
    float web = 1.0 - smoothstep(.0, .22, abs(caustic1 * .56 + caustic2 * .44));
    float pool = .5 + .5 * sin(dot(p, vec2(.47, -.31)) + flow.y);
    vec3 liquid = mix(vec3(.012, .029, .037), vec3(.023, .060, .076), broad);
    liquid *= 1.0 - seam * .24;
    liquid += (.0017 * flow.x + web * pool * .017) * vec3(.37, .82, 1.12);
    gl_FragColor = vec4(liquid, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

function stationSign(name, description, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0a1a22';
  ctx.fillRect(0, 0, 1024, 256);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1024, 9);
  ctx.fillRect(33, 59, 7, 130);
  ctx.font = '700 36px monospace';
  ctx.fillText(description, 62, 91);
  ctx.fillStyle = '#f1ffff';
  ctx.font = '900 91px Arial Narrow, Arial, sans-serif';
  ctx.fillText(name, 57, 194, 914);
  ctx.strokeStyle = '#254852';
  ctx.lineWidth = 3;
  ctx.strokeRect(1, 15, 1022, 239);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return new THREE.MeshBasicMaterial({ map, toneMapped: false });
}

function platformWallMap() {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 320);
  gradient.addColorStop(0, '#81959b');
  gradient.addColorStop(.68, '#637378');
  gradient.addColorStop(.73, '#46565b');
  gradient.addColorStop(1, '#354749');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 768, 320);
  for (let panel = 0; panel < 12; panel++) {
    ctx.fillStyle = '#17293064';
    ctx.fillRect(panel * 64, 0, 2, 320);
    for (let j = 0; j < 14; j++) {
      const x = panel * 64 + (19 * j + panel * 7) % 63;
      ctx.fillStyle = j % 3 ? '#15364728' : '#a989642b';
      ctx.fillRect(x, (j * 31 + panel * 11) % 128, 1 + j % 4, 43 + ((j + 4 * panel) * 17) % 191);
    }
  }
  for (const y of [77, 153, 229, 305]) {
    ctx.fillStyle = '#1a303960';
    ctx.fillRect(0, y, 768, 1);
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

function arch() {
  const points = Array.from({ length: 19 }, (_, index) => {
    const angle = Math.PI * index / 18;
    return new THREE.Vector3(18.3 * Math.cos(angle), 5.25 + 7.05 * Math.sin(angle), 0);
  });
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 28, .135, 5, false);
}

export function makeMaglevTerminal(scene, kit, compact) {
  const station = new THREE.Group();
  station.name = 'Flooded Maglev Terminal';
  routeAt(maglevStart, 0, 0, station.position);
  scene.add(station);
  const shell = new THREE.MeshStandardMaterial({ color: 0x96b5b6, metalness: .33, roughness: .61 });
  const panels = new THREE.MeshStandardMaterial({ ...kit.stationPanels, map: platformWallMap(), metalness: .18,
    roughness: .86, normalScale: new THREE.Vector2(.38, .38) });
  const supports = new THREE.MeshStandardMaterial({ color: 0x819ba8, metalness: .73, roughness: .30 });
  const concrete = new THREE.MeshStandardMaterial({ color: 0x799194, roughness: .64 });
  const deck = new THREE.MeshStandardMaterial({
    ...kit.pavement, color: 0x607781, roughness: .43, metalness: .16, normalScale: new THREE.Vector2(.45, .45),
  });
  const rails = new THREE.MeshStandardMaterial({ color: 0x89949e, roughness: .25, metalness: .86 });
  const officeGlass = new THREE.MeshStandardMaterial({ color: 0x395262, roughness: .22, metalness: .43, emissive: 0x145357, emissiveIntensity: .41 });
  const light = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const signFaces = [
    stationSign('FLOODED MAGLEV', 'CONTINUUM TRANSIT  /  TERMINAL 09', '#a2f7ff'),
    stationSign('PLATFORMS 4–7', 'EXPRESS  /  KEEP OFF THE GUIDEWAY', '#98f0f2'),
    stationSign('RETURN SERVICE', 'TO CINEMA ROW  /  EAST EXIT', '#ffc685'),
  ];
  const water = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { clock: { value: 0 } }]),
    vertexShader: waterVertex, fragmentShader: waterFragment, fog: true,
  });
  const wetLength = routeLength - maglevStart + 30;
  const flooded = new THREE.Mesh(new THREE.PlaneGeometry(hallWidth - .7, wetLength), water);
  flooded.name = 'Flooded terminal water';
  flooded.rotation.x = -Math.PI / 2;
  flooded.position.set(0, .004, -wetLength / 2);
  station.add(flooded);

  const rib = arch();
  const signPlane = new THREE.PlaneGeometry();
  const bayCount = Math.ceil(wetLength / bayLength);
  const bays = Array.from({ length: bayCount }, (_, index) => {
    const section = new THREE.Group();
    section.position.z = -index * bayLength;
    station.add(section);
    const place = batches(section);
    const center = -bayLength / 2;
    const transfer = index >= 4 && index <= 8;
    const ambient = transfer ? 0xffcca3 : 0xa9edff;
    const wall = transfer ? 0x64777f : 0x72828a;

    for (const side of [-1, 1]) {
      place.add(panels, side * 18.36, 3.45, center, .72, 7, bayLength, wall);
      place.add(concrete, side * 17.965, .84, center, .11, 1.28, bayLength, 0x334a4a);
      place.add(supports, side * 17.96, 2.0, center, .12, .09, bayLength, 0x788482);
      place.add(supports, side * 16.75, 8.18, center, 4.55, .23, bayLength, 0x40565d, 0);
      place.add(shell, side * 16.34, 7.26, center, 5.82, .34, bayLength, 0x596e79);
      place.add(supports, side * 8.18, 10.22, center, 5.4, .33, bayLength, 0x4a6773);
      place.add(supports, side * 3.05, 12.29, center, .22, .27, bayLength, 0x576770);
      place.add(shell, side * 2.59, 12.62, center, 5.4, .37, bayLength, 0x344650);
      place.add(concrete, side * 15.15, .31, center, 5.2, .63, bayLength, 0x506564);
      place.add(deck, side * 15.15, .657, center, 5.2, .061, bayLength, 0xafafa7);
      place.add(supports, side * 12.49, .9, center, .15, .14, bayLength, 0x747e74);
      place.add(light, side * 12.50, .75, center, .075, .044, bayLength, 0xffc362);
      place.add(supports, side * 6.56, .047, center, .14, .077, bayLength, 0x64808a);
      place.add(light, side * 6.56, .096, center, .035, .026, bayLength, 0x77ddf4);
      for (const rail of [-1.33, 1.33]) {
        place.add(rails, side * 10.15 + rail, .105, center, .14, .17, bayLength, 0x70838a);
        place.add(rails, side * 10.15 + rail, .206, center, .19, .04, bayLength, 0x9caab6);
      }
      for (let segment = 0; segment < 4; segment++) {
        const z = -5.5 - segment * 11;
        place.add(supports, side * 17.73, 3.75, z, .74, 7.7, .89, 0x6a8087);
        place.add(concrete, side * 17.34, .93, z, 1.06, 1.73, 1.26, 0x637678);
        place.add(supports, side * 17.82, 3.3, z - 4.8, .085, 1.02, 7.8, 0x243640);
        place.add(light, side * 17.73, 4.95, z - 3.7, .065, .079, 6.28, ambient);
        place.add(supports, side * 12.57, 1.04, z - 4.15, .18, .91, .18, 0xa0a8a0);
        place.add(light, side * 12.48, 1.49, z - 4.15, .064, .093, .185, 0xffab52);
      }
      for (let sleeper = 0; sleeper < (compact ? 12 : 22); sleeper++) {
        const z = -(sleeper + .5) * bayLength / (compact ? 12 : 22);
        place.add(concrete, side * 10.15, .038, z, 3.24, .056, .25, 0x45656b);
      }
      if (index % 2 === 1) {
        const z = -20.3;
        place.add(supports, side * 16.1, 1.1, z, 1.08, .11, 4.9, 0x8aa2aa);
        place.add(supports, side * 16.55, 1.47, z, .125, .58, 4.9, 0x788f97);
        place.add(concrete, side * 16.1, .85, z, .65, .53, 3.65, 0x405e68);
      }
      if (index % 4 === 2 || index === 1) {
        const z = -26.7 + side * 6.8;
        place.add(supports, side * 17.0, 2.05, z, 1.9, 2.79, 7.85, 0x666f72);
        place.add(officeGlass, side * 16.04, 2.33, z, .095, 1.53, 7.19, 0x95c7c4);
        place.add(light, side * 15.98, 2.97, z, .075, .13, 6.98, transfer ? 0xf2ad6b : 0x78d2e4);
        for (let window = -2; window <= 2; window++) {
          place.add(supports, side * 15.97, 2.36, z + window * 1.32, .095, 1.42, .15, 0xa3b1b2);
        }
      }
    }

    for (const z of [-.1, -14.7, -29.35]) {
      const frame = new THREE.Mesh(rib, supports);
      frame.position.z = z;
      section.add(frame);
      place.add(supports, 0, 8.6, z, 33.5, .19, .34, 0x43616b);
      for (const x of [-12.75, -4.1, 4.1, 12.75]) {
        place.add(supports, x, 7.77, z, .15, 1.67, .15, 0x576c76);
        place.add(shell, x, 6.96, z, .49, .21, 2.8, 0x52616a);
        place.add(light, x, 6.831, z, .39, .047, 2.62, ambient);
      }
    }

    // Low strips give the rider a usable path beneath the full-width reflections.
    for (let stripe = 0; stripe < 6; stripe++) {
      const z = -(stripe + .55) * bayLength / 6;
      for (const x of [-2.06, 2.06]) place.add(deck, x, .026, z, .085, .018, 2.75, 0x8fa69e);
    }
    if ([2, 5, 10, 13].includes(index)) {
      const z = -11.25;
      place.add(shell, 0, 5.72, z, 35.6, .49, 2.82, 0x69848b);
      for (const edge of [-1, 1]) {
        place.add(supports, 0, 6.81, z + edge * 1.13, 35.1, .08, .09, 0x92a5af);
        place.add(light, 0, 5.47, z + edge * 1.05, 31.25, .043, .075, ambient);
        for (let x = -16; x < 17; x += 3.2) place.add(supports, x, 6.36, z + edge * 1.16, .10, .95, .14, 0x78949b);
        place.add(concrete, edge * 13.41, 3.13, z, .80, 5.0, .66, 0x70838b);
      }
    }
    if (index === 0 || index === 6 || index === bayCount - 2) {
      const zone = index === 0 ? 0 : index === 6 ? 1 : 2;
      const sign = new THREE.Mesh(signPlane, signFaces[zone]);
      const z = index === 0 ? -26.25 : -7.35;
      sign.position.set(0, 5.5, z);
      sign.scale.set(9.2, 2.3, 1);
      section.add(sign);
      place.add(supports, 0, 5.5, z - .18, 9.35, 2.4, .34, 0x516369);
      place.add(supports, 0, 7.05, z - .18, .20, .99, .26, 0x697b84);
    }
    place.finish();
    return section;
  });

  const exit = batches(station);
  const portal = -(routeLength - maglevStart + 12);
  exit.add(concrete, 0, 4.8, portal - 13.5, 14.8, 8.4, .85, 0x304951);
  exit.add(concrete, 0, 7.75, portal, 35, 1.73, 2.1, 0x546571);
  for (const side of [-1, 1]) {
    exit.add(concrete, side * 12.42, 3.71, portal, 10.5, 7.44, 2.1, 0x60737c);
    exit.add(light, side * 7.04, 3.25, portal + 1.1, .15, 5.87, .093, 0xffba72);
  }
  exit.finish();

  function update(distance, time, still) {
    station.visible = distance > maglevStart - 68;
    if (!station.visible) return;
    water.uniforms.clock.value = still ? 0 : time;
    const journey = distance - maglevStart;
    for (const [index, bay] of bays.entries()) {
      bay.visible = index * bayLength - journey < (compact ? 142 : 186) && (index + 1) * bayLength > journey - 28;
    }
  }

  station.visible = false;
  return { update };
}
