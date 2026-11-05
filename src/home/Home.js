// 首页：书桌那一头靠墙立着一个书架。一科一层，课本封面朝外、斜靠着立在架子上；每层架子前沿一张小铜框标签（科目 · 几册 · 几张活页），
// 每一层的背板刷一点这一科的颜色。翻过的书，顶上露出一截红书签带。
// 点一本书：它从架子上抽出来、落到书桌中间，镜头跟着低头看——和书里一开始的样子一模一样；不重新加载页面，就在这个舞台上换成书里那本书，接着翻开到上次的书签页。
// 从书里回来：书先合上，换页面时拿书里最后一帧盖着，这边画好了再揭开，书从书桌上放回架上。
// 屏幕上还有：继续上次 / 接着学（贴在墙上的两张便签）、搜一节课或一张活页、活页总览。
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { getBook, bookList, getManifest, fileUrl, OFFLINE } from '../content/index.js';
import { offlineButton } from './offlinePack.js';
import { FEATURES } from '../features.js';
import { stamps, h } from '../ui/Panel.js';
import { tag, updateTags } from '../ui/tags.js';
import { progress, bookmark } from './progress.js';

const COVER_H = 0.62;              // 书架上的书高；书里那本书高 2（Book.js），拿到书桌上时放大过去
const LEAF_T = 0.0017;             // 书里每张纸的厚度（同 Book.js）：书架上的书按页数有厚有薄
const GAP = 0.085, MARGIN = 0.12;  // 书和书之间、书和侧板之间
const TIER_H = 0.8, BOARD = 0.036, APRON = 0.1, SIDE = 0.045, DEPTH = 0.2, PLINTH = 0.1;
const ZF = -2.0;                   // 书架前沿的 z（书桌靠墙那一头）；书桌中间 z = 0 是翻开书的地方（和书里的书同一个位置）
const BOOK_ELEV = THREE.MathUtils.degToRad(64);      // 书里合上的书：镜头俯角（同 main.js 的 bookShot）
const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const clamp01 = (x) => Math.max(0, Math.min(1, x));

