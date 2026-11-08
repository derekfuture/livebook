// 地理世界：首页选“地理”进来的地方（?subject=dili）。夜空里浮着一颗地球，所有地理课本围成一圈立在它下面。
// 地球上插着每一本书的活页（一本书一个颜色）：指着一面旗，旁边浮出课本里那张图和活页开头的问题，下面那本书同时亮起来、往外挪一点；
// 点下去：书圈转过来，那本书转到正前方，飞到面前，翻开到那一页（换到书里，活页从旗上长出来）。
// 也可以直接点一本书进去，或者在侧栏按书、按章找。地球旁的“看法”（昼夜、板块、气压带）点了一直开着。
import * as THREE from 'three';
import { WorldEarth } from '../live/WorldEarth.js';
import { ll2v } from '../lessons/kit/plates.js';
import { ANCHORS } from '../lessons/kit/atlas.js';
import { bookList, getBook, getManifest, fileUrl } from '../content/index.js';
import { tag, updateTags } from '../ui/tags.js';
import { h, stamps } from '../ui/Panel.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { timeCard } from './timeCard.js';
import moonUrl from '../lessons/data/moon.jpg';
import { TERRAIN, loadTerrain, globePatch, frameAt, toLocal, elevAt, terrainBlock, blockPose } from './terrain.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

const $ = (s) => document.querySelector(s);
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const EARTH = { y: 2.02, r: 1.12 };          // 地球：球心多高、多大（主角：比书圈大得多）
const RING = { r: 2.05, h: 0.78, tilt: 0.24 };          // 书圈：半径、书多高、往后仰多少（衬在地球下面，不和它抢）
const BOOK_COLORS = { 'dili-7s': '#4f9d4a', 'dili-bx1': '#3d6fb4', 'dili-bx2': '#c27a2c', 'dili-xb1': '#8a5aa0', 'dili-xb2': '#c0453a' };          // 一本书一个颜色：旗、书脊下的光、侧栏一致
const SHORT = (full) => full.replace(/^人教版\s*/, '').replace(/^地理\s*/, '').replace('选择性必修', '选必');

const WORLD_FOV = 21, BOOK_FOV = 30;          // 地理世界用长一点的镜头（视角窄）：地球显得大、前排的书不抢；书里是 30°（Stage.js），进书、回来时慢慢换过去
/** 按书里的镜头（30°）算一个距离 */
const atBookFov = (stage, fn) => { const c = stage.camera, f = c.fov; c.fov = BOOK_FOV; c.updateProjectionMatrix(); const r = fn(); c.fov = f; c.updateProjectionMatrix(); return r; };
const setFov = (stage, f) => { if (Math.abs(stage.camera.fov - f) > 1e-4) { stage.camera.fov = f; stage.camera.updateProjectionMatrix(); } };

const PANEL_W = 22 + 336 + 24;          // 左边目录页占的宽度（.geo-toc：离边 22、宽 336），再留一点空

/** 地理世界的机位：要框进画面的是地球顶（上面留一行提示）、正前方那本书的名字、书圈左右两头。远近一直按“目录开着”算：收起目录只把画面挪到正中，不整体放大 */
function worldShot(W, H, panelW) {
  const el = THREE.MathUtils.degToRad(15), dir = new THREE.Vector3(0, Math.sin(el), Math.cos(el));
  const top = new THREE.Vector3(0, EARTH.y + EARTH.r, 0), bottom = new THREE.Vector3(0, -0.3, RING.r + 0.35), sides = [new THREE.Vector3(RING.r + 0.35, 0.4, 0), new THREE.Vector3(-RING.r - 0.35, 0.4, 0)];
  const cam = new THREE.PerspectiveCamera(WORLD_FOV, W / H, 0.1, 200), wantTop = 1 - 2 * 0.1, wantBot = -1 + 2 * 0.05, usableX = (W - panelW) / W;
  let ty = 1.3, dist = 14;
  for (let i = 0; i < 40; i++) {
    const tg = new THREE.Vector3(0, ty, 0.2);
    cam.position.copy(tg).addScaledVector(dir, dist); cam.lookAt(tg); cam.updateMatrixWorld();
    const yT = top.clone().project(cam).y, yB = bottom.clone().project(cam).y, xS = Math.max(...sides.map((p) => Math.abs(p.clone().project(cam).x)));
    dist *= Math.max((yT - yB) / (wantTop - wantBot), xS / (usableX * 0.94));
    ty += ((yT + yB) / 2 - (wantTop + wantBot) / 2) * dist * Math.tan(THREE.MathUtils.degToRad(WORLD_FOV) / 2) * 0.8;
  }
  return { target: new THREE.Vector3(0, ty, 0.2), dir, dist, cam };
}

/** 一打开地理世界，地球在屏幕上的哪儿、多大（像素：圆心 cx, cy，半径 r）：首页的地球仪飞到这里，换页面时正好和它叠在一起 */
export function earthCircle(W = innerWidth, H = innerHeight) {
  const { cam } = worldShot(W, H, PANEL_W), c = new THREE.Vector3(0, EARTH.y, 0).project(cam);
  const right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0), e = new THREE.Vector3(0, EARTH.y, 0).addScaledVector(right, EARTH.r).project(cam);
  const px = (v) => [((v.x + 1) / 2) * W, ((1 - v.y) / 2) * H], [cx, cy] = px(c), [ex, ey] = px(e);
  return { cx: cx + PANEL_W / 2, cy, r: Math.hypot(ex - cx, ey - cy) };          // 目录页开着：画面整体往右挪半个目录宽
}

