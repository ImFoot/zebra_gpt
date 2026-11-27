import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const fit = 2.5;
const right = new THREE.Vector3(1, 0, 0);
const up = new THREE.Vector3(0, 1, 0);
const tau = Math.PI * 2;
const strideDirection = new THREE.Vector3();
const boneDirection = new THREE.Vector3();
const rotation = new THREE.Quaternion();
const parentRotation = new THREE.Quaternion();
const worldRotation = new THREE.Quaternion();
const getBone = (root, name) => root.getObjectByName(name);
const position = (bone) => bone.getWorldPosition(new THREE.Vector3());
const orientation = (bone) => bone.getWorldQuaternion(new THREE.Quaternion());

function makeGlass() {
  const glass = new THREE.Group();
  const clear = new THREE.MeshStandardMaterial({ color: 0xbbdccd, metalness: 0.12, roughness: 0.14, transparent: true, opacity: 0.33, depthWrite: false, side: THREE.DoubleSide });
  const rim = new THREE.MeshStandardMaterial({ color: 0xd6f8df, metalness: 0.34, roughness: 0.18 });
  const cabernet = new THREE.MeshStandardMaterial({ color: 0x8b102c, emissive: 0x43071e, roughness: 0.24, metalness: 0.16 });
  const bowl = [ [0.012, .055], [.042, .062], [.056, .094], [.054, .125], [.046, .153] ];
  const liquid = [ [0, .068], [.036, .068], [.051, .097], [0, .097] ];
  const wine = new THREE.Mesh(new THREE.LatheGeometry(liquid.map(([x, y]) => new THREE.Vector2(x, y)), 16), cabernet);
  glass.add(wine, new THREE.Mesh(new THREE.LatheGeometry(bowl.map(([x, y]) => new THREE.Vector2(x, y)), 20), clear));
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(.005, .006, .072, 8), rim);
  stem.position.y = .027;
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(.036, .036, .005, 12), rim);
  foot.position.y = -.008;
  const lip = new THREE.Mesh(new THREE.TorusGeometry(.046, .002, 4, 20), rim);
  lip.rotation.x = Math.PI / 2;
  lip.position.y = .153;
  glass.add(stem, foot, lip);
  return { glass, wine };
}

function readZebraLeg(zebra, front, left) {
  const prefix = `tripo${front ? 0 : 1}_${left ? 'Left' : 'Right'}_Limb_`;
  const bones = [0, 1, 2, 3].map((index) => getBone(zebra, prefix + index));
  const rest = bones.map(position);
  return {
    front, left, bones, rest, rotations: bones.map(orientation), parent: orientation(bones[0].parent),
    lengths: rest.slice(1).map((point, index) => point.distanceTo(rest[index])),
    directions: rest.slice(1).map((point, index) => point.clone().sub(rest[index]).normalize()),
    joints: rest.map((point) => point.clone()), offset: new THREE.Vector3(), strikePoint: new THREE.Vector3(),
  };
}

