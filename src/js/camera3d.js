/* SFX production — 3D camera hero (extracted from the original single-file site). */
/* SFX production — 3D camera hero. Scroll progress 0..1 drives: rotation, lens extension, aperture, dolly into the lens. */
function initCamera3D(canvas, logoUrl, hooks){
  try{ return _initCamera3D(canvas, logoUrl, hooks); }catch(e){ console.warn('3D camera disabled:', e); return null; }
}
function _initCamera3D(canvas, logoUrl, hooks){
  if(!window.THREE) return null;
  let renderer;
  try{ renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true, powerPreference:'high-performance'}); }
  catch(e){ return null; }
  const T = THREE;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, innerWidth<820 ? 1.5 : 2)); // lighter on phones
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0x000000, 0);

  const scene = new T.Scene();
  const cam = new T.PerspectiveCamera(30, 1, .05, 100);
  cam.position.set(0, .3, 13);

  /* ---- studio environment: softboxes painted on an equirect canvas ---- */
  const envC = document.createElement('canvas'); envC.width = 1024; envC.height = 512;
  const ex = envC.getContext('2d');
  ex.fillStyle = '#050403'; ex.fillRect(0,0,1024,512);
  function softbox(x,y,w,h,col,blur){ ex.save(); ex.filter = `blur(${blur}px)`; ex.fillStyle = col; ex.fillRect(x,y,w,h); ex.restore(); }
  softbox(180,90,220,120,'#fff6e6',14);   // key, warm
  softbox(640,60,300,70,'#ffffff',10);    // top strip
  softbox(860,200,90,220,'#d8be92',18);   // gold kicker
  softbox(40,260,120,160,'#8c7358',24);
  softbox(470,210,60,200,'#ffffff',8);    // vertical strip (lens highlight)
  const envTex = new T.CanvasTexture(envC); envTex.mapping = T.EquirectangularReflectionMapping; envTex.encoding = T.sRGBEncoding;
  const pmrem = new T.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(envTex).texture;
  scene.environment = env;

  /* ---- procedural textures ---- */
  function stripes(n, a, b){ const c=document.createElement('canvas'); c.width=512; c.height=16; const g=c.getContext('2d'); for(let i=0;i<n;i++){ g.fillStyle = i%2?a:b; g.fillRect(i*512/n,0,512/n+1,16);} const t=new T.CanvasTexture(c); t.wrapS=t.wrapT=T.RepeatWrapping; return t; }
  function noise(size, lo, hi){ const c=document.createElement('canvas'); c.width=c.height=size; const g=c.getContext('2d'); const d=g.createImageData(size,size); for(let i=0;i<d.data.length;i+=4){ const v=lo+Math.random()*(hi-lo); d.data[i]=d.data[i+1]=d.data[i+2]=v; d.data[i+3]=255;} g.putImageData(d,0,0); const t=new T.CanvasTexture(c); t.wrapS=t.wrapT=T.RepeatWrapping; t.repeat.set(3,3); return t; }
  const knurl = stripes(120,'#fff','#000');
  const leather = noise(256, 60, 200);

  /* ---- materials ---- */
  const M = {
    body: new T.MeshStandardMaterial({color:0x060606, roughness:.46, metalness:.18, envMapIntensity:.28}),
    leather: new T.MeshStandardMaterial({color:0x050505, roughness:.9, metalness:0, envMapIntensity:.15, bumpMap:leather, bumpScale:.02}),
    barrel: new T.MeshStandardMaterial({color:0x090908, roughness:.32, metalness:.4, envMapIntensity:.35, side:T.DoubleSide}),
    rubber: new T.MeshStandardMaterial({side:T.DoubleSide, color:0x060606, roughness:.75, metalness:.1, envMapIntensity:.3, bumpMap:knurl, bumpScale:.04}),
    gold: new T.MeshStandardMaterial({side:T.DoubleSide, color:0xd8be92, roughness:.22, metalness:1, envMapIntensity:1.6}),
    goldLine: new T.MeshStandardMaterial({color:0xd8be92, roughness:.3, metalness:.9, emissive:0x3a2c18}),
    glass: new T.MeshPhysicalMaterial({color:0x000000, roughness:.04, metalness:.1, clearcoat:1, clearcoatRoughness:.02, transparent:true, opacity:.28, envMapIntensity:1.8, reflectivity:1}),
  };
  knurl.repeat.set(1,1);

  const rig = new T.Group(); scene.add(rig);
  const model = new T.Group(); rig.add(model);

  function rrect(w,h,r){ const s=new T.Shape(); const x=-w/2,y=-h/2; s.moveTo(x+r,y); s.lineTo(x+w-r,y); s.quadraticCurveTo(x+w,y,x+w,y+r); s.lineTo(x+w,y+h-r); s.quadraticCurveTo(x+w,y+h,x+w-r,y+h); s.lineTo(x+r,y+h); s.quadraticCurveTo(x,y+h,x,y+h-r); s.lineTo(x,y+r); s.quadraticCurveTo(x,y,x+r,y); return s; }
  const steel = new T.MeshStandardMaterial({color:0xb9b6b0, roughness:.22, metalness:1, envMapIntensity:1.4});
  const matte = new T.MeshStandardMaterial({color:0x070707, roughness:.5, metalness:.15, envMapIntensity:.35});
  const glassBlack = new T.MeshPhysicalMaterial({color:0x020203, roughness:.06, metalness:.2, clearcoat:1, clearcoatRoughness:.03, envMapIntensity:1.4});
  const red = new T.MeshStandardMaterial({color:0xc4221a, roughness:.35, metalness:.3, emissive:0x2a0402});
  const LX = .2, LY = -.12, FRONT = .45;   // lens axis on the front face
  /* ---- lens ---- */
  const lens = new T.Group(); lens.position.set(LX,LY,FRONT); model.add(lens);
  const cyl = (r1,r2,len,mat,seg=72)=>{ const g=new T.CylinderGeometry(r1,r2,len,seg,1,true); g.rotateX(Math.PI/2); g.translate(0,0,len/2); return new T.Mesh(g,mat); };

  const mount = cyl(1.02,1.02,.12,steel); lens.add(mount);
  const mountFace = new T.Mesh(new T.RingGeometry(.9,1.02,72), steel); mountFace.position.z=.121; lens.add(mountFace);
  const s0cap = new T.Mesh(new T.RingGeometry(.87,.96,72), M.barrel);
  const s0 = new T.Group(); lens.add(s0); s0.position.z=.12;
  s0.add(cyl(.96,.96,1.0,M.barrel));
  const zoomRing = cyl(.99,.99,.55,M.rubber); zoomRing.position.z=.2; s0.add(zoomRing);
  const goldStripe = new T.Mesh(new T.TorusGeometry(.966,.02,12,96), red); goldStripe.position.z=.92; s0.add(goldStripe);
  s0cap.position.z=1.0; s0.add(s0cap);
  const s1cap = new T.Mesh(new T.RingGeometry(.79,.87,72), M.barrel);

  const s1 = new T.Group(); lens.add(s1);
  s1.add(cyl(.87,.87,.95,M.barrel));
  const focusRing = cyl(.895,.895,.35,M.rubber); focusRing.position.z=.35; s1.add(focusRing);
  s1cap.position.z=.95; s1.add(s1cap);

  const s2 = new T.Group(); lens.add(s2);
  s2.add(cyl(.79,.8,.85,M.barrel));
  const bezel = cyl(.84,.84,.1,M.barrel); bezel.position.z=.8; s2.add(bezel);
  const bezelGold = new T.Mesh(new T.TorusGeometry(.84,.012,10,96), M.gold); bezelGold.position.z=.9; s2.add(bezelGold);

  // engraved front text ring
  const tc = document.createElement('canvas'); tc.width = tc.height = 1024; const tg = tc.getContext('2d');
  tg.fillStyle='#0f0d0c'; tg.fillRect(0,0,1024,1024);
  tg.translate(512,512); tg.fillStyle='#e9dcc4'; tg.font='500 44px Archivo, Helvetica, sans-serif'; tg.textAlign='center';
  const txt = 'SFX PRODUCTION   ZOOM LENS   24–105 mm   1:4   ⌀ 77 mm   ';
  const R = 430, step = (Math.PI*2)/txt.length;
  for(let i=0;i<txt.length;i++){ tg.save(); tg.rotate(i*step); tg.fillText(txt[i],0,-R+20); tg.restore(); }
  const ringTex = new T.CanvasTexture(tc); ringTex.encoding = T.sRGBEncoding; ringTex.anisotropy = 8;
  const face = new T.Mesh(new T.RingGeometry(.58,.84,96,1), new T.MeshStandardMaterial({map:ringTex, roughness:.5, metalness:.4}));
  face.position.z=.905; s2.add(face);

  // iris drawn on a canvas, sits behind the front glass
  const ic = document.createElement('canvas'); ic.width = ic.height = 512; const ig = ic.getContext('2d');
  const irisTex = new T.CanvasTexture(ic); irisTex.encoding = T.sRGBEncoding;
  let lastHole = -1;
  function drawIris(h){ // h: 0..1 hole radius
    if(Math.abs(h-lastHole)<.002) return; lastHole = h;
    const N=9, C=256, RR=254, hr = 16 + h*232, tw = h*1.2;
    ig.clearRect(0,0,512,512);
    ig.save(); ig.beginPath(); ig.arc(C,C,RR,0,Math.PI*2); ig.clip();
    const V=[]; for(let i=0;i<N;i++){ const a=i*2*Math.PI/N+tw; V.push([C+Math.cos(a)*hr, C+Math.sin(a)*hr]); }
    for(let i=0;i<N;i++){
      const a=V[i], b=V[(i+1)%N]; const dx=b[0]-a[0], dy=b[1]-a[1]; const L=Math.hypot(dx,dy)||1; const ux=dx/L, uy=dy/L;
      const c=V[(i+2)%N]; const dx2=c[0]-b[0], dy2=c[1]-b[1]; const L2=Math.hypot(dx2,dy2)||1;
      ig.beginPath(); ig.moveTo(a[0],a[1]); ig.lineTo(a[0]+ux*700,a[1]+uy*700); ig.lineTo(b[0]+dx2/L2*700,b[1]+dy2/L2*700); ig.lineTo(b[0],b[1]); ig.closePath();
      const gr = ig.createLinearGradient(a[0],a[1],a[0]+ux*300,a[1]+uy*300);
      gr.addColorStop(0, i%2? '#2a241e':'#221d18'); gr.addColorStop(1,'#0c0a08');
      ig.fillStyle = gr; ig.fill();
      ig.strokeStyle='rgba(216,190,146,.45)'; ig.lineWidth=1.4; ig.beginPath(); ig.moveTo(a[0],a[1]); ig.lineTo(a[0]+ux*700,a[1]+uy*700); ig.stroke();
    }
    ig.globalCompositeOperation='destination-out'; ig.beginPath(); V.forEach((p,i)=>i?ig.lineTo(p[0],p[1]):ig.moveTo(p[0],p[1])); ig.closePath(); ig.fill();
    ig.restore(); irisTex.needsUpdate = true;
  }
  drawIris(.05);
  const iris = new T.Mesh(new T.CircleGeometry(.6,64), new T.MeshStandardMaterial({map:irisTex, transparent:true, roughness:.5, metalness:.5}));
  iris.position.z=.72; s2.add(iris);

  // light glow behind the iris
  const gc = document.createElement('canvas'); gc.width=gc.height=256; const gg=gc.getContext('2d');
  const rg = gg.createRadialGradient(128,128,0,128,128,128); rg.addColorStop(0,'rgba(255,246,228,1)'); rg.addColorStop(.35,'rgba(216,190,146,.9)'); rg.addColorStop(1,'rgba(40,30,20,0)');
  gg.fillStyle=rg; gg.fillRect(0,0,256,256);
  const glowMat = new T.MeshBasicMaterial({map:new T.CanvasTexture(gc), transparent:true, opacity:.05, depthWrite:false});
  const glow = new T.Mesh(new T.CircleGeometry(.6,48), glowMat); glow.position.z=.62; glow.renderOrder=1; iris.renderOrder=2; s2.add(glow);
  const inner = new T.Mesh(new T.CircleGeometry(.62,48), new T.MeshBasicMaterial({color:0x020202})); inner.position.z=.55; s2.add(inner);

  // front glass dome
  const cr=.62, sr=1.05, th=Math.asin(cr/sr);
  const dome = new T.Mesh(new T.SphereGeometry(sr,64,24,0,Math.PI*2,0,th), M.glass);
  dome.renderOrder=3; dome.rotation.x = Math.PI/2; dome.position.z = .9 - sr*Math.cos(th); s2.add(dome);


  /* ---- detail pass ---- */
  const FONTS = '"Hanken Grotesk", "Helvetica Neue", Arial, sans-serif';
  function tex(w,h,draw){ const c=document.createElement('canvas'); c.width=w; c.height=h; const g=c.getContext('2d'); draw(g,w,h); const t=new T.CanvasTexture(c); t.encoding=T.sRGBEncoding; t.anisotropy=8; return t; }
  const dark = new T.MeshStandardMaterial({color:0x020202, roughness:.6, metalness:.2});
  const printMat = map => new T.MeshStandardMaterial({map, roughness:.4, metalness:.45, envMapIntensity:.8});

  // printed focal scale band (s0, between zoom ring and gold stripe)
  const zoomScale = tex(2048,96,(g,w,h)=>{ g.fillStyle='#0c0b0a'; g.fillRect(0,0,w,h); g.fillStyle='#ece3d2'; g.font=`600 50px ${FONTS}`; g.textAlign='center'; g.textBaseline='middle';
    ['24','35','50','70','105'].forEach((n,i)=>g.fillText(n, 440+i*110, h/2)); g.fillStyle='#d8be92'; g.fillRect(380,8,4,14); });
  const zb = cyl(.962,.962,.16,printMat(zoomScale)); zb.position.z=.77; s0.add(zb);
  // focus distance band on s1
  const focusScale = tex(2048,96,(g,w,h)=>{ g.fillStyle='#0c0b0a'; g.fillRect(0,0,w,h); g.fillStyle='#ece3d2'; g.font=`500 44px ${FONTS}`; g.textAlign='center'; g.textBaseline='middle';
    ['∞','10','5','3','2','1.5','1 m'].forEach((n,i)=>g.fillText(n, 440+i*82, h/2)); g.fillStyle='#d8be92'; g.fillRect(400,h/2-3,20,6); });
  const fb = cyl(.874,.874,.14,printMat(focusScale)); fb.position.z=.76; s1.add(fb);
  // AF / MF switch on the barrel side
  const sw = new T.Mesh(new T.BoxGeometry(.05,.14,.26), M.barrel); sw.position.set(.975,.12,.45); s0.add(sw);
  const nub = new T.Mesh(new T.BoxGeometry(.04,.06,.08), M.gold); nub.position.set(1.0,.12,.5); s0.add(nub);
  // coated inner element + retaining ring + filter thread
  const coat = new T.Mesh(new T.CircleGeometry(.6,64), new T.MeshPhysicalMaterial({color:0x4b3a6e, metalness:1, roughness:.12, transparent:true, opacity:.16, envMapIntensity:2.4, depthWrite:false}));
  coat.position.z=.8; coat.renderOrder=2; s2.add(coat);
  const coat2 = new T.Mesh(new T.RingGeometry(.3,.58,64), new T.MeshPhysicalMaterial({color:0x2c5a44, metalness:1, roughness:.2, transparent:true, opacity:.1, envMapIntensity:2, depthWrite:false}));
  coat2.position.z=.76; coat2.renderOrder=2; s2.add(coat2);
  const retain = new T.Mesh(new T.TorusGeometry(.605,.018,10,96), dark); retain.position.z=.86; s2.add(retain);
  const thread = new T.Mesh(new T.TorusGeometry(.835,.008,8,96), M.barrel); thread.position.z=.96; s2.add(thread);

  /* ---- body (proportions after a full-frame mirrorless pro body: 138 × 98 × 88 mm, 1 unit ≈ 40 mm) ---- */
  const add = (geo, mat, x=0, y=0, z=0, rx=0, ry=0, rz=0) => { const m = new T.Mesh(geo, mat); m.position.set(x,y,z); m.rotation.set(rx,ry,rz); model.add(m); return m; };
  // move front-half vertices back in proportion to height (sloped faces of the viewfinder housing / grip top)
  function shear(geo, zMid, y0, k){ const p = geo.attributes.position; for(let i=0;i<p.count;i++){ const z=p.getZ(i), y=p.getY(i); if(z>zMid) p.setZ(i, z - Math.max(0,y-y0)*k); } p.needsUpdate = true; geo.computeVertexNormals(); return geo; }

  // main shell: x −1.75…1.75, y −1.15…0.85, z −0.62…0.45
  const shellGeo = new T.ExtrudeGeometry(rrect(3.3,1.8,.26), {depth:.87, bevelEnabled:true, bevelThickness:.1, bevelSize:.1, bevelSegments:6, curveSegments:16});
  shellGeo.translate(0,-.15,-.52); add(shellGeo, M.body);

  // rubberised front panel (everything under the top plate)
  add(new T.ExtrudeGeometry(rrect(3.42,1.48,.16),{depth:.02,bevelEnabled:false,curveSegments:10}), M.leather, 0, -.38, FRONT-.012);

  // viewfinder housing: faceted trapezoid with a raked front, sits over the lens axis and overhangs the back
  const hs = new T.Shape(); hs.moveTo(-.74,0); hs.lineTo(.74,0); hs.lineTo(.4,.55); hs.lineTo(-.4,.55); hs.closePath();
  const humpGeo = new T.ExtrudeGeometry(hs, {depth:1.03, bevelEnabled:true, bevelThickness:.05, bevelSize:.05, bevelSegments:4});
  humpGeo.translate(0,0,-.72); shear(humpGeo, -.2, 0, .62);
  add(humpGeo, new T.MeshStandardMaterial({color:0x060606, roughness:.58, metalness:.12, envMapIntensity:.18}), LX, .8, 0);
  // shoulder fillets so the housing grows out of the top plate
  [-1,1].forEach(s=>{ const f = add(new T.CylinderGeometry(.07,.07,1.0,12,1,false,0,Math.PI), M.body, LX+s*.8, .86, -.18, Math.PI/2, 0, 0); f.scale.set(1,1,.6); });
  // eyecup + eyepiece
  add(new T.ExtrudeGeometry(rrect(.9,.66,.2),{depth:.22,bevelEnabled:true,bevelThickness:.04,bevelSize:.04,bevelSegments:4}), M.leather, LX, 1.08, -1.0);
  add(new T.PlaneGeometry(.62,.4), glassBlack, LX, 1.08, -1.045, 0, Math.PI, 0);
  // multi-function shoe
  add(new T.BoxGeometry(.66,.03,.62), steel, LX, 1.43, -.32);
  [-.27,.27].forEach(dx=>add(new T.BoxGeometry(.08,.07,.6), steel, LX+dx, 1.46, -.32));
  add(new T.BoxGeometry(.4,.012,.3), matte, LX, 1.452, -.3);

  // grip: side profile extruded across x, deep and rounded, with a finger recess under the shutter
  const gs = new T.Shape();
  gs.moveTo(-.36,-1.01); gs.lineTo(.62,-1.01);
  gs.bezierCurveTo(1.0,-1.01, 1.14,-.72, 1.15,-.35);
  gs.bezierCurveTo(1.16,-.05, 1.02,.12, 1.0,.3);
  gs.bezierCurveTo(.99,.44, 1.02,.52, .9,.6);
  gs.lineTo(.42,.71); gs.lineTo(-.36,.71); gs.closePath();
  const gripGeo = new T.ExtrudeGeometry(gs, {depth:.66, bevelEnabled:true, bevelThickness:.15, bevelSize:.14, bevelSegments:8, curveSegments:24});
  gripGeo.rotateY(-Math.PI/2);
  const grip = add(gripGeo, M.leather, -.86, 0, 0);
  // smooth top cap of the grip where the shutter sits
  const capS = new T.Shape(); capS.moveTo(-.3,.62); capS.lineTo(.42,.62); capS.lineTo(.92,.52); capS.bezierCurveTo(1.05,.48,1.06,.62,.98,.7); capS.lineTo(.46,.86); capS.lineTo(-.3,.86); capS.closePath();
  const capGeo = new T.ExtrudeGeometry(capS, {depth:.66, bevelEnabled:true, bevelThickness:.15, bevelSize:.06, bevelSegments:6, curveSegments:12});
  capGeo.rotateY(-Math.PI/2); add(capGeo, M.body, -.86, 0, 0);

  // shutter button on the raked front of the grip, main dial right behind it
  const SX = -1.33;
  add(new T.CylinderGeometry(.2,.22,.06,40), matte, SX, .86, .86, -.22, 0, 0);
  add(new T.CylinderGeometry(.15,.16,.07,40), steel, SX, .9, .87, -.22, 0, 0);
  add(new T.CylinderGeometry(.135,.14,.03,40), M.body, SX, .94, .875, -.22, 0, 0);
  const mainDial = add(new T.CylinderGeometry(.28,.28,.11,56), M.rubber, SX, .9, .42); mainDial.material = M.rubber;
  add(new T.CylinderGeometry(.24,.24,.115,40), matte, SX, .9, .42);
  // M-Fn / ISO / lamp buttons behind the main dial
  [[-1.58,.12],[-1.34,.06],[-1.1,.02]].forEach(([x,z])=>add(new T.CylinderGeometry(.065,.07,.05,24), matte, x, .97, z));
  // top LCD panel
  const lcdTex = tex(512,320,(g,w,h)=>{ g.fillStyle='#0b0d0c'; g.fillRect(0,0,w,h); g.fillStyle='rgba(220,232,224,.85)'; g.font=`700 64px ${FONTS}`; g.textBaseline='middle';
    g.fillText('1/250',28,80); g.fillText('F4.0',300,80); g.font=`600 46px ${FONTS}`; g.fillText('ISO 400',28,180); g.fillText('[ 999 ]',300,250); g.fillRect(28,236,200,6); });
  add(new T.PlaneGeometry(.5,.32), new T.MeshPhysicalMaterial({map:lcdTex, roughness:.08, clearcoat:1, envMapIntensity:.8}), -1.02, .956, -.2, -Math.PI/2, 0, 0);
  add(new T.BoxGeometry(.58,.02,.4), M.body, -1.02, .945, -.2);
  // rear top dial with MODE button
  add(new T.CylinderGeometry(.27,.27,.1,56), M.rubber, -1.38, .93, -.42);
  add(new T.CylinderGeometry(.13,.13,.12,32), matte, -1.38, .935, -.42);
  // power switch on the top left
  add(new T.CylinderGeometry(.17,.17,.06,40), matte, 1.36, .97, -.22);
  add(new T.BoxGeometry(.28,.05,.08), steel, 1.43, 1.0, -.15, 0, -.5, 0);
  const onoff = tex(256,128,(g,w,h)=>{ g.fillStyle='rgba(236,227,210,.9)'; g.font=`700 40px ${FONTS}`; g.textAlign='center'; g.fillText('ON',60,80); g.fillText('OFF',190,80); });
  add(new T.PlaneGeometry(.42,.2), new T.MeshBasicMaterial({map:onoff, transparent:true}), 1.36, .942, .08, -Math.PI/2, 0, 0);

  // lens mount: raised boss, polished bayonet ring and red index dot
  add(new T.CylinderGeometry(1.12,1.14,.06,96), M.body, LX, LY, FRONT+.03, Math.PI/2, 0, 0);
  const dot = add(new T.CircleGeometry(.035,20), red, LX + Math.cos(1.25)*1.08, LY + Math.sin(1.25)*1.08, FRONT+.062);
  // lens release button + depth-of-field button
  add(new T.CylinderGeometry(.13,.13,.08,40), matte, 1.45, -.42, FRONT+.03, Math.PI/2, 0, 0);
  add(new T.TorusGeometry(.135,.012,8,40), steel, 1.45, -.42, FRONT+.07);
  add(new T.CylinderGeometry(.07,.07,.06,24), matte, -.8, -.62, FRONT+.03, Math.PI/2, 0, 0);
  // AF-assist / self-timer lamp near the top of the grip
  add(new T.CylinderGeometry(.07,.07,.04,32), new T.MeshPhysicalMaterial({color:0x3a0d06, roughness:.08, clearcoat:1, envMapIntensity:2}), -.82, .52, FRONT+.03, Math.PI/2, 0, 0);
  // stereo microphone holes either side of the viewfinder housing
  [-1,1].forEach(s=>{ for(let i=0;i<3;i++) for(let j=0;j<2;j++) add(new T.CircleGeometry(.014,8), matte, LX+s*(.66+i*.045), .74-j*.045, FRONT+.002); });

  // brand on the raked front of the viewfinder housing
  if(logoUrl){
    new T.TextureLoader().load(logoUrl, t=>{
      t.encoding = T.sRGBEncoding;
      add(new T.PlaneGeometry(.66,.24), new T.MeshStandardMaterial({map:t, transparent:true, color:0xe6cfa6, metalness:.85, roughness:.28, envMapIntensity:1.8}), LX, 1.06, .215, -Math.atan(.62), 0, 0);
      dirty = 3; hooks && hooks.ready && hooks.ready();
    });
  }
  // model badge, front lower right
  const badge = tex(512,96,(g,w,h)=>{ g.fillStyle='#e9dcc4'; g.font=`700 58px ${FONTS}`; g.textAlign='right'; g.textBaseline='middle'; g.fillText('SFX  R5', w-10, h/2); });
  add(new T.PlaneGeometry(.62,.115), new T.MeshStandardMaterial({map:badge, transparent:true, metalness:.7, roughness:.3, envMapIntensity:1.4}), 1.32, .6, FRONT+.003);

  // strap lugs
  [-1,1].forEach(sx=>{
    add(new T.BoxGeometry(.1,.26,.34), M.body, sx*1.8, .62, -.12);
    add(new T.TorusGeometry(.1,.026,10,32), steel, sx*1.88, .62, -.12, 0, Math.PI/2, 0);
  });
  // left side (faces the viewer in profile): two rubber port doors with labels
  [[.25,.5,.5],[-.48,.8,.72]].forEach(([y,h,w])=>add(new T.ExtrudeGeometry(rrect(w,h,.1),{depth:.03,bevelEnabled:true,bevelThickness:.01,bevelSize:.01,bevelSegments:2}), M.leather, 1.84, y, -.1, 0, Math.PI/2, 0));
  const portTex = tex(512,512,(g,w,h)=>{ g.clearRect(0,0,w,h); g.fillStyle='rgba(236,227,210,.75)'; g.font=`600 46px ${FONTS}`; g.textBaseline='middle';
    [['MIC',60],['HP',150],['HDMI',300],['USB-C',420]].forEach(([n,y])=>g.fillText(n,40,y)); });
  add(new T.PlaneGeometry(.5,.5), new T.MeshBasicMaterial({map:portTex, transparent:true, opacity:.85}), 1.885, -.1, .05, 0, Math.PI/2, 0);
  // card door on the grip side
  add(new T.ExtrudeGeometry(rrect(.7,1.3,.12),{depth:.02,bevelEnabled:false}), M.body, -1.9, -.2, -.25, 0, -Math.PI/2, 0);

  // back: vari-angle screen, joystick, AF-ON, rear wheel
  add(new T.ExtrudeGeometry(rrect(2.1,1.42,.1),{depth:.1,bevelEnabled:true,bevelThickness:.02,bevelSize:.02,bevelSegments:2}), matte, .22, -.22, -.74);
  add(new T.PlaneGeometry(1.9,1.25), glassBlack, .22, -.22, -.765, 0, Math.PI, 0);
  add(new T.CylinderGeometry(.34,.34,.08,56), M.rubber, -1.3, -.3, -.66, Math.PI/2, 0, 0);
  add(new T.CylinderGeometry(.1,.1,.1,24), matte, -1.3, -.3, -.66, Math.PI/2, 0, 0);
  add(new T.CylinderGeometry(.08,.09,.1,24), matte, -1.3, .32, -.66, Math.PI/2, 0, 0);
  add(new T.CylinderGeometry(.12,.12,.06,24), matte, -1.45, .62, -.65, Math.PI/2, 0, 0);
  /* ---- lights ---- */
  scene.add(new T.AmbientLight(0xffffff,.04));
  const key = new T.DirectionalLight(0xfff1dc, .9); key.position.set(-4,5,6); scene.add(key);
  const rim = new T.DirectionalLight(0xffffff, 1.6); rim.position.set(5,2,-6); scene.add(rim);
  const kick = new T.PointLight(0xd8be92, 1.4, 14); kick.position.set(4,-2,4); scene.add(kick);
  const top = new T.DirectionalLight(0xffffff, .35); top.position.set(0,8,1); scene.add(top);

  /* ---- scroll mapping ---- */
  const cl = (v,a=0,b=1)=>Math.min(b,Math.max(a,v));
  const seg = (p,a,b)=>cl((p-a)/(b-a));
  const ease = t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  const lerp=(a,b,t)=>a+(b-a)*t;
  let P = 0, cur = null, W=1, H=1, mobile=false;
  const ptr = {x:0,y:0,tx:0,ty:0};

  function targetFor(p){
    const r1 = ease(seg(p,.1,.46));   // turn to side profile
    const r2 = ease(seg(p,.5,.72));   // turn to face viewer
    let ry = lerp(-.62, -1.42, r1); ry = lerp(ry, 0, r2);
    let rx = lerp(.14, .04, r1); rx = lerp(rx, 0, r2);
    const halfW = Math.tan(15*Math.PI/180)*13*(W/H);
    let px = mobile ? lerp(0, 1.4, r1) : lerp(halfW*.4, halfW*.34, r1); px = lerp(px, -LX, r2);
    let py = mobile ? lerp(1.9,-.6,r1) : lerp(-.05,.05,r1); py = lerp(py, -LY, r2);
    const e1 = ease(seg(p,.16,.34)), e2 = ease(seg(p,.3,.48));
    const ap = ease(seg(p,.56,.76));
    const dolly = ease(seg(p,.76,.98));
    return {ry,rx,px,py,e1,e2,ap,dolly,p};
  }

  function apply(t){
    rig.rotation.y = t.ry;
    rig.rotation.x = t.rx;
    rig.position.set(t.px, t.py, 0);
    s1.position.z = .12 + t.e1*.82;
    s2.position.z = s1.position.z + t.e2*.78;
    focusRing.rotation.z = t.e2*1.4; zoomRing.rotation.z = -t.e1*1.2;
    drawIris(.05 + t.ap*.95);
    glowMat.opacity = .08 + t.ap*.9;
    // front of lens (world z) when facing viewer ≈ FRONT + s2.z + .9
    const frontZ = FRONT + s2.position.z + .95;
    const baseZ = mobile ? 21 : 13;
    cam.position.z = lerp(baseZ, frontZ + .15, Math.pow(t.dolly,1.6));
    cam.position.y = lerp(.3, 0, t.dolly);
    cam.fov = lerp(30, 42, t.dolly); cam.updateProjectionMatrix();
    cam.lookAt(0, lerp(0,0,t.dolly), 0);
  }

  function resize(){
    const r = canvas.getBoundingClientRect(); W = r.width||innerWidth; H = r.height||innerHeight;
    mobile = W < 820;
    renderer.setSize(W,H,false); cam.aspect = W/H; cam.updateProjectionMatrix();
  }
  resize(); addEventListener('resize', resize);

  let running = true, dirty = 3, checked = false;
  // after the first frame, make sure the GPU really drew the camera (some phones return a blank canvas)
  function verify(){
    let ok=false;
    try{ const gl=renderer.getContext(); const w=gl.drawingBufferWidth, h=gl.drawingBufferHeight;
      if(w && h && !gl.isContextLost()){ const y0=Math.floor(h*.15), hh=Math.floor(h*.7); const px=new Uint8Array(w*hh*4);
        gl.readPixels(0,y0,w,hh,gl.RGBA,gl.UNSIGNED_BYTE,px); let n=0; for(let i=3;i<px.length;i+=28){ if(px[i]>24 && ++n>60){ ok=true; break; } } } }
    catch(e){ ok=false; }
    hooks && hooks.status && hooks.status(ok);
  }
  canvas.addEventListener('webglcontextlost', e=>{ e.preventDefault(); hooks && hooks.status && hooks.status(false); });
  canvas.addEventListener('webglcontextrestored', ()=>{ checked=false; dirty=3; });
  addEventListener('resize', ()=>{ dirty = 3; });
  function frame(){
    if(running){
      const tgt = targetFor(P);
      if(!cur) cur = {...tgt};
      let moving = false;
      for(const k in tgt){ const d=tgt[k]-cur[k]; if(Math.abs(d)>1e-4){ cur[k]+=d*.12; moving=true; } }
      if(moving || dirty>0){ apply(cur); renderer.render(scene, cam); if(!checked){ checked=true; verify(); } hooks && hooks.frame && hooks.frame(cur); if(dirty>0) dirty--; }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    setProgress(p){ P = p; },
    setRunning(v){ running = v; if(v) dirty = 3; },
    snap(p){ P=p; cur = targetFor(p); apply(cur); renderer.render(scene,cam); hooks && hooks.frame && hooks.frame(cur); },
    /* still image of a pose (used to render the fallback poster) */
    shot(p, ry, rx){ running=false; const t=targetFor(p); if(ry!=null) t.ry=ry; if(rx!=null) t.rx=rx; apply(t); renderer.render(scene,cam); return canvas.toDataURL('image/png'); }
  };
}

export { initCamera3D };
