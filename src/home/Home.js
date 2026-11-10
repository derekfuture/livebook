// 首页：一张书桌。每一科在书桌靠里那一头：一摞这一科的课本，旁边放着这一科的一件东西，前面立着一张桌签——
//   物理：一块三棱镜，一束白光从后面照进去，另一边在桌上散开成一道彩虹（按折射定律算的：红光偏折最少、紫光最多）；
//   化学：一只锥形瓶，瓶里是蓝色的硫酸铜溶液；
//   地理：一个复古的桌面地球仪（黄铜子午圈、胡桃木底座），球面就是地理世界那颗地球：按此刻真实的太阳分出昼夜，夜里亮着城市灯光。
//   桌签上写着科目、几册、几张活页。
// 各科一前一后错开着往两边排（物理在前、化学在后、地理在前……；超过 6 科排成前后两排），科目多了镜头往后退一点就都装得下——不像书架那样一层一层往上摞、书越来越小。
// 指着一科：那一摞书像扑克牌一样错开一点，那件东西动一下（三棱镜转一点、彩虹跟着摆；瓶子晃一晃，像振荡；地球仪转起来）。
// 点一科：物理、化学——这一摞在桌上摊开成一排（下面一张小纸条：翻到哪、活页做了几张）；点一本，它落到书桌中间，和书里一开始的样子一模一样，
//   别的书收回那一摞，就在这个舞台上换成书里那本书。地理——屋里的窗光暗下去、变成夜空，星星出来，地球仪的球离开铜圈飞起来、越来越大，
//   正好飞到地理世界里地球的位置、大小和朝向，换页面时两个叠在一起；从地理世界回来倒着放：地球落回铜圈，屋里的光再亮起来。
// 从书里回来：书先合上，换页面时拿书里最后一帧盖着，这边画好了再揭开，书从书桌中间回到摊开的那一排里。
// 光：傍晚的太阳从左后方的窗户斜照进来，窗格的影子落在桌上，几件东西拖着长长的影子，光里飘着一点浮尘；屋里别处暗下去。
//   物理那束白光就是这窗光。进书时光慢慢回到书里白天的样子（两边交接的那一帧是同一个画面）；从书里回来再慢慢暗下来。
// 屏幕上还有：继续上次 / 接着学（两张便签）、搜一节课或一张活页、活页总览。
import { feedbackButton, githubButton } from '../ui/community.js';
import * as THREE from 'three';
import { getBook, bookList, bookHref, getManifest, fileUrl, OFFLINE } from '../content/index.js';
import { offlineButton } from './offlinePack.js';
import { FEATURES } from '../features.js';
import { stamps, h } from '../ui/Panel.js';
import { tag, updateTags } from '../ui/tags.js';
import { progress, bookmark } from './progress.js';
import { paint, inked, hull, glassEdge } from '../live/ink.js';
import { glass2, water2 } from '../lessons/kit/chemfx.js';
import { earthCircle, preloadWorld, WORLD_SETTLE } from '../world/GeoWorld.js';
import { earthMaps } from '../live/WorldEarth.js';
import { subsolar } from '../live/WorldEarth.js';
import { ll2v } from '../lessons/kit/plates.js';
import { ANCHORS } from '../lessons/kit/atlas.js';
import reliefUrl from '../lessons/data/earth_relief.jpg';
import nightUrl from '../lessons/data/earth_night.jpg';

const BOOK_H = 0.6;                // 桌上的书高；书里那本书高 2（Book.js），拿到书桌中间时放大过去
const LEAF_T = 0.0017;             // 书里每张纸的厚度（同 Book.js）：按页数有厚有薄
const GAPX = 0.86;                 // 一科和一科之间（左右）
const STAGGER = 0.6;               // 一前一后错开多少
const ROW_Z = -2.3;                // 各科放在书桌靠里那一头；书桌中间（z = 0）是翻开书的地方——镜头低头看书时，这几份都在画面外
const FAN_Z = -0.3;                // 摊开的那一排：离那几摞远一点，镜头低头看这一排时它们在画面外
const STACK = { x: -0.21, z: -0.02 }, THING = { x: 0.31, z: -0.04 }, CARD = { x: -0.2, z: 0.42 };     // 一科里：一摞书、那件东西、桌签（在书前面）放在哪（x, z）
const THING_S = 1.25;              // 那件东西放大一点（下面按真实大小做的），和书的大小相称
const BOOK_ELEV = THREE.MathUtils.degToRad(64);      // 书里合上的书：镜头俯角（同 main.js 的 bookShot）
const D2R = Math.PI / 180, Y = new THREE.Vector3(0, 1, 0);
const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const hash = (a, b) => { const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return x - Math.floor(x); };

