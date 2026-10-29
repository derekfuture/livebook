// 首页：书桌上摆着“我的课本”。点一本书，它滑到桌子中间、翻开到上次的书签页。
// 也可以：继续上次 / 接着学下一个实验 / 搜一节课或一个实验 / 实验总览。
import * as THREE from 'three';
import { getBook, bookList } from '../content/index.js';
import { stamps, h } from '../ui/Panel.js';
import { tag, updateTags } from '../ui/tags.js';
import { progress } from './progress.js';

const COVER_H = 0.62, THICK = 0.035;

export async function bootHome(stage) {
  // 旧链接 /#live=convex：找到实验所在的书，直接打开
  const q = new URLSearchParams(location.hash.slice(1));
  if (q.has('live')) {
    const b = bookList().find((x) => getBook(x.id).lessons[q.get('live')]);
    if (b) { location.replace(`?book=${b.id}${location.hash}`); return; }
  }
  document.body.classList.add('home');
  const books = bookList();
  const manifests = Object.fromEntries(await Promise.all(books.map(async (b) => [b.id, await (await fetch(`${getBook(b.id).base}book.json`)).json()])));
  const loader = new THREE.TextureLoader();

  // ---- 桌上的书 ----
  const group = new THREE.Group();
  stage.scene.add(group);
  const items = books.map((b, i) => {
    const man = manifests[b.id];
    const W = (COVER_H * man.pageSize[0]) / man.pageSize[1];
    const cover = loader.load(`${getBook(b.id).base}hi/000.jpg`);
    cover.colorSpace = THREE.SRGBColorSpace;
    cover.anisotropy = 8;
    const pages = new THREE.MeshLambertMaterial({ color: 0xf6f0e2 });
    const back = new THREE.MeshLambertMaterial({ color: 0x3f7cb0 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(W, THICK, COVER_H), [pages, back, new THREE.MeshLambertMaterial({ map: cover }), back, pages, pages]);
    mesh.castShadow = mesh.receiveShadow = true;
    const g = new THREE.Group();
    g.add(mesh);
    // 宽屏：一排；手机竖屏：错开摞成一列
    const narrow = innerWidth < innerHeight;
    // 手机：一本一行，书在左、进度便签在右，互不遮挡
    const x = narrow ? -0.17 : (i - (books.length - 1) / 2) * (W + 0.18);
    const z = narrow ? (i - (books.length - 1) / 2) * (COVER_H + 0.07) : 0.05;
    g.position.set(x, THICK / 2, z);
    g.rotation.y = (narrow ? [0.03, -0.02, 0.025] : [0.06, -0.03, 0.05])[i % 3];
    g.userData = { id: b.id, mesh, base: g.position.clone(), lift: 0, W };
    group.add(g);
    // 进度便签（贴在书的右下角）
    const p = progress(b.id, man);
    const note = tag(`<b>${b.title.replace('物理 ', '')}</b><br>${p.where}<br><span>实验 ${p.done}/${p.total}</span>`, 'sticky', () => openBook(b.id));
    if (narrow) note.loc(g, W / 2 + 0.2, THICK + 0.01, 0); else note.loc(g, W * 0.32, THICK + 0.01, COVER_H * 0.42);
    return g;
  });

  // ---- 机位：从斜上方看整张书桌 ----
  const narrow = innerWidth < innerHeight;
  stage.shot(narrow
    ? { target: new THREE.Vector3(0, 0, 0.26), dir: new THREE.Vector3(0, Math.sin(1.4), Math.cos(1.4)), dist: stage.fitDistance(0.9, 3.6, 1.0), instant: true }   // 上面留给标题和搜索，下面留给便签
    : { target: new THREE.Vector3(0, 0, 0.2), dir: new THREE.Vector3(0, Math.sin(1.05), Math.cos(1.05)), dist: stage.fitDistance(books.length * 0.6 + 0.3, 1.45, 1.0), instant: true });   // 书在上半部分，下面留给便签

  // ---- 屏幕上的东西（都做成纸） ----
  const last = JSON.parse(localStorage.getItem('livebook.last') || 'null');
  const next = nextLesson(books, last);
  const ui = h('div', { id: 'home' },
    h('header', { class: 'home-top' },
      h('div', { class: 'home-brand' }, h('b', {}, '活页课本'), h('span', {}, '把课本里的图，变成能动手做的实验')),
      searchBox(books, manifests)),
    h('section', { class: 'home-notes' },
      last ? h('a', { class: 'note-card', href: last.href }, h('small', {}, '继续上次'), h('b', {}, last.title), h('span', {}, last.where)) : null,
      next ? h('a', { class: 'note-card next', href: next.href }, h('small', {}, last ? '接着学' : '从这里开始'), h('b', {}, next.title), h('span', {}, next.where)) : null),
    authorCard(),
    h('footer', { class: 'home-foot' },
      h('button', { class: 'paper-btn', onclick: () => openOverview(books, manifests) }, '⊞ 实验总览'),
      h('span', { class: 'home-copy' }, '课本页面来自本地教材文件，仅供个人学习使用')));
  document.body.append(ui);
  document.querySelector('#loader')?.classList.add('done');

  // ---- 指针：悬停抬起，点击打开 ----
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let hover = null, leaving = false;
  const pick = (e) => {
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, stage.camera);
    const hit = ray.intersectObjects(items.map((g) => g.userData.mesh), false)[0];
    return hit ? items.find((g) => g.userData.mesh === hit.object) : null;
  };
  const canvas = document.getElementById('c');
  canvas.addEventListener('pointermove', (e) => { hover = pick(e); canvas.style.cursor = hover ? 'pointer' : ''; });
  canvas.addEventListener('click', (e) => { const g = pick(e); if (g) openBook(g.userData.id); });

  function openBook(id) {
    if (leaving) return;
    leaving = id;
    const g = items.find((x) => x.userData.id === id);
    ui.classList.add('leaving');
    // 书滑到中间、抬起，镜头跟过去，然后进入书本
    g.userData.go = 0;
    stage.shot({ target: new THREE.Vector3(0, 0.05, 0.05), dir: new THREE.Vector3(0, Math.sin(1.2), Math.cos(1.2)), dist: 1.3 });
    setTimeout(() => { location.href = `?book=${id}`; }, 750);
  }

  stage.updaters.add((dt, t) => {
    for (const g of items) {
      const u = g.userData;
      const target = leaving === u.id ? 0.08 : hover === g ? 0.025 : 0;
      u.lift += (target - u.lift) * Math.min(1, dt * 8);
      if (u.go != null) {
        u.go = Math.min(1, u.go + dt * 2);
        g.position.lerpVectors(u.base, new THREE.Vector3(0, THICK / 2, 0.05), 1 - Math.pow(1 - u.go, 3));
        g.rotation.y *= 1 - u.go * 0.2;
      }
      g.position.y = u.base.y + u.lift;
      g.rotation.x = -u.lift * 0.6;
      if (leaving && leaving !== u.id) g.position.x += (g.position.x > 0 ? 1 : -1) * dt * 0.6;
    }
    updateTags(stage.camera);
  });
  stage.start();
}

