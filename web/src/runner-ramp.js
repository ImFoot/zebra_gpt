import * as THREE from 'three';
import { batches } from './city.js';
import { boardingRamps } from './route.js';

const metal = new THREE.MeshStandardMaterial({ color: 0x485866, metalness: .59, roughness: .48 });
const glow = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
const box = new THREE.BoxGeometry();

export function makeRunnerRamp(kind, halfLength, roof) {
  const { length, width, join } = boardingRamps[kind];
  const slopeLength = Math.hypot(length, roof);
  const ramp = new THREE.Group();
  ramp.name = `Ride-on ${kind} ramp`;
  ramp.position.set(0, roof * .5, halfLength - join + length * .5);
  ramp.rotation.x = Math.atan2(roof, length);
  const deck = new THREE.Mesh(box, metal);
  deck.scale.set(width, .14, slopeLength);
  deck.position.y = -.07;
  ramp.add(deck);

  const trim = batches(ramp);
  for (const side of [-1, 1]) {
    trim.add(glow, side * (width * .5 - .052), .015, 0, .055, .020, slopeLength, 0xfeb963);
    for (let bar = 0; bar < 6; bar++) {
      trim.add(glow, side * .31, .016, slopeLength * (.40 - bar * .149), .72, .018, .085, 0xffcf76, side * -.44);
    }
  }
  trim.finish();
  return ramp;
}
