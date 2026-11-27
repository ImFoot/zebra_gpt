import * as THREE from 'three';
import { batches } from './city.js';
import { environmentBatch } from './environment-kit.js';
import { maglevStart, nextDistricts, routeAt, runnerLanes, stages, tunnelStart } from './route.js';

const cellSize = 48;
const plane = new THREE.PlaneGeometry();
const cylinder = new THREE.CylinderGeometry(1, 1, 1, 20);
const coil = new THREE.TorusGeometry(1, .055, 9, 42);
const arch = new THREE.TorusGeometry(1, .036, 10, 44, Math.PI);
const sculpture = new THREE.TorusKnotGeometry(1, .30, 74, 11, 2, 3);
const frame = new THREE.MeshStandardMaterial({ metalness: .66, roughness: .42 });
const black = new THREE.MeshStandardMaterial({ color: 0x142127, metalness: .57, roughness: .45 });
const light = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
const coolant = new THREE.MeshPhysicalMaterial({ color: 0x264556, roughness: .15, metalness: .54, clearcoat: .8 });
const gold = new THREE.MeshStandardMaterial({ color: 0xba976b, metalness: .74, roughness: .27 });
const chrome = new THREE.MeshStandardMaterial({ color: 0x929fa9, metalness: .72, roughness: .27 });
const captions = {
  subway: ['TRANSIT INSPECTION', 'SERVICE LINE 09 · INSPECTION EXERCISE IN PROGRESS'],
  ghostline: ['GHOSTLINE RELAY', 'HUMAN VERIFICATION LOOP · EXIT'],
  spillway: ['NEON SPILLWAY', 'PRACTICAL EFFECTS DEPARTMENT · HAZARD PAY PENDING'],
  museum: ['MUSEUM OF EVERYTHING', 'INFINITE EDITION · PLEASE KEEP MOVING'],
  factory: ['ARTIFICIAL SUFFERING', 'ENGAGEMENT DIVISION · EMERGENCY SHIFT'],
  grid: ['FINAL DRAFT GRID', 'NO CHANGES AFTER EXPORT'],
};

function mapped(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'));
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

function panel(group, material, x, y, z, w, h, yaw = 0) {
  return object(group, plane, material, x, y, z, w, h, 1, yaw);
}

function object(group, geometry, material, x, y, z, w, h, d, yaw = 0) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(w, h, d);
  mesh.rotation.y = yaw;
  group.add(mesh);
  return mesh;
}

function stationBoard(stage, title, sub) {
  const css = '#' + new THREE.Color(stage.lamp).getHexString();
  const map = mapped(896, 204, (ctx) => {
    ctx.fillStyle = '#071016';
    ctx.fillRect(0, 0, 896, 204);
    ctx.strokeStyle = css + '70';
    ctx.strokeRect(5, 5, 886, 194);
    ctx.fillStyle = css;
    ctx.fillRect(25, 33, 9, 134);
    ctx.font = '700 25px monospace';
    ctx.fillText(sub, 56, 65, 807);
    ctx.font = '900 78px sans-serif';
    ctx.fillText(title, 53, 154, 804);
  });
  return new THREE.MeshBasicMaterial({ map, toneMapped: false });
}

function displayArt() {
  const editions = [
    ['THE HUMAN TOUCH', '#ee6e59', '#16364e'],
    ['SORRY YOU FELT THAT', '#f8c471', '#342247'],
    ['UNTITLED (FINAL_FINAL)', '#78ced3', '#593131'],
  ];
  return editions.map(([title, a, b], take) => {
    const map = mapped(640, 400, (ctx) => {
      const tone = ctx.createLinearGradient(0, 0, 640, 400);
      tone.addColorStop(0, b);
      tone.addColorStop(1, '#0c1423');
      ctx.fillStyle = tone;
      ctx.fillRect(0, 0, 640, 400);
      for (let mark = 0; mark < 92; mark++) {
        const ang = mark * .238 + take * 2.08;
        const step = 28 + mark * 2.47;
        ctx.strokeStyle = mark % 8 ? a + '69' : '#ffedcdb8';
        ctx.lineWidth = 1 + (mark % 5) * .8;
        ctx.beginPath();
        ctx.ellipse(320 + Math.sin(ang + .2) * 60, 168 + Math.cos(ang) * 33, step, step * .38, ang, 0, Math.PI * 1.6);
        ctx.stroke();
      }
      ctx.fillStyle = '#121922';
      ctx.fillRect(0, 328, 640, 72);
      ctx.fillStyle = '#fff1d6';
      ctx.font = '700 27px monospace';
      ctx.fillText(title, 26, 373);
    });
    return new THREE.MeshBasicMaterial({ map, toneMapped: false });
  });
}