// Preserve the imported hock and knee shape while constraining the hoof to its gait path.
function poseZebraLeg(leg, stridePhase, drive, fast, jump, bounce, impact) {
  const slowOffset = (leg.front ? 0 : .72) + (leg.left ? 0 : .5);
  const fastOffset = (leg.front ? 0 : .47) + (leg.left ? 0 : .16);
  const stride = (stridePhase + THREE.MathUtils.lerp(slowOffset, fastOffset, fast)) % 1;
  const planted = .6 - fast * .2;
  const recovery = Math.max(0, (stride - planted) / (1 - planted));
  const lift = Math.sin(recovery * Math.PI) * drive * (1 - impact);
  const sweep = stride < planted ? (stride / planted) * 2 - 1 : Math.cos(recovery * Math.PI);
  const { bones, rest, joints, lengths, offset } = leg;
  offset.set(0,
    lift * (.22 + fast * .27) - bounce + Math.min(jump, .75) * (leg.front ? .64 : .38),
    sweep * THREE.MathUtils.lerp(.23, .53, fast) * drive * (1 - impact * .74) + Math.min(jump, .65) * (leg.front ? .31 : .21));
  const target = strideDirection.copy(rest[3]).add(offset).sub(rest[0]);
  const maxReach = lengths[0] + lengths[1] + lengths[2] - .0025;
  const remaining = Math.sqrt(Math.max(0, maxReach ** 2 - target.x ** 2 - target.y ** 2));
  target.z = THREE.MathUtils.clamp(target.z, -remaining, remaining);
  target.clampLength(0, maxReach).add(rest[0]);
  joints[1].copy(rest[1]).addScaledVector(offset, .22).z += lift * (leg.front ? .108 : -.153);
  joints[2].copy(rest[2]).addScaledVector(offset, .51).z += lift * (leg.front ? -.263 : .218);
  for (let iteration = 0; iteration < 6; iteration++) {
    joints[3].copy(target);
    for (let index = 2; index >= 0; index--) {
      boneDirection.subVectors(joints[index], joints[index + 1]).setLength(lengths[index]);
      joints[index].copy(joints[index + 1]).add(boneDirection);
    }
    joints[0].copy(rest[0]);
    for (let index = 0; index < 3; index++) {
      boneDirection.subVectors(joints[index + 1], joints[index]).setLength(lengths[index]);
      joints[index + 1].copy(joints[index]).add(boneDirection);
    }
  }
  parentRotation.copy(leg.parent);
  for (let index = 0; index < 3; index++) {
    boneDirection.subVectors(joints[index + 1], joints[index]).normalize();
    rotation.setFromUnitVectors(leg.directions[index], boneDirection).multiply(leg.rotations[index]);
    bones[index].quaternion.copy(parentRotation.invert()).multiply(rotation);
    parentRotation.copy(rotation);
  }
  rotation.setFromAxisAngle(right, -lift * .64).multiply(leg.rotations[3]);
  bones[3].quaternion.copy(parentRotation.invert()).multiply(rotation);
  return stride;
}

function aimBone(bone, child, target) {
  const origin = position(bone);
  const original = boneDirection.copy(position(child)).sub(origin).normalize();
  const aim = strideDirection.copy(target).sub(origin).normalize();
  bone.getWorldQuaternion(worldRotation);
  bone.parent.getWorldQuaternion(parentRotation).invert();
  rotation.setFromUnitVectors(original, aim).multiply(worldRotation);
  bone.quaternion.copy(parentRotation).multiply(rotation);
}

function poseStanLimb(rider, chain, endpoint, bend, weight) {
  const [shoulder, elbow, wrist] = chain.map(position);
  const upper = shoulder.distanceTo(elbow);
  const lower = elbow.distanceTo(wrist);
  const target = rider.localToWorld(new THREE.Vector3(...endpoint)).lerp(wrist, 1 - weight);
  const aim = target.sub(shoulder);
  const gap = THREE.MathUtils.clamp(aim.length(), Math.abs(upper - lower) + .002, upper + lower - .002);
  aim.normalize();
  const side = rider.localToWorld(new THREE.Vector3(...bend)).lerp(elbow, 1 - weight).sub(shoulder);
  side.addScaledVector(aim, -side.dot(aim)).normalize();
  const reach = (upper ** 2 - lower ** 2 + gap ** 2) / (2 * gap);
  const joint = shoulder.clone().addScaledVector(aim, reach).addScaledVector(side, Math.sqrt(Math.max(0, upper ** 2 - reach ** 2)));
  aimBone(chain[0], chain[1], joint);
  aimBone(chain[1], chain[2], shoulder.addScaledVector(aim, gap));
}

function movingBone(root, name) {
  const bone = getBone(root, name);
  return { bone, rest: bone.quaternion.clone() };
}

function rotateRest(entry, x, y, z) {
  // Apply the rotation in parent axes so the imported bind orientation is preserved.
  rotation.setFromEuler(new THREE.Euler(x, y, z, 'YXZ'));
  entry.bone.quaternion.copy(rotation).multiply(entry.rest);
}