/** enterBook(id, handoff)：在同一个舞台上打开那本书（main.js 的 bootBook）；enterWorld(focus)：在同一个舞台上打开地理世界；没有就换页面 */
export async function bootHome(stage, { enterBook = null, enterWorld = null } = {}) {
  // 旧链接 /#live=convex：找到那张活页所在的书，直接打开
  const q = new URLSearchParams(location.hash.slice(1));
  if (q.has('live')) {
    const b = bookList().find((x) => getBook(x.id).lessons[q.get('live')]);
    if (b) { location.replace(`${bookHref(b.id)}${location.hash}`); return; }
  }
  document.body.classList.add('home');
  document.title = '活页课本';
  const books = bookList().filter((b) => Object.keys(getBook(b.id).lessons).length);     // 还没有做好活页的书先不上桌
  const manifests = Object.fromEntries(await Promise.all(books.map(async (b) => [b.id, await getManifest(b.id)])));
  // 有没有书页图片（只在开发时用；线上只放封面，缓存里留着的旧图也不用）：没有的话，活页总览里的缩略图只写图号
  const pagesOk = Object.fromEntries(await Promise.all(books.map(async (b) => { if (OFFLINE || !import.meta.env.DEV) return [b.id, false]; try { const r = await fetch(`${getBook(b.id).base}lo/001.jpg`, { method: 'HEAD' }); return [b.id, r.ok && (r.headers.get('content-type') || '').startsWith('image/')]; } catch (e) { return [b.id, false]; } })));
  const loader = new THREE.TextureLoader();

  // ---- 科目（顺序照 books.json）：一科一份 ----
  const subjects = [];
  for (const b of books) {
    let s = subjects.find((x) => x.name === b.subject && x.publisher === b.publisher);          // 同一科不同版本分开放
    if (!s) subjects.push((s = { name: b.subject, publisher: b.publisher, color: b.color, books: [] }));
    s.books.push(b);
  }
  // 摆放：一前一后错开着往两边排，两头朝中间转一点；超过 6 科就分成前后两排（每排还是一前一后）
  const N = subjects.length, two = N > 6, front = two ? Math.ceil(N / 2) : N;
  const tall = innerWidth / innerHeight < 0.75 && N <= 4;          // 手机竖着拿：几科从近到远排成一列（左右稍微错开），镜头抬高往下看，每一科都大、好点
  subjects.forEach((s, i) => {
    const r = i < front ? 0 : 1, n = r ? N - front : front, ii = r ? i - front : i, k = ii - (n - 1) / 2;
    s.x = k * GAPX; s.z = ROW_Z - r * 1.4 - (ii % 2) * STAGGER; s.yaw = -k * 0.08;
    if (tall) { s.x = ((i % 2) - 0.5) * 0.18; s.z = ROW_Z + 0.75 - i * 1.05; s.yaw = 0; }
    s.leaves = s.books.reduce((m, b) => m + Object.keys(getBook(b.id).lessons).length, 0);
    s.hot = 0;
  });

  const group = new THREE.Group();
  stage.scene.add(group);
  const mood = windowLight(stage, new THREE.Vector3(0, 0, ROW_Z - 0.35));
  let moodK = 1, moodT = 1, moodRate = 1;          // 1：窗光（首页）… 0：书里白天的光
  document.body.classList.add('mood');

  // ---- 每一科：一摞书（从下往上是高年级到低年级，最上面是第一册，封面朝上，微微错开）、一件东西、一张桌签 ----
  const items = [];
  for (const s of subjects) {
    const root = (s.root = new THREE.Group()); root.position.set(s.x, 0, s.z); root.rotation.y = s.yaw; group.add(root);
    s.card = tentCard(s); s.card.position.set(CARD.x, 0, CARD.z); s.card.rotation.y = (hash(s.x, 5) - 0.5) * 0.08; root.add(s.card);
    let y = 0;
    for (let j = s.books.length - 1; j >= 0; j--) {
      const b = s.books[j], man = manifests[b.id];
      const W = (BOOK_H * man.pageSize[0]) / man.pageSize[1], T = Math.max(0.018, ((Math.floor(man.pageCount / 2) + 1) * LEAF_T * BOOK_H) / 2);
      const g = new THREE.Group();
      // 桌上那几摞书用中等大小的封面（mid，720 高，一张几十 KB）；摊开一科、拿起一本时再换高清的（hiCover）。
      // 高清封面一张近 1 MB，十几本书一起下，首屏要 9 MB。离线版里封面本来就缩过，直接用；没有 mid 的（旧的本地书页）退回高清
      const base = getBook(b.id).base, hiUrl = fileUrl(`${base}hi/000.jpg`);
      const tex = (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
      const cover = tex(loader.load(OFFLINE ? hiUrl : fileUrl(`${base}mid/000.jpg`), () => { g.userData.coverReady = true; if (OFFLINE) g.userData.coverHi = g.userData.coverHiReady = true; },
        undefined, () => g.userData.hiCover()));
      g.userData.hiCover = () => {
        const u = g.userData; if (u.coverHi) return; u.coverHi = true;
        const t = tex(loader.load(hiUrl, () => { const old = face.map; face.map = t; if (old !== t) old?.dispose(); u.coverReady = u.coverHiReady = true; }));
      };
      const pages = new THREE.MeshLambertMaterial({ color: 0xf1ebde }), back = new THREE.MeshLambertMaterial({ color: b.side }), face = new THREE.MeshLambertMaterial({ map: cover });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(W, T, BOOK_H), [pages, pages, face, back, pages, pages]);   // 封面在 +y；书脊和书口都是纸色（和书里那本书一样）
      mesh.castShadow = mesh.receiveShadow = true; g.add(mesh); group.add(g);
      if (bookmark.get(b.id)) {          // 翻过的书：书口下沿露出一截红书签带
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.0012, 0.05), new THREE.MeshLambertMaterial({ color: 0xb8322c }));
        rib.position.set(W / 2 - 0.08, 0, BOOK_H / 2 + 0.012); rib.castShadow = true; g.add(rib);
      }
      const r1 = hash(j, s.x + 3);
      const stack = { x: STACK.x + (r1 - 0.5) * 0.028, y: y + T / 2, z: STACK.z + (hash(j + 7, s.x) - 0.5) * 0.024, yaw: (r1 - 0.5) * 0.11 };
      y += T;
      Object.assign(g.userData, { id: b.id, b, s, mesh, W, T, j, stack, mode: 'stack', k: 0, from: null, to: null, sv: 2 / BOOK_H, hv: 0 });
      items.push(g);
    }
    s.sp = Math.max(...items.filter((g) => g.userData.s === s).map((g) => g.userData.W)) + 0.14;          // 摊开时一本和一本之间
    s.thing = s.name === '物理' ? prismThing() : s.name === '化学' ? flaskThing() : s.name === '地理' ? deskGlobe() : null;          // 以后的科目（语文、生物……）各配一件
    if (s.thing) { s.thing.position.set(THING.x, 0, THING.z); s.thing.scale.setScalar(THING_S); root.add(s.thing); }
    const pick = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.42, 1.08), new THREE.MeshBasicMaterial({ visible: false })); pick.position.set(0.05, 0.21, 0.06); root.add(pick); s.pick = pick;
  }

  const geoS = subjects.find((s) => s.name === '地理');
  // ---- 每本书该在哪（书桌的坐标） ----
  const toW = (s, x, y, z, yaw) => ({ p: new THREE.Vector3(x, y, z).applyAxisAngle(Y, s.yaw).add(new THREE.Vector3(s.x, 0, s.z)), yaw: s.yaw + yaw });
  const stackPose = (g) => {
    const u = g.userData, s = u.s, n = s.books.length;
    const a = n > 1 ? s.hot * 0.3 * (u.j / (n - 1)) : 0;          // 指着这一科：绕左后角像扑克牌一样错开（最上面一本不动）
    const px = STACK.x - u.W / 2, pz = STACK.z - BOOK_H / 2;
    const c = new THREE.Vector3(u.stack.x - px, 0, u.stack.z - pz).applyAxisAngle(Y, a);
    return { ...toW(s, px + c.x, u.stack.y, pz + c.z, u.stack.yaw + a), sc: 1 };
  };
  const fanPose = (g) => {
    const u = g.userData, s = u.s, n = s.books.length, k = u.j - (n - 1) / 2;
    const cx = Math.min(s.x * 0.6, -0.06 - (n * s.sp - 0.14) / 2);          // 摊在书桌中间偏左：拿一本落到书桌中间（x > 0 那一半）时不会碰到别的书
    return { p: new THREE.Vector3(cx + k * s.sp, u.T / 2 + 0.001, FAN_Z + Math.abs(k) * 0.04), yaw: -k * 0.035, sc: 1 };
  };
  const deskPose = (g) => { const u = g.userData; return { p: new THREE.Vector3((u.W * u.sv) / 2, (u.T * u.sv) / 2, 0), yaw: 0, sc: u.sv }; };
  // 地球仪的球在屏幕上的圆（圆心 cx、cy，半径 r，像素）：沿镜头的射线往里 D 远，球放到正好那么大——去地理世界的终点、从那边回来的起点
  const ballAt = (C, B, D = 2.4) => {
    const cam = stage.camera; ndc.set((C.cx / innerWidth) * 2 - 1, -(C.cy / innerHeight) * 2 + 1); ray.setFromCamera(ndc, cam);
    const Rw = D * Math.sin(Math.atan((C.r / (innerHeight / 2)) * Math.tan((cam.fov * D2R) / 2)));
    return { p: ray.ray.origin.clone().addScaledVector(ray.ray.direction, D), sc: Rw / B.R };
  };
  // 地理世界一打开时地球哪一面朝着镜头：那本书第一面插在具体地方的旗的经度（同 GeoWorld 的算法）；没有就用别的地理书的，再没有就 105°E
  const worldLon0 = (focus) => {
    const firstPlace = (bid) => { for (const sp of getBook(bid).spots) { const a = ANCHORS[sp.lesson]; if (a?.kind === 'place') return a.pins[0].lon; } return null; };
    return firstPlace(focus) ?? books.filter((b) => b.subject === '地理').map((b) => firstPlace(b.id)).find((x) => x != null) ?? 105;
  };
  const fanCenter = (s) => { const n = s.books.length; return new THREE.Vector3(Math.min(s.x * 0.6, -0.06 - (n * s.sp - 0.14) / 2), 0, FAN_Z - 0.05); };          // 摊开的那一排正中（窗光挪过去照它）
  // 在两个位置之间：摊开时先平着往外抽（错开了再落到桌上，几本书不会互相穿过去），收回时先抬到各自的高度再收拢
  const lerpPose = (A, B, k, kind) => {
    const e = ease(k), yk = kind === 'tofan' ? smooth(0.62, 1, k) : kind === 'tostack' ? smooth(0, 0.38, k) : e;
    const p = A.p.clone().lerp(B.p, e);
    p.y = A.p.y + (B.p.y - A.p.y) * yk + Math.sin(Math.PI * k) * (kind === 'todesk' ? 0.24 : kind === 'back' ? 0.15 : 0.07);
    const sk = kind === 'back' ? 1 - Math.pow(1 - k, 3) : e;          // 放回去：先缩小再挪过去（不然又大又近的书迎着镜头冲过来）
    return { p, yaw: A.yaw + (B.yaw - A.yaw) * e, sc: A.sc + (B.sc - A.sc) * sk };
  };
  const place = (g, P) => { g.position.copy(P.p); g.rotation.set(0, P.yaw, 0); g.scale.setScalar(P.sc); };
  const move = (g, to, kind) => { const u = g.userData; u.from = { p: g.position.clone(), yaw: g.rotation.y, sc: g.scale.x }; u.to = to; u.mode = kind; u.k = 0; };
  items.forEach((g) => place(g, stackPose(g)));

  // ---- 屏幕上的东西（都做成纸） ----
  const last = JSON.parse(localStorage.getItem('livebook.last') || 'null');
  const next = nextLesson(books, last);
  const backBtn = h('button', { class: 'paper-btn', hidden: true, onclick: () => closeFan() }, '‹ 全部科目');
  const ui = h('div', { id: 'home' },
    h('header', { class: 'home-top' },
      h('div', { class: 'home-brand' }, h('b', {}, '活页课本'), h('span', {}, '纸上得来，不再浅')),
      h('div', { class: 'home-find' }, searchBox(books, manifests),          // 找内容的放一起：搜索框，下面是活页总览
        h('button', { class: 'home-link home-overview', onclick: () => openOverview(books, manifests, subjects, pagesOk) }, '⊞ 活页总览'))),
    h('section', { class: 'home-notes' },
      last ? h('a', { class: 'note-card', href: bookHref(last.book) + (last.lesson ? `#live=${last.lesson}` : `#p=${last.page || 0}`) }, h('small', {}, '继续上次'), h('b', {}, last.title), h('span', {}, last.where)) : null,
      next ? h('a', { class: 'note-card next', href: next.href }, h('small', {}, last ? '接着学' : '从这里开始'), h('b', {}, next.title), h('span', {}, next.where)) : null),
    h('footer', { class: 'home-foot' }, backBtn),          // 摊开一科时的“‹ 全部科目”
    homeLine(          // 左下角一行浅色小字：作者小签（指着出二维码）· 反馈与建议 · GitHub · 下载离线版（作者 2026-11-10：首页各种按钮太乱，收成一行）
      authorCard(), feedbackButton(), githubButton(),
      !OFFLINE && (FEATURES.offline || import.meta.env.DEV) ? offlineButton({ link: true }) : null,          // 开关在 src/features.js；离线版里不用再下载
      OFFLINE ? h('a', { class: 'home-link', href: 'https://livebook.derekfuture.club/', target: '_blank', rel: 'noopener' }, '联网后可回网站下载新版') : null));
  document.body.append(ui);
  document.querySelector('#loader')?.classList.add('done');

  // ---- 机位：把要看的东西（几个点）放进屏幕上空出来的那块（上面是标题和搜索框，右边是便签，下面是按钮），尽量大 ----
  let open = null, leaving = null, hoverS = null, hoverB = null;
  const frame = (pts, el, { bottom = 76 } = {}) => {          // 下面只剩左下角一行小字：给桌上的几科多留点地方
    const ph = innerWidth <= 760, rect = { l: ph ? 8 : 56, r: innerWidth - (ph ? 8 : 56), t: ph ? 158 : 150, b: innerHeight - bottom };          // 手机：左右几乎贴边，桌上的几摞书尽量大、好点
    const nb = ui.querySelector('.home-notes')?.getBoundingClientRect();          // 便签在右边一列（宽屏）或下面一行（4:3）：让开
    if (nb && nb.height > 0) { if (nb.left > innerWidth * 0.5) rect.r = nb.left - 36; else rect.b = Math.min(rect.b, nb.top - 24); }
    const cam = new THREE.PerspectiveCamera(stage.camera.fov, innerWidth / innerHeight, 0.02, 60);
    const dir = new THREE.Vector3(0, Math.sin(el), Math.cos(el)), target = pts.reduce((a, p) => a.add(p), new THREE.Vector3()).divideScalar(pts.length);
    const L = (rect.l / innerWidth) * 2 - 1, R = (rect.r / innerWidth) * 2 - 1, T = 1 - (rect.t / innerHeight) * 2, B = 1 - (rect.b / innerHeight) * 2;
    const right = new THREE.Vector3(), up = new THREE.Vector3(), v = new THREE.Vector3();
    let dist = 6;
    for (let it = 0; it < 40; it++) {
      cam.position.copy(target).addScaledVector(dir, dist); cam.lookAt(target); cam.updateMatrixWorld();
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const p of pts) { v.copy(p).project(cam); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
      const hh = dist * Math.tan((cam.fov * D2R) / 2);
      right.setFromMatrixColumn(cam.matrixWorld, 0); up.setFromMatrixColumn(cam.matrixWorld, 1);
      target.addScaledVector(right, ((x0 + x1) / 2 - (L + R) / 2) * hh * cam.aspect * 0.7).addScaledVector(up, ((y0 + y1) / 2 - (T + B) / 2) * hh * 0.7);
      dist *= 1 + (Math.max((x1 - x0) / (R - L), (y1 - y0) / (T - B)) - 1) * 0.7;
    }
    return { target, dir, dist };
  };
  const corners = (obj) => { obj.updateWorldMatrix(true, true); const b = new THREE.Box3().setFromObject(obj), out = []; for (let i = 0; i < 8; i++) out.push(new THREE.Vector3(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z)); return out; };
  const homeShot = (instant = false) => {
    stage.cameraOffsetX = 0;
    const pts = [];
    for (const s of subjects) { pts.push(...corners(s.card)); if (s.thing) pts.push(...corners(s.thing.userData.body || s.thing)); }
    for (const g of items) { const P = stackPose(g), u = g.userData; for (const sx of [-1, 1]) for (const sz of [-1, 1]) pts.push(new THREE.Vector3((sx * u.W) / 2, u.T / 2, (sz * BOOK_H) / 2).applyAxisAngle(Y, P.yaw).add(P.p)); }
    stage.shot({ ...frame(pts, THREE.MathUtils.degToRad(tall ? 56 : 36)), instant, minEl: 0.05 });
  };
  const fanShot = (s, instant = false) => {
    stage.cameraOffsetX = 0;
    const pts = [];
    for (const g of items) if (g.userData.s === s) { const P = fanPose(g), u = g.userData; for (const sx of [-1, 1]) for (const sz of [-1, 1]) pts.push(new THREE.Vector3((sx * u.W) / 2, u.T / 2, (sz * BOOK_H) / 2 + (sz > 0 ? 0.12 : 0)).applyAxisAngle(Y, P.yaw).add(P.p)); }          // 前面留出小纸条的地方
    stage.shot({ ...frame(pts, THREE.MathUtils.degToRad(62), { bottom: 150 }), instant });
  };
  const deskShot = (u, instant = false) => { stage.cameraOffsetX = 0; const Wv = u.W * u.sv; stage.shot({ target: new THREE.Vector3(Wv / 2, 0, 0.06), dir: new THREE.Vector3(0, Math.sin(BOOK_ELEV), Math.cos(BOOK_ELEV)), dist: stage.fitDistance(Wv * 1.25, 2 * 1.2, 1.04), instant }); };

  // 摊开的书下面一张小纸条：哪一册、翻到哪、活页做了几张；点它也能打开这本书
  const slips = new Map();
  const slipOf = (g) => {
    let t = slips.get(g);
    if (!t) { const u = g.userData, p = progress(u.id, manifests[u.id]); t = tag(`<b>${u.b.vol}</b><small>${p.where} · 活页 ${p.done}/${p.total}</small>`, 'desk-slip', () => openBook(u.id)); t.show(false); slips.set(g, t); }
    return t;
  };

  // ---- 摊开一科、收回去、拿一本书 ----
  function openFan(s) {
    if (open === s || leaving) return;
    if (open) closeFan(true);
    open = s; backBtn.hidden = false;
    for (const g of items) if (g.userData.s === s) { move(g, fanPose(g), 'tofan'); g.userData.hiCover(); }          // 摊开来看得大：换高清封面
    fanShot(s); mood.focus(fanCenter(s));
  }
  function closeFan(quick = false) {
    const s = open; if (!s) return;
    open = null; backBtn.hidden = true; hoverB = null;
    for (const g of items) if (g.userData.s === s) { move(g, stackPose(g), 'tostack'); slipOf(g).show(false); }
    if (!quick) { homeShot(); mood.focus(null); }
  }
  function openBook(id) {
    if (leaving) return;
    const s0 = subjects.find((s) => s.books.some((b) => b.id === id));
    if (id.startsWith('dili-')) return goWorld(s0, id);          // 地理：先进地理世界，这本书转到正前方
    const g = items.find((x) => x.userData.id === id);
    if (!g) { location.href = bookHref(id); return; }
    leaving = g; ui.classList.add('leaving'); canvas.style.cursor = ''; g.userData.hiCover();
    for (const t of slips.values()) t.show(false);
    move(g, deskPose(g), 'todesk'); moodT = 0; moodRate = 1 / 0.8;          // 书飞过去的这一秒里，光回到书里白天的样子
    for (const o of items) if (o !== g && o.userData.s === g.userData.s && o.userData.mode !== 'stack') move(o, stackPose(o), 'tostack');          // 别的书收回那一摞（镜头低头看书桌时它们在画面外）
    setTimeout(() => deskShot(g.userData), 160);
  }
  // 地理：地球仪的球从架子上飞起来、越来越大，飞到地理世界一打开时地球在屏幕上的位置和大小（earthCircle），这一帧盖着换页面——两个球叠在一起
  function goWorld(s, focus) {
    if (leaving || !s) return;
    const f = focus || (last?.book && s.books.some((b) => b.id === last.book) ? last.book : s.books[0].id);
    leaving = { world: true, s, t: 0, focus: f }; ui.classList.add('leaving'); canvas.style.cursor = ''; hoverS = null;
    preloadWorld();          // 飞的这一秒半里，先把月亮图下好（地球的贴图书桌上的地球仪本来就用着）
    if (open) closeFan(true);
    stage.calm = true;          // 不跟着鼠标晃
    const ball = s.thing?.userData.ball;
    if (ball) {
      const T = s.thing.userData; T.bake();          // 球自己转过的角度并进铜圈的朝向里，再整个转到地理世界里地球的朝向
      stage.scene.attach(ball); ball.traverse((o) => { o.castShadow = false; });
      leaving.ball = { o: ball, p: ball.position.clone(), q: ball.quaternion.clone(), sc: ball.scale.x, R: T.R, q1: new THREE.Quaternion().setFromAxisAngle(Y, (-90 - worldLon0(f) - WORLD_SETTLE) * D2R) };          // 还差一点没转到：揭开以后地理世界里的地球接着转过去（不在这里停住）
    }
  }

  // 地球仪飞到位：截一张图盖着（和地理世界一打开的画面叠在一起），收走书桌，在这个舞台上搭地理世界；地理世界的地球贴图好了就揭开（window.__dropSnap）
  function toWorld(L) {
    const url = `?subject=dili&focus=${L.focus}`, shot = stage.snapshot();
    if (!enterWorld) { try { sessionStorage.setItem('livebook.snap', shot); } catch { /* 存不下就直接换 */ } location.href = url; return; }
    const img = document.createElement('img'); img.className = 'inpage-snap'; img.src = shot; document.body.append(img);
    const C = earthCircle(), orbit = document.createElement('div'); orbit.className = 'inpage-orbit';          // 地球外面一道转着的金色轨道光：正在进去，不是卡住了
    Object.assign(orbit.style, { left: `${C.cx}px`, top: `${C.cy}px`, width: `${C.r * 2.5}px`, height: `${C.r * 2.5}px` }); document.body.append(orbit); setTimeout(() => orbit.classList.add("on"), 60);
    window.__dropSnap = () => { window.__dropSnap = () => {}; img.classList.add('out'); orbit.classList.add('out'); setTimeout(() => { img.remove(); orbit.remove(); }, 360); };
    img.decode().catch(() => {}).then(() => {          // 截图真的盖上了，再收书桌（不然中间会露出一帧空舞台）
      history.pushState(null, '', url);
      ac.abort(); ui.remove(); for (const t of slips.values()) t.remove(); stage.updaters.delete(tick); mood.dispose();
      document.body.classList.remove('mood', 'home'); document.documentElement.classList.remove('to-home');
      if (L.ball) { stage.scene.remove(L.ball.o); disposeTree(L.ball.o); }
      stage.scene.remove(group); disposeTree(group);
      enterWorld(L.focus, { settle: WORLD_SETTLE });
    });
  }

  // 书落到书桌中间、镜头停稳了：就在这个舞台上换成书里那本书
  function enter(g) {
    const u = g.userData;
    if (!enterBook) { location.href = bookHref(u.id); return; }
    history.pushState(null, '', bookHref(u.id));
    ac.abort(); ui.remove(); for (const t of slips.values()) t.remove(); stage.updaters.delete(tick); mood.dispose(); document.body.classList.remove('mood');
    for (const o of [...group.children]) if (o !== g) { group.remove(o); disposeTree(o); }          // 各科的纸、书、那几件东西都在镜头外面了：先收走；拿下来的这本留着，等书里那本书的封面画好了再收
    document.body.classList.remove('home'); document.body.classList.add('book-enter');
    document.documentElement.classList.remove('to-home');        // 从书里回到首页时 index.html 加的（藏起书里的按钮）：不去掉的话，再拿一本书进来，顶栏的目录、活页和翻页条都不见了
    enterBook(u.id, () => { stage.scene.remove(group); disposeTree(g); });
  }

  // ---- 指针 ----
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const aim = (e) => { ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, stage.camera); };
  const pickSubject = () => { const hit = ray.intersectObjects(subjects.map((s) => s.pick), false)[0]; return hit ? subjects.find((s) => s.pick === hit.object) : null; };
  const pickBook = () => { const fan = items.filter((g) => g.userData.s === open && g.userData.mode === 'fan'); const hit = ray.intersectObjects(fan.map((g) => g.userData.mesh), false)[0]; return hit ? fan.find((g) => g.userData.mesh === hit.object) : null; };
  const canvas = document.getElementById('c'), ac = new AbortController(), on = { signal: ac.signal };
  canvas.addEventListener('pointermove', (e) => {
    if (leaving || landing) return;
    aim(e);
    hoverB = open ? pickBook() : null;
    hoverS = open ? null : pickSubject();
    const other = open && !hoverB ? pickSubject() : null;
    canvas.style.cursor = hoverB || hoverS || (other && other !== open) ? 'pointer' : '';
  }, on);
  canvas.addEventListener('pointerleave', () => { hoverS = hoverB = null; }, on);
  canvas.addEventListener('click', (e) => {
    if (leaving || landing) return;
    aim(e);
    if (open) {
      const g = pickBook(); if (g) return openBook(g.userData.id);
      const s = pickSubject();
      if (!s || s === open) return closeFan();
      return s.name === '地理' ? goWorld(s) : s.books.length === 1 ? openBook(s.books[0].id) : openFan(s);
    }
    const s = pickSubject(); if (!s) return;
    if (s.name === '地理') goWorld(s); else if (s.books.length === 1) openBook(s.books[0].id); else openFan(s);
  }, on);
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && open && !leaving && !document.getElementById('overview')) closeFan(); }, on);

  // ---- 从书里回来（点了“‹ 书架”）：那本书先在书桌中间，揭开盖着的截图以后回到摊开的那一排里 ----
  let backFrom = null;
  try { backFrom = sessionStorage.getItem('livebook.homeFrom'); sessionStorage.removeItem('livebook.homeFrom'); } catch { /* 隐私模式 */ }
  const ret = items.find((g) => g.userData.id === backFrom);
  let fromWorld = null;
  try { fromWorld = JSON.parse(sessionStorage.getItem('livebook.homeFromWorld') || 'null'); sessionStorage.removeItem('livebook.homeFromWorld'); } catch { /* 隐私模式 */ }
  let waitCover = null, landing = null;
  if (ret) {
    const u = ret.userData, s = u.s;
    place(ret, deskPose(ret)); u.mode = 'held'; deskShot(u, true); u.hiCover();          // 这本书占满画面，要和书里最后一帧一样清楚
    moodK = moodT = 0; mood.set(0);          // 和书里最后一帧一样亮；揭开截图以后窗光再慢慢出来
    ui.classList.add('leaving');          // 书回到那一排以后，屏幕上的纸片再浮出来
    // 书里最后一帧（合上的书）还盖在上面：等这本书的封面贴图好了（下面已经是同一个画面）再揭开
    waitCover = { g: ret, t: 0, frames: 0, go: () => {
      window.__dropSnap?.();
      setTimeout(() => { moodT = 1; moodRate = 1 / 1.6; }, 340);
      setTimeout(() => {          // 盖着的截图淡出完了再动（不然有一两帧重影）
        if (s.books.length > 1) { open = s; backBtn.hidden = false; move(ret, fanPose(ret), 'back'); for (const g of items) if (g.userData.s === s && g !== ret) { move(g, fanPose(g), 'tofan'); g.userData.hiCover(); } fanShot(s); mood.focus(fanCenter(s)); }
        else { move(ret, stackPose(ret), 'back'); homeShot(); }
      }, 340);
      setTimeout(() => ui.classList.remove('leaving'), 1000);
    } };
  } else if (fromWorld && geoS?.thing) {
    // 从地理世界回来：屋里还是夜空，地球仪的球在地理世界里地球的位置、大小、朝向上；揭开截图以后它落回铜圈，屋里的光再亮起来
    homeShot(true); stage.calm = true; ui.style.transition = 'none'; ui.classList.add('leaving'); void ui.offsetWidth; ui.style.transition = '';          // 屏幕上的纸片先藏起来（不要淡出的过程）
    const T = geoS.thing.userData, ball = T.ball; T.bake(); stage.scene.attach(ball); ball.traverse((o) => { o.castShadow = false; });
    const start = ballAt(fromWorld, T); ball.position.copy(start.p); ball.scale.setScalar(start.sc); ball.quaternion.setFromAxisAngle(Y, fromWorld.spin);
    mood.night(1); T.glow(1);
    landing = { T, ball, p: start.p.clone(), sc: start.sc, q: ball.quaternion.clone(), t: -0.36 };          // 先等盖着的截图淡出（0.34 秒）
    window.__dropSnap?.();
  } else { homeShot(true); window.__dropSnap?.(); }
  stage.onResize = () => { if (!leaving) (open ? fanShot(open, true) : homeShot(true)); };

  // ---- 每帧 ----
  const tick = (dt) => {
    if (waitCover) { const w = waitCover; w.t += dt; if (w.g.userData.coverHiReady) w.frames++; if (w.frames > 2 || w.t > 1.6) { waitCover = null; w.go(); } }
    const time = performance.now() / 1000;
    if (moodK !== moodT) { moodK = moodT > moodK ? Math.min(moodT, moodK + dt * moodRate) : Math.max(moodT, moodK - dt * moodRate); mood.set(moodK); }
    mood.tick(dt, time);
    for (const s of subjects) {
      const want = !open && !leaving && hoverS === s ? 1 : 0;
      s.hot += (want - s.hot) * Math.min(1, dt * 7);
      s.card.userData.face.material.emissiveIntensity = 0.16 + s.hot * 0.12;
      if (leaving?.world && leaving.s === s) continue;          // 飞去地理世界的那一个：下面单独转（不重复转两次）
      s.thing?.userData.tick(dt, s.hot, time);
    }
    for (const g of items) {
      const u = g.userData;
      if (u.mode === 'stack') place(g, stackPose(g));
      else if (u.mode === 'fan') {
        const P = fanPose(g); u.hv += ((hoverB === g ? 1 : 0) - u.hv) * Math.min(1, dt * 9);
        P.p.y += u.hv * 0.03; place(g, P);
        slipOf(g).at(P.p.x, 0.004, P.p.z + BOOK_H / 2 + 0.07).show(!leaving);
      } else if (u.mode !== 'held') {
        u.k = clamp01(u.k + dt / (u.mode === 'todesk' || u.mode === 'back' ? 1.0 : 0.75));
        place(g, lerpPose(u.from, u.mode === 'tostack' ? stackPose(g) : u.to, u.k, u.mode));
        if (u.k >= 1) {
          if (u.mode === 'todesk') { u.wait = (u.wait || 0) + dt; if (!u.sent && (stage.settled(0.006) || u.wait > 0.9)) { u.sent = true; enter(g); return; } continue; }          // 镜头停稳了再换（两边是同一个画面）
          u.mode = u.mode === 'tostack' || (u.mode === 'back' && open !== u.s) ? 'stack' : 'fan';
        }
      }
    }
    if (landing) {          // 从地理世界回来：球落回铜圈，夜色退去，窗光回来
      const Lg = landing; Lg.t += dt;
      if (Lg.t < 0) { const st = ballAt(fromWorld, Lg.T); Lg.p.copy(st.p); Lg.sc = st.sc; Lg.ball.position.copy(st.p); Lg.ball.scale.setScalar(st.sc); }          // 截图还盖着：按画好的镜头摆准（刚启动时镜头的矩阵还没更新）
      const k = ease(clamp01(Lg.t / 1.7)), th = Lg.T, stand = geoS.thing;
      stand.updateWorldMatrix(true, false);
      const slotP = stand.localToWorld(th.slot.p.clone()), slotQ = stand.getWorldQuaternion(new THREE.Quaternion()).multiply(th.slot.q), slotS = stand.getWorldScale(new THREE.Vector3()).x;
      Lg.ball.position.lerpVectors(Lg.p, slotP, k); Lg.ball.position.y += Math.sin(Math.PI * k) * 0.1;
      Lg.ball.scale.setScalar(Lg.sc + (slotS - Lg.sc) * k); Lg.ball.quaternion.slerpQuaternions(Lg.q, slotQ, k);
      mood.night(1 - ease(clamp01((Lg.t - 0.3) / 1.4))); th.glow(1 - k);
      if (Lg.t >= 1.7) {
        stand.attach(Lg.ball); Lg.ball.position.copy(th.slot.p); Lg.ball.quaternion.copy(th.slot.q); Lg.ball.scale.setScalar(1); Lg.ball.traverse((o) => { if (o.isMesh) o.castShadow = true; });
        mood.night(0); th.glow(0); landing = null; stage.calm = false; ui.classList.remove('leaving');
      }
    }
    if (leaving?.world) {
      const L = leaving, B = L.ball; L.t += dt;
      const k = ease(clamp01((L.t - 0.15) / 1.6));
      mood.night(ease(clamp01(L.t / 1.25)));          // 屋里暗成夜空，星星出来
      if (B) {
        const end = ballAt(earthCircle(), B);          // 终点跟着现在的镜头算
        B.o.position.lerpVectors(B.p, end.p, k); B.o.position.y += Math.sin(Math.PI * k) * 0.12;
        B.o.scale.setScalar(B.sc + (end.sc - B.sc) * k);
        B.o.quaternion.slerpQuaternions(B.q, B.q1, k);          // 地轴转成竖直、经度转到地理世界里地球朝着镜头的那一面
        L.s.thing.userData.glow(k);          // 全按此刻的昼夜亮起来，外面一圈淡蓝的大气
      }
      if (L.t >= 1.76 && !L.sent) { L.sent = true; toWorld(L); }          // 球一停稳就接过去
    }
    updateTags(stage.camera);
  };
  stage.updaters.add(tick);
  stage.start();
  window.__home = { stage, items, subjects, openBook, openFan, closeFan, goWorld };          // 给测试、录屏脚本用（同书里的 window.__lb）
}

