import * as THREE from 'three';

export function mountBackgroundScene() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      powerPreference: 'low-power',
    });
  } catch {
    return () => {};
  }
  const canvas = renderer.domElement;
  canvas.className = 'three-background';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 80);
  camera.position.set(0, 0, 13);
  const field = new THREE.Group();
  scene.add(field);

  const count = window.innerWidth < 700 ? 48 : 92;
  const positions = new Float32Array(count * 3);
  const nodes = [];
  for (let i = 0; i < count; i++) {
    const point = new THREE.Vector3(
      (Math.random() - 0.5) * 26,
      (Math.random() - 0.5) * 13,
      (Math.random() - 0.5) * 11,
    );
    nodes.push(point);
    positions.set(point.toArray(), i * 3);
  }
  const pointGeometry = new THREE.BufferGeometry();
  pointGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(
    pointGeometry,
    new THREE.PointsMaterial({
      color: 0xb8d78a,
      size: 0.055,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    }),
  );
  field.add(points);

  const links = [];
  for (let a = 0; a < nodes.length; a++) {
    for (let b = a + 1; b < nodes.length; b++) {
      if (nodes[a].distanceToSquared(nodes[b]) < 5.4 && Math.random() > 0.48)
        links.push(nodes[a], nodes[b]);
    }
  }
  const linkGeometry = new THREE.BufferGeometry().setFromPoints(links);
  const linkLines = new THREE.LineSegments(
    linkGeometry,
    new THREE.LineBasicMaterial({
      color: 0x78916a,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    }),
  );
  field.add(linkLines);

  const accents = [];
  for (const [x, y, scale] of [
    [-9, 2.7, 1.5],
    [8.5, -2.4, 1.15],
  ]) {
    const mesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        color: 0x92b56e,
        wireframe: true,
        transparent: true,
        opacity: 0.1,
        depthWrite: false,
      }),
    );
    mesh.position.set(x, y, -2.5);
    mesh.scale.setScalar(scale);
    field.add(mesh);
    accents.push(mesh);
  }

  let frame = 0;
  let lastFrame = 0;
  let pointerX = 0;
  let pointerY = 0;
  let aimX = 0;
  let aimY = 0;
  const onPointer = (event) => {
    aimX = (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 0.18;
    aimY = (event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 0.12;
  };
  const onResize = () => {
    camera.aspect = window.innerWidth / Math.max(window.innerHeight, 1);
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  const animate = (time) => {
    frame = requestAnimationFrame(animate);
    if (time - lastFrame < 32 || document.hidden) return;
    lastFrame = time;
    pointerX += (aimX - pointerX) * 0.035;
    pointerY += (aimY - pointerY) * 0.035;
    field.rotation.y = pointerX + time * 0.000018;
    field.rotation.x = pointerY;
    accents[0].rotation.y += 0.0015;
    accents[1].rotation.x += 0.0012;
    renderer.render(scene, camera);
  };
  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  frame = requestAnimationFrame(animate);

  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener('pointermove', onPointer);
    window.removeEventListener('resize', onResize);
    scene.traverse((object) => {
      object.geometry?.dispose();
      object.material?.dispose?.();
    });
    renderer.dispose();
    canvas.remove();
  };
}
