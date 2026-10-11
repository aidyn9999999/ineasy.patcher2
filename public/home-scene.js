// INEASY hero scene built with the open-source Three.js library (MIT).
// Official examples and documentation: https://threejs.org/examples/
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

const host = document.getElementById('home3dScene');
const hero = document.getElementById('homeHero');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

if (host && hero && 'WebGLRenderingContext' in window) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0, 17);
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power', stencil: false });
  const mobile = () => matchMedia('(max-width: 700px)').matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile() ? 1 : 1.45));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xe5edf7, 0x18202b, 2.0));
  const keyLight = new THREE.DirectionalLight(0xf5f8ff, 3.2);
  keyLight.position.set(-5, 8, 10);
  scene.add(keyLight);
  const rimLight = new THREE.PointLight(0x9db4d2, 28, 22, 2);
  rimLight.position.set(5, 2, 4);
  scene.add(rimLight);
  const fillLight = new THREE.PointLight(0x7289a8, 15, 18, 2);
  fillLight.position.set(-5, -3, -1);
  scene.add(fillLight);

  const shellMat = new THREE.MeshPhysicalMaterial({ color: '#cbd5e2', metalness: .82, roughness: .24, clearcoat: .9, clearcoatRoughness: .18 });
  const edgeMat = new THREE.MeshStandardMaterial({ color: '#7d8ca1', metalness: .78, roughness: .3 });
  const screenMat = new THREE.MeshPhysicalMaterial({ color: '#0b111b', metalness: .45, roughness: .18, clearcoat: 1, clearcoatRoughness: .12 });
  const glowMat = new THREE.MeshStandardMaterial({ color: '#e7edf5', emissive: '#7b91ae', emissiveIntensity: .35, metalness: .5, roughness: .23 });
  const dimGlowMat = new THREE.MeshStandardMaterial({ color: '#64758b', emissive: '#273c56', emissiveIntensity: .62, metalness: .38, roughness: .3, transparent: true, opacity: .92 });

  function roundedShape(w, h, radius) {
    const x = w / 2, y = h / 2, r = Math.min(radius, x, y);
    const s = new THREE.Shape();
    s.moveTo(-x+r,-y); s.lineTo(x-r,-y); s.quadraticCurveTo(x,-y,x,-y+r);
    s.lineTo(x,y-r); s.quadraticCurveTo(x,y,x-r,y); s.lineTo(-x+r,y);
    s.quadraticCurveTo(-x,y,-x,y-r); s.lineTo(-x,-y+r); s.quadraticCurveTo(-x,-y,-x+r,-y);
    return s;
  }
  function plate(w,h,d,r,mat,bevel=.035) {
    const g = new THREE.ExtrudeGeometry(roundedShape(w,h,r), { depth:d, bevelEnabled:bevel>0, bevelThickness:bevel, bevelSize:bevel, bevelSegments:3, curveSegments:7, steps:1 });
    g.computeVertexNormals();
    return new THREE.Mesh(g,mat);
  }

  const composition = new THREE.Group();
  scene.add(composition);
  const card = new THREE.Group();
  composition.add(card);

  const shell = plate(5.8,3.85,.28,.38,shellMat,.07);
  shell.position.z=-.16; card.add(shell);
  const frame = plate(5.53,3.58,.08,.3,edgeMat,.025);
  frame.position.z=.055; card.add(frame);
  const screen = plate(5.38,3.43,.07,.24,screenMat,.014);
  screen.position.z=.13; card.add(screen);

  const dots = [
    new THREE.MeshStandardMaterial({ color:'#dbe3ed', emissive:'#7d91aa', emissiveIntensity:.3 }),
    new THREE.MeshStandardMaterial({ color:'#8293a8', metalness:.45, roughness:.3 }),
    new THREE.MeshStandardMaterial({ color:'#54657a', metalness:.45, roughness:.32 })
  ];
  const dotGeom = new THREE.SphereGeometry(.055,18,14);
  [-2.2,-2.0,-1.8].forEach((x,i)=>{ const d=new THREE.Mesh(dotGeom,dots[i]); d.position.set(x,1.27,.24); card.add(d); });
  const status = plate(.85,.11,.035,.055,dimGlowMat,.01);
  status.position.set(1.85,1.27,.24); card.add(status);

  const triangle = new THREE.Shape();
  triangle.moveTo(-.2,-.42); triangle.lineTo(.48,0); triangle.lineTo(-.2,.42); triangle.closePath();
  const play = new THREE.Mesh(new THREE.ShapeGeometry(triangle),glowMat);
  play.position.set(.02,.1,.265); card.add(play);
  const playRing = new THREE.Mesh(new THREE.TorusGeometry(.78,.018,10,96),dimGlowMat);
  playRing.position.set(0,.1,.26); card.add(playRing);

  const timeline = plate(2.9,.075,.028,.0375,edgeMat,.008);
  timeline.position.set(-.25,-1.18,.25); card.add(timeline);
  const timelineFill = plate(1.92,.048,.03,.024,glowMat,.006);
  timelineFill.position.set(-.74,-1.18,.29); card.add(timelineFill);
  const scrubber = new THREE.Mesh(new THREE.SphereGeometry(.09,20,16),glowMat);
  scrubber.position.set(.24,-1.18,.32); card.add(scrubber);
  const tinyBarGeom = new THREE.BoxGeometry(.36,.055,.025);
  for(let i=0;i<3;i++){const bar=new THREE.Mesh(tinyBarGeom,i===0?glowMat:dimGlowMat);bar.position.set(-1.75+i*.46,-.93,.25);card.add(bar);}

  const orbit = new THREE.Group();
  composition.add(orbit);
  const ringMat = new THREE.MeshStandardMaterial({ color:'#a9b9ce', metalness:.78, roughness:.25, transparent:true, opacity:.48 });
  const ringA = new THREE.Mesh(new THREE.TorusGeometry(3.48,.013,8,150),ringMat);
  ringA.rotation.set(.42,.18,.28); orbit.add(ringA);
  const ringB = new THREE.Mesh(new THREE.TorusGeometry(3.18,.009,8,140),dimGlowMat);
  ringB.rotation.set(1.08,-.48,-.35); orbit.add(ringB);

  const markerA = new THREE.Mesh(new THREE.OctahedronGeometry(.14,0),glowMat);
  markerA.position.set(3.38,.68,.12); composition.add(markerA);
  const markerB = new THREE.Mesh(new THREE.IcosahedronGeometry(.105,0),edgeMat);
  markerB.position.set(-3,-1.06,.45); composition.add(markerB);
  const markerC = new THREE.Mesh(new THREE.BoxGeometry(.19,.19,.19),dimGlowMat);
  markerC.position.set(2.5,-1.55,.15); markerC.rotation.set(.5,.4,.2); composition.add(markerC);

  const flecks=[];
  for(let i=0;i<85;i++){const a=i*2.399963229728653,r=3.7+((i%11)/11)*2;flecks.push(Math.cos(a)*r,Math.sin(a*1.27)*2.6,-1.8-(i%7)*.18);}
  const fleckGeometry=new THREE.BufferGeometry();
  fleckGeometry.setAttribute('position',new THREE.Float32BufferAttribute(flecks,3));
  const particles=new THREE.Points(fleckGeometry,new THREE.PointsMaterial({color:'#b2c2d6',size:.026,transparent:true,opacity:.56,depthWrite:false,sizeAttenuation:true}));
  scene.add(particles);

  const pointer={x:0,y:0,tx:0,ty:0};
  hero.addEventListener('pointermove',(e)=>{
    const b=hero.getBoundingClientRect();
    pointer.tx=THREE.MathUtils.clamp(((e.clientX-b.left)/Math.max(b.width,1)-.5)*.22,-.12,.12);
    pointer.ty=THREE.MathUtils.clamp(((e.clientY-b.top)/Math.max(b.height,1)-.5)*.12,-.08,.08);
  },{passive:true});
  hero.addEventListener('pointerleave',()=>{pointer.tx=0;pointer.ty=0;},{passive:true});

  const resize=()=>{
    const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);
    camera.aspect=w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h,false);
    const onPhone=mobile();
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,onPhone?1:1.45));
    composition.position.set(onPhone?1.15:3.35,onPhone?-1.7:.02,0);
    composition.scale.setScalar(onPhone?.62:1);
    composition.rotation.set(-.08,-.19,.045);
    orbit.position.copy(composition.position); orbit.scale.copy(composition.scale);
    markerA.visible=markerB.visible=markerC.visible=!onPhone;
  };
  const ro=new ResizeObserver(resize); ro.observe(host); resize();

  let raf=0, visible=true, last=0;
  function draw(time=0){
    if(!visible||document.hidden)return;
    if(reducedMotion){renderer.render(scene,camera);return;}
    const onPhone=mobile(), interval=1000/(onPhone?24:30);
    if(!last||time-last>=interval){
      pointer.x+=(pointer.tx-pointer.x)*.035; pointer.y+=(pointer.ty-pointer.y)*.035;
      composition.rotation.y=-.19+pointer.x+Math.sin(time*.00032)*.07;
      composition.rotation.x=-.08+pointer.y+Math.sin(time*.00045)*.018;
      composition.position.y=(onPhone?-1.7:.02)+Math.sin(time*.00048)*(onPhone?.055:.09);
      orbit.rotation.z=Math.sin(time*.00016)*.04;
      card.rotation.z=Math.sin(time*.00038)*.018;
      markerA.rotation.x+=.002; markerA.rotation.y+=.003; markerC.rotation.y+=.003;
      particles.rotation.z=Math.sin(time*.00013)*.025;
      renderer.render(scene,camera); last=time;
    }
    raf=requestAnimationFrame(draw);
  }
  const show=()=>{visible=!document.hidden&&hero.getBoundingClientRect().bottom>0&&hero.getBoundingClientRect().top<innerHeight;cancelAnimationFrame(raf);if(visible){if(!reducedMotion)raf=requestAnimationFrame(draw);else renderer.render(scene,camera);}};
  const io=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting&&!document.hidden;cancelAnimationFrame(raf);if(visible){if(!reducedMotion)raf=requestAnimationFrame(draw);else renderer.render(scene,camera);}}, {threshold:.01});
  io.observe(hero);
  document.addEventListener('visibilitychange',show);
  window.addEventListener('resize',resize,{passive:true});
  draw();
}