export async function bootGeoWorld(stage, { focus = null } = {}) {
  document.body.classList.add('geo-world');
  if (new URLSearchParams(location.search).has('cover')) document.body.classList.add('geo-cover');          // 公众号封面：只留画面（地球、月亮、太阳、书圈），不要目录和读数
  setFov(stage, WORLD_FOV);
  document.title = '活页课本 · 地理世界';
  $('#book-title').textContent = '地理世界';
  for (const id of ['#btn-globe', '#btn-toc', '#btn-live']) $(id).hidden = true;
  $('#btn-shelf').textContent = '‹ 书架';

  // ---- 这些书、它们的活页 ----
  const books = bookList().filter((b) => b.subject === '地理' && Object.keys(getBook(b.id).lessons).length);
  const manifests = Object.fromEntries(await Promise.all(books.map(async (b) => [b.id, await getManifest(b.id)])));
  const items = [];
  for (const b of books) {
    const c = getBook(b.id), man = manifests[b.id], seen = new Set();
    for (const s of c.spots) {
      if (seen.has(s.lesson)) continue; seen.add(s.lesson);
      const L = c.lessons[s.lesson];
      items.push({ id: s.lesson, book: b, spot: s, title: L.title, fig: L.fig, sec: L.sec, page: s.page - man.pageOffset, anchor: ANCHORS[s.lesson] || { kind: 'idea' }, color: BOOK_COLORS[b.id] || '#7a6a4a' });
    }
  }

  // ---- 环境：木桌换成夜空（深蓝、星星、一道淡淡的银河）。地上一块圆台，台面上刻着这颗地球的北极投影图（跟着地球一起转） ----
  stage.desk.visible = false; stage.desk.material.transparent = true; stage.desk.material.needsUpdate = true;          // 书桌、书一开始就按半透明画（opacity 1 时和不透明一样）：半路改 transparent 要重新编译着色器，不改就淡不掉
  stage.scene.background = skyTex();
  stage.scene.fog = null;
  stage.scene.traverse((o) => { if (o.isHemisphereLight) { o.color.set(0x9db2d8); o.groundColor.set(0x141a2c); o.intensity = 0.5; } });
  Object.assign(stage.sun, { intensity: 3.2 }); stage.sun.color.set(0xfff4e6); stage.sun.position.set(-3.6, 5.4, 4.6);          // 主光从左上前方来：地球右下边缘落进晨昏里，有体积
  const root = new THREE.Group(); stage.scene.add(root);
  const stars = starField(); root.add(stars);
  const floorA = grayRadial([[0, 255], [0.7, 200], [1, 0]]);          // 圆台边缘淡进夜空里（alphaMap 读的是颜色，不是透明度）
  const floor = new THREE.Mesh(new THREE.CircleGeometry(RING.r * 1.47, 96), new THREE.MeshStandardMaterial({ color: 0x1a2440, roughness: 0.6, metalness: 0.2, transparent: true, alphaMap: floorA, depthWrite: false }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; root.add(floor);
  const glowPool = new THREE.Mesh(new THREE.CircleGeometry(RING.r * 0.7, 64), new THREE.MeshBasicMaterial({ map: radial('rgba(110,160,255,0.30)', 'rgba(110,160,255,0)'), transparent: true, depthWrite: false }));
  glowPool.rotation.x = -Math.PI / 2; glowPool.position.y = 0.004; root.add(glowPool);          // 地球在圆台上投下一片淡淡的蓝光
  const key = new THREE.PointLight(0xffd9a8, 4, 8, 1.6); key.position.set(0, 1.6, 3.6); root.add(key);          // 一盏暖光照着书圈前面的书

  // ---- 地球 ----
  const earth = new WorldEarth(stage, { night: true, now: true });          // 现在这一刻的地球：太阳照在真实的位置，夜里亮着城市灯光
  const time = timeCard({ earth });
  const layerOf = (it) => (it?.anchor.layer === 'sun' ? null : it?.anchor.layer || null);          // 昼夜不用再叠一层：地球本来就是按真实的太阳照的

  // ---- 太阳和月亮：地球还是主角。太阳在它此刻真实的方向（照亮地球的就是它）：转到画面里时是一团耀斑，被地球挡住一半时从地球边上透出来；
  //      在画面外时，那一侧的画面边上透进一点暖光（像镜头被侧光照到）。月亮小小地挂在地球左上方的远处（位置是示意），也被同一个太阳照着 ----
  const SUN_D = 40;
  const sunTex = (() => {          // 耀斑：亮核 + 一圈柔光 + 几道细光芒
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'), C = 256;
    let gr = g.createRadialGradient(C, C, 0, C, C, C); gr.addColorStop(0, 'rgba(255,252,240,1)'); gr.addColorStop(0.04, 'rgba(255,244,215,0.95)'); gr.addColorStop(0.12, 'rgba(255,210,150,0.38)'); gr.addColorStop(0.35, 'rgba(255,175,100,0.08)'); gr.addColorStop(1, 'rgba(255,150,80,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {          // 四道很淡的光芒（镜头里的星芒），不是一朵“闪光贴纸”
      const a = (i / 4) * Math.PI + 0.42, L = i % 2 ? 0.5 : 0.78;
      g.save(); g.translate(C, C); g.rotate(a);
      const lg = g.createLinearGradient(-C * L, 0, C * L, 0); lg.addColorStop(0, 'rgba(255,220,170,0)'); lg.addColorStop(0.5, 'rgba(255,236,200,0.32)'); lg.addColorStop(1, 'rgba(255,220,170,0)');
      g.fillStyle = lg; g.fillRect(-C * L, -0.9, C * L * 2, 1.8); g.restore();
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const sunGlare = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  sunGlare.scale.setScalar(SUN_D * 0.26); sunGlare.renderOrder = -1; root.add(sunGlare);
  const leak = h('div', { class: 'geo-leak' }); document.body.append(leak);
  const moonTex = new THREE.TextureLoader().load(moonUrl); moonTex.colorSpace = THREE.SRGBColorSpace; moonTex.anisotropy = 4;
  const moon = new THREE.Mesh(new THREE.SphereGeometry(EARTH.r * 0.273, 64, 48), new THREE.MeshStandardMaterial({ map: moonTex, roughness: 1, metalness: 0 }));          // 月亮的半径是地球的 0.273
  moon.raycast = () => {}; root.add(moon);
  const sunW = new THREE.Vector3();
  function skyStep(dt) {
    sunW.copy(earth.sunLocal).applyQuaternion(earth.spin.quaternion);          // 太阳此刻在哪个方向（世界坐标）
    sunGlare.position.copy(earth.root.position).addScaledVector(sunW, SUN_D);
    if (!leaving && !arriving && !diving) stage.sun.position.copy(sunW).multiplyScalar(9);          // 书、铜版也被这个太阳照着
    moon.rotation.y += dt * 0.004;
    // 太阳在画面外：那一侧透进暖光；在画面里：耀斑自己就够了，只加一点
    const cam = stage.camera, dc = sunW.clone().transformDirection(cam.matrixWorldInverse), k = 1 - worldFade;
    const th = THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(-dc.z, -1, 1)));          // 太阳离镜头正前方多少度
    let a = 0, x = 50, y = 50;
    if (th < 14) { const q = cam.position.clone().addScaledVector(sunW, 50).project(cam); a = 0.2 * k; x = ((q.x + 1) / 2) * 100; y = ((1 - q.y) / 2) * 100; }          // 在画面里：耀斑旁边再晕开一点
    else if (th < 115) {          // 在画面外：从那一侧的画面边上透进来，越偏越淡，转到身后就没有了
      const u = new THREE.Vector2(dc.x, dc.y).normalize();
      a = 0.5 * (1 - THREE.MathUtils.smoothstep(th, 55, 115)) * k;
      x = 50 + u.x * 66; y = 50 - u.y * 66;
    }
    leak.style.background = `radial-gradient(circle at ${x.toFixed(1)}% ${y.toFixed(1)}%, rgba(255,214,160,${(a).toFixed(3)}) 0%, rgba(255,180,110,${(a * 0.35).toFixed(3)}) 28%, rgba(255,170,100,0) 62%)`;
  }
  /** 月亮挂在哪：按镜头摆在地球左上方的远处（屏幕上固定的位置，窗口比例变了也不跑出画面） */
  function placeMoon(tg, dir, dist) {
    const c = new THREE.PerspectiveCamera(WORLD_FOV, innerWidth / innerHeight, 0.1, 200); c.position.copy(tg).addScaledVector(dir, dist); c.lookAt(tg); c.updateMatrixWorld();
    const e = earth.root.position.clone().project(c), p = new THREE.Vector3(e.x - 0.62, 0.56, 0.5).unproject(c), d = p.sub(c.position).normalize();
    moon.position.copy(c.position).addScaledVector(d, (dist + 4.5) / d.dot(c.getWorldDirection(new THREE.Vector3())));
  }
  earth.root.visible = true; earth.root.position.set(0, EARTH.y, 0); earth.root.scale.setScalar(EARTH.r);
  earth.setPins(items);
  earth.shadow.visible = false;
  const first = items.find((x) => x.anchor.kind === 'place' && x.book.id === focus) || items.find((x) => x.anchor.kind === 'place');
  earth.spin.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (-90 - (first ? first.anchor.pins[0].lon : 105)) * Math.PI / 180);          // 镜头在正前方（+z，地球不转时是西经 90° 那一面）：把这本书的第一面旗转过来
  const map = polarMap(earth.mat.map, RING.r); map.position.y = 0.006; root.add(map);
  const orbit = new THREE.Mesh(new THREE.TorusGeometry(RING.r, 0.009, 8, 220), new THREE.MeshBasicMaterial({ color: 0xe3c07c, transparent: true, opacity: 0.85, fog: false }));
  orbit.rotation.x = Math.PI / 2; orbit.position.y = 0.012; orbit.raycast = () => {}; root.add(orbit);          // 书圈站着的那一圈（赤道）描一道金线，铜版的轮廓清楚
  // 铜版上的太阳：太阳直射点在哪，就在铜版上的哪里（离圆心越远纬度越低，在南北回归线两道刻线之间来回）。拖着它绕圈是换时刻，往里往外是换季节
  map.material.uniforms.lights.value = earth.nowU.nightMap?.value || null;
  const DIAL = { r0: RING.r * 0.75, r1: RING.r * 0.915 };
  const hours = hourRing(DIAL.r0, DIAL.r1); hours.position.y = 0.009; root.add(hours);
  const sunSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: radial('rgba(255,236,190,1)', 'rgba(255,190,90,0)', 0.35), transparent: true, depthWrite: false, fog: false }));
  sunSpr.scale.setScalar(0.42); sunSpr.renderOrder = 4; root.add(sunSpr);
  const sunCore = new THREE.Mesh(new THREE.SphereGeometry(0.055, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffe7a8, fog: false })); root.add(sunCore);
  const sunPick = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshBasicMaterial({ visible: false })); root.add(sunPick);
  const sunOnGlobe = new THREE.Sprite(new THREE.SpriteMaterial({ map: radial('rgba(255,240,200,1)', 'rgba(255,200,110,0)', 0.3), transparent: true, depthWrite: false, fog: false })); sunOnGlobe.scale.setScalar(0.09); earth.spin.add(sunOnGlobe);          // 地球上也标一下直射点
  const circleTags = [['北回归线', 66.56], ['赤道', 90], ['南回归线', 113.44]].map(([name, colat]) => ({ colat, t: tag(name, 'w-circle') }));
  const sunTag = tag('<span>拖动太阳</span>', 'w-sunhint');          // 呼吸的动画放在里面那层（放在外层会盖过藏起来用的透明度）
  const plateAz = (lon, spinA) => -lon * Math.PI / 180 - spinA;          // 经度 → 铜版上的方位角（世界坐标 atan2(z, x)）
  // 你在这里：地球上一个白色的小圈（和活页的彩色小旗不一样），旁边写城市名
  const homeM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const home = new THREE.Group(), homeRing = new THREE.Mesh(new THREE.RingGeometry(0.02, 0.027, 40), homeM), homeDot = new THREE.Mesh(new THREE.CircleGeometry(0.008, 20), homeM);
  homeRing.raycast = homeDot.raycast = () => {}; home.add(homeRing, homeDot); earth.spin.add(home);
  const homeTag = tag('', 'w-home');
  time.onChange(({ city }) => {
    const n = new THREE.Vector3(...ll2v(city.lat, city.lon));
    home.position.copy(n).multiplyScalar(1.004); home.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n); home.userData.n = n;
    homeTag.text(`<b>你在这里</b><small>${city.name}</small>`);
  });

  // ---- 书圈：每本书立着，封面朝外，往后仰一点 ----
  const ring = new THREE.Group(); root.add(ring);
  const loader = new THREE.TextureLoader(), bookObjs = [];
  books.forEach((b, i) => {
    const man = manifests[b.id], W = (RING.h * man.pageSize[0]) / man.pageSize[1], T = (Math.floor(man.pageCount / 2) + 1) * 0.0017 * RING.h / 2;          // 放大到书里那本书的大小（高 2）时，正好是书里合上的书那么厚
    const cover = loader.load(fileUrl(`${getBook(b.id).base}hi/000.jpg`), () => { const bo = bookObjs.find((x) => x.b === b); if (bo) bo.coverReady = true; }); cover.colorSpace = THREE.SRGBColorSpace; cover.anisotropy = 8;
    const paper = new THREE.MeshStandardMaterial({ color: 0xf1ebde, roughness: 0.9, transparent: true }), back = new THREE.MeshStandardMaterial({ map: backTex(b, BOOK_COLORS[b.id]), roughness: 0.7, transparent: true });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(W, RING.h, T), [paper, paper, paper, paper, new THREE.MeshStandardMaterial({ map: cover, roughness: 0.6, transparent: true }), back]);          // 封面朝 +z（朝外）
    mesh.castShadow = true; mesh.position.y = RING.h / 2;
    const g = new THREE.Group(), lean = new THREE.Group(); lean.add(mesh); g.add(lean); lean.rotation.x = -RING.tilt; ring.add(g);
    const a = (i / books.length) * Math.PI * 2;
    g.position.set(Math.sin(a) * RING.r, 0, Math.cos(a) * RING.r); g.rotation.y = a;
    const lamp = new THREE.Mesh(new THREE.CircleGeometry(W * 0.75, 40), new THREE.MeshBasicMaterial({ map: radial(hexA(BOOK_COLORS[b.id], 0.55), hexA(BOOK_COLORS[b.id], 0)), transparent: true, depthWrite: false })); lamp.rotation.x = -Math.PI / 2; lamp.position.set(0, 0.008, 0.12); g.add(lamp);          // 书脚下一圈这本书的颜色
    const label = tag(`<b>${SHORT(b.full)}</b><small>活页 ${Object.keys(getBook(b.id).lessons).length} 张</small>`, 'w-booklabel');
    bookObjs.push({ b, g, lean, mesh, lamp, label, a, W, T, hot: 0 });
  });
  let ringRot = 0, ringTo = 0;
  const spinTo = (bo) => { let d = -bo.a - ringRot; d = ((d + Math.PI * 3) % (Math.PI * 2)) - Math.PI; ringTo = ringRot + d; };          // 转最短的那条路，让这本书到正前方
  const fb = bookObjs.find((x) => x.b.id === focus); if (fb) { spinTo(fb); ringRot = ringTo; }

  // ---- 镜头：地球在中间偏上，书圈在下面，一起框进来（算法在下面的 worldShot） ----
  const shot = (instant = false) => {
    const cover = document.body.classList.contains('geo-cover'), panelW = cover ? 0 : PANEL_W;
    stage.cameraOffsetX = panelOpen() && !cover ? panelW / 2 : 0; stage.cameraOffsetY = 0;
    const { target, dir, dist } = worldShot(innerWidth, innerHeight, panelW);
    stage.shot({ target, dir, dist, instant, minEl: 0.05 });
    if (instant) (stage._off ||= new THREE.Vector2()).set(stage.cameraOffsetX, stage.cameraOffsetY);          // 一下子到位：画面不从正中慢慢挪过去（首页飞过来的球要正好叠在地球上）
    placeMoon(target, dir, dist);
  };


  // ---- 左边：这个世界的“目录页”。像课本开头的目录：书名、点线、活页张数；点一本书，展开它的活页（点线连到页码）。
  //      不是活页里那种问题、步骤的纸卡。可以收起成左边的一条书脊，点书脊再打开 ----
  const bookName = (b) => b.full.replace(/^人教版\s*/, '').replace(/^地理\s*/, '');
  const toc = h('aside', { class: 'geo-toc' });
  const spine = h('button', { class: 'geo-toc-spine', title: '打开目录', onclick: () => setToc(true) }, h('span', {}, '目录'));
  document.body.append(toc, spine);
  const panelOpen = () => !toc.classList.contains('folded');
  function setToc(on) { toc.classList.toggle('folded', !on); spine.classList.toggle('on', !on); shot(); }
  const uiLeave = (on) => { toc.classList.toggle('leaving', on); spine.classList.toggle('leaving', on); };
  const rows = new Map(), groups = new Map();
  let frontId = null;
  const openBookList = (id) => { for (const [k, g] of groups) { g.el.classList.toggle('open', k === id); g.head.classList.toggle('on', k === id); } };
  const setFront = (id) => { if (id === frontId) return; frontId = id; openBookList(id); };          // 书圈转到正前方的那本书，目录里就展开它
  {
    const list = h('div', { class: 'gt-list' });
    for (const b of books) {
      const mine = items.filter((x) => x.book.id === b.id), bo = () => bookObjs.find((x) => x.b.id === b.id);
      const head = h('button', { class: 'gt-book', onclick: () => { if (bo()) spinTo(bo()); openBookList(b.id); }, onmouseenter: () => { bookHot = bo(); }, onmouseleave: () => { bookHot = null; } },
        h('i', { style: `background:${BOOK_COLORS[b.id]}` }), h('span', {}, bookName(b)), h('em'), h('b', {}, `${mine.length}`));
      const inner = h('div', { class: 'gt-in' }), el = h('div', { class: 'gt-lessons' }, inner);          // 展开、收起：外层从 0 高变到原高（里面一层负责裁掉）
      // 同一节有几张活页的（板块、褶皱、断层；大气受热、热力环流；气压带风带、季风……），先写这一节的名字，几张活页缩进排在下面——像课本的目录，看上去是一个个专题，不是一长串
      const secs = new Map();
      for (const it of mine) { const k = it.sec || it.id; if (!secs.has(k)) secs.set(k, []); secs.get(k).push(it); }
      for (const [sec, list] of [...secs].sort((x, y) => Math.min(...x[1].map((i) => i.page)) - Math.min(...y[1].map((i) => i.page)))) {          // 按页码排（后来补的活页也排到它在书里的位置）
        const grouped = list.length > 1;
        if (grouped) inner.append(h('div', { class: 'gt-sec' }, h('span', {}, sec.replace(/^第.+?节\s*/, '')), h('em'), h('b', {}, `${Math.min(...list.map((x) => x.page))}`)));
        for (const it of list.sort((x, y) => x.page - y.page)) {
          const row = h('button', { class: `gt-row${grouped ? ' sub' : ''}`, onclick: () => go(it), onmouseenter: () => hover({ it }, true), onmouseleave: () => hover(null, true) },
            h('small', {}, it.fig), h('span', {}, it.title), h('em'), h('b', {}, `${it.page}`));
          if (stamps.has(it.id)) row.classList.add('done');
          rows.set(it.id, row); inner.append(row);
        }
      }
      groups.set(b.id, { el, head }); list.append(head, el);
    }
    toc.append(
      h('button', { class: 'gt-tuck', title: '收起目录', onclick: () => setToc(false) }, '‹'),
      h('div', { class: 'gt-pre' }, '人教版 · 初中 高中'),
      h('h1', { class: 'gt-title' }, '地理世界'),
      h('div', { class: 'gt-rule' }),
      h('div', { class: 'gt-sub' }, h('span', {}, `${books.length} 册课本`), h('span', {}, '目 录'), h('span', {}, `${items.length} 张活页`)),
      list,
      h('p', { class: 'gt-foot' }, '拖着地球转一转；指着一面旗，看它在哪本书；点下去，翻到那一页'));
  }
  shot(true);
  let touched = false;

  // ---- 看法：昼夜 / 板块 / 气压带，一次看一种。写在右上角“现在这一刻”的读数上面——右边这一列说的都是“地球上现在显示的是什么”。
  //      选中的那一格是一张纸，滑过去；下面跟着这一种的图例和“进到那张活页” ----
  const VIEWS = [['sun', '昼夜'], ['plates', '板块'], ['belts', '气压带']].map(([id, label]) => ({ id, label, it: items.find((x) => x.anchor.layer === id) })).filter((v) => v.it);
  const LEGEND = {
    plates: '<span><i style="background:#d8342c"></i>生长边界</span><span><i style="background:#23a04e"></i>汇聚边界</span><span><i style="background:#8a8e96"></i>转换边界</span>',          // 和板块那张活页同一套颜色、同样的叫法
    belts: '<span><i class="sq" style="background:#e67a61"></i>高压带</span><span><i class="sq" style="background:#5785db"></i>低压带</span><small>理想模型：假设地表均匀，也不随季节移动</small>',
  };
  let view = VIEWS[0];
  const thumb = h('i', { class: 'gv-thumb' }), segs = VIEWS.map((v) => h('button', { 'data-id': v.id, onclick: () => setView(v) }, v.label));
  const legend = h('div', { class: 'gv-legend', hidden: true }), enter = h('button', { class: 'gv-go', onclick: () => go(view.it) });
  time.el.prepend(h('div', { class: 'gv' }, h('div', { class: 'gv-seg' }, thumb, ...segs), legend, enter));
  function setView(v, init = false) {
    view = v; earth.setLayer(layerOf(v.it));
    segs.forEach((b) => b.classList.toggle('on', b.dataset.id === v.id));
    const b = segs.find((x) => x.dataset.id === v.id); thumb.style.width = `${b.offsetWidth}px`; thumb.style.transform = `translateX(${b.offsetLeft}px)`;
    legend.innerHTML = LEGEND[v.id] || ''; legend.hidden = !LEGEND[v.id];
    enter.textContent = `进到“${v.it.title}” →`;
    time.el.classList.toggle('alt-view', v.id !== 'sun');          // 看板块、气压带时，下面的时刻读数收起来，让出图例
    if (!init && v.id === 'sun') earth.turnTo(time.city.lat, time.city.lon, stage.camera);
  }
  requestAnimationFrame(() => setView(view, true)); document.fonts?.ready.then(() => setView(view, true));          // 字体到了，格子宽度会变：再量一次

  // ---- 指着旗、书、侧栏的名字：旗亮、书亮、明信片 ----
  let hovered = null, cardFor = null;
  const card = tag('', 'w-card'); card.show(false);
  function hover(x, fromPanel = false) {
    hovered = x; earth.setHot(x);
    if (x?.pn && TERRAIN[x.pn.place]) loadTerrain(TERRAIN[x.pn.place]);          // 指着就先下这座山的地形和影像，点下去不用等
    for (const [id, r] of rows) r.classList.toggle('on', !!x && id === x.it.id);
    if (fromPanel && x?.it.anchor.kind === 'place') { const p = x.it.anchor.pins[0]; earth.turnTo(p.lat, p.lon, stage.camera); }
    earth.setLayer(x?.it.anchor.kind === 'globe' ? layerOf(x.it) : layerOf(view?.it));          // 指着整个地球的活页（板块、气压带）时，地球上叠出那一层看看；移开回到选着的看法
    if (!x?.pn) { card.show(false); cardFor = null; return; }
    if (cardFor !== x) {
      cardFor = x; const it = x.it, [x0, y0, x1, y1] = it.spot.bbox, man = manifests[it.book.id], PW = man.pageSize[0], PH = man.pageSize[1];
      const extra = x.pn.extra;          // 活页补充的地方（课本这一节没有）：不配课本的图，写明是补充
      card.text(`${extra ? '' : '<div class="w-fig" hidden></div>'}<b>${it.title}</b><p class="w-q"></p><small>${extra ? `${x.pn.name}：${extra}` : `${SHORT(it.book.full)} · ${it.fig} · 第 ${it.page} 页 · ${x.pn.name}`}</small>`);
      const fig = card.el.querySelector('.w-fig');
      if (fig) {          // 课本那一页的图：本机有书页图（开发时）才配；网站上没有原书页，只写图号
        const url = fileUrl(`${getBook(it.book.id).base}hi/${String(it.spot.page).padStart(3, '0')}.jpg`), im = new Image();
        im.onload = () => { if (cardFor !== x) return; Object.assign(fig.style, { aspectRatio: `${x1 - x0} / ${y1 - y0}`, backgroundSize: `${(PW / (x1 - x0)) * 100}% auto`, backgroundPosition: `${(x0 / (PW - (x1 - x0))) * 100}% ${(y0 / (PH - (y1 - y0))) * 100}%`, backgroundImage: `url(${url})` }); fig.hidden = false; };
        im.src = url;
      }
      getBook(it.book.id).lessons[it.id]?.load().then((m) => { const q = cardFor === x && card.el.querySelector('.w-q'); if (q) q.innerHTML = String(m.default.places?.[x.pn.place]?.ask || m.default.ask || '').replace(/<[^>]+>/g, ''); });
    }
    card.show(true);
  }

  // ---- 进去：书转到正前方，落到面前放平（就是书里合上的那本书的位置），夜空换成书桌，地球缩到右上角（有地方的活页）或沉进书里 ----
  // 落好以后这一帧和书里的第一帧是同一个画面：截下来盖着换页面，那边画好了再揭开，看不出换过
  let leaving = null;
  function go(it, pn = null) {
    const bo = bookObjs.find((x) => x.b.id === it.book.id); if (!bo || leaving || diving) return;
    const p = pn || it.anchor.pins?.[0];
    if (p && TERRAIN[p.place]) return dive(it, p, bo);          // 有真实地形的地方：先俯冲到那座山上
    if (p) { earth.turnTo(p.lat, p.lon, stage.camera); earth.setActive({ it, pn: p }); }
    const corner = it.anchor.kind === 'place' && /^dili-(bx|xb)/.test(it.book.id);          // 书里那颗地球：有地方的活页一进去就在右上角
    leave(bo, `?book=${it.book.id}#live=${it.id}${pn && pn !== it.anchor.pins?.[0] ? `&place=${encodeURIComponent(pn.place || pn.name)}` : ''}`, corner);          // 不是第一面旗（长白山、黄河入海口……）：带上是哪一面
  }
  function openBook(bo) { leave(bo, `?book=${bo.b.id}`, false); }
  function leave(bo, url, corner) {
    if (leaving) return;
    leaving = { bo, url, corner, t: 0 }; touched = true; hover(null); card.show(false); bookHot = null;
    spinTo(bo);
    uiLeave(true);
  }
  const DAY = { bg: new THREE.Color(0xe9e1d3), hemi: [new THREE.Color(0xfffaf2), new THREE.Color(0xb8a890), 1.75], sun: [new THREE.Color(0xfff6e8), 1.7, new THREE.Vector3(-2.2, 6.5, 3.2)] };          // 书里白天书桌的灯光（同 Stage.js）
  const hemi = (() => { let x = null; stage.scene.traverse((o) => { if (o.isHemisphereLight) x = o; }); return x; })();
  let worldFade = 0;          // 0 夜空里的地理世界，1 换成了书桌（别的书、圆台、星星都淡掉了）
  const skyBg = stage.scene.background;
  /** 进书 / 从书里回来的过渡：书从书圈正前方落到桌面中间放平（书里合上的书那个位置），raw 0→1 是进去，1→0 是回来 */
  function transSetup(bo, corner) {
    const s = 2 / RING.h, W = bo.W * s, el = THREE.MathUtils.degToRad(64);
    root.updateMatrixWorld(true); root.attach(bo.mesh); bo.label.show(false);
    return {
      bo, corner, W, s,
      from: { p: bo.mesh.position.clone(), q: bo.mesh.quaternion.clone(), s: bo.mesh.scale.x },
      to: { p: new THREE.Vector3(W / 2, (bo.T * s) / 2, 0), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)), s },
      shot: { target: new THREE.Vector3(W / 2, 0, 0.06), dir: new THREE.Vector3(0, Math.sin(el), Math.cos(el)), dist: atBookFov(stage, () => stage.fitDistance(W * 1.25, 2 * 1.2, 1.04)) },          // 和书里合上的书同一个机位（main.js 的 bookShot，书里的镜头）
      night: { hc: hemi.color.clone(), hg: hemi.groundColor.clone(), hi: hemi.intensity, sc: stage.sun.color.clone(), si: stage.sun.intensity, sp: stage.sun.position.clone() },
      e0: corner ? scr(earth.root.position, earth.root.scale.x) : null,
    };
  }
  function transApply(L, raw) {
    const bo = L.bo, k = ease(raw), f = THREE.MathUtils.smoothstep(raw, 0.25, 0.85);
    setFov(stage, WORLD_FOV + (BOOK_FOV - WORLD_FOV) * k);          // 镜头一边走一边换成书里的
    // 书：从书圈里落到桌面中间，一边落一边放平、放大到书里那本书的大小
    bo.mesh.position.lerpVectors(L.from.p, L.to.p, k); bo.mesh.position.y += Math.sin(Math.PI * k) * 0.35;
    bo.mesh.quaternion.slerpQuaternions(L.from.q, L.to.q, ease(Math.min(1, raw * 1.15)));
    bo.mesh.scale.setScalar(L.from.s + (L.to.s - L.from.s) * k);
    // 别的书、圆台、星星淡掉；书桌、白天的灯光、雾慢慢回来
    worldFade = f;
    for (const o of bookObjs) if (o !== bo) { o.mesh.castShadow = f < 0.01; o.mesh.visible = f < 0.995; for (const mt of o.mesh.material) { mt.depthWrite = f <= 0.001; mt.opacity = 1 - f; } }          // 淡掉的书不写深度：不然在半透明的书桌上挖出一个个洞，露出后面的夜空
    for (const m of [floor.material, glowPool.material]) m.opacity = 1 - f;
    map.material.uniforms.fade.value = 1 - f;
    orbit.material.opacity = 0.85 * (1 - f);
    stars.children.forEach((pt) => { pt.material.opacity = 1 - f; });
    sunGlare.material.opacity = 1 - f; moon.visible = f < 0.6;
    stage.desk.visible = f > 0.001; stage.desk.material.opacity = f;
    stage.scene.background = f > 0.999 ? DAY.bg : skyBg;          // 书桌完全不透明了才换掉夜空（不然隔着半透明的桌面一下变亮）
    if (f > 0.001) { stage.scene.fog ||= new THREE.Fog(DAY.bg.clone(), 60, 80); stage.scene.fog.near = 60 - 53 * f; stage.scene.fog.far = 80 - 62 * f; } else stage.scene.fog = null;
    const n = L.night;
    hemi.color.lerpColors(n.hc, DAY.hemi[0], f); hemi.groundColor.lerpColors(n.hg, DAY.hemi[1], f); hemi.intensity = n.hi + (DAY.hemi[2] - n.hi) * f;
    stage.sun.color.lerpColors(n.sc, DAY.sun[0], f); stage.sun.intensity = n.si + (DAY.sun[1] - n.si) * f; stage.sun.position.lerpVectors(n.sp, DAY.sun[2], f);
    key.intensity = 4 * (1 - f);
    earth.haloM.uniforms.k.value = 1 - 0.75 * f; earth.nowK = 1 - f;          // 落到书桌上：地球换回书里那样的灯光（书里角上那颗地球是白天的样子）
    // 地球：有地方的活页缩到右上角（书里那颗地球一进去就在那儿）；别的沉进书里（书里的地球从书里升起来），回来时从书里升回去
    if (L.corner) {
      const E = cornerScr(), A = L.e0;
      placeScr(earth.root, { x: A.x + (E.x - A.x) * k, y: A.y + (E.y - A.y) * k, depth: Math.exp(Math.log(A.depth) + (Math.log(E.depth) - Math.log(A.depth)) * k), a: A.a + (E.a - A.a) * k });
    } else {
      earth.root.position.set(0, EARTH.y, 0).lerp(new THREE.Vector3(L.W / 2, bo.T * L.s + 0.01, 0), k);
      earth.root.scale.setScalar(EARTH.r + (0.004 - EARTH.r) * k);
    }
  }
  function land(dt) {
    const G = leaving;
    if (!G.L) {
      if (Math.abs(ringTo - ringRot) > 0.45 && G.t < 1.2) return;          // 书先转到前面来（差不多到了就开始落）
      G.L = transSetup(G.bo, G.corner); G.raw = 0;
      stage.cameraOffsetX = 0; stage.calm = true; stage.shot(G.L.shot);
    }
    G.raw = Math.min(1, G.raw + dt / 1.25);
    transApply(G.L, G.raw);
    if (G.raw >= 1 && !G.sent && (stage.settled(0.004, { parallax: true }) || G.t > 3.2)) {
      G.sent = true;
      try { sessionStorage.setItem('livebook.snap', stage.snapshot()); } catch { /* 存不下就直接换 */ }
      if (!window.__geoStay) location.href = G.url;          // __geoStay：测试脚本停在落好的这一帧看
    }
  }
  // 从书里回来（点了“‹ 地理世界”）：书里最后一帧（合上的书）盖着；这边先摆成同一个画面，书的封面贴图好了再揭开，然后倒着放一遍：书升回书圈，书桌淡回夜空，地球从书里升起来
  let arriving = null;
  function arrive(bo) {
    spinTo(bo); ringRot = ringTo; ring.rotation.y = ringRot; bo.g.rotation.y = bo.a;
    arriving = { L: transSetup(bo, false), raw: 1, t: 0, frames: 0 };
    transApply(arriving.L, 1);
    stage.shot({ ...arriving.L.shot, instant: true }); stage.cameraOffsetX = 0; stage.calm = true;
    uiLeave(true);
  }
  function arriveStep(dt) {
    const A = arriving; A.t += dt;
    if (!A.shown) {
      if (A.L.bo.coverReady || A.t > 1.6) A.frames++;
      if (A.frames > 2) { A.shown = true; A.delay = 0.34; window.__dropSnap?.(); }          // 盖着的截图淡出完了再动（不然有一两帧重影）
      return;
    }
    if (A.delay > 0) { A.delay -= dt; if (A.delay <= 0) { stage.calm = false; shot(); } return; }
    A.raw = Math.max(0, A.raw - dt / 1.25);
    transApply(A.L, A.raw);
    if (A.raw > 0) return;
    const bo = A.L.bo;          // 落回书圈：书放回原来的位置，材质恢复不透明
    bo.lean.attach(bo.mesh); bo.mesh.position.set(0, RING.h / 2, 0); bo.mesh.quaternion.identity(); bo.mesh.scale.setScalar(1); bo.label.show(true);
    for (const o of bookObjs) { o.mesh.castShadow = true; o.mesh.visible = true; for (const mt of o.mesh.material) { mt.depthWrite = true; mt.opacity = 1; } }
    uiLeave(false);
    arriving = null;
  }
  // 一个球在屏幕上的样子（位置、离镜头多远、看上去多大），和反过来按屏幕上的样子摆回去（同 World.js 的 _scr/_blend）
  function scr(pos, r) { const cam = stage.camera; cam.updateMatrixWorld(); const fwd = cam.getWorldDirection(new THREE.Vector3()), v = pos.clone().project(cam), depth = Math.max(0.05, pos.clone().sub(cam.position).dot(fwd)); return { x: v.x, y: v.y, depth, a: r / depth }; }
  function placeScr(obj, e) { const cam = stage.camera, fwd = cam.getWorldDirection(new THREE.Vector3()), d = new THREE.Vector3(e.x, e.y, 0.5).unproject(cam).sub(cam.position).normalize(); obj.position.copy(cam.position).addScaledVector(d, e.depth / Math.max(0.05, d.dot(fwd))); obj.scale.setScalar(e.a * e.depth); }
  function cornerScr() {          // 书里右上角那颗地球（World.js 的 LOC）
    const LOC = { rpx: 46, right: 30, top: 84, dist: 1.35 }, cam = stage.camera; cam.updateMatrixWorld();
    const x = 1 - ((LOC.right + LOC.rpx) / innerWidth) * 2, y = 1 - ((LOC.top + LOC.rpx) / innerHeight) * 2;
    const d = new THREE.Vector3(x, y, 0.5).unproject(cam).sub(cam.position).normalize(), depth = LOC.dist * d.dot(cam.getWorldDirection(new THREE.Vector3()));
    return { x, y, depth, a: Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * ((LOC.rpx * 2) / innerHeight) };
  }

  // ---- 俯冲：从地球一路飞进去，落到那座山的真实地形上（卫星影像 + 高程，高度放大写明）----
  // 地球以那一点为不动点慢慢放大（几百倍），镜头同时推近、最后转成斜着看山；穿过云层，太空换成天空。
  // 到了：标出地方、北在哪、画出要切开看的那条线（北坡从山脚到山顶），再进书。
  let diving = null;
  const skyDome = (() => {          // 进到大气里：一层天空（地平线发白、头顶蓝）罩在后面
    const m = new THREE.ShaderMaterial({ depthWrite: false, depthTest: false, transparent: false, blending: THREE.CustomBlending, side: THREE.BackSide, uniforms: { k: { value: 0 } },          // 放在不透明的那一批里最先画（再画地球、地形），自己按透明度混合
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform float k; varying vec3 vD; void main(){ float t = clamp(vD.y * 1.4 + 0.15, 0.0, 1.0); vec3 c = mix(vec3(0.584, 0.672, 0.768), vec3(0.16, 0.30, 0.62), t); gl_FragColor = vec4(c, k); \n #include <colorspace_fragment>\n }' });
    const d = new THREE.Mesh(new THREE.SphereGeometry(30, 32, 16), m); d.renderOrder = -10; d.frustumCulled = false; d.raycast = () => {}; d.visible = false; stage.scene.add(d); return d;
  })();
  const diveHud = h('div', { class: 'geo-dive' }, h('div', { class: 'gd-north' }, h('i'), h('b', {}, '北')), h('small', { class: 'gd-src' }));
  document.body.append(diveHud);
  const diveTag = tag('', 'w-dive'); diveTag.show(false);
  function dive(it, pn, bo) {
    const def = TERRAIN[pn.place];
    diving = { it, pn, bo, def, t: 0, phase: 'turn' };
    touched = true; hover(null); card.show(false); bookHot = null;
    uiLeave(true);
    earth.turnTo(def.target[0], def.target[1], stage.camera); earth.setActive({ it, pn });
    loadTerrain(def).then(() => { if (!diving) return; diving.P = globePatch(def); earth.spin.add(diving.P.mesh, diving.P.cut); });
  }
  function diveStep(dt) {
    const D = diving; D.t += dt;
    if (D.phase === 'turn') {
      if (!D.P) return;          // 地形还没下完（一般指着旗时就下好了）
      const def = D.def, q = earth.root.getWorldQuaternion(new THREE.Quaternion()).multiply(earth.target || earth.spin.quaternion), Fl = frameAt(...def.target);          // 按地球转好以后的朝向算（一边转一边飞）
      const up = Fl.up.clone().applyQuaternion(q), east = Fl.east.clone().applyQuaternion(q), north = Fl.north.clone().applyQuaternion(q);
      const az = def.view.az * Math.PI / 180, el = def.view.el * Math.PI / 180, horiz = north.clone().multiplyScalar(Math.cos(az)).addScaledVector(east, Math.sin(az));
      const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(stage.camera.fov) / 2) * stage.camera.aspect), dF = 1.6;
      const lt = toLocal(def, ...def.target);
      Object.assign(D, {
        up, east, north, r0: earth.root.scale.x, F: earth.root.position.clone().addScaledVector(up, earth.root.scale.x),
        R1: (2 * dF * Math.tan(hfov / 2) * 6371) / def.view.km, dF, hT: (elevAt(def, lt.x, lt.y) * def.exag) / 1000 / 6371,
        Df: up.clone().multiplyScalar(Math.sin(el)).addScaledVector(horiz, Math.cos(el)).normalize(),
        T0: stage.rig.cur.target.clone(), D0: stage.rig.cur.dir.clone(), d0: stage.rig.cur.dist, s: 0, phase: 'fly',
        light: { hc: hemi.color.clone(), hg: hemi.groundColor.clone(), hi: hemi.intensity, sc: stage.sun.color.clone(), si: stage.sun.intensity, sp: stage.sun.position.clone() },
      });
      stage.calm = true; stage.resetView(); stage.cameraOffsetX = 0;
      earth.setLook({ pins: false }); earth.setHot(null); earth.setActive(null); skyDome.visible = true;
      stage.scene.fog = new THREE.Fog(0xc9d6e3, 1e5, 2e5);
      return;
    }
    if (D.phase === 'fly') {
      if (!D.backing) D.s = Math.min(1, D.s + dt / 3.0);
      const s = D.s, e2 = ease(s), e1 = 1 - Math.pow(1 - Math.min(1, s * 1.6), 3), e3 = THREE.MathUtils.smoothstep(s, 0.45, 1);
      const R = Math.exp(Math.log(D.r0) + (Math.log(D.R1) - Math.log(D.r0)) * e2);
      earth.root.scale.setScalar(R); earth.root.position.copy(D.F).addScaledVector(D.up, -R);
      const surf = D.F.clone().addScaledVector(D.up, R * D.hT * e3);          // 镜头看着山顶（地形高出球面的那一点），越近越准
      const dist = Math.exp(Math.log(D.d0) + (Math.log(D.dF) - Math.log(D.d0)) * e2);
      const dir = D.D0.clone().lerp(D.Df, e3).normalize();
      const tgt = D.T0.clone().lerp(surf, e1);
      Object.assign(stage.rig, { dist }); stage.rig.target.copy(tgt); stage.rig.dir.copy(dir);
      stage.rig.cur.target.copy(tgt); stage.rig.cur.dir.copy(dir); stage.rig.cur.dist = dist; stage.rig.minEl = -1;
      // 镜头的“上”从世界的上慢慢换成这座山当地的上：落到山上时地平线是平的
      const cam = stage.camera; cam.up.set(0, 1, 0).lerp(D.up, e3).normalize(); cam.position.copy(tgt).addScaledVector(dir, dist); cam.lookAt(tgt);
      // 地形在画面里占得够大才显出来；穿过云层；大气光收掉；太阳换成白天；进到大气里，后面换成天空
      const frac = (R * D.def.size / 6371) / (dist * 0.83);
      D.P.mesh.material.uniforms.k.value = THREE.MathUtils.smoothstep(frac, 0.08, 0.35);
      earth.cloudWant = 1 - THREE.MathUtils.smoothstep(s, 0.3, 0.62); earth.haloM.uniforms.k.value = 1 - THREE.MathUtils.smoothstep(s, 0.35, 0.7);
      earth.nowK = 1 - THREE.MathUtils.smoothstep(s, 0.15, 0.55);
      const fo = THREE.MathUtils.smoothstep(s, 0, 0.16);
      for (const o of bookObjs) { o.mesh.visible = fo < 0.99; for (const mt of o.mesh.material) { mt.opacity = 1 - fo; mt.depthWrite = fo < 0.01; } o.label.show(false); }
      floor.material.opacity = 1 - fo; glowPool.material.opacity = 1 - fo; map.material.uniforms.fade.value = 1 - fo; orbit.material.opacity = 0.85 * (1 - fo); worldFade = fo;
      skyDome.material.uniforms.k.value = THREE.MathUtils.smoothstep(s, 0.6, 0.92); skyDome.position.copy(stage.camera.position);
      stars.children.forEach((pt) => { pt.material.opacity = 1 - THREE.MathUtils.smoothstep(s, 0.5, 0.85); });
      sunGlare.material.opacity = 1 - THREE.MathUtils.smoothstep(s, 0.25, 0.6); moon.visible = s < 0.35;          // 飞进大气里：太阳耀斑、月亮先收起来
      const hz = THREE.MathUtils.smoothstep(s, 0.22, 0.95), hn = dist * (1.1 + 3 * (1 - hz)), hf = dist * (3.2 + 7 * (1 - hz));          // 越近，远处的山蒙上的空气越厚（飞下去的路上，地形四周低分辨率的地球也蒙着一层，不像一张卡片）
      D.P.mesh.material.uniforms.haze.value.set(hn, hf); stage.scene.fog.near = hn; stage.scene.fog.far = hf;
      const f = THREE.MathUtils.smoothstep(s, 0.3, 0.9), L = D.light;
      hemi.color.lerpColors(L.hc, DAY.hemi[0], f); hemi.groundColor.lerpColors(L.hg, DAY.hemi[1], f); hemi.intensity = L.hi + (DAY.hemi[2] - L.hi) * f;
      stage.sun.color.lerpColors(L.sc, DAY.sun[0], f); stage.sun.intensity = L.si + (DAY.sun[1] - L.si) * f; stage.sun.position.lerpVectors(L.sp, DAY.sun[2], f);
      if (s >= 1 && !D.backing) { D.phase = 'arrive'; D.ta = 0; D.P.cut.visible = true; }
      return;
    }
    if (D.phase === 'back') {          // 回到地球：同一段倒着飞回去
      diveTag.show(false); D.cutTag?.show(false); diveHud.classList.remove('on'); D.P.cut.visible = false;
      D.s = Math.max(0, D.s - dt / 2.4); D.phase = 'fly'; D.backing = true; diveStep(0); D.phase = 'back';
      if (D.s > 0) return;
      earth.spin.remove(D.P.mesh, D.P.cut); skyDome.visible = false; stage.scene.fog = null; stage.camera.up.set(0, 1, 0);
      for (const o of bookObjs) { o.mesh.visible = true; for (const mt of o.mesh.material) { mt.opacity = 1; mt.depthWrite = true; } }
      floor.material.opacity = 1; glowPool.material.opacity = 1; map.material.uniforms.fade.value = 1; orbit.material.opacity = 0.85; worldFade = 0; earth.cloudWant = 1; earth.haloM.uniforms.k.value = 1; earth.nowK = 1;
      stars.children.forEach((pt) => { pt.material.opacity = 1; }); sunGlare.material.opacity = 1; moon.visible = true; earth.setLook({ pins: true }); earth.root.scale.setScalar(EARTH.r); earth.root.position.set(0, EARTH.y, 0);
      const L = D.light; hemi.color.copy(L.hc); hemi.groundColor.copy(L.hg); hemi.intensity = L.hi; stage.sun.color.copy(L.sc); stage.sun.intensity = L.si; stage.sun.position.copy(L.sp);
      stage.calm = false; diving = null; uiLeave(false); shot();
      return;
    }
    if (D.phase === 'arrive') {
      D.ta += dt; skyDome.position.copy(stage.camera.position);
      stage.camera.lookAt(stage.rig.cur.target);          // 镜头的上一直是当地的上（舞台每帧按世界的上 lookAt，这里再摆一次）
      // 画那条线：从山脚往山顶画过去
      const k = THREE.MathUtils.smoothstep(D.ta, 0.4, 1.8), lg = D.P.cut.geometry;
      lg.instanceCount = Math.max(1, Math.round(120 * k)); D.P.cut.material.opacity = 0.95;
      const top = earth.root.localToWorld(D.P.lineAt(D.def.cut.nameAt ?? 1).clone().applyQuaternion(earth.spin.quaternion));
      diveTag.text(`<b>${D.def.name}</b><small>真实高程 + 卫星影像（2020 年合成）· 高度放大 ${D.def.exag} 倍</small>`).at(top).show(true);
      const mid = earth.root.localToWorld(D.P.lineAt(D.def.cut.textAt ?? 0.45).clone().applyQuaternion(earth.spin.quaternion));
      D.cutTag ||= tag('', 'w-cut'); D.cutTag.text(D.def.cut.text).at(mid).show(k > 0.6);
      diveHud.classList.add('on'); diveHud.querySelector('.gd-src').textContent = D.def.src;
      const c0 = D.F.clone().project(stage.camera), c1 = D.F.clone().addScaledVector(D.north, earth.root.scale.x * 5 / 6371).project(stage.camera);          // 北在画面上朝哪
      diveHud.querySelector('.gd-north i').style.transform = `rotate(${Math.atan2(-(c1.y - c0.y), c1.x - c0.x) * 180 / Math.PI + 90}deg)`;
      if (D.ta > 2.8) startLift(D);          // 看清了：不用点，接着就进活页
      return;
    }
    if (D.phase === 'lift') liftStep(D, dt);
  }

  // ---- 地形切出来，落到书上：这块地形一直在画面里，四周从天空换成书桌（雾里换），地球缩到角上；落好就是书里的第一帧，书里接着翻到那一页、地形变成活页的模型 ----
  function startLift(D) {
    const def = D.def, blk = terrainBlock(def, def.crop), Fc = frameAt(def.lat, def.lon);
    blk.wallM.fog = false; blk.cut.material.fog = false; blk.wallM.opacity = 0;
    const basis = new THREE.Matrix4().makeBasis(Fc.east, Fc.up, Fc.north.clone().negate());          // 局部（东、上、南）→ 地球自己的坐标（半径 1）
    const m = new THREE.Matrix4().compose(Fc.up.clone(), new THREE.Quaternion().setFromRotationMatrix(basis), new THREE.Vector3().setScalar(1 / 6371));
    earth.root.updateMatrixWorld(true); m.premultiply(earth.spin.matrixWorld);
    root.add(blk.group); m.decompose(blk.group.position, blk.group.quaternion, blk.group.scale);          // 起点：和贴在地球上的那块地形重合
    const s = 2 / RING.h, bo = D.bo, W = bo.W * s, T = bo.T * s, end = blockPose(blk, W, T);
    root.attach(bo.mesh); bo.mesh.position.set(W / 2, T / 2, 0); bo.mesh.quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)); bo.mesh.scale.setScalar(s); bo.mesh.visible = false;
    for (const mt of bo.mesh.material) { mt.opacity = 1; mt.depthWrite = true; }
    const el = THREE.MathUtils.degToRad(64);
    Object.assign(D, { phase: 'lift', tl: 0, blk, P0: blk.group.position.clone(), Q0: blk.group.quaternion.clone(), S0: blk.group.scale.x, end, R0: earth.root.scale.x, Cg: earth.root.position.clone(),
      C0: { t: stage.rig.cur.target.clone(), d: stage.rig.cur.dir.clone(), r: stage.rig.cur.dist, up: stage.camera.up.clone() },
      C1: { t: new THREE.Vector3(W / 2, 0, 0.06), d: new THREE.Vector3(0, Math.sin(el), Math.cos(el)), r: atBookFov(stage, () => stage.fitDistance(W * 1.25, 2 * 1.2, 1.04)) }, fog0: [stage.scene.fog.near, stage.scene.fog.far], fov0: stage.camera.fov });
    diveTag.show(false); D.cutTag?.show(false); diveHud.classList.remove('on'); D.P.cut.visible = false;
  }
  function liftStep(D, dt) {
    D.tl += dt;
    const u = Math.min(1, D.tl / 2.8), k = ease(u), b = D.blk, E = D.end;
    // 这块地形：从地球上切出来（四周淡掉、侧壁出来），一边转一边缩，落到书的上方
    D.P.mesh.material.uniforms.k.value = 1 - THREE.MathUtils.smoothstep(u, 0, 0.09); b.wallM.opacity = THREE.MathUtils.smoothstep(u, 0.02, 0.16);
    b.group.position.lerpVectors(D.P0, E.pos, k);
    b.group.quaternion.slerpQuaternions(D.Q0, E.q, k); b.group.scale.setScalar(Math.exp(Math.log(D.S0) + (Math.log(E.s) - Math.log(D.S0)) * k));
    // 镜头：跟着它，从山的东边斜看，变成在书桌上方看书
    const C0 = D.C0, C1 = D.C1, dist = Math.exp(Math.log(C0.r) + (Math.log(C1.r) - Math.log(C0.r)) * k), dir = C0.d.clone().lerp(C1.d, k).normalize();
    const bc = b.center.clone().setY(0.1).applyMatrix4(b.group.matrixWorld), tgt = C0.t.clone().lerp(bc, THREE.MathUtils.smoothstep(u, 0, 0.25)).lerp(C1.t, THREE.MathUtils.smoothstep(u, 0.6, 1));          // 镜头一直看着这块地形（它不会跑出画面），最后才换成看书
    stage.rig.target.copy(tgt); stage.rig.dir.copy(dir); stage.rig.dist = dist; stage.rig.cur.target.copy(tgt); stage.rig.cur.dir.copy(dir); stage.rig.cur.dist = dist;
    setFov(stage, D.fov0 + (BOOK_FOV - D.fov0) * k);
    const cam = stage.camera; cam.up.copy(C0.up).lerp(new THREE.Vector3(0, 1, 0), k).normalize(); cam.position.copy(tgt).addScaledVector(dir, dist); cam.lookAt(tgt);
    // 四周：起一层雾（这块地形不受雾的影响，一直清楚），雾最浓时把大地球换成角上那颗、铺好书桌，雾再散开
    const fog = stage.scene.fog, w = THREE.MathUtils.smoothstep(u, 0.05, 0.38), fz = THREE.MathUtils.smoothstep(u, 0.42, 1);
    fog.color.set(0xc9d6e3).lerp(DAY.bg, fz);
    if (u < 0.4) { fog.near = D.fog0[0] + (0.02 - D.fog0[0]) * w; fog.far = D.fog0[1] + (0.3 - D.fog0[1]) * w; }
    else { fog.near = 0.02 + (7 - 0.02) * ease(fz); fog.far = 0.3 + (18 - 0.3) * ease(fz); }
    if (u >= 0.4 && !D.swapped) {
      D.swapped = true; D.P.mesh.visible = false; earth.setLook({ pins: true }); earth.cloudWant = 1; earth.setActive({ it: D.it, pn: D.pn }); stage.desk.visible = true; D.bo.mesh.visible = true;
    }
    if (D.swapped) { placeScr(earth.root, cornerScr()); earth.turnTo(D.pn.lat, D.pn.lon, stage.camera); earth.haloM.uniforms.k.value = 0.25; }
    else { earth.root.scale.setScalar(D.R0 * (1 - 0.6 * THREE.MathUtils.smoothstep(u, 0.1, 0.38))); earth.root.position.copy(D.Cg); }          // 贴在地球上的那块先淡掉，地球再退          // 大地球往下退（球心不动、变小）：地形块像是从地面上升起来，不会钻到球面下面
    const f = THREE.MathUtils.smoothstep(u, 0.5, 0.95);
    stage.desk.material.opacity = f;
    if (f > 0.999) { stage.scene.background = DAY.bg; skyDome.visible = false; } else skyDome.position.copy(cam.position);
    if (u >= 1 && !D.sent) {          // 落好了：这一帧和书里的第一帧一样（合上的书、上面浮着这块地形、角上的地球）
      D.sent = true;
      try { sessionStorage.setItem('livebook.snap', stage.snapshot()); } catch { /* 存不下就直接换 */ }
      const it = D.it, pn = D.pn;
      if (!window.__geoStay) location.href = `?book=${it.book.id}#live=${it.id}&place=${encodeURIComponent(pn.place)}&via=block`;
    }
  }

  // ---- 指针 ----
  const canvas = $('#c'), ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), ac = new AbortController(), on = { signal: ac.signal };
  const setRay = (e) => { ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, stage.camera); };
  const hitBook = () => { const hit = ray.intersectObjects(bookObjs.map((x) => x.mesh), false)[0]; return hit ? bookObjs.find((x) => x.mesh === hit.object) : null; };
  let drag = null, bookHot = null, sunDragged = false;
  canvas.addEventListener('pointerdown', (e) => {
    if (leaving || arriving || diving) return; setRay(e); canvas.setPointerCapture(e.pointerId);
    if (sunSpr.visible && ray.intersectObject(sunPick, false).length) { drag = { sun: true, x: e.clientX, y: e.clientY, moved: false }; sunDragged = true; touched = true; canvas.style.cursor = 'grabbing'; return; }          // 拖铜版上的太阳
    const pin = earth.hitPin(ray), onEarth = earth.hitGlobe(ray), bo = !pin && !onEarth ? hitBook() : null;
    drag = { x: e.clientX, y: e.clientY, moved: false, pin, bo, earth: !!(pin || onEarth), q0: earth.spin.quaternion.clone(), r0: ringTo };
    if (drag.earth) earth.target = null;
    touched = true;
  }, on);
  canvas.addEventListener('pointermove', (e) => {
    setRay(e);
    if (drag?.sun) {          // 太阳拖到铜版上的哪一点：离圆心多远 → 直射点纬度（季节），方位 → 直射点经度（时刻）
      const pt = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.09), new THREE.Vector3()); if (!pt) return;
      const spinA = 2 * Math.atan2(earth.spin.quaternion.y, earth.spin.quaternion.w), lat = 90 - (Math.hypot(pt.x, pt.z) / RING.r) * 90, lon = -(Math.atan2(pt.z, pt.x) + spinA) * 180 / Math.PI;
      time.setFromSun(lat, ((lon + 540) % 360) - 180);
      return;
    }
    if (drag) {
      const dx = e.clientX - drag.x; if (Math.abs(dx) + Math.abs(e.clientY - drag.y) > 4) drag.moved = true;
      if (drag.earth) earth.spin.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dx * 0.006).multiply(drag.q0));
      else { ringTo = drag.r0 + dx * 0.005; }          // 拖空白处或书：书圈跟着转
      return;
    }
    if (leaving || arriving || diving) return;
    const pin = earth.hitPin(ray);
    if (pin && (hovered?.it !== pin.it || hovered?.pn !== pin.pn)) hover(pin);
    else if (!pin && hovered?.pn) hover(null);
    const bo = pin ? null : hitBook(); bookHot = bo;
    const onSun = !pin && sunSpr.visible && ray.intersectObject(sunPick, false).length > 0;
    sunSpr.scale.setScalar(onSun ? 0.52 : 0.42);
    canvas.style.cursor = onSun ? 'grab' : pin || bo ? 'pointer' : earth.hitGlobe(ray) ? 'grab' : '';
  }, on);
  const up = () => {
    const d = drag; drag = null; if (!d) return;
    if (d.sun) { canvas.style.cursor = ''; return; }
    if (!d.moved && d.pin) go(d.pin.it, d.pin.pn);
    else if (!d.moved && d.bo) openBook(d.bo);
  };
  canvas.addEventListener('pointerup', up, on); canvas.addEventListener('pointercancel', up, on);
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); stage.zoomBy(Math.exp(e.deltaY * (e.ctrlKey ? 0.012 : 0.0016))); }, { passive: false, signal: ac.signal });
  $('#btn-shelf').onclick = () => { try { sessionStorage.setItem('livebook.snap', stage.snapshot()); } catch { /* 存不下就直接换 */ } location.href = location.pathname; };
  stage.onResize = () => shot();

  // ---- 光线：指着的旗连到它所在的那本书（指着一本书时，连到这本书在地球正面的所有旗） ----
  const threads = [];
  const thread = () => { const l = new Line2(new LineGeometry(), new LineMaterial({ color: 0xffffff, linewidth: 1.8, worldUnits: false, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })); l.raycast = () => {}; l.frustumCulled = false; root.add(l); return l; };
  let threadKey = '', threadK = 0;
  const P0 = new THREE.Vector3(), P1 = new THREE.Vector3(), C = new THREE.Vector3(), Q = new THREE.Vector3();
  function drawThreads(dt) {
    const bo = hovered?.pn ? bookObjs.find((x) => x.b.id === hovered.it.book.id) : bookHot;
    const pins = !bo ? [] : hovered?.pn ? earth.pins.filter((p) => p.pn === hovered.pn) : earth.pins.filter((p) => p.it.book.id === bo.b.id && earth.facing(p.n, stage.camera) > 0.25);
    const key = bo ? bo.b.id + pins.map((p) => p.pn.name).join() : '';
    if (key !== threadKey) { threadKey = key; threadK = 0; }
    threadK = Math.min(1, threadK + dt / 0.45);
    const k = ease(threadK);
    while (threads.length < pins.length) threads.push(thread());
    threads.forEach((l, i) => {
      const p = pins[i]; l.visible = !!p; if (!p) return;
      earth.pinWorld(p.pn, P0); bo.lean.localToWorld(P1.set(0, RING.h + 0.02, 0));
      C.copy(P0).add(P1).multiplyScalar(0.5); Q.set(C.x, 0, C.z).normalize(); C.addScaledVector(Q, 0.45).add(new THREE.Vector3(0, 0.25, 0));
      const pts = [], n = 28, m = Math.max(1, Math.round(n * k));
      for (let j = 0; j <= m; j++) { const t = j / n, u = 1 - t; pts.push(u * u * P0.x + 2 * u * t * C.x + t * t * P1.x, u * u * P0.y + 2 * u * t * C.y + t * t * P1.y, u * u * P0.z + 2 * u * t * C.z + t * t * P1.z); }
      l.geometry.dispose(); l.geometry = new LineGeometry(); l.geometry.setPositions(pts);
      l.material.color.set(p.it.color); l.material.opacity = 0.95;
    });
  }

  // ---- 每帧 ----
  stage.updaters.add((dt) => {
    ringRot += (ringTo - ringRot) * Math.min(1, dt * 4.5);
    ring.rotation.y = ringRot;
    for (const bo of bookObjs) { const w = Math.atan2(Math.sin(bo.a + ringRot), Math.cos(bo.a + ringRot)), f = THREE.MathUtils.smoothstep(Math.abs(w), 1.6, 2.3); bo.g.rotation.y = bo.a + (w * (0.55 + 0.45 * f) - w); }          // 封面朝外，前半圈再往镜头这边偏一半（两边的书也看得见封面）；后半圈照样朝外，露出书背
    drawThreads(dt);
    let best = null, bd = 9; for (const bo of bookObjs) { const w = Math.abs(Math.atan2(Math.sin(bo.a + ringTo), Math.cos(bo.a + ringTo))); if (w < bd) { bd = w; best = bo; } } setFront(best?.b.id);
    earth.hotBook = bookHot && !hovered ? bookHot.b.id : null;
    // 指着的旗属于哪本书：那本书亮起来、往外挪一点
    const hotBook = hovered?.it.book.id || leaving?.bo.b.id || bookHot?.b.id || null;
    for (const bo of bookObjs) {
      bo.hot += ((bo.b.id === hotBook ? 1 : 0) - bo.hot) * Math.min(1, dt * 6);
      bo.lean.position.z = bo.hot * 0.22; bo.lean.position.y = bo.hot * 0.06;
      bo.lamp.material.opacity = (0.35 + bo.hot * 0.65) * (1 - worldFade);
      const w = new THREE.Vector3(0, -0.12, 0.3); bo.g.localToWorld(w); bo.label.at(w).show(worldFade < 0.3 && bo.mesh.parent === bo.lean);
      bo.label.el.classList.toggle('hot', bo.hot > 0.5);
    }
    if (!leaving && !arriving && !diving) earth.root.position.y = EARTH.y + Math.sin(performance.now() / 2400) * 0.012;          // 一开始离开就不再浮动（从山上回来那一下，地球还是放大了几百倍的那颗，不能挪）          // 很轻地浮着
    if (!drag && !hovered && !earth.target && !earth.active && !leaving && !diving) earth.spin.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dt * 0.03));
    earth.update(dt, { camera: stage.camera, bookTop: 0, shadowK: 0 });
    skyStep(dt);
    time.update(dt); time.show(!leaving && !arriving && !diving);
    if (home.userData.n) {
      const face = earth.facing(home.userData.n, stage.camera), k = Math.max(0, Math.min(1, (face - 0.15) / 0.15)) * (1 - worldFade);
      homeM.opacity = 0.95 * k; homeRing.scale.setScalar(1 + 0.18 * Math.sin(performance.now() / 420));          // 轻轻一呼一吸，好找
      homeTag.at(home.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3().setFromMatrixColumn(stage.camera.matrixWorld, 0).multiplyScalar(0.02))).show(k > 0.5 && !leaving && !arriving);
    }
    stars.rotation.y += dt * 0.002;
    const spinA = 2 * Math.atan2(earth.spin.quaternion.y, earth.spin.quaternion.w);
    map.material.uniforms.spin.value = spinA;          // 台面上的投影图跟着地球转
    map.material.uniforms.sunL.value.copy(earth.sunLocal);
    if (earth.sub) {          // 铜版上的太阳、刻度环、地球上的直射点
      const ph = plateAz(earth.sub.lon, spinA), rs = ((90 - earth.sub.lat) / 90) * RING.r;
      sunSpr.position.set(Math.cos(ph) * rs, 0.09, Math.sin(ph) * rs); sunCore.position.copy(sunSpr.position); sunPick.position.copy(sunSpr.position);
      hours.rotation.y = -ph;
      sunOnGlobe.position.copy(earth.sunLocal).multiplyScalar(1.01);
      const vis = worldFade < 0.5 && !leaving && !diving;
      sunSpr.visible = sunCore.visible = vis; hours.visible = worldFade < 0.99;
      const sp = sunSpr.position.clone().add(new THREE.Vector3(0, -0.02, 0.32)), sx = sp.clone().project(stage.camera);
      const clash = bookObjs.some((bo) => { const q = bo.label.pos.clone().project(stage.camera); return Math.abs(q.x - sx.x) * innerWidth < 130 && Math.abs(q.y - sx.y) * innerHeight < 70; });          // 压在书名上就不写
      sunTag.at(sp).show(vis && !sunDragged && !hovered && !clash);          // 写在太阳靠镜头这一侧
      const camAz = Math.atan2(stage.camera.position.z, stage.camera.position.x) - 0.62;          // 刻线的名字写在前方偏右，不压住正前方那本书
      for (const c of circleTags) { const rr = (c.colat / 90) * RING.r; c.t.at(new THREE.Vector3(Math.cos(camAz) * rr, 0.02, Math.sin(camAz) * rr)).show(vis); }
    }
    // 明信片跟着旗
    if (cardFor?.pn) { const cam = stage.camera, right = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0), w = earth.pinWorld(cardFor.pn), toRight = (cardFor.pn.side ?? 1) < 0, edge = earth.root.position.clone().addScaledVector(right, EARTH.r * (toRight ? 1 : -1)); const sx = (edge.clone().project(cam).x + 1) / 2 * innerWidth + (toRight ? 1 : -1) * ((card.el.offsetWidth || 214) / 2 + 22), sy = ((1 - w.clone().project(cam).y) / 2) * innerHeight; card.at(new THREE.Vector3((sx / innerWidth) * 2 - 1, 1 - (sy / innerHeight) * 2, 0.5).unproject(cam)); }


    if (leaving) { leaving.t += dt; land(dt); }
    if (diving) diveStep(dt);
    if (arriving) arriveStep(dt);
    updateTags(stage.camera);
  });
  let backFrom = null;
  try { backFrom = sessionStorage.getItem('livebook.worldFrom'); sessionStorage.removeItem('livebook.worldFrom'); } catch { /* 隐私模式 */ }
  const backBo = bookObjs.find((x) => x.b.id === backFrom);
  if (backBo) arrive(backBo);
  else {          // 地球的贴图（白天、夜里的灯光）好了再揭开盖着的截图：从首页飞过来的那个泡沫球正好叠在地球上，揭开就是它变成了真的地球
    const t0 = performance.now(); let n = 0;
    const ready = () => earth.mat.map?.image && (!earth.nowU.nightMap || earth.nowU.nightMap.value.image);
    const wait = () => { if ((ready() && ++n > 2) || performance.now() - t0 > 2500) window.__dropSnap?.(); else requestAnimationFrame(wait); };
    wait();
  }
  stage.start();
  document.querySelector('#loader')?.classList.add('done');
  window.__geo = { stage, earth, time, items, books, bookObjs, go, openBook, get busy() { return !!(leaving || arriving || diving); }, get diving() { return diving; } };
}