/**
 * 首页的光：一扇窗（在左后方、画面外）透进来的傍晚阳光——一盏带窗格图案的聚光灯，投出窗格和窗外树叶的影子；屋里的天光调暗、偏冷，
 * 远处的桌面没进暗处。set(k)：k = 1 首页的窗光，k = 0 书里白天的光（舞台原来的灯）；dispose()：拿走这盏灯，舞台的灯原样放回。
 */
function windowLight(stage, target) {
  const sc = stage.scene, hemi = sc.children.find((o) => o.isHemisphereLight), sun = stage.sun;
  const desk = stage.desk?.material;
  const base = { hI: hemi.intensity, hC: hemi.color.clone(), hG: hemi.groundColor.clone(), sI: sun.intensity, sC: sun.color.clone(), bg: sc.background.clone(), fC: sc.fog.color.clone(), fN: sc.fog.near, fF: sc.fog.far, dC: desk?.color.clone() };
  const dusk = { hI: 0.62, hC: new THREE.Color(0xa7b6d2), hG: new THREE.Color(0x5b4534), sI: 0.22, sC: new THREE.Color(0xffe2bd), bg: new THREE.Color(0x2b231d), fC: new THREE.Color(0x2b231d), fN: 5.2, fF: 12.5, dC: new THREE.Color(0xd6cbbd) };          // 桌面：窗光底下木头不那么橙
  const LIGHT = new THREE.Vector3(-5.4, 6.4, -6.1);          // 窗在哪个方向（离那几科多远）：和物理那束白光的方向一致
  const spot = new THREE.SpotLight(0xffe6c8, 0, 0, 0.19, 0.3, 0);
  spot.position.copy(target).add(LIGHT); spot.target.position.copy(target);
  spot.map = goboTexture(); spot.castShadow = true; spot.shadow.mapSize.set(2048, 2048); spot.shadow.bias = -0.0002; spot.shadow.normalBias = 0.008;
  Object.assign(spot.shadow.camera, { near: 3, far: 22 });
  sc.add(spot, spot.target);
  // 镜头这边补一点柔光（不投影）：照亮桌签、器物朝着人的那一面，窗光和长影子还在
  const fill = new THREE.DirectionalLight(0xffeedd, 0); fill.position.copy(target).add(new THREE.Vector3(0.6, 2.2, 5)); fill.target.position.copy(target); sc.add(fill, fill.target);
  // 光里的浮尘：一小团慢慢飘的亮点，只在窗光照到的那一束里
  const NM = 90, mp = new Float32Array(NM * 3), seeds = Array.from({ length: NM }, (_, i) => ({ u: (Math.sin(i * 12.9) * 0.5 + 0.5) * 2 - 1, v: (Math.sin(i * 7.7 + 1) * 0.5 + 0.5) * 2 - 1, t: 0.03 + (Math.sin(i * 3.3) * 0.5 + 0.5) * 0.16, ph: i * 1.7 }));
  const dir = LIGHT.clone().normalize(), side = new THREE.Vector3(-dir.z, 0, dir.x).normalize(), upv = new THREE.Vector3().crossVectors(dir, side).normalize();
  const motes = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(mp, 3)), new THREE.PointsMaterial({ color: 0xfff0d8, size: 0.022, map: dotTexture(), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  motes.frustumCulled = false; motes.raycast = () => {}; sc.add(motes);
  // 夜空（去地理世界的路上）：屋里的光全暗下去，桌子没进夜色，星星出来——和地理世界的天接得上
  const NIGHT = { hI: 0.05, hC: new THREE.Color(0x1d2c52), hG: new THREE.Color(0x04060c), bg: new THREE.Color(0x0a1330), fN: 0.4, fF: 4.2 };
  const SN = 700, sp = new Float32Array(SN * 3);
  for (let i = 0; i < SN; i++) { const u = Math.sin(i * 91.7) * 0.5 + 0.5, v = Math.sin(i * 47.3 + 2) * 0.5 + 0.5, th = u * Math.PI * 2, ph = Math.acos(1 - v * 1.2); sp.set([Math.sin(ph) * Math.cos(th) * 30, Math.cos(ph) * 30 - 4, Math.sin(ph) * Math.sin(th) * 30], i * 3); }
  const stars = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(sp, 3)), new THREE.PointsMaterial({ color: 0xdfe8ff, size: 0.09, map: dotTexture(), transparent: true, opacity: 0, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
  stars.frustumCulled = false; stars.raycast = () => {}; stars.renderOrder = 55; sc.add(stars);
  // 夜色的幕：罩在镜头四周，把整间屋子（连玻璃、彩虹）一起盖进夜色里；飞起来的地球画在幕的后面（renderOrder 更大），还看得见
  const curtain = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: NIGHT.bg, side: THREE.BackSide, transparent: true, opacity: 0, depthTest: false, depthWrite: false, fog: false }));
  curtain.renderOrder = 50; curtain.frustumCulled = false; curtain.raycast = () => {}; sc.add(curtain);
  const L = (a, b, k) => a + (b - a) * k;
  let kNow = 0, nNow = 0;
  const aimAt = target.clone(), home = target.clone();          // 窗光照着哪里：平时是那几科，摊开一科时挪到摊开的那一排（光的方向不变，影子还是朝右前方）
  const api = {
    /** 窗光挪去照 p（null：回到那几科） */
    focus(p) { aimAt.copy(p || home); },
    set(k, n = nNow) {
      kNow = k; nNow = n;
      hemi.intensity = L(L(base.hI, dusk.hI, k), NIGHT.hI, n); hemi.color.copy(base.hC).lerp(dusk.hC, k).lerp(NIGHT.hC, n); hemi.groundColor.copy(base.hG).lerp(dusk.hG, k).lerp(NIGHT.hG, n);
      sun.intensity = L(base.sI, dusk.sI, k) * (1 - n); sun.color.copy(base.sC).lerp(dusk.sC, k);
      sc.background.copy(base.bg).lerp(dusk.bg, k).lerp(NIGHT.bg, n); sc.fog.color.copy(base.fC).lerp(dusk.fC, k).lerp(NIGHT.bg, n);
      sc.fog.near = L(L(base.fN, dusk.fN, k), NIGHT.fN, n); sc.fog.far = L(L(base.fF, dusk.fF, k), NIGHT.fF, n);
      if (desk) desk.color.copy(base.dC).lerp(dusk.dC, k);
      spot.intensity = 4.4 * k * (1 - n); fill.intensity = 0.55 * k * (1 - n); motes.material.opacity = 0.55 * k * (1 - n); stars.material.opacity = n;
      curtain.material.opacity = Math.min(1, n * 1.15); curtain.visible = n > 0.001;
    },
    /** 去地理世界的路上暗成夜空（n = 0 傍晚 … 1 夜空） */
    night(n) { api.set(kNow, n); },
    tick(dt, t) {
      curtain.position.copy(stage.camera.position);
      if (target.distanceToSquared(aimAt) > 1e-8) { target.lerp(aimAt, Math.min(1, dt * 2.4)); spot.target.position.copy(target); spot.position.copy(target).add(LIGHT); }
      if (kNow <= 0.001) return;
      seeds.forEach((m, i) => {
        const along = LIGHT.clone().multiplyScalar(m.t + Math.sin(t * 0.05 + m.ph) * 0.01);
        const p = target.clone().addScaledVector(side, m.u * 1.6 + Math.sin(t * 0.13 + m.ph) * 0.05).addScaledVector(upv, m.v * 0.9 + Math.cos(t * 0.11 + m.ph) * 0.05).add(along);
        mp.set([p.x, Math.max(0.03, p.y), p.z], i * 3);
      });
      motes.geometry.attributes.position.needsUpdate = true;
    },
    dispose() { api.set(0, 0); sc.remove(spot, spot.target, fill, fill.target, motes, stars, curtain); stars.geometry.dispose(); stars.material.dispose(); curtain.geometry.dispose(); curtain.material.dispose(); spot.map?.dispose(); spot.shadow.map?.dispose(); motes.geometry.dispose(); motes.material.map?.dispose(); motes.material.dispose(); },
  };
  api.set(1);
  return api;
}
/** 窗格图案：一扇书房的格子窗（外框 + 两列三行的窗棂），光从格子里透过来，影子边是虚的；右上角窗外有几簇树叶的影子；越往边上光越弱 */
function goboTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 1024; const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 1024, 1024);
  const X0 = 120, X1 = 904, Y0 = 90, Y1 = 934, COLS = 2, ROWS = 3, BAR = 14, cw = (X1 - X0) / COLS, ch = (Y1 - Y0) / ROWS;
  g.filter = 'blur(16px)'; g.fillStyle = '#3a3630'; g.fillRect(X0, Y0, X1 - X0, Y1 - Y0);          // 窗棂的影子不是全黑：天光从旁边漏进来一点
  g.fillStyle = '#fff3de';
  for (let i = 0; i < COLS; i++) for (let j = 0; j < ROWS; j++) g.fillRect(X0 + i * cw + BAR / 2, Y0 + j * ch + BAR / 2, cw - BAR, ch - BAR);
  let sd = 7; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  g.filter = 'blur(18px)'; g.fillStyle = 'rgba(0,0,0,0.55)';
  for (let i = 0; i < 40; i++) { g.beginPath(); g.ellipse(X1 - 20 - r() * 280, Y0 - 20 + r() * 260, 16 + r() * 40, 9 + r() * 20, r() * 3, 0, 7); g.fill(); }
  g.filter = 'none';
  const gr = g.createRadialGradient(512, 512, 120, 512, 512, 600); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.62)'); g.fillStyle = gr; g.fillRect(0, 0, 1024, 1024);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
