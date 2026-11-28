import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const cube = new THREE.BoxGeometry();
const localZ = new THREE.Vector3(0, 0, 1);

export function makePlates() {
  const layers = new Map();
  const pose = new THREE.Object3D();
  const start = new THREE.Vector3();
  const length = new THREE.Vector3();

  function collect(geometry, material) {
    pose.updateMatrix();
    const piece = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    piece.applyMatrix4(pose.matrix);
    if (!layers.has(material)) layers.set(material, []);
    layers.get(material).push(piece);
  }

  function part(geometry, material, at, scale = [1, 1, 1], angles = [0, 0, 0]) {
    pose.position.fromArray(at);
    pose.scale.fromArray(scale);
    pose.rotation.fromArray(angles);
    collect(geometry, material);
  }

  function trace(material, a, b, width = .021, height = .013) {
    start.fromArray(a);
    length.fromArray(b).sub(start);
    pose.position.copy(start).addScaledVector(length, .5);
    pose.scale.set(width, height, length.length() + width * .3);
    pose.quaternion.setFromUnitVectors(localZ, length.normalize());
    collect(cube, material);
  }

  function plate(material, outline, y, depth, bevel = .027) {
    const shape = new THREE.Shape();
    outline.forEach(([x, z], index) => {
      if (index === 0) shape.moveTo(x, z);
      else shape.lineTo(x, z);
    });
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, steps: 1,
    });
    part(geometry, material, [0, y + depth * .5, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
    geometry.dispose();
  }

  function joinInto(group) {
    for (const [material, geometries] of layers) {
      group.add(new THREE.Mesh(mergeGeometries(geometries), material));
      for (const geometry of geometries) geometry.dispose();
    }
  }

  return { part, trace, plate, joinInto };
}
