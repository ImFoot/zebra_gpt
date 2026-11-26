import * as THREE from 'three';
import { routeCenter, tunnelStart } from './route.js';
import { makeDrone } from './curator-drone.js';

function radialMap() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const glow = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  glow.addColorStop(0, '#fff');
  glow.addColorStop(.19, '#ffffffbd');
  glow.addColorStop(.55, '#ffffff3d');
  glow.addColorStop(1, '#ffffff00');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

function makeRain(scene) {
  const count = 450;
  const data = new Float32Array(count * 6);
  const drops = Array.from({ length: count }, () => [(Math.random() - .5) * 41, Math.random() * 18, Math.random() * 60, .22 + Math.random() * .51]);
  const geometry = new THREE.BufferGeometry();
  const vertices = new THREE.BufferAttribute(data, 3).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', vertices);
  const material = new THREE.LineBasicMaterial({ color: 0x6ef1be, transparent: true, opacity: .13, depthWrite: false });
  const rain = new THREE.LineSegments(geometry, material);
  rain.frustumCulled = false;
  scene.add(rain);

  return function update(dt, s, speed) {
    rain.position.set(routeCenter(s), 0, -s + 11);
    const fall = dt * 16;
    for (let index = 0; index < count; index++) {
      const drop = drops[index];
      drop[1] = (drop[1] - fall + 18) % 18;
      drop[2] = (drop[2] - speed * dt + 60) % 60;
      const [x, y, z, tail] = drop;
      vertices.setXYZ(index * 2, x, y, -z);
      vertices.setXYZ(index * 2 + 1, x - tail * .12, y + tail, -z - tail * .26);
    }
    material.opacity = s > tunnelStart ? .012 : .13;
    vertices.needsUpdate = true;
  };
}

function makeSpill(scene) {
  const count = 42;
  const geometry = new THREE.SphereGeometry(1, 7, 5);
  const material = new THREE.MeshStandardMaterial({ color: 0xa02536, metalness: .31, roughness: .21, emissive: 0x5c1029, emissiveIntensity: .62 });
  const globules = new THREE.InstancedMesh(geometry, material, count);
  globules.frustumCulled = false;
  globules.visible = false;
  scene.add(globules);
  const pose = new THREE.Object3D();
  const droplets = Array.from({ length: count }, (_, index) => ({
    delay: index * .012, x: .09 + Math.random() * .6, y: .22 + Math.random() * .94,
    z: .85 + Math.random() * 2.95, size: .007 + Math.random() ** 1.55 * .031,
  }));

  return function update(age, origin) {
    globules.visible = age >= 0 && age < 2.95;
    if (!globules.visible) return;
    globules.position.copy(origin);
    for (const [index, drop] of droplets.entries()) {
      const t = (age - drop.delay) * .65;
      const fade = 1 - THREE.MathUtils.smoothstep(t, .72, 1.5);
      const scale = t > 0 ? drop.size * fade : 0;
      pose.position.set(drop.x * t, drop.y * t - .9 * t * t, drop.z * t);
      pose.scale.set(scale, scale * 1.32, scale * (1 + t * 1.2));
      pose.updateMatrix();
      globules.setMatrixAt(index, pose.matrix);
    }
    globules.instanceMatrix.needsUpdate = true;
  };
}

export function makeEffects(scene) {
  const halo = radialMap();
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.15, 4.3), new THREE.MeshBasicMaterial({ map: halo, color: 0x020502, transparent: true, depthWrite: false, opacity: .81 }));
  shadow.rotation.x = -Math.PI / 2;
  scene.add(shadow);
  return { shadow, drone: makeDrone(scene, halo), rain: makeRain(scene), spill: makeSpill(scene) };
}