/** 浮尘的小亮点 */
function dotTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

/** 收走一棵物体树：几何体、材质、贴图都释放（描边的线材质是大家共用的，留着） */
function disposeTree(root) {
  root.traverse((o) => {
    o.geometry?.dispose();
    for (const m of [].concat(o.material || [])) { if (m.isLineMaterial) continue; for (const t of [m.map, m.emissiveMap]) if (t && !t.userData.shared) t.dispose(); m.dispose(); }          // 共用的贴图（地球）不扔
  });
}

/** 桌签：一张对折的卡片立在桌上，正面写着科目（楷体，字距拉开）、版本 · 几册 · 几张活页，顶上一道这一科的颜色 */
function tentCard(s) {
  const CW = 0.52, CH = 0.185, TILT = 12 * D2R;
  const W = 1024, H = Math.round((W * CH) / CW), c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 900; i++) { g.strokeStyle = `rgba(150,130,100,${Math.random() * 0.05})`; g.lineWidth = 1 + Math.random(); const x = Math.random() * W, y = Math.random() * H, a = Math.random() * Math.PI; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 10, y + Math.sin(a) * 10); g.stroke(); }     // 纸的纤维
  g.fillStyle = s.color; g.fillRect(0, 0, W, 9);
  g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.fillStyle = '#2c3245'; g.font = '700 150px "Kaiti SC", "STKaiti", "KaiTi", serif'; g.fillText([...s.name].join(' '), W / 2, 172);
  g.fillStyle = '#6b5f48'; g.font = '54px "Songti SC", "STSong", serif'; g.fillText(`${s.publisher} · ${s.books.length} 册 · ${s.leaves} 张活页`, W / 2, 262);
  g.fillStyle = s.color; g.font = '700 54px "Songti SC", "STSong", serif';          // 点一下会怎样（第一次来的人一看就知道）
  g.fillText(s.name === '地理' ? '点一下 · 进入地理世界' : s.books.length > 1 ? '点一下 · 展开课本' : '点一下 · 打开课本', W / 2, 340);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 16;
  const card = new THREE.Group();
  const face = new THREE.Mesh(new THREE.PlaneGeometry(CW, CH), new THREE.MeshLambertMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.16 }));          // 立着的面太阳照得少：自己亮一点，字才清楚
  face.rotation.x = -TILT; face.position.set(0, (CH / 2) * Math.cos(TILT), (CH / 2) * Math.sin(TILT));
  const back = new THREE.Mesh(new THREE.PlaneGeometry(CW, CH), new THREE.MeshLambertMaterial({ color: 0xf3eee2 }));
  back.rotation.set(TILT, Math.PI, 0); back.position.set(0, (CH / 2) * Math.cos(TILT), -(CH / 2) * Math.sin(TILT));
  for (const m of [face, back]) { m.castShadow = true; m.receiveShadow = true; card.add(m); }
  card.userData.face = face;
  return card;
}

