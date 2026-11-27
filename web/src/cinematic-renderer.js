import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

export function makeCinematicRenderer(renderer, scene, camera, compact) {
  let composer;
  if (!compact && renderer.extensions.has('EXT_color_buffer_float')) {
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
    target.samples = 2;
    composer = new EffectComposer(renderer, target);
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .26, .63, .69);
    const resizeBloom = bloom.setSize.bind(bloom);
    bloom.setSize = (width, height) => resizeBloom(Math.max(1, Math.floor(width * .52)), Math.max(1, Math.floor(height * .52)));
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }
  let enhanced = Boolean(composer);
  return {
    resize(width, height) {
      if (!enhanced) return;
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(width, height);
    },
    reduce() {
      enhanced = false;
    },
    render() {
      if (enhanced) composer.render();
      else renderer.render(scene, camera);
    },
  };
}
