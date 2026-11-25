import * as THREE from 'three';

export const routeLength = 730;
export const droneMark = 267;
export const wineMark = 510;

const chunkLength = 50;
const roadWidth = 12.8;
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

export function makeCity(scene) {
  const maps = surfaceMaps();
  const asphalt = new THREE.MeshStandardMaterial({ map: maps.asphalt, roughnessMap: maps.puddles, color: 0x879591, roughness: .9, metalness: .14 });
  const concrete = new THREE.MeshStandardMaterial({ map: maps.concrete, roughness: .81, metalness: .06 });
  const hardware = new THREE.MeshStandardMaterial({ roughness: .56, metalness: .57 });
  const windows = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const markings = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .55 });
  const haze = new THREE.MeshBasicMaterial({ map: maps.reflection, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .68, toneMapped: false });
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
  ];
  const chunks = [];

  function shine(group, material, x, z, width, length) {
    const pool = new THREE.Mesh(plane, material);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(x, .013, z);
    pool.scale.set(width, length, 1);
    group.add(pool);
  }

  for (let index = -1; index <= 14; index++) {
    const center = index * chunkLength + chunkLength / 2;
    const z = -center;
    const random = randomFrom(567 + index * 81);
    const group = new THREE.Group();
    const batch = batches(group);
    const lane = new THREE.Mesh(plane, asphalt);
    lane.rotation.x = -Math.PI / 2;
    lane.scale.set(roadWidth, chunkLength, 1);
    group.add(lane);
    group.position.z = z;
    chunks.push({ center, group });
    scene.add(group);

    for (const side of [-1, 1]) {
      batch.add(concrete, side * 7.35, .075, 0, 2.1, .15, chunkLength, 0x929a90);
      batch.add(markings, side * 6.15, .025, 0, .11, .025, chunkLength, 0x928c59);
      for (let slot = 0; slot < 4; slot++) {
        const local = -18.6 + slot * 12.4;
        const height = 11 + random() * 22;
        const wall = 10.15 + random() * 1.45;
        const tint = [0x59686d, 0x555c57, 0x606c6a, 0x5e5b56][Math.floor(random() * 4)];
        batch.add(concrete, side * (wall + 2), height / 2 - .1, local, 9, height, 12.3, tint);
        batch.add(concrete, side * (wall + 12), height * .7, local + 2, 12, height * 1.4, 10, 0x444e53);
        batch.add(hardware, side * (wall - 2.58), .82, local, .11, 1.42, 6.1, 0x46635c);
        batch.add(hardware, side * (wall - 2.53), 4, local - 3, .2, 7.65, .21, 0x686b64);
        batch.add(hardware, side * (wall - 3.12), 4.72, local, 1.3, .22, 6.4, 0x566467);
        batch.add(concrete, side * 7.12, .36, local + 3.1, .66, .72, .86, tint);
        batch.add(hardware, side * 6.35, .023, local - .2, .55, .035, .93, 0x242f30);
        const doorway = new THREE.Mesh(plane, doors[(index + slot + (side === 1 ? 3 : 1)) % doors.length]);
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
        const lamp = slot % 3 === 1 ? 0xffab62 : 0x67f9bf;
        batch.add(windows, side * (wall - 3.46), 4.59, local + 1.6, .13, .067, 2.15, lamp);
        batch.add(windows, side * (wall - 2.72), 3.02, local - 2, .09, .17, 1.46, lamp);
        batch.add(hardware, side * 6.96, .69, local - 4.4, .13, 1.06, .13, 0x374548);
        batch.add(windows, side * 6.96, 1.19, local - 4.4, .14, .11, .14, slot % 2 ? 0xf78549 : 0x7ec9bf);
        if (slot % 2 === 0) shine(group, slot === 2 ? amber : green, side * 4.7, local, 4.8, 12.3);
        if (slot % 3 === 1) shine(group, amber, side * 5.36, local + 3, 2.6, 8.1);
      }
      const signZ = side < 0 ? -13 : 9;
      const sign = new THREE.Mesh(plane, ads[((index + 8) + (side < 0 ? 0 : 1)) % ads.length]);
      sign.position.set(side * 7.65, 6.08, signZ);
      sign.scale.set(6.5, 3.25, 1);
      sign.rotation.y = side * (Math.PI / 2 + .32) + (side < 0 ? Math.PI : 0);
      group.add(sign);
      shine(group, (index + 2) % 4 === 1 ? red : green, side * 3.7, signZ, 6.4, 23);
    }
    for (let index = -3; index <= 3; index++) {
      for (const side of [-1, 1]) batch.add(markings, side * 2.12, .018, index * 7, .08, .019, 2.6, 0x857d61);
    }
    if (index % 3 === 1) {
      batch.add(concrete, 0, 10.2, -6, 22.5, 2.45, 5.4, 0x4c5e5e);
      batch.add(hardware, 0, 9.02, -3.26, 21, .27, .25, 0x697d77);
      for (let column = -4; column <= 4; column++) {
        batch.add(windows, column * 2, 10.55, -3.27, 1.52, .63, .07, 0x426f63);
      }
    }
    batch.finish();
  }

  const tunnel = new THREE.Group();
  const shell = batches(tunnel);
  tunnel.position.z = -(routeLength - 29);
  scene.add(tunnel);
  shell.add(concrete, 0, 6.9, -24, 17, 1.9, 48.1, 0x74837c);
  for (const side of [-1, 1]) {
    shell.add(concrete, side * 6.78, 3.2, -24, .83, 6.4, 48.1, 0x616c6e);
    shell.add(concrete, side * 7, 3.25, .18, 2.3, 6.5, 1.18, 0x67756b);
    shell.add(windows, side * 5.82, 3.1, .81, .1, 5.25, .075, 0xf5a95f);
    shell.add(markings, side * 5.7, .03, -23, .16, .03, 45, 0xd69e45);
  }
  shell.add(concrete, 0, 6.02, .18, 14, .65, 1.18, 0x64736e);
  for (let z = 0; z >= -47; z -= 5.8) {
    shell.add(hardware, 0, 5.83, z, 13.4, .21, .44, 0x7d8c82);
    shell.add(windows, 0, 5.67, z, 10.4, .06, .09, 0x79e1b5);
  }
  shell.add(concrete, 0, -.12, -24, 13.4, .24, 48, 0x515c5f);
  shell.add(hardware, 0, 2.9, -48, 13.1, 5.8, .14, 0x273738);
  shell.finish();
  const exit = new THREE.Mesh(plane, billboard('CONTINUUM TRANSIT', 'TUNNEL', 'MAINTENANCE ACCESS', '#b9ffc4', '#15382e'));
  exit.position.set(0, 6.98, .92);
  exit.scale.set(6.6, 2.1, 1);
  tunnel.add(exit);

  const hurdles = [ [45, 0], [113, -3.35], [167, 3.22], [230, -.5], [329, 2.6], [392, -2.95], [466, .3], [609, -2.6], [661, 2.8] ];
  const barriers = hurdles.map(([at, x]) => {
    const barrier = new THREE.Group();
    const batch = batches(barrier);
    barrier.position.set(x, 0, -at);
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
    return { at, x, barrier };
  });

  function update(distance) {
    for (const { center, group } of chunks) group.visible = center > distance - 67 && center < distance + 157;
    for (const { at, barrier } of barriers) barrier.visible = at > distance - 15 && at < distance + 105;
    tunnel.visible = distance > routeLength - 166;
  }

  return { barriers, update };
}
