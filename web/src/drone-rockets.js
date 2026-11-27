import * as THREE from 'three';
import { makeSparks } from './pursuit-actors.js';
import { routeAt, routeHeading, tunnelStart } from './route.js';

const { clamp, smoothstep } = THREE.MathUtils;
const windup = .72;
const flight = .54;
const burstRadius = 2.15;

function glowMap() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 48;
  const ctx = canvas.getContext('2d');
  const glow = ctx.createRadialGradient(24, 24, 0, 24, 24, 24);
  glow.addColorStop(0, '#fff');
  glow.addColorStop(.27, '#ffffffa8');
  glow.addColorStop(.65, '#ffffff2c');
  glow.addColorStop(1, '#ffffff00');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 48, 48);
  return new THREE.CanvasTexture(canvas);
}

function flare(map, color) {
  return new THREE.Sprite(new THREE.SpriteMaterial({
    map, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  }));
}

export function makeDroneRockets(scene, drone, compact) {
  const map = glowMap();
  const metal = new THREE.MeshStandardMaterial({ color: 0x49535a, roughness: .37, metalness: .7 });
  const missile = new THREE.Group();
  missile.name = 'Drone bay rocket';
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.095, .103, .66, 9), metal);
  body.rotation.x = Math.PI / 2;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(.095, .23, 9), metal);
  nose.rotation.x = Math.PI / 2;
  nose.position.z = .445;
  const exhaust = flare(map, 0xffa44c);
  exhaust.position.z = -.53;
  exhaust.scale.set(.8, .8, 1);
  missile.add(body, nose, exhaust);
  scene.add(missile);
  const bayFlash = flare(map, 0xffad64);
  bayFlash.position.set(0, -.23, .42);
  bayFlash.scale.set(1.18, .90, 1);
  drone.add(bayFlash);

  const trace = new THREE.Group();
  const trail = Array.from({ length: compact ? 8 : 15 }, (_, index) => {
    const puff = flare(map, index < 5 ? 0xff943e : 0xc73e24);
    trace.add(puff);
    return puff;
  });
  scene.add(trace);

  const marker = new THREE.Group();
  marker.name = 'Drone rocket impact warning';
  const outline = new THREE.MeshBasicMaterial({ color: 0xff7664, transparent: true, depthWrite: false, toneMapped: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(burstRadius - .082, burstRadius, 48), outline);
  const fill = new THREE.Mesh(new THREE.CircleGeometry(burstRadius, 44), new THREE.MeshBasicMaterial({
    color: 0xf63d29, transparent: true, opacity: .17, depthWrite: false, toneMapped: false,
  }));
  ring.rotation.x = fill.rotation.x = -Math.PI / 2;
  ring.position.y = .009;
  marker.renderOrder = ring.renderOrder = fill.renderOrder = 6;
  marker.add(fill, ring);
  scene.add(marker);

  const hitGlow = flare(map, 0xff792f);
  hitGlow.name = 'Drone rocket impact';
  scene.add(hitGlow);
  const sparks = makeSparks(scene);
  const origin = new THREE.Vector3();
  const spot = new THREE.Vector3();
  const aim = new THREE.Vector3();
  let attack;
  let explosion;
  let previousDrone;
  let nextAttack;

  function reset() {
    attack = explosion = null;
    previousDrone = -1;
    nextAttack = 0;
    missile.visible = trace.visible = marker.visible = hitGlow.visible = bayFlash.visible = false;
    sparks();
  }

  function flightPoint(t, result) {
    result.copy(origin).lerp(spot, t);
    result.y += Math.sin(t * Math.PI) * 1.1;
    return result;
  }

  function update(dt, run, activeDrone, still) {
    const cues = { rocketLock: false, rocketLaunch: false, rocketImpact: false, rocketDamage: 0 };
    if (activeDrone !== previousDrone) {
      previousDrone = activeDrone;
      nextAttack = run.time + 1.27;
      if (attack && !attack.launched) attack = null;
    }
    if (!attack && activeDrone >= 0 && run.s < tunnelStart - 54 && run.time >= nextAttack) {
      const lane = clamp(run.x, -5.7, 5.7);
      const distance = run.s + run.speed * (windup + flight);
      routeAt(distance, lane, .069, spot);
      attack = { age: 0, lane, distance, launched: false };
      cues.rocketLock = true;
    }
    marker.visible = Boolean(attack);
    missile.visible = trace.visible = bayFlash.visible = false;
    if (attack) {
      attack.age += dt;
      marker.position.copy(spot);
      const progress = smoothstep(attack.age, 0, windup + flight);
      outline.opacity = .59 + progress * .38;
      fill.material.opacity = .12 + progress * .19;
      if (attack.age >= windup) {
        if (!attack.launched) {
          // The rocket emerges from beneath the center of the original airframe.
          origin.set(0, -.18, .40);
          drone.localToWorld(origin);
          attack.launched = true;
          cues.rocketLaunch = true;
        }
        const t = clamp((attack.age - windup) / flight, 0, 1);
        bayFlash.visible = activeDrone >= 0 && t < .25;
        bayFlash.material.opacity = (still ? .36 : .65) * (1 - smoothstep(t, 0, .25));
        if (t < 1) {
          missile.visible = trace.visible = true;
          flightPoint(t, missile.position);
          missile.lookAt(flightPoint(Math.min(1, t + .02), aim));
          for (const [index, puff] of trail.entries()) {
            const tail = t - (index + 1) * .027;
            puff.visible = tail > 0;
            if (!puff.visible) continue;
            flightPoint(tail, puff.position);
            const size = .43 + index * .075;
            puff.scale.set(size * 1.28, size, 1);
            puff.material.opacity = .82 - index / trail.length * .63;
          }
        } else {
          const miss = Math.hypot(run.x - attack.lane, (run.s - attack.distance) * .51);
          cues.rocketImpact = true;
          if (run.jump < .61 && miss < burstRadius) cues.rocketDamage = miss < 1.1 ? .31 : .17;
          explosion = { position: spot.clone(), age: 0, style: 'impact', yaw: routeHeading(attack.distance) };
          marker.visible = false;
          attack = null;
          nextAttack = run.time + Math.max(1.7, 2.9 - run.lap * .18);
        }
      }
    }

    if (explosion) {
      explosion.age += dt;
      if (explosion.age >= .66) explosion = null;
    }
    hitGlow.visible = Boolean(explosion);
    if (explosion) {
      const { age, position } = explosion;
      hitGlow.position.copy(position);
      hitGlow.position.y += .53 + age * 1.6;
      const size = 1.9 + 6.0 * Math.min(age, .42);
      hitGlow.scale.set(size, size * .72, 1);
      hitGlow.material.opacity = (still ? .48 : .84) * (1 - age / .66) ** 2;
    }
    sparks(explosion);
    return cues;
  }

  reset();
  return { update, reset, get warning() { return Boolean(attack); } };
}