/** 下一个还没做的实验：上次那本书里、上次那个之后的第一个；没有就从第一本书开始。 */
function nextLesson(books, last) {
  const order = last ? [last.book, ...books.map((b) => b.id).filter((id) => id !== last.book)] : books.map((b) => b.id);
  for (const bid of order) {
    const c = getBook(bid);
    const spots = [...new Map(c.spots.map((s) => [s.lesson, s])).values()].sort((a, b) => a.page - b.page);
    const after = last && last.book === bid ? spots.filter((s) => s.page >= last.page && s.lesson !== last.lesson) : spots;
    const s = after.find((x) => !stamps.has(x.lesson)) || spots.find((x) => !stamps.has(x.lesson));
    if (s) {
      const L = c.lessons[s.lesson];
      return { href: `?book=${bid}#live=${s.lesson}`, title: L.title, where: `${c.title.replace('物理 ', '')} · ${L.fig} · ${L.sec}` };
    }
  }
  return null;
}

/** 搜索：三本书的章、节标题 + 所有实验 */
function searchBox(books, manifests) {
  const entries = [];
  for (const b of books) {
    const c = getBook(b.id), man = manifests[b.id], short = b.title.replace('物理 ', '');
    for (const ch of man.chapters) {
      if (ch.page != null) entries.push({ kind: '章', title: ch.title, where: short, href: `?book=${b.id}#p=${ch.page}` });
      for (const s of ch.sections) if (s.page != null) entries.push({ kind: '节', title: s.title.replace(/^第.节\s*/, ''), where: `${short} · ${ch.title}`, href: `?book=${b.id}#p=${s.page}` });
    }
    for (const [id, L] of Object.entries(c.lessons)) entries.push({ kind: '实验', title: L.title, where: `${short} · ${L.fig} · ${L.sec}`, href: `?book=${b.id}#live=${id}`, done: stamps.has(id) });
  }
  const input = h('input', { type: 'search', placeholder: '搜一节课、一个实验，比如“凸透镜”“沸腾”' });
  const list = h('div', { class: 'search-list', hidden: true });
  input.addEventListener('input', () => {
    const q = input.value.trim();
    list.innerHTML = '';
    if (!q) { list.hidden = true; return; }
    const hits = entries.filter((e) => e.title.includes(q) || e.where.includes(q)).sort((a, b) => (a.kind === '实验' ? -1 : 0) - (b.kind === '实验' ? -1 : 0)).slice(0, 10);
    for (const e of hits) list.append(h('a', { href: e.href, class: 'search-item' }, h('i', { class: `k k-${e.kind}` }, e.kind), h('b', {}, e.title), h('span', {}, e.where)));
    if (!hits.length) list.append(h('div', { class: 'search-empty' }, '没有找到。试试换个词。'));
    list.hidden = false;
  });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') list.querySelector('a')?.click(); });
  return h('div', { class: 'home-search' }, input, list);
}

