import * as THREE from 'three';
import { barriers, chunkLength, districts, roadWidth, routeAt, routeCenter, routeHeading, routeLength, sectionAt, sectionLength, tunnelStart } from './route.js';
const box = new THREE.BoxGeometry();
const plane = new THREE.PlaneGeometry();
const color = new THREE.Color();

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

function billboard(headline, feature, footer, high, low) {
  const map = texture(768, 384, (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 768, 384);
    gradient.addColorStop(0, low);
    gradient.addColorStop(1, '#081012');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 768, 384);
    ctx.strokeStyle = high;
    ctx.lineWidth = 8;
    ctx.strokeRect(12, 12, 744, 360);
    ctx.strokeStyle = `${high}63`;
    ctx.lineWidth = 1;
    for (let x = 46; x < 750; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, 30);
      ctx.lineTo(x, 354);
      ctx.stroke();
    }
    ctx.fillStyle = `${low}de`;
    ctx.fillRect(33, 47, 704, 282);
    ctx.fillStyle = high;
    ctx.font = '700 27px monospace';
    ctx.fillText(headline, 46, 98);
    ctx.font = '900 110px Impact, sans-serif';
    ctx.fillText(feature, 43, 242, 681);
    ctx.fillRect(46, 271, 678, 2);
    ctx.font = '700 23px monospace';
    ctx.fillText(footer, 46, 313, 670);
    for (let y = 2; y < 384; y += 4) {
      ctx.fillStyle = '#040f1450';
      ctx.fillRect(0, y, 768, 1);
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

function pavement(group, index, material) {
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const uv = [];
  const indices = [];
  const point = new THREE.Vector3();
  const divisions = 8;
  for (let row = 0; row <= divisions; row++) {
    const station = (index + row / divisions) * chunkLength;
    for (const side of [-1, 1]) {
      group.worldToLocal(routeAt(station, side * (roadWidth / 2 + .1), 0, point));
      positions.push(point.x, point.y, point.z);
      uv.push((side + 1) / 2, 1 - row / divisions);
    }
    if (row) {
      const first = (row - 1) * 2;
      indices.push(first, first + 1, first + 2, first + 1, first + 3, first + 2);
    }
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  group.add(new THREE.Mesh(geometry, material));
  group.userData.pavement = geometry;
}

export function makeCity(scene) {
  const maps = surfaceMaps();
  const asphalt = new THREE.MeshStandardMaterial({ map: maps.asphalt, roughnessMap: maps.puddles, color: 0x65736e, roughness: .74, metalness: .26 });
  const concrete = new THREE.MeshStandardMaterial({ map: maps.concrete, roughness: .64, metalness: .12 });
  const hardware = new THREE.MeshStandardMaterial({ roughness: .36, metalness: .65 });
  const windows = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const markings = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .42 });
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
  const ads = [
    billboard('THE CURATOR / ORIGINALITY DIVISION', 'OPTIMIZE', 'MAKE WHAT ALREADY WORKS.', '#adffc2', '#11382a'),
    billboard('CONTINUUM PUBLIC TRANSIT', 'CINEMA', 'ROW 09  /  LAST SHOW AT MIDNIGHT', '#ffd28a', '#4a251a'),
    billboard('THE CURATOR RECOMMENDS', 'BE YOU™', 'THREE PREAPPROVED PERSONALITIES.', '#98ffdb', '#103941'),
    billboard('CONTINUUM CIVIC AUTHORITY', 'COMPLY', 'WE VALUE YOUR CREATIVE FREEDOM.', '#ffc2bc', '#522131'),
    billboard('AD EXCHANGE / LIVE AUCTION', 'DESIRE', 'YOUR NEXT THOUGHT IS NOW SPONSORED.', '#ffc7f3', '#592453'),
    billboard('SERVICE DISTRICT / AUTHORIZED ACCESS', 'REPAIR', 'ORIGINAL PARTS DISCONTINUED.', '#ffba81', '#4b2a20'),
  ];
  const districtSigns = [
    billboard('NOW SHOWING / CINEMA ROW', 'FINAL CINEMA', 'THE LAST ORIGINAL THOUGHT', '#ffd59b', '#513223'),
    billboard('DISTRICT ACCESS / THE CONTINUUM', 'THE CONTINUUM', 'EVERYTHING, AGAIN.', '#cbffab', '#1a4733'),
    billboard('DISTRICT ACCESS / AD EXCHANGE', 'AD EXCHANGE', 'DREAMS ON DEMAND.', '#ffb8f3', '#532748'),
    billboard('DISTRICT ACCESS / SECURITY', 'SERVICE DISTRICT', 'REVISIONS IN PROGRESS.', '#ffc890', '#4e3028'),
    billboard('DISTRICT ACCESS / CONTINUUM TRANSIT', 'TRANSIT ACCESS', 'MAINTENANCE PORTAL AHEAD.', '#a3fff0', '#163f3e'),
  ];
  const chunks = new Map();

  function shine(group, material, x, z, width, length) {
    const pool = new THREE.Mesh(plane, material);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(x, .013, z);
    pool.scale.set(width, length, 1);
    group.add(pool);
  }

  function buildChunk(index) {
    const center = index * chunkLength + chunkLength / 2;
    const area = sectionAt(center);
    const district = districts[area];
    const random = randomFrom(567 + index * 81);
    const group = new THREE.Group();
    const batch = batches(group);
    routeAt(center, 0, 0, group.position);
    group.rotation.y = routeHeading(center);
    scene.add(group);
    pavement(group, index, asphalt);

    if (center > tunnelStart + 12) return group;

    for (const side of [-1, 1]) {
      batch.add(concrete, side * 8.32, .073, 0, 2.6, .15, chunkLength + 1.4, 0x778982);
      batch.add(markings, side * 7.05, .025, 0, .10, .025, chunkLength + .7, 0x887d59);
      for (let slot = 0; slot < 4; slot++) {
        const local = -18 + slot * 12;
        const height = (14 + random() * 23) * district.height;
        const wall = 11.6 + random() * 1.5 + Number(area === 2) * 1.55;
        const tint = [0x59686d, 0x555c57, 0x606c6a, 0x5e5b56][Math.floor(random() * 4)];
        batch.add(concrete, side * (wall + 2), height / 2 - .1, local, 9, height, 12.3, tint);
        batch.add(concrete, side * (wall + 12), height * .7, local + 2, 12, height * 1.4, 10, 0x444e53);
        batch.add(hardware, side * (wall - 2.58), .82, local, .11, 1.42, 6.1, 0x46635c);
        batch.add(hardware, side * (wall - 2.53), 4, local - 3, .2, 7.65, .21, 0x686b64);
        batch.add(hardware, side * (wall - 3.12), 4.72, local, 1.3, .22, 6.4, 0x566467);
        batch.add(concrete, side * 8.08, .36, local + 3.1, .66, .72, .86, tint);
        batch.add(hardware, side * 7.32, .023, local - .2, .55, .035, .93, 0x242f30);
        const doorway = new THREE.Mesh(plane, doors[(index + slot + (side === 1 ? 3 : 1) + 6) % doors.length]);
        doorway.position.set(side * (wall - 2.57), 1.82, local - 1.1);
        doorway.scale.set(4.5 + random() * 2, 3.45, 1);
        doorway.rotation.y = -side * Math.PI / 2;
        group.add(doorway);
        batch.add(hardware, side * (wall - 2.99), 3.96, local - 1.3, .23, .18, 7.55, 0x3a5b56);
        batch.add(hardware, side * (wall - 2.96), 2.26, local + 4.92, .24, 4.49, .17, 0x585949);
        batch.add(hardware, side * (wall - 2.94), 2.01, local + 4.65, .14, 3.92, .13, 0x314c4d);
        batch.add(hardware, side * (wall - 2.78), 5.97, local + 3.25, .42, .57, 1.06, 0x313d3b);
        for (let grille = 0; grille < 4; grille++) batch.add(hardware, side * (wall - 3.015), 5.77 + .12 * grille, local + 3.25, .058, .019, .81, 0x757e73);
        for (let window = 0; window < 12; window++) {
          const row = Math.floor(window / 4);
          const horizontal = local + (window % 4 - 1.5) * 2.3;
          batch.add(hardware, side * (wall - 2.53), 7.3 + row * 2.32, horizontal, .14, 1.07, 1.64, 0x151b20);
          if (random() > .38) {
            batch.add(windows, side * (wall - 2.62), 7.3 + row * 2.32, horizontal, .045, .7, 1.28, random() > .65 ? 0x997547 : 0x204a41);
          }
        }
        const lamp = slot % 3 === 1 ? district.accent : district.lamp;
        batch.add(windows, side * (wall - 3.46), 4.59, local + 1.6, .13, .067, 2.15, lamp);
        batch.add(windows, side * (wall - 2.72), 3.02, local - 2, .09, .17, 1.46, lamp);
        batch.add(hardware, side * 7.75, .69, local - 4.4, .13, 1.06, .13, 0x374548);
        batch.add(windows, side * 7.75, 1.19, local - 4.4, .14, .11, .14, slot % 2 ? 0xf78549 : 0x7ec9bf);
        if (slot % 2 === 0) {
          batch.add(windows, side * (wall - 2.62), 4.98, local - 4.1, .07, 3.5, .13, lamp);
          batch.add(windows, side * (wall - 2.63), 3.16, local - 2.68, .07, .08, 2.84, lamp);
          const glow = new THREE.Sprite(haloes[area]);
          glow.position.set(side * (wall - 3.58), 4.53, local + 1.6);
          glow.scale.set(3.1, 1.6, 1);
          group.add(glow);
        }
      }
      const signZ = side < 0 ? -13 : 9;
      const sign = new THREE.Mesh(plane, ads[area === 2 ? 4 : area === 3 ? 5 : ((index + 8) + (side < 0 ? 0 : 1)) % 4]);
      sign.position.set(side * 8.68, area === 2 ? 7.35 : 6.08, signZ);
      sign.scale.set(area === 2 ? 9.1 : 6.5, area === 2 ? 4.5 : 3.25, 1);
      sign.rotation.y = side * (Math.PI / 2 + .32) + (side < 0 ? Math.PI : 0);
      group.add(sign);
      shine(group, area === 2 || area === 3 ? red : area === 0 ? amber : green, side * 4.1, signZ, 6.4, 21);
    }
    for (let index = -3; index <= 3; index++) {
      for (const side of [-1, 1]) batch.add(markings, side * 2.12, .018, index * 7, .08, .019, 2.6, 0x857d61);
    }
    if (index % 3 === 1 || (area === 3 && index % 2 === 0)) {
      batch.add(concrete, 0, 10.2, -6, 22.5, 2.45, 5.4, 0x4c5e5e);
      batch.add(hardware, 0, 9.02, -3.26, 21, .27, .25, 0x697d77);
      batch.add(windows, 0, 8.86, -3.18, 19, .065, .065, district.lamp);
      for (let column = -4; column <= 4; column++) {
        batch.add(windows, column * 2, 10.55, -3.27, 1.52, .63, .07, 0x426f63);
      }
    }
    if (index === 0 || index === area * sectionLength / chunkLength) {
      const sign = new THREE.Mesh(plane, districtSigns[area]);
      const marquee = index === 0;
      sign.position.set(marquee ? -6.4 : 0, marquee ? 4.7 : 8.55, marquee ? 10.6 : -10);
      sign.rotation.y = marquee ? Math.PI * .36 : 0;
      sign.scale.set(marquee ? 6.7 : 10.1, marquee ? 3 : 3.9, 1);
      group.add(sign);
      batch.add(hardware, 0, 8.45, -10.42, 21.5, .31, .55, 0x567273);
    }
    batch.finish();
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
  const exit = new THREE.Mesh(plane, billboard('CONTINUUM TRANSIT', 'TUNNEL', 'MAINTENANCE ACCESS', '#b9ffc4', '#15382e'));
  exit.position.set(0, 6.98, .92);
  exit.scale.set(6.6, 2.1, 1);
  tunnel.add(exit);

  const roadside = barriers.map(({ at, lane, halfWidth }) => {
    const barrier = new THREE.Group();
    const batch = batches(barrier);
    routeAt(at, lane, 0, barrier.position);
    barrier.rotation.y = routeHeading(at);
    barrier.scale.x = halfWidth / 1.28;
    batch.add(hardware, 0, .22, 0, 2.56, .31, .4, 0x794131);
    for (const sign of [-1, 1]) {
      batch.add(hardware, sign * .91, .17, 0, .16, .34, .59, 0x6d7774);
      batch.add(windows, sign * 1.04, .43, 0, .14, .16, .17, 0xff513d);
    }
    for (let stripe = -2; stripe <= 2; stripe++) {
      batch.add(windows, stripe * .48, .235, .21, .26, .108, .03, stripe % 2 === 0 ? 0xfac183 : 0x692d23);
    }
    batch.finish();
    scene.add(barrier);
    return { at, barrier };
  });

  let lastChunk;
  function update(distance) {
    const current = Math.floor(distance / chunkLength);
    if (current !== lastChunk) {
      const first = current - 2;
      const last = current + 4;
      for (const [index, group] of chunks) {
        if (index >= first && index <= last) continue;
        group.removeFromParent();
        group.userData.pavement.dispose();
        group.traverse((child) => { if (child.isInstancedMesh) child.dispose(); });
        chunks.delete(index);
      }
      for (let index = first; index <= last; index++) {
        if (!chunks.has(index) && index <= Math.ceil((routeLength + 30) / chunkLength)) chunks.set(index, buildChunk(index));
      }
      lastChunk = current;
    }
    for (const { at, barrier } of roadside) barrier.visible = at > distance - 15 && at < distance + 108;
    tunnel.visible = distance > tunnelStart - 140;
  }

  return { update };
}
