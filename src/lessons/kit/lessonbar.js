// 底部的步骤栏：整节课只有这一条，就在画面正下方（投影时全班都看得到）。
//   动手时——蓝印“动手”，写着现在这一步做什么：“（2）把导管拖进水里，对准白磷”；右边 1 2 3 4 5 是步骤，做完的打勾。
//   演示 / 总结时——变成一条深色的放映条：红印“演示”（或“总结”），字幕、镜头编号、暂停、退出。
// 演示是独立的一段：实验自己负责在 onStart 里换上一套干净的器材、在 onEnd 里恢复学生原来的进度。
// 空格暂停，Esc 退出；放映时点一下画面也会退出。
import { h } from '../../ui/Panel.js';
import { sfx } from './audio.js';
import { show } from '../../ui/prefs.js';
import { inviteRing } from './invite.js';

/**
 * steps: [{ id, title, todo, target? }]——title 是短名（步骤点的提示），todo 是这一步要做的事（显示在栏里），
 *   target() 返回这一步要动的那件东西（Object3D 或 null）：到这一步，它身上就出现提示光圈（group 给了才有）
 * reels: { name: { seal, label, shots: [{ cap, cam, dur, speed?, enter?, during? }], onStart?, onEnd?(done) } }
 *   cam: [target, dir, dist] 或 (k) => [...]（实验局部坐标，同 ctx.look）；没有 cam 的镜头回到整体
 */
export function lessonBar({ look, back, steps, reels = {}, demo = 'demo', group = null }) {
  const ring = group ? inviteRing(group) : null;
  const left = new Set(steps.map((s) => s.id));
  let ui = null, say = null, sayFor = null, near = false;
  const seal = h('span', { class: 'lb-seal' }, '动手');
  const num = h('b', { class: 'lb-n' });
  const text = h('span', { class: 'lb-txt' });
  const marks = h('span', { class: 'lb-steps' });
  const stepEls = steps.map((s, i) => h('i', { title: `${i + 1}  ${s.title}` }, String(i + 1)));
  const pauseB = h('button', { class: 'lb-pause', title: '暂停（空格）', onclick: () => (paused ? api.resume() : api.pause()) }, '❚❚');
  const exitB = h('button', { class: 'lb-exit', title: '退出（Esc）', onclick: () => api.stop() }, '退出演示');
  const backB = h('button', { class: 'lb-back', onclick: () => back() }, '回到全景');
  const demoB = h('button', { class: 'lb-demo', onclick: () => api.play(demo) }, `▶ 看${reels[demo]?.label || '演示'}`);
  const snd = h('button', { class: 'lb-snd', title: '声音', onclick: () => snd.classList.toggle('off', sfx.mute()) }, '♪');
  const bar = h('div', { class: 'lbar do' }, seal, h('span', { class: 'lb-main' }, num, text), marks, pauseB, exitB, backB, reels[demo] ? demoB : null, snd);
  document.body.append(bar);

  let reel = null, shots = null, i = -1, t = 0, paused = false, endMsg = 0;
  const setCam = (s, k) => { const c = typeof s.cam === 'function' ? s.cam(k) : s.cam; if (c) look(c[0], c[1], c[2], () => api.stop()); };
  const renderDo = () => {
    bar.className = near ? 'lbar do near' : 'lbar do';
    seal.textContent = '动手';
    marks.replaceChildren(...stepEls);
    const k = steps.findIndex((s) => left.has(s.id));
    steps.forEach((s, j) => { stepEls[j].className = !left.has(s.id) ? 'done' : j === k ? 'cur' : ''; });
    if (k < 0) { num.textContent = ''; text.innerHTML = say && sayFor === 'end' ? say : '都做完了。掀开左边的<b>结论</b>看看。'; return; }
    num.textContent = `（${k + 1}）`;
    text.innerHTML = say && sayFor === steps[k].id ? say : steps[k].todo;
  };
  const goShot = (k) => {
    i = k; t = 0;
    const s = shots[k];
    num.textContent = `（${k + 1}）`;
    text.textContent = s.cap;
    [...marks.children].forEach((d, j) => { d.className = j < k ? 'done' : j === k ? 'cur' : ''; });
    s.enter?.();
    if (s.cam) setCam(s, 0); else back();
  };
  const key = (e) => {
    if (!reel || e.target.closest?.('input,textarea')) return;
    if (e.code === 'Space') { e.preventDefault(); e.stopImmediatePropagation(); paused ? api.resume() : api.pause(); }
    if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); api.stop(); }     // 只退出放映，不要把整个实验也关了
  };
  addEventListener('keydown', key, true);

  const api = {
    get playing() { return !!reel; },
    get reel() { return reel; },
    get shot() { return reel ? i : -1; },
    /** 放映时换字幕（实验在演示里说的话：本来给学生看的状态提示，演示时显示在这里） */
    caption(html) { if (reel && html) text.innerHTML = html; },             // 正在放第几个镜头（质检脚本用）
    get stepList() { return steps; },
    /** 演示 / 总结完以后在栏里留一句话（几秒后回到当前步骤） */
    attach(u) { ui = u; renderDo(); api._need(); },
    _need() { if (!ui) return; if (!left.size) ui.unlock(); else ui.need('还差：' + steps.filter((s) => left.has(s.id)).map((s) => s.title).join('；')); },
    done(id) { if (left.delete(id)) { say = null; renderDo(); api._need(); sfx.ding(990, { gain: 0.05, decay: 0.35 }); } return !left.size; },
    undo(...ids) { let ch = false; for (const id of ids) if (!left.has(id) && steps.some((s) => s.id === id)) { left.add(id); ch = true; } if (ch) { renderDo(); api._need(); } },
    has(id) { return !left.has(id); },
    get current() { return steps.find((s) => left.has(s.id))?.id || null; },
    get target() { const cur = steps.find((s) => left.has(s.id)); return cur?.target ? cur.target() : null; },      // 当前这一步要动的东西（质检脚本用）
    get finished() { return !left.size; },
    /** 当前这一步的补充说明（例如“酒精灯还没点燃”），换到下一步时自动清掉 */
    say(html, forStep = api.current || 'end') { say = html; sayFor = forStep; if (!reel) renderDo(); },
    near(on) { near = !!on; bar.classList.toggle('near', near); },
    play(name) {
      if (reel) api.stop();
      const R = reels[name]; if (!R) return;
      reel = name; shots = R.shots; paused = false; endMsg = 0;
      bar.className = `lbar film ${name}`;
      seal.textContent = R.seal || '演示';
      marks.replaceChildren(...shots.map((_, j) => h('i', {}, String(j + 1))));
      pauseB.textContent = '❚❚';
      R.onStart?.();
      goShot(0);
    },
    pause() { if (!reel) return; paused = true; pauseB.textContent = '▶'; bar.classList.add('paused'); },
    resume() { paused = false; pauseB.textContent = '❚❚'; bar.classList.remove('paused'); },
    /** 退出放映（放完 done = true）。实验在 reel.onEnd 里恢复自己的状态 */
    stop(done = false) {
      if (!reel) return;
      const R = reels[reel]; reel = null; paused = false;
      back();
      R.onEnd?.(done);
      renderDo();
    },
    /** 每帧调用；返回实验时间的倍数（暂停时 0） */
    update(dt) {
      const ts = window.__lbTimeScale || 1;          // 测试用：让实验时间走快几倍（质检脚本设置）
      // 提示光圈：当前这一步要动的东西；放映时、步骤栏关掉时不出
      if (ring) { const cur = steps.find((s) => left.has(s.id)); ring.update(!reel && show.steps && cur?.target ? cur.target() : null, dt); }
      if (!reel) return ts;
      if (paused) return 0;
      const s = shots[i];
      t += dt;
      const k = Math.min(1, t / s.dur);
      s.during?.(k, dt);
      if (typeof s.cam === 'function') setCam(s, k);
      if (t >= s.dur) { if (i + 1 < shots.length) goShot(i + 1); else { api.stop(true); return ts; } }
      return reel ? s.speed ?? 1 : ts;
    },
    dispose() { removeEventListener('keydown', key, true); bar.remove(); ring?.dispose(); },
  };
  renderDo();
  return api;
}
