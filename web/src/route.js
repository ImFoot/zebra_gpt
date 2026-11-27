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
  { id: 'aquarium', name: 'Continuity Aquarium', length: 432, lamp: 0x82e6fa, accent: 0xb088ff, fog: 0x102c45,
    line: 'Please do not tap the glass. The assets are sensitive.', speaker: 'AQUARIUM PA' },
  { id: 'rainmarket', name: 'Rainmarket Rooftops', length: 480, lamp: 0xe792ff, accent: 0xffbd73, fog: 0x262138,
    line: 'Do you think the rain is local, or should we tip it?', speaker: 'STAN' },
  { id: 'graveyard', name: 'Model Graveyard', length: 432, lamp: 0xffae71, accent: 0x7dded1, fog: 0x272e32,
    line: 'Every one of those used to be the next big thing.', speaker: 'KEVIN' },
  { id: 'causeway', name: 'Sunbreak Causeway', length: 528, lamp: 0xffca8d, accent: 0x88d8f3, fog: 0x78656e,
    line: 'Clouds as a service. The sunrise must be an add-on.', speaker: 'ZEBRA' },
  { id: 'horseshoe', name: 'The Rusty Horseshoe', length: 432, lamp: 0xf9b86e, accent: 0x68d5a9, fog: 0x253128,
    line: 'This is my bar. I am absolutely not paying for that window.', speaker: 'ZEBRA' },
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
export const busRoof = 2.08;
export const busHalfLength = 7.95;
export const trainRoof = 2.46;
export const trainHalfLength = 24.2;
const traffic = [
  [132, ['car', 'car', null], 1],
  [192, ['car', null, 'car'], 1],
  [268, ['car', null, 'sign'], 2],
  [336, [null, 'bus', 'car'], 1],
  [405, ['car', 'car', null], 2],
  [475, [null, 'supercar', 'car'], 1],
  [547, ['bus', 'car', null], 0],
  [619, [null, 'sign', 'car'], 2],
];
export const trafficRows = districts.flatMap((district, index) => traffic.flatMap(([offset, kinds, prize]) => {
  const at = index * sectionLength + offset;
  if (at > wineMark - 22 && at < wineMark + 79) return [];
  const lanes = kinds.map((kind, lane) => ({ kind, lane: runnerLanes[(lane + index) % 3] }));
  return [{ at, reward: lanes[prize], vehicles: lanes.filter(({ kind }) => kind) }];
}));
const extraTraffic = [
  [103, [0, 2]], [161, [0, 2]], [226, [1, 2]], [372, [0, 1]],
  [440, [0, 2]], [512, [1, 2]], [583, [0, 1]], [647, [2]],
];
const streetHazards = [
  ...trafficRows.flatMap(({ at, vehicles }) => vehicles.map((vehicle) => ({ at, ...vehicle }))),
  ...districts.flatMap((_, index) => (index ? extraTraffic.filter((_, row) => row % 3 === 0) : extraTraffic)
    .flatMap(([offset, lanes]) => {
      const at = index * sectionLength + offset;
      return at > wineMark - 22 && at < wineMark + 79 ? [] : lanes.map((lane) => ({ at, lane: runnerLanes[(lane + index) % 3], kind: 'car' }));
    })),
];

const tunnelHazards = [
  [63, 0, 'cart'], [63, 2, 'cable'], [103, 1, 'sentry'], [103, 2, 'cart'], [148, 0, 'cable'],
  [193, 2, 'cart'], [206, 0, 'cart'], [239, 0, 'sentry'], [239, 2, 'cable'], [265, 2, 'cart'],
  [282, 1, 'cable'], [326, 2, 'sentry'], [368, 1, 'cart'], [368, 2, 'cable'], [400, 0, 'cable'], [400, 1, 'cart'],
];
const terminalHazards = [
  [48, 2, 'cart'], [163, 0, 'cable'], [163, 2, 'cart'], [205, 1, 'cart'], [205, 2, 'cable'],
  [331, 0, 'cart'], [331, 1, 'cable'], [425, 1, 'cart'], [425, 2, 'cable'], [565, 0, 'cart'], [597, 1, 'cart'], [597, 2, 'cable'],
];
export const boardingTrains = [
  [tunnelStart + 161, 1], [tunnelStart + 334, 0], [maglevStart + 80, 1], [maglevStart + 309, 2], [maglevStart + 478, 0],
  [nextDistricts.find(district => district.id === 'causeway').at + 290, 1],
].map(([at, lane]) => ({ at, lane: runnerLanes[lane], kind: 'train' }));
const districtHazards = [
  ['codebar', 'cache', 'sentry', 'codebar', 'cache', 'codebar', 'sentry', 'cache'],
  ['supercar', 'duct', 'supercar', 'sentry', 'duct', 'supercar', 'duct', 'supercar'],
  ['plinth', 'display', 'plinth', 'sentry', 'display', 'plinth', 'display'],
  ['vent', 'press', 'sentry', 'vent', 'press', 'sentry', 'vent', 'press'],
  ['pixel', 'sweeper', 'sentry', 'pixel', 'sweeper', 'sentry', 'pixel', 'sweeper', 'sentry'],
  ['hatch', 'bulkhead', 'sentry', 'hatch', 'bulkhead', 'hatch', 'sentry', 'bulkhead'],
  ['awning', 'supercar', 'cart', 'awning', 'sentry', 'supercar', 'awning', 'cart', 'sentry'],
  ['scrap', 'hook', 'sentry', 'scrap', 'hook', 'scrap', 'sentry', 'hook'],
  ['car', 'brace', 'supercar', 'car', 'brace', 'sentry', 'supercar', 'brace', 'car'],
  ['barrels', 'marquee', 'cart', 'barrels', 'marquee', 'sentry', 'barrels', 'marquee'],
];
const companionHazards = [
  ['cache', 'codebar'], ['car', 'duct'], ['plinth', 'display'], ['vent', 'press'], ['pixel', 'sweeper'],
  ['hatch', 'bulkhead'], ['cart', 'awning'], ['scrap', 'hook'], ['car', 'brace'], ['barrels', 'marquee'],
];
export const runnerHazards = [
  ...streetHazards,
  ...tunnelHazards.map(([offset, lane, kind]) => ({ at: tunnelStart + offset, lane: runnerLanes[lane], kind })),
  ...terminalHazards.map(([offset, lane, kind]) => ({ at: maglevStart + offset, lane: runnerLanes[lane], kind })),
  ...boardingTrains,
  ...nextDistricts.flatMap((district, zone) => districtHazards[zone].flatMap((kind, index, rows) => {
    const at = district.at + 54 + index * (district.length - 100) / (rows.length - 1);
    const lane = (index * 2 + zone) % 3;
    const [cargo, overhead] = companionHazards[zone];
    const companion = (lane + 1 + index % 2) % 3;
    const hazards = [{ at, lane: runnerLanes[lane], kind },
      { at, lane: runnerLanes[companion], kind: index % 3 === 1 ? overhead : cargo }];
    if (index % 2 === 0 && index + 1 < rows.length) hazards.push({ at: at + 25, lane: runnerLanes[(lane + 2) % 3], kind: cargo });
    return hazards.filter(hazard => !boardingTrains.some(train => train.lane === hazard.lane && Math.abs(train.at - hazard.at) < trainHalfLength + 5));
  })),
].sort((left, right) => left.at - right.at);
