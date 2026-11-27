import * as THREE from 'three';

const venues = [
  { sign: 'NIGHT SHIFT', mark: 'COFFEE / 24H', glyphs: '夜間営業', color: '#ff9d61', base: '#381c1c' },
  { sign: 'OPTIC', mark: 'LOST IMAGE REPAIR', glyphs: '映像修理', color: '#80fff2', base: '#143b43' },
  { sign: 'AFTER / HOURS', mark: 'ORIGINALS ONLY', glyphs: '夜市', color: '#ffa6dd', base: '#3d1d3b' },
  { sign: 'CONTINUUM', mark: 'TRAVEL & INFORMATION', glyphs: '終夜運行', color: '#a2ffc5', base: '#123b36' },
];

function canvasMap(width, height, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  paint(canvas.getContext('2d'));
  const result = new THREE.CanvasTexture(canvas);
  result.colorSpace = THREE.SRGBColorSpace;
  result.anisotropy = 4;
  return result;
}

function display(venue) {
  return canvasMap(768, 256, (ctx) => {
    const light = ctx.createLinearGradient(0, 0, 768, 256);
    light.addColorStop(0, '#0a1216');
    light.addColorStop(.46, venue.base);
    light.addColorStop(1, '#060d16');
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, 768, 256);
    ctx.fillStyle = '#151e24';
    ctx.fillRect(0, 0, 768, 79);
    ctx.fillStyle = `${venue.color}b5`;
    ctx.fillRect(0, 76, 768, 3);
    ctx.fillStyle = venue.color;
    ctx.font = '800 33px system-ui';
    ctx.fillText(venue.sign, 20, 43, 547);
    ctx.font = '700 14px monospace';
    ctx.fillText(venue.mark, 23, 66, 660);

    for (let window = 0; window < 5; window++) {
      const x = 10 + window * 151;
      const pane = ctx.createLinearGradient(x, 87, x + 136, 231);
      pane.addColorStop(0, `${venue.color}91`);
      pane.addColorStop(.42, `${venue.base}f0`);
      pane.addColorStop(1, '#091421');
      ctx.fillStyle = pane;
      ctx.fillRect(x, 85, 142, 148);
      ctx.fillStyle = '#0c1522';
      ctx.fillRect(x + 8, 136, 126, 8);
      ctx.fillRect(x + 32, 103, 10, 125);
      ctx.fillStyle = `${venue.color}a8`;
      ctx.fillRect(x + 9, 107, 35, 3);
      ctx.fillRect(x + 76, 170 - (window % 2) * 20, 52, 3);
      ctx.fillStyle = '#0b1723';
      ctx.fillRect(x + 26, 194, 108, 40);
      ctx.fillStyle = `${venue.color}30`;
      ctx.fillRect(x + 1, 89, 140, 38);
    }
    ctx.fillStyle = '#182227';
    ctx.fillRect(0, 239, 768, 17);
  });
}

function pylon(venue, index) {
  return canvasMap(128, 512, (ctx) => {
    ctx.fillStyle = '#0c1722';
    ctx.fillRect(0, 0, 128, 512);
    ctx.strokeStyle = `${venue.color}b0`;
    ctx.lineWidth = 2;
    ctx.strokeRect(9, 10, 110, 492);
    ctx.fillStyle = venue.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const letters = index % 2 ? venue.glyphs : venue.sign.replace(/[^A-Z]/g, '');
    const spacing = Math.min(86, 381 / letters.length);
    const fontSize = Math.floor(Math.min(64, spacing * .85));
    ctx.font = `800 ${fontSize}px "Yu Gothic", "Hiragino Kaku Gothic ProN", "PingFang TC", "Microsoft YaHei", sans-serif`;
    for (const [index, letter] of [...letters].entries()) {
      ctx.fillText(letter, 64, 256 + (index - (letters.length - 1) / 2) * spacing, 72);
    }
    ctx.fillRect(14, 15, 100, 4);
    ctx.fillRect(14, 491, 100, 4);
  });
}

export function makeCommerceMaterials() {
  return venues.map((venue, index) => {
    const map = display(venue);
    return {
      frontage: new THREE.MeshStandardMaterial({
        map, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: .47, metalness: .3, roughness: .37,
      }),
      sign: new THREE.MeshBasicMaterial({ map: pylon(venue, index), toneMapped: false }),
      light: new THREE.Color(venue.color).getHex(),
    };
  });
}
