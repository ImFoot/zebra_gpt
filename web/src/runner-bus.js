import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { batches } from './city.js';
import { busHalfLength, busRoof } from './route.js';

const shell = new RoundedBoxGeometry(2.72, 1.61, busHalfLength * 2, 3, .30);
const fascia = new RoundedBoxGeometry(2.51, .54, .34, 2, .11);
const wheel = new THREE.CylinderGeometry(.40, .40, .24, 20).rotateZ(Math.PI / 2);
const rim = new THREE.CylinderGeometry(.25, .25, .035, 14).rotateZ(Math.PI / 2);
const paint = [0x226d6b, 0xb77336, 0x87354d, 0x305984].map((color) => new THREE.MeshPhysicalMaterial({
  color, metalness: .42, roughness: .32, clearcoat: .69, clearcoatRoughness: .23,
}));
const frame = new THREE.MeshStandardMaterial({ metalness: .63, roughness: .38 });
const tire = new THREE.MeshStandardMaterial({ color: 0x12181d, roughness: .88 });
const alloy = new THREE.MeshStandardMaterial({ color: 0x789693, metalness: .77, roughness: .27 });
const glass = new THREE.MeshPhysicalMaterial({ color: 0x1c3f4a, emissive: 0x1a5259, emissiveIntensity: .59,
  metalness: .42, roughness: .22, clearcoat: .87 });
const lamp = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
const plane = new THREE.PlaneGeometry();
let routeSign;

function signMaterial() {
  if (routeSign) return routeSign;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 72;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#142027';
  ctx.fillRect(0, 0, 256, 72);
  ctx.fillStyle = '#ffd58a';
  ctx.font = '900 33px monospace';
  ctx.fillText('404  CROSSTOWN', 12, 44, 232);
  ctx.strokeStyle = '#8b5c3c';
  ctx.strokeRect(6, 6, 244, 60);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  routeSign = new THREE.MeshBasicMaterial({ map, toneMapped: false });
  return routeSign;
}

export function createRunnerBus(group, index) {
  const body = new THREE.Mesh(shell, paint[index % paint.length]);
  body.position.y = 1.246;
  group.add(body);
  const cap = new THREE.Mesh(fascia, glass);
  cap.position.set(0, 1.55, -busHalfLength + .105);
  group.add(cap);
  const hologram = new THREE.Mesh(plane, signMaterial());
  hologram.scale.set(1.44, .34, 1);
  hologram.position.set(0, 1.51, busHalfLength + .012);
  group.add(hologram);

  const batch = batches(group);
  for (const side of [-1, 1]) {
    batch.add(frame, side * 1.357, 1.48, .10, .034, .74, 14.78, 0x212e35);
    batch.add(frame, side * 1.356, .72, 0, .084, .10, 14.96, 0x526362);
    batch.add(lamp, side * 1.405, .832, 0, .024, .035, 14.7, 0x75d8d8);
    for (let window = 0; window < 8; window++) {
      const windowZ = -6.19 + window * 1.76;
      batch.add(glass, side * 1.388, 1.50, windowZ, .026, .51, 1.51, window % 3 ? 0x5095a1 : 0x91a881);
      batch.add(lamp, side * 1.403, 1.708, windowZ, .014, .027, 1.38, window % 3 ? 0x8eeeeb : 0xc2dea4);
      batch.add(frame, side * 1.405, 1.495, windowZ - .23, .019, .52, .047, 0x161e23);
    }
    for (const z of [-5.07, 4.23, 5.65]) {
      const wheelMesh = new THREE.Mesh(wheel, tire);
      wheelMesh.position.set(side * 1.25, .404, z);
      group.add(wheelMesh);
      const rimMesh = new THREE.Mesh(rim, alloy);
      rimMesh.position.set(side * 1.377, .404, z);
      group.add(rimMesh);
    }
    for (const band of [-1, 1]) {
      batch.add(lamp, side * (band > 0 ? .935 : .759), 1.195, busHalfLength + .012, .153, .063, .028, 0xff6442);
    }
    batch.add(lamp, side * 1.115, .624, -busHalfLength + .053, .205, .09, .035, 0xcaefff);
    batch.add(lamp, side * 1.02, busRoof + .008, 0, .052, .018, 14.19, 0xffca67);
  }
  batch.add(frame, 0, .577, busHalfLength - .014, 2.39, .246, .27, 0x263640);
  for (let slat = 0; slat < 5; slat++) batch.add(frame, 0, .77 + slat * .064, busHalfLength + .003, 1.40, .020, .04, 0x465360);
  batch.add(frame, 0, busRoof - .029, 0, 2.26, .060, 14.97, 0x758890);
  for (let stripe = 0; stripe < 4; stripe++) {
    const z = busHalfLength - .83 - stripe * .365;
    for (const side of [-1, 1]) batch.add(lamp, side * .26, busRoof + .008, z, .65, .019, .065, 0xffc566, -side * .37);
  }
  batch.finish();
}
