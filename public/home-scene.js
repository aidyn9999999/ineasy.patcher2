// INEASY original neon anime-inspired guardian, rendered procedurally with Three.js (MIT).
// Original geometry, no third-party character model or copyrighted character asset.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

const host = document.getElementById('home3dScene');
const hero = document.getElementById('homeHero');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

if (host && hero && 'WebGLRenderingContext' in window) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0, 16.5);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: 'low-power',
    stencil: false,
  });
  const mobile = () => matchMedia('(max-width: 700px)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile() ? 1 : 1.45));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xdceaff, 0x100b28, 1.9));
  const keyLight = new THREE.DirectionalLight(0xddeaff, 2.7);
  keyLight.position.set(-4, 7, 9);
  scene.add(keyLight);
  const cyanLight = new THREE.PointLight(0x22dbff, 34, 14, 2);
  cyanLight.position.set(2.6, 1.7, 4);
  scene.add(cyanLight);
  const violetLight = new THREE.PointLight(0x925bff, 27, 16, 2);
  violetLight.position.set(-3.4, 1, 1);
  scene.add(violetLight);
  const pinkLight = new THREE.PointLight(0xf052d4, 13, 11, 2);
  pinkLight.position.set(1, -2, 2);
  scene.add(pinkLight);

  const skin = new THREE.MeshPhysicalMaterial({
    color: '#b8cde8', metalness: .18, roughness: .28,
    clearcoat: 1, clearcoatRoughness: .16, emissive: '#10264b', emissiveIntensity: .28
  });
  const hair = new THREE.MeshPhysicalMaterial({
    color: '#111a3b', metalness: .72, roughness: .2,
    clearcoat: 1, clearcoatRoughness: .13, emissive: '#2023a1', emissiveIntensity: .62
  });
  const hairLight = new THREE.MeshStandardMaterial({
    color: '#7deaff', metalness: .45, roughness: .19, emissive: '#14b9ff', emissiveIntensity: 1.85
  });
  const hairViolet = new THREE.MeshStandardMaterial({
    color: '#b7a5ff', metalness: .55, roughness: .2, emissive: '#7944ff', emissiveIntensity: 1.35
  });
  const armor = new THREE.MeshPhysicalMaterial({
    color: '#10182b', metalness: .78, roughness: .23,
    clearcoat: 1, clearcoatRoughness: .18, emissive: '#10204a', emissiveIntensity: .3
  });
  const armorEdge = new THREE.MeshStandardMaterial({
    color: '#293a61', metalness: .72, roughness: .24, emissive: '#184d9b', emissiveIntensity: .6
  });
  const cyan = new THREE.MeshBasicMaterial({ color: '#7af5ff' });
  const violet = new THREE.MeshBasicMaterial({ color: '#c2a0ff' });
  const cyanGlow = new THREE.MeshBasicMaterial({
    color: '#24dfff', transparent: true, opacity: .18, blending: THREE.AdditiveBlending, depthWrite: false
  });
  const violetGlow = new THREE.MeshBasicMaterial({
    color: '#9351ff', transparent: true, opacity: .17, blending: THREE.AdditiveBlending, depthWrite: false
  });
  const lineMat = new THREE.MeshStandardMaterial({
    color: '#61eaff', emissive: '#11bdff', emissiveIntensity: 1.65,
    metalness: .4, roughness: .22, transparent: true, opacity: .94
  });
  const softLineMat = new THREE.MeshStandardMaterial({
    color: '#ac8dff', emissive: '#6c30ff', emissiveIntensity: 1.4,
    metalness: .5, roughness: .25, transparent: true, opacity: .78
  });

  const avatar = new THREE.Group();
  scene.add(avatar);

  function addMesh(geometry, material, position, scale, rotation, parent = avatar) {
    const mesh = new THREE.Mesh(geometry, material);
    if (position) mesh.position.set(position[0], position[1], position[2]);
    if (scale) mesh.scale.set(scale[0], scale[1], scale[2]);
    if (rotation) mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
    parent.add(mesh);
    return mesh;
  }
  function sphere(radius, material, position, scale, parent = avatar) {
    return addMesh(new THREE.SphereGeometry(radius, 32, 24), material, position, scale, null, parent);
  }
  function tube(points, radius, material, parent = avatar, segments = 36) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[0], p[1], p[2])));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, segments, radius, 8, false), material);
    parent.add(mesh);
    return mesh;
  }
  function frontShape(points, material, z) {
    const shape = new THREE.Shape();
    shape.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1]);
    shape.closePath();
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), material);
    mesh.position.z = z;
    avatar.add(mesh);
    return mesh;
  }

  // Upper body: layered technical jacket, high collar and luminous seam details.
  sphere(1, armor, [0, -1.45, 0], [1.45, .93, .62]);
  addMesh(new THREE.ConeGeometry(1.38, 1.62, 7, 1), armor, [0, -1.48, .03], [1, 1, .7], [Math.PI, 0, 0]);
  sphere(.36, skin, [0, -.45, .2], [.75, .95, .66]);
  addMesh(new THREE.ConeGeometry(.53, .82, 5, 1), armorEdge, [0, -.42, .3], [1, .75, .7], [Math.PI, 0, 0]);

  // Collar plates, shoulder shells, glowing seams and a small energy core.
  addMesh(new THREE.SphereGeometry(.62, 28, 22), armorEdge, [-.98, -.75, .14], [.85, .7, .8], [0, 0, .36]);
  addMesh(new THREE.SphereGeometry(.62, 28, 22), armorEdge, [.98, -.75, .14], [.85, .7, .8], [0, 0, -.36]);
  const collarLeft = frontShape([[-.68,-.55],[-.33,-.12],[-.06,-.7],[-.24,-1.24]], armorEdge, .58);
  const collarRight = frontShape([[.68,-.55],[.33,-.12],[.06,-.7],[.24,-1.24]], armorEdge, .58);
  tube([[-1.45,-.95,.44],[-1.05,-.5,.62],[-.68,-.69,.62]], .025, lineMat);
  tube([[1.45,-.95,.44],[1.05,-.5,.62],[.68,-.69,.62]], .025, lineMat);
  tube([[-1.0,-1.55,.52],[-.5,-1.9,.59],[0,-2.0,.6],[.5,-1.9,.59],[1,-1.55,.52]], .018, softLineMat);
  sphere(.15, cyanGlow, [0,-1.22,.72], [.95,.95,.45]);
  sphere(.065, cyan, [0,-1.22,.75], [1,1,.55]);
  addMesh(new THREE.OctahedronGeometry(.105, 0), violet, [0,-1.22,.84], null, [0,0,Math.PI/4]);

  // Neck and a softly faceted anime-inspired face.
  addMesh(new THREE.CylinderGeometry(.25,.31,.58,24,1), skin, [0,.12,.27], [1,1,.92]);
  sphere(.74, skin, [0,.83,.28], [.78,1.05,.61]);
  // Jaw highlights and subtle cheeks add readable facial planes without realism overload.
  sphere(.24, new THREE.MeshStandardMaterial({
    color:'#8eb5df', emissive:'#224a8f', emissiveIntensity:.26, metalness:.12, roughness:.3, transparent:true, opacity:.32
  }), [-.35,.48,.68], [.85,.6,.16]);
  sphere(.24, new THREE.MeshStandardMaterial({
    color:'#8eb5df', emissive:'#224a8f', emissiveIntensity:.26, metalness:.12, roughness:.3, transparent:true, opacity:.32
  }), [.35,.48,.68], [.85,.6,.16]);

  // Oversized luminous anime eyes with separate outer halos.
  sphere(.2, cyanGlow, [-.285,.86,.755], [1.18,.76,.48]);
  sphere(.2, cyanGlow, [.285,.86,.755], [1.18,.76,.48]);
  sphere(.133, cyan, [-.285,.865,.805], [1.05,.47,.35]);
  sphere(.133, cyan, [.285,.865,.805], [1.05,.47,.35]);
  sphere(.063, new THREE.MeshBasicMaterial({ color:'#ffffff' }), [-.3,.875,.85], [.75,.58,.38]);
  sphere(.063, new THREE.MeshBasicMaterial({ color:'#ffffff' }), [.27,.875,.85], [.75,.58,.38]);
  tube([[-.49,1.08,.76],[-.29,1.16,.79],[-.1,1.1,.77]], .027, hairViolet);
  tube([[.1,1.1,.77],[.29,1.16,.79],[.49,1.08,.76]], .027, hairViolet);
  tube([[0,.83,.86],[.025,.66,.85],[-.02,.62,.83]], .018, armorEdge);
  tube([[-.19,.44,.81],[-.08,.415,.835],[.07,.415,.835],[.18,.45,.81]], .018, softLineMat);

  // Tiny luminous ear-cups / cyber accessories.
  for (const side of [-1,1]) {
    sphere(.19, armor, [side*.72,.84,.16], [.65,1.06,.95]);
    addMesh(new THREE.TorusGeometry(.155,.025,10,40), side < 0 ? lineMat : softLineMat,
      [side*.78,.84,.47], null, [0,0,side*.12]);
    sphere(.075, side < 0 ? cyan : violet, [side*.79,.84,.51], [.9,.9,.35]);
  }

  // Hair cap and distinct swept spikes — silhouette stays legible on phone screens.
  sphere(.82, hair, [0,1.55,.12], [1.02,.55,.79]);
  const spikes = [
    [-.62,1.72,.16,.58,-.34,.25,.79],
    [-.39,1.9,.21,.31,-.5,.14,.9],
    [-.1,1.99,.21,.2,-.13,.07,.83],
    [.2,1.96,.2,.28,.36,-.03,.84],
    [.51,1.78,.15,.54,.63,-.2,.78],
    [.72,1.57,.08,.48,.85,-.31,.69],
    [-.74,1.45,.1,.44,.84,.36,.7],
    [.37,1.48,.4,.34,.18,-.1,.72],
  ];
  for (let i = 0; i < spikes.length; i++) {
    const [x,y,z,h,rz,rx,w] = spikes[i];
    addMesh(new THREE.ConeGeometry(w*.32,h,5,1), i % 3 === 0 ? hairViolet : hair,
      [x,y,z], [1,1,1], [rx,0,rz]);
  }
  // Angular front locks overlap the forehead like sculpted strands.
  frontShape([[-.72,1.76],[-.28,1.87],[-.04,1.65],[-.16,1.08],[-.36,1.4],[-.47,1.16]], hairLight, .86);
  frontShape([[-.25,1.9],[.18,1.94],[.35,1.7],[.15,1.06],[.02,1.34]], hair, .9);
  frontShape([[.1,1.87],[.55,1.75],[.63,1.48],[.41,1.59],[.27,1.16],[.17,1.39]], hairViolet, .88);
  frontShape([[.5,1.65],[.78,1.57],[.66,1.29],[.55,1.42]], hairLight, .83);
  tube([[-.82,1.73,.58],[-.56,1.91,.64],[-.32,1.95,.63]], .022, lineMat);
  tube([[.16,2.06,.36],[.46,1.91,.51],[.68,1.7,.5]], .024, softLineMat);
  tube([[-.55,1.42,.84],[-.48,1.23,.82],[-.41,1.16,.8]], .016, lineMat);
  tube([[.34,1.45,.84],[.28,1.25,.84],[.22,1.16,.81]], .016, lineMat);

  // Floating holographic halo and slow-moving light rings behind the character.
  const halo = new THREE.Group();
  avatar.add(halo);
  const haloBlue = new THREE.MeshStandardMaterial({
    color:'#64eaff', emissive:'#11cfff', emissiveIntensity:1.65,
    metalness:.5, roughness:.22, transparent:true, opacity:.72
  });
  const haloPurple = new THREE.MeshStandardMaterial({
    color:'#b7a0ff', emissive:'#813fff', emissiveIntensity:1.55,
    metalness:.48, roughness:.24, transparent:true, opacity:.68
  });
  const haloOuter = addMesh(new THREE.TorusGeometry(2.23,.013,8,180), haloBlue, [0,.48,-.45], null, [.92,.05,-.2], halo);
  const haloInner = addMesh(new THREE.TorusGeometry(1.86,.009,8,150), haloPurple, [0,.48,-.5], null, [.4,.7,.34], halo);
  const haloOrbit = addMesh(new THREE.TorusGeometry(2.48,.008,8,170), haloBlue, [0,.48,-.58], null, [1.08,-.34,.48], halo);

  // Small precision crystals and restrained dust particles for a premium hologram feel.
  const crystal1 = addMesh(new THREE.OctahedronGeometry(.14,0), cyan, [1.96,1.2,-.05], null, [0,0,.25]);
  const crystal2 = addMesh(new THREE.OctahedronGeometry(.105,0), violet, [-1.92,-.46,.2], null, [.4,.2,.5]);
  const crystal3 = addMesh(new THREE.IcosahedronGeometry(.08,0), hairLight, [1.62,-1.7,.2], null, [.4,.5,0]);
  const flecks = [];
  for (let i=0;i<100;i++) {
    const a=i*2.399963229728653, r=2.9+((i%13)/13)*2.15;
    flecks.push(Math.cos(a)*r, Math.sin(a*1.31)*2.6, -1.5-(i%7)*.18);
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position',new THREE.Float32BufferAttribute(flecks,3));
  const particles = new THREE.Points(particleGeometry,new THREE.PointsMaterial({
    color:'#9beeff', size:.024, transparent:true, opacity:.6, depthWrite:false, sizeAttenuation:true
  }));
  scene.add(particles);

  const pointer={x:0,y:0,tx:0,ty:0};
  hero.addEventListener('pointermove',(event)=>{
    const bounds=hero.getBoundingClientRect();
    pointer.tx=THREE.MathUtils.clamp(((event.clientX-bounds.left)/Math.max(bounds.width,1)-.5)*.22,-.12,.12);
    pointer.ty=THREE.MathUtils.clamp(((event.clientY-bounds.top)/Math.max(bounds.height,1)-.5)*.12,-.08,.08);
  },{passive:true});
  hero.addEventListener('pointerleave',()=>{pointer.tx=0;pointer.ty=0;},{passive:true});

  const resize=()=>{
    const w=Math.max(1,host.clientWidth), h=Math.max(1,host.clientHeight);
    camera.aspect=w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h,false);
    const phone=mobile();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,phone?1:1.45));
    avatar.position.set(phone?.1:3.25,phone?-2.0:-.08,0);
    avatar.scale.setScalar(phone?.67:.95);
    avatar.rotation.set(-.025,-.14,.035);
  };
  const observer=new ResizeObserver(resize);
  observer.observe(host);
  resize();

  let frame=0, visible=true, last=0;
  function draw(time=0){
    if(!visible||document.hidden)return;
    if(reducedMotion){renderer.render(scene,camera);return;}
    const phone=mobile(), interval=1000/(phone?24:30);
    if(!last||time-last>=interval){
      pointer.x+=(pointer.tx-pointer.x)*.035;
      pointer.y+=(pointer.ty-pointer.y)*.035;
      avatar.rotation.y=-.14+pointer.x+Math.sin(time*.00031)*.055;
      avatar.rotation.x=-.025+pointer.y+Math.sin(time*.00043)*.016;
      avatar.position.y=(phone?-2.0:-.08)+Math.sin(time*.00047)*(phone?.045:.075);
      halo.rotation.z=Math.sin(time*.00017)*.045;
      haloOuter.rotation.y=.05+Math.sin(time*.0003)*.035;
      haloInner.rotation.z=-.34+Math.sin(time*.00024)*.04;
      crystal1.rotation.y+=.006; crystal2.rotation.x+=.004; crystal3.rotation.z+=.005;
      particles.rotation.z=Math.sin(time*.00012)*.025;
      cyanLight.intensity=30+Math.sin(time*.0012)*4;
      violetLight.intensity=24+Math.cos(time*.0009)*4;
      renderer.render(scene,camera);
      last=time;
    }
    frame=requestAnimationFrame(draw);
  }
  const updateVisibility=()=>{
    visible=!document.hidden&&hero.getBoundingClientRect().bottom>0&&hero.getBoundingClientRect().top<window.innerHeight;
    cancelAnimationFrame(frame);
    if(visible){if(!reducedMotion)frame=requestAnimationFrame(draw);else renderer.render(scene,camera);}
  };
  const intersectionObserver=new IntersectionObserver(([entry])=>{
    visible=entry.isIntersecting&&!document.hidden;
    cancelAnimationFrame(frame);
    if(visible){if(!reducedMotion)frame=requestAnimationFrame(draw);else renderer.render(scene,camera);}
  },{threshold:.01});
  intersectionObserver.observe(hero);
  document.addEventListener('visibilitychange',updateVisibility);
  window.addEventListener('resize',resize,{passive:true});
  draw();
}
