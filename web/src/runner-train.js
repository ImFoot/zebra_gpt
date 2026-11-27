import * as THREE from 'three';
import { batches } from './city.js';
import { makeMaglevTrain } from './maglev-train.js';
import { trainHalfLength, trainRoof } from './route.js';

const metal = new THREE.MeshStandardMaterial({ metalness: .73, roughness: .42 });
const rampMetal = new THREE.MeshStandardMaterial({ color: 0x485866, metalness: .59, roughness: .48 });
const luminous = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
const box = new THREE.BoxGeometry();
const length = trainHalfLength * 2;
const rampLength = 7.8;
const rampHighEnd = trainHalfLength - 3.85;
const rampLowEnd = rampHighEnd + rampLength;
const rampBase = .76;
const pitch = Math.atan2(trainRoof - rampBase, rampLength);

export function makeBoardableTrainFactory(metalMaps, compact) {
  const holder = new THREE.Group();
  const templates = [-1, 1].map((side) => makeMaglevTrain(holder, side, metalMaps, compact));
  return (group, index) => {
    const train = templates[index % templates.length].clone();
    const zScale = length / 85.50;
    train.scale.set(.754, .662, zScale);
    train.position.z = 39.17 * zScale;
    train.visible = true;
    train.name = 'Boardable maglev coaches';
    group.add(train);

    const rack = batches(group);
    const deckLength = trainHalfLength + rampHighEnd - .19;
    const deckCenter = rampHighEnd - deckLength * .5;
    rack.add(metal, 0, trainRoof - .039, deckCenter, 1.83, .074, deckLength, 0x7c8e95);
    for (const side of [-1, 1]) {
      rack.add(luminous, side * .884, trainRoof + .004, deckCenter, .028, .014, deckLength - .18, 0x6fd3de);
      rack.add(metal, side * .78, 1.90, -trainHalfLength + 2, .07, 1.09, .074, 0x586773);
    }
    rack.finish();

    const ramp = new THREE.Group();
    ramp.position.set(0, (trainRoof + rampBase) * .5, (rampHighEnd + rampLowEnd) * .5);
    ramp.rotation.x = pitch;
    const deck = new THREE.Mesh(box, rampMetal);
    deck.scale.set(2.21, .16, Math.hypot(rampLength, trainRoof - rampBase));
    ramp.add(deck);
    const guides = batches(ramp);
    for (const sign of [-1, 1]) {
      guides.add(luminous, sign * 1.09, .092, 0, .053, .018, rampLength, 0xfeb963);
      for (let bar = 0; bar < 5; bar++) {
        guides.add(luminous, sign * .32, .093, 2.2 - bar * .97, .78, .018, .085, 0xffcf76, sign * -.44);
      }
    }
    guides.finish();
    group.add(ramp);
  };
}
