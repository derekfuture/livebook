// 化学课（新标准）的脚手架：每一课都要的那几样东西，统一在这里。
// 一课只需要写：器材、化学模型、步骤（lessonBar 的 steps + 每一步要动的东西）。
//
//   paperSheet(group, opts)          器材脚下一层淡淡的白（把书页上的字压下去，书页还在）
//   sandbox({ get, set, fresh, ... }) 老师演示用的独立一套器材：开始时存下学生的状态、换一套新的；结束时恢复
//   think(opts)                      学案上的一道“想一想”：标题、学生自己的记录（上下文）、问题、选项
//   wrapPointer(drag, bar)           放映的时候点一下画面：退出放映，把器材交还给学生
//   mountXuean(ui, opts)             学案式面板：控件、记录表（改标题）、开场的一句话
//   guards(getS, getW, bar)          status / done：演示里的操作不写进学生的面板、不算学生的步骤
//   qaFlow(drag, steps)              给 tools/qa.mjs --flow 用的一串操作（放进 debug.qa）
//   demoActs(drag, group)            老师演示里“真的去做”：器材沿路线移过去（走学生拖放的同一套处理函数）
import * as THREE from 'three';
import { buttons, table } from './ui.js';
import { canvasTex } from './props.js';
import { h } from '../../ui/Panel.js';

