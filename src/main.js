import './polyfills.js';          // 先补上老浏览器缺的几个小函数（要在别的模块之前）
import * as THREE from 'three';
import { Stage } from './stage/Stage.js';
import { PageTextures } from './book/PageTextures.js';
import { createPageSource } from './book/PageSource.js';
import { mountImport } from './book/importPdf.js';
import { Book } from './book/Book.js';
import { Hotspots } from './book/Hotspots.js';
import { LiveLayer } from './live/LiveLayer.js';
import { World, worldBook } from './live/World.js';
import { Panel, stamps, h } from './ui/Panel.js';
import { updateTags } from './ui/tags.js';
import { getBook, bookList, bookHref, shelfHref, currentBookId, getManifest } from './content/index.js';
import { bootHome } from './home/Home.js';
import { bookmark, rememberLast } from './home/progress.js';
import { bootGeoWorld } from './world/GeoWorld.js';

const $ = (s) => document.querySelector(s);

const params = new URLSearchParams(location.search);
const BOOK_ID = currentBookId();

/**
 * 打开一本书。从书架上拿书进来时不重新加载页面：沿用同一个舞台（stage），书架那本书已经放大落在书桌上、镜头也已经就位；
 * 这边的书先藏着，封面贴图好了再露出来，然后调 handoff()——书架那边把自己那本收走。两本书一模一样大、同一个位置，看不出换过。
 */
