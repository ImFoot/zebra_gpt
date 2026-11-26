import * as THREE from 'three';
import { routeCenter, tunnelStart } from './route.js';

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

function addMesh(parent, geometry, material, x, y, z) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function makeDrone(scene, halo) {
  const drone = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x657b7e, metalness: .79, roughness: .21 });
  const insulation = new THREE.MeshStandardMaterial({ color: 0x232a29, metalness: .38, roughness: .55 });
  const aperture = new THREE.MeshBasicMaterial({ color: 0xff593e, toneMapped: false });
  const rotors = [];
  const casing = addMesh(drone, new THREE.SphereGeometry(.45, 12, 8), metal, 0, 0, 0);
  casing.scale.set(1.12, .57, 1);
  addMesh(drone, new THREE.CylinderGeometry(.19, .25, .14, 10), insulation, 0, -.21, 0);
  const camera = addMesh(drone, new THREE.CylinderGeometry(.12, .15, .22, 12), insulation, 0, -.08, .39);
  camera.rotation.x = Math.PI / 2;
  addMesh(drone, new THREE.SphereGeometry(.075, 12, 6), aperture, 0, -.08, .502);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: 0xff321e, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .79 }));
  glow.position.set(0, -.08, .53);
  glow.scale.setScalar(.81);
  drone.add(glow);
  const arm = new THREE.BoxGeometry(1.24, .09, .09);
  const guard = new THREE.TorusGeometry(.37, .041, 5, 18);
  const fin = new THREE.BoxGeometry(.66, .025, .073);
  for (const side of [-1, 1]) {
    for (const end of [-1, 1]) {
      const strut = addMesh(drone, arm, metal, side * .49, .03, end * .32);
      strut.rotation.y = -side * end * .49;
      const guardMesh = addMesh(drone, guard, metal, side * 1.05, .07, end * .58);
      guardMesh.rotation.x = Math.PI / 2;
      const rotor = addMesh(drone, fin, insulation, side * 1.05, .084, end * .58);
      rotors.push(rotor);
      addMesh(drone, new THREE.CylinderGeometry(.095, .09, .12, 8), metal, side * 1.05, .073, end * .58);
    }
  }
  drone.visible = false;
  scene.add(drone);

  function pose(position, time, yaw, pitch, roll) {
    drone.visible = Boolean(position);
    if (!position) return;
    drone.position.copy(position);
    drone.rotation.set(pitch, yaw, roll);
    for (const [index, rotor] of rotors.entries()) rotor.rotation.y = time * 61 * (index % 2 === 0 ? 1 : -1);
  }
  return { drone, pose };
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
