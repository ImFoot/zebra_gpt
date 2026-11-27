import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';

const assetPath = `${import.meta.env.BASE_URL}environment/`;
const facadeNames = {
  'facades/apartments': ['ApartmentEntry', 'ApartmentEntryAlt', 'ApartmentUpper', 'ApartmentUpperAlt', 'ApartmentCrown'],
  'facades/factory': ['FactoryEntry', 'FactoryLoading', 'FactoryUpper', 'FactoryUpperAlt', 'FactoryCrown'],
  'downtown/downtown': ['DowntownEntry', 'DowntownUpper', 'DowntownCorner', 'DowntownPlanter'],
};
const propNames = ['fire-escape', 'aircon', 'trash-can', 'utility-box', 'manhole'];

function prototype(root) {
  const parts = [];
  root.updateMatrixWorld(true);
  const inverse = root.matrixWorld.clone().invert();
  root.traverse((mesh) => {
    if (!mesh.isMesh) return;
    parts.push({ geometry: mesh.geometry, material: mesh.material, transform: inverse.clone().multiply(mesh.matrixWorld) });
  });
  return parts.length ? parts : null;
}

function materialMaps(loader, name, repeatX, repeatY) {
  const maps = [ ['color', 'map'], ['normal', 'normalMap'], ['roughness', 'roughnessMap'] ];
  return Promise.all(maps.map(async ([file, slot]) => {
    const map = await loader.loadAsync(`${assetPath}street/${name}-${file}.webp`);
    map.colorSpace = slot === 'map' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(repeatX, repeatY);
    map.anisotropy = 4;
    return [slot, map];
  })).then(Object.fromEntries);
}

export async function loadEnvironmentKit({ roadWidth, chunkLength, sidewalkWidth }) {
  const gltf = new GLTFLoader();
  const texture = new THREE.TextureLoader();
  const buildings = Object.entries(facadeNames).map(async ([file, names]) => {
    const { scene } = await gltf.loadAsync(`${assetPath}${file}.glb`);
    return Object.fromEntries(names.map((name) => {
      const root = scene.getObjectByName(name);
      if (!root) throw new Error(`${name} is missing in ${file}.glb`);
      return [name, prototype(root)];
    }));
  });
  const props = propNames.map(async (name) => {
    const { scene } = await gltf.loadAsync(`${assetPath}street/${name}.glb`);
    return [name, prototype(scene)];
  });
  const [facadeResults, propResults, pavement, asphalt, night] = await Promise.all([
    Promise.allSettled(buildings),
    Promise.allSettled(props),
    materialMaps(texture, 'floor-pavement', sidewalkWidth / 2, chunkLength / 2).catch(() => null),
    materialMaps(texture, 'worn-asphalt', roadWidth / 2, chunkLength / 2).catch(() => null),
    new HDRLoader().loadAsync(`${assetPath}lighting/night-street.hdr`).catch(() => null),
  ]);
  const catalog = Object.assign({}, ...facadeResults.map((result) => result.value));
  const clutter = Object.fromEntries(propResults.filter((result) => result.status === 'fulfilled').map((result) => result.value));
  if (night) night.mapping = THREE.EquirectangularReflectionMapping;
  return { catalog, clutter, pavement, asphalt, night };
}

export function environmentBatch(group) {
  const instances = new Map();
  const pose = new THREE.Object3D();
  const matrix = new THREE.Matrix4();
  return {
    add(model, x, y, z, yaw, width = 1, height = 1, depth = 1, tint = 0xffffff) {
      if (!model) return;
      if (!instances.has(model)) instances.set(model, []);
      pose.position.set(x, y, z);
      pose.rotation.y = yaw;
      pose.scale.set(width, height, depth);
      pose.updateMatrix();
      instances.get(model).push({ transform: pose.matrix.clone(), color: new THREE.Color(tint) });
    },
    finish() {
      for (const [model, placements] of instances) {
        for (const part of model) {
          const mesh = new THREE.InstancedMesh(part.geometry, part.material, placements.length);
          for (const [index, { transform, color }] of placements.entries()) {
            mesh.setMatrixAt(index, matrix.multiplyMatrices(transform, part.transform));
            mesh.setColorAt(index, color);
          }
          mesh.computeBoundingSphere();
          group.add(mesh);
        }
      }
    },
  };
}
