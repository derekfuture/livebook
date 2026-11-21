// 人教版选择性必修1，印刷第112页，实验4-3（1）、图4-20、图4-21。
import * as THREE from 'three';
import { h } from '../ui/Panel.js';
import { draggable, clamp } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { paperSheet, qaFlow, demoActs, sandbox, wrapPointer, mountXuean, moreBox, think } from './kit/chemlesson.js';
import { micro } from './kit/microworld.js';
import { V, CUP, TUBE, WATER, RIM, CUP_RIM, BRINE_LEVEL, HALF, TUBE_RADIUS, TUBE_WALL, BASE, apparatus, corrosionScene } from './kit/ferust-parts.js';

// 钉身左段比右侧钉尖粗；向右微倾，两处下缘才会同时搭在杯沿上。
const DRY_ANGLE = 1.531, DRY = V(CUP - 0.002, CUP_RIM + 0.002195);
// 钉帽靠杯壁，钉尖落在烧杯底面。
const REST_ANGLE = 0.789, CUP_FLOOR = 0.0006;
const DIPPED = V(CUP, CUP_FLOOR + HALF * Math.cos(REST_ANGLE));
const ENTRY = V(TUBE, RIM + HALF - 0.002);
// 试管模型只画一层玻璃曲面。钉帽左缘抵住直段，钉尖落在右侧对应的弧面上。
const TUBE_ANGLE = 0.223, tipX = HALF * Math.sin(TUBE_ANGLE);
const glassRadius = TUBE_RADIUS + TUBE_WALL;
const tubeFloor = BASE + glassRadius - Math.sqrt(glassRadius ** 2 - tipX ** 2);
const BOTTOM = V(TUBE, tubeFloor + HALF * Math.cos(TUBE_ANGLE));
const PLUG = V(-0.062, 0.001, 0), SEAT = V(TUBE, RIM - 0.005);
const intro = '将杯口上已经酸洗除锈的铁钉向下拖，浸入饱和食盐水。';
const insert = '提起铁钉，把钉尖移到具支试管口，对准后松手。';
const close = '将橡胶塞的小头拖进具支试管口，塞紧。';
const unseal = '管口已塞住。先提起橡胶塞。';
const wait = '点右侧盛水的试管，凑近比较细导管内外的水面。';
const compare = '比较右侧细导管内外的水面。';
const observation = '细导管内的水面升高，高于管外水面。';
const noteText = '依据课本第 112 页实验4-3（1）、图4-20 和图4-21。实验前铁钉已经酸洗除锈。课本要求几分钟后观察，此处加快时间。水柱位移、水膜厚度、电子路径和粒子间距均为示意。模型用恒温气体定律和水柱压差估算位移。观察时段内的耗氧量和腐蚀速度为示意。';
const ids = ['dip', 'insert', 'seal', 'watch'];