let sheetTex = null;
export function paperSheet(group, { w = 0.6, d = 0.3, x = 0, z = 0.03 } = {}) {
  sheetTex ||= canvasTex(512, 256, (g, W, H) => {
    const gr = g.createRadialGradient(W / 2, H / 2, H * 0.12, W / 2, H / 2, W * 0.5);
    gr.addColorStop(0, 'rgba(253,251,245,0.9)'); gr.addColorStop(0.62, 'rgba(253,251,245,0.82)'); gr.addColorStop(1, 'rgba(253,251,245,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  });
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshLambertMaterial({ map: sheetTex, transparent: true, depthWrite: false }));
  sheet.rotation.x = -Math.PI / 2; sheet.position.set(x, 0.0004, z); sheet.receiveShadow = true; sheet.renderOrder = 1;
  sheet.raycast = () => {}; sheet.userData.noFrame = true;
  group.add(sheet);
  return sheet;
}

/**
 * 老师演示的独立一套器材。get/set：读写实验的状态变量 S；fresh()：一套新的状态（会被打上 demo: true）；
 * apply()：按当前 S 把器材摆好（演示前后都会调用）；bar：返回步骤栏的函数（结束时在栏里说一句；步骤栏要等 reels 建好才有，所以传函数）。
 * 返回 { onStart, onEnd }，直接放进 reels.demo。
 */
// view（可选）：{ save: () => 当前的观察视角, restore: (v) => 恢复 }——演示结束、换回学生的状态以后调用 restore，
//   用来重新打开学生原来开着的“钻进去看”、回到原来的近景（课程自己知道怎么 look 回去、设好 S.near）。
export function sandbox({ get, set, fresh, apply, bar, view }) {
  let saved = null, cards = null, seen = null;
  // 学案上的题卡、“掀开结论”按钮也是学生自己的：演示里出的题、填的读数，演示完都要撤回
  const snap = () => [...document.querySelectorAll('.think, .big-next')].map((el) => ({ el, hidden: el.hidden, ctx: el.querySelector('.sum-ctx')?.innerHTML, ctxHidden: el.querySelector('.sum-ctx')?.hidden }));
  const restore = (list) => { for (const c of list) { c.el.hidden = c.hidden; const x = c.el.querySelector('.sum-ctx'); if (x && c.ctx != null) { x.innerHTML = c.ctx; x.hidden = c.ctxHidden; } } };
  return {
    onStart: () => { if (!saved) { saved = get(); cards = snap(); seen = view?.save?.(); } const s = fresh(); s.demo = true; set(s); apply?.(); },
    onEnd: () => {
      if (!saved) return;
      if (cards) { restore(cards); cards = null; }
      const s = saved; saved = null; s.near = false; set(s); apply?.();
      if (view?.restore && seen != null) { const v = seen; seen = null; setTimeout(() => view.restore(v), 0); }
      const b = bar?.(); if (!b) return;
      b.say('演示看完了。桌上的器材和记录还是你自己的那一套——接着往下做。', b.current || 'end');
      setTimeout(() => b.say(null), 4000);
    },
  };
}

/** status / done：演示里的操作不写进学生的面板、不算学生的步骤 */
export function guards(getS, getW, getBar) {      // getBar 同上，是函数
  return {
    status: (m) => { if (!getS().demo) getW()?.status(m); },
    done: (id) => { if (!getS().demo) getBar().done(id); },
  };
}

/**
 * 一道“想一想”。options[0] 是对的；wrong[j-1] 是选第 j 个错选项时的提示。
 * ctx：学生自己的记录（html，或返回 html 的函数——每次打开时重新取）。返回 { el, open(), close() }。
 */
export function think({ title = '想一想', q, ctx = '', options, ok, wrong = [], onOk, status }) {
  const ctxEl = h('div', { class: 'sum-ctx' });
  const btns = buttons(options.map((t, j) => ({ text: t, ghost: true, onClick: () => {
    if (j) return status(wrong[j - 1] || '再想一想。');
    api.close(); status(ok); onOk?.();
  } })));
  btns.el.dataset.keep = '1';
  const el = h('div', { class: 'think', hidden: true }, h('div', { class: 'think-t' }, title), ctxEl, h('p', { class: 'think-q', html: q }), btns.el);
  const api = {
    el,
    open() { const c = typeof ctx === 'function' ? ctx() : ctx; ctxEl.innerHTML = c || ''; ctxEl.hidden = !c; el.hidden = false; },
    close() { el.hidden = true; },
    get isOpen() { return !el.hidden; },
  };
  return api;
}

/** 放映的时候点一下画面：退出放映 */
export function wrapPointer(drag, bar) {
  return {
    down: (r, e) => { if (bar.playing) { bar.stop(); return true; } return drag.down(r, e); },
    move: (r, e) => drag.move(r, e),
    up: (r, e) => drag.up(r, e),
    items: drag.items,
  };
}

/**
 * 学案式面板。controls：放进“动手试”下面的元素（题目、按钮、折叠项……）；
 * headers：记录表的表头；tableTitle：把面板上的“数据”改成什么；intro：开场的一句话。
 * 返回 { tbl, next }：next 是“掀开课本上的结论 →”大按钮（默认隐藏）。
 */
export function mountXuean(ui, { controls = [], headers = ['做了什么', '现象', '说明'], tableTitle = '观察记录', intro = '' } = {}) {
  ui.el.classList.add('xuean');
  const tbl = table(headers);
  const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '掀开课本上的结论 →');
  ui.controls.append(...controls.map((c) => c.el || c), next);
  ui.data.append(tbl.el);
  const dt = ui.data.previousElementSibling; if (dt?.classList.contains('bar-title')) dt.textContent = tableTitle;
  if (intro) ui.status(intro);
  return { tbl, next };
}

/** “更多”折叠项：备用按钮 + 全部重来 */
export function moreBox(items, onReset) {
  return h('details', { class: 'more' }, h('summary', {}, '更多'),
    buttons(items.map(([text, onClick]) => ({ text, ghost: true, onClick }))).el,
    buttons([{ text: '全部重来（清空记录）', ghost: true, onClick: onReset }]).el);
}

/** “换个条件再试”折叠项 */
export function varyBox(text, ...els) {
  return h('details', { class: 'more' }, h('summary', {}, '换个条件再试'), h('p', { class: 'fineprint', html: text }), ...els.map((e) => e.el || e));
}

/**
 * 质检流程（放进 debug.qa，tools/qa.mjs --flow 会按顺序做，每做一步查一遍穿模、拿不拿得到）。
 * 走的是真正的拖放处理函数（onStart / onDrag / onEnd / onTap），和学生用鼠标做的一样，只是不用找屏幕坐标。
 * steps 里每一项：
 *   { name, tap: obj }                点一下（obj 是 draggable 里登记的拾取盒）
 *   { name, drag: obj, to: p | () => p }   拖到 p（实验局部坐标，和 onDrag 收到的一样）再松手
 *   { name, hold: obj } / { name, release: obj }   按住 / 松开（中间可以等几步）
 *   { name, run: () => {} }           直接调用（用在没有拖放的操作上，比如面板上的按钮）
 *   wait：做完以后等几秒（实验里的时间，质检会加快）。默认 1
 */
export function qaFlow(drag, steps) {
  const item = (obj) => { const d = drag.items().find((x) => x.obj === obj); if (!d) throw new Error('这件东西没有登记在 draggable 里'); return d; };
  return steps.map((s) => ({
    name: s.name, wait: s.wait ?? 1, scale: s.scale,      // scale：这一步用多快的时间（默认 qa 用 4 倍速；要卡时机的步骤写 1）
    // 给 qa.mjs --mouse 用：这一步能不能换成真鼠标做（点一下 / 拖过去）
    mouse: s.tap ? { kind: 'tap', obj: s.tap, over: () => drag.hovered?.() } : s.drag ? { kind: 'drag', obj: s.drag, to: () => (typeof s.to === 'function' ? s.to() : s.to).clone(), anchor: () => { const d = item(s.drag); return d.keepOffset ? d.anchor || d.obj : null; }, over: () => drag.hovered?.() } : null,
    run() {
      if (s.tap) { const d = item(s.tap); if (d.onTap && !d.onDrag) return d.onTap(); d.onStart?.(); d.onEnd?.(false); d.onTap?.(); }
      else if (s.drag) { const d = item(s.drag), p = (typeof s.to === 'function' ? s.to() : s.to).clone(); d.onStart?.(p.clone()); d.onDrag?.(p.clone(), p.clone()); d.onEnd?.(true); }
      else if (s.hold) { item(s.hold).onStart?.(); window.__qaHeld = true; }
      else if (s.release) { item(s.release).onEnd?.(true); window.__qaHeld = false; }
      else s.run?.();
    },
  }));
}

/**
 * 老师演示里“真的去做”：走学生拖放的同一套处理函数（onStart / onDrag / onEnd / onTap），让器材沿路线移过去——
 * 演示里的器材怎么动、倒的时候怎么倾斜，和学生自己拖的时候一模一样；不要在演示里直接改状态让东西凭空出现。
 *   const act = demoActs(drag, group);
 *   { cap: '拿起量筒，把稀盐酸倒进试管', dur: 4, during: act.seq(
 *       act.drag(cylPick, () => MOUTH.clone(), { t0: 0.05, t1: 0.5, release: 0.8 }),     // k 从 t0 到 t1 移过去，release 时松手
 *       act.tap(plugPick, 0.9)) }                                                           // k = 0.9 时点一下
 * 每个动作只在这一个镜头里有效（k 回到 t0 之前会重置，重放时再做一遍）。to / from 可以是向量或返回向量的函数（实验局部坐标，同 onDrag）。
 *   act.drag(obj, to, { t0, t1, release, from, until })  until：返回 true 时松手（比如倒到 1/3 就停）
 *   act.path(obj, [p0, p1, …], { t0, t1, release })      沿几个点拿过去（拿起来、绕开别的器材、放下）
 *   act.wiggle(obj, { t0, t1, amp, hz })   按住左右来回拖（振荡）
 *   act.hold(obj, t0, t1)                  按住 / 松开（握住试管）
 *   act.tap(obj, at) / act.at(t, fn)       点一下 / 到时候做一件事
 */
export function demoActs(drag, root) {
  const item = (obj) => { const d = drag.items().find((x) => x.obj === obj); if (!d) throw new Error('演示：这件东西没有登记在 draggable 里'); return d; };
  const val = (v) => (typeof v === 'function' ? v() : v).clone();
  const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const center = (obj) => { root.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(obj); return root.worldToLocal(box.getCenter(new THREE.Vector3())); };
  return {
    drag(obj, to, { t0 = 0.05, t1 = 0.5, release = 0.8, from, until } = {}) {
      let st = null;
      return (k) => {
        if (k < t0) { st = null; return; }
        if (st?.ended) return;
        const d = item(obj);
        if (!st) { st = { a: from ? val(from) : center(obj), b: null }; d.onStart?.(st.a.clone()); }
        st.b ||= val(to);
        d.onDrag?.(st.a.clone().lerp(st.b, ease((k - t0) / Math.max(1e-3, t1 - t0))), st.a.clone());
        if (k >= release || (k > t1 && until?.())) { st.ended = true; d.onEnd?.(true); }
      };
    },
    /**
     * 沿几个点拿过去：pts 是一串位置（向量 / 返回向量的函数；null = 这件东西现在的位置），按路程匀速走（两头放慢）。
     * 用来“拿起来、绕过别的器材、再放下”——直线走会穿过东西的时候用它。start: false 时不调用 onStart（接着上一个镜头手里拿着的继续走）。
     */
    path(obj, pts, { t0 = 0.05, t1 = 0.5, release = 0.8, start = true } = {}) {
      // 路线上的点也可以写成 [位置, 停多久]（停多久按 k 算，比如 0.06）：走到这里停一下（倒药品、点火……），停顿前后各段各自两头放慢
      let st = null;
      return (k) => {
        if (k < t0) { st = null; return; }
        if (st?.ended) return;
        const d = item(obj);
        if (!st) {
          const raw = pts.map((p) => (Array.isArray(p) ? p : [p, 0]));
          const P = raw.map(([p]) => (p == null ? center(obj) : val(p))), stop = raw.map(([, w]) => w || 0);
          const runs = []; let cur = [0];                       // 按停顿点把路线分成几段，每段 { idx: [点的下标], len, wait: 这段走完停多久 }
          for (let i = 1; i < P.length; i++) { cur.push(i); if (stop[i] || i === P.length - 1) { runs.push(cur); cur = [i]; } }
          const R = runs.map((idx) => { const L = [0]; for (let j = 1; j < idx.length; j++) L.push(L[j - 1] + P[idx[j]].distanceTo(P[idx[j - 1]])); return { idx, L, len: L[L.length - 1], wait: stop[idx[idx.length - 1]] }; });
          const waits = R.reduce((a, r) => a + r.wait, 0), total = R.reduce((a, r) => a + r.len, 0) || 1, moveK = Math.max(1e-3, t1 - t0 - waits);
          let kk = t0; for (const r of R) { r.a = kk; r.b = kk + moveK * (r.len / total || 0); kk = r.b + r.wait; }
          st = { P, R }; if (start) d.onStart?.(P[0].clone());
        }
        const { P, R } = st;
        const r = R.find((x) => k < x.b + x.wait) || R[R.length - 1];
        const u = ease((k - r.a) / Math.max(1e-6, r.b - r.a)) * r.len;
        let j = 1; while (j < r.idx.length - 1 && r.L[j] < u) j++;
        const seg = r.L[j] - r.L[j - 1], A = P[r.idx[j - 1]], B = P[r.idx[j]] || A;
        d.onDrag?.(A.clone().lerp(B, seg > 0 ? Math.min(1, Math.max(0, (u - r.L[j - 1]) / seg)) : 1), P[0].clone());
        if (k >= release) { st.ended = true; d.onEnd?.(true); }
      };
    },
    wiggle(obj, { t0 = 0.05, t1 = 0.9, amp = 0.02, hz = 2.5, dur = 4 } = {}) {
      let st = null;
      return (k) => {
        if (k < t0) { st = null; return; }
        if (st?.ended) return;
        const d = item(obj);
        if (!st) { st = { a: center(obj) }; d.onStart?.(st.a.clone()); }
        d.onDrag?.(st.a.clone().add(new THREE.Vector3(Math.sin((k - t0) * dur * hz * Math.PI * 2) * amp, 0, 0)), st.a.clone());
        if (k >= t1) { st.ended = true; d.onEnd?.(true); }
      };
    },
    hold(obj, t0, t1) {
      let s = 0;
      return (k) => { if (k < t0) { s = 0; return; } const d = item(obj); if (s === 0) { s = 1; d.onStart?.(center(obj)); } if (s === 1 && k >= t1) { s = 2; d.onEnd?.(false); } };
    },
    tap(obj, at) {
      let did = false;
      return (k) => { if (k < at) { did = false; return; } if (did) return; did = true; const d = item(obj); if (d.onTap && !d.onDrag) d.onTap(); else { d.onStart?.(center(obj)); d.onEnd?.(false); d.onTap?.(); } };
    },
    at(t, fn) { let did = false; return (k) => { if (k < t) { did = false; return; } if (!did) { did = true; fn(); } }; },
    seq: (...fns) => (k) => { for (const f of fns) f(k); },
  };
}
