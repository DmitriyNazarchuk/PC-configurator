import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function mountPCPreview(
  canvas,
  modelUrl,
  { onProgress = () => {}, onLoaded = () => {}, onError = () => {} } = {},
) {
  let disposed = false;
  let animationFrame = 0;
  let modelRequest = null;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
  } catch (error) {
    onError(error);
    return () => {};
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 1000);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.8;

  // Neutral lighting reveals the model's own materials and colors without adding parts or effects.
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8b9188, 3.2));
  const keyLight = new THREE.DirectionalLight(0xffffff, 4.0);
  keyLight.position.set(4, 7, 6);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xffffff, 2.2);
  fillLight.position.set(-5, 3, -4);
  scene.add(fillLight);
  const frontLight = new THREE.DirectionalLight(0xffffff, 1.8);
  frontLight.position.set(0, 1, 8);
  scene.add(frontLight);

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  modelRequest = new GLTFLoader().load(
    modelUrl,
    (gltf) => {
      if (disposed) {
        disposeTree(gltf.scene);
        return;
      }
      const modelRoot = gltf.scene;
      const bounds = new THREE.Box3().setFromObject(modelRoot);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      modelRoot.position.sub(center);
      scene.add(modelRoot);

      const radius = Math.max(size.length() * 0.5, 0.01);
      controls.target.set(0, 0, 0);
      camera.near = Math.max(radius / 100, 0.001);
      camera.far = radius * 100;
      camera.position.set(radius * 1.65, radius * 1.05, radius * 2.1);
      camera.lookAt(0, 0, 0);
      controls.minDistance = radius * 1.35;
      controls.maxDistance = radius * 8;
      controls.update();

      onLoaded();
      resize();
      renderer.render(scene, camera);
      render();
    },
    (event) => {
      if (disposed) return;
      const loaded = event.loaded || 0;
      const total = event.total || 0;
      onProgress({
        loaded,
        total,
        percent: total ? Math.min(100, Math.round((loaded / total) * 100)) : null,
      });
    },
    (error) => {
      if (!disposed) onError(error);
    },
  );

  const render = () => {
    animationFrame = requestAnimationFrame(render);
    controls.update();
    renderer.render(scene, camera);
  };

  return () => {
    disposed = true;
    modelRequest?.abort?.();
    cancelAnimationFrame(animationFrame);
    observer.disconnect();
    controls.dispose();
    disposeTree(scene);
    renderer.dispose();
  };
}

function disposeTree(root) {
  root.traverse?.((object) => {
    object.geometry?.dispose();
    if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
    else object.material?.dispose();
    for (const value of Object.values(object)) {
      if (value?.isTexture) value.dispose();
    }
  });
}