// ================= 每一科的那件东西（底面落在 y = 0；userData.tick(dt, hot, time)：hot = 0 平时，1 指着它） =================

/**
 * 物理：一块玻璃三棱镜立在纸上，一束白光从后面斜着照过来，从另一边出来散开成彩虹，落在纸上、桌上。
 * 光路按折射定律在桌面这个平面里算（进、出两个面各折射一次）；色散夸大了十几倍，颜色才分得开——红光偏折最少、紫光最多，顺序和真的一样。
 * 指着它：三棱镜来回转几度，彩虹跟着摆（入射角变了，偏折也变了）。
 */
function prismThing() {
  const g = new THREE.Group(), s = 0.17, hh = (s * Math.sqrt(3)) / 2, L = 0.11;
  const P = [[-s / 2, hh / 3], [s / 2, hh / 3], [0, (-2 * hh) / 3]];          // 三角形的三个角（x, z），中心在原点：底边在前、顶角朝后——光往底边那边偏，彩虹落到前面空着的桌面上
  const shape = new THREE.Shape(P.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: L, bevelEnabled: false }); geo.rotateX(-Math.PI / 2);          // 立起来：y 从 0 到 L
  const body = new THREE.Group(); g.add(body);
  const prism = inked(new THREE.Mesh(geo, glass2({ tint: 0xeef6ff, base: 0.07, rim: 0.5, band: 0.6 })), { width: 1.1, color: 0x5d7f95, opacity: 0.85 });
  prism.renderOrder = 9; prism.castShadow = false; body.add(prism);

  // 三条边：外法线朝外
  const edges = [[0, 1], [1, 2], [2, 0]].map(([a, b]) => {
    const A = P[a], B = P[b], mx = (A[0] + B[0]) / 2, mz = (A[1] + B[1]) / 2, tx = B[0] - A[0], tz = B[1] - A[1], l = Math.hypot(tx, tz);
    let nx = tz / l, nz = -tx / l; if (nx * mx + nz * mz < 0) { nx = -nx; nz = -nz; }
    return { A, B, n: [nx, nz] };
  });
  const refract = (d, n, eta) => { const ci = -(d[0] * n[0] + d[1] * n[1]), k = 1 - eta * eta * (1 - ci * ci); if (k < 0) return null; const f = eta * ci - Math.sqrt(k); return [eta * d[0] + f * n[0], eta * d[1] + f * n[1]]; };
  const hitEdge = (o, d, skip) => {
    let best = null;
    edges.forEach((e, i) => {
      if (i === skip) return;
      const ex = e.B[0] - e.A[0], ez = e.B[1] - e.A[1], den = d[0] * ez - d[1] * ex; if (Math.abs(den) < 1e-9) return;
      const t = ((e.A[0] - o[0]) * ez - (e.A[1] - o[1]) * ex) / den, u = ((e.A[0] - o[0]) * d[1] - (e.A[1] - o[1]) * d[0]) / den;
      if (t > 1e-6 && u >= 0 && u <= 1 && (!best || t < best.t)) best = { t, i, p: [o[0] + d[0] * t, o[1] + d[1] * t] };
    });
    return best;
  };
  const nOf = (nm) => 1.5 + (12000 / (nm * nm)) * 3.2;          // 柯西公式，色散夸大到真的玻璃的十几倍（红紫两端差 20° 左右，真的冕牌玻璃只差一两度）
  // 一条光（三棱镜自己的坐标）：从左侧面上的 at（0…1）进去，方向角 a；返回进点、出点、出射方向
  const LEFT = 2;          // 边 2→0：左侧面
  const one = (a, nm, at) => {
    const e = edges[LEFT], p = [e.A[0] + (e.B[0] - e.A[0]) * at, e.A[1] + (e.B[1] - e.A[1]) * at], d = [Math.cos(a), Math.sin(a)];
    const di = refract(d, e.n, 1 / nOf(nm)); if (!di) return null;
    const hit = hitEdge(p, di, LEFT); if (!hit) return null;
    const ni = edges[hit.i].n, dout = refract(di, [-ni[0], -ni[1]], nOf(nm)); if (!dout) return null;
    return { p, q: hit.p, d: dout };
  };
  // 七种色光的分界（纳米）和颜色：红 橙 黄 绿 蓝 靛 紫
  const BOUND = [700, 645, 595, 555, 505, 462, 427, 400];
  const COLS = ['#e8352e', '#f28a1e', '#f2cf26', '#3fb54a', '#2f8fdc', '#3d4fc4', '#8a3fd0'].map((c) => new THREE.Color(c));
  const PSI = 74 * D2R, A_IN = 52 * D2R, LEN_IN = 0.62, LEN_OUT = 0.5, BEAM = 0.04;          // 三棱镜转了多少、白光从哪个方向来（从左后方斜着照过来，擦过那摞书后面）、光带多长多宽

  // 光带：几块平铺在桌面上的四边形（白光一块、白光外面一圈淡淡的光晕、玻璃里一块、七种色光各一块），沿长度方向淡入淡出
  const NQ = 10, pos = new Float32Array(NQ * 12), uv = new Float32Array(NQ * 8), col = new Float32Array(NQ * 12), alp = new Float32Array(NQ * 4);
  const geoR = new THREE.BufferGeometry(), index = [];
  for (let qd = 0; qd < NQ; qd++) { const o = qd * 4; index.push(o, o + 2, o + 1, o, o + 3, o + 2); }
  geoR.setIndex(index);
  geoR.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geoR.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geoR.setAttribute('color', new THREE.BufferAttribute(col, 3)); geoR.setAttribute('alpha', new THREE.BufferAttribute(alp, 1));
  const matR = new THREE.ShaderMaterial({
    uniforms: { uK: { value: 0.7 } }, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: 'attribute vec3 color; attribute float alpha; varying vec3 vC; varying float vA; varying vec2 vUv; void main(){ vC = color; vA = alpha; vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float uK; varying vec3 vC; varying float vA; varying vec2 vUv; void main(){ float side = smoothstep(0.0, 0.35, min(vUv.y, 1.0 - vUv.y) * 2.0); gl_FragColor = vec4(vC, vA * side * uK); }',
  });
  const rays = new THREE.Mesh(geoR, matR); rays.renderOrder = 4; rays.raycast = () => {}; rays.frustumCulled = false; g.add(rays);
  const rot = (p, a) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];          // 桌面上转 a（从 +x 转向 +z）
  const quad = (qd, pts, c, a, vs) => {
    pts.forEach((p, i) => { pos.set([p[0], 0.0022, p[1]], qd * 12 + i * 3); col.set([c.r, c.g, c.b], qd * 12 + i * 3); alp[qd * 4 + i] = a[i]; uv.set([i === 1 || i === 2 ? 1 : 0, vs[i]], qd * 8 + i * 2); });
  };
  const WHITE = new THREE.Color(1, 0.99, 0.94);
  const lay = (psi) => {
    body.rotation.y = -psi;          // three 的 rotation.y 是从 +z 转向 +x，和上面 rot 的方向相反
    const a = A_IN - psi, half = BEAM / 2 / s;          // 光进来的方向（三棱镜自己的坐标）；光束宽度换算成左侧面上的一段
    const W = (pt) => rot(pt, psi), back = (p, d, l) => [p[0] - d[0] * l, p[1] - d[1] * l], fwd = (p, d, l) => [p[0] + d[0] * l, p[1] + d[1] * l];
    const din = [Math.cos(a), Math.sin(a)];
    const e0 = one(a, 555, 0.5 - half), e1 = one(a, 555, 0.5 + half);
    if (!e0 || !e1) return;
    quad(0, [W(back(e0.p, din, LEN_IN)), W(back(e1.p, din, LEN_IN)), W(e1.p), W(e0.p)], WHITE, [0, 0, 0.95, 0.95], [0, 1, 1, 0]);          // 白光：从后面淡进来
    const g0 = one(a, 555, 0.5 - half * 2.6), g1 = one(a, 555, 0.5 + half * 2.6);
    if (g0 && g1) quad(9, [W(back(g0.p, din, LEN_IN)), W(back(g1.p, din, LEN_IN)), W(g1.p), W(g0.p)], WHITE, [0, 0, 0.3, 0.3], [0, 1, 1, 0]);          // 光晕
    const r0 = one(a, BOUND[0], 0.5), r7 = one(a, BOUND[7], 0.5);
    if (r0 && r7) quad(1, [W(e0.p), W(e1.p), W(r7.q), W(r0.q)], WHITE, [0.55, 0.55, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]);          // 玻璃里那一段
    for (let i = 0; i < 7; i++) {
      const A = one(a, BOUND[i], 0.5), B = one(a, BOUND[i + 1], 0.5); if (!A || !B) continue;
      quad(2 + i, [W(A.q), W(B.q), W(fwd(B.q, B.d, LEN_OUT)), W(fwd(A.q, A.d, LEN_OUT))], COLS[i], [1, 1, 0, 0], [i === 0 ? 0 : 0.5, i === 6 ? 1 : 0.5, i === 6 ? 1 : 0.5, i === 0 ? 0 : 0.5]);
    }
    geoR.attributes.position.needsUpdate = geoR.attributes.color.needsUpdate = geoR.attributes.alpha.needsUpdate = geoR.attributes.uv.needsUpdate = true;
  };
  lay(PSI);
  let wob = 0;
  g.userData.tick = (dt, hot, t) => {
    matR.uniforms.uK.value = 0.62 + 0.38 * Math.min(1, hot);
    const w = Math.min(1, hot) * Math.sin(t * 1.6) * 4 * D2R;
    if (Math.abs(w - wob) > 1e-4) { wob = w; lay(PSI + w); }
  };
  g.userData.body = body;          // 取景只框三棱镜本身（光带淡进淡出，不用框进去）
  return g;
}

