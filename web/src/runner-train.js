import * as THREE from 'three';
import { batches } from './city.js';
import { makeMaglevTrain } from './maglev-train.js';
import { boardingRamps, trainHalfLength, trainRoof } from './route.js';
import { makeRunnerRamp } from './runner-ramp.js';

const metal = new THREE.MeshStandardMaterial({ metalness: .73, roughness: .42 });
const luminous = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
const length = trainHalfLength * 2;
const rampHighEnd = trainHalfLength - boardingRamps.train.join;

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

    group.add(makeRunnerRamp('train', trainHalfLength, trainRoof));
  };
}
