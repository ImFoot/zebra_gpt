import { MathUtils, Vector3 } from 'three';

export const sectionLength = 672;
export const routeLength = 3360;
export const chunkLength = 48;
export const roadWidth = 14.8;
export const startingDistance = 23;
export const wineMark = 1580;
export const crashMark = 2110;
export const tunnelStart = 3294;
export const droneSectors = [[151, 348], [1092, 1334], [2720, 2950]];

export const districts = [
  { name: 'Cinema Row', lamp: 0xffad65, accent: 0x59efa2, height: .83 },
  { name: 'The Continuum', lamp: 0x41ffb6, accent: 0x99f85d, height: 1.18 },
  { name: 'Ad Exchange', lamp: 0xe285ff, accent: 0x6af4d8, height: 1.38 },
  { name: 'Service District', lamp: 0xff674b, accent: 0xffbd66, height: .73 },
  { name: 'Transit Access', lamp: 0x53decb, accent: 0xf3ab56, height: .93 },
];

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

export const barriers = Array.from({ length: 68 }, (_, index) => index)
  .filter((index) => index >= 2 && (index % 3 === 2 || (index > 39 && index % 3 === 0)))
  .map((index) => ({
    at: (index + .59) * chunkLength,
    lane: [0, 3.65, -3.65, 0, -3.65, 3.65][index % 6],
    halfWidth: index % 5 === 0 ? 1.75 : 1.30,
  }));
