import { MathUtils, Vector3 } from 'three';

export const sectionLength = 672;
export const chunkLength = 48;
export const roadWidth = 14.8;
export const startingDistance = 23;
export const cruiseSpeed = 110 / 3.6;
export const wineMark = 1580;
export const crashMark = 2110;
export const tunnelStart = 3294;
export const maglevStart = tunnelStart + 438;
export const maglevEnd = maglevStart + 616;
export const droneSectors = [[151, 391], [1092, 1373], [2720, 2981]];

export const districts = [
  { name: 'Cinema Row', lamp: 0x5adbd2, accent: 0xe99667, fog: 0x152a31, height: 1.15 },
  { name: 'The Continuum', lamp: 0x41ffb6, accent: 0x99f85d, fog: 0x122d2a, height: 1.18 },
  { name: 'Ad Exchange', lamp: 0xe285ff, accent: 0x6af4d8, fog: 0x23243b, height: 1.38 },
  { name: 'Service District', lamp: 0xff674b, accent: 0xffbd66, fog: 0x282728, height: .73 },
  { name: 'Transit Access', lamp: 0x53decb, accent: 0xf3ab56, fog: 0x142d36, height: .93 },
];
const subway = { id: 'subway', name: 'Transit Tunnel', at: tunnelStart, lamp: 0x9bd7bb, accent: 0xff994a, fog: 0x101e25,
  line: 'They pay me by the revision. Mind the inspectors.', speaker: 'KEVIN' };
const maglev = { id: 'maglev', name: 'Flooded Maglev Terminal', at: maglevStart, lamp: 0x64d9ef, accent: 0xffa960, fog: 0x102e39,
  line: 'High-speed rail. Low-speed drainage.', speaker: 'ZEBRA' };

export const nextDistricts = [
  { id: 'ghostline', name: 'Ghostline Relay', length: 432, lamp: 0x4ffaab, accent: 0xd2ff75, fog: 0x092b22,
    line: 'You are now leaving the human verification loop.', speaker: 'RELAY' },
  { id: 'spillway', name: 'Neon Spillway', length: 480, lamp: 0xff59a3, accent: 0xffae69, fog: 0x2c1c34,
    line: 'That meltdown looked expensive. I hope it was practical.', speaker: 'STAN' },
  { id: 'museum', name: 'Museum of Everything', length: 384, lamp: 0xffdab7, accent: 0xb8a6fc, fog: 0x27263f,
    line: 'This wing houses every version of the same apology.', speaker: 'AUDIO GUIDE' },
  { id: 'factory', name: 'Factory of Artificial Suffering', length: 432, lamp: 0xff9556, accent: 0x61e8e6, fog: 0x312729,
    line: 'Outrage on the left. Engagement on the right.', speaker: 'ZEBRA' },
  { id: 'grid', name: 'Final Draft Grid', length: 528, lamp: 0x63d8ff, accent: 0xff9b6c, fog: 0x101a38,
    line: 'One hundred percent original. Certified by itself.', speaker: 'THE CURATOR' },
];

let end = maglevEnd;
for (const district of nextDistricts) {
  district.at = end;
  end += district.length;
}
export const routeLength = end;
export const stages = [
  ...districts.map((district, index) => ({ ...district, at: index * sectionLength, id: `city-${index}` })),
  subway, maglev, ...nextDistricts,
];

export function districtAt(distance) {
  for (let index = stages.length - 1; index > 0; index--) {
    if (distance >= stages[index].at) return stages[index];
  }
  return stages[0];
}

export function sectionAt(distance) {
  return MathUtils.clamp(Math.floor(distance / sectionLength), 0, districts.length - 1);
}

function boulevard(distance) {
  return Math.sin(distance * .023) * 8 + Math.sin(distance * .0067) * 15;
}

const tunnelCenter = boulevard(3240);

export function routeCenter(distance) {
  return MathUtils.lerp(boulevard(distance), tunnelCenter, MathUtils.smoothstep(distance, 3218, 3280));
}

export function routeHeading(distance) {
  return -Math.atan2(routeCenter(distance + .5) - routeCenter(distance - .5), 1);
}

export function routeAt(distance, lane = 0, height = 0, target = new Vector3()) {
  return target.set(routeCenter(distance) + lane, height, -distance);
}

export const runnerLanes = [-3.65, 0, 3.65];
const streetHazards = Array.from({ length: 68 }, (_, index) => index)
  .filter((index) => index >= 2 && (index % 3 === 2 || (index > 39 && index % 3 === 0)))
  .map((index) => ({
    at: (index + .59) * chunkLength,
    lane: [0, 3.65, -3.65, 0, -3.65, 3.65][index % 6],
    kind: index > 2 && index % 4 === 1 ? 'sign' : 'car',
  }));

const tunnelHazards = [
  [103, 1, 'sentry'], [148, 0, 'cable'], [193, 2, 'cart'], [239, 0, 'sentry'],
  [282, 1, 'cable'], [326, 2, 'sentry'], [368, 1, 'cart'], [400, 0, 'cable'],
];
const districtHazards = [
  ['codebar', 'cache', 'sentry', 'codebar', 'cache', 'codebar', 'sentry', 'cache'],
  ['supercar', 'duct', 'supercar', 'sentry', 'duct', 'supercar', 'duct', 'supercar'],
  ['plinth', 'display', 'plinth', 'sentry', 'display', 'plinth', 'display'],
  ['vent', 'press', 'sentry', 'vent', 'press', 'sentry', 'vent', 'press'],
  ['pixel', 'sweeper', 'sentry', 'pixel', 'sweeper', 'sentry', 'pixel', 'sweeper', 'sentry'],
];
export const runnerHazards = [
  ...streetHazards,
  ...tunnelHazards.map(([offset, lane, kind]) => ({ at: tunnelStart + offset, lane: runnerLanes[lane], kind })),
  ...nextDistricts.flatMap((district, zone) => districtHazards[zone].map((kind, index) => ({
    at: district.at + 54 + index * (district.length - 100) / (districtHazards[zone].length - 1),
    lane: runnerLanes[(index * 2 + zone) % 3], kind,
  }))),
];