/** 化学：一只锥形瓶，瓶里是蓝色的硫酸铜溶液。指着它：瓶子轻轻画圈（振荡），液面跟着晃 */
function flaskThing() {
  const g = new THREE.Group(), all = new THREE.Group(), body = new THREE.Group(); g.add(all); all.add(body); all.scale.setScalar(1.2);          // 比 100 毫升的瓶子大一号，和地球仪、三棱镜看起来一样有分量
  const prof = [[0, 0.0015], [0.064, 0.0015], [0.07, 0.006], [0.0705, 0.013], [0.027, 0.124], [0.019, 0.137], [0.019, 0.181], [0.0225, 0.184], [0.0225, 0.189], [0.017, 0.189]];
  const glass = glassEdge(new THREE.Mesh(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 64), glass2({ tint: 0xeaf6fb })), 0.0008);
  glass.renderOrder = 9; body.add(glass);
  const LV = 0.062, rAt = (y) => 0.0705 - (y - 0.013) * (0.0435 / 0.111) - 0.0018;          // 液面高度；瓶壁里面在这个高度的半径
  const lprof = [[0, 0.004], [0.0625, 0.004], [0.0675, 0.012], [rAt(LV), LV]];
  const liqM = water2({ color: 0x2a8de0, base: 0.6, rim: 0.3 });
  const liquid = new THREE.Mesh(new THREE.LatheGeometry(lprof.map(([r, y]) => new THREE.Vector2(r, y)), 64), liqM); liquid.renderOrder = 8; body.add(liquid);
  const surf = new THREE.Mesh(new THREE.CircleGeometry(rAt(LV), 48), water2({ color: 0x4aa2ea, base: 0.7, rim: 0.2 })); surf.rotation.x = -Math.PI / 2; surf.renderOrder = 8.5;
  const surfG = new THREE.Group(); surfG.position.y = LV; surfG.add(surf); all.add(surfG);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.075, 40), new THREE.MeshBasicMaterial({ color: 0x1e5f9c, transparent: true, opacity: 0.12, depthWrite: false }));          // 蓝色溶液透过来的一点淡蓝的影子
  shadow.rotation.x = -Math.PI / 2; shadow.position.set(0.012, 0.0008, 0.01); all.add(shadow);
  let ph = 0, amp = 0;
  g.userData.tick = (dt, hot) => {
    amp += (Math.min(1, hot) - amp) * Math.min(1, dt * 4); ph += dt * 6.5;
    const ax = new THREE.Vector3(Math.cos(ph), 0, Math.sin(ph));
    body.quaternion.setFromAxisAngle(ax, amp * 0.05);          // 瓶子绕一个小圈
    surfG.position.y = LV + amp * 0.002;
    surfG.quaternion.setFromAxisAngle(ax, -amp * 0.09);          // 液面落后半拍，往反方向斜
  };
  return g;
}

