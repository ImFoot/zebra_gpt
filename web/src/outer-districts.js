import * as THREE from 'three';
import { mesh, placard, span } from './scenery-parts.js';

const panel = new THREE.PlaneGeometry();
const sphere = new THREE.SphereGeometry(1, 14, 10);
const hoop = new THREE.TorusGeometry(1, .032, 8, 38);
const vault = new THREE.TorusGeometry(1, .044, 8, 36, Math.PI);
const reflector = new THREE.SphereGeometry(1, 32, 12, 0, Math.PI * 2, 0, .94);
const pipe = new THREE.CylinderGeometry(1, 1, 1, 14);
const foliage = new THREE.PlaneGeometry(1, 1, 4, 8);
const blade = foliage.getAttribute('position');
for (let vertex = 0; vertex < blade.count; vertex++) {
  const t = blade.getY(vertex) + .5;
  const width = blade.getX(vertex);
  blade.setXYZ(vertex, width * Math.sin(Math.PI * t) ** .74, .86 * Math.sin(Math.PI * t * .72) - .33 * t ** 3,
    -t - width * width * .24 * Math.sin(Math.PI * t));
}
foliage.computeVertexNormals();

function surface(width, height, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext('2d'));
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

function stageBackdrop(kind) {
  return surface(640, 320, (ctx) => {
    const city = kind === 0;
    const sky = ctx.createLinearGradient(0, 0, 0, 320);
    sky.addColorStop(0, city ? '#1c1542' : '#253655');
    sky.addColorStop(.70, city ? '#ac5279' : '#286585');
    sky.addColorStop(1, '#172943');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 640, 320);
    const x = city ? 416 : 303;
    const glow = ctx.createRadialGradient(x, 120, 8, x, 120, 148);
    glow.addColorStop(0, city ? '#ffcd89b0' : '#9cdffff0');
    glow.addColorStop(1, '#997aa300');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 640, 320);
    ctx.beginPath();
    ctx.arc(x, 120, city ? 43 : 28, 0, Math.PI * 2);
    ctx.fillStyle = city ? '#ffd9a4' : '#e5f4ff';
    ctx.fill();
    for (let layer = 0; layer < 3; layer++) {
      ctx.fillStyle = city ? ['#58385e', '#302545', '#151d32'][layer] : ['#425971', '#2a4b66', '#1e3a55'][layer];
      for (let i = 0; i < 19; i++) {
        const px = i * 37 - (layer * 11 % 23);
        const top = 158 + layer * 25 + ((i * 27 + layer * 77) % 64);
        if (city) {
          ctx.fillRect(px, top, 14 + i % 5 * 3, 310 - top);
          if ((i + layer) % 4 === 0) ctx.fillRect(px + 6, top - 13, 2, 13);
        } else {
          ctx.beginPath();
          ctx.moveTo(px - 55, 302);
          ctx.lineTo(px + 19, top - (i % 3) * 36);
          ctx.lineTo(px + 82, 302);
          ctx.fill();
        }
      }
    }
    for (let light = 0; light < 330; light++) {
      const lx = (light * 83) % 641;
      const ly = 214 + ((light * 41) % 109);
      ctx.fillStyle = light % 4 ? '#ddc28e37' : '#8adcff6e';
      ctx.fillRect(lx, ly, city ? 2 : 3 + light % 14, 1);
    }
    ctx.fillStyle = '#10182838';
    for (let line = 0; line < 320; line += 4) ctx.fillRect(0, line, 640, 1);
  });
}

export function towerWindows(dawn) {
  const map = surface(192, 240, (ctx) => {
    ctx.fillStyle = dawn ? '#5b6676' : '#223348';
    ctx.fillRect(0, 0, 192, 240);
    for (let floor = 0; floor < 20; floor++) {
      ctx.fillStyle = dawn ? '#a5a4a31f' : '#a6bad729';
      ctx.fillRect(0, floor * 12 + 9, 192, 1);
      for (let column = 0; column < 12; column++) {
        const seed = (floor * 17 + column * 39 + floor * column * 7) % 37;
        ctx.fillStyle = seed > 29 ? (dawn ? '#cfbc96' : '#83c1d6') : seed > 24 ?
          (dawn ? '#a5918e' : '#ddbd89') : dawn ? '#4d596c' : '#18263d';
        ctx.fillRect(3 + column * 16, floor * 12 + 3, 9, 4);
      }
    }
  });
  return new THREE.MeshBasicMaterial({ map });
}

