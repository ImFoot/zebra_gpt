import * as THREE from 'three';
import { mesh, placard, span } from './scenery-parts.js';
import { towerWindows } from './outer-districts.js';

const pane = new THREE.PlaneGeometry();
const canopy = new THREE.PlaneGeometry(2, 1, 28);
const canopyVertices = canopy.getAttribute('position');
for (let index = 0; index < canopyVertices.count; index++) {
  const angle = (1 - canopyVertices.getX(index)) * Math.PI / 2;
  canopyVertices.setXYZ(index, Math.cos(angle), Math.sin(angle), canopyVertices.getY(index));
}
const ball = new THREE.SphereGeometry(1, 22, 14);
const bell = new THREE.SphereGeometry(1, 22, 12, 0, Math.PI * 2, 0, Math.PI * .55);
const rim = new THREE.TorusGeometry(1, .067, 9, 34);
const arch = new THREE.TorusGeometry(1, .040, 9, 48, Math.PI);
function causticWater(overhead = 0) {
  return new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { time: { value: 0 }, overhead: { value: overhead } }]),
    vertexShader: /* glsl */ `
      varying vec2 surface;
      varying vec3 world;
      #include <fog_pars_vertex>
      void main() {
        surface = uv;
        world = (modelMatrix * vec4(position, 1.0)).xyz;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float time;
      uniform float overhead;
      varying vec2 surface;
      varying vec3 world;
      #include <fog_pars_fragment>
      void main() {
        vec2 p = vec2(world.z, mix(world.y, world.x * .67, overhead));
        float u = sin(p.x * .95 - p.y * 1.7 + .79 * time + sin(p.x * .32 + time) * 1.65);
        float v = sin(p.x * 1.21 + p.y * 2.03 - time * .70 + sin(p.x * .21 - p.y * .84) * 1.23);
        float glint = exp(-abs(u * .58 + v * .42) * 7.5);
        float shaft = .5 + .5 * sin(p.x * .215 + p.y * .39 + time * .40 + sin(p.x * .084 - time * .14));
        float glow = mix(smoothstep(.05, .87, surface.y), .54 + .21 * sin(surface.x * 3.14159), overhead);
        vec3 deep = mix(vec3(.007, .027, .069), vec3(.017, .165, .248), glow);
        vec3 color = deep + vec3(.033, .36, .53) * glow * (.22 + shaft * shaft * .75) * (.33 + glint * .67);
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
  });
}

function makeTendrils() {
  const coordinates = [];
  for (let filament = 0; filament < 10; filament++) {
    const heading = filament * Math.PI * .2;
    const extent = .72 + (filament % 5) * .17;
    const point = (t) => [
      Math.cos(heading) * (.64 + .14 * Math.sin(t * 6 + heading)),
      -extent * t,
      Math.sin(heading) * (.62 + .22 * Math.sin(t * 7 - heading)),
    ];
    for (let segment = 0; segment < 11; segment++) {
      coordinates.push(...point(segment / 11), ...point((segment + 1) / 11));
    }
  }
  return new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(coordinates, 3));
}

export function makeNewDistrictScenery(kit, compact, { concrete, iron, frame, black, light, glass }) {
  const water = causticWater();
  const ceiling = causticWater(1);
  const window = new THREE.MeshPhysicalMaterial({ color: 0x6cd4ec, transparent: true, opacity: .105, depthWrite: false, roughness: .22, metalness: .23 });
  const seaLight = new THREE.MeshBasicMaterial({ color: 0x68e7fb, toneMapped: false });
  const seaCore = new THREE.MeshPhysicalMaterial({ color: 0x5dcde9, emissive: 0x5ebfff, emissiveIntensity: .48,
    opacity: .66, transparent: true, depthWrite: false, roughness: .25, metalness: .16 });
  const seaThreads = new THREE.LineBasicMaterial({ color: 0xa99dff, transparent: true, opacity: .61 });
  const tendrils = makeTendrils();
  const salvage = new THREE.MeshStandardMaterial({ ...kit.courseIron, color: 0x79635b, metalness: .51, roughness: .54 });
  const alloy = new THREE.MeshPhysicalMaterial({ color: 0x69909a, metalness: .69, roughness: .30, clearcoat: .58 });
  const copper = new THREE.MeshPhysicalMaterial({ color: 0xa66348, metalness: .68, roughness: .43, clearcoat: .29 });
  const ember = new THREE.MeshBasicMaterial({ color: 0xffac62, toneMapped: false });
  const mint = new THREE.MeshBasicMaterial({ color: 0x66efbf, toneMapped: false });
  const lacquer = new THREE.MeshStandardMaterial({ color: 0x364050, metalness: .64, roughness: .44 });
  const fabric = new THREE.MeshStandardMaterial({ color: 0x963e80, roughness: .80, side: THREE.DoubleSide });
  const violet = new THREE.MeshBasicMaterial({ color: 0xff8aeb, toneMapped: false });
  const sunriseFacade = towerWindows(true);
  const signs = {
    market: placard('RAINMARKET', 'WEATHER INCLUDED IN RENT', '#fad2f9', '#311d43'),
    repair: placard('PROMPT REPAIR', 'SAME-DAY REGRETS', '#ffdca3', '#302039'),
    noodles: placard('NOODLES.exe', 'CONTAINS ACTUAL NOODLES', '#ffd3e8', '#6d213f'),
    weather: placard('CLOUD SERVICE', 'NOW WITH MORE CLOUD', '#b8f5f5', '#24505e'),
    recall: placard('RECALL BAY', 'SENTIENCE IS NONREFUNDABLE', '#ffcc8c', '#292228'),
    bar: placard('RUSTY HORSESHOE', 'OPEN AFTER THE END', '#ffcd86', '#2b2720'),
    live: placard('LIVE POETRY', 'KEVIN  /  TWO DRINK MINIMUM', '#98ebcd', '#152c2c'),
  };

  function aquarium(group, batch, catalog, z, index, stage, moving) {
    mesh(group, canopy, ceiling, 0, 6.48, z, 9.02, 3.22, 12.04);
    for (const side of [-1, 1]) {
      const face = -side * Math.PI / 2;
      const paneX = side * 8.85;
      mesh(group, pane, water, side * 24, 3.7, z, 12.02, 19.6, 1, face);
      mesh(group, pane, window, paneX, 3.93, z, 11.85, 5.12, 1, face);
      batch.add(frame, paneX, .62, z, .47, 1.21, 12, 0x3a6272);
      batch.add(frame, paneX, 6.60, z, .37, .35, 12, 0x61858d);
      batch.add(frame, paneX, 3.89, z + 5.9, .49, 5.66, .39, 0x3d7e91);
      batch.add(light, side * 8.62, 1.24, z, .047, .044, 11.89, stage.lamp);
      batch.add(light, side * 8.66, 6.37, z, .052, .036, 11.97, stage.accent);
      batch.add(black, side * 7.57, .24, z, .39, .47, 11.97);
      batch.add(light, side * 7.43, .49, z, .057, .049, 11.97, stage.lamp);
      if ((index + Number(side > 0)) % (compact ? 3 : 2) === 0) {
        const jelly = new THREE.Group();
        const height = 2.9 + (index % 4) * 1.59;
        jelly.position.set(side * (12.7 + index % 5), height, z - 1.7);
        jelly.scale.setScalar(1.1 + (index % 5) * .17);
        mesh(jelly, bell, seaCore, 0, 0, 0, 1.01, .56, .88);
        mesh(jelly, rim, seaLight, 0, 0, 0, .92, .84, .19).rotation.x = Math.PI / 2;
        const filaments = new THREE.LineSegments(tendrils, seaThreads);
        filaments.position.y = -.12;
        jelly.add(filaments);
        group.add(jelly);
        moving.push({ mesh: jelly, y: height, phase: index * .43 + side, amount: .46 });
      }
      for (let p = 0; p < 2; p++) {
        const x = side * (12 + p * 2.2);
        batch.add(concrete, x, -2.2, z - 2.8 * p, 2.66, 2.59 + index % 3, 2.9, 0x3c6677, side * .42);
      }
    }
    if (index % (compact ? 2 : 1) === 0) {
      mesh(group, arch, frame, 0, 1.04, z + 5.64, 8.98, 6.89, 3.4);
      mesh(group, arch, seaLight, 0, 1.03, z + 5.77, 8.79, 6.68, .56);
    }
  }

  function rainmarket(group, batch, catalog, z, index, stage) {
    for (const side of [-1, 1]) {
      const block = index + (side > 0 ? 2 : 0);
      const yaw = -side * Math.PI / 2;
      const facade = 10.25 + .8 * (block % 3);
      const level = 2 + block * 7 % 5;
      const tint = block % 2 ? 0xb191bd : 0xc1989f;
      batch.add(concrete, side * (facade + 3.16), level * 1.5, z, 6.26, 3 * level, 11.99, 0x4d5367);
      catalog.add(kit.catalog.DowntownEntry, side * facade, .35, z, yaw, 1.26, 1.02, 1, tint);
      for (let floor = 1; floor < Math.min(level, compact ? 4 : 6); floor++) {
        catalog.add(kit.catalog.DowntownUpper, side * facade, .35 + floor * 3, z, yaw, 1.26, 1, 1, tint);
      }
      batch.add(iron, side * 8.78, .26, z, 2.06, .51, 11.98, 0x74748f);
      batch.add(lacquer, side * 8.0, 3.14, z, 2.57, .14, 10.85, 0x71526e);
      batch.add(light, side * 6.79, 3.07, z + .017, .044, .061, 10.82, block % 2 ? stage.accent : stage.lamp);
      batch.add(lacquer, side * 9.22, 3.71, z - .04, .21, .83, 6.01, 0x746180);
      const marquee = [signs.market, signs.noodles, signs.repair, signs.weather][block % 4];
      mesh(group, pane, marquee, side * 9.06, 3.72, z, 5.83, .70, 1, yaw);
      catalog.add(kit.clutter['aircon'], side * (facade - .24), .55, z - 3.7, yaw, 1.28, 1.28, 1.28, 0x967fa6);
      if (block % 3 !== 2) {
        const shade = mesh(group, pane, fabric, side * 8.40, 2.99, z - .05, 4.72, 2.62, 1);
        shade.rotation.set(-Math.PI * .44, yaw, 0, 'YXZ');
        batch.add(light, side * 7.12, 2.76, z, .036, .038, 4.72, block % 2 ? 0x75ecdc : 0xff88ba);
        for (let stall = -1; stall <= 1; stall++) {
          batch.add(frame, side * 8.70, .79, z + stall * 1.50, 1.14, .94, 1.33, 0xaf7280);
          batch.add(light, side * 8.10, 1.25, z + stall * 1.50, .035, .038, 1.25, block % 2 ? 0x75ecdc : 0xffd298);
        }
      }
      if (block % 3 === 0) {
        batch.add(frame, side * 9.02, 6.18, z + 3.33, .43, 4.62, 1.33, 0x766485);
        batch.add(light, side * 8.78, 6.22, z + 3.33, .052, 4.0, .08, stage.lamp);
      }
    }
    if (index % 5 === 1) {
      batch.add(glass, 0, 6.57, z + 1.52, 20.8, .86, 2.05);
      batch.add(frame, 0, 6.16, z + 1.52, 21.3, .32, 2.17, 0x6a5b71);
      batch.add(light, 0, 5.98, z + 2.64, 20.34, .048, .039, stage.lamp);
      for (let strip = -4; strip <= 4; strip++) batch.add(light, strip * 2.09, 6.60, z + 2.52, 1.03, .26, .034, 0xc488d1);
    }
  }

  function graveyard(group, batch, catalog, z, index, stage, moving) {
    for (const side of [-1, 1]) {
      const block = index + Number(side > 0) * 2;
      const x = side * 12.38;
      batch.add(concrete, x, -1.1, z, 9.2, 2.19, 12, 0x5c5a63);
      batch.add(salvage, side * 8.23, .81, z, .31, 1.36, 11.99, 0x807769);
      batch.add(light, side * 8.04, 1.48, z + .028, .056, .034, 11.9, stage.lamp);
      if (block % 3 === 1) {
        const anchor = new THREE.Vector3(side * 17.14, 1.88, z - 4.62);
        const elbow = new THREE.Vector3(side * 15.09, 5.42, z - .61);
        const wrist = new THREE.Vector3(side * 10.55, 3.40, z + 2.79);
        span(group, salvage, anchor, elbow, .70);
        span(group, alloy, elbow, wrist, .53);
        span(group, copper, anchor.clone().addScalar(.26), elbow.clone().addScalar(.37), .156);
        mesh(group, ball, alloy, elbow.x, elbow.y, elbow.z, .84, .86, .93);
        mesh(group, rim, ember, elbow.x, elbow.y, elbow.z + .81, .47, .47, .49);
        for (const claw of [-1, 1]) {
          span(group, copper, wrist, new THREE.Vector3(wrist.x - side * 1.44, wrist.y + claw * .60, wrist.z + .57), .20);
        }
      }
      if (block % 2 === 0) {
        const towerX = side * (21.8 + block * 7 % 6);
        batch.add(concrete, towerX, 1.24, z, 5.24, 5.1, 9.8, 0x706d80);
        batch.add(salvage, towerX, 4.89, z - 1.78, 4.74, 2.36, 4.46, 0x8d7475);
        batch.add(light, towerX, 5.87, z + .53, 3.58, .048, .046, stage.accent);
      }
      for (let part = 0; part < 3; part++) {
        const offset = (part - 1) * 3.51;
        batch.add(salvage, side * (10.30 + part * 1.68), .46 + (block + part) % 3 * .29, z + offset,
          2.51 + .2 * part, 1.2 + (block + part) % 3 * .53, 2.51, part % 2 ? 0x8f6b53 : 0x8b9796, side * (.29 + part * .31));
      }
      if (block % 3 === 0) {
        const shell = mesh(group, ball, alloy, x, 3.10, z + .23, 2.47, 2.31, 2.02, side * -.31);
        shell.rotation.z = side * -.33;
        mesh(group, ball, black, x - side * .58, 3.38, z + 1.60, 1.56, .84, .88);
        mesh(group, rim, copper, x - side * .49, 3.38, z + 2.37, 1.20, .57, 1.1, -side * .33);
        mesh(group, rim, ember, x - side * .48, 3.39, z + 2.39, .55, .48, .61, -side * .33);
        batch.add(frame, x, 1.40, z, 3.41, 2.1, 3.2, 0xb27d61, .37 * side);
      }
      if (block % 4 === 1) {
        const at = side * 14.04;
        batch.add(salvage, at, 5.95, z, .78, 11.91, .93, 0xa18a73);
        batch.add(frame, side * 10.27, 11.69, z, 8.01, .68, .52, 0x8a6f57);
        span(group, alloy, new THREE.Vector3(at, 8.55, z), new THREE.Vector3(side * 7.05, 11.68, z), .07);
        const cargo = mesh(group, rim, copper, side * 9.07, 4.15, z + .07, 1.43, .94, .71);
        moving.push({ mesh: cargo, y: 4.15, phase: index * .46, amount: .67 });
        span(group, frame, new THREE.Vector3(side * 9.07, 4.25, z), new THREE.Vector3(side * 9.07, 11.63, z), .045);
        mesh(group, pane, signs.recall, side * 10.55, 2.49, z + .75, 4.6, 1.03, 1);
      }
    }
  }

  function causeway(group, batch, catalog, z, index, stage) {
    for (const side of [-1, 1]) {
      batch.add(concrete, side * 7.41, -.48, z, .39, .91, 11.99, 0x9a9da2);
      batch.add(frame, side * 7.62, .25, z, .19, .156, 11.99, 0x77819a);
      batch.add(light, side * 7.57, .33, z, .045, .02, 11.92, stage.accent);
      batch.add(frame, side * 7.62, -.05, z + 3.57, .12, .96, .15, 0x8a98a7);
      const x = side * (27.5 + (index * 17 % 12) * 3.3);
      const y = (index * 19 % 9) * 1.8 - 8;
      batch.add(concrete, x, y - 12, z - 4.9, 6.1 + index % 4 * .9, 24, 8.5 + index % 6, 0x717a92);
      batch.add(glass, x, y + 1.8, z - 4.9, 5.20, 3.61, 6.6);
      batch.add(light, x - side * 2.63, y + 1.0, z - 4.9, .045, .046, 6.4, index % 2 ? stage.lamp : stage.accent);
      if (index % 2 === 0 || !compact) {
        const roof = -3 + (index * 23 % 11);
        batch.add(concrete, side * 18.45, roof - 11.0, z + 1.7, 5.99, 22, 8.62, 0x5e7189);
        batch.add(glass, side * 18.45, roof + .95, z + 1.7, 4.85, 1.91, 7.44);
        mesh(group, pane, sunriseFacade, side * 15.42, roof - 3.96, z + 1.7, 8.42, 7.73, 1, -side * Math.PI / 2);
        mesh(group, pane, sunriseFacade, side * 18.45, roof - 3.96, z + 6.04, 5.85, 7.73, 1);
        batch.add(frame, side * 18.45, roof + .16, z + 1.7, 6.14, .26, 8.77, 0x9395a1);
      }
      if (index % 5 === 2) {
        batch.add(concrete, side * 9.90, 4.19, z - 2.65, .99, 12.64, 1.32, 0x858e9b);
        for (const end of [-1, 1]) {
          span(group, alloy, new THREE.Vector3(side * 9.77, 9.94, z - 2.65), new THREE.Vector3(side * 7.61, .20, z - 2.65 + end * 18), .083);
          span(group, alloy, new THREE.Vector3(side * 9.77, 8.57, z - 2.65), new THREE.Vector3(side * 7.61, .20, z - 2.65 + end * 11), .068);
        }
      }
    }
    if (index % 5 === 2) {
      batch.add(frame, 0, 8.87, z - 2.65, 20.21, .54, .88, 0x758889);
      batch.add(light, 0, 8.58, z - 2.19, 18.78, .044, .047, stage.lamp);
    }
  }

  function horseshoe(group, batch, catalog, z, index, stage, moving) {
    if (index === 4) {
      batch.add(frame, 0, 6.13, z, 9.84, 2.43, .47, 0xa66c47);
      mesh(group, pane, signs.bar, 0, 6.15, z + .25, 9.61, 2.13, 1);
      for (const side of [-1, 1]) {
        batch.add(frame, side * 7.56, 3.52, z, .30, 7.04, .40, 0xa66c47);
        span(group, frame, new THREE.Vector3(side * 7.56, 6.18, z), new THREE.Vector3(side * 4.91, 6.18, z), .092);
      }
      for (let bulb = -8; bulb <= 8; bulb++) {
        mesh(group, ball, ember, bulb * .56, 4.99, z + .27, .060, .064, .042);
      }
    }
    for (const side of [-1, 1]) {
      const block = index + (side > 0 ? 2 : 0);
      const face = -side * Math.PI / 2;
      batch.add(concrete, side * 12.97, 7.35, z, 7.3, 14.68, 11.98, block % 3 ? 0x73726a : 0x61666a);
      batch.add(concrete, side * 8.10, .14, z, 1.52, .28, 12, 0x9e9384);
      catalog.add(kit.catalog.ApartmentEntry, side * 9.22, .29, z, face, 1.25, 1, .85, 0xffd6b4);
      catalog.add(kit.catalog.ApartmentUpper, side * 9.3, 3.54, z, face, 1.25, 1, .85, 0xc5aa95);
      catalog.add(kit.catalog.ApartmentUpperAlt, side * 9.3, 6.6, z, face, 1.25, 1, .85, 0xafa8ab);
      catalog.add(kit.clutter['fire-escape'], side * 9.12, 3.87, z - 4.1, face, 1.1, 1.16, 1.1, 0xbaaa95);
      if (block % 2 === 0) {
        batch.add(frame, side * 8.88, 3.72, z + .03, .24, 1.64, 5.92, 0x8c654d);
        mesh(group, pane, block % 4 ? signs.live : signs.bar, side * 8.73, 3.76, z + .05, 5.74, 1.42, 1, face);
        batch.add(light, side * 8.71, 2.97, z + .06, .025, .043, 5.67, stage.lamp);
      }
      if (block % 3 === 1) {
        mesh(group, arch, mint, side * 8.57, 5.55, z + 4.36, .63, .75, .73).rotation.z = Math.PI;
        mesh(group, arch, copper, side * 8.55, 5.54, z + 4.42, .77, .87, 1.1).rotation.z = Math.PI;
      }
      const lantern = mesh(group, ball, ember, side * 7.88, 3.58, z - 3.6, .118, .163, .128);
      moving.push({ mesh: lantern, y: 3.58, phase: block, amount: .045 });
      batch.add(frame, side * 8.29, 3.8, z - 3.59, 1.03, .067, .061, 0xa88c71);
    }
    if (index % 3 === 0) {
      for (let bulb = -6; bulb <= 6; bulb++) {
        const y = 5.59 + (bulb / 6) ** 2 * .82;
        mesh(group, ball, bulb % 3 === 0 ? violet : ember, bulb * 1.43, y, z + 1.16, .064, .085, .064);
        if (bulb < 6) span(group, black, new THREE.Vector3(bulb * 1.43, y + .08, z + 1.15),
          new THREE.Vector3((bulb + 1) * 1.43, 5.67 + ((bulb + 1) / 6) ** 2 * .82, z + 1.15), .018);
      }
    }
  }

  return {
    stages: {
      aquarium: { build: aquarium, deck: lacquer },
      rainmarket: { build: rainmarket },
      graveyard: { build: graveyard, deck: concrete },
      causeway: { build: causeway, deck: concrete },
      horseshoe: { build: horseshoe },
    },
    update(time) { water.uniforms.time.value = ceiling.uniforms.time.value = time; },
  };
}