/**
 * 地理：一个复古的桌面地球仪——胡桃木底座、黄铜子午圈；球面就是地理世界那颗地球（同一张地形图），按此刻真实的太阳分出昼夜，夜里那一半亮着城市灯光
 * （NASA 2016 年合成，同地理世界）。在桌上：一半是窗光照出来的样子，一半是它自己的昼夜（nowK）；飞去地理世界时全按此刻的昼夜亮起来，外面一圈淡蓝的大气。
 * 指着它慢慢转。userData：ball（连地轴倾斜的那一层，飞走时整个拿走）、R、bake()、glow(k)、tick。
 */
function deskGlobe() {
  const g = new THREE.Group(), R = 0.088, EPS = 23.5 * D2R, HC = 0.152, RM = R * 1.13;
  const AXIS = new THREE.Vector3(Math.sin(EPS), Math.cos(EPS), 0), C0 = new THREE.Vector3(0, HC, 0), TILT = new THREE.Quaternion().setFromUnitVectors(Y, AXIS);
  const { day, night } = earthMaps();          // 和地理世界的地球同一份贴图：接过去时不用再下、再传显卡
  const sub = subsolar(new Date());
  const U = { sunL: { value: new THREE.Vector3(...ll2v(sub.lat, sub.lon)) }, nightMap: { value: night }, nowK: { value: 0.55 } };
  const ballMat = new THREE.MeshStandardMaterial({ map: day, roughness: 0.5, metalness: 0, transparent: true });          // 透明那一队里画：排在夜色的幕后面
  ballMat.fog = false;          // 暗成夜空时桌子没进雾里，这颗球不能跟着没进去
  ballMat.onBeforeCompile = (sh) => {          // 昼夜、城市灯光、晨昏线一道暖光：和地理世界的地球同一个算法（球自己的坐标里算，跟着球转）
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vObjN;').replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nvObjN = objectNormal;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vObjN; uniform vec3 sunL; uniform sampler2D nightMap; uniform float nowK;').replace('#include <opaque_fragment>', `{
      float d = dot(normalize(vObjN), normalize(sunL)), dayK = smoothstep(-0.08, 0.22, d);
      vec3 dayC = diffuseColor.rgb * (0.06 + 1.1 * max(d, 0.0));
      vec3 nightC = diffuseColor.rgb * vec3(0.03, 0.04, 0.07) + texture2D(nightMap, vMapUv).rgb * vec3(1.0, 0.78, 0.48) * 1.6;
      vec3 nowC = mix(nightC, dayC, dayK) + diffuseColor.rgb * vec3(0.9, 0.38, 0.15) * 0.18 * exp(-pow(d / 0.09, 2.0));
      outgoingLight = mix(outgoingLight, nowC, nowK);
    }
    #include <opaque_fragment>`);
  };
  ballMat.customProgramCacheKey = () => 'deskglobe';
  const brass = new THREE.MeshStandardMaterial({ color: 0xc69a4c, metalness: 0.55, roughness: 0.34, emissive: 0x3a2a10, emissiveIntensity: 0.25 });
  const walnut = new THREE.MeshStandardMaterial({ color: 0x5b3a25, roughness: 0.48, metalness: 0 });
  // 底座：车出来的胡桃木，顶上一截铜柱托着子午圈
  const prof = [[0, 0], [0.047, 0], [0.05, 0.004], [0.046, 0.011], [0.032, 0.017], [0.018, 0.026], [0.012, 0.038], [0.0135, 0.042], [0, 0.042]].map(([r, y]) => new THREE.Vector2(r, y));
  const base = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), walnut); base.castShadow = base.receiveShadow = true; g.add(base);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.006, HC - RM - 0.042 + 0.002, 16), brass); stem.position.y = 0.042 + (HC - RM - 0.042) / 2; stem.castShadow = true; g.add(stem);
  // 子午圈：一整圈黄铜，在地轴所在的那个竖直面里；两极各一根铜钉穿进球里
  const tilt = new THREE.Group(); tilt.position.copy(C0); tilt.quaternion.copy(TILT); g.add(tilt);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(RM, 0.0028, 12, 120), brass); ring.castShadow = true; g.add(ring); ring.position.copy(C0); ring.quaternion.copy(TILT);
  for (const sg of [-1, 1]) { const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0016, RM - R + 0.004, 10), brass); pin.position.copy(C0).addScaledVector(AXIS, sg * (R + (RM - R) / 2)); pin.quaternion.copy(TILT); g.add(pin); }
  const spin = new THREE.Group(); tilt.add(spin);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64), ballMat); ball.castShadow = true; ball.receiveShadow = true; ball.renderOrder = 60; spin.add(ball);
  // 大气：背面一层往外晕的淡蓝（飞起来才亮）
  const haloM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending, fog: false, uniforms: { k: { value: 0 } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float k; varying vec3 vN; varying vec3 vV; void main(){ float r = 1.0 - abs(dot(normalize(vN), normalize(vV))); gl_FragColor = vec4(vec3(0.36, 0.58, 0.95), pow(r, 2.6) * 0.75 * k); }' });
  const halo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.1, 64, 40), haloM); halo.raycast = () => {}; halo.renderOrder = 61; tilt.add(halo);
  g.rotation.y = -0.85;          // 斜着摆：从镜头看过去，子午圈是一道斜着的弧，不是绕着球的一圈
  spin.rotation.y = (-90 - 110) * D2R + 0.85;          // 桌上：亚洲这一面朝着屋里
  Object.assign(g.userData, {
    ball: tilt, R, slot: { p: C0.clone(), q: TILT.clone() },          // 球在铜圈里的位置、朝向（底座自己的坐标）：从地理世界回来时落回这里
    bake() { tilt.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(Y, spin.rotation.y)); spin.rotation.y = 0; },          // 球自己转过的并进外面那一层
    glow(k) { U.nowK.value = 0.55 + 0.45 * k; haloM.uniforms.k.value = k; },
    tick(dt, hot) { spin.rotation.y += dt * (0.05 + hot * 0.7); },
  });
  return g;
}