/** enterBook(id, handoff)：在同一个舞台上打开那本书（main.js 的 bootBook）；没有就换页面 */
export async function bootHome(stage, { enterBook = null } = {}) {
  // 旧链接 /#live=convex：找到那张活页所在的书，直接打开
  const q = new URLSearchParams(location.hash.slice(1));
  if (q.has('live')) {
    const b = bookList().find((x) => getBook(x.id).lessons[q.get('live')]);
    if (b) { location.replace(`?book=${b.id}${location.hash}`); return; }
  }
  document.body.classList.add('home');
  document.title = '活页课本';
  const books = bookList().filter((b) => Object.keys(getBook(b.id).lessons).length);     // 还没有做好活页的书先不上架
  const manifests = Object.fromEntries(await Promise.all(books.map(async (b) => [b.id, await getManifest(b.id)])));
  // 有没有书页图片（只在开发时用；线上只放封面，缓存里留着的旧图也不用）：没有的话，活页总览里的缩略图只写图号
  const pagesOk = Object.fromEntries(await Promise.all(books.map(async (b) => { if (OFFLINE || !import.meta.env.DEV) return [b.id, false]; try { const r = await fetch(`${getBook(b.id).base}lo/001.jpg`, { method: 'HEAD' }); return [b.id, r.ok && (r.headers.get('content-type') || '').startsWith('image/')]; } catch (e) { return [b.id, false]; } })));
  const loader = new THREE.TextureLoader();

  // ---- 按科目分层（顺序照 books.json），第一科在最上面 ----
  const subjects = [];
  for (const b of books) {
    let s = subjects.find((x) => x.name === b.subject && x.publisher === b.publisher);          // 同一科不同版本分开放
    if (!s) subjects.push((s = { name: b.subject, publisher: b.publisher, color: b.color, books: [] }));
    s.books.push(b);
  }
  const n = subjects.length;
  for (const s of subjects) {
    s.leaves = s.books.reduce((k, b) => k + Object.keys(getBook(b.id).lessons).length, 0);
    s.items = s.books.map((b) => {
      const man = manifests[b.id], W = (COVER_H * man.pageSize[0]) / man.pageSize[1];
      const leafCount = Math.floor(man.pageCount / 2) + 1;
      return { b, man, W, T: Math.max(0.022, (leafCount * LEAF_T * COVER_H) / 2) };
    });
    s.rowW = s.items.reduce((w, it) => w + it.W, 0) + GAP * (s.items.length - 1);
  }
  const IW = Math.max(1.2, ...subjects.map((s) => s.rowW)) + MARGIN * 2, OW = IW + SIDE * 2;
  const yRest = (k) => PLINTH + BOARD + k * (TIER_H + BOARD);       // 第 k 层（从下往上数）书底下那块板的上表面
  const HT = yRest(n);                                               // 书架总高（顶板上表面）

  // ---- 书架、墙 ----
  const group = new THREE.Group();
  stage.scene.add(group);
  const woodTex = makeWood(), woodTexV = woodTex.clone(); woodTexV.center.set(0.5, 0.5); woodTexV.rotation = Math.PI / 2; woodTexV.needsUpdate = true;
  const wood = new THREE.MeshLambertMaterial({ map: woodTex, color: 0xe0c09a }), woodV = new THREE.MeshLambertMaterial({ map: woodTexV, color: 0xe0c09a });
  const piece = (w, hh, d, x, y, z, mat = wood) => {
    const m = new THREE.Mesh(new RoundedBoxGeometry(w, hh, d, 2, Math.min(0.006, Math.min(w, hh, d) / 3)), mat);
    m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; group.add(m); return m;
  };
  const zMid = ZF - DEPTH / 2;
  for (const sx of [-1, 1]) piece(SIDE, HT + 0.012, DEPTH + 0.012, sx * (IW / 2 + SIDE / 2), (HT + 0.012) / 2, zMid, woodV);   // 两块侧板
  piece(OW + 0.03, BOARD, DEPTH + 0.03, 0, HT + BOARD / 2, zMid + 0.006);                                                      // 顶板（略探出来一点）
  piece(IW, PLINTH, 0.025, 0, PLINTH / 2, ZF - 0.025);                                                                         // 踢脚
  for (let k = 0; k < n; k++) {
    const y = yRest(k);
    piece(IW, BOARD, DEPTH, 0, y - BOARD / 2, zMid);                                                                           // 层板
    piece(IW, APRON, 0.02, 0, y - APRON / 2 + 0.002, ZF - 0.01);                                                               // 层板前沿的挡边
    piece(IW, 0.016, 0.012, 0, y + 0.008, ZF - 0.012);                                                                         // 防止书滑下去的一道小沿
  }
  // 背板：每一层刷一点这一科的颜色（很淡）
  const cream = new THREE.Color(0xf4eee3);
  subjects.forEach((s, i) => {
    const tint = new THREE.Color(s.color).lerp(cream, 0.78), k = n - 1 - i, mat = new THREE.MeshLambertMaterial({ color: tint, emissive: tint, emissiveIntensity: 0.48 });      // 竖着的面太阳照得少：自己亮一点，不然发灰
    const top = k === n - 1 ? HT - BOARD : yRest(k + 1) - BOARD;
    const back = new THREE.Mesh(new THREE.BoxGeometry(IW, top - yRest(k), 0.012), mat);
    back.position.set(0, (top + yRest(k)) / 2, ZF - DEPTH + 0.006); back.receiveShadow = true; group.add(back);
  });
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(14, 7), new THREE.MeshLambertMaterial({ color: 0xf3ece2, emissive: 0xf3ece2, emissiveIntensity: 0.42 }));
  wall.position.set(0, 3.5, ZF - DEPTH - 0.014); wall.receiveShadow = true; group.add(wall);

  // 每层前沿的小铜框标签：科目，版本 · 几册 · 几张活页
  subjects.forEach((s, i) => {
    const k = n - 1 - i, card = labelCard(s.name, `${s.publisher} · ${s.books.length} 册 · ${s.leaves} 张活页`, s.color);
    card.position.set(0, yRest(k) - APRON / 2 + 0.002, ZF + 0.0012); group.add(card);
  });

  // ---- 书：封面朝外，斜靠在背板上 ----
  const items = [];
  subjects.forEach((s, i) => {
    const k = n - 1 - i;
    let x = -s.rowW / 2;
    s.items.forEach((it, j) => {
      const { b, W, T } = it, g = new THREE.Group();
      const cover = loader.load(fileUrl(`${getBook(b.id).base}hi/000.jpg`), () => { g.userData.coverReady = true; });
      cover.colorSpace = THREE.SRGBColorSpace; cover.anisotropy = 8;
      const pages = new THREE.MeshLambertMaterial({ color: 0xf1ebde }), back = new THREE.MeshLambertMaterial({ color: b.side });
      const front = new THREE.MeshLambertMaterial({ map: cover });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(W, T, COVER_H), [pages, pages, front, back, pages, pages]);   // 封面在 +y；书脊和书口都是纸色（和书里那本书一样）
      mesh.castShadow = mesh.receiveShadow = true;
      g.rotation.order = 'YXZ'; g.add(mesh); group.add(g);
      // 翻过的书：顶上露出一截红书签带
      if (bookmark.get(b.id)) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.0012, 0.085), new THREE.MeshLambertMaterial({ color: 0xb8322c }));
        rib.position.set(-W / 2 + 0.085, 0, -COVER_H / 2 - 0.028); rib.rotation.y = 0.12; rib.castShadow = true; g.add(rib);
      }
      // 放到书桌上时：放大到书里那本书的大小（高 2），书脊在 x = 0、书在 +x 那边，正好是书里合上的书
      const sc = 2 / COVER_H;
      Object.assign(g.userData, { id: b.id, b, mesh, W, T, x: x + W / 2, yRest: yRest(k), L: Math.asin(clamp01((DEPTH - 0.065 - T) / COVER_H)), yaw: [0.025, -0.02, 0.015, -0.03][j % 4] + (i % 2 ? 0.01 : 0), pull: 0, go: 0, dir: 0, s: sc, Wv: W * sc, Tv: T * sc });
      items.push(g);
      x += W + GAP;
    });
  });
  const applyPose = (g) => {
    const u = g.userData;
    const pull = u.go > 0 ? 1 : u.pull, L = u.L * (1 - 0.6 * pull), H = COVER_H;
    // 书底靠后的那条边落在层板上；拿起来一点时抬过前面那道小沿
    const p = new THREE.Vector3(u.x, u.yRest + (H / 2) * Math.cos(L) + (u.T / 2) * Math.sin(L) + 0.026 * pull, ZF - 0.05 - (H / 2) * Math.sin(L) - (u.T / 2) * Math.cos(L) + 0.045 * pull);
    let rx = Math.PI / 2 - L, ry = u.yaw * (1 - pull), sc = 1;
    if (u.go > 0) {
      // 先往外抽出来、提起来，再落到书桌中间（一边落一边放平）
      const k1 = clamp01(u.go / 0.22), k2 = ease(clamp01((u.go - 0.18) / 0.82));
      p.add(new THREE.Vector3(0, 0.06 * k1, 0.18 * k1));
      p.lerp(new THREE.Vector3(u.Wv / 2, u.Tv / 2, 0), k2); p.y += Math.sin(Math.PI * k2) * 0.28;
      rx *= 1 - ease(clamp01((u.go - 0.24) / 0.7)); ry *= 1 - k2; sc = 1 + (u.s - 1) * k2;
    }
    g.position.copy(p); g.rotation.set(rx, ry, 0); g.scale.setScalar(sc);
  };
  items.forEach(applyPose);

  // ---- 机位：正对书架（略高一点往下看）；拿到书桌上的书：和书里合上的书同一个机位 ----
  const homeShot = (instant = false) => {
    const narrow = innerWidth < innerHeight * 1.1;
    const dist = stage.fitDistance(OW + (narrow ? 0.25 : 1.0), HT + (narrow ? 1.4 : 0.8), 1.0);       // 上面留出标题和搜索框，下面留出活页总览
    const el = 0.1;          // 正对着书架，眼睛比书架中间略高一点
    stage.shot({ target: new THREE.Vector3(0, HT / 2 - (narrow ? 0.35 : 0.03), zMid), dir: new THREE.Vector3(0, Math.sin(el), Math.cos(el)), dist, instant, minEl: 0.05 });
  };
  const deskShot = (u, instant = false) => stage.shot({ target: new THREE.Vector3(u.Wv / 2, 0, 0.06), dir: new THREE.Vector3(0, Math.sin(BOOK_ELEV), Math.cos(BOOK_ELEV)), dist: stage.fitDistance(u.Wv * 1.25, 2 * 1.2, 1.04), instant });

  // ---- 屏幕上的东西（都做成纸） ----
  const last = JSON.parse(localStorage.getItem('livebook.last') || 'null');
  const next = nextLesson(books, last);
  const ui = h('div', { id: 'home' },
    h('header', { class: 'home-top' },
      h('div', { class: 'home-brand' }, h('b', {}, '活页课本'), h('span', {}, '纸上得来，不再浅')),
      searchBox(books, manifests)),
    h('section', { class: 'home-notes' },
      last ? h('a', { class: 'note-card', href: last.href }, h('small', {}, '继续上次'), h('b', {}, last.title), h('span', {}, last.where)) : null,
      next ? h('a', { class: 'note-card next', href: next.href }, h('small', {}, last ? '接着学' : '从这里开始'), h('b', {}, next.title), h('span', {}, next.where)) : null),
    authorCard(),
    h('footer', { class: 'home-foot' },
      h('button', { class: 'paper-btn', onclick: () => openOverview(books, manifests, subjects, pagesOk) }, '⊞ 活页总览'),
      !OFFLINE && (FEATURES.offline || import.meta.env.DEV) ? offlineButton() : null,          // 开关在 src/features.js；离线版里不用再下载
      h('span', { class: 'home-copy' }, '书里可以导入你自己下载的课本 PDF，文件只在这台电脑上使用')));
  document.body.append(ui);
  document.querySelector('#loader')?.classList.add('done');

  // 鼠标停在一本书上：它往外挪一点、立直一点，旁边一张小便签（翻到哪、活页做了几张）
  const slip = tag('', 'sticky slip', () => hover && openBook(hover.userData.id));
  slip.show(false);
  const showSlip = (g) => {
    if (!g) { slip.show(false); return; }
    const u = g.userData, p = progress(u.id, manifests[u.id]);
    slip.text(`<b>${u.b.full}</b><br>${p.where} · <span>活页 ${p.done}/${p.total}</span>`).loc(g, u.W * 0.28, u.T / 2 + 0.01, COVER_H * 0.36).show(true);
  };

  // ---- 指针：悬停抽出一点，点击拿下来 ----
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let hover = null, leaving = null;
  const pick = (e) => {
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, stage.camera);
    const hit = ray.intersectObjects(items.map((g) => g.userData.mesh), false)[0];
    return hit ? items.find((g) => g.userData.mesh === hit.object) : null;
  };
  const canvas = document.getElementById('c'), ac = new AbortController(), on = { signal: ac.signal };
  canvas.addEventListener('pointermove', (e) => {
    if (leaving) return;
    const g = pick(e);
    if (g !== hover) { hover = g; showSlip(g); }
    canvas.style.cursor = g ? 'pointer' : '';
  }, on);
  canvas.addEventListener('pointerleave', () => { if (!leaving) { hover = null; showSlip(null); } }, on);
  canvas.addEventListener('click', (e) => { const g = pick(e); if (g) openBook(g.userData.id); }, on);

  function openBook(id) {
    if (leaving) return;
    const g = items.find((x) => x.userData.id === id);
    if (!g) { location.href = `?book=${id}`; return; }
    leaving = g; hover = null; showSlip(null); canvas.style.cursor = '';
    ui.classList.add('leaving');
    g.userData.dir = 1;
    setTimeout(() => deskShot(g.userData), 160);
  }

  // 书落到书桌上、镜头停稳了：就在这个舞台上换成书里那本书
  function enter(g) {
    const u = g.userData;
    if (!enterBook) { location.href = `?book=${u.id}`; return; }
    history.pushState(null, '', `?book=${u.id}`);
    ac.abort(); ui.remove(); slip.remove(); stage.updaters.delete(tick);
    // 书架、墙、别的书都在镜头外面了（镜头在低头看书桌）：先收走；拿下来的这本留着，等书里那本书的封面画好了再收
    for (const o of [...group.children]) if (o !== g) { group.remove(o); disposeTree(o); }
    document.body.classList.remove('home'); document.body.classList.add('book-enter');
    document.documentElement.classList.remove('to-home');        // 从书里回到书架时 index.html 加的（藏起书里的按钮）：不去掉的话，再拿一本书进来，顶栏的目录、活页和翻页条都不见了
    enterBook(u.id, () => { stage.scene.remove(group); disposeTree(g); });
  }

  // 从书里回来（点了“‹ 书架”）：那本书先在书桌上，再放回架上
  let backFrom = null;
  try { backFrom = sessionStorage.getItem('livebook.homeFrom'); sessionStorage.removeItem('livebook.homeFrom'); } catch { /* 隐私模式 */ }
  const ret = items.find((g) => g.userData.id === backFrom);
  let waitCover = null;
  if (ret) {
    ret.userData.go = 1; applyPose(ret); deskShot(ret.userData, true);
    ui.classList.add('leaving');          // 书放回架上以后，屏幕上的纸片再浮出来
    // 书里最后一帧（合上的书）还盖在上面：等这本书的封面贴图好了（下面已经是同一个画面）再揭开，然后放回架上
    waitCover = { g: ret, t: 0, frames: 0, go: () => {
      window.__dropSnap?.();
      setTimeout(() => { ret.userData.dir = -1; homeShot(); }, 340);          // 盖着的截图淡出完了再动（不然有一两帧重影）
      setTimeout(() => ui.classList.remove('leaving'), 1000);
    } };
  } else { homeShot(true); window.__dropSnap?.(); }
  stage.onResize = () => { if (!leaving) homeShot(true); };

  const tick = (dt) => {
    if (waitCover) {
      const w = waitCover; w.t += dt; if (w.g.userData.coverReady) w.frames++;
      if (w.frames > 2 || w.t > 1.6) { waitCover = null; w.go(); }
    }
    for (const g of items) {
      const u = g.userData;
      if (u.dir) {
        u.go = clamp01(u.go + u.dir * dt * (u.dir > 0 ? 1.05 : 0.95));
        if (u.dir < 0 && u.go <= 0) u.dir = 0;
        if (u.dir > 0 && u.go >= 1) { u.wait = (u.wait || 0) + dt; if (!u.sent && (stage.settled(0.006) || u.wait > 0.9)) { u.sent = true; enter(g); return; } }      // 镜头停稳了再换（两边是同一个画面）
      }
      const want = hover === g ? 1 : 0;
      u.pull += (want - u.pull) * Math.min(1, dt * 9);
      applyPose(g);
    }
    updateTags(stage.camera);
  };
  stage.updaters.add(tick);
  stage.start();
  window.__home = { stage, items, openBook };          // 给测试、录屏脚本用（同书里的 window.__lb）
}

