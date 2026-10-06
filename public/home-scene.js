import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

const canvasHost = document.getElementById('mountainScene');
const hero = document.getElementById('homeHero');

if (canvasHost && hero && 'WebGLRenderingContext' in window) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(0, 6.5, 24);
  camera.lookAt(0, 1.5, 0);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(canvasHost.clientWidth, canvasHost.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  canvasHost.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xb7d9d3, 0x101b18, 2.1));
  const warmLight = new THREE.DirectionalLight(0xffb27c, 3.4);
  warmLight.position.set(-8, 12, 8);
  scene.add(warmLight);
  const coolLight = new THREE.DirectionalLight(0x9cc8da, 1.6);
  coolLight.position.set(7, 8, -8);
  scene.add(coolLight);

  const terrain = new THREE.PlaneGeometry(38, 23, 150, 88);
  const positions = terrain.attributes.position;
  const colors = [];
  const forest = new THREE.Color('#24483e');
  const rock = new THREE.Color('#728982');
  const snow = new THREE.Color('#e6e6db');
  const color = new THREE.Color();
  const peaks = [
    [-10, -2, 5.7, 3.3, 4.2],
    [-5.5, -3.2, 7.5, 2.1, 3.2],
    [0, -2.2, 5.1, 3.8, 4.1],
    [5.4, -3.6, 7.2, 2.7, 3.2],
    [10.1, -1.8, 5.6, 3.8, 4.3],
  ];

  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const depth = positions.getY(index);
    let height = -1.4;
    for (const [peakX, peakDepth, amplitude, spreadX, spreadDepth] of peaks) {
      const dx = (x - peakX) / spreadX;
      const dz = (depth - peakDepth) / spreadDepth;
      height += amplitude * Math.exp(-((dx * dx) + (dz * dz)) * 1.25);
    }
    height += Math.sin(x * 0.62 + depth * 0.34) * 0.22;
    height += Math.sin(x * 1.27 - depth * 0.58) * 0.12;
    positions.setZ(index, height);
    const snowMix = THREE.MathUtils.smoothstep(height, 2.5, 4.5);
    const rockMix = THREE.MathUtils.smoothstep(height, 0.2, 2.8);
    color.copy(forest).lerp(rock, rockMix).lerp(snow, snowMix);
    colors.push(color.r, color.g, color.b);
  }

  terrain.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  terrain.computeVertexNormals();
  terrain.rotateX(-Math.PI / 2);
  const mountain = new THREE.Mesh(terrain, new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.94,
    metalness: 0.02,
    transparent: true,
    opacity: 0.96,
  }));
  mountain.position.set(0, -3.4, -1.8);
  scene.add(mountain);

  const pointer = { x: 0, y: 0 };
  const onPointerMove = (event) => {
    const bounds = hero.getBoundingClientRect();
    pointer.x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 0.22;
    pointer.y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 0.1;
  };
  hero.addEventListener('pointermove', onPointerMove, { passive: true });

  const resize = () => {
    const width = Math.max(1, canvasHost.clientWidth);
    const height = Math.max(1, canvasHost.clientHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvasHost);

  let frameId = 0;
  let isVisible = true;
  const draw = (time = 0) => {
    if (!isVisible) return;
    const scrollProgress = THREE.MathUtils.clamp(-hero.getBoundingClientRect().top / Math.max(hero.clientHeight, 1), 0, 1);
    const scale = 0.98 + scrollProgress * 0.23;
    mountain.scale.set(scale, scale, scale);
    mountain.rotation.z += (pointer.x - mountain.rotation.z) * 0.025;
    mountain.rotation.x = -0.025 + pointer.y;
    mountain.position.y = -3.4 + scrollProgress * 0.18 + Math.sin(time * 0.00035) * 0.035;
    renderer.render(scene, camera);
    frameId = requestAnimationFrame(draw);
  };
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    isVisible = entry.isIntersecting && !document.hidden;
    cancelAnimationFrame(frameId);
    if (isVisible) frameId = requestAnimationFrame(draw);
  }, { threshold: 0.01 });
  visibilityObserver.observe(hero);
  document.addEventListener('visibilitychange', () => {
    isVisible = !document.hidden && hero.getBoundingClientRect().bottom > 0 && hero.getBoundingClientRect().top < window.innerHeight;
    cancelAnimationFrame(frameId);
    if (isVisible) frameId = requestAnimationFrame(draw);
  });
  draw();
}