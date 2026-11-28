import * as THREE from 'three';

const cable = new THREE.CylinderGeometry(1, 1, 1, 8);
const delta = new THREE.Vector3();
const midpoint = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);

export function mesh(group, geometry, material, x, y, z, w, h, d, yaw = 0) {
  const part = new THREE.Mesh(geometry, material);
  part.position.set(x, y, z);
  part.scale.set(w, h, d);
  part.rotation.y = yaw;
  group.add(part);
  return part;
}

export function span(group, material, a, b, radius) {
  const length = delta.subVectors(b, a).length();
  midpoint.copy(a).add(b).multiplyScalar(.5);
  const part = mesh(group, cable, material, midpoint.x, midpoint.y, midpoint.z, radius, length, radius);
  part.quaternion.setFromUnitVectors(up, delta.normalize());
}

export function placard(title, subtitle, ink, background) {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 188;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 768, 188);
  ctx.strokeStyle = ink + '8f';
  ctx.lineWidth = 5;
  ctx.strokeRect(8, 8, 752, 172);
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.font = '900 67px system-ui, sans-serif';
  ctx.fillText(title, 384, 99, 704);
  ctx.font = '700 22px monospace';
  ctx.fillText(subtitle, 384, 148, 704);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return new THREE.MeshBasicMaterial({ map, toneMapped: false });
}