export async function loadRiders(scene) {
  const loader = new GLTFLoader();
  const [stan, zebra] = await Promise.all(['stan', 'zebra'].map((name) => loader.loadAsync(`${import.meta.env.BASE_URL}models/${name}.glb`)));
  const mount = new THREE.Group();
  const horse = new THREE.Group();
  const rider = new THREE.Group();
  scene.add(mount);
  mount.add(horse);
  horse.add(rider, zebra.scene);
  zebra.scene.scale.setScalar(fit);
  zebra.scene.position.set(0, .008, .035);
  rider.position.set(0, 1.48, .08);
  rider.add(stan.scene);
  stan.scene.rotation.y = Math.PI / 2;
  stan.scene.scale.setScalar(1.88);
  const pelvis = rider.worldToLocal(position(getBone(stan.scene, 'Pelvis')));
  stan.scene.position.set(0, .251, .021).sub(pelvis);
  mount.updateMatrixWorld(true);

  mount.traverse((object) => {
    if (object.isSkinnedMesh) object.frustumCulled = false;
  });
  const { glass, wine } = makeGlass();
  rider.add(glass);
  const limbs = [true, false].flatMap((front) => [true, false].map((left) => readZebraLeg(zebra.scene, front, left)));
  const hoofContacts = [];
  const zebraHead = movingBone(zebra.scene, 'tripoHead_1');
  const tail = movingBone(zebra.scene, 'tripoTail_0');
  const stanHead = movingBone(stan.scene, 'Head');
  const coats = ['LeftCoat', 'RightCoat'].map((name) => movingBone(stan.scene, name));
  const hands = ['L', 'R'].map((side) => ['Upperarm', 'Forearm', 'Hand'].map((bone) => getBone(stan.scene, `${side}_${bone}`)));
  const boots = ['L', 'R'].map((side) => ['Thigh', 'Calf', 'Foot'].map((bone) => getBone(stan.scene, `${side}_${bone}`)));
  const handRest = [...hands, ...boots].map((chain) => chain.map((bone) => bone.quaternion.clone()));
  const handMarker = new THREE.Object3D();
  hands[1][2].add(handMarker);
  const approximatePalm = rider.localToWorld(rider.worldToLocal(position(hands[1][2])).add(new THREE.Vector3(.01, -.025, -.018)));
  handMarker.position.copy(hands[1][2].worldToLocal(approximatePalm));
  const reinAnchors = [[-.026, .607, -.410], [.076, .617, -.401]].map((point) => {
    const marker = new THREE.Object3D();
    marker.position.copy(zebraHead.bone.worldToLocal(zebra.scene.localToWorld(new THREE.Vector3(...point))));
    zebraHead.bone.add(marker);
    return marker;
  });
  const reins = new THREE.BufferGeometry();
  const reinVertices = new THREE.BufferAttribute(new Float32Array(24), 3).setUsage(THREE.DynamicDrawUsage);
  reins.setAttribute('position', reinVertices);
  const line = new THREE.LineSegments(reins, new THREE.LineBasicMaterial({ color: 0x31291e }));
  line.frustumCulled = false;
  scene.add(line);
  let phase = 0;

  function pose({ dt, time, speed, steer, jump, toast, spilled, mounted = 1, action = null, recoil = 0, water = false, landing = false, impact = 0 }) {
    const drive = THREE.MathUtils.smoothstep(speed, .3, 4);
    const fast = THREE.MathUtils.smoothstep(speed, 4.8, 18.5);
    phase = (phase + dt * THREE.MathUtils.lerp(.75, 3.12, Math.min(speed / 35, 1)) * drive) % 1;
    const pulse = Math.cos(phase * tau * 2);
    const bounce = pulse * THREE.MathUtils.lerp(.024, .064, fast) * drive;
    horse.position.y = jump + bounce;
    horse.rotation.x = Math.sin(phase * tau) * fast * .067 - jump * .095 - recoil * .093;
    horse.rotation.z = -steer * .115;
    let contacts = 0;
    hoofContacts.length = 0;
    for (const leg of limbs) {
      const stride = poseZebraLeg(leg, phase, drive, fast, jump, bounce, impact);
      const contact = dt > 0 && speed > 2 && jump < .10 && leg.stride - stride > .65;
      if (contact) contacts++;
      if (water && (contact || landing)) hoofContacts.push(leg);
      leg.stride = stride;
    }
    rotateRest(zebraHead, pulse * .032 * drive, steer * .065, 0);
    rotateRest(tail, fast * -.18, Math.sin(time * 6) * (.11 + fast * .11), 0);

    const saddle = THREE.MathUtils.smoothstep(mounted, 0, 1);
    const fling = action?.kind === 'bottle' ? THREE.MathUtils.smoothstep(action.age, 0, .18) * (1 - THREE.MathUtils.smoothstep(action.age, .25, .67)) : 0;
    const heave = action?.kind === 'wine' ? THREE.MathUtils.smoothstep(action.age, 0, .24) * (1 - THREE.MathUtils.smoothstep(action.age, .28, .70)) : 0;
    rider.position.x = -1.06 * (1 - saddle);
    rider.position.y = THREE.MathUtils.lerp(.75, 1.48, saddle) + Math.sin(mounted * Math.PI) * .42 - pulse * drive * .027;
    rider.rotation.x = -fast * .13 + Math.sin(phase * tau) * .05 * drive - heave * .20 + recoil * .29;
    rider.rotation.z = steer * .064 + (1 - saddle) * .22 - heave * .18 - recoil * .19;
    for (const [index, chain] of [...hands, ...boots].entries()) {
      for (let joint = 0; joint < chain.length; joint++) chain[joint].quaternion.copy(handRest[index][joint]);
    }
    rotateRest(stanHead, -.035 * toast - heave * .19, -steer * .14 + heave * 1.77, Math.sin(time) * .04);
    for (const [index, coat] of coats.entries()) {
      const side = index === 0 ? -1 : 1;
      rotateRest(coat, side * .13, -(.52 + fast * .25) + Math.sin(phase * tau * 2 + side) * fast * .13, .04);
    }

    mount.updateMatrixWorld(true);
    for (const leg of hoofContacts) leg.bones[3].getWorldPosition(leg.strikePoint);
    poseStanLimb(rider, hands[0], [-.166, .32, -.436], [-.35, .33, -.21], .32 + saddle * .68);
    poseStanLimb(rider, hands[1], [.377 + .105 * toast + .14 * fling, .472 + .53 * toast + .32 * fling, -.367 + .19 * toast + .20 * fling], [.349 + .09 * toast, .398 + .18 * toast + .23 * fling, -.167], .76 + saddle * .24);
    for (const [index, boot] of boots.entries()) {
      const side = index === 0 ? -1 : 1;
      poseStanLimb(rider, boot, [side * .384, -.52, -.026], [side * .361, -.142, -.27], saddle);
    }
    glass.position.copy(rider.worldToLocal(position(handMarker)));
    glass.rotation.set(.14 + toast * .84, 0, -.12 - toast * .2);
    glass.visible = !fling || action.age > .48;
    wine.visible = !spilled;
    const grip = position(hands[0][2]);
    for (const [index, anchor] of reinAnchors.entries()) {
      const end = position(anchor);
      const sag = end.clone().lerp(grip, .5).addScaledVector(up, -.075);
      reinVertices.setXYZ(index * 4, grip.x, grip.y, grip.z);
      reinVertices.setXYZ(index * 4 + 1, sag.x, sag.y, sag.z);
      reinVertices.setXYZ(index * 4 + 2, sag.x, sag.y, sag.z);
      reinVertices.setXYZ(index * 4 + 3, end.x, end.y, end.z);
    }
    reinVertices.needsUpdate = true;
    line.visible = saddle > .80;
    return contacts;
  }

  return { mount, glass, pose, hoofContacts };
}