const animatedVertex = /* glsl */ `
  varying vec2 art;
  varying vec3 land;
  #include <fog_pars_vertex>
  void main() {
    art = uv;
    land = (modelMatrix * vec4(position, 1.0)).xyz;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const codeFragment = /* glsl */ `
  uniform float time;
  uniform sampler2D glyphs;
  varying vec2 art;
  #include <fog_pars_fragment>
  float hash(float n) { return fract(sin(n * 51.817) * 23190.9387); }
  void main() {
    float column = floor(art.x * 30.0);
    float rate = hash(column + 32.0);
    float shift = time * (2.3 + rate * 8.9);
    vec2 p = vec2(art.x * 30.0, art.y * 23.0 + shift);
    float row = floor(p.y);
    float code = floor(hash(column * 41.0 + row * 7.0) * 24.0);
    vec2 cell = fract(p);
    float ink = texture2D(glyphs, vec2((code + cell.x) / 24.0, cell.y)).a;
    float train = fract((row + hash(column + 63.0) * 57.0) / (8.0 + rate * 7.0));
    float tail = train * train * step(.18, train);
    vec3 hue = mix(vec3(.02, .56, .30), vec3(.64, 1.0, .58), smoothstep(.91, 1.0, train));
    float fade = smoothstep(.0, .1, art.y) * (1.0 - smoothstep(.91, 1.0, art.y));
    gl_FragColor = vec4(hue, fade * (.026 + ink * tail * .76));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

const fieldFragment = /* glsl */ `
  uniform vec3 glow;
  uniform float time;
  uniform float grid;
  varying vec2 art;
  varying vec3 land;
  #include <fog_pars_fragment>
  void main() {
    vec2 p = land.xz;
    float s = sin(p.x * 1.27 + p.y * .58 + time * 1.9);
    float l = sin(p.y * 3.13 - p.x * 1.85 + s * 2.04 + time * 2.74);
    float waves = sin(p.y * 1.21 + p.x * 2.41 + l * .74 - time * 1.31);
    float bands = pow(max(0.0, .5 + .35 * l + .15 * waves), 7.0);
    vec2 cell = abs(fract(p * vec2(.50, .20)) - .5);
    vec2 px = max(vec2(.008), fwidth(p * vec2(.50, .20)));
    float trace = max(smoothstep(.48 - px.x, .49 + px.x, cell.x), smoothstep(.48 - px.y, .49 + px.y, cell.y));
    float pulse = .42 + .56 * pow(max(0.0, sin(p.y * .058 + time * 1.4)), 8.0);
    float edge = smoothstep(.0, .23, art.x) * (1.0 - smoothstep(.77, 1.0, art.x));
    vec3 base = mix(vec3(.013, .017, .041), vec3(.007, .014, .032), grid);
    float reflectance = mix(edge * (.035 + .27 * bands) * (.54 + .46 * s), trace * pulse * .24, grid);
    gl_FragColor = vec4(base + glow * reflectance, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

function animated(fragmentShader, uniforms, transparent = false) {
  return new THREE.ShaderMaterial({
    vertexShader: animatedVertex, fragmentShader,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { time: { value: 0 }, ...uniforms }]),
    fog: true, side: transparent ? THREE.DoubleSide : THREE.FrontSide,
    transparent, depthWrite: !transparent, blending: transparent ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
}

function floor(group, material, x, width, length, y = -.006) {
  panel(group, material, x, y, 0, width, length).rotation.x = -Math.PI / 2;
}

export function makeCourseScenery(scene, kit, compact) {
  const concrete = new THREE.MeshStandardMaterial({
    ...kit.courseConcrete, roughness: .73, color: 0x90a0ae, normalScale: new THREE.Vector2(.64, .64),
  });
  const iron = new THREE.MeshStandardMaterial({
    ...kit.courseIron, roughness: .55, metalness: .37, color: 0x8b9da9, normalScale: new THREE.Vector2(.56, .56),
  });
  const marble = new THREE.MeshPhysicalMaterial({
    ...kit.courseMarble, roughness: .70, color: 0xc8c5d0, metalness: .045, clearcoat: .26, clearcoatRoughness: .58,
    normalScale: new THREE.Vector2(.30, .30),
  });
  const asphalt = new THREE.MeshStandardMaterial({ ...kit.asphalt, roughness: .67, color: 0x6e767d, metalness: .15 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x152a33, metalness: .58, roughness: .20, clearcoat: .73 });
  const atlas = mapped(768, 40, (ctx) => {
    ctx.font = '700 29px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    [...'01∆∑◌⌘λΨ03≠×§πGEO78Π:▷∠L'].slice(0, 24).forEach((char, index) => ctx.fillText(char, 16 + index * 32, 30));
  });
  const code = animated(codeFragment, { glyphs: { value: atlas } }, true);
  const stream = animated(fieldFragment, { glow: { value: new THREE.Color(0xff468d) }, grid: { value: 0 } });
  const grid = animated(fieldFragment, { glow: { value: new THREE.Color(0x53b9ff) }, grid: { value: 1 } });
  const steamMap = mapped(128, 128, (ctx) => {
    const gradient = ctx.createRadialGradient(64, 64, 9, 64, 64, 62);
    gradient.addColorStop(0, '#fff9');
    gradient.addColorStop(.48, '#fff3');
    gradient.addColorStop(1, '#fff0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
  });
  const steam = new THREE.SpriteMaterial({ map: steamMap, color: 0xf9a680, transparent: true, depthWrite: false, opacity: .32 });
  const art = displayArt();
  const subway = stages.find((stage) => stage.id === 'subway');
  const segments = [{ ...subway, length: maglevStart - tunnelStart }, ...nextDistricts];
  const signs = new Map(segments.map((stage) => [stage.id, stationBoard(stage, ...captions[stage.id])]));
  const spillwayStage = nextDistricts.find((stage) => stage.id === 'spillway');
  const rooftopBoards = [
    stationBoard(spillwayStage, 'COLLATERAL', 'PRACTICAL EXPLOSIONS · WHOLESALE'),
    stationBoard({ lamp: spillwayStage.accent }, 'IT WAS LIKE THAT', 'NEON SPILLWAY · PUBLIC LIABILITY OFFICE'),
  ];
  const gridStage = nextDistricts.find((stage) => stage.id === 'grid');
  const archLight = new THREE.MeshBasicMaterial({ color: new THREE.Color(gridStage.lamp).multiplyScalar(1.7), toneMapped: false });
  const tracks = [];
  const visible = new Map();

  function subwaySet(group, batch, z, index, stage) {
    const concourse = index < 9;
    const work = index >= 9 && index < 24;
    const lamp = concourse ? 0xb2f9d3 : work ? 0xffb16a : 0xf88675;
    for (const lane of runnerLanes) {
      for (const side of [-1, 1]) batch.add(frame, lane + side * .832, .036, z, .069, .064, 12, 0x6a7a7b);
      for (let tie = 0; tie < 7; tie++) batch.add(black, lane, .013, z - 5.1 + tie * 1.7, 1.97, .022, .18);
    }
    for (const side of [-1, 1]) {
      const x = side * 6.77;
      batch.add(concourse ? concrete : iron, x, 2.46, z, .345, 4.75, 12, concourse ? 0xa1aea5 : 0x82929b);
      batch.add(frame, side * 6.51, 2.74, z, .14, 5.25, .44, 0x73888f);
      batch.add(black, side * 6.76, 3.1, z - 3.47, .29, 3.68, 2.95);
      batch.add(light, side * 6.46, 3.7, z - 3.47, .036, .035, 2.64, lamp);
      batch.add(light, side * 6.42, 5.16, z, .058, .076, 8.11, lamp);
      batch.add(frame, side * 6.33, 4.93, z, .24, .37, 12, 0x3b4c51);
      batch.add(glass, side * 6.55, 1.98, z + 3.38, .22, 2.1, 1.96);
      batch.add(black, side * 6.24, .42, z + 3.37, .55, .81, 2.09);
      if (index % 4 === 0) panel(group, signs.get(stage.id), side * 6.32, 2.37, z + 3.47, 1.92, .61, -side * Math.PI / 2);
      if (work) object(group, cylinder, chrome, side * 6.18, 4.37, z, .145, 12, .145).rotation.x = Math.PI / 2;
      batch.add(frame, side * 5.89, .039, z, .097, .073, 12, 0x4a4b48);
      batch.add(frame, side * 5.01, .031, z, .09, .059, 12, 0x343f43);
      batch.add(concrete, side * 6.45, .092, z, .89, .172, 12, 0x66726f);
      for (let sleeper = 0; sleeper < 6; sleeper++) {
        batch.add(black, side * 5.44, .012, z - 5 + sleeper * 2, 1.16, .024, .26);
      }
    }
    batch.add(frame, 0, 5.36, z - 4, 13.1, .38, .48, 0x4f5e53);
    batch.add(light, 0, 5.16, z - 4, 9.64, .041, .19, lamp);
  }

  function ghostline(group, batch, z, index, stage) {
    const gallery = index % 6 >= 3;
    for (const side of [-1, 1]) {
      batch.add(black, side * 9.3, 1.15, z, 3.05, 2.33, 11.7);
      batch.add(gallery ? glass : iron, side * (gallery ? 12.13 : 10.74), 6, z, .68, 11.3, 10.9, 0x415957);
      batch.add(frame, side * 7.7, 5.03, z, .60, 10.02, .68, 0x597469);
      batch.add(light, side * 7.40, 5.33, z + .36, .055, 9.8, .039, stage.lamp);
      batch.add(light, side * 7.93, .096, z, .08, .08, 10.9, stage.accent);
      batch.add(glass, side * 8.47, 4.77, z - 4.1, .26, 7.22, 2.1);
      const curtain = panel(group, code, side * 8.10, 4.75, z + 1.45, 9.2, 8.6, -side * 1.21);
      curtain.renderOrder = 3;
      for (let shelf = 0; shelf < 5; shelf++) {
        batch.add(frame, side * 9.05, 1.65 + 1.58 * shelf, z - 4.26, .72, .15, 2.71, 0x4c615a);
        batch.add(light, side * 8.67, 1.77 + 1.58 * shelf, z - 4.26, .034, .035, 2.40, shelf % 2 ? stage.accent : stage.lamp);
      }
    }
    batch.add(black, 0, 8.04, z, 15.98, .55, .65);
    batch.add(light, 0, 7.79, z + .34, 15.53, .04, .03, stage.lamp);
    batch.add(frame, 0, 7.73, z - .47, 15.5, .19, .32, 0x516963);
    if (gallery && index % 3 === 0) {
      batch.add(glass, 0, 8.57, z - 2.22, 18.7, 1.98, 3.41);
      batch.add(light, 0, 7.59, z - .50, 18.2, .034, .040, stage.accent);
    }
  }

  function spillway(group, batch, catalog, z, index, stage) {
    for (const side of [-1, 1]) {
      const block = index + (side > 0 ? 2 : 0);
      const levels = 3 + (block * 11 % 6);
      const tower = 17.25 + (block % 4) * 1.44;
      batch.add(concrete, side * 7.62, -.24, z, .31, .47, 11.98, 0x777188);
      batch.add(black, side * 7.67, .42, z, .18, .084, 11.96);
      batch.add(light, side * 7.73, .45, z, .03, .038, 11.96, side > 0 ? stage.lamp : stage.accent);
      batch.add(concrete, side * 15.18, -.87, z, 2.5, 2.73, 11.98, 0x898796);
      batch.add(frame, side * 15.3, 1.87, z, .66, 3.66, .84, 0x654a58);
      batch.add(iron, side * 16.25, 1.07, z - 1.91, .38, 2.97, 11.99, 0x414763);
      batch.add(light, side * 14.97, 1.92, z + .44, .039, 3.42, .039, stage.lamp);
      batch.add(light, side * 14.71, 1.06, z - 2.04, .057, .133, 5.4, stage.accent);
      const angle = -side * Math.PI / 2;
      const height = levels * 3 + .23;
      batch.add(concrete, side * (tower + 4.98), height * .5 + .78, z, 9.8, height, 11.99, block % 3 ? 0x635768 : 0x54647a);
      catalog.add(kit.catalog.DowntownEntry, side * tower, 2.14, z, angle, 1.29, 1, .85, 0xb994ae);
      for (let level = 1; level < Math.min(levels, compact ? 4 : 7); level++) {
        catalog.add(kit.catalog.DowntownUpper, side * tower, 2.14 + level * 3, z, angle, 1.29, 1, .85, 0xbda2b5);
      }
      batch.add(light, side * (tower - .045), 5.16, z, .059, .07, 9.5, block % 2 ? stage.lamp : stage.accent);
      if (block % 3 === 0) {
        batch.add(frame, side * (tower - .45), 7.18, z, .80, 2.11, 6.9, 0x53475c);
        panel(group, rooftopBoards[block % 2], side * (tower - .88), 7.18, z, 6.7, 1.89, angle);
        batch.add(light, side * (tower - .907), 6.23, z, .043, .054, 6.52, stage.lamp);
      }
    }
    if (index % 6 === 2) {
      batch.add(glass, 0, 9.2, z - 2.27, 31.94, 1.82, 3.60);
      batch.add(frame, 0, 8.20, z - 2.27, 32.0, .41, 3.68, 0x6e536d);
      batch.add(light, 0, 8.02, z - .41, 31, .054, .052, stage.lamp);
      batch.add(light, 0, 9.81, z - .46, 30.3, .03, .024, stage.accent);
    }
  }

  function museum(group, batch, z, index, stage) {
    for (const side of [-1, 1]) {
      batch.add(marble, side * 12.4, 4.48, z, .83, 8.9, 11.99, 0xccbac9);
      batch.add(marble, side * 8.7, 3.69, z + 3.63, .72, 7.35, .70, 0xeddacd);
      batch.add(gold, side * 8.7, 7.34, z + 3.63, 1.03, .24, 1.04);
      batch.add(gold, side * 8.7, .13, z + 3.63, 1.00, .27, 1);
      batch.add(black, side * 11.67, 3.76, z, .34, 3.81, 6.35);
      batch.add(gold, side * 11.47, 3.76, z, .095, 3.69, 6.15);
      panel(group, art[(index + Number(side > 0)) % art.length], side * 11.40, 3.76, z, 5.98, 3.57, -side * Math.PI / 2);
      batch.add(light, side * 11.28, 5.72, z, .073, .071, 5.55, stage.lamp);
      batch.add(marble, side * 7.22, .60, z - 3.72, 1.27, 1.2, 1.33, 0xb7aab7);
      if (index % (compact ? 3 : 2) === 0) {
        const exhibit = object(group, sculpture, side > 0 ? gold : chrome, side * 7.22, 1.91, z - 3.72, .51, .55, .51, index * .3);
        if (index % 4 === 0) exhibit.rotation.x = .87;
      }
      batch.add(light, side * 8.1, 7.3, z, .12, .12, 6.7, stage.accent);
    }
    batch.add(frame, 0, 7.65, z + 3.63, 18.1, .38, .53, 0x817f90);
    batch.add(light, 0, 7.43, z + 3.36, 16.7, .066, .06, stage.lamp);
    if (index % 4 === 1) {
      batch.add(glass, 0, 8.12, z - 1.85, 16.9, .15, 6.9);
      batch.add(gold, 0, 8.0, z - 1.85, 17.2, .13, .14);
    }
  }

  function factory(group, batch, z, index, stage, moving) {
    for (const side of [-1, 1]) {
      batch.add(iron, side * 12.76, 6.3, z, .79, 12.6, 11.99, 0x897870);
      batch.add(frame, side * 9.38, 5.3, z + 3.58, 1.26, 10.6, .83, 0x735144);
      batch.add(black, side * 8.1, .32, z, .69, .64, 11.96);
      batch.add(light, side * 7.74, .51, z, .061, .10, 11.9, stage.lamp);
      batch.add(black, side * 10.9, 2.05, z - 2.19, 2.43, 4.1, 4.33);
      for (let bar = 0; bar < 5; bar++) {
        batch.add(light, side * 9.66, 1.23 + bar * .32, z - 2.19, .032, .11, 3.88, bar % 2 ? 0xff6244 : 0xffa45f);
        batch.add(iron, side * 9.56, 1.35 + bar * .32, z - 2.19, .23, .095, 4.16, 0x74716a);
      }
      if (index % (compact ? 2 : 1) === 0) {
        object(group, cylinder, chrome, side * 8.87, 5.89, z, .234, 12, .234).rotation.x = Math.PI / 2;
        object(group, cylinder, coolant, side * 9.02, 6.62, z, .305, 12, .305).rotation.x = Math.PI / 2;
      }
      if (index % 2 === 0) {
        object(group, cylinder, chrome, side * 7.57, 6.92, z - 2.5, .40, 2.6, .4);
        const piston = object(group, cylinder, coolant, side * 7.57, 5.40, z - 2.5, .23, 2.7, .23);
        moving.push({ mesh: piston, y: 5.4, phase: index + side, amount: .76 });
        const cloud = new THREE.Sprite(steam);
        cloud.position.set(side * 8.17, 2.9, z - 3.48);
        cloud.scale.set(4.2, 2.8, 1);
        group.add(cloud);
        moving.push({ mesh: cloud, y: 2.9, phase: index + side * 2.1, amount: .92 });
      }
    }
    batch.add(frame, 0, 8.48, z + 3.58, 19.0, .53, .93, 0x584137);
    batch.add(light, 0, 8.16, z + 4.07, 17.2, .045, .044, stage.accent);
  }

  function finalGrid(group, batch, z, index, stage, moving) {
    for (const side of [-1, 1]) {
      batch.add(black, side * 7.2, -.265, z, .35, .56, 11.91);
      batch.add(light, side * 7.195, .026, z, .062, .051, 11.8, stage.lamp);
      batch.add(light, side * 6.9, .020, z - 4.03, .050, .04, 3.9, stage.accent);
      batch.add(coolant, side * (10.12 + index % 3 * 2.22), 5.42, z, 1.12, 15.08, 1.98);
      batch.add(light, side * (9.54 + index % 3 * 2.22), 5.38, z + 1.007, .026, 14.9, .024, stage.lamp);
      batch.add(light, side * 12.4, 8.32 + (index % 3) * 2.41, z, .049, .045, 11.99, stage.accent);
      if (index % 3 === 1) {
        const glyph = object(group, coil, chrome, side * 12.38, 5.86, z, 2.2, 2.2, 2.2, -side * .55);
        moving.push({ mesh: glyph, y: 5.86, phase: index + side, amount: 1.12 });
        object(group, coil, archLight, side * 12.38, 5.86, z, 1.74, 1.74, 1.74, -side * .55);
      }
    }
    if (index % 4 === 0) {
      batch.add(black, 0, 6.89, z, 16.0, .57, 1.48);
      batch.add(light, 0, 6.58, z + .74, 15.65, .039, .041, stage.lamp);
      batch.add(light, 0, 7.16, z + .74, 15.65, .043, .041, stage.accent);
    }
    if (index % 9 === 4) {
      object(group, arch, coolant, 0, 2.0, z - 1.32, 8.76, 7.81, 5.2);
      object(group, arch, archLight, 0, 2.0, z - .85, 8.68, 7.67, .8);
    }
  }

  function makeCell(stage, start, length) {
    const group = new THREE.Group();
    group.name = `${stage.name} / ${Math.round(start - stage.at)} m`;
    routeAt(start + length / 2, 0, 0, group.position);
    const batch = batches(group);
    const catalog = environmentBatch(group);
    const moving = [];
    if (stage.id !== 'subway') {
      const deck = stage.id === 'grid' ? grid : stage.id === 'museum' ? marble : asphalt;
      floor(group, deck, 0, 15.45, length, -.006);
      if (stage.id === 'museum') {
        floor(group, marble, -9.54, 4.90, length, -.006);
        floor(group, marble, 9.54, 4.90, length, -.006);
      }
      if (stage.id === 'spillway') {
        floor(group, stream, -11.18, 7.26, length, -.48);
        floor(group, stream, 11.18, 7.26, length, -.48);
      }
      for (const side of [-1, 1]) for (let z = length / 2 - 2.2; z > -length / 2; z -= 8) {
        batch.add(light, side * 5.68, .019, z, .042, .014, 1.8, stage.id === 'museum' ? 0xd3b99a : stage.lamp);
      }
    }
    const first = Math.floor((start - stage.at) / 12);
    for (let z = length / 2 - 6, index = first; z >= -length / 2 + 5.9; z -= 12, index++) {
      if (stage.id === 'subway') subwaySet(group, batch, z, index, stage);
      if (stage.id === 'ghostline') ghostline(group, batch, z, index, stage);
      if (stage.id === 'spillway') spillway(group, batch, catalog, z, index, stage);
      if (stage.id === 'museum') museum(group, batch, z, index, stage);
      if (stage.id === 'factory') factory(group, batch, z, index, stage, moving);
      if (stage.id === 'grid') finalGrid(group, batch, z, index, stage, moving);
    }
    if (first === 0 || (stage.id === 'grid' && start + length >= stage.at + stage.length)) {
      const z = first === 0 ? length / 2 - 16 : -length / 2 + 18;
      const y = stage.id === 'subway' ? 4.64 : 5.54;
      batch.add(frame, 0, y, z - .14, 7.62, 1.81, .31, 0x4c525f);
      batch.add(light, 0, y - .95, z - .06, 7.61, .048, .10, stage.lamp);
      panel(group, signs.get(stage.id), 0, y, z + .04, 7.46, 1.70);
    }
    batch.finish();
    catalog.finish();
    scene.add(group);
    return { group, moving, start, end: start + length };
  }

  for (const stage of segments) for (let offset = 0; offset < stage.length; offset += cellSize) {
    tracks.push({ stage, start: stage.at + offset, length: Math.min(cellSize, stage.length - offset) });
  }

  function update(distance, time, still) {
    const now = still ? 0 : time;
    code.uniforms.time.value = stream.uniforms.time.value = grid.uniforms.time.value = now;
    const ahead = compact ? 126 : 168;
    for (const [piece, cell] of visible) {
      if (cell.end >= distance - 45 && cell.start < distance + ahead + 35) continue;
      cell.group.removeFromParent();
      cell.group.traverse((child) => { if (child.isInstancedMesh) child.dispose(); });
      visible.delete(piece);
    }
    for (const piece of tracks) {
      if (piece.start > distance + ahead || piece.start + piece.length < distance - 28) continue;
      if (!visible.has(piece)) visible.set(piece, makeCell(piece.stage, piece.start, piece.length));
    }
    for (const cell of visible.values()) for (const { mesh, y, phase, amount } of cell.moving) {
      mesh.position.y = y + Math.sin(now * 1.76 + phase) * amount;
    }
  }
  return { update };
}