/** 夜空：一张经纬网的天空图（离得远，糊一点没关系）：上深下浅的蓝，一道斜着的银河（噪声做的淡淡的光带，中间一条暗缝） */
function skyTex() {
  const W = 1024, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#03060f'); gr.addColorStop(0.42, '#08102a'); gr.addColorStop(0.5, '#142247'); gr.addColorStop(0.56, '#0d1834'); gr.addColorStop(1, '#050913');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const img = g.getImageData(0, 0, W, H), d = img.data;
  const rnd = (i, j) => { const x = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return x - Math.floor(x); };
  const noise = (x, y) => { const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), P = 32, ii = ((i % P) + P) % P, i1 = (ii + 1) % P; const a = rnd(ii, j), b = rnd(i1, j), cc = rnd(ii, j + 1), dd = rnd(i1, j + 1); return a + (b - a) * u + (cc - a) * v + (a - b - cc + dd) * u * v; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const lon = (x / W) * Math.PI * 2, lat = (0.5 - y / H) * Math.PI;
    const band = Math.sin(1.0) * Math.cos(lat) * Math.cos(lon - 0.25) + Math.cos(1.0) * Math.sin(lat);          // 到一个倾斜 57° 的大圆的“距离”（正弦）：这个大圆斜着从地球背后穿过
    let n = 0, a = 0.5, f = 1; for (let o = 0; o < 5; o++) { n += a * noise((x / W) * 32 * f, (y / H) * 16 * f); a *= 0.5; f *= 2; }
    const glow = Math.exp(-((band / 0.2) ** 2)) * (0.55 + n * 0.9) * (1 - 0.7 * Math.exp(-((band / 0.03) ** 2)) * n);
    const k = (y * W + x) * 4, t = Math.max(0, glow) * 64;
    d[k] = Math.min(255, d[k] + t * 0.85); d[k + 1] = Math.min(255, d[k + 1] + t * 0.88); d[k + 2] = Math.min(255, d[k + 2] + t * 1.15);
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.mapping = THREE.EquirectangularReflectionMapping; return t;
}
/** 星星：远处一圈点，有大有小、有冷有暖；银河那一带密一些 */
function starField() {
  const g = new THREE.Group(), axis = new THREE.Vector3(-Math.sin(0.25), 0, -Math.cos(0.25));          // 和天空图里那道银河同一个大圆
  for (const [N, size, bright] of [[3200, 1.3, 0.75], [420, 2.2, 1], [60, 3.2, 1]]) {
    const P = new Float32Array(N * 3), C = new Float32Array(N * 3), col = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const milky = Math.random() < 0.4, u = Math.random() * Math.PI * 2, v = milky ? (Math.random() - 0.5) * 0.3 : Math.asin(Math.random() * 2 - 1);
      const q = new THREE.Vector3(Math.cos(v) * Math.cos(u), Math.sin(v), Math.cos(v) * Math.sin(u));
      if (milky) q.applyAxisAngle(axis, 1.0);
      q.multiplyScalar(40);
      P.set([q.x, q.y, q.z], i * 3);
      col.setHSL(Math.random() < 0.2 ? 0.08 : 0.6, 0.35, 0.8).multiplyScalar(bright * (0.45 + Math.random() * 0.55)); C.set([col.r, col.g, col.b], i * 3);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('color', new THREE.BufferAttribute(C, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false, map: starDot() }));
    pts.raycast = () => {}; g.add(pts);
  }
  return g;
}
let _dot; function starDot() { return (_dot ||= radial('rgba(255,255,255,1)', 'rgba(255,255,255,0)', 0.9)); }
/** 圆台上的北极投影图（方位等距：圆心是北极，离圆心越远纬度越低；书圈正好立在赤道上）。
 *  像一块刻出来的铜版：海是深蓝，陆地是暗暗的铜色，海岸线描金；每 30° 一圈纬线、一条经线。spin 是地球绕地轴转了多少，图跟着转 */
