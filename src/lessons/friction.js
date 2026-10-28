// 图8.3-4 探究滑动摩擦力。用弹簧测力计水平拉木块，使它在长木板上匀速滑动，读出滑动摩擦力；
// 在木块上放钩码改变压力；换表面粗糙的长木板保持压力不变。
// 课本问“实验中遇到了什么困难，能否优化方案”：手拉很难做到匀速——改成测力计固定、拉动木板，木块相对桌面静止，示数就稳定了。
// 物理：木块受弹簧拉力 F = k·伸长 和摩擦力；静摩擦最大 1.2μN，滑动摩擦 μN（μ 光滑木板 0.3、粗糙木板 0.5）。
import * as THREE from 'three';
import { seg, buttons, goals, note, table, readout, guard } from './kit/ui.js';
import { draggable, clamp } from './kit/interact.js';
import { woodBlock, hookWeight } from './kit/props.js';
import { forceMeter, FM } from './kit/forcemeter.js';
import { paint, inked } from '../live/ink.js';

const GB = 2, GW = 1;                        // 木块重 2 N，每个钩码 1 N
const BOARDS = [{ label: '光滑的长木板', mu: 0.3 }, { label: '表面粗糙的长木板', mu: 0.5 }];
const BY = 0.012, BW = 0.09, BL = 0.46;      // 木板厚度、木块长、木板长
const K = 1 / FM.PER_N, HOOK = FM.L + 0.03;  // 弹簧劲度、圆环到挂钩末端的距离
const Z = 0;

export default {
  id: 'friction',
  fig: '图8.3-4',
  title: '探究滑动摩擦力',
  stampText: '探究',
  predict: {
    q: '用弹簧测力计水平拉木块匀速滑动。<br>在木块上再放一个钩码（压力变大），滑动摩擦力会——',
    hint: '课本第 28–29 页',
    options: ['变大', '变小', '不变'],
    answer: 0,
  },
  conclusion: {
    page: 33, rect: [62, 556, 362, 664],          // 课本第 29 页
    quote: '滑动摩擦力的大小与接触面所受的压力有关，接触面受到的压力越大，滑动摩擦力越大；滑动摩擦力的大小还与接触面的粗糙程度有关，接触面越粗糙，滑动摩擦力越大。另外，滑动摩擦力的大小还与接触面的材料有关。',
    why: '木块匀速滑动时，在水平方向受到的拉力和滑动摩擦力是一对平衡力，所以测力计的示数等于滑动摩擦力。拉得不匀速时，拉力不等于摩擦力，示数忽大忽小；刚要拉动的一瞬间示数最大（那是最大静摩擦力）。把测力计固定、拉动下面的木板，木块相对桌面不动，不论木板拉得快慢，示数都等于滑动摩擦力，读数就稳定了。',
    src: '课本第 28–29 页 · 第八章 第3节 摩擦力',
  },

  create({ tag }) {
    const group = new THREE.Group();
    const boardMats = [paint(0xe7d2a8), new THREE.MeshLambertMaterial({ map: roughTex() })];
    const board = inked(new THREE.Mesh(new THREE.BoxGeometry(BL, BY, 0.07), [paint(0xd9bf8f), paint(0xd9bf8f), boardMats[0], paint(0xd9bf8f), paint(0xd9bf8f), paint(0xd9bf8f)]), { width: 1.3 });
    group.add(board);
    const block = new THREE.Group();
    const bb = woodBlock(BW, 0.045, 0.055);
    bb.position.y = 0.0225;
    const eye = new THREE.Mesh(new THREE.TorusGeometry(0.005, 0.0012, 6, 12), paint(0x8f99a8));
    eye.rotation.y = Math.PI / 2; eye.position.set(BW / 2 + 0.004, 0.02, 0);
    block.add(bb, eye);
    const ws = [0, 1].map((k) => { const w = hookWeight({ r: 0.013, h: 0.022 }); w.position.set((k - 0.5) * 0.034, 0.045 + w.height, 0); block.add(w); return w; });
    group.add(block);
    const sc = forceMeter();
    sc.rotation.z = -Math.PI / 2;
    group.add(sc);
    const post = inked(new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.06, 0.02), paint(0x8f99a8)), { width: 1.1 });
    group.add(post);
    const hTag = tag('', 'pill');

    const S = { surf: 0, nW: 0, mode: 'hand', xb: -0.16, vb: 0, xr: 0, bx: 0, bv: 0, F: 0, steady: 0, rows: [], drag: false };
    const mu = () => BOARDS[S.surf].mu, N = () => GB + GW * S.nW, fk = () => mu() * N(), fs = () => 1.2 * mu() * N();
    const reset = () => { S.xb = -0.16; S.vb = 0; S.bx = 0; S.bv = 0; S.xr = S.xb + BW / 2 + HOOK + 0.004; S.F = 0; S.steady = 0; };
    reset();
    let W = null, ask = () => {};

    const pick = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), new THREE.MeshBasicMaterial({ visible: false }));
    pick.userData.pick = true;
    group.add(pick);
    const pointer = draggable(group, [
      { obj: pick, plane: 'xy', offset: Z, onStart: () => (S.drag = true), onEnd: () => (S.drag = false), onDrag: (p) => { if (S.mode === 'hand') S.xr = clamp(p.x, S.xb + BW / 2 + HOOK - 0.01, 0.36); } },
      { obj: board, plane: 'xy', offset: Z, keepOffset: true, onStart: () => (S.drag = true), onEnd: () => (S.drag = false), onDrag: (p) => { if (S.mode === 'board') { const nx = clamp(p.x, -0.12, 0.02); S.bv = (nx - S.bx) / 0.016; S.bx = nx; } } },
    ]);

    const layout = () => {
      board.position.set(S.bx, BY / 2, Z);
      board.material[2] = boardMats[S.surf];
      block.position.set(S.xb, BY, Z);
      ws.forEach((w, i) => (w.visible = i < S.nW));
      const ext = S.F * FM.PER_N;
      sc.set(S.F);
      sc.position.set(S.xb + BW / 2 + 0.004 + HOOK + ext - 0.0, BY + 0.02, Z + 0.0);
      post.position.set(sc.position.x + 0.012, 0.03, Z);
      post.visible = S.mode === 'board';
      pick.position.set(sc.position.x, BY + 0.02, Z);
      hTag.loc(group, S.mode === 'hand' ? sc.position.x + 0.02 : S.bx - BL / 2 + 0.03, 0.06, Z).text(S.mode === 'hand' ? '拖圆环' : '拖木板');
    };

    return {
      group,
      size: { w: 0.52, d: 0.12, h: 0.1 },
      view: { elev: 24, azim: 0, lookY: 0.3, margin: 1.05 },
      pointer,
      mount(ui) {
        const out = readout([{ key: 'f', label: '测力计示数', unit: 'N', secret: true }, { key: 'p', label: '压力', unit: 'N' }, { key: 's', label: '木块', span: true }]);
        const surf = seg('长木板', BOARDS.map((b) => b.label), (_, k) => { S.surf = k; reset(); });
        const wt = seg('木块上的钩码', ['不放', '1 个', '2 个'], (_, k) => { S.nW = k; reset(); });
        const mode = seg('怎样拉', ['手拉测力计，拉木块', '改进：测力计固定，拉木板'], (_, k) => { S.mode = k ? 'board' : 'hand'; reset(); if (k) S.xr = 0; W.status(k ? '测力计的圆环固定在右边的支架上。<b>按住木板向左拖</b>——快一点慢一点都可以，看测力计的示数。' : '<b>按住测力计的圆环向右拖</b>，尽量让木块匀速滑动。'); });
        const choices = buttons([0, 1, 2].map((j) => ({ text: '', ghost: true, onClick: () => answer(j) })));
        choices.el.hidden = true;
        S.guard = guard(choices.el, () => `${S.surf}|${S.nW}|${S.mode}`, () => { cur = null; ui.status("条件变了（换了木板、钩码或拉法），刚才那道读数题作废。"); });     // 条件变了，待答的题作废
        const tb = table(['次数', '接触面', '压力 F压/N', '滑动摩擦力 f/N']);
        let cur = null;
        ask = () => {
          if (S.steady < 0.5) return ui.status(S.mode === 'hand' ? '示数还不稳定：木块要<b>匀速</b>滑动时，拉力才等于滑动摩擦力。拖得慢一点、稳一点。' : '先拖动木板，让木块和木板之间相对滑动。');
          if (S.rows.some((r) => r.surf === S.surf && r.n === S.nW)) return ui.status('这种情况已经记过了，换压力或换木板。');
          const f = Math.round(fk() * 10) / 10;
          const opts = [...new Set([f, +(f + 0.2).toFixed(1), +(f - 0.2).toFixed(1)])].filter((x) => x > 0).sort(() => Math.random() - 0.5);
          cur = { f, opts, surf: S.surf, n: S.nW };
          choices.btns.forEach((b, j) => { b.hidden = j >= opts.length; b.textContent = `${opts[j]?.toFixed(1)} N`; });
          choices.el.hidden = false; S.guard?.arm();
          ui.status(S.mode === 'hand' ? '木块在匀速滑动，看指针：测力计的示数是多少？' : '木块相对木板在滑动（相对桌面不动），示数稳定了。看指针：测力计的示数是多少？');
        };
        const answer = (j) => {
          if (!cur) return;
          if (cur.opts[j] !== cur.f) return ui.status('再看一看指针（每小格 0.2 N，可以估读到 0.1 N）。');
          choices.el.hidden = true;
          out.reveal('f');
          S.rows.push({ surf: cur.surf, n: cur.n, f: cur.f });
          tb.add([String(S.rows.length), BOARDS[cur.surf].label.replace('的长木板', ''), (GB + GW * cur.n).toFixed(1), cur.f.toFixed(1)]);
          const smooth = S.rows.filter((r) => r.surf === 0).map((r) => r.n), rough = S.rows.filter((r) => r.surf === 1).map((r) => r.n);
          if (new Set(smooth).size >= 2) W.goal.done('press');
          if (rough.some((n) => smooth.includes(n))) W.goal.done('rough');
          ui.status(`记下了：压力 ${(GB + GW * cur.n).toFixed(1)} N，滑动摩擦力 ${cur.f.toFixed(1)} N。${new Set(smooth).size < 2 ? '在木块上放钩码改变压力，再测一次。' : !rough.some((n) => smooth.includes(n)) ? '换表面粗糙的长木板，保持压力不变，再测。' : ''}`);
          cur = null;
        };
        ui.controls.append(surf.el, wt.el, mode.el, buttons([{ text: '读数并记录…', onClick: () => ask() }, { text: '木块放回左端', ghost: true, onClick: reset }]).el, choices.el, out.el, note('木块重 2 N，每个钩码 1 N。'));
        ui.data.append(tb.el);
        W = { out, status: (m) => ui.status(m), goal: goals(ui, [['press', '在光滑木板上，用两种不同的压力各测一次'], ['rough', '换表面粗糙的长木板，保持压力不变再测'], ['improve', '试试改进的方法：测力计固定，拉动木板']]) };
        ui.status('<b>按住测力计的圆环向右拖</b>，让木块在长木板上匀速滑动。');
      },
      update(dt) { S.guard?.check();
        const h = Math.min(dt, 1 / 30);
        const m = N() / 9.8;
        if (S.mode === 'hand') {
          // 手拉圆环：F = k·(圆环位置 − 不受力时的位置)
          S.F = Math.max(0, (S.xr - (S.xb + BW / 2 + 0.004 + HOOK)) * K);
          if (S.vb === 0 && S.F <= fs()) { /* 拉不动 */ }
          else { S.vb = Math.max(0, S.vb + ((S.F - fk()) / m - S.vb * 5) * h); S.xb += S.vb * h; if (S.vb < 0.002 && S.F < fk()) S.vb = 0; }
          if (S.xb > 0.06) { S.xb = 0.06; S.vb = 0; }
          const moving = S.vb > 0.004;
          S.steady = moving && Math.abs(S.F - fk()) < 0.08 ? S.steady + dt : Math.max(0, S.steady - dt * 3);
          W?.out.set('s', S.xb >= 0.06 ? '到了木板右端，放回左端再拉' : moving ? (S.steady > 0.5 ? '匀速滑动' : '在滑动（还不匀速）') : S.F > 0.02 ? '没拉动（静摩擦）' : '静止');
        } else {
          // 拉木板：测力计右端固定；木块受弹簧拉力（向右）和木板给的摩擦力（木板向左动时向左）
          S.bv *= S.drag ? 1 : 0.8;          // 松手后木板很快停下
          // 木板滑动时，木块相对木板滑动，受滑动摩擦力；弹簧被拉伸到 F = f滑 就平衡，木块相对桌面静止。
          // 木板停下时，静摩擦力撑住弹簧（不超过最大静摩擦）。弹簧很硬，木块的位移只有几毫米。
          const xr0 = 0.2;
          const target = Math.abs(S.bv) > 0.004 ? fk() : Math.min(S.F, fs());
          S.F += (target - S.F) * Math.min(1, h * 8);
          S.xb = xr0 - BW / 2 - 0.004 - HOOK - S.F / K;
          const sliding = Math.abs(S.bv) > 0.004;
          S.steady = sliding && Math.abs(S.F - fk()) < 0.08 ? S.steady + dt : Math.max(0, S.steady - dt * 3);
          if (S.steady > 0.8) W?.goal.done('improve');
          W?.out.set('s', sliding ? '木板在动，木块相对桌面静止' : '静止');
        }
        layout();
        W?.out.set('f', S.F, 1); W?.out.set('p', N(), 1);
      },
      debug: { S },
    };
  },
};

function roughTex() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#d9bf8f'; g.fillRect(0, 0, 512, 128);
  for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${90 + Math.random() * 60},${70 + Math.random() * 40},40,${0.25 + Math.random() * 0.4})`; g.fillRect(Math.random() * 512, Math.random() * 128, 2, 2); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