/** 下一张还没做的活页：上次那本书里、上次那张之后的第一张；没有就从第一本书开始。 */
function nextLesson(books, last) {
  const ids = books.map((b) => b.id);
  const order = last && ids.includes(last.book) ? [last.book, ...ids.filter((id) => id !== last.book)] : ids;
  for (const bid of order) {
    const c = getBook(bid);
    const spots = [...new Map(c.spots.map((s) => [s.lesson, s])).values()].sort((a, b) => a.page - b.page);
    const after = last && last.book === bid ? spots.filter((s) => s.page >= last.page && s.lesson !== last.lesson) : spots;
    const s = after.find((x) => !stamps.has(x.lesson)) || spots.find((x) => !stamps.has(x.lesson));
    if (s) {
      const L = c.lessons[s.lesson];
      return { href: `${bookHref(bid)}#live=${s.lesson}`, title: L.title, where: `${c.full} · ${L.fig} · ${L.sec}` };
    }
  }
  return null;
}

/** 搜索：所有书的章、节标题 + 所有活页 */
function searchBox(books, manifests) {
  const entries = [];
  for (const b of books) {
    const c = getBook(b.id), man = manifests[b.id];
    for (const ch of man.chapters) {
      if (ch.page != null) entries.push({ kind: '章', title: ch.title, where: b.full, href: `${bookHref(b.id)}#p=${ch.page}` });
      for (const s of ch.sections) if (s.page != null) entries.push({ kind: '节', title: s.title.replace(/^第.节\s*/, ''), where: `${b.full} · ${ch.title}`, href: `${bookHref(b.id)}#p=${s.page}` });
    }
    for (const [id, L] of Object.entries(c.lessons)) entries.push({ kind: '活页', title: L.title, where: `${b.full} · ${L.fig} · ${L.sec}`, cap: L.cap || '', href: `${bookHref(b.id)}#live=${id}`, done: stamps.has(id) });          // cap：课本图题，搜得到但不显示
  }
  const input = h('input', { type: 'search', placeholder: '搜一节课或一张活页，比如“凸透镜”“电解水”' });
  const list = h('div', { class: 'search-list', hidden: true });
  input.addEventListener('input', () => {
    const q = input.value.trim();
    list.innerHTML = '';
    if (!q) { list.hidden = true; return; }
    const hits = entries.filter((e) => e.title.includes(q) || e.where.includes(q) || e.cap?.includes(q)).sort((a, b) => (a.kind === '活页' ? -1 : 0) - (b.kind === '活页' ? -1 : 0)).slice(0, 10);
    for (const e of hits) list.append(h('a', { href: e.href, class: 'search-item' }, h('i', { class: `k k-${e.kind}` }, e.kind), h('b', {}, e.title), h('span', {}, e.where)));
    if (!hits.length) list.append(h('div', { class: 'search-empty' }, '没有找到。试试换个词。'));
    list.hidden = false;
  });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') list.querySelector('a')?.click(); });
  return h('div', { class: 'home-search' }, input, list);
}

/** 活页总览：按科目、按书、按章节排的活页卡片，缩略图截取课本上的原图 */
function openOverview(books, manifests, subjects, pagesOk) {
  const body = h('div', { class: 'ov-body' });
  const tabs = h('div', { class: 'ov-tabs' });
  const show = (bid) => {
    body.innerHTML = '';
    body.scrollTop = 0;
    tabs.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x.dataset.id === bid));
    const c = getBook(bid), man = manifests[bid];
    const seen = new Set();
    for (const ch of man.chapters) {
      const end = man.chapters[man.chapters.indexOf(ch) + 1]?.page ?? man.pageCount;
      const spots = c.spots.filter((s) => s.page >= (ch.page ?? 0) && s.page < end && !seen.has(s.lesson) && seen.add(s.lesson));
      if (!spots.length) continue;
      body.append(h('h3', {}, ch.title));
      body.append(h('div', { class: 'ov-grid' }, spots.map((s) => {
        const L = c.lessons[s.lesson], [x0, y0, x1, y1] = s.bbox, PW = man.pageSize[0], PH = man.pageSize[1];
        const thumb = h('div', { class: pagesOk[bid] ? 'ov-thumb' : 'ov-thumb nopage' }, pagesOk[bid] ? null : L.fig);
        if (pagesOk[bid]) Object.assign(thumb.style, {
          backgroundImage: `url(${c.base}hi/${String(s.page).padStart(3, '0')}.jpg)`,
          backgroundSize: `${(PW / (x1 - x0)) * 100}% auto`,
          backgroundPosition: `${(x0 / (PW - (x1 - x0))) * 100}% ${(y0 / (PH - (y1 - y0))) * 100}%`,
          aspectRatio: `${x1 - x0} / ${y1 - y0}`,
        });
        return h('a', { class: 'ov-card', href: `${bookHref(bid)}#live=${s.lesson}` }, thumb,
          h('b', {}, L.title), h('span', {}, `${L.fig} · 第 ${s.page - man.pageOffset} 页`), stamps.has(s.lesson) ? h('i', { class: 'ov-done' }, '已做') : null);
      })));
    }
  };
  // 标签按科目分组：人教版 物理［八年级上册 八年级下册 九年级全一册］ 人教版 化学［九年级上册 九年级下册］
  for (const s of subjects) {
    tabs.append(h('span', { class: 'ov-subj', style: `--c:${s.color}` }, `${s.publisher} ${s.name}`));
    for (const b of s.books) tabs.append(h('button', { 'data-id': b.id, style: `--c:${s.color}`, onclick: () => show(b.id) }, b.vol));
  }
  const sheet = h('div', { id: 'overview' },
    h('div', { class: 'ov-paper' },
      h('div', { class: 'ov-head' }, h('h2', {}, '活页总览'), tabs, h('button', { class: 'ov-close', onclick: () => sheet.remove() }, '合上 ×')),
      body));
  const close = (e) => { if (e.key === 'Escape') { sheet.remove(); removeEventListener('keydown', close); } };
  addEventListener('keydown', close);
  document.body.append(sheet);
  show(subjects[0].books[0].id);
}

// 左下角的作者小签：公众号头像 + 名字；悬停（手机上点一下）展开二维码。只放在首页，书里和活页里不打扰。
/** 左下角那一行：几样东西排成一行，中间用“·”隔开 */
function homeLine(...items) {
  const kids = [];
  for (const it of items.filter(Boolean)) { if (kids.length) kids.push(h('i', { class: 'home-sep', 'aria-hidden': 'true' }, '·')); kids.push(it); }
  return h('nav', { class: 'home-line', 'aria-label': '关于、反馈与下载' }, ...kids);
}

function authorCard() {
  const card = h('div', { class: 'home-author' },
    h('div', { class: 'author-qr', role: 'dialog', 'aria-label': '公众号二维码' },
      h('img', { src: fileUrl('/brand/gzh-qr.jpg'), width: 132, height: 132, alt: '德里克的 AI 教学实验室 公众号二维码' }),
      h('p', {}, '新的活页、新的尝试，都在这里分享'),
      h('p', {}, '使用中遇到问题，或想交流 AI 教学，欢迎联系我。'),
      h('small', {}, '微信扫一扫，或在微信里长按识别')),
    h('button', { class: 'author-chip', 'aria-expanded': 'false', onclick: (e) => { e.stopPropagation(); toggle(); } },
      h('img', { src: fileUrl('/brand/gzh-avatar.jpg'), width: 30, height: 30, alt: '' }),
      h('span', {}, h('b', {}, '德里克的 AI 教学实验室'), h('small', {}, '用 AI 做真实的教学实践，一起探索未来教育'))));
  const toggle = (open = !card.classList.contains('open')) => {
    card.classList.toggle('open', open);
    card.querySelector('.author-chip').setAttribute('aria-expanded', String(open));
  };
  addEventListener('pointerdown', (e) => { if (!card.contains(e.target)) toggle(false); });
  return card;
}