/** 收走一棵物体树：几何体、材质、贴图都释放 */
function disposeTree(root) {
  root.traverse((o) => {
    o.geometry?.dispose();
    for (const m of [].concat(o.material || [])) { m.map?.dispose(); m.emissiveMap?.dispose(); m.dispose(); }
  });
}

/** 程序生成的木纹（和书桌一样的做法，颜色浅一点、纹路细一点） */
function makeWood() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#ecd6b4'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 700; i++) {
    const y = Math.random() * 512, w = 140 + Math.random() * 420, x = Math.random() * 512 - 60, l = 48 + Math.random() * 20;
    g.strokeStyle = `hsla(${27 + Math.random() * 8}, 36%, ${l}%, ${0.05 + Math.random() * 0.1})`;
    g.lineWidth = 0.5 + Math.random() * 1.8;
    g.beginPath(); g.moveTo(x, y);
    for (let k = 1; k <= 6; k++) g.lineTo(x + (w * k) / 6, y + Math.sin(k * 0.9 + y) * 2.2 + (Math.random() - 0.5) * 1.4);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return t;
}

/** 层板前沿的小铜框标签：米色卡片插在铜框里，左边科目，右边小字 */
function labelCard(name, info, color) {
  const W = 1024, H = 136, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#c9a45e'); gr.addColorStop(0.5, '#e8cf8f'); gr.addColorStop(1, '#a8823f');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);                                       // 铜框
  g.fillStyle = '#fbf6ea'; g.fillRect(12, 12, W - 24, H - 24);                     // 卡片
  g.fillStyle = 'rgba(0,0,0,0.06)'; g.fillRect(12, 12, W - 24, 6);
  g.fillStyle = color; g.beginPath(); g.arc(64, H / 2, 14, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#2c3245'; g.textBaseline = 'middle';
  g.font = '700 78px "Kaiti SC", "STKaiti", "KaiTi", serif'; g.fillText([...name].join(' '), 98, H / 2 + 4);
  g.font = '46px "Songti SC", "STSong", serif'; g.fillStyle = '#6b5f48'; g.textAlign = 'right'; g.fillText(info, W - 40, H / 2 + 4);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.085), new THREE.MeshLambertMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.25 }));
  m.receiveShadow = true;
  return m;
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
      return { href: `?book=${bid}#live=${s.lesson}`, title: L.title, where: `${c.full} · ${L.fig} · ${L.sec}` };
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
      if (ch.page != null) entries.push({ kind: '章', title: ch.title, where: b.full, href: `?book=${b.id}#p=${ch.page}` });
      for (const s of ch.sections) if (s.page != null) entries.push({ kind: '节', title: s.title.replace(/^第.节\s*/, ''), where: `${b.full} · ${ch.title}`, href: `?book=${b.id}#p=${s.page}` });
    }
    for (const [id, L] of Object.entries(c.lessons)) entries.push({ kind: '活页', title: L.title, where: `${b.full} · ${L.fig} · ${L.sec}`, href: `?book=${b.id}#live=${id}`, done: stamps.has(id) });
  }
  const input = h('input', { type: 'search', placeholder: '搜一节课或一张活页，比如“凸透镜”“电解水”' });
  const list = h('div', { class: 'search-list', hidden: true });
  input.addEventListener('input', () => {
    const q = input.value.trim();
    list.innerHTML = '';
    if (!q) { list.hidden = true; return; }
    const hits = entries.filter((e) => e.title.includes(q) || e.where.includes(q)).sort((a, b) => (a.kind === '活页' ? -1 : 0) - (b.kind === '活页' ? -1 : 0)).slice(0, 10);
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
        return h('a', { class: 'ov-card', href: `?book=${bid}#live=${s.lesson}` }, thumb,
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
function authorCard() {
  const card = h('div', { class: 'home-author' },
    h('div', { class: 'author-qr', role: 'dialog', 'aria-label': '公众号二维码' },
      h('img', { src: fileUrl('/brand/gzh-qr.jpg'), width: 132, height: 132, alt: '德里克的 AI 教学实验室 公众号二维码' }),
      h('p', {}, '新的活页做好了，先在这里说'),
      h('small', {}, '微信扫一扫，或在微信里长按识别')),
    h('button', { class: 'author-chip', 'aria-expanded': 'false', onclick: (e) => { e.stopPropagation(); toggle(); } },
      h('img', { src: fileUrl('/brand/gzh-avatar.jpg'), width: 30, height: 30, alt: '' }),
      h('span', {}, h('b', {}, '德里克的 AI 教学实验室'), h('small', {}, '公众号 · 用 AI 做真实的教学实践'))));
  const toggle = (open = !card.classList.contains('open')) => {
    card.classList.toggle('open', open);
    card.querySelector('.author-chip').setAttribute('aria-expanded', String(open));
  };
  addEventListener('pointerdown', (e) => { if (!card.contains(e.target)) toggle(false); });
  return card;
}