export default {
  id: 'ferust', fig: '图4-21', title: '铁钉的吸氧腐蚀实验', stampText: '实验', style: 'paper',
  predict: {
    q: '把浸过饱和食盐水的铁钉放进具支试管并塞紧。过几分钟，右侧细导管内的水面会怎样？',
    hint: '先看清弯导管的下端浸在哪里。',
    options: ['下降，管里的气体把水往外推', '升高，水沿细导管向具支试管方向移动', '不变，铁钉的变化不会影响水面'],
    answer: 1,
  },
  need: '用饱和食盐水浸过铁钉，放入具支试管，塞紧后观察导管中的水柱。',
  conclusion: {
    crops: [{ page: 116, rect: [219, 247, 531, 369] }, { page: 116, rect: [219, 371, 531, 433] }],
    quote: '如果钢铁表面吸附的水膜酸性很弱或呈中性，但溶有一定量的氧气，此时就会发生吸氧腐蚀（如图4-20）。钢铁等金属的腐蚀主要是吸氧腐蚀。……在空气中，Fe(OH)2进一步被氧化为Fe(OH)3，Fe(OH)3失去部分水生成Fe2O3·xH2O，它是铁锈的主要成分。铁锈疏松地覆盖在钢铁制品表面，不能阻止钢铁继续发生腐蚀。',
    formula: '2Fe + O₂ + 2H₂O = 2Fe(OH)₂',
    why: '水膜中的氧气参与反应，试管内的氧气不断补入水膜。管内气体减少，压强降低，外界大气压推动水沿导管上升。',
    src: '选择性必修1 · 第 112 页 · 金属的腐蚀与防护',
  },
  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group(); root.add(group);
    paperSheet(group, { w: 0.34, d: 0.16 });
    const { nail, cap, film, bathGlass, meniscus, waterLevel, nameplates } = apparatus(group, tag);
    const card = tag('', 'cond');
    const fresh = () => ({
      nail: DRY.clone(), cap: PLUG.clone(), angle: DRY_ANGLE,
      wet: false, dipped: false, inside: false, sealed: false, seen: false, demo: false,
      rise: 0, progress: 0, oxygenUsed: 0, moving: '', returns: {}, dryWait: 0, drySeen: false, near: false,
    });
    let S = fresh(), W, version = 0;
    const scene = corrosionScene();
    const at = () => V(TUBE, 0.052, 0.008);
    const mic = micro({ tag, look, back, group, scene, at, btnAt: () => V(TUBE, 0.052, 0.015),
      label: '钻进具支试管<wbr>看铁钉上的水膜', state: () => ({ progress: S.progress, reacted: S.progress >= 0.999 }), show: () => S.progress > 0 && !S.near,
      bar: () => bar, lookD: [0.05, 0.48, 1], dist: 0.285, scale: 0.011 });
    const overlays = document.querySelectorAll('.mw'), overlay = overlays[overlays.length - 1];
    overlay.classList.add('ferust-micro');
    document.body.classList.add('ferust-on');
    const sheet = h('style', {}, `
      .ferust-name {background:#fffaf0ed;border-radius:2px;padding:1px 5px;color:#3d3934;font:15px/1.35 "Songti SC",serif;white-space:nowrap;pointer-events:none}
      .ferust-on.predicting .tag3d.ferust-name {visibility:visible!important}
      .ferust-on .mw-go,.ferust-on .ferust-back {animation:none}
      .ferust-micro .mw-hud {background:#fffaf0ed;border-radius:6px;padding:8px 12px;box-sizing:border-box}
      .ferust-micro .mw-play {pointer-events:auto;margin:6px 3px 0;font:inherit;color:#344b54;border:1px solid #b4b9af;border-radius:4px;background:#fffcf4;cursor:pointer}
      .ferust-micro .mw-cap,.ferust-micro .mw-eq {font-family:"Times New Roman","Songti SC",serif}
      .ferust-micro .mw-eq sub,.ferust-micro .mw-cap sub {font-size:0.65em;line-height:0;vertical-align:-0.24em}
      .ferust-reading {position:fixed;z-index:12;right:24px;top:86px;padding:12px;background:#fffaf0;border:1px solid #c8b99d;border-radius:5px;font:16px/1.4 var(--song);color:#343630}
      .ferust-reading button {font:inherit;padding:5px 9px;margin:6px 4px 0 0;border:1px solid #ada68e;border-radius:3px;background:#fffdf8;cursor:pointer}
      .ferust-reading button:hover,.ferust-reading button:focus-visible {border-color:#4c7060;background:#edf2e9}
      @media(max-width:760px) {
        .ferust-reading {left:6px;right:auto;top:72px;width:103px;padding:6px;font-size:14px}
        .ferust-reading button {display:block;width:100%;padding:4px;margin:4px 0 0}
        .ferust-name {font-size:11px;padding:0 2px}
        .ferust-on .mw-go {max-width:10em;white-space:normal;word-break:keep-all;text-align:center}
        .ferust-on #viewctl {pointer-events:none}
        .ferust-on #viewctl button {pointer-events:auto}
        .ferust-micro .mw-hud,.ferust-micro .mw-scale {left:4%!important;width:92%!important}
        .ferust-micro .mw-hud {top:42vh!important;bottom:auto}
        .ferust-micro .mw-scale {top:15px!important;text-align:left}
        .ferust-micro .mw-dim {background:rgba(248,245,236,.93);mask-image:none;-webkit-mask-image:none}
        .ferust-on:not(.predicting):not(.hide-steps) .lbar.do,
        .ferust-on:not(.predicting) .lbar.film {display:grid;grid-template-columns:auto 1fr auto auto;gap:3px 6px;padding:5px 8px;font-size:13px;line-height:1.3}
        .ferust-on .lb-main {grid-column:2 / -1}
        .ferust-on .lb-steps {grid-column:2}
        .ferust-on .lb-seal {writing-mode:horizontal-tb;white-space:nowrap}
        .ferust-micro .mw-close {left:auto!important;right:8px;top:48px!important}
      }`);
    document.head.append(sheet);
    const play = h('button', { class: 'mw-play', onclick: () => { scene.paused = !scene.paused; } }, '暂停');
    const replay = h('button', { class: 'mw-play', onclick: () => { scene.time = 0; scene.paused = false; } }, '从头看');
    overlay.querySelector('.mw-hud').append(play, replay);

    const nailTip = V(0, -HALF);
    function draw() {
      nail.position.copy(S.nail); nail.rotation.z = S.angle; film.visible = S.wet;
      nailTip.set(HALF * Math.sin(S.angle), -HALF * Math.cos(S.angle), 0);
      nail.userData.ringY = S.dipped && !S.inside && S.moving !== 'nail' ? CUP_RIM + 0.002 : S.nail.y + 0.003;
      cap.position.copy(S.cap); cap.userData.ringY = S.cap.y + 0.016;
      waterLevel(S.rise);
      nameplates(S, mic.isOpen);
    }
    function record(action, result) { if (!S.demo) W.tbl.add([action, result]); }
    function status(text) { if (!S.demo) W.ui.status(text); }
    function done(id) { if (!S.demo) bar.done(id); }
    function putBack(key, to, angle = 0, duration = 0.37) {
      S.returns[key] = { from: S[key].clone(), to: to.clone(), angle: S.angle, endAngle: angle, t: 0, duration };
    }
    const nailHint = () => S.inside ? '' : !S.wet ? '把铁钉浸入饱和食盐水' : S.sealed ? unseal : insert;
    const capHint = () => S.sealed ? '提起橡胶塞，打开管口' : '把橡胶塞塞进具支试管口';
    const tubeZone = {
      name: '具支试管口', radius: 0.022, enabled: () => !S.sealed,
      position() {
        // 钉尖已经伸入时，允许沿管轴继续下放，到当前深度也能松手。
        const inBore = Math.abs(S.nail.x + nailTip.x - TUBE) < 0.009;
        return V(TUBE, inBore ? clamp(S.nail.y + nailTip.y, BOTTOM.y - HALF, RIM) : RIM);
      },
    };
    // 取钉身与杯内可见液体相交的一段。钉尖斜伸出杯壁时，按杯壁处的高度判断。
    function touchesBrine() {
      const dx = HALF * Math.sin(S.angle), dy = HALF * Math.cos(S.angle);
      const right = CUP + 0.0258, left = CUP - 0.0258;
      if (S.nail.x - dx > right || S.nail.x + dx < left) return false;
      const along = dx > 0 ? Math.min(1, (right - S.nail.x) / dx) : 1;
      return S.nail.y - along * dy <= BRINE_LEVEL;
    }
    const grabPoint = V(0, 0);
    let grabAngle;
    const nailDrag = {
      obj: nail, keepOffset: true, plane: 'xy', hint: nailHint, enabled: () => !S.inside,
      dropOffset: nailTip,
      dropzones: [
        { name: '饱和食盐水', radius: 0.026, enabled: () => !S.dipped && touchesBrine(),
          position: () => V(CUP, clamp(S.nail.y + nailTip.y, DIPPED.y - HALF, BRINE_LEVEL)) },
        tubeZone,
      ],
      onStart() {
        S.moving = 'nail';
        grabPoint.copy(S.nail); grabAngle = S.angle;
      },
      onDrag(p) {
        delete S.returns.nail;
        const angle = grabAngle * (1 - clamp(p.distanceTo(grabPoint) / (S.dipped ? 0.02 : 0.031), 0, 1));
        S.angle = angle;
        const tipDepth = HALF * Math.cos(angle);
        const x = clamp(p.x, -0.17, 0.135), y = clamp(p.y, tipDepth + 0.002, 0.17);
        const lastX = S.nail.x;
        S.nail.set(x, y, 0);
        // 低于容器边缘时只能在同一侧移动，抬出杯口才可以横移。
        if (y - tipDepth < CUP_RIM - 0.002 && Math.abs(lastX - CUP) <= 0.0231)
          S.nail.x = clamp(x, CUP - 0.023, CUP + 0.023);
        if (y - tipDepth < RIM - 0.003) {
          if (lastX <= TUBE - 0.016) S.nail.x = Math.min(S.nail.x, TUBE - 0.016);
          else if (lastX >= TUBE + 0.016) S.nail.x = Math.max(S.nail.x, TUBE + 0.016);
          else if (Math.abs(lastX - TUBE) <= 0.008) S.nail.x = clamp(x, TUBE - 0.008, TUBE + 0.008);
        }
        if (S.sealed && Math.abs(S.nail.x - TUBE) < 0.017) S.nail.y = Math.max(y, RIM + tipDepth + 0.014);
        if (!S.wet && touchesBrine()) {
          S.wet = true; done('dip'); record('浸入饱和食盐水', '铁钉表面润湿');
          status(S.sealed ? unseal : insert);
          if (S.sealed && !S.demo) bar.say(unseal);
        }
        draw();
      },
      onEnd(moved, zone) {
        S.moving = '';
        if (!moved || S.inside) return;
        if (zone === tubeZone) {
          S.inside = true; putBack('nail', BOTTOM, TUBE_ANGLE, 0.42);
          record('放入具支试管', S.wet ? '铁钉带着水膜' : '铁钉未经食盐水浸泡');
          done('insert'); status(close);
          if (!S.wet && !S.demo) bar.say(close);
          return;
        }
        S.dipped = S.wet;
        putBack('nail', S.dipped ? DIPPED : DRY, S.dipped ? REST_ANGLE : DRY_ANGLE);
        if (S.wet || Math.abs(S.nail.x - TUBE) < 0.026) status(S.sealed ? unseal : insert);
      },
    };
    // 塞子与试管轴线位于同一竖直拖动平面。
    let liftingCap = false;
    const capZone = { name: '具支试管口', position: SEAT, radius: 0.025, enabled: () => !liftingCap };
    const capDrag = {
      obj: cap, keepOffset: true, plane: 'xy', offset: PLUG.z, hint: capHint,
      dropzones: [capZone],
      onStart() { S.moving = 'cap'; liftingCap = S.sealed; delete S.returns.cap; },
      onDrag(p) {
        if (S.sealed && p.y <= RIM) {
          S.cap.set(TUBE, Math.max(SEAT.y, p.y), 0); draw(); return;
        }
        if (p.distanceTo(SEAT) > capZone.radius) liftingCap = false;
        if (S.sealed) {
          S.sealed = false;
          record('打开管口', '装置与外界空气连通');
          if (S.seen) status('本轮已观察。开口后，导管内外水面会重新相平。');
          else if (!S.demo) {
            bar.undo('seal');
            if (!S.inside) { bar.say(null); status(S.wet ? insert : intro); }
          }
        }
        const fromX = S.cap.x;
        S.cap.set(clamp(p.x, -0.16, 0.14), clamp(p.y, PLUG.y, 0.19), 0);
        if (p.y < SEAT.y - 0.001) {
          if (fromX <= TUBE - 0.027) S.cap.x = Math.min(S.cap.x, TUBE - 0.027);
          else if (fromX >= TUBE + 0.027) S.cap.x = Math.max(S.cap.x, TUBE + 0.027);
          else if (Math.abs(fromX - TUBE) < 0.005) S.cap.y = SEAT.y;
        }
        draw();
      },
      onEnd(moved, zone) {
        const reseat = liftingCap && S.cap.distanceTo(SEAT) <= capZone.radius;
        liftingCap = false; S.moving = ''; if (!moved) return;
        if (S.sealed) { putBack('cap', SEAT); return; }
        if (zone || reseat) {
          S.sealed = true; putBack('cap', SEAT);
          record('塞紧管口', '装置与外界空气隔开');
          if (S.inside) { done('seal'); status(S.seen ? '本轮已观察。管口已重新塞紧。' : wait); if (!S.wet && !S.demo) bar.say(wait); }
          else {
            status('管内还没有铁钉。提起橡胶塞，再放铁钉。');
            if (S.wet && !S.demo) bar.say(unseal);
          }
        } else { putBack('cap', PLUG); if (S.inside && !S.seen) status('管口敞着。将橡胶塞的小头对准管口塞紧。'); }
      },
    };

    const readingPrompt = '哪边的水面高？';
    const readingLabel = h('div', { 'aria-live': 'polite' }, readingPrompt);
    const choices = ['管外较高', '两边相平', '管内较高'].map((label, index) =>
      h('button', { type: 'button', onclick: () => submitReading(index) }, label));
    const reading = h('div', { class: 'ferust-reading', hidden: true, role: 'group', 'aria-label': readingPrompt }, readingLabel, ...choices);
    document.body.append(reading);
    const readyToRead = () => S.near && S.inside && S.sealed && !S.demo && !S.seen && !S.drySeen &&
      (S.wet ? S.rise >= 0.999 : S.dryWait >= 4);
    function submitReading(index) {
      if (!readyToRead()) return;
      if (index !== (S.wet ? 2 : 1)) {
        readingLabel.textContent = '再对照两处水面。';
        return;
      }
      if (!S.wet) {
        S.drySeen = true; record('未经浸泡，等了一会儿', '水柱没有明显移动');
        const message = '这轮铁钉未经浸泡，水柱没有明显移动。全部重来，先浸食盐水再比较。';
        status(message); bar.say(message);
        return;
      }
      S.seen = true; done('watch'); record('几分钟后（时间加快）', observation);
      W.ui.observePrediction(observation); status(observation); W.next.hidden = false; W.review.open();
    }
    function waterView() {
      readingLabel.textContent = readingPrompt;
      S.near = true;
      if (!S.demo && bar.current === 'watch') bar.say(compare);
      focusWater();
    }
    function focusWater() {
      look([WATER, 0.065, 0], [0, 0.06, 1], 0.20, () => {
        if (S.demo) bar.stop(); else leaveWater();
      });
    }
    function refitWater() {
      if (!S.near || S.demo) return;
      back(); window.__lb.live.reframe(); focusWater();
    }
    window.addEventListener('resize', refitWater);
    function leaveWater() {
      S.near = false; back();
      if (bar.current === 'watch') bar.say(null);
    }
    const canLook = () => S.seen || (S.inside && S.sealed);
    const waterBack = tag('回到桌上', 'pill ferust-back', leaveWater).loc(group, WATER, 0.10, 0.016).show(false);
    const drag = draggable(group, [nailDrag, capDrag], { tip: tag('', 'pill'), taps: [{
      obj: bathGlass, enabled: canLook, hint: () => !canLook() ? '' : S.near ? '回到桌上' : '凑近看水面',
      onTap() { if (S.near) leaveWater(); else waterView(); },
    }] });
    const act = demoActs(drag, group);
    const shots = [
      { cap: intro, dur: 3.2, during: act.drag(nail, V(CUP, BRINE_LEVEL), { from: DRY, t1: 0.74, release: 0.8 }) },
      { cap: insert, dur: 4.5, during: act.path(nail, [DIPPED, V(CUP, ENTRY.y + 0.005), V(TUBE, ENTRY.y + 0.005), ENTRY], { t1: 0.79, release: 0.81 }) },
      { cap: close, dur: 3.6, during: act.path(cap, [PLUG, V(PLUG.x, RIM + 0.02, PLUG.z), V(TUBE, RIM + 0.02), SEAT], { t1: 0.78, release: 0.83 }) },
      { cap: compare, dur: 7, during: act.tap(bathGlass, 0.02) },
      { cap: '钻进铁钉表面的水膜，跟着电子看氧气去了哪里。', dur: 24,
        cam: [[TUBE, at().y + 0.05, at().z], [0.05, 0.48, 1], 0.285], enter: () => { S.near = false; mic.open(true); } },
    ];
    const steps = [
      { id: 'dip', title: '浸铁钉', todo: intro, target: () => S.inside || S.moving ? null : nail },
      { id: 'insert', title: '放铁钉', todo: insert, target: () => S.moving ? null : S.sealed ? cap : nail },
      { id: 'seal', title: '塞紧管口', todo: close, target: () => S.moving ? null : cap },
      { id: 'watch', title: '看水柱', todo: wait, target: () => S.near || mic.isOpen ? null : bathGlass },
    ];
    const bar = lessonBar({ group, look, back, steps, ringOptions: { minOpacity: 0.55 },
      reels: { demo: { seal: '演示', label: '老师演示', ...sandbox({
        get: () => S, set: (s) => { drag.clearDropzones(); S = s; S.moving = ''; }, fresh, apply: () => { mic.close(); draw(); }, bar: () => bar,
        view: { save: () => mic.isOpen || S.near ? { version, near: S.near, time: scene.time, paused: scene.paused } : null,
          restore: (v) => {
            if (v.version !== version) return;
            if (v.near) waterView();
            else { mic.open(); scene.time = v.time; scene.paused = v.paused; }
          } },
      }), shots } } });
    function reset() {
      version++; if (bar.playing) bar.stop(); mic.close(); drag.clearDropzones(); S = fresh(); draw();
      bar.undo(...ids); bar.say(null); W.tbl.clear(); W.review.close(); W.next.hidden = true;
      W.ui.relock(); W.ui.observePrediction(''); W.ui.status(intro); back();
    }
    function update(dt) {
      // 微观层先接收 Esc 和回到桌上。离开演示的最后一个镜头时也交还学生的器材。
      if (bar.playing && bar.shot === shots.length - 1 && !mic.isOpen) bar.stop();
      const speed = bar.update(dt), elapsed = Math.min(dt, 0.1) * speed;
      drag.update(speed ? Math.min(dt, 0.08) : 0);
      for (const key of Object.keys(S.returns)) {
        if (S.moving === key) continue;
        const r = S.returns[key]; r.t += elapsed;
        const u = clamp(r.t / r.duration, 0, 1);
        const k = key === 'nail' && S.inside ? u * u : THREE.MathUtils.smoothstep(u, 0, 1);
        S[key].lerpVectors(r.from, r.to, k);
        if (key === 'nail') {
          S.angle = THREE.MathUtils.lerp(r.angle, r.endAngle, k);
          if (S.dipped && !S.inside) S.nail.y = Math.max(S.nail.y, CUP_FLOOR + HALF * Math.cos(S.angle));
        }
        if (u === 1) delete S.returns[key];
      }
      // 耗氧量用等温、外界压强下的等效气体体积表示（m³）。开口后外界空气补入。
      // (p₀ − ρgΔh)(V₀ − Ah) = p₀(V₀ − ΔV)，Δh 包含外管水面回落。
      const area = Math.PI * 0.00335 ** 2, gas = 0.000065, p0 = 101325;
      const gradient = 1000 * 9.81 * (1 + 0.00335 ** 2 / (0.0168 ** 2 - 0.0039 ** 2));
      const b = p0 * area + gradient * gas;
      const maxRise = 0.039, maxUsed = maxRise * (b - gradient * area * maxRise) / p0;
      if (S.sealed && S.inside && S.wet) S.oxygenUsed = Math.min(maxUsed, S.oxygenUsed + elapsed * maxUsed * 0.16);
      else if (!S.sealed) S.oxygenUsed = Math.max(0, S.oxygenUsed - elapsed * maxUsed * 1.6);
      S.rise = (2 * p0 * S.oxygenUsed) / (b + Math.sqrt(b * b - 4 * gradient * area * p0 * S.oxygenUsed)) / maxRise;
      S.progress = Math.max(S.progress, S.rise);
      if (S.sealed && S.inside && !S.wet) S.dryWait += elapsed;
      else S.dryWait = 0;
      reading.hidden = !readyToRead();
      draw();
      const stamp = S.rise > 0.04 ? (S.sealed ? '升高' : '回落') : '相平';
      waterBack.show(S.near && !bar.playing && !mic.isOpen);
      card.text('<div class="cc"><div class="cc-t"><span class="cc-name">导管水面</span><span class="cc-res">' + stamp + '</span></div></div>')
        .loc(group, WATER + 0.012, innerWidth <= 760 ? 0.15 : 0.123, 0).show((S.seen || S.drySeen) && !bar.playing && !mic.isOpen && !S.near);
      mic.update(dt, speed);
      play.hidden = replay.hidden = S.demo; play.textContent = scene.paused ? '继续' : '暂停';
    }
    draw();
    return {
      group: root, card: false, toggles: ['cards', 'steps'], size: { w: 0.32, d: 0.16, h: 0.175 },
      view: { elev: 14, azim: 0, lookY: 0.49, frameMargin: 1.14 },
      pointer: wrapPointer(drag, bar), update, reset,
      mount(ui) {
        const review = think({ title: '想一想（选做）', q: '水为什么能沿右侧的细导管上升？',
          options: ['铁钉腐蚀消耗氧气，外界大气压把水压入导管', '铁钉腐蚀放出气体，把水顶进导管'],
          ok: '铁失去电子，溶解的氧得到电子。管内氧气减少，外界大气压推动水柱上升。',
          wrong: ['顺着弯管想一想，假如管内气体增多，会把水往哪一边推？'], status: ui.status });
        const note = h('details', { class: 'more' }, h('summary', {}, '模型、近似和出处'), h('p', { class: 'fineprint' }, noteText));
        const base = mountXuean(ui, { intro, headers: ['操作', '观察记录'], controls: [moreBox([], reset), note] });
        ui.data.nextElementSibling.style.display = 'none';
        ui.data.append(base.next, review.el); W = { ...base, review, ui }; bar.attach(ui);
      },
      dispose() { version++; window.removeEventListener('resize', refitWater); mic.dispose(); bar.dispose(); drag.dispose(); reading.remove(); sheet.remove(); document.body.classList.remove('ferust-on'); },
      debug: { get S() { return S; }, bar, picks: { nail, cap, meniscus }, mic, scene,
        qa: qaFlow(drag, [
          { name: '浅浸铁钉', drag: nail, to: V(CUP, 0.061) }, { name: '放铁钉', drag: nail, to: ENTRY },
          { name: '塞紧管口', drag: cap, to: SEAT, wait: 0.4 },
          { name: '等待水柱变化', run() {}, wait: 7 },
          { name: '核对尚未交卷', run() { if (S.seen || !W.next.hidden || bar.current !== 'watch') throw Error('未观察就完成了'); } },
          { name: '观察水柱', tap: bathGlass },
          { name: '记录水面高低', run() { if (reading.hidden) throw Error('未显示水面选项'); choices[2].click(); } },
          { name: '离开水面近景', run: leaveWater }, { name: '钻进水膜', run: () => mic.open(), wait: 3 },
          { name: '回到桌上', run: () => mic.close() },
          { name: '核对记录', run() { if (!S.wet || !S.inside || !S.sealed || !S.seen || W.next.hidden || !bar.finished) throw Error('水柱或记录未完成'); } },
        ]) },
    };
  },
};
