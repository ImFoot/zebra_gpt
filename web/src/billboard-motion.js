import * as THREE from 'three';

const base = `${import.meta.env.BASE_URL}ads/`;
const channels = ['Yesterday XR', 'Instant Hangover', 'Quit Later Cigarettes', 'Reddit Karma Exchange'];

function makeTileMaterial(atlas, index) {
  const material = new THREE.MeshBasicMaterial({ map: atlas, toneMapped: false, name: channels[index] });
  // Sample inside the tile to avoid picking up an adjacent channel at the edge.
  const insetX = 3 / 1024;
  const insetY = 3 / 576;
  const tile = new THREE.Vector4(.5 - 2 * insetX, .5 - 2 * insetY,
    (index % 2) * .5 + insetX, (1 - Math.floor(index / 2)) * .5 + insetY);
  material.onBeforeCompile = (shader) => {
    shader.uniforms.screenTile = { value: tile };
    shader.vertexShader = `uniform vec4 screenTile;\n${shader.vertexShader}`.replace('#include <uv_vertex>', `
      #include <uv_vertex>
      #ifdef USE_MAP
        vMapUv = vMapUv * screenTile.xy + screenTile.zw;
      #endif`);
  };
  return material;
}

export function makeBillboardMotion() {
  const poster = new THREE.TextureLoader().load(`${base}street-satire-poster.webp`);
  poster.colorSpace = THREE.SRGBColorSpace;
  poster.generateMipmaps = false;
  poster.minFilter = THREE.LinearFilter;
  const materials = channels.map((_, index) => makeTileMaterial(poster, index));

  const video = document.createElement('video');
  video.muted = video.defaultMuted = true;
  video.playsInline = video.loop = true;
  video.preload = 'none';
  video.disablePictureInPicture = true;
  video.setAttribute('playsinline', '');
  video.src = `${base}street-satire.mp4`;
  const texture = new THREE.VideoTexture(video);
  texture.colorSpace = THREE.SRGBColorSpace;

  let wanted = false;
  let usePoster = true;
  let gestureRetry = false;

  function show(atlas) {
    for (const material of materials) {
      if (material.map === atlas) continue;
      material.map = atlas;
      material.needsUpdate = true;
    }
  }

  function tryPlay() {
    if (!wanted || !video.paused) return;
    video.play().catch((error) => {
      if (wanted && error.name === 'NotAllowedError' && !gestureRetry) {
        gestureRetry = true;
        addEventListener('click', tryPlay);
        addEventListener('keydown', tryPlay);
      }
    });
  }

  video.addEventListener('playing', () => {
    if (gestureRetry) {
      removeEventListener('click', tryPlay);
      removeEventListener('keydown', tryPlay);
      gestureRetry = false;
    }
    if (wanted && !usePoster) show(texture);
  });
  video.addEventListener('error', () => show(poster));

  function setPlayback(active, still) {
    if (usePoster !== still) {
      usePoster = still;
      if (still) show(poster);
    }
    const next = active && !still && !document.hidden;
    if (wanted === next) return;
    wanted = next;
    if (wanted) tryPlay();
    else video.pause();
  }

  return { materials, setPlayback };
}