async function bootBook(id, { stage = null, handoff = null } = {}) {
  const content = getBook(id);
  const manifest = await getManifest(content.id);
  $('#book-title').textContent = content.full;
  document.title = `活页课本 · ${content.full}`;

  stage ||= new Stage($('#c'));
  const source = await createPageSource(content, manifest);
  const textures = new PageTextures(source, manifest.pageCount, stage.renderer);
  mountImport({ content, manifest, source });
  const book = new Book(stage, manifest, textures);
  if (handoff) book.group.visible = false;
  const hotspots = new Hotspots(stage, book, content.spots);
  const panel = new Panel($('#panel'));
  const live = new LiveLayer({ stage, book, textures, hotspots, panel, content, onChange: (open) => {
    updateUI();
    const a = live.active;
    if (open && a && content.lessons[a.spot.lesson]) { const L = content.lessons[a.spot.lesson]; rememberLast({ book: content.id, page: a.spot.page, lesson: a.spot.lesson, title: L.title, where: `${content.full} · ${L.fig} · ${L.sec}` }); bookmark.set(content.id, a.spot.page); }
  } });
  stage.updaters.add(() => updateTags(stage.camera));
  // 高中地理：打开书，上方是这本书的地球主探索（src/live/World.js）
  const world = worldBook(content.id) ? new World({ stage, book, live, panel, content, manifest, textures, onBook: () => bookShot() }) : null;

  // ---------- 机位：合上时对准封面，翻开后对准整个跨页 ----------
  const bookShot = (instant = false, keepView = false) => {
    const c = book.current, W = book.W;
    const closedFront = c === 0, closedBack = c === book.leafCount;
    const cx = closedFront ? W / 2 : closedBack ? -W / 2 : 0;
    const w = closedFront || closedBack ? W * 1.25 : W * 2.04;
    const elev = THREE.MathUtils.degToRad(closedFront || closedBack ? 64 : 60);
    stage.shot({
      target: new THREE.Vector3(cx, 0, 0.06),
      dir: new THREE.Vector3(0, Math.sin(elev), Math.cos(elev)),
      dist: stage.fitDistance(w, book.H * 1.2, 1.04),
      instant, keepView,
    });
  };
  // 窗口大小变了（转屏、拖窗口）：没开实验就重新对准书；开着实验就按新的画面重新取景（正在凑近看时不打断）
  let rz = 0;
  stage.onResize = () => { if (!live.isOpen) return world && world.state !== 'book' ? world.reframe() : bookShot(); clearTimeout(rz); rz = setTimeout(() => live.reframe(), 250); };
  bookShot(true);

  // ---------- 加载：先要封面和前几页 ----------
  // 先要封面和前几页；一打开就要翻过去的（书签页、链接里指定的页），连同翻页动画里会露出来的那几张纸一起先加载——不然翻的时候露出白纸
  const q0 = new URLSearchParams(location.hash.slice(1));
  // 没有原书页（占位页）时，不停在封面：直接翻开一张活页（有书签就翻开书签那里或之后的第一张，没有就第一张）
  const spotsInOrder = [...content.spots].sort((a, b) => a.page - b.page);
  const autoSpot = source.kind === 'placeholder' && !world ? (spotsInOrder.find((x) => x.page >= (bookmark.get(content.id) ?? 0)) || spotsInOrder[0]) : null;          // 地理的地球主探索：打开就是地球目录，不自动翻开活页
  const startPage = q0.has('live') ? content.spots.find((x) => x.lesson === q0.get('live'))?.page : q0.has('p') ? Number(q0.get('p')) : autoSpot ? autoSpot.page : world ? 3 : bookmark.get(content.id);
  const firstPages = [...new Set([0, 1, 2, 3, 4, ...(startPage != null ? book.turnPages(book.leafForPage(startPage), 0) : [])])];
  if (startPage != null) textures.want(book.turnPages(book.leafForPage(startPage), 0).slice(-2));          // 目的地那个跨页的高清图也先要
  if (world && q0.get('via') === 'block') world.preloadBlock(q0.get('place'));          // 从地理世界切出一块地形进来：那块地形的高程和影像（浏览器里已经有了）先解开，和书页一起准备
  let started = false, snapHold = 0;
  textures.preload(firstPages, (p, firstReady) => {
    $('#loader').style.setProperty('--p', p);
    if (firstReady && !started) {
      started = true;
      for (const l of [book.leftTop, book.rightTop]) l.refresh();
      $('#loader').classList.add('done');
      snapHold = document.documentElement.classList.contains('snap') ? 0.34 : 0;          // 从地理世界点进来：那边最后一帧盖着，等它淡出完了再翻书、挪镜头（不然两本书错开，有重影）
      const hq = new URLSearchParams(location.hash.slice(1));
      const go = () => { window.__dropSnap?.(); if (handoff) { book.group.visible = true; handoff(); } handleHash(); };
      if (world && hq.get('via') === 'block') { snapHold = 0; world.prepareBlock(hq.get('live'), hq.get('place')).then(go, go); }          // 从地理世界切出一块地形进来：书先翻到那一页，那块地形摆在和那边最后一帧一样的地方，再揭开（只有四周从山换成课本）
      else go();
    }
  });
  stage.start();

  // ---------- 界面 ----------
  const pageLabel = () => {
    const [l, r] = book.spread, off = manifest.pageOffset;
    const name = (i) => (i == null ? null : i === 0 ? '封面' : i === manifest.pageCount - 1 ? '封底' : i - off >= 1 ? `第 ${i - off} 页` : '前言·目录');
    if (book.current === 0) return '封面';
    if (book.current === book.leafCount) return '封底';
    const a = name(l), b = name(r);
    if (l != null && r != null && l - off >= 1) return `第 ${l - off}–${r - off} 页`;
    return b || a;
  };
  const updateUI = () => {
    $('#page-label').textContent = pageLabel();
    $('#btn-prev').disabled = book.current === 0;
    $('#btn-next').disabled = book.current === book.leafCount;
    const ids = Object.keys(content.lessons);
    $('#stamp-count').textContent = `${ids.filter((id) => stamps.has(id)).length}/${ids.length}`;
  };
  addEventListener('stamp', updateUI);
  book.on((type) => {
    if (type === 'turned' || type === 'turncancel') { updateUI(); if (!world || world.state === 'book' || world.state === 'off') bookShot(false, book.current > 0 && book.current < book.leafCount); }          // 地球主探索时镜头由 World 安排
    if (type === 'turned' && book.current > 0) {
      const pg = book.spread[1] ?? book.spread[0];
      bookmark.set(content.id, pg);
      if (!live.isOpen) rememberLast({ book: content.id, page: pg, title: `${content.full} ${pageLabel()}`, where: '接着往下翻' });
    }
    if (type === 'turned' && pendingLesson) {
      const s = pendingLesson; pendingLesson = null;
      setTimeout(() => live.open(s), 350);
    }
  });
  updateUI();

  $('#btn-prev').onclick = () => !live.isOpen && !world?.busy && book.prev();
  $('#btn-next').onclick = () => !live.isOpen && !world?.busy && book.next();

  // 翻到含有某页的跨页
  let pendingLesson = null;
  const gotoPage = (idx, then) => {
    if (world) {          // 地球主探索：进活页走 World（上面不关、不重开，书跟着翻）；只翻页时先回到地球目录
      if (then) return world.enter(then.lesson);
      const go = () => book.turnTo(book.leafForPage(idx));
      if (world.state === 'topic') return world.toHub().then(go);
      return go();
    }
    if (live.isOpen) live.close();
    const target = book.leafForPage(idx);
    if (book.current === target && !book.busy) { if (then) live.open(then); return; }
    pendingLesson = then || null;
    book.turnTo(target);
  };

  // ---------- 顶栏“地球”：回到这本书的地球主探索（收起了就再叫出来） ----------
  const globeBtn = $('#btn-globe');
  if (globeBtn) { globeBtn.hidden = !world; globeBtn.onclick = () => { hideHint(); drawer.hidden = true; world?.wake(); }; }

  // ---------- 目录 / 这本书的活页 ----------
  const drawer = $('#drawer');
  const openDrawer = (kind) => {
    const body = $('#drawer-body');
    body.innerHTML = '';
    const off = manifest.pageOffset;
    if (kind === 'toc') {
      $('#drawer-title').textContent = '目录';
      const livePages = new Map(content.spots.map((s) => [s.page, s]));
      for (const ch of manifest.chapters) {
        body.append(h('div', { class: 'toc-ch', onclick: () => { gotoPage(ch.page); drawer.hidden = true; } }, ch.title, h('span', {}, ch.page == null || ch.page - off < 1 ? '' : ch.page - off)));
        ch.sections.forEach((sec, k) => {
          const end = ch.sections[k + 1]?.page ?? manifest.chapters[manifest.chapters.indexOf(ch) + 1]?.page ?? manifest.pageCount;
          const hasLive = [...livePages.keys()].some((p) => p >= sec.page && p < end);
          body.append(h('div', { class: 'toc-sec', onclick: () => { gotoPage(sec.page); drawer.hidden = true; } },
            h('div', {}, sec.title, hasLive ? h('b', { class: 'live-dot' }, ' ✦') : null), h('span', {}, sec.page - off)));
        });
      }
    } else if (kind === 'shelf') {
      $('#drawer-title').textContent = '书架';
      for (const b of bookList()) {
        const c = getBook(b.id);
        const done = Object.keys(c.lessons).filter((id) => stamps.has(id)).length;
        body.append(h('div', { class: `live-item ${b.id === content.id ? 'cur' : ''}`, onclick: () => { location.href = bookHref(b.id); } },
          h('div', { class: 'seal book' }, b.vol.replace('年级', '').replace('全一册', '全')),
          h('div', {}, h('h4', {}, b.full), h('p', {}, `活页 ${Object.keys(c.lessons).length} 张 · 已盖章 ${done}`))));
      }
    } else {
      $('#drawer-title').textContent = '这本书的活页';
      const seen = new Set();
      for (const s of content.spots) {
        if (seen.has(s.lesson)) continue;
        seen.add(s.lesson);
        const info = content.lessons[s.lesson];
        const got = stamps.has(s.lesson);
        body.append(h('div', { class: 'live-item', onclick: () => { drawer.hidden = true; world ? world.enter(s.lesson) : gotoPage(s.page, s); } },
          h('div', { class: `seal ${got ? 'got' : ''}` }, got ? '已做' : '未做'),
          h('div', {}, h('h4', {}, info.title), h('p', {}, `${info.fig} · 第 ${s.page - off} 页 · ${info.sec}`))));
      }
      body.append(h('p', { class: 'note', style: 'padding: 12px 20px' }, '每张活页：先预测，再动手，最后掀开课本上的结论对照，盖一个章（观察、探究、测量或推理）。'));
    }
    drawer.hidden = false;
  };
  $('#btn-toc').onclick = () => (!drawer.hidden && $('#drawer-title').textContent === '目录' ? (drawer.hidden = true) : openDrawer('toc'));
  $('#btn-live').onclick = () => openDrawer('live');
  // 回到书架：先合上书（开着活页就先收起），镜头回到合上的样子；把这一帧留给书架那边，换页面时先盖着，那边画好了再揭开——这本书接着从书桌上放回架上
  // 地理书回到地理世界（书圈里这本书转到正前方）：一样先合上书，那边接着这一帧把书升回书圈
  const toWorld = content.id.startsWith('dili-');
  if (toWorld) { $('#btn-shelf').textContent = '‹ 地理世界'; $('#btn-shelf').title = '回到地理世界：所有地理课本和那颗地球'; }
  let toShelf = false;
  $('#btn-shelf').onclick = () => {
    if (toShelf) return;
    toShelf = true;
    drawer.hidden = true; hideHint();
    document.body.classList.add('shelf-leave');
    if (live.isOpen) live.close();
    world?.hide();          // 地球沉回书里，书再合上
    stage.calm = true;          // 不跟着鼠标晃：两边同一个画面
    const t0 = performance.now();
    const wait = () => {
      if (!live.isOpen && !book.busy && book.current !== 0) {
        book.turnTo(0);
        // 一边合书，镜头一边回到合上的样子（不等翻完再挪）
        stage.shot({ target: new THREE.Vector3(book.W / 2, 0, 0.06), dir: new THREE.Vector3(0, Math.sin(THREE.MathUtils.degToRad(64)), Math.cos(THREE.MathUtils.degToRad(64))), dist: stage.fitDistance(book.W * 1.25, book.H * 1.2, 1.04) });
      }
      const settled = !live.isOpen && !book.busy && book.current === 0 && !world?.busy && stage.settled(0.004, { parallax: true });
      if (!settled && performance.now() - t0 < 4000) { requestAnimationFrame(wait); return; }
      try {
        sessionStorage.setItem(toWorld ? 'livebook.worldFrom' : 'livebook.homeFrom', content.id);
        sessionStorage.setItem('livebook.snap', stage.snapshot());
      } catch { /* 隐私模式 / 存不下：照常换页面 */ }
      location.href = toWorld ? `${shelfHref()}?subject=dili&focus=${content.id}` : shelfHref();
    };
    requestAnimationFrame(wait);
  };
  drawer.querySelector('[data-close]').onclick = () => (drawer.hidden = true);

  // ---------- 指针：点/拖书页翻页，点发光的图打开实验 ----------
  const canvas = $('#c');
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const setNdc = (e) => ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  let press = null;

  const pagePixelWidth = () => {
    const a = new THREE.Vector3(0, 0, 0).project(stage.camera), b = new THREE.Vector3(book.W, 0, 0).project(stage.camera);
    return Math.max(80, Math.abs(b.x - a.x) * innerWidth / 2);
  };

  // 视角：左键拖空白处 = 旋转；右键拖 / Shift+拖 / 双指拖 = 平移；滚轮 / 捏合 = 缩放；双击空白 = 复位
  const touches = new Map();
  let pinch = null;
  const camPress = (e, mode) => { stage._interacting = true; return { cam: mode, lx: e.clientX, ly: e.clientY, moved: 0 }; };

  canvas.addEventListener('pointerdown', (e) => {
    setNdc(e);
    canvas.setPointerCapture(e.pointerId);
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size === 2) {                       // 两根手指：捏合缩放 + 平移，取消正在进行的其他操作
      if (press?.dragging) book.endDrag(false);
      if (press?.live) live.pointerUp(ndc, e);
      const [p1, p2] = [...touches.values()];
      pinch = { d: Math.hypot(p1.x - p2.x, p1.y - p2.y), mx: (p1.x + p2.x) / 2, my: (p1.y + p2.y) / 2 };
      press = null; stage._interacting = true;
      return;
    }
    if (e.button === 2 || e.shiftKey) { press = camPress(e, 'pan'); return; }
    if (world) { ray.setFromCamera(ndc, stage.camera); if (world.pointerDown(ray, e)) { press = { world: true }; return; } }          // 地球主探索：拖地球、点旗、点角上的地球回去
    if (live.isOpen) { press = live.pointerDown(ndc, e) ? { live: true } : camPress(e, 'orbit'); return; }
    if (book.busy) return;
    ray.setFromCamera(ndc, stage.camera);
    const spot = hotspots.pick(ray);
    if (spot) { press = { spot, x: e.clientX, y: e.clientY }; return; }
    const hits = ray.intersectObjects([book.rightTop.front, book.leftTop.back, book.stackR, book.stackL], false);
    if (!hits.length) { press = camPress(e, 'orbit'); return; }
    const onRight = hits[0].point.x > 0;
    press = { x: e.clientX, y: e.clientY, dir: onRight ? 1 : -1, dragging: false, t: performance.now(), lastX: e.clientX, v: 0 };
  });

  canvas.addEventListener('pointermove', (e) => {
    setNdc(e);
    if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && touches.size === 2) {
      const [p1, p2] = [...touches.values()];
      const d = Math.hypot(p1.x - p2.x, p1.y - p2.y), mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
      stage.zoomBy(pinch.d / Math.max(1, d), new THREE.Vector2((mx / innerWidth) * 2 - 1, -(my / innerHeight) * 2 + 1));
      stage.panBy(mx - pinch.mx, my - pinch.my);
      Object.assign(pinch, { d, mx, my });
      return;
    }
    if (press?.cam) {
      const dx = e.clientX - press.lx, dy = e.clientY - press.ly;
      press.lx = e.clientX; press.ly = e.clientY; press.moved += Math.abs(dx) + Math.abs(dy);
      if (press.cam === 'orbit') stage.orbit(dx, dy); else stage.panBy(dx, dy);
      canvas.style.cursor = 'grabbing';
      return;
    }
    if (press?.world) { ray.setFromCamera(ndc, stage.camera); world.pointerMove(ray, e); return; }
    if (world && !press) { ray.setFromCamera(ndc, stage.camera); if (world.pointerMove(ray, e)) { hotspots.setHover(null); return; } }
    if (live.isOpen) { live.pointerMove(ndc, e); return; }
    if (press && press.dir) {
      const dx = e.clientX - press.x, dy = e.clientY - press.y;
      // 在书页上竖着拖：当作转动视角（横着拖才是翻页）
      if (!press.dragging && Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx) * 1.3) { press = camPress(e, 'orbit'); return; }
      if (!press.dragging && Math.abs(dx) > 8 && Math.sign(-dx) === press.dir) {
        press.dragging = book.beginDrag(press.dir);
        hideHint();
      }
      if (press.dragging) {
        const now = performance.now();
        press.v = (e.clientX - press.lastX) / Math.max(1, now - press.t);
        press.t = now; press.lastX = e.clientX;
        book.dragTo((-dx * press.dir) / (pagePixelWidth() * 1.7));
      }
      return;
    }
    if (!book.busy) {
      ray.setFromCamera(ndc, stage.camera);
      const spot = hotspots.pick(ray);
      hotspots.setHover(spot);
      canvas.style.cursor = spot ? 'pointer' : 'grab';
    }
  });

  const release = (e) => {
    setNdc(e);
    touches.delete(e.pointerId);
    if (pinch) { if (touches.size < 2) { pinch = null; stage._interacting = false; } press = null; return; }
    const p = press; press = null;
    if (p?.world) { world.pointerUp(); return; }
    if (p?.cam) {
      stage._interacting = false;
      canvas.style.cursor = '';
      // 凑近观察时，点空白处返回；拖动空白处仍然可以绕着器材看。
      if (e.type === 'pointerup' && p.cam === 'orbit' && p.moved < 5 && live.isOpen) live.exitLook();
      updateViewCtl();
      return;
    }
    if (live.isOpen) { live.pointerUp(ndc, e); return; }
    if (!p) return;
    if (p.spot) { hideHint(); world ? world.enter(p.spot.lesson) : live.open(p.spot); return; }
    if (p.dragging) {
      const prog = book.anim?.p ?? 0;
      const flick = -p.v * p.dir > 0.5;
      book.endDrag(prog > 0.33 || flick);
    } else if (p.dir) {
      hideHint();
      p.dir > 0 ? book.next() : book.prev();
    }
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const k = e.ctrlKey ? 0.012 : 0.0016;       // 触控板捏合时 ctrlKey 为真，步子要大一些
    stage.zoomBy(Math.exp(e.deltaY * k), new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1));
    updateViewCtl();
  }, { passive: false });
  canvas.addEventListener('dblclick', () => { stage.resetView(); updateViewCtl(); });

  // 右下角的视角按钮
  const viewctl = h('div', { id: 'viewctl' },
    h('button', { title: '放大（滚轮 / 双指捏合）', onclick: () => { stage.zoomBy(0.8); updateViewCtl(); } }, '＋'),
    h('button', { title: '缩小', onclick: () => { stage.zoomBy(1.25); updateViewCtl(); } }, '－'),
    h('button', { class: 'reset', title: '复位视角（双击空白处）', onclick: () => { stage.resetView(); updateViewCtl(); } }, '⟲'));
  document.body.append(viewctl);
  function updateViewCtl() { setTimeout(() => viewctl.classList.toggle('changed', stage.viewChanged), 30); }
  stage.updaters.add(() => { if (stage._interacting) updateViewCtl(); });

  addEventListener('keydown', (e) => {
    if (e.target.closest?.('input, textarea')) return;
    if (e.key === 'Escape') { if (world && world.state === 'topic') world.toHub(); else if (live.isOpen) live.close(); else drawer.hidden = true; }
    if (live.isOpen || world?.busy) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); book.next(); hideHint(); }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); book.prev(); }
    if (e.key === 't' || e.key === 'T') openDrawer('toc');
  });

  let hintTimer = setTimeout(hideHint, 14000);
  function hideHint() { clearTimeout(hintTimer); $('#hint').classList.add('gone'); }

  // ---------- 深链接：#p=23 翻到 PDF 第 23 页，#live=lever 直接打开实验 ----------
  function handleHash() {
    const q = new URLSearchParams(location.hash.slice(1));
    if (snapHold && !(world && q.get('live'))) { const t = snapHold; snapHold = 0; setTimeout(handleHash, t * 1000); return; }          // 上一页最后一帧还盖着：淡出完了再翻书（地球主探索的活页自己等，先把角上的地球摆好）
    if (world) {          // 地球主探索：#live=front 直接进那张活页；别的都从地球目录开始
      hideHint();
      const id = q.get('live');
      if (id && content.lessons[id]) { const pn = q.has('place') ? world.items?.find((x) => x.id === id)?.anchor.pins?.find((x) => x.place === q.get('place') || x.name === q.get('place')) : null; const hold = snapHold; snapHold = 0; return world.enter(id, { quick: true, pn, hold }); }          // &place=cb：从地理世界的哪一面旗进来
      if (q.has('p')) { const pg = Number(q.get('p')); return world.state === 'off' ? world.start().then(() => book.turnTo(book.leafForPage(pg))) : book.turnTo(book.leafForPage(pg)); }
      return world.start();
    }
    if (!q.has('live') && !q.has('p')) {      // 没指定：翻到上次的书签页（没有原书页时直接翻开活页）
      if (autoSpot) { hideHint(); setTimeout(() => gotoPage(autoSpot.page, autoSpot), 420); return; }
      const bm = bookmark.get(content.id);
      if (bm) { hideHint(); setTimeout(() => gotoPage(bm), 420); }
      return;
    }
    if (q.has('live')) {
      const s = content.spots.find((x) => x.lesson === q.get('live'));
      if (s) { hideHint(); return gotoPage(s.page, s); }
    }
    if (q.has('p')) { hideHint(); gotoPage(Number(q.get('p'))); }
  }
  addEventListener('hashchange', handleHash);

  window.__lb = { stage, book, live, hotspots, textures, world };
}

// 从书架拿书进来以后（地址栏已经切到教材路径），按浏览器的“后退”：回到书架（重新加载）
addEventListener('popstate', () => location.reload());


// ?subject=dili：地理世界（一颗地球，所有地理课本围成一圈在它下面；src/world/GeoWorld.js）
const start = params.get('subject') === 'dili' ? bootGeoWorld(new Stage($('#c')), { focus: params.get('focus') }) : BOOK_ID ? bootBook(BOOK_ID) : (() => {
  const stage = new Stage($('#c'));
  return bootHome(stage, { enterBook: (id, handoff) => bootBook(id, { stage, handoff }), enterWorld: (focus, opts) => bootGeoWorld(stage, { focus, ...opts }) });
})();
start.catch((err) => {
  console.error(err);
  $('.loader-msg').textContent = '加载失败：' + err.message;
});