function polarMap(tex, ringR) {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { tex: { value: tex }, lights: { value: null }, spin: { value: 0 }, R: { value: ringR }, fade: { value: 1 }, sunL: { value: new THREE.Vector3(1, 0, 0) } },
    vertexShader: 'varying vec2 vXZ; void main(){ vXZ = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tex; uniform sampler2D lights; uniform float spin; uniform float R; uniform float fade; uniform vec3 sunL; varying vec2 vXZ;
      float seaAt(vec2 uv){ vec3 c = texture2D(tex, uv).rgb; return step(c.r * 1.25, c.b) * step(c.g * 1.02, c.b); }
      float ring(float colat, float at, float w){ return 1.0 - smoothstep(0.0, w, abs(colat - at) / fwidth(colat)); }
      void main(){
        vec2 w = vec2(vXZ.x, -vXZ.y);
        float r = length(w), colat = 90.0 * r / R;
        if (colat > 122.0) discard;
        float az = atan(w.y, w.x) + spin, la = radians(90.0 - colat);
        vec3 d = vec3(cos(la) * cos(az), sin(la), cos(la) * sin(az));
        float lon = atan(-d.z, d.x), lat = asin(d.y);
        vec2 uv = vec2(lon / 6.2831853 + 0.5, lat / 3.14159265 + 0.5);
        vec3 c = texture2D(tex, uv).rgb;
        float sea = seaAt(uv), e = 1.6 / 2048.0;
        float coast = abs(seaAt(uv + vec2(e, 0.0)) - sea) + abs(seaAt(uv - vec2(e, 0.0)) - sea) + abs(seaAt(uv + vec2(0.0, e * 2.0)) - sea) + abs(seaAt(uv - vec2(0.0, e * 2.0)) - sea);
        float lum = dot(c, vec3(0.3, 0.55, 0.15));
        vec3 col = mix(mix(vec3(0.15, 0.14, 0.14), vec3(0.27, 0.23, 0.17), lum), vec3(0.045, 0.065, 0.12), sea);          // 暗铜色的底：比地球暗得多，衬着它，不和它抢
        // 昼夜：和地球同一个太阳。夜里那一半沉下去，晨昏线上一道暖光（以北极为中心的方位等距展开图上的昼夜分布，对照课本以北极为中心的昼夜图；它是展开图，不是从北极上方看到的球）
        float s = dot(d, normalize(sunL)), night = smoothstep(0.035, -0.035, s);
        col = mix(col * vec3(1.3, 1.18, 1.02) + vec3(0.02, 0.015, 0.0), col * vec3(0.34, 0.4, 0.56), night);
        col += texture2D(lights, uv).rgb * vec3(1.0, 0.78, 0.45) * 0.7 * night;          // 夜里那一半亮着城市灯光（和地球上同一张）
        col += vec3(0.95, 0.78, 0.48) * min(1.0, coast) * mix(0.62, 0.36, night);          // 海岸线像刻上去的金线
        col += vec3(1.0, 0.7, 0.36) * exp(-pow(s / 0.035, 2.0)) * 0.26;          // 晨昏线
        // 刻线：北极圈、北回归线、赤道、南回归线；淡淡的经线每 30°
        float lonDeg = degrees(lon) + 180.0, gm = 1.0 - smoothstep(0.0, 0.7, abs(mod(lonDeg + 15.0, 30.0) - 15.0) / fwidth(lonDeg));
        float named = max(max(ring(colat, 23.44, 0.9), ring(colat, 66.56, 0.9)), ring(colat, 113.44, 0.9)), eq = ring(colat, 90.0, 1.4);
        col += vec3(0.88, 0.70, 0.42) * (gm * step(8.0, colat) * 0.12 + named * 0.5 + eq * 0.7);
        float a = (1.0 - smoothstep(104.0, 122.0, colat)) * 0.74 + max(named, eq) * 0.2;
        gl_FragColor = vec4(col, a * fade);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(ringR * 122 / 90, 180), m); mesh.rotation.x = -Math.PI / 2; mesh.raycast = () => {};
  return mesh;
}
/** 24 小时的刻度环（铜版上，书圈里面一圈）：12 对着太阳直射的那条经线（正午）、0 在背面（子夜）——每条经线现在是几点（地方时），一眼读出来 */
function hourRing(r0, r1) {
  const N = 2048, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'), C = N / 2, k = C / r1, ri = r0 * k, ro = r1 * k;
  g.translate(C, C);
  g.strokeStyle = 'rgba(224,186,118,0.55)'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, ri + 2, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(0, 0, ro - 3, 0, Math.PI * 2); g.stroke();
  for (let m = 0; m < 96; m++) {          // 一刻钟一道
    const a = -(m / 96) * Math.PI * 2, big = m % 4 === 0, len = big ? (ro - ri) * 0.42 : (ro - ri) * 0.18;
    g.strokeStyle = big ? 'rgba(241,215,159,0.9)' : 'rgba(224,186,118,0.45)'; g.lineWidth = big ? 3 : 1.6;
    g.beginPath(); g.moveTo(Math.cos(a) * (ro - 4), Math.sin(a) * (ro - 4)); g.lineTo(Math.cos(a) * (ro - 4 - len), Math.sin(a) * (ro - 4 - len)); g.stroke();
  }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let hh = 0; hh < 24; hh++) {          // 往东一小时（逆着从北极上方看的顺时针）晚一小时：hh 点在太阳方向往东 (hh−12)×15°
    const a = -((hh - 12) / 24) * Math.PI * 2, rr = (ri + ro) / 2 - (ro - ri) * 0.12;
    g.save(); g.rotate(a); g.translate(rr, 0); g.rotate(Math.PI / 2);
    const key = hh % 6 === 0;
    g.fillStyle = key ? 'rgba(255,230,178,1)' : 'rgba(232,198,136,0.92)'; g.font = `${key ? 700 : 500} ${key ? 48 : 36}px "Songti SC", serif`;
    g.fillText(String(hh), 0, 0);
    if (hh === 12 || hh === 0) { g.font = '600 30px "Songti SC", serif'; g.fillStyle = 'rgba(255,230,178,0.95)'; g.fillText(hh === 12 ? '正午' : '子夜', 0, 44); }
    g.restore();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const mesh = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 192, 1), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, fog: false }));
  mesh.rotation.x = -Math.PI / 2; mesh.raycast = () => {};
  const g2 = new THREE.Group(); g2.add(mesh); return g2;
}
/** 书背面：书的颜色，竖写书名（从后面看过去也认得出是哪一本） */
function backTex(b, color) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 360; const g = c.getContext('2d');
  g.fillStyle = color; g.fillRect(0, 0, 256, 360);
  const gr = g.createLinearGradient(0, 0, 256, 0); gr.addColorStop(0, 'rgba(0,0,0,0.25)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.06)'); gr.addColorStop(1, 'rgba(0,0,0,0.2)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 360);
  g.fillStyle = 'rgba(255,255,255,0.9)'; g.font = '600 30px "Songti SC", serif'; g.textAlign = 'center';
  g.fillText('地理', 128, 150); g.font = '22px "Songti SC", serif'; g.fillText(SHORT(b.full), 128, 190);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function radial(c0, c1, stop = 1) { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, c0); if (stop < 1) gr.addColorStop(stop, c0.replace(/[\d.]+\)$/, (m) => `${parseFloat(m) * 0.6})`)); gr.addColorStop(1, c1); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
function grayRadial(stops) { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); for (const [o, v] of stops) gr.addColorStop(o, `rgb(${v},${v},${v})`); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); }
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }
