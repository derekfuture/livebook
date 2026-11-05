// 虚拟时钟：录制时每一帧由录制脚本推进固定的 1/30 s，画面再慢的截图也能得到匀速的视频
(() => {
  const RAF = window.requestAnimationFrame.bind(window), ST = window.setTimeout.bind(window), CT = window.clearTimeout.bind(window);
  const SI = window.setInterval.bind(window), CI = window.clearInterval.bind(window);
  const pnow = performance.now.bind(performance), dnow = Date.now;
  let manual = false, vt = pnow(), last = pnow(), id = 1;
  const rafQ = new Map(), timers = new Map();
  performance.now = () => vt;
  Date.now = () => dnow() - pnow() + vt;
  window.requestAnimationFrame = (cb) => { const k = id++; rafQ.set(k, cb); return k; };
  window.cancelAnimationFrame = (k) => rafQ.delete(k);
  window.setTimeout = (fn, ms = 0, ...a) => { const k = id++; timers.set(k, { t: vt + (+ms || 0), fn: typeof fn === 'function' ? () => fn(...a) : () => {}, rep: 0 }); return k; };
  window.clearTimeout = (k) => timers.delete(k);
  window.setInterval = (fn, ms = 0, ...a) => { const k = id++; timers.set(k, { t: vt + Math.max(1, +ms || 0), fn: () => fn(...a), rep: Math.max(1, +ms || 0) }); return k; };
  window.clearInterval = (k) => timers.delete(k);
  const anims = new WeakMap();
  const step = (dt) => {
    vt += dt;
    for (let guard = 0; guard < 50; guard++) {
      let due = null;
      for (const [k, t] of timers) if (t.t <= vt && (!due || t.t < due[1].t)) due = [k, t];
      if (!due) break;
      const [k, t] = due;
      if (t.rep) t.t += t.rep; else timers.delete(k);
      try { t.fn(); } catch (e) { console.error(e); }
    }
    // CSS 动画、过渡也跟着虚拟时钟走
    if (manual) for (const a of document.getAnimations()) { if (!anims.has(a)) { anims.set(a, 0); a.pause(); } const t = anims.get(a) + dt; anims.set(a, t); try { a.currentTime = t; } catch {} }
    const q = [...rafQ.values()]; rafQ.clear();
    for (const cb of q) { try { cb(vt); } catch (e) { console.error(e); } }
  };
  const auto = () => { if (manual) return; const n = pnow(); step(n - last); last = n; RAF(auto); };
  RAF(auto);
  window.__vt = {
    manual() { manual = true; },
    auto() { manual = false; last = pnow(); RAF(auto); },
    step(dt) { step(dt); },
    get t() { return vt; },
  };
  // 屏幕上的鼠标：箭头 + 点击时的一圈涟漪（录制脚本控制）
  addEventListener('DOMContentLoaded', () => {
    const c = document.createElement('div');
    c.id = '__cursor';
    c.innerHTML = '<svg width="34" height="40" viewBox="0 0 17 20"><path d="M1 1 L1 15.5 L4.8 12 L7.6 18.4 L10.2 17.2 L7.5 11 L12.6 11 Z" fill="#fff" stroke="#1d2433" stroke-width="1.3" stroke-linejoin="round"/></svg>';
    c.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;pointer-events:none;transform:translate(-100px,-100px);filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))';
    const r = document.createElement('div');
    r.id = '__ripple';
    r.style.cssText = 'position:fixed;left:0;top:0;z-index:99998;pointer-events:none;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border:3px solid rgba(232,120,40,.9);opacity:0';
    document.body.append(r, c);
  });
  window.__cur = (x, y, down, ripple) => {
    const c = document.getElementById('__cursor'), r = document.getElementById('__ripple');
    if (!c) return;
    c.style.transform = `translate(${x - 2}px,${y - 2}px) scale(${down ? 0.9 : 1})`;
    if (ripple != null) { const k = Math.min(1, ripple); r.style.left = x + 'px'; r.style.top = y + 'px'; r.style.opacity = String(1 - k); r.style.transform = `scale(${0.4 + k * 1.4})`; }
  };
})();