export function makeOuterDistricts(compact, { concrete, iron, frame, black, light, glass }) {
  const foliageMaterial = new THREE.MeshStandardMaterial({
    color: 0x9cc866, roughness: .72, side: THREE.DoubleSide,
    map: surface(96, 96, (ctx) => {
      const green = ctx.createLinearGradient(0, 0, 96, 0);
      green.addColorStop(0, '#50803a');
      green.addColorStop(.43, '#a5cc75');
      green.addColorStop(.50, '#d5e7ab');
      green.addColorStop(.56, '#62984d');
      green.addColorStop(1, '#365e43');
      ctx.fillStyle = green;
      ctx.fillRect(0, 0, 96, 96);
      ctx.strokeStyle = '#b2d78d82';
      for (let vein = 12; vein < 96; vein += 11) {
        ctx.beginPath();
        ctx.moveTo(3, vein - 9);
        ctx.lineTo(48, vein + 3);
        ctx.lineTo(92, vein - 9);
        ctx.stroke();
      }
    }),
  });
  const glaze = new THREE.MeshPhysicalMaterial({ color: 0x98d7cb, transparent: true, opacity: .075,
    depthWrite: false, roughness: .33, metalness: .22, side: THREE.DoubleSide });
  const copper = new THREE.MeshStandardMaterial({ color: 0x97725c, metalness: .62, roughness: .39 });
  const slate = new THREE.MeshStandardMaterial({ color: 0x263b50, metalness: .39, roughness: .59 });
  const jade = new THREE.MeshBasicMaterial({ color: 0xb1fba0, toneMapped: false });
  const amber = new THREE.MeshBasicMaterial({ color: 0xffca8c, toneMapped: false });
  const ultraviolet = new THREE.MeshBasicMaterial({ color: 0xaf8cff, toneMapped: false });
  const ice = new THREE.MeshBasicMaterial({ color: 0x86d8fa, toneMapped: false });
  const windowWall = towerWindows(false);
  const projections = [0, 1].map(kind => new THREE.MeshBasicMaterial({ map: stageBackdrop(kind) }));
  projections.forEach(({ map }) => map.repeat.set(.89, 1));
  const slateSign = placard('TAKE  404', 'THE LIGHTING IS INTENTIONAL', '#ffeeaf', '#172136');
  const booksSign = placard('FIRST DRAFT', 'WRITTEN BY HAND', '#f2d5a2', '#292333');
  const freightSign = placard('FRAGILE', 'CONTAINS ORIGINAL IDEAS', '#f8bf8a', '#392628');
  const bark = new THREE.MeshStandardMaterial({ color: 0x7a5637, roughness: .89 });
  const projectionBeam = new THREE.ShaderMaterial({
    uniforms: { tint: { value: new THREE.Color(0x92c9fa) } },
    vertexShader: `
      varying vec2 ray;
      void main() { ray = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: `
      uniform vec3 tint;
      varying vec2 ray;
      void main() {
        float spread = mix(.09, .49, 1.0 - ray.y);
        float side = 1.0 - smoothstep(spread * .18, spread, abs(ray.x - .5));
        float intensity = side * (1.0 - smoothstep(.64, .99, 1.0 - ray.y)) * .21;
        gl_FragColor = vec4(tint, intensity);
        #include <colorspace_fragment>
      }
    `,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const manuscript = new THREE.MeshBasicMaterial({
    map: surface(512, 260, (ctx) => {
      const paper = ctx.createLinearGradient(0, 0, 512, 0);
      paper.addColorStop(0, '#bd8d57');
      paper.addColorStop(.17, '#fbdd98');
      paper.addColorStop(1, '#d4ad72');
      ctx.fillStyle = paper;
      ctx.fillRect(0, 0, 512, 260);
      ctx.strokeStyle = '#946347';
      ctx.strokeRect(19, 15, 474, 230);
      ctx.fillStyle = '#5b3742';
      ctx.font = 'italic 37px Georgia';
      ctx.fillText('An original thought', 47, 62, 418);
      for (let row = 0; row < 8; row++) {
        ctx.beginPath();
        ctx.moveTo(51, 91 + row * 16);
        for (let mark = 1; mark <= 39 - row * 9 % 13; mark++) {
          ctx.quadraticCurveTo(48 + mark * 10, 88 + row * 16 + (mark + row) % 5 * 2,
            51 + mark * 10, 92 + row * 16);
        }
        ctx.stroke();
      }
    }),
  });
  const pose = new THREE.Object3D();
  const tint = new THREE.Color();

  function garden(group, batch, catalog, z, index, stage, moving) {
    const plants = new THREE.InstancedMesh(foliage, foliageMaterial, compact ? 30 : 54);
    let placed = 0;
    for (const side of [-1, 1]) {
      const block = index + Number(side > 0) * 3;
      batch.add(concrete, side * 10.66, -.45, z, 5.55, .83, 11.98, 0x667d6c);
      batch.add(copper, side * 8.10, .25, z, .22, .49, 11.91, 0xad9583);
      batch.add(light, side * 7.96, .45, z, .039, .037, 11.91, stage.accent);
      batch.add(black, side * 9.63, .53, z, 2.14, .71, 10.62);
      batch.add(concrete, side * 11.14, .72, z - 1.01, 1.35, 1.42, 6.95, 0x7c8371);
      batch.add(frame, side * 12.47, 3.74, z - 5.9, .14, 7.53, .30, 0x789688);
      mesh(group, panel, glaze, side * 12.45, 4.65, z, 12, 7.30, 1, -side * Math.PI / 2);
      for (let leaf = 0; leaf < plants.instanceMatrix.count / 2; leaf++) {
        const angle = leaf * 2.39996 + block;
        pose.position.set(side * (8.66 + (leaf * 37 % 26) * .113), .72 + (leaf % 4) * .1, z - 4.97 + (leaf * 31 % 101) * .098);
        pose.rotation.set(-.14 + (leaf % 4) * .22, angle, .26 * Math.sin(angle));
        const scale = 1.02 + (leaf * 19 + block * 9) % 13 * .132;
        pose.scale.set(scale * .74, scale * 1.12, scale);
        pose.updateMatrix();
        plants.setMatrixAt(placed, pose.matrix);
        plants.setColorAt(placed++, tint.set(leaf % 5 ? 0xa5e285 : 0xf7d886));
      }
      if (block % 2 === 0) {
        const blossom = new THREE.Group();
        blossom.position.set(side * 11.16, 3.35, z - 1.5);
        for (let petal = 0; petal < 6; petal++) {
          const angle = petal * Math.PI / 3;
          const lobe = mesh(blossom, sphere, petal % 2 ? jade : amber, Math.cos(angle) * .41, Math.sin(angle) * .41, 0, .35, .13, .084);
          lobe.rotation.z = angle;
        }
        mesh(blossom, sphere, jade, 0, 0, .065, .155, .155, .094);
        group.add(blossom);
        moving.push({ mesh: blossom, y: 3.35, phase: block * .5, amount: .38 });
        span(group, frame, new THREE.Vector3(side * 11.18, 1.12, z - 1.8), new THREE.Vector3(side * 11.16, 3.40, z - 1.5), .052);
      }
      span(group, frame, new THREE.Vector3(side * 12.44, 7.35, z - 5.82), new THREE.Vector3(0, 11.25, z - 5.82), .14);
      span(group, jade, new THREE.Vector3(side * 12.29, 7.31, z - 5.76), new THREE.Vector3(0, 11.02, z - 5.76), .025);
      const canopy = mesh(group, panel, glaze, side * 6.2, 9.25, z, 13.00, 11.98, 1);
      canopy.rotation.set(-Math.PI / 2, 0, -side * .296, 'ZXY');
    }
    group.add(plants);
    if (index % 4 === 2) {
      mesh(group, vault, frame, 0, .28, z, 9.06, 7.65, 1.56);
      mesh(group, vault, jade, 0, .38, z + .15, 8.93, 7.53, .44);
    }
    if (index === 10 || index === 33) {
      const side = index === 10 ? 1 : -1;
      const crown = new THREE.Vector3(side * 8.75, 8.94, z - .99);
      span(group, bark, new THREE.Vector3(side * 11.35, .7, z + 2.67), crown, .40);
      for (let fork = 0; fork < 6; fork++) {
        const tip = new THREE.Vector3(side * (7.98 - fork * 1.55), 9.3 + Math.sin(fork) * .55, z + (fork % 2 ? 2.59 : -3.32));
        span(group, bark, crown, tip, .135 + (fork % 2) * .042);
        mesh(group, sphere, foliageMaterial, tip.x, tip.y + .19, tip.z, 2.16, .73, 1.81, fork);
        mesh(group, sphere, jade, tip.x, tip.y - .37, tip.z + .34, .129, .172, .128);
      }
    }
  }

  function backlot(group, batch, catalog, z, index, stage, moving) {
    for (const side of [-1, 1]) {
      const block = index + (side > 0 ? 2 : 0);
      batch.add(concrete, side * 9.68, -.25, z, 3.82, .49, 11.94, 0x828195);
      batch.add(iron, side * 16.25, 5.90, z, .78, 12.3, 11.98, 0x58617b);
      batch.add(slate, side * 11.42, 5.02, z + .4, .58, 6.66, 10.58, 0x8593a4);
      mesh(group, panel, projections[Math.floor(block / 4) % projections.length], side * 11.10, 5, z + .40,
        10.11, 6.15, 1, -side * Math.PI / 2);
      batch.add(light, side * 10.98, 1.89, z + .41, .061, .026, 10.2, stage.accent);
      for (const x of [8.67, 13.15]) {
        batch.add(black, side * x, .64, z - 2.32, 1.18, 1.27, 1.28);
        batch.add(frame, side * x, 1.32, z - 2.32, 1.23, .088, 1.34, 0x677181);
      }
      if (block % 2 === 1) {
        const spotlight = mesh(group, pipe, slate, side * 8.53, 3.31, z + 4.55, .37, .67, .37);
        spotlight.rotation.x = Math.PI * .40;
        mesh(group, sphere, amber, side * 8.52, 3.40, z + 4.88, .22, .19, .05);
        span(group, frame, new THREE.Vector3(side * 8.53, .20, z + 4.11), new THREE.Vector3(side * 8.53, 3.05, z + 4.55), .083);
        batch.add(light, side * 8.62, .44, z + 4.53, .11, .04, 1.70, stage.lamp);
        if (block % 4 === 1) mesh(group, panel, projectionBeam, side * 8.02, 2.16, z + 4.58, 2.82, 2.73, 1).rotation.z = -side * .39;
      }
    }
    if (index % 4 === 2) {
      batch.add(frame, 0, 8.51, z, 26, .44, .89, 0x687799);
      mesh(group, panel, slateSign, 0, 7.98, z + .51, 7.42, 1.77, 1);
      for (let fixture = -3; fixture <= 3; fixture++) {
        batch.add(black, fixture * 3.47, 7.79, z, .47, .51, .44);
        batch.add(light, fixture * 3.47, 7.77, z + .25, .33, .20, .032, fixture % 2 ? stage.lamp : stage.accent);
      }
    }
    if (index === 10 || index === 30) {
      const side = index === 10 ? -1 : 1;
      const base = new THREE.Vector3(side * 13.4, 1.17, z - 1.1);
      const pivot = new THREE.Vector3(side * 12.5, 10.42, z - 1.10);
      const head = new THREE.Vector3(side * 3.72, 8.47, z + 2.18);
      span(group, slate, base, pivot, .32);
      span(group, copper, pivot, head, .22);
      span(group, frame, new THREE.Vector3(pivot.x, pivot.y + .85, pivot.z), new THREE.Vector3(head.x, head.y + .23, head.z), .066);
      mesh(group, hoop, slate, head.x, head.y - .42, head.z, .58, .70, .65);
      batch.add(black, head.x, head.y - .49, head.z + .48, .56, .51, .97);
      mesh(group, sphere, ice, head.x, head.y - .47, head.z + .94, .18, .18, .065);
    }
  }

  function archive(group, batch, catalog, z, index, stage, moving) {
    for (const side of [-1, 1]) {
      const block = index + Number(side > 0);
      batch.add(black, side * 13.55, 5.59, z, .87, 11.28, 12);
      batch.add(copper, side * 9.87, 4.85, z + 5.74, .43, 9.71, .56, 0x967955);
      batch.add(slate, side * 12.66, 4.89, z, .79, 9.90, 11.33, 0x66789b);
      for (let shelf = 0; shelf < 5; shelf++) {
        const y = 1.13 + shelf * 1.68;
        batch.add(copper, side * 12.22, y, z, .8, .084, 10.92, 0xd0a076);
        batch.add(light, side * 11.80, y - .07, z, .043, .036, 10.70, shelf % 3 ? stage.lamp : stage.accent);
        for (let book = 0; book < (compact ? 5 : 8); book++) {
          const h = .49 + ((block + book * 11 + shelf * 7) % 10) * .064;
          batch.add(frame, side * 11.97, y + h * .5, z - 4.75 + book * (compact ? 2.24 : 1.35), .40, h,
            1.02, [0x98704e, 0x766287, 0x3c5868, 0xb99462][(block + shelf * 3 + book) % 4]);
        }
      }
      batch.add(concrete, side * 8.64, .54, z + 1.9, 1.54, 1.17, 2.56, 0x716b73);
      batch.add(glass, side * 8.64, 1.49, z + 1.9, 1.51, .67, 2.50, 0x2d4b5b);
      batch.add(light, side * 7.89, 1.24, z + 1.90, .044, .024, 2.45, stage.lamp);
      if (block % 3 === 1) {
        const label = mesh(group, panel, booksSign, side * 9.59, 3.93, z, 3.73, 1.32, 1, -side * .84);
        label.rotation.z = side * -.10;
        moving.push({ mesh: label, y: 3.93, phase: block * 1.23, amount: .44 });
      }
    }
    mesh(group, vault, slate, 0, 4.69, z + 5.3, 10.01, 5.91, 1.0);
    if (index % 2 === 0) {
      mesh(group, vault, amber, 0, 4.69, z + 5.53, 9.85, 5.75, .30);
      batch.add(glass, 0, 10.51, z - 1.88, 5.85, .25, 8.13);
    }
    if (index === 10 || index === 34) {
      for (const side of [-1, 1]) {
        mesh(group, panel, manuscript, side * 2.36, 7.54, z + .07, 5.10, 2.64, 1, -side * .54).rotation.z = side * .06;
        batch.add(copper, side * 2.34, 6.18, z, 5.0, .10, .20, 0xe6b07c, -side * .54);
      }
      batch.add(light, 0, 7.56, z + 1.31, .047, 2.72, .063, stage.lamp);
    }
  }

  function freight(group, batch, catalog, z, index, stage, moving) {
    for (const side of [-1, 1]) {
      const block = index + Number(side > 0) * 3;
      const paint = [0x615e7b, 0x9a5c55, 0x567b88, 0x9d805a][block % 4];
      batch.add(black, side * 7.54, .22, z, .50, .51, 11.98);
      batch.add(light, side * 7.25, .49, z, .041, .036, 11.92, stage.lamp);
      batch.add(concrete, side * 13.18, -.56, z, 10.25, 1.04, 11.99, 0x777786);
      const levels = 1 + block * 7 % 3;
      for (let stack = 0; stack < levels; stack++) {
        const x = side * (10.25 + stack * 1.12);
        const y = 1.28 + stack * 2.45;
        batch.add(iron, x, y, z - .52, 3.55, 2.45, 10.24, paint);
        for (const corner of [-1, 1]) {
          batch.add(frame, x - side * 1.81, y, z - .52 + corner * 4.91, .16, 2.54, .25, 0x987a70);
          for (const end of [-1, 1]) {
            batch.add(frame, x - side * 1.83, y + end * 1.14, z - .52, .145, .13, 10.35, 0x92929b);
          }
        }
        if (stack === 0 && block % 3 === 0) {
          mesh(group, panel, freightSign, x - side * 1.87, y + .15, z + 1.28, 4.12, .97, 1, -side * Math.PI / 2);
        }
      }
      if (block % 4 === 1) {
        const x = side * 17.28;
        batch.add(slate, x, 6.26, z - .7, 1.16, 12.62, 1.36, 0xa88478);
        batch.add(copper, side * 12.12, 11.38, z - .7, 11.20, .65, .82, 0xc38468);
        span(group, frame, new THREE.Vector3(x, 12.46, z - .7), new THREE.Vector3(side * 8.45, 11.54, z - .7), .067);
        span(group, frame, new THREE.Vector3(side * 8.45, 11.42, z - .7), new THREE.Vector3(side * 8.45, 7.68, z - .7), .034);
        const cargo = mesh(group, hoop, copper, side * 8.45, 7.33, z - .68, .40, .66, .5);
        moving.push({ mesh: cargo, y: 7.33, phase: block, amount: .29 });
      }
    }
    for (const track of [-1.82, 1.82]) {
      batch.add(frame, track, .016, z, .042, .023, 11.97, 0x94adb8);
      for (let tie = -2; tie <= 2; tie++) batch.add(black, track, .008, z + tie * 2.13, .72, .018, .15);
    }
    if (index % 9 === 2) {
      batch.add(iron, 0, 9.04, z + .31, 17.93, .94, .64, 0x83616b);
      batch.add(light, 0, 8.56, z + .65, 16.87, .057, .043, stage.lamp);
      for (let brace = -3; brace <= 3; brace++) {
        const x = brace * 2.32;
        span(group, copper, new THREE.Vector3(x - .88, 8.57, z + .76), new THREE.Vector3(x + .88, 9.51, z + .76), .069);
      }
      for (const side of [-1, 1]) {
        batch.add(frame, side * 8.59, 4.40, z + .31, .46, 8.76, .57, 0x918295);
        batch.add(light, side * 8.29, 5.80, z + .60, .042, 3.88, .046, stage.accent);
      }
    }
  }

  function uplink(group, batch, catalog, z, index, stage, moving) {
    for (const side of [-1, 1]) {
      const block = index + Number(side > 0) * 2;
      const far = side * (22 + block * 17 % 24);
      const roof = -3.4 + (block * 13 % 11);
      batch.add(slate, far, roof - 10, z - 2.02, 6.8, 20, 8.72, 0x828bab);
      mesh(group, panel, windowWall, far - side * 3.46, roof - 6.14, z - 2.02, 8.63, 12.22, 1, -side * Math.PI / 2);
      mesh(group, panel, windowWall, far, roof - 6.14, z + 2.39, 6.69, 12.22, 1);
      batch.add(black, side * 7.58, -.12, z, .48, .41, 11.97);
      batch.add(light, side * 7.31, .12, z, .05, .064, 11.93, stage.lamp);
      batch.add(slate, side * 9.1, -.77, z, 2.82, 1.42, 11.97, 0x7982a1);
      if (block % 3 !== 1) {
        const x = side * (11.16 + block % 3);
        const h = 5.71 + block % 3 * .95;
        batch.add(frame, x, h / 2, z, .33, h, .42, 0x889bb7);
        const radar = new THREE.Group();
        radar.position.set(x, h, z);
        radar.rotation.set(0, -side * .47, side * .32);
        mesh(radar, reflector, copper, 0, -.25, 0, 2.53, 1.14, 2.53);
        mesh(radar, hoop, ice, 0, .42, 0, 2.02, 2.02, .64).rotation.x = -Math.PI / 2;
        span(radar, frame, new THREE.Vector3(0, .38, 0), new THREE.Vector3(0, 1.96, 0), .061);
        mesh(radar, sphere, ultraviolet, 0, 1.97, 0, .174, .174, .174);
        group.add(radar);
        const pulse = mesh(group, hoop, side > 0 ? ice : ultraviolet, x, h + 3.64, z - .74, 1.55, 1.55, .50);
        pulse.rotation.x = -.77;
        moving.push({ mesh: pulse, y: h + 3.64, phase: block, amount: .72 });
      }
    }
    if (index % 5 === 2) {
      mesh(group, vault, slate, 0, .60, z - 1.39, 8.13, 9.78, 2.52);
      mesh(group, vault, ice, 0, .70, z - 1.22, 7.99, 9.57, .72);
      mesh(group, vault, ultraviolet, 0, .73, z - 2.20, 8.19, 9.83, .64);
    }
    if (index === 12 || index === 36) {
      const side = index === 12 ? 1 : -1;
      const x = side * 12.95;
      const antenna = new THREE.Group();
      antenna.position.set(x, 10.42, z - .91);
      antenna.rotation.set(.61, side * .25, -side * .28);
      mesh(antenna, reflector, copper, 0, -1.26, 0, 5.23, 2.35, 5.23);
      mesh(antenna, hoop, ice, 0, .13, 0, 4.21, 4.21, 1.15).rotation.x = -Math.PI / 2;
      mesh(antenna, sphere, ultraviolet, 0, 3.2, 0, .28, .28, .28);
      for (const strut of [-1, 1]) {
        span(antenna, frame, new THREE.Vector3(strut * 2.87, .02, .28), new THREE.Vector3(0, 3.19, 0), .081);
      }
      group.add(antenna);
      moving.push({ mesh: antenna, y: 10.42, phase: index, amount: .22 });
      batch.add(frame, x, 5.23, z - .91, .67, 10.45, .77, 0x788b9e);
    }
  }

  return {
    stages: {
      garden: { build: garden, deck: concrete },
      backlot: { build: backlot },
      archive: { build: archive, deck: slate },
      freight: { build: freight, deck: concrete },
      uplink: { build: uplink, deck: slate },
    },
    update(time) {
      projections.forEach(({ map }, index) => { map.offset.x = .055 + Math.sin(time * .46 + index * 1.96) * .054; });
    },
  };
}
