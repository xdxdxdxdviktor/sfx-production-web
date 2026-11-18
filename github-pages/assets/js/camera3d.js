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
    body: new T.MeshStandardMaterial({color:0x050505, roughness:.38, metalness:.2, envMapIntensity:.3}),
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

  /* ---- body ---- */
  function rrect(w,h,r){ const s=new T.Shape(); const x=-w/2,y=-h/2; s.moveTo(x+r,y); s.lineTo(x+w-r,y); s.quadraticCurveTo(x+w,y,x+w,y+r); s.lineTo(x+w,y+h-r); s.quadraticCurveTo(x+w,y+h,x+w-r,y+h); s.lineTo(x+r,y+h); s.quadraticCurveTo(x,y+h,x,y+h-r); s.lineTo(x,y+r); s.quadraticCurveTo(x,y,x+r,y); return s; }
  const BD = 1.3;
  const bodyGeo = new T.ExtrudeGeometry(rrect(3.5,2.2,.3), {depth:BD, bevelEnabled:true, bevelThickness:.09, bevelSize:.09, bevelSegments:5, curveSegments:14});
  bodyGeo.translate(0,0,-BD/2);
  const body = new T.Mesh(bodyGeo, M.body); model.add(body);
  const FRONT = BD/2 + .09;

  // leatherette band on the front
  const band = new T.Mesh(new T.ExtrudeGeometry(rrect(3.46,1.2,.12),{depth:.02,bevelEnabled:false}), M.leather);
  band.position.set(0,-.25,FRONT-.005); model.add(band);

  // grip (viewer's left when facing front)
  const gripGeo = new T.ExtrudeGeometry(rrect(.85,2.05,.36),{depth:.55,bevelEnabled:true,bevelThickness:.12,bevelSize:.1,bevelSegments:6,curveSegments:12});
  const grip = new T.Mesh(gripGeo, M.leather); grip.position.set(-1.28,-.06,FRONT-.2); model.add(grip);

  // viewfinder hump
  const hs = new T.Shape(); hs.moveTo(-.85,0); hs.lineTo(.85,0); hs.lineTo(.5,.62); hs.lineTo(-.5,.62); hs.closePath();
  const hump = new T.Mesh(new T.ExtrudeGeometry(hs,{depth:1.05,bevelEnabled:true,bevelThickness:.05,bevelSize:.05,bevelSegments:3}), M.body);
  hump.position.set(.2,1.08,-.62); model.add(hump);
  const shoe = new T.Mesh(new T.BoxGeometry(.62,.07,.5), M.gold); shoe.position.set(.2,1.74,-.1); model.add(shoe);

  // dials + shutter
  const dial = new T.Mesh(new T.CylinderGeometry(.34,.34,.2,48), M.rubber); dial.position.set(1.18,1.25,-.1); model.add(dial);
  const dialCap = new T.Mesh(new T.CylinderGeometry(.3,.3,.03,48), M.gold); dialCap.position.set(1.18,1.36,-.1); model.add(dialCap);
  const shutter = new T.Mesh(new T.CylinderGeometry(.17,.19,.1,40), M.gold); shutter.position.set(-1.28,1.22,.18); model.add(shutter);
  const shutterRing = new T.Mesh(new T.CylinderGeometry(.25,.25,.06,40), M.barrel); shutterRing.position.set(-1.28,1.16,.18); model.add(shutterRing);

  // brand badge with the logo
  if(logoUrl){
    new T.TextureLoader().load(logoUrl, tex=>{
      tex.encoding = T.sRGBEncoding;
      const badge = new T.Mesh(new T.PlaneGeometry(.95,.35), new T.MeshStandardMaterial({map:tex, transparent:true, color:0xe6cfa6, metalness:.85, roughness:.28, envMapIntensity:1.8}));
      badge.position.set(1.12,.72,FRONT+.004); model.add(badge); dirty = 3;
      hooks && hooks.ready && hooks.ready();
    });
  }

  /* ---- lens ---- */
  const LX = .2, LY = -.08;           // lens axis position on the front
  const lens = new T.Group(); lens.position.set(LX,LY,FRONT); model.add(lens);
  const cyl = (r1,r2,len,mat,seg=72)=>{ const g=new T.CylinderGeometry(r1,r2,len,seg,1,true); g.rotateX(Math.PI/2); g.translate(0,0,len/2); return new T.Mesh(g,mat); };

  const mount = cyl(1.02,1.02,.12,M.gold); lens.add(mount);
  const mountFace = new T.Mesh(new T.RingGeometry(.9,1.02,72), M.gold); mountFace.position.z=.121; lens.add(mountFace);
  const s0cap = new T.Mesh(new T.RingGeometry(.87,.96,72), M.barrel);
  const s0 = new T.Group(); lens.add(s0); s0.position.z=.12;
  s0.add(cyl(.96,.96,1.0,M.barrel));
  const zoomRing = cyl(.99,.99,.55,M.rubber); zoomRing.position.z=.2; s0.add(zoomRing);
  const goldStripe = new T.Mesh(new T.TorusGeometry(.965,.014,12,96), M.goldLine); goldStripe.position.z=.94; s0.add(goldStripe);
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
  const txt = 'SFX PRODUCTION   LENS   24–200 mm   1:2.8   ⌀ 82 mm   ';
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
    ['24','35','50','70','105','135','200'].forEach((n,i)=>g.fillText(n, 430+i*92, h/2)); g.fillStyle='#d8be92'; g.fillRect(380,8,4,14); });
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

  // body seam + strap lugs
  const seam = new T.Mesh(new T.BoxGeometry(3.52,.016,.012), dark); seam.position.set(0,.6,FRONT+.004); model.add(seam);
  [-1,1].forEach(sx=>{
    const blk = new T.Mesh(new T.BoxGeometry(.08,.24,.3), M.body); blk.position.set(sx*1.87,.78,0); model.add(blk);
    const lug = new T.Mesh(new T.TorusGeometry(.1,.024,10,32), M.gold); lug.rotation.y=Math.PI/2; lug.position.set(sx*1.93,.78,0); model.add(lug);
  });
  // port door on the right side (faces the viewer in profile)
  const door = new T.Mesh(new T.ExtrudeGeometry(rrect(.9,1.0,.12),{depth:.025,bevelEnabled:false}), M.leather);
  door.rotation.y=Math.PI/2; door.position.set(1.845,-.2,-.05); model.add(door);
  const portTex = tex(512,256,(g,w,h)=>{ g.clearRect(0,0,w,h); g.fillStyle='rgba(236,227,210,.75)'; g.font=`500 40px ${FONTS}`; g.textAlign='left'; g.textBaseline='middle';
    [['MIC',50],['HP',110],['HDMI',170],['USB-C',230]].forEach(([n,y])=>{ g.fillText(n,30,y-20); }); });
  const portLbl = new T.Mesh(new T.PlaneGeometry(.55,.28), new T.MeshBasicMaterial({map:portTex, transparent:true, opacity:.8}));
  portLbl.rotation.y=Math.PI/2; portLbl.position.set(1.874,-.05,-.12); model.add(portLbl);

  // front: AF-assist lamp, lens release button, front dial
  const lamp = new T.Mesh(new T.CylinderGeometry(.075,.075,.04,32), new T.MeshPhysicalMaterial({color:0x3a0d06, roughness:.08, clearcoat:1, envMapIntensity:2}));
  lamp.rotation.x=Math.PI/2; lamp.position.set(-.72,.78,FRONT+.02); model.add(lamp);
  const rel = new T.Mesh(new T.CylinderGeometry(.12,.12,.07,40), M.barrel); rel.rotation.x=Math.PI/2; rel.position.set(1.42,-.62,FRONT+.03); model.add(rel);
  const relRing = new T.Mesh(new T.TorusGeometry(.13,.012,8,40), M.gold); relRing.position.set(1.42,-.62,FRONT+.06); model.add(relRing);
  const fdial = new T.Mesh(new T.CylinderGeometry(.21,.21,.1,48), M.rubber); fdial.position.set(-1.3,1.02,FRONT+.3); model.add(fdial);

  // top: engraved mode dial face, rear dial, shoe rails, power lever
  const modeTex = tex(512,512,(g,w,h)=>{ g.fillStyle='#0d0c0b'; g.beginPath(); g.arc(256,256,256,0,Math.PI*2); g.fill();
    g.translate(256,256); g.fillStyle='#ece3d2'; g.font=`600 54px ${FONTS}`; g.textAlign='center'; g.textBaseline='middle';
    ['M','A','S','P','C1','C2','AUTO'].forEach((n,i)=>{ g.save(); g.rotate(-Math.PI/2+i*Math.PI*2/7); g.translate(170,0); g.rotate(Math.PI/2); g.fillText(n,0,0); g.restore(); });
    g.fillStyle='#d8be92'; g.beginPath(); g.arc(0,0,40,0,Math.PI*2); g.fill(); });
  const modeFace = new T.Mesh(new T.CircleGeometry(.31,48), printMat(modeTex)); modeFace.rotation.x=-Math.PI/2; modeFace.position.set(1.18,1.385,-.1); model.add(modeFace);
  const rdial = new T.Mesh(new T.CylinderGeometry(.2,.2,.09,48), M.rubber); rdial.position.set(1.3,1.2,-.55); model.add(rdial);
  [-.28,.28].forEach(dz=>{ const r=new T.Mesh(new T.BoxGeometry(.62,.035,.05), M.gold); r.position.set(.2,1.79,-.1+dz*.8); model.add(r); });
  const lever = new T.Mesh(new T.BoxGeometry(.2,.05,.08), M.gold); lever.position.set(-1.05,1.16,.28); lever.rotation.y=.5; model.add(lever);
  // "production" on the viewfinder hump
  const prodTex = tex(1024,128,(g,w,h)=>{ g.clearRect(0,0,w,h); g.fillStyle='#d8be92'; g.font=`400 70px ${FONTS}`; g.textAlign='center'; g.textBaseline='middle';
    const word='production'; const sp=78; word.split('').forEach((ch,i)=>g.fillText(ch, w/2+(i-(word.length-1)/2)*sp, h/2)); });
  const prod = new T.Mesh(new T.PlaneGeometry(.95,.12), new T.MeshStandardMaterial({map:prodTex, transparent:true, metalness:.8, roughness:.3, envMapIntensity:1.5}));
  prod.position.set(.2,1.3,.485); model.add(prod);

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
    snap(p){ P=p; cur = targetFor(p); apply(cur); renderer.render(scene,cam); hooks && hooks.frame && hooks.frame(cur); }
  };
}

export { initCamera3D };