/** 实验总览：按书、按章节排的实验卡片，缩略图截取课本上的原图 */
function openOverview(books, manifests) {
  const body = h('div', { class: 'ov-body' });
  const tabs = h('div', { class: 'ov-tabs' });
  const show = (bid) => {
    body.innerHTML = '';
    tabs.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x.dataset.id === bid));
    const c = getBook(bid), man = manifests[bid];
    const seen = new Set();
    for (const ch of man.chapters) {
      const end = man.chapters[man.chapters.indexOf(ch) + 1]?.page ?? man.pageCount;
      const spots = c.spots.filter((s) => s.page >= (ch.page ?? 0) && s.page < end && !seen.has(s.lesson) && seen.add(s.lesson));
      const planned = Object.keys(c.planned ? {} : {}).length;
      if (!spots.length) continue;
      body.append(h('h3', {}, ch.title));
      body.append(h('div', { class: 'ov-grid' }, spots.map((s) => {
        const L = c.lessons[s.lesson], [x0, y0, x1, y1] = s.bbox, PW = man.pageSize[0], PH = man.pageSize[1];
        const thumb = h('div', { class: 'ov-thumb' });
        Object.assign(thumb.style, {
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
  for (const b of books) tabs.append(h('button', { 'data-id': b.id, onclick: () => show(b.id) }, b.title.replace('物理 ', '')));
  const sheet = h('div', { id: 'overview' },
    h('div', { class: 'ov-paper' },
      h('div', { class: 'ov-head' }, h('h2', {}, '实验总览'), tabs, h('button', { class: 'ov-close', onclick: () => sheet.remove() }, '合上 ×')),
      body));
  document.body.append(sheet);
  show(books[0].id);
}

// 书桌左下角的作者小签：公众号头像 + 名字；悬停（手机上点一下）展开二维码。只放在书桌上，书里和实验里不打扰。
function authorCard() {
  const base = import.meta.env.BASE_URL;
  const card = h('div', { class: 'home-author' },
    h('div', { class: 'author-qr', role: 'dialog', 'aria-label': '公众号二维码' },
      h('img', { src: `${base}brand/gzh-qr.jpg`, width: 132, height: 132, alt: '德里克的 AI 教学实验室 公众号二维码' }),
      h('p', {}, '微信扫一扫，关注更新'),
      h('small', {}, '在微信里打开可长按识别')),
    h('button', { class: 'author-chip', 'aria-expanded': 'false', onclick: (e) => { e.stopPropagation(); toggle(); } },
      h('img', { src: `${base}brand/gzh-avatar.jpg`, width: 30, height: 30, alt: '' }),
      h('span', {}, h('b', {}, '德里克的 AI 教学实验室'), h('small', {}, '公众号 · 扫码关注'))));
  const toggle = (open = !card.classList.contains('open')) => {
    card.classList.toggle('open', open);
    card.querySelector('.author-chip').setAttribute('aria-expanded', String(open));
  };
  addEventListener('pointerdown', (e) => { if (!card.contains(e.target)) toggle(false); });
  return card;
}

