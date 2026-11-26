import * as THREE from 'three';

const panelWidth = 512;
const panelHeight = 256;
const tau = Math.PI * 2;
const frameInterval = 1 / 20;
const adSpots = [
  {
    title: ['DESIRE'], label: 'AD EXCHANGE // LIVE AUCTION', tagline: 'YOUR NEXT THOUGHT IS SPONSORED.',
    ink: '#ffdbf6', accent: '#fc7dcc', dark: '#180b1d', ambient: '#5a2155', period: 7.5, size: 81,
    call: ['BID NOW'], sceneCut: [.23, .62], callCut: [.60, .88], closeUp: [1.39, -67, 1, -.038],
    poster: auctionPoster, overlay: auctionOverlay,
  },
  {
    title: ['BE YOU'], label: 'PERSONA EXCHANGE // PROFILE SELECT', tagline: 'THREE PREAPPROVED PERSONALITIES.',
    ink: '#ddfff2', accent: '#6cf7c2', dark: '#061d19', ambient: '#15554d', period: 10, size: 80,
    call: ['CHOOSE'], sceneCut: [.17, .57], callCut: [.56, .85], closeUp: [1.28, -59, -18, 0],
    poster: identityPoster, overlay: identityOverlay,
  },
  {
    title: ['RENT', 'RAIN'], label: 'WEATHER ON DEMAND // CLOUD 07', tagline: 'REAL WEATHER SOLD SEPARATELY.',
    ink: '#defaff', accent: '#81dfff', dark: '#071827', ambient: '#224f77', period: 8, size: 70,
    call: ['JUST ADD', 'WATER'], sceneCut: [.31, .79], callCut: [.59, .89], closeUp: [1.42, -85, 0, .052],
    poster: rainPoster, overlay: rainOverlay,
  },
  {
    title: ['IDEA™'], label: 'BOTTLED ORIGINALITY // NO. 01', tagline: 'EVERY BATCH IDENTICAL.',
    ink: '#fff1ca', accent: '#ffd185', dark: '#25100c', ambient: '#764025', period: 9, size: 90,
    call: ['LIMITED'], sceneCut: [.42, .78], callCut: [.58, .89], closeUp: [1.54, -94, 11, .026],
    poster: bottlePoster, overlay: bottleOverlay,
  },
];

function canvas2d(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas.getContext('2d');
}

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function orbit(ctx, x, y, rx, ry, rotation, start = 0, end = tau) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rotation, start, end);
  ctx.stroke();
}

function auctionPoster(ctx, spot) {
  const core = ctx.createRadialGradient(379, 119, 12, 379, 119, 116);
  core.addColorStop(0, '#ef6eb9');
  core.addColorStop(.28, '#8d316d');
  core.addColorStop(.77, '#32102b');
  core.addColorStop(1, '#32102b00');
  ctx.fillStyle = core;
  ctx.fillRect(251, 9, 255, 229);
  ctx.strokeStyle = '#ff97d386';
  ctx.lineWidth = 1.5;
  for (let ring = 0; ring < 6; ring++) orbit(ctx, 379, 119, 18 + ring * 14, 11 + ring * 11, -.6);

  ctx.fillStyle = '#f8b6e1';
  ctx.beginPath();
  ctx.moveTo(379, 95);
  ctx.lineTo(411, 119);
  ctx.lineTo(379, 145);
  ctx.lineTo(348, 119);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = spot.dark;
  ctx.beginPath();
  ctx.moveTo(380, 104);
  ctx.lineTo(399, 119);
  ctx.lineTo(380, 135);
  ctx.lineTo(362, 119);
  ctx.closePath();
  ctx.fill();
}

function identityPoster(ctx) {
  for (const [index, x] of [323, 390, 451].entries()) {
    ctx.save();
    ctx.translate(x, index === 1 ? 3 : 25);
    ctx.scale(index === 1 ? 1.14 : .84, index === 1 ? 1.14 : .84);
    const visor = ctx.createLinearGradient(-42, 61, 53, 169);
    visor.addColorStop(0, index === 1 ? '#6beaaf' : '#328d79');
    visor.addColorStop(1, '#103a42');
    ctx.fillStyle = visor;
    ctx.strokeStyle = index === 1 ? '#9bffcf' : '#539c93';
    ctx.lineWidth = 1.35;
    ctx.beginPath();
    ctx.moveTo(-65, 203);
    ctx.lineTo(-49, 173);
    ctx.lineTo(-22, 163);
    ctx.lineTo(-16, 144);
    ctx.bezierCurveTo(-33, 137, -48, 111, -40, 76);
    ctx.bezierCurveTo(-35, 54, -14, 51, 3, 56);
    ctx.bezierCurveTo(25, 58, 30, 75, 27, 91);
    ctx.lineTo(39, 107);
    ctx.lineTo(29, 113);
    ctx.lineTo(29, 133);
    ctx.lineTo(6, 145);
    ctx.lineTo(10, 163);
    ctx.lineTo(42, 178);
    ctx.lineTo(63, 203);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#071b21';
    roundedRect(ctx, -39, 87, 65, 21, 6);
    ctx.fill();
    ctx.fillStyle = '#d5fff787';
    ctx.fillRect(-30, 91, 47, 2);
    ctx.restore();
  }
}

function rainPoster(ctx) {
  const sky = ctx.createLinearGradient(0, 5, 0, 253);
  sky.addColorStop(0, '#72c4ed');
  sky.addColorStop(.34, '#295476');
  sky.addColorStop(1, '#081d2f');
  ctx.fillStyle = sky;
  ctx.fillRect(222, 3, 289, 248);
  const panes = [[252, 20, 62], [332, 20, 79], [432, 20, 59]];
  for (const [x, y, width] of panes) {
    ctx.fillStyle = '#071b32a5';
    roundedRect(ctx, x, y, width, 213, 28);
    ctx.fill();
    ctx.strokeStyle = '#9bdfff78';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.fillStyle = '#b9edffa0';
  ctx.beginPath();
  ctx.ellipse(371, 114, 21, 56, .27, 0, tau);
  ctx.fill();
  ctx.fillStyle = '#205983';
  ctx.beginPath();
  ctx.ellipse(369, 118, 14, 43, .27, 0, tau);
  ctx.fill();
}

function bottlePoster(ctx) {
  ctx.save();
  ctx.translate(390, 9);
  const glass = ctx.createLinearGradient(-70, 0, 76, 4);
  glass.addColorStop(0, '#60321b');
  glass.addColorStop(.37, '#e4a852');
  glass.addColorStop(.6, '#f8d285');
  glass.addColorStop(1, '#824321');
  const fill = ctx.createLinearGradient(0, 50, 0, 212);
  fill.addColorStop(0, '#ffdaa46a');
  fill.addColorStop(.47, '#e9a839');
  fill.addColorStop(.51, '#ad561f');
  fill.addColorStop(1, '#502216');
  ctx.fillStyle = fill;
  ctx.strokeStyle = glass;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-26, 18);
  ctx.lineTo(-26, 60);
  ctx.bezierCurveTo(-34, 86, -64, 89, -68, 119);
  ctx.lineTo(-68, 184);
  ctx.quadraticCurveTo(-66, 205, -50, 209);
  ctx.lineTo(50, 209);
  ctx.quadraticCurveTo(66, 205, 68, 184);
  ctx.lineTo(68, 119);
  ctx.bezierCurveTo(64, 89, 34, 86, 26, 60);
  ctx.lineTo(26, 18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffc877';
  roundedRect(ctx, -31, 13, 62, 29, 6);
  ctx.fill();
  ctx.fillStyle = '#462319';
  ctx.fillRect(-50, 117, 100, 59);
  ctx.strokeStyle = '#ffe1a1';
  ctx.lineWidth = 2;
  ctx.strokeRect(-46, 121, 92, 51);
  for (const rotation of [-.67, 0, .67]) orbit(ctx, 0, 146, 25, 8, rotation);
  ctx.restore();
}

function auctionOverlay(ctx, phase, spot, detail) {
  ctx.strokeStyle = spot.accent;
  ctx.lineWidth = 2.3;
  orbit(ctx, 393, 122, 89, 78, -.24, phase - .7, phase + .6);
  orbit(ctx, 393, 122, 96, 84, -.24, phase + 2.5, phase + 3);
  ctx.fillStyle = spot.ink;
  ctx.beginPath();
  ctx.arc(393 + Math.cos(phase) * 96, 122 + Math.sin(phase) * 79, 3, 0, tau);
  ctx.fill();
  ctx.globalAlpha = detail * .8;
  for (let offer = 0; offer < 5; offer++) {
    const y = 212 - offer * 24 - Math.sin(phase + offer * .64) * 8;
    ctx.fillStyle = `${spot.dark}c8`;
    ctx.fillRect(375 + offer * 4, y - 17, 111 - offer * 7, 18);
    ctx.fillStyle = spot.accent;
    ctx.fillRect(380 + offer * 4, y - 7, 31 + offer * 9, 1.5);
    ctx.fillRect(466, y - 8, 9, 3);
  }
  ctx.globalAlpha = 1;
}

function identityOverlay(ctx, phase, spot, detail) {
  const position = (1 - Math.cos(phase)) * .5;
  const y = 50 + position * 137;
  const scan = ctx.createLinearGradient(0, y - 22, 0, y + 24);
  scan.addColorStop(0, '#86ffcc00');
  scan.addColorStop(.51, '#86ffcc39');
  scan.addColorStop(1, '#86ffcc00');
  ctx.fillStyle = scan;
  ctx.fillRect(299, y - 22, 199, 46);
  ctx.strokeStyle = spot.accent;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(305, y, 188, 1);
  for (let slot = 0; slot < 3; slot++) {
    const selected = slot === Math.round(position * 2);
    const x = 316 + slot * 57;
    ctx.fillStyle = selected ? spot.accent : '#86ffcc52';
    ctx.fillRect(x, 37, 43, 5);
    ctx.strokeStyle = selected ? spot.accent : '#86ffcc24';
    ctx.globalAlpha = detail * (selected ? .9 : .48);
    ctx.strokeRect(x - 1, 46 - Math.sin(phase + slot) * 6, 46, 144);
    ctx.globalAlpha = 1;
  }
}

function rainOverlay(ctx, phase, spot, detail) {
  ctx.strokeStyle = '#c8f2ff';
  ctx.lineWidth = 1.65;
  for (let drop = 0; drop < 26; drop++) {
    const position = (drop * .618 + phase / tau * (2 + drop % 3)) % 1;
    const x = 283 + (drop * 59) % 218 - position * 19;
    const y = 12 + position * 206;
    ctx.globalAlpha = Math.sin(position * Math.PI) * (.24 + drop % 4 * .11) * (.65 + .35 * detail);
    ctx.beginPath();
    ctx.moveTo(x + 3, y - (15 + drop % 7));
    ctx.lineTo(x, y);
    ctx.stroke();
  }
  for (let impact = 0; impact < 8; impact++) {
    const age = (impact * .24 + phase / tau * (2 + impact % 3)) % 1;
    ctx.globalAlpha = detail * (1 - age) * .38;
    const x = 285 + (impact * 43) % 212;
    const y = 132 + (impact * 71) % 80;
    orbit(ctx, x, y, 2 + age * 27, 1 + age * 7, -.34);
  }
  ctx.globalAlpha = 1;
}

function bottleOverlay(ctx, phase, spot, detail) {
  const position = (1 - Math.cos(phase)) * .5;
  const x = 297 + position * 151;
  const shine = ctx.createLinearGradient(x - 15, 70, x + 45, 70);
  shine.addColorStop(0, '#ffcf7700');
  shine.addColorStop(.5, '#ffe2a56e');
  shine.addColorStop(1, '#ffcf7700');
  ctx.fillStyle = shine;
  ctx.beginPath();
  ctx.moveTo(x - 12, 215);
  ctx.lineTo(x + 28, 29);
  ctx.lineTo(x + 67, 29);
  ctx.lineTo(x + 29, 215);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#efc27773';
  ctx.lineWidth = 1.5;
  orbit(ctx, 392, 170, 93, 26, 0, 0, Math.PI);
  ctx.fillStyle = spot.ink;
  for (let particle = 0; particle < 19; particle++) {
    const rise = (particle * .69 + phase / tau * (1 + particle % 2)) % 1;
    const x = 281 + (particle * 53) % 223 + Math.sin(rise * 10 + particle) * 13;
    const y = 207 - rise * 182;
    ctx.globalAlpha = Math.sin(rise * Math.PI) * (.23 + detail * .5);
    ctx.beginPath();
    ctx.arc(x, y, 1 + particle % 3 * .48, 0, tau);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function makePoster(spot) {
  const ctx = canvas2d(panelWidth, panelHeight);
  const background = ctx.createLinearGradient(0, 0, panelWidth, panelHeight);
  background.addColorStop(0, spot.dark);
  background.addColorStop(1, spot.ambient);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, panelWidth, panelHeight);
  spot.poster(ctx, spot);
  return ctx.canvas;
}

function makeTypography(spot) {
  const ctx = canvas2d(panelWidth, panelHeight);
  const drop = ctx.createLinearGradient(12, 0, 369, 0);
  drop.addColorStop(0, spot.dark);
  drop.addColorStop(.64, `${spot.dark}ed`);
  drop.addColorStop(1, `${spot.dark}00`);
  ctx.fillStyle = drop;
  ctx.fillRect(0, 0, panelWidth, panelHeight);
  ctx.fillStyle = `${spot.dark}de`;
  ctx.fillRect(0, 216, panelWidth, 40);
  ctx.strokeStyle = `${spot.accent}8d`;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(9, 9, 494, 238);
  ctx.fillStyle = spot.accent;
  ctx.fillRect(23, 28, 16, 5);
  ctx.fillRect(25, 211, 461, 1.5);
  ctx.font = '700 15px monospace';
  ctx.fillText(spot.label, 48, 35);
  ctx.fillStyle = spot.ink;
  ctx.font = '700 17px monospace';
  ctx.fillText(spot.tagline, 25, 238, 402);
  return ctx.canvas;
}

function dissolve(progress, [start, end]) {
  const blendIn = THREE.MathUtils.smoothstep(progress, start, start + .065);
  const blendOut = THREE.MathUtils.smoothstep(progress, end - .065, end);
  return blendIn * (1 - blendOut);
}

function paintHeadlines(ctx, spot, blend) {
  const showCall = blend >= .5;
  const title = showCall ? spot.call : spot.title;
  const shift = showCall ? (1 - blend) * 22 : -22 * blend;
  ctx.globalAlpha = showCall
    ? THREE.MathUtils.smoothstep(blend, .5, 1)
    : 1 - THREE.MathUtils.smoothstep(blend, 0, .5);
  ctx.fillStyle = spot.ink;
  ctx.font = `900 ${spot.size}px "Arial Narrow", Arial, sans-serif`;
  if (title.length === 2) {
    ctx.fillText(title[0], 23, 105 + shift, 264);
    ctx.fillText(title[1], 23, 170 + shift, 264);
  } else {
    ctx.fillText(title[0], 23, 152 + shift, 293);
  }
  ctx.globalAlpha = 1;
}

function drawCloseUp(ctx, photo, spot, index, strength, phase) {
  const [zoom, x, y, turn] = spot.closeUp;
  const lift = Math.sin(phase) * 10;
  ctx.save();
  ctx.beginPath();
  if (index === 0) {
    // The auction cuts diagonally into the glasses as bids move up the frame.
    ctx.moveTo(339 - strength * 123, 0);
    ctx.lineTo(panelWidth, 0);
    ctx.lineTo(panelWidth, panelHeight);
    ctx.lineTo(370 - strength * 120, panelHeight);
  } else if (index === 1) {
    // Switch between vertical, misregistered slices of the three approved profiles.
    for (let card = 0; card < 3; card++) {
      ctx.rect(291 + card * 72, 0, 66 * strength, panelHeight);
    }
  } else if (index === 2) {
    // A band of compressed weather advances across the wet macro shot.
    ctx.rect(180, 18 + (1 - strength) * 110, 332, 216 * strength);
  } else {
    ctx.ellipse(388, 134, 85 + strength * 70, 78 + strength * 98, turn, 0, tau);
  }
  ctx.clip();
  ctx.globalAlpha = strength * .95;
  ctx.translate(377, 119);
  ctx.rotate(turn * strength);
  ctx.drawImage(photo, -225 + x + lift, -141 + y - strength * 9, 382 * zoom, 276 * zoom);
  ctx.restore();
}

function paintPhoto(ctx, photo, spot, index, phase, detail) {
  ctx.fillStyle = spot.dark;
  ctx.fillRect(0, 0, panelWidth, panelHeight);
  const scale = 1.03 + Math.sin(phase) * .034;
  ctx.globalAlpha = 1 - detail * .33;
  ctx.drawImage(photo, 156 + Math.cos(phase) * 12, -12 - Math.sin(phase) * 5, 382 * scale, 276 * scale);
  ctx.globalAlpha = 1;
  if (detail > .001) {
    drawCloseUp(ctx, photo, spot, index, detail, phase);
    ctx.globalAlpha = Math.sin(detail * Math.PI) * .18;
    ctx.fillRect(180, 0, 332, panelHeight);
    ctx.globalAlpha = 1;
  }
}

function makePhotoPanels(image) {
  const sourceWidth = Math.floor(image.naturalWidth / 2);
  const sourceHeight = Math.floor(image.naturalHeight / 2);
  const width = 372;
  const height = 276;
  const ratio = width / height;
  const cropWidth = Math.min(sourceWidth - 4, (sourceHeight - 4) * ratio);
  const cropHeight = cropWidth / ratio;
  return adSpots.map((_, index) => {
    const ctx = canvas2d(width, height);
    const x = (index % 2) * sourceWidth + (sourceWidth - cropWidth) * .56;
    const y = Math.floor(index / 2) * sourceHeight + (sourceHeight - cropHeight) * .5;
    ctx.drawImage(image, x, y, cropWidth, cropHeight, 0, 0, width, height);
    return ctx.canvas;
  });
}

function makeTileMaterial(atlas, index) {
  const material = new THREE.MeshBasicMaterial({
    map: atlas, toneMapped: false, side: THREE.DoubleSide, name: `Ad Exchange – ${adSpots[index].title.join(' ')}`,
  });
  const insetX = 2 / (panelWidth * 2);
  const insetY = 2 / (panelHeight * 2);
  const tile = new THREE.Vector4(
    .5 - 2 * insetX, .5 - 2 * insetY, (index % 2) * .5 + insetX, (1 - Math.floor(index / 2)) * .5 + insetY,
  );
  material.onBeforeCompile = (shader) => {
    shader.uniforms.adTile = { value: tile };
    shader.vertexShader = `uniform vec4 adTile;\n${shader.vertexShader}`.replace('#include <uv_vertex>', `
      #include <uv_vertex>
      #ifdef USE_MAP
        vMapUv = vMapUv * adTile.xy + adTile.zw;
      #endif`);
  };
  return material;
}

function motionStatus(index, phase) {
  const progress = (1 - Math.cos(phase)) * .5;
  const statuses = [
    `TOP BID / ${Math.floor(42 + progress * 113)} CR`,
    ['CALM', 'HERO', 'REBEL'][Math.round(progress * 2)] + ' / APPROVED',
    `PRECIPITATION / ${Math.floor(72 + progress * 28)}%`,
    `NOVELTY / ${(99.4 + progress * .62).toFixed(1)}%`,
  ];
  return { progress, status: statuses[index] };
}

export function makeBillboardMotion() {
  const ctx = canvas2d(panelWidth * 2, panelHeight * 2);
  const atlas = new THREE.CanvasTexture(ctx.canvas);
  atlas.colorSpace = THREE.SRGBColorSpace;
  atlas.generateMipmaps = false;
  atlas.minFilter = THREE.LinearFilter;
  const materials = adSpots.map((_, index) => makeTileMaterial(atlas, index));
  const posters = adSpots.map(makePoster);
  const typeLayers = adSpots.map(makeTypography);
  const image = new Image();
  let photos;
  let time = 0;
  let frameTime = 0;
  let needsPaint = true;
  let still = false;
  let disposed = false;

  function paint() {
    for (const [index, spot] of adSpots.entries()) {
      ctx.save();
      ctx.translate((index % 2) * panelWidth, Math.floor(index / 2) * panelHeight);
      ctx.beginPath();
      ctx.rect(0, 0, panelWidth, panelHeight);
      ctx.clip();
      const progress = ((still ? spot.period * .13 : time) % spot.period) / spot.period;
      const phase = tau * progress;
      const detail = dissolve(progress, spot.sceneCut);
      if (photos) {
        paintPhoto(ctx, photos[index], spot, index, phase, detail);
      } else {
        ctx.drawImage(posters[index], 0, 0);
      }
      spot.overlay(ctx, phase, spot, detail);
      ctx.drawImage(typeLayers[index], 0, 0);
      paintHeadlines(ctx, spot, dissolve(progress, spot.callCut));
      const { progress: meter, status } = motionStatus(index, phase);
      ctx.fillStyle = spot.accent;
      ctx.font = '700 14px monospace';
      ctx.fillText(status, 25, 192);
      ctx.fillStyle = `${spot.accent}54`;
      ctx.fillRect(25, 199, 130, 2);
      ctx.fillStyle = spot.accent;
      ctx.fillRect(25, 199, 20 + meter * 106, 2);
      ctx.restore();
    }
    atlas.needsUpdate = true;
    needsPaint = false;
  }

  image.src = `${import.meta.env?.BASE_URL ?? './'}ads/ad-exchange.webp`;
  image.decode().then(() => {
    if (disposed || image.naturalWidth < 12 || image.naturalHeight < 12) return;
    photos = makePhotoPanels(image);
    needsPaint = true;
  }).catch(() => {});
  paint();

  function update(delta, active = true, reducedMotion = false) {
    if (still !== reducedMotion) {
      still = reducedMotion;
      needsPaint = true;
    }
    if (!active) return;
    if (!still) {
      time += delta;
      frameTime += delta;
    }
    if (needsPaint || frameTime >= frameInterval) {
      frameTime %= frameInterval;
      paint();
    }
  }

  function dispose() {
    disposed = true;
    atlas.dispose();
    for (const material of materials) material.dispose();
  }

  return { materials, update, dispose };
}
