import * as THREE from 'three';
import { makeBillboardMotion } from './billboard-motion.js';
import { makeCommerceMaterials } from './commerce.js';
import { environmentBatch } from './environment-kit.js';
import { barriers, chunkLength, districts, roadWidth, routeAt, routeCenter, routeHeading, routeLength, sectionAt, sectionLength, tunnelStart } from './route.js';

export const sidewalkWidth = 2.16;
const curbHeight = .14;
const sidewalkCenter = roadWidth * .5 + sidewalkWidth * .5 - .01;
const box = new THREE.BoxGeometry();
const plane = new THREE.PlaneGeometry();
const color = new THREE.Color();
const screenHeightRatio = 9 / 16;

function randomFrom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function texture(width, height, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext('2d'));
  const result = new THREE.CanvasTexture(canvas);
  result.colorSpace = THREE.SRGBColorSpace;
  result.anisotropy = 4;
  return result;
}

function surfaceMaps() {
  const asphalt = texture(512, 512, (ctx) => {
    const random = randomFrom(993);
    const image = ctx.createImageData(512, 512);
    for (let y = 0; y < 512; y++) {
      for (let x = 0; x < 512; x++) {
        const pixel = 4 * (y * 512 + x);
        const stain = Math.sin(x * .021 + Math.sin(y * .028) * 2) * 6 + Math.cos(y * .044 + Math.sin(x * .036) * 3) * 4;
        const value = 48 + stain + random() ** 2 * 29 - random() * 16;
        image.data[pixel] = value;
        image.data[pixel + 1] = value + 6;
        image.data[pixel + 2] = value + 7;
        image.data[pixel + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
    ctx.strokeStyle = '#21292a';
    for (let i = 0; i < 38; i++) {
      const x = random() * 512;
      const y = random() * 512;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + random() * 21, y - 8);
      ctx.lineTo(x + random() * 29, y - 12);
      ctx.stroke();
    }
  });
  asphalt.wrapS = asphalt.wrapT = THREE.RepeatWrapping;
  asphalt.repeat.set(2, 7);
  const puddles = texture(256, 256, (ctx) => {
    const random = randomFrom(8544);
    ctx.fillStyle = '#8c8c8c';
    ctx.fillRect(0, 0, 256, 256);
    for (let index = 0; index < 23; index++) {
      const x = random() * 256;
      const y = random() * 256;
      const size = 8 + random() * 29;
      const wet = ctx.createRadialGradient(x, y, size * .28, x, y, size);
      wet.addColorStop(0, '#292929');
      wet.addColorStop(1, '#44444400');
      ctx.fillStyle = wet;
      ctx.fillRect(x - size, y - size, size * 2, size * 2);
    }
  });
  puddles.colorSpace = THREE.NoColorSpace;
  puddles.wrapS = puddles.wrapT = THREE.RepeatWrapping;
  puddles.repeat.set(2, 7);

  const concrete = texture(384, 384, (ctx) => {
    const random = randomFrom(7054);
    ctx.fillStyle = '#646e70';
    ctx.fillRect(0, 0, 384, 384);
    for (let i = 0; i < 3400; i++) {
      ctx.fillStyle = i % 2 ? '#d1dfdc14' : '#1617182a';
      ctx.fillRect(random() * 384, random() * 384, random() * 6 + 1, random() * 15 + 1);
    }
    for (let y = 0; y < 384; y += 96) {
      ctx.fillStyle = '#262d2e';
      ctx.fillRect(0, y, 384, 3);
      ctx.fillStyle = '#9ea39d';
      ctx.fillRect(0, y + 3, 384, 1);
      for (let x = 16; x < 384; x += 80) {
        ctx.fillStyle = '#282828';
        ctx.fillRect(x, y + 10, 5, 5);
        const streak = ctx.createLinearGradient(x, y, x + 6, y + 90);
        streak.addColorStop(0, '#23302cef');
        streak.addColorStop(1, '#303b3800');
        ctx.fillStyle = streak;
        ctx.fillRect(x, y + 14, 8, 76);
      }
    }
  });

  const reflection = texture(128, 256, (ctx) => {
    const random = randomFrom(105);
    const image = ctx.createImageData(128, 256);
    for (let y = 0; y < 256; y++) {
      const ripple = .28 + random() ** 1.25 * .72;
      for (let x = 0; x < 128; x++) {
        const center = 64 + Math.cos(y * .16) * 5 + Math.sin(y * .34) * 4;
        const spread = 15 + y * .085;
        const tail = Math.sin(y / 255 * Math.PI) ** .98;
        const edges = Math.exp(-Math.pow((x - center) / spread, 2));
        const pixel = 4 * (y * 128 + x);
        image.data.fill(255, pixel, pixel + 3);
        image.data[pixel + 3] = 208 * ripple * tail * edges * (.35 + random() * .65);
      }
    }
    ctx.putImageData(image, 0, 0);
  });
  return { asphalt, puddles, concrete, reflection };
}

function storefront(label, base, trim) {
  const map = texture(512, 256, (ctx) => {
    ctx.fillStyle = '#121c1e';
    ctx.fillRect(0, 0, 512, 256);
    const shutter = ctx.createLinearGradient(0, 48, 0, 256);
    shutter.addColorStop(0, base);
    shutter.addColorStop(1, '#111b1e');
    ctx.fillStyle = shutter;
    ctx.fillRect(11, 50, 490, 203);
    for (let y = 50; y < 253; y += 9) {
      ctx.fillStyle = '#090e13a6';
      ctx.fillRect(11, y, 490, 3);
      ctx.fillStyle = '#b7c8c132';
      ctx.fillRect(11, y + 3, 490, 1);
    }
    ctx.strokeStyle = '#7f8c85';
    ctx.lineWidth = 3;
    ctx.strokeRect(5, 4, 502, 246);
    ctx.fillStyle = '#303e3f';
    ctx.fillRect(8, 43, 496, 5);
    ctx.fillStyle = trim;
    ctx.fillRect(16, 17, 4, 16);
    ctx.font = '700 19px monospace';
    ctx.fillText(label, 30, 32);
    ctx.fillStyle = '#131d21';
    ctx.fillRect(362, 82, 119, 161);
    ctx.strokeStyle = '#5f7474';
    ctx.strokeRect(370, 90, 103, 145);
    ctx.fillStyle = '#2e4748';
    ctx.fillRect(378, 99, 86, 48);
    ctx.fillStyle = '#bea483';
    ctx.fillRect(385, 116, 27, 17);
    ctx.fillStyle = '#91a09b';
    ctx.fillRect(451, 164, 4, 14);
    ctx.fillStyle = '#d8ae67';
    ctx.font = '800 12px monospace';
    ctx.fillText('AFTER HOURS', 46, 174);
    const random = randomFrom(31);
    ctx.fillStyle = '#c9b08730';
    for (let i = 0; i < 560; i++) ctx.fillRect(random() * 512, 50 + random() * 190, 1 + random() * 8, 1);
  });
  return new THREE.MeshStandardMaterial({ map, roughness: .61, metalness: .3, side: THREE.DoubleSide });
}

function tunnelSign() {
  const map = texture(768, 384, (ctx) => {
    ctx.fillStyle = '#112529';
    ctx.fillRect(0, 0, 768, 384);
    ctx.strokeStyle = '#a7e8cf';
    ctx.lineWidth = 5;
    ctx.strokeRect(18, 18, 732, 348);
    ctx.fillStyle = '#b1ebd6';
    ctx.textAlign = 'center';
    ctx.font = '800 68px system-ui';
    ctx.fillText('TRANSIT TUNNEL', 384, 163, 666);
    ctx.font = '600 32px system-ui';
    ctx.fillText('MAINTENANCE ACCESS', 384, 222, 666);
    for (const x of [327, 384, 441]) {
      ctx.beginPath();
      ctx.moveTo(x - 14, 268);
      ctx.lineTo(x, 286);
      ctx.lineTo(x + 14, 268);
      ctx.stroke();
    }
  });
  return new THREE.MeshBasicMaterial({ map, side: THREE.DoubleSide, toneMapped: false });
}

function batches(group) {
  const lists = new Map();
  return {
    add(material, x, y, z, width, height, depth, tint = 0xffffff, angle = 0) {
      if (!lists.has(material)) lists.set(material, []);
      lists.get(material).push({ x, y, z, width, height, depth, tint, angle });
    },
    finish() {
      const pose = new THREE.Object3D();
      for (const [material, items] of lists) {
        const mesh = new THREE.InstancedMesh(box, material, items.length);
        items.forEach(({ x, y, z, width, height, depth, tint, angle }, index) => {
          pose.position.set(x, y, z);
          pose.scale.set(width, height, depth);
          pose.rotation.y = angle;
          pose.updateMatrix();
          mesh.setMatrixAt(index, pose.matrix);
          mesh.setColorAt(index, color.set(tint));
        });
        mesh.computeBoundingSphere();
        group.add(mesh);
      }
    },
  };
}

function pavement(group, index, material, lane = 0, width = roadWidth + .20, height = 0, branch = false) {
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const uv = [];
  const indices = [];
  const point = new THREE.Vector3();
  const divisions = 8;
  for (let row = 0; row <= divisions; row++) {
    const station = (index + row / divisions) * chunkLength;
    for (const side of [-1, 1]) {
      group.worldToLocal(routeAt(station, lane + side * width * .5, height, point));
      positions.push(point.x, point.y, point.z);
      uv.push((side + 1) / 2, 1 - row / divisions);
    }
    if (row && (!branch || row < 3 || row > 4)) {
      const first = (row - 1) * 2;
      indices.push(first, first + 1, first + 2, first + 1, first + 3, first + 2);
    }
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  group.add(mesh);
  group.userData.surfaces.push(geometry);
}

function makeTowerMaterial(glass) {
  const litWindows = texture(256, 512, (ctx) => {
    const random = randomFrom(glass ? 719 : 324);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 256, 512);
    const colors = ['#203338', '#1e3547', '#57412d', '#bea57b', '#76aab9', '#412c34'];
    for (let row = 0; row < 24; row++) {
      for (let column = 0; column < 10; column++) {
        if (random() > (glass ? .33 : .42)) continue;
        ctx.fillStyle = colors[Math.floor(random() * colors.length)];
        ctx.fillRect(9 + column * 24, 13 + row * 20, glass ? 19 : 12, glass ? 12 : 10);
      }
    }
  });
  const surface = texture(256, 512, (ctx) => {
    const random = randomFrom(glass ? 1377 : 215);
    ctx.fillStyle = glass ? '#253843' : '#777c7a';
    ctx.fillRect(0, 0, 256, 512);
    for (let row = 0; row < 24; row++) {
      ctx.fillStyle = '#182626';
      ctx.fillRect(0, 7 + row * 20, 256, 3);
      for (let column = 0; column < 10; column++) {
        const grey = 26 + random() * 28 + (glass ? 0 : 9);
        ctx.fillStyle = `rgb(${grey},${grey + 7},${grey + 11})`;
        ctx.fillRect(7 + column * 24, 12 + row * 20, glass ? 21 : 16, 13);
        ctx.fillStyle = '#a2afac51';
        ctx.fillRect(7 + column * 24, 25 + row * 20, glass ? 21 : 16, 1);
      }
    }
  });
  return new THREE.MeshStandardMaterial({
    map: surface, roughness: glass ? .42 : .75, metalness: glass ? .29 : .10,
    emissiveMap: litWindows, emissive: 0xffffff, emissiveIntensity: glass ? 1.23 : .66,
  });
}

function saggingCables(group, material, tracks) {
  const points = [];
  for (const [x1, y1, z1, x2, y2, z2, sag] of tracks) {
    for (let segment = 0; segment < 9; segment++) {
      for (const t of [segment / 9, (segment + 1) / 9]) {
        const mix = THREE.MathUtils.lerp;
        points.push(mix(x1, x2, t), mix(y1, y2, t) - Math.sin(t * Math.PI) * sag, mix(z1, z2, t));
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  group.add(new THREE.LineSegments(geometry, material));
  group.userData.surfaces.push(geometry);
}

export function makeCity(scene, kit, compact) {
  const detailReach = compact ? 66 : 88;
  const maps = surfaceMaps();
  const asphalt = new THREE.MeshStandardMaterial({
    map: maps.asphalt, roughnessMap: maps.puddles, ...kit.asphalt, color: 0x909898,
    roughness: .64, metalness: .05, normalScale: new THREE.Vector2(.68, .68),
  });
  const sidewalk = new THREE.MeshStandardMaterial({
    map: maps.concrete, ...kit.pavement, color: 0x979786, roughness: .84, metalness: .05, normalScale: new THREE.Vector2(.65, .65),
  });
  const concrete = new THREE.MeshStandardMaterial({ map: maps.concrete, roughness: .64, metalness: .12 });
  const hardware = new THREE.MeshStandardMaterial({ roughness: .41, metalness: .64 });
  const glassTower = makeTowerMaterial(true);
  const masonryTower = makeTowerMaterial(false);
  const commerce = makeCommerceMaterials();
  const cable = new THREE.LineBasicMaterial({ color: 0x121b1f });
  const windows = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const markings = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .42 });
  const warningFace = new THREE.MeshBasicMaterial({
    map: texture(256, 48, (ctx) => {
      ctx.fillStyle = '#17201c';
      ctx.fillRect(0, 0, 256, 48);
      ctx.fillStyle = '#ffca55';
      for (let x = -40; x < 292; x += 44) {
        ctx.beginPath();
        ctx.moveTo(x + 24, 0);
        ctx.lineTo(x + 42, 0);
        ctx.lineTo(x + 13, 48);
        ctx.lineTo(x - 5, 48);
        ctx.fill();
      }
      ctx.fillStyle = '#fff3a8';
      ctx.fillRect(0, 0, 256, 3);
    }),
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const haze = new THREE.MeshBasicMaterial({ map: maps.reflection, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .48, toneMapped: false });
  const haloMap = texture(96, 96, (ctx) => {
    const grad = ctx.createRadialGradient(48, 48, 1, 48, 48, 48);
    grad.addColorStop(0, '#ffffffc7');
    grad.addColorStop(.16, '#ffffff79');
    grad.addColorStop(.48, '#ffffff29');
    grad.addColorStop(1, '#ffffff00');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 96, 96);
  });
  const haloes = districts.map(({ lamp }) => new THREE.SpriteMaterial({
    map: haloMap, color: lamp, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: .7,
  }));
  const green = haze.clone();
  const red = haze.clone();
  const amber = haze.clone();
  green.color.set(0x12d188);
  red.color.set(0xbc2944);
  amber.color.set(0xe99e3f);
  const doors = [ storefront('FILM ARCHIVE / 24 HRS', '#4a5c57', '#b9c3ab'), storefront('TAPES & REPAIRS', '#59443d', '#f5b482'), storefront('MUNICIPAL SERVICE', '#294a46', '#a2eaac') ];
  const chunks = new Map();
  const hasFacades = Boolean(kit.catalog.ApartmentEntry && kit.catalog.FactoryEntry);
  const motion = makeBillboardMotion();
  const exchangeStart = sectionLength * 2;
  const exchangeEnd = sectionLength * 3;
  const hasDowntown = Boolean(kit.catalog.DowntownEntry && kit.catalog.DowntownUpper);

  function shine(group, material, x, z, width, length) {
    const pool = new THREE.Mesh(plane, material);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(x, .013, z);
    pool.scale.set(width, length, 1);
    group.add(pool);
  }

  function addExchangeScreens(group, batch, index) {
    const interval = 3.048;
    const first = Math.ceil((index * chunkLength - exchangeStart) / interval);
    const end = Math.min((index + 1) * chunkLength, exchangeEnd);
    const screens = motion.materials.map(() => []);
    const point = new THREE.Vector3();
    for (let slot = first; exchangeStart + slot * interval < end; slot++) {
      const distance = exchangeStart + slot * interval;
      const side = slot % 2 === 0 ? -1 : 1;
      const featured = slot % 5 === 0;
      const width = featured ? 7.35 : 4.2 + (slot % 3) * .38;
      const height = width * screenHeightRatio;
      const y = featured ? 7.95 : 5.4 + (slot % 4) * .29;
      const yaw = routeHeading(distance) - group.rotation.y - side * (featured ? .80 : 1.03);
      group.worldToLocal(routeAt(distance, side * (featured ? 8.2 : 8.68), y, point));
      const { x, z } = point;
      const channel = (slot + Math.floor(slot / 6)) % screens.length;
      batch.add(hardware, x, y, z, width + .24, height + .24, .22, 0x526468, yaw);
      batch.add(hardware, x + side * .32, y - height * .5 - .27, z - .14, .77, .28, .28, 0x385356, yaw);
      screens[channel].push({ x: x + Math.sin(yaw) * .119, y, z: z + Math.cos(yaw) * .119, width, height, yaw });
    }
    const pose = new THREE.Object3D();
    for (const [channel, list] of screens.entries()) {
      if (!list.length) continue;
      const mesh = new THREE.InstancedMesh(plane, motion.materials[channel], list.length);
      mesh.name = 'Ad Exchange video screens';
      for (const [screen, { x, y, z, width, height, yaw }] of list.entries()) {
        pose.position.set(x, y, z);
        pose.rotation.y = yaw;
        pose.scale.set(width, height, 1);
        pose.updateMatrix();
        mesh.setMatrixAt(screen, pose.matrix);
      }
      mesh.computeBoundingSphere();
      group.add(mesh);
    }
  }

  function addVenue(group, batch, side, facade, local, index, slot) {
    const channel = ((index * 3 + slot + (side < 0 ? 1 : 0)) % commerce.length + commerce.length) % commerce.length;
    const { frontage, sign, light } = commerce[channel];
    const yaw = -side * Math.PI / 2;
    const x = side * (facade - .34);
    const width = slot % 2 ? 6.26 : 5.25;
    const kiosk = new THREE.Mesh(plane, frontage);
    kiosk.position.set(x, 1.85, local + .3);
    kiosk.rotation.y = yaw;
    kiosk.scale.set(width, 3.08, 1);
    group.add(kiosk);
    batch.add(hardware, x + side * .075, 1.85, local + .3, width + .14, 3.22, .12, 0x274046, yaw);
    batch.add(hardware, x - side * .66, 3.64, local + .3, width + .37, .16, 1.43, 0x373f48, yaw);
    batch.add(windows, x - side * 1.20, 3.57, local + .3, width - .31, .045, .08, light, yaw);
    for (const flank of [-1, 1]) {
      batch.add(hardware, x - side * .06, 1.78, local + .3 + flank * width * .51, .24, 3.38, .27, 0x3d474c, yaw);
    }

    if (slot % 2 || index === 0) {
      const turn = -side * .83;
      const bladeX = x - side * (1.09 + slot * .19);
      const y = 5.82 + slot * .47;
      const z = local - 2.76;
      batch.add(hardware, bladeX, y, z, 1.56, 4.63, .22, 0x233441, turn);
      const marker = new THREE.Mesh(plane, sign);
      marker.position.set(bladeX + Math.sin(turn) * .119, y, z + Math.cos(turn) * .119);
      marker.rotation.y = turn;
      marker.scale.set(1.39, 4.39, 1);
      group.add(marker);
      const reverse = new THREE.Mesh(plane, sign);
      reverse.position.set(bladeX - Math.sin(turn) * .119, y, z - Math.cos(turn) * .119);
      reverse.rotation.y = turn + Math.PI;
      reverse.scale.copy(marker.scale);
      group.add(reverse);
      batch.add(windows, bladeX + Math.sin(turn) * .16, y - 2.16, z + Math.cos(turn) * .16, 1.45, .052, .09, light, turn);
    }
  }

  function openSideStreet(group, batch, side, local) {
    batch.add(asphalt, side * 18, -.055, local, 24, .111, 11.91, 0x666e75);
    batch.add(masonryTower, side * 32.13, 11.2, local, 9, 22.4, 14.4, 0x344450);
    for (const flank of [-1, 1]) {
      batch.add(glassTower, side * 22.75, 15.7, local + flank * 11.2, 13.8, 31.4, 9.9, 0x45525d);
      batch.add(windows, side * 15.1, 3.26, local + flank * 5.66, 11.2, .067, .1, flank > 0 ? 0xd84bae : 0x62eed2);
    }
    batch.add(hardware, side * 11.4, 6.18, local, .62, 1.06, 13.2, 0x25383c);
    batch.add(windows, side * 11.03, 5.62, local, .09, .052, 11.7, 0x4ff5c5);
    for (let stripe = -5; stripe <= 5; stripe++) {
      batch.add(markings, stripe * 1.16, .016, local - 4.48, .48, .021, 1.27, 0xb4bdae);
    }
    shine(group, green, side * 10.5, local, 4.62, 10.3);
  }

  function buildChunk(index) {
    const center = index * chunkLength + chunkLength / 2;
    const area = sectionAt(center);
    const district = districts[area];
    const random = randomFrom(567 + index * 81);
    const group = new THREE.Group();
    const batch = batches(group);
    group.userData.surfaces = [];
    routeAt(center, 0, 0, group.position);
    group.rotation.y = routeHeading(center);
    scene.add(group);
    pavement(group, index, asphalt);

    if (center > tunnelStart + 12) return group;

    const realStreet = new THREE.Group();
    const plainStreet = new THREE.Group();
    const scanned = environmentBatch(realStreet);
    const distant = batches(plainStreet);
    const cables = [];
    const urban = area <= 2;
    const crossroads = index >= 0 && index % 3 === 1 && urban;
    group.userData.hasRealStreet = (urban && hasDowntown) || hasFacades;
    group.userData.realStreet = realStreet;
    group.userData.plainStreet = plainStreet;
    group.add(plainStreet, realStreet);

    for (const side of [-1, 1]) {
      const branch = crossroads && (index % 2 ? side > 0 : side < 0);
      pavement(group, index, sidewalk, side * sidewalkCenter, sidewalkWidth, curbHeight + .004, branch);
      const edge = new THREE.Vector3();
      for (let slot = 0; slot < 4; slot++) {
        const local = -18 + slot * 12;
        if (branch && slot === 2) {
          openSideStreet(group, batch, side, local);
          continue;
        }
        const station = center - local;
        group.worldToLocal(routeAt(station, side * (roadWidth * .5 + .13), curbHeight * .5, edge));
        const curbYaw = routeHeading(station) - group.rotation.y;
        batch.add(concrete, edge.x, edge.y, edge.z, .24, curbHeight, 12.09, 0xa2a397, curbYaw);
        batch.add(concrete, side * 8.33, .058, local, 1.84, .116, 12.3, 0x69716a);
        batch.add(markings, edge.x - side * .38, .016, edge.z, .089, .027, 11.62, 0xa08445, curbYaw);

        const facade = 9.62 + random() * .82 + Number(area === 2) * .53;
        const frontage = 11.08 + random() * .68;
        const groundScale = 1.26 + random() * .32;
        const upper = curbHeight + groundScale * 3;
        const downtown = urban && hasDowntown;
        const stories = downtown ? 2 + ((slot + index + 2) % 3 === 0 ? 1 : 0) : 1;
        const streetTop = upper + 3 * stories;
        const factory = area === 3 || (area === 4 && slot % 3 === 1);
        const entry = factory ? (slot % 2 ? 'FactoryLoading' : 'FactoryEntry') : (slot % 2 ? 'ApartmentEntryAlt' : 'ApartmentEntry');
        const floor = factory ? (slot % 2 ? 'FactoryUpperAlt' : 'FactoryUpper') : (slot % 2 ? 'ApartmentUpperAlt' : 'ApartmentUpper');
        const crown = factory ? 'FactoryCrown' : 'ApartmentCrown';
        const facadeYaw = -side * Math.PI / 2;
        const tint = factory ? 0xcec2ae : [0xa9c9cf, 0xc6d4d0, 0xbfcad8, 0xa9bdc3][slot];
        batch.add(concrete, side * (facade + 4.48), streetTop / 2, local, 7.7, streetTop + .06, 12.12, factory ? 0x625750 : 0x626d6c);
        batch.add(hardware, side * (facade + .51), streetTop / 2, local - 5.9, .43, streetTop, .25, 0x3e4a46);
        distant.add(masonryTower, side * (facade + .22), streetTop / 2, local, .44, streetTop, frontage, factory ? 0x5e4f44 : 0x87918a);
        if (downtown) {
          const ground = crossroads && slot === 3 ? 'DowntownCorner' : 'DowntownEntry';
          scanned.add(kit.catalog[ground], side * facade, curbHeight, local, facadeYaw, frontage / 9, groundScale, 1, tint);
          for (let story = 0; story < stories; story++) {
            scanned.add(kit.catalog.DowntownUpper, side * (facade + .04), upper + story * 3, local, facadeYaw, frontage / 9, 1, 1, tint);
          }
          batch.add(hardware, side * (facade - .02), streetTop + .15, local, .57, .30, frontage + .07, 0x687c86);
          if (slot === 3) scanned.add(kit.catalog.DowntownPlanter, side * 8.49, curbHeight, local - 3.8, facadeYaw);
        } else if (hasFacades) {
          scanned.add(kit.catalog[entry], side * facade, curbHeight, local, facadeYaw, frontage / 9, groundScale, 1, tint);
          scanned.add(kit.catalog[floor], side * (facade + .035), upper, local, facadeYaw, frontage / 9, 1, 1, tint);
          scanned.add(kit.catalog[crown], side * (facade + .035), streetTop, local, facadeYaw, frontage / 9, 1, 1, tint);
        } else {
          const doorway = new THREE.Mesh(plane, doors[(index + slot + (side === 1 ? 3 : 1) + 6) % doors.length]);
          doorway.position.set(side * (facade - .031), 1.93, local);
          doorway.scale.set(7.85, 3.57, 1);
          doorway.rotation.y = facadeYaw;
          plainStreet.add(doorway);
        }

        const height = (14 + random() * 27) * district.height;
        const tower = urban || slot % 3 === 0 ? glassTower : masonryTower;
        const setback = slot % 2 === 0 ? .72 : 2.1;
        batch.add(tower, side * (facade + 5.08 + setback), streetTop + height * .5 - .19, local, 9.7, height, 11.75, tint);
        batch.add(concrete, side * (facade + 5.08 + setback), streetTop + height - .04, local, 10.16, .45, 12.02, 0x4b5352);
        if ((slot + index + (side < 0 ? 2 : 0)) % 3 === 0) {
          const tall = (27 + random() * 49) * district.height;
          const farSide = facade + 18.6 + random() * 5.9;
          batch.add(glassTower, side * farSide, tall * .5, local + 4.8, 15.1, tall, 17.6, 0x8dabb9);
          batch.add(hardware, side * farSide, tall + 2.65, local + 4.8, .15, 6.8, .15, 0x424b53);
          batch.add(windows, side * farSide, tall + 5.9, local + 4.8, .25, .17, .25, 0xe1284f);
        }

        if (slot === (side < 0 ? 2 : 1)) scanned.add(kit.clutter.aircon, side * (facade - .23), upper + 1.32, local + 3.47, facadeYaw);
        if (slot === 2 && (index + (side < 0 ? 1 : 0)) % 2 === 0) {
          scanned.add(kit.clutter['fire-escape'], side * (facade - .19), upper + 2.35, local - 1.25, facadeYaw, .91, .86, 1, 0x8e9c9b);
        }
        if (slot === 1) scanned.add(kit.clutter['utility-box'], side * 8.38, curbHeight, local + 4.24, facadeYaw);
        if (slot === 3) scanned.add(kit.clutter['trash-can'], side * (facade - .77), curbHeight, local - 2.7, facadeYaw + .37);
        if (side === 1 && slot === 1) scanned.add(kit.clutter.manhole, 5.75, -.012, local + .26, .65);

        batch.add(hardware, side * (facade - .35), 2.26, local + 4.77, .19, 4.3, .16, 0x585949);
        batch.add(hardware, side * (facade - .40), .76, local + 4.76, .23, .27, .19, 0x554e43);
        batch.add(hardware, side * 7.74, .73, local - 4.2, .13, 1.18, .13, 0x374548);
        batch.add(windows, side * 7.74, 1.31, local - 4.2, .15, .09, .15, slot % 2 ? 0xe19c4b : 0x68aeb2);
        const lamp = slot % 3 === 1 ? district.accent : district.lamp;
        batch.add(hardware, side * (facade - .72), upper - .23, local + 1.6, 1.28, .16, 2.39, 0x4a5353);
        batch.add(windows, side * (facade - 1.18), upper - .329, local + 1.6, .16, .062, 2.16, lamp);
        if (slot % 2 === 0) {
          batch.add(hardware, side * (facade - .25), upper - .8, local - 4.1, .28, 2.2, .155, 0x2c423e);
          batch.add(windows, side * (facade - .414), upper - .8, local - 4.1, .08, 1.88, .09, lamp);
          const glow = new THREE.Sprite(haloes[area]);
          glow.position.set(side * (facade - 1.22), upper - .34, local + 1.6);
          glow.scale.set(2.9, 1.32, 1);
          group.add(glow);
        }
        if (urban && (area !== 2 || slot % 2 === 0)) addVenue(group, batch, side, facade, local, index, slot);
        if (slot === 0 || slot === 2) cables.push([side * (facade - .46), upper + .92, local - 6, side * (facade - .46), upper + 1.37, local + 6, .62]);
      }
      const signZ = side < 0 ? -13 : 9;
      if (area !== 2) {
        const marquee = urban && (index === 0 || (index + (side > 0 ? 2 : 0)) % 2 === 1);
        const channel = THREE.MathUtils.euclideanModulo(index + (side < 0 ? 2 : 0), motion.materials.length);
        const screen = new THREE.Mesh(plane, motion.materials[channel]);
        const y = marquee ? (side < 0 ? 10.8 : 6.75) : 6.13;
        const length = marquee ? 10.3 : 6.5;
        const height = length * screenHeightRatio;
        const angle = -side * (marquee ? .81 : 1.04);
        screen.name = 'Roadside video screen';
        screen.position.set(side * 8.91, y, signZ);
        screen.scale.set(length, height, 1);
        screen.rotation.y = angle;
        batch.add(hardware, screen.position.x - Math.sin(angle) * .135, y, signZ - Math.cos(angle) * .135, length + .24, height + .23, .22, 0x50606c, angle);
        group.add(screen);
      }
      shine(group, area === 2 || area === 3 ? red : area === 0 ? amber : green, side * 4.1, signZ, 6.4, 21);
    }
    if (area === 2) addExchangeScreens(group, batch, index);
    if (index % 3 === 0 && area !== 2) cables.push([-10.2, 8.61, 11, 10.4, 8.32, 6, 1.18]);
    saggingCables(group, cable, cables);
    for (let index = -3; index <= 3; index++) {
      for (const side of [-1, 1]) batch.add(markings, side * 2.12, .018, index * 7, .08, .019, 2.6, 0x857d61);
    }
    if (index % 3 === 1 || (area === 3 && index % 2 === 0)) {
      batch.add(hardware, 0, 9.51, -6, 24.4, .74, 4.8, 0x384e56);
      batch.add(glassTower, 0, 10.89, -6, 22.8, 1.8, 4.6, 0x6b8891);
      batch.add(hardware, 0, 11.94, -6, 24.5, .37, 4.91, 0x35434a);
      batch.add(hardware, 0, 9.18, -3.5, 23.5, .31, .26, 0x668082);
      batch.add(windows, 0, 9.01, -3.34, 22.2, .075, .10, district.lamp);
      for (let column = -4; column <= 4; column++) {
        batch.add(hardware, column * 2.48, 10.66, -3.57, .15, 2.52, .12, 0x8d9295);
        batch.add(windows, column * 2.48, 9.19, -6.44, .26, .055, 1.71, district.accent);
      }
    }
    if (index === 0 || index === area * sectionLength / chunkLength) {
      const marquee = index === 0;
      const screen = new THREE.Mesh(plane, motion.materials[area % motion.materials.length]);
      const width = marquee ? 6.7 : 10.1;
      const height = width * screenHeightRatio;
      const angle = marquee ? Math.PI * .36 : 0;
      screen.name = 'District video marquee';
      screen.position.set(marquee ? -6.4 : 0, marquee ? 4.7 : 8.55, marquee ? 10.6 : -10);
      screen.rotation.y = angle;
      screen.scale.set(width, height, 1);
      group.add(screen);
      const { x, y, z } = screen.position;
      batch.add(hardware, x - Math.sin(angle) * .16, y, z - Math.cos(angle) * .16, width + .26, height + .26, .27, 0x567273, angle);
      if (!marquee) batch.add(hardware, 0, 8.45, -10.42, 21.5, .31, .55, 0x567273);
    }
    batch.finish();
    distant.finish();
    scanned.finish();
    return group;
  }

  const tunnel = new THREE.Group();
  const shell = batches(tunnel);
  routeAt(tunnelStart, 0, 0, tunnel.position);
  scene.add(tunnel);
  const tunnelLength = routeLength - tunnelStart + 23;
  shell.add(concrete, 0, 6.9, -tunnelLength / 2, 17, 1.9, tunnelLength, 0x74837c);
  for (const side of [-1, 1]) {
    shell.add(concrete, side * 7.37, 3.2, -tunnelLength / 2, .83, 6.4, tunnelLength, 0x616c6e);
    shell.add(concrete, side * 7.59, 3.25, .18, 1.6, 6.5, 1.18, 0x67756b);
    shell.add(windows, side * 6.85, 3.1, .81, .1, 5.25, .075, 0xf5a95f);
    shell.add(markings, side * 6.77, .03, -tunnelLength / 2, .16, .03, tunnelLength, 0xd69e45);
  }
  shell.add(concrete, 0, 6.02, .18, 14, .65, 1.18, 0x64736e);
  for (let z = 0; z >= -tunnelLength; z -= 5.8) {
    shell.add(hardware, 0, 5.83, z, 13.4, .21, .44, 0x7d8c82);
    shell.add(windows, 0, 5.67, z, 10.4, .06, .09, 0x79e1b5);
  }
  shell.add(hardware, 0, 2.9, -tunnelLength, 14.4, 5.8, .14, 0x273738);
  const benchZ = -(routeLength - tunnelStart - 5);
  shell.add(hardware, 6.13, .52, benchZ, .75, .13, 2.2, 0x78858a);
  shell.add(hardware, 6.52, .76, benchZ, .13, .68, 2.2, 0x78858a);
  shell.add(hardware, 6.27, .95, benchZ + .1, .54, .78, .54, 0x799098);
  shell.add(hardware, 6.15, 1.52, benchZ + .08, .49, .45, .48, 0x99abad, -.28);
  shell.add(hardware, 5.95, .57, benchZ + .33, .63, .20, .19, 0x708b90);
  shell.add(hardware, 5.95, .57, benchZ - .15, .63, .20, .19, 0x708b90);
  shell.add(hardware, 5.68, .32, benchZ + .33, .20, .54, .19, 0x708b90);
  shell.add(hardware, 5.68, .32, benchZ - .15, .20, .54, .19, 0x708b90);
  shell.add(windows, 5.91, 1.58, benchZ + .14, .025, .075, .12, 0xf65e5e);
  shell.finish();
  const exit = new THREE.Mesh(plane, tunnelSign());
  exit.position.set(0, 6.98, .92);
  exit.scale.set(6.6, 2.1, 1);
  tunnel.add(exit);

  const roadside = barriers.map(({ at, lane, halfWidth }) => {
    const barrier = new THREE.Group();
    const batch = batches(barrier);
    routeAt(at, lane, 0, barrier.position);
    barrier.rotation.y = routeHeading(at);
    barrier.scale.x = halfWidth / 1.28;
    batch.add(hardware, 0, .405, 0, 2.56, .35, .38, 0x26322c);
    batch.add(windows, 0, .594, .048, 2.53, .044, .265, 0xffbd38);
    for (const sign of [-1, 1]) {
      batch.add(hardware, sign * 1.12, .36, 0, .25, .72, .31, 0x162422);
      batch.add(hardware, sign * 1.12, .085, .07, .40, .17, .75, 0x35443c);
      batch.add(windows, sign * 1.12, .71, .145, .22, .113, .06, 0xffaf34);
      batch.add(windows, sign * 1.12, .23, .17, .098, .21, .035, 0xffce53);
      batch.add(markings, sign * 1.07, .025, .94, .15, .042, 1.22, 0xb48734);
    }
    batch.add(markings, 0, .006, 2.67, 2.44, .008, 2.25, 0x242d28);
    for (const z of [2.13, 2.93, 3.57]) {
      batch.add(markings, -.56, .018, z, 1.21, .014, .135, 0xdcad46, -.28);
      batch.add(markings, .56, .018, z, 1.21, .014, .135, 0xdcad46, .28);
    }
    const plate = new THREE.Mesh(plane, warningFace);
    plate.position.set(0, .411, .196);
    plate.scale.set(1.99, .29, 1);
    barrier.add(plate);
    batch.finish();
    scene.add(barrier);
    return { at, barrier };
  });

  let lastChunk;
  function update(distance, reducedMotion = false) {
    const current = Math.floor(distance / chunkLength);
    if (current !== lastChunk) {
      const first = current - 2;
      const last = current + 4;
      for (const [index, group] of chunks) {
        if (index >= first && index <= last) continue;
        group.removeFromParent();
        for (const surface of group.userData.surfaces) surface.dispose();
        group.traverse((child) => { if (child.isInstancedMesh) child.dispose(); });
        chunks.delete(index);
      }
      for (let index = first; index <= last; index++) {
        if (!chunks.has(index) && index <= Math.ceil((routeLength + 30) / chunkLength)) chunks.set(index, buildChunk(index));
      }
      lastChunk = current;
    }
    for (const [index, group] of chunks) {
      const { realStreet, plainStreet, hasRealStreet } = group.userData;
      if (!realStreet) continue;
      const center = (index + .5) * chunkLength;
      const streetDetail = hasRealStreet && center >= distance - 36 && center <= distance + detailReach;
      realStreet.visible = streetDetail;
      plainStreet.visible = !streetDetail;
    }
    for (const { at, barrier } of roadside) barrier.visible = at > distance - 15 && at < distance + 108;
    tunnel.visible = distance > tunnelStart - 140;
    motion.setPlayback(distance < tunnelStart + 9, reducedMotion);
  }

  return { update, stopScreens: (reducedMotion) => motion.setPlayback(false, reducedMotion) };
}
