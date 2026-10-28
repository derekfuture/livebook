import * as THREE from 'three';
import { Stage } from './stage/Stage.js';
import { PageTextures } from './book/PageTextures.js';
import { Book } from './book/Book.js';
import { Hotspots } from './book/Hotspots.js';
import { LiveLayer } from './live/LiveLayer.js';
import { Panel, stamps, h } from './ui/Panel.js';
import { updateTags } from './ui/tags.js';
import { getBook, bookList } from './content/index.js';
import { bootHome } from './home/Home.js';
import { bookmark, rememberLast } from './home/progress.js';

const $ = (s) => document.querySelector(s);

// 页面结构：没有 ?book= 就是首页（书桌）；有就是那本书
const params = new URLSearchParams(location.search);
const BOOK_ID = params.get('book');
const content = getBook(BOOK_ID || 'wuli-8s');

async function boot() {
  const manifest = await (await fetch(`${content.base}book.json`)).json();
  $('#book-title').textContent = manifest.title;
  document.title = `活页课本 · ${manifest.title}`;

  const stage = new Stage($('#c'));
  const textures = new PageTextures(content.base, manifest.pageCount, stage.renderer);
  const book = new Book(stage, manifest, textures);
  const hotspots = new Hotspots(stage, book, content.spots);
  const panel = new Panel($('#panel'));
  const live = new LiveLayer({ stage, book, textures, hotspots, panel, content, onChange: (open) => {
    updateUI();
    const a = live.active;
    if (open && a) { const L = content.lessons[a.spot.lesson]; rememberLast({ book: content.id, page: a.spot.page, lesson: a.spot.lesson, title: L.title, where: `${manifest.title.replace('物理 ', '')} · ${L.fig} · ${L.sec}` }); bookmark.set(content.id, a.spot.page); }
  } });
  stage.updaters.add(() => updateTags(stage.camera));

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
  stage.onResize = () => { if (!live.isOpen) return bookShot(); clearTimeout(rz); rz = setTimeout(() => live.reframe(), 250); };
  bookShot(true);

  // ---------- 加载：先要封面和前几页 ----------
  const firstPages = [0, 1, 2, 3, 4];
  let started = false;
  textures.preload(firstPages, (p, firstReady) => {
    $('#loader').style.setProperty('--p', p);
    if (firstReady && !started) {
      started = true;
      for (const l of [book.leftTop, book.rightTop]) l.refresh();
      $('#loader').classList.add('done');
      handleHash();
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
    if (type === 'turned' || type === 'turncancel') { updateUI(); bookShot(false, book.current > 0 && book.current < book.leafCount); }
    if (type === 'turned' && book.current > 0) {
      const pg = book.spread[1] ?? book.spread[0];
      bookmark.set(content.id, pg);
      if (!live.isOpen) rememberLast({ book: content.id, page: pg, title: `${manifest.title.replace('物理 ', '')} ${pageLabel()}`, where: '接着往下翻' });
    }
    if (type === 'turned' && pendingLesson) {
      const s = pendingLesson; pendingLesson = null;
      setTimeout(() => live.open(s), 350);
    }
  });
  updateUI();

  $('#btn-prev').onclick = () => !live.isOpen && book.prev();
  $('#btn-next').onclick = () => !live.isOpen && book.next();

  // 翻到含有某页的跨页
  let pendingLesson = null;
  const gotoPage = (idx, then) => {
    if (live.isOpen) live.close();
    const target = book.leafForPage(idx);
    if (book.current === target && !book.busy) { if (then) live.open(then); return; }
    pendingLesson = then || null;
    book.turnTo(target);
  };

  // ---------- 目录 / 会动的图 ----------
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
        body.append(h('div', { class: `live-item ${b.id === content.id ? 'cur' : ''}`, onclick: () => { location.href = `?book=${b.id}`; } },
          h('div', { class: 'seal book' }, b.title.replace('物理 ', '').replace('年级', '').replace('全一册', '')),
          h('div', {}, h('h4', {}, b.title), h('p', {}, `会动的图 ${Object.keys(c.lessons).length} 个 · 已盖章 ${done}`))));
      }
    } else {
      $('#drawer-title').textContent = '会动的图';
      const seen = new Set();
      for (const s of content.spots) {
        if (seen.has(s.lesson)) continue;
        seen.add(s.lesson);
        const info = content.lessons[s.lesson];
        const got = stamps.has(s.lesson);
        body.append(h('div', { class: 'live-item', onclick: () => { drawer.hidden = true; gotoPage(s.page, s); } },
          h('div', { class: `seal ${got ? 'got' : ''}` }, got ? '已做' : '未做'),
          h('div', {}, h('h4', {}, info.title), h('p', {}, `${info.fig} · 第 ${s.page - off} 页 · ${info.sec}`))));
      }
      body.append(h('p', { class: 'note', style: 'padding: 12px 20px' }, '每个实验：先预测，再动手，做完掀开课本上的结论对照，盖一个章（观察、探究、测量或推理）。'));
    }
    drawer.hidden = false;
  };
  $('#btn-toc').onclick = () => (!drawer.hidden && $('#drawer-title').textContent === '目录' ? (drawer.hidden = true) : openDrawer('toc'));
  $('#btn-live').onclick = () => openDrawer('live');
  $('#btn-shelf').onclick = () => { location.href = location.pathname; };
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
    if (p?.cam) { stage._interacting = false; canvas.style.cursor = ''; updateViewCtl(); return; }
    if (live.isOpen) { live.pointerUp(ndc, e); return; }
    if (!p) return;
    if (p.spot) { hideHint(); live.open(p.spot); return; }
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
    if (e.key === 'Escape') { if (live.isOpen) live.close(); else drawer.hidden = true; }
    if (live.isOpen) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); book.next(); hideHint(); }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); book.prev(); }
    if (e.key === 't' || e.key === 'T') openDrawer('toc');
  });

  let hintTimer = setTimeout(hideHint, 14000);
  function hideHint() { clearTimeout(hintTimer); $('#hint').classList.add('gone'); }

  // ---------- 深链接：#p=23 翻到 PDF 第 23 页，#live=lever 直接打开实验 ----------
  function handleHash() {
    const q = new URLSearchParams(location.hash.slice(1));
    if (!q.has('live') && !q.has('p')) {      // 没指定：翻到上次的书签页
      const bm = bookmark.get(content.id);
      if (bm) { hideHint(); setTimeout(() => gotoPage(bm), 500); }
      return;
    }
    if (q.has('live')) {
      const s = content.spots.find((x) => x.lesson === q.get('live'));
      if (s) { hideHint(); return gotoPage(s.page, s); }
    }
    if (q.has('p')) { hideHint(); gotoPage(Number(q.get('p'))); }
  }
  addEventListener('hashchange', handleHash);

  window.__lb = { stage, book, live, hotspots, textures };
}


const start = BOOK_ID ? boot() : bootHome(new Stage($('#c')));
start.catch((err) => {
  console.error(err);
  $('.loader-msg').textContent = '加载失败：' + err.message;
});
