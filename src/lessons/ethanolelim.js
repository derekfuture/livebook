// 人教版选择性必修 3，印刷第 61—62 页，实验 3-2、图 3-9。项目 PDF 页序 65、66。
import * as THREE from 'three';
import { h } from '../ui/Panel.js';
import { clamp, draggable } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { paperSheet, mountXuean, moreBox, wrapPointer, sandbox, demoActs, qaFlow } from './kit/chemlesson.js';
import { micro } from './kit/microworld.js';
import { apparatus, eliminationScene, V, FX, WX, XS, MOUTH, FLUID, HOME, POUR, DROP, SEAT, LIFT, wetPoint, RIM, LEVEL, NAMES } from './kit/ethanolelim-parts.js';

const SOURCE = '选择性必修 3 第 61—62 页 · 实验 3-2 · 图 3-9';
const INTRO = '烧杯中是 20 mL 乙醇和浓硫酸的混合液，体积比约为 1∶3。把杯嘴移到圆底烧瓶口上方。';
const TODOS = [
  ['fill', '加入混合液', '拖动左侧烧杯，把杯嘴对准圆底烧瓶口，停住倾倒。'],
  ['chips', '放碎瓷片', '把桌上的几片碎瓷片拖到烧瓶口，松手放入。'],
  ['plug', '接通气路', '把上方带温度计的橡胶塞沿瓶颈放下，让玻璃泡浸入混合液。'],
  ['heat', '加热混合液'], ['observe', '观察产物'], ['stop', '停止加热'],
];
const TIP_OUT = '把导管下端提出检验试管的管口。';
const WASH_OUT = '向上拖洗气管的进气长管，使下端离开氢氧化钠溶液。';
const WASH_BACK = '进气口已离开溶液。把长管放回液面下，继续观察。';
const PUT_OUT = '两处管口都已离开液体。点酒精灯熄火。';
const BOTH = '紫色和橙色溶液都逐渐变为无色。';
const COLOR = ['紫色', '橙色'];
const colorWord = (i, v) => v >= 1 ? '无色' : v > 0.03 ? '变浅' : COLOR[i];
const MIC_AT = () => V(FX, FLUID), CAM = [[FX, FLUID + 0.06, 0], [0.03, 0.35, 1], 0.27];
export default {
  id: 'ethanolelim', title: '乙醇的消去反应', fig: '图3-9', stampText: '实验', style: 'paper',
  predict: {
    q: '加热到 170 ℃，把洗过的气体分别通入两支试管。哪种溶液会褪色？',
    options: ['只有紫色的酸性高锰酸钾溶液', '只有橙色的溴的四氯化碳溶液', '两种溶液都会褪色'],
    answer: 2,
  },
  need: '加热混合液，使气体经氢氧化钠溶液洗涤，分别观察两支试管的颜色。',
  conclusion: {
    crops: [{ page: 66, rect: [220, 116, 537, 262] }, { page: 66, rect: [220, 264, 537, 380] }],
    quote: '乙醇在浓硫酸的作用下，加热到170 ℃时生成乙烯。……在这个反应中，乙醇分子脱去一个水分子生成乙烯，发生了消去反应。……如果把乙醇和浓硫酸的混合物的温度控制在140 ℃左右，乙醇将以另一种方式脱水，即每两个乙醇分子间会脱去一个水分子而生成乙醚。',
    formula: 'CH₃CH₂OH → CH₂=CH₂↑ + H₂O（浓硫酸，170 ℃）', src: SOURCE,
  },
  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group(); root.add(group);
    paperSheet(group, { w: 0.47, d: 0.19 });
    const rig = apparatus(group), scene = eliminationScene();
    const fresh = (target = 170) => ({
      demo: false, time: 0, pos: Object.fromEntries(Object.entries(HOME).map(([k,p]) => [k,p.clone()])),
      reading: false, tipAim: null, grip: null, returns: {}, pourLatched: false, pouring: false, tilt: 0, fill: 0, chips: false, sealed: false,
      lit: false, bump: false, temp: 20, target, gas: false, branch: 'cold', fade: [0,0], seen: {},
      steps: new Set(), rows: [], message: INTRO, lifted: false,
    });
    let S = fresh(), W, cancelled = false;
    const rounds = new Map();
    const status = (msg) => { S.message = msg; if (!S.demo) W?.ui.status(msg); };
    const done = (id) => {
      S.steps.add(id);
      if (!S.demo) { bar.done(id); if (id === 'observe' || id === 'stop') syncConclusion(); }
    };
    const record = (action, obs) => { if (!S.demo) { S.rows.push([action, obs]); W?.tbl.add([action, obs]); } };
    const wet = () => XS.findIndex(x => Math.abs(S.pos.tip.x - x) <= 0.0095 && S.pos.tip.y < LEVEL - 0.001);
    const tipInside = () => XS.some(x => Math.abs(S.pos.tip.x-x) < 0.011) && S.pos.tip.y < RIM;
    const stopHint = () => tipInside() ? TIP_OUT : S.lifted ? PUT_OUT : WASH_OUT;
    const refresh = () => { if (!S.demo) bar.say(null); };
    const cards = ['烧瓶', '试管', '试管'].map((name, i) => {
      const card = tag('', i ? 'cond elim-tube-card' : 'cond'), result = h('span', { class:'cc-res' });
      card.el.append(h('div', { class:'cc' }, h('div', { class:'cc-t' }, h('span', { class:'cc-name' }, name), result)));
      const p = i === 0 ? V(FX-0.057, 0.082) : V(XS[i-1], 0.003, 0.095); const narrow = i ? V(XS[i-1], 0.077, 0.005) : p;
      return (word, visible) => {
        const at = innerWidth <= 760 ? narrow : p;
        card.loc(group, at.x, at.y, at.z);
        if (result.textContent !== word) result.textContent = word;
        card.show(visible && !S.demo && !mic.isOpen && !S.reading);
      };
    });
    const mic = micro({ group, tag, look, back, scene, at: MIC_AT, btnAt: () => V(FX, 0.100, 0.017),
      label: '钻进圆底烧瓶里看', state: () => ({ branch: S.branch }), key: () => S.branch,
      show: () => W?.ui.step === 1 && S.sealed && !S.grip && !S.bump && !S.reading, bar: () => bar, scale: 0.014, lookD: CAM[1], dist: CAM[2] });
    const scaleCamera = () => [[FX + 0.002, SEAT.y + 0.033, 0], [0, 0, 1], innerWidth <= 760 ? 0.085 : 0.12];
    function readScale() {
      S.reading = true;
      look(...scaleCamera(), () => { S.reading = false; });
    }
    function closeScale() {
      if (S.reading) { S.reading = false; back(); }
    }
    const readButton = tag('', 'pill elim-read', () => S.reading ? closeScale() : readScale());
    function plate(parent, position, label, show = () => true, layout = '') {
      const sign = tag('', 'elim-name ' + layout).loc(parent, ...position);
      return () => sign.text(typeof label === 'function' ? label() : label).show(!mic.isOpen && !S.reading && show());
    }
    const contents = (name, ...lines) => name + '<br><span>' + lines.join('</span><span>') + '</span>';
    const cupLabel = contents('烧杯', '乙醇和浓硫酸', '的混合液');
    const flaskLabel = contents('圆底烧瓶', '乙醇和浓硫酸', '的混合液');
    const plates = [
      plate(rig.cup, [-0.017, -0.027, 0.044], () => S.fill < 1 ? cupLabel : '烧杯', () => S.grip !== 'cup' && !S.pouring && !S.returns.cup),
      plate(rig.chips, [0, 0.001, 0.038], '碎瓷片', () => !S.chips && !S.grip),
      plate(rig.plug, [0.023, 0.012, 0], '橡胶塞', () => !S.grip),
      plate(rig.plug, [0.015, 0.048, 0], '温度计', () => !S.sealed && !S.grip),
      plate(group, [FX-0.044, 0.115, 0.008], () => S.fill ? flaskLabel : '圆底烧瓶', undefined, 'elim-flask-name'),
      plate(group, [FX-0.029, 0.185, -0.024], '铁架台'),
      plate(group, [FX, 0.003, 0.046], '酒精灯'),
      plate(rig.wash, [0.002, -0.018, 0.005], '进气长管', () => !S.grip),
      plate(group, [WX, 0.009, 0.045], contents('洗气管', '氢氧化钠', '溶液')),
      plate(rig.tip, [0.014, 0.057, 0], '导管', () => !S.grip),
      ...XS.map((x, i) => plate(group, [x, 0.009, 0.045], i ? contents('检验试管', '溴的', '四氯化碳', '溶液') : contents('检验试管', '酸性', '高锰酸钾', '溶液'))),
      plate(group, [(XS[0] + XS[1]) / 2, 0.040, 0.017], '试管架'),
    ];
    const overlay = [...document.querySelectorAll('.mw')].pop(); overlay.dataset.ethanolelim = '';
    const replay = h('button', { onclick: () => { scene.time = 0; scene.paused = false; } }, '从头看');
    const pause = h('button', { onclick: () => { scene.paused = !scene.paused; } }, '暂停');
    const replayNote = h('small', {}, '本轮反应回放 · 净成键变化示意');
    const playControls = h('div', { class: 'elim-play' }, pause, replay);
    overlay.querySelector('.mw-hud').prepend(replayNote);
    overlay.querySelector('.mw-hud').append(playControls);
    const style = h('style', {}, `
      .tag3d.elim-name {pointer-events:none;font:600 clamp(10px,1vw,14px)/1.24 var(--song);color:#403b32;text-align:center;text-shadow:0 0 3px #fffdf4,0 0 5px #fffdf4;background:#fffaf0d9;border-radius:2px;padding:1px 4px}
      body.predicting .tag3d.elim-name,body.predicting .tag3d.pill.elim-hint {visibility:visible!important}
      [data-elim-panel] .flap.open .flap-back {position:relative}
      .tag3d.elim-read {animation:none}
      .mw[data-ethanolelim] .mw-hud {top:auto!important;bottom:12%;left:calc(50% + 170px)!important;transform:translateX(-50%);width:min(540px,55vw)!important;background:#fcfaf2eb;color:#403c34;padding:8px 14px;border-radius:7px}
      .mw[data-ethanolelim] .mw-cap {font-size:16px}.elim-play button {pointer-events:auto;font:inherit;padding:3px 12px;margin:5px 4px 0;border:1px solid #c5bcaa;border-radius:4px;background:#faf7ec;cursor:pointer}
      [data-elim-demo] .p-body,[data-elim-demo] .p-tabs {visibility:hidden}
      .elim-demo {position:absolute;left:24px;right:24px;top:104px}
      [data-elim-panel] .answer .src {padding-right:54px;min-height:40px}
      [data-elim-panel]:not([data-ether]) .answer .page-crop:nth-child(2),[data-elim-panel][data-ether] .answer .page-crop:first-child,[data-elim-panel][data-ether] .verdict {display:none}
      [data-elim-panel] .answer .seal-stamp {width:42px;height:42px;font-size:15px;bottom:10px;right:12px;writing-mode:horizontal-tb;display:grid;place-items:center;letter-spacing:0}
      .mw[data-ethanolelim] .mw-eq {font-family:"Times New Roman","Songti SC",serif}
      @media(max-width:900px){.mw[data-ethanolelim] .mw-hud {left:58%!important;bottom:10%;width:72vw!important}.mw[data-ethanolelim] .mw-scale {left:3%!important;width:80vw!important;top:8px!important}.mw[data-ethanolelim] .mw-close {left:auto!important;right:5px;top:6px!important}}
      @media(max-width:1050px){
        body.lesson-on:not(.predicting):not(.hide-steps) .lbar[data-elim-bar].do,body.lesson-on .lbar[data-elim-bar].film {display:grid;grid-template-columns:auto 1fr auto auto auto;gap:3px 6px;font-size:13px;line-height:1.3;padding:5px 8px}
        .lbar[data-elim-bar] .lb-seal {grid-column:1;grid-row:1;writing-mode:horizontal-tb}
        .lbar[data-elim-bar] .lb-main {grid-column:2/-1;grid-row:1}
        .lbar[data-elim-bar] .lb-steps {grid-column:2;max-width:none;gap:3px}
        .lbar[data-elim-bar] .lb-demo {padding:3px 6px}
      }
      @media(min-width:761px) and (max-width:1050px) and (max-height:550px){
        .lbar[data-elim-bar] {left:12px;bottom:7px;width:380px;transform:none}
        body.lesson-on:not(.predicting) [data-elim-panel]:not(.folded) {bottom:76px}
        .mw[data-ethanolelim] .mw-hud {left:18px!important;width:320px!important;transform:none;top:78px!important;bottom:auto}
      }
      @media(max-width:760px){
        #panel[data-elim-panel]:not(.folded) {height:43vh}
        body:not(:has(#panel.folded)) .lbar[data-elim-bar] {bottom:calc(43vh + 12px)}
        .tag3d.elim-name {padding:1px 2px}
        .tag3d.elim-name span {display:block}
        .tag3d.elim-flask-name {margin-left:-57px;margin-top:-12px}
        .tag3d.elim-tube-card .cc {padding:2px}
        .tag3d.elim-tube-card .cc-name {display:none}
        .tag3d.elim-tube-card .cc-res {font-size:10px}

        .mw[data-ethanolelim] .mw-hud {left:50%!important;width:85vw!important;bottom:12%}
      }
    `); document.head.append(style);
    const homeward = (key, to = HOME[key], duration = 0.40) => {
      S.returns[key] = { from: S.pos[key].clone(), to: to.clone(), elapsed: 0, duration };
    };
    const atLip = (p) => p.distanceTo(POUR) < 0.0025;
    const canRestoreWash = () => S.lifted && !S.bump && !S.steps.has('observe');
    const allowed = (k) => {
      if (mic.isOpen || S.reading) return false;
      if (k === 'wash') return canRestoreWash() || (S.lit && !tipInside() && !S.lifted);
      if (k === 'tip') return !S.lifted;
      return !S.sealed && (k === 'cup' ? S.fill < 1 : k !== 'chips' || !S.chips);
    };
    function move(k, p) {
      if (S.grip !== k || !p) return;
      const pos = S.pos[k];
      if (k === 'wash') { pos.y = clamp(p.y, HOME.wash.y, LIFT.y); rig.wash.position.copy(pos); return; }
      let x = clamp(p.x, -0.192, 0.178), y = clamp(p.y, k === 'cup' ? 0.032 : k === 'plug' ? 0.075 : 0.004, k === 'tip' ? 0.16 : 0.28);
      if (k === 'plug') {
        // 温度计先过瓶口。已经入颈的温度计不能横穿瓶壁。
        const aboveRim = MOUTH.y + 0.071;
        if (y < aboveRim && pos.y < aboveRim && Math.abs(pos.x - FX) < 0.006) x = clamp(x, FX-0.004, FX+0.004);
        else if (y < aboveRim && Math.abs(x-FX) > 0.004) y = aboveRim;
      }
      if (k === 'tip') {
        const oldTube = XS.findIndex(v => Math.abs(pos.x - v) <= 0.010);
        if (y < RIM + 0.001 && oldTube >= 0 && pos.y < RIM) x = clamp(x, XS[oldTube] - 0.0099, XS[oldTube] + 0.0099);
        else if (y < RIM && XS.every(v => Math.abs(x - v) > 0.0099)) y = RIM + 0.001;
        y = Math.max(0.024, y);
        // 进出两段吸附区时，让玻璃管连续移动到新的对准位置。
        S.tipAim = (S.tipAim || V()).set(x, y, 0);
      } else { pos.set(x, y, 0); rig[k].position.copy(pos); }
    }
    function release(k, moved, zone) {
      if (S.grip !== k) return;
      S.grip = null; S.tipAim = null;
      if (!moved) return;
      const p = S.pos[k];
      if (!cancelled) {
        if (k === 'cup' && zone && S.fill < 1) { S.pourLatched = true; return; }
        if (k === 'chips' && zone && S.fill === 1) {
          S.chips = true; status('碎瓷片已落入瓶底。将带温度计的塞子从瓶口上方插入。'); homeward(k, V(FX + 0.001, 0.061, 0.002), 0.34);
          done('chips'); record('放入几片碎瓷片', '瓷片沉到瓶底'); return;
        }
        if (k === 'plug' && zone && p.distanceTo(SEAT) < 0.0065 && S.fill === 1) {
          S.sealed = true; p.copy(SEAT); done('plug'); record('塞好带温度计的塞子', '玻璃泡浸在混合液中');
          if (!S.chips && !S.demo) bar.say('先点塞子取下，再将碎瓷片放进冷的混合液。', 'chips');
          status(S.chips ? '点燃烧瓶下方的酒精灯，观察液温。' : '烧瓶里还没有碎瓷片。未加热时可点塞子取下。'); return;
        }
        if (k === 'wash' && zone) {
          S.lifted = zone.position === LIFT;
          if (S.lifted) {
            record('提起洗气管长管', '进气口离开氢氧化钠溶液');
            status(canRestoreWash() ? WASH_BACK : PUT_OUT);
          } else {
            record('放回进气长管', '管口重新浸入氢氧化钠溶液');
            status(S.lit ? (S.gas ? observationHint() : '观察温度计和洗气管里的气泡。') : '点燃烧瓶下方的酒精灯，观察液温。');
          }
          refresh(); return;
        }
        if (k === 'tip' && zone && (!tipInside() || Math.abs(p.x - XS[zone.tube]) < 0.010)) {
          homeward(k, zone.position, 0.18);
          if (!zone.mouth && p.y > RIM) S.returns.tip.via = V(XS[zone.tube], RIM + 0.002);
          if (zone.mouth) status('让导管下端伸到液面以下。换管时先把下端提过管口。');
          if (S.steps.has('observe')) status(TIP_OUT);
          refresh(); return;
        }
      }
      if (k === 'tip') {
        if ((S.steps.has('observe') || S.bump) && !tipInside()) { status(WASH_OUT); refresh(); }
        else status('让导管下端伸到液面以下。换管时先把下端提过管口。');
      }
      if (k === 'chips' && zone && S.fill < 1) status('先将混合液加入烧瓶，再放碎瓷片。');
      homeward(k, k === 'wash' && S.lifted ? LIFT : HOME[k]);
      if (k === 'tip' && tipInside()) S.returns.tip.via = V(p.x, RIM + 0.006);
    }
    function light() {
      if (!S.sealed) { status('先装好带温度计的塞子，接通洗气装置。'); return; }
      if (S.lifted && !S.lit) return;
      if (S.lit && (!S.lifted || tipInside())) { status(stopHint()); return; }
      S.lit = !S.lit;
      if (S.lit) { S.seen.heated = true; record('点燃酒精灯', '温度计液柱上升'); status('观察温度计和洗气管里的气泡。'); }
      else { S.gas = false; record('熄灭酒精灯', '液温逐渐下降');
        if (S.bump) status('酒精灯已熄灭。全部重来，在冷的混合液中加入碎瓷片。');
        else if (S.steps.has('observe')) { done('stop'); status('火焰熄灭，液温下降。可以对照本轮的课本结论了。'); }
        else status('观察尚未完成。把进气长管放回液面下，再点灯加热。');
      }
      refresh();
    }
    const hints = { cup: '拖烧杯，将杯嘴对准烧瓶口', chips: '拖碎瓷片到烧瓶口', plug: '拖橡胶塞到烧瓶口', tip: '拖动检验用的导管', wash: '向上拖洗气管的进气长管' };
    let startTube = -1;
    const zones = {
      cup: [{ name: '圆底烧瓶口', position: POUR, radius: 0.032 }],
      chips: [{ name: '圆底烧瓶口', position: DROP, radius: 0.032 }],
      plug: [{ name: '圆底烧瓶口', position: SEAT, radius: 0.030 }],
      wash: [{ name: '洗气管', position: LIFT, radius: 0.022, enabled: () => !S.lifted },
        { name: '洗气管', position: HOME.wash, radius: 0.022, enabled: canRestoreWash }],
      tip: XS.flatMap((x, i) => [
        { name: '检验试管口', position: V(x, RIM + 0.002), radius: 0.025, tube: i, mouth: true,
          enabled: () => startTube !== i && (!tipInside() || Math.abs(S.pos.tip.x - x) < 0.010) },
        { name: NAMES[i], position: wetPoint(i), radius: 0.032, tube: i,
          enabled: () => !tipInside() || Math.abs(S.pos.tip.x - x) < 0.010 },
      ]),
    };
    const drags = Object.keys(HOME).map(k => ({
      obj: rig[k + 'Pick'], anchor: rig[k], keepOffset: true, plane: 'xy', dropzones: zones[k],
      enabled: () => allowed(k) || (k === 'plug' && S.sealed && !S.lit && !S.seen.heated && !mic.isOpen && !S.reading),
      hint: () => allowed(k) ? (k === 'wash' && S.lifted ? '向下拖进气长管' : hints[k]) : k === 'plug' && S.sealed && !S.lit && !S.seen.heated ? '点塞子取下' : '',
      onStart() { if (allowed(k)) { S.grip = k; delete S.returns[k]; if (k === 'tip') startTube = wet(); } },
      onDrag: p => move(k, p), onEnd: (moved, zone) => release(k, moved, zone),
      ...(k === 'plug' ? { onTap() {
        if (S.sealed && !S.lit && !S.seen.heated) {
          S.sealed = false; S.steps.delete('plug'); homeward('plug'); if (!S.demo) { bar.undo('plug'); bar.say(null); } status('烧瓶口已打开。');
        }
      } } : {}),
    }));
    const canRead = () => W?.ui.step === 1 && S.sealed && !S.grip && !S.reading && !mic.isOpen && !S.demo;
    const canUseLamp = () => !S.reading && !mic.isOpen && (!S.lifted || S.lit);
    const drag = draggable(group, drags, { tip: tag('', 'pill elim-hint'), taps: [
      { obj: rig.rule, enabled: canRead, hint: () => canRead() ? '近看温度计' : '', onTap: readScale },
      { obj: rig.lampPick, enabled: canUseLamp, hint: () => canUseLamp() ? (S.lit ? '熄灭酒精灯' : '点燃酒精灯') : '', onTap: light },
    ] });
    const act = demoActs(drag, group);
    const sandboxed = sandbox({
      get: () => S, set: s => { S = s; }, fresh, bar: () => bar,
      apply() { drag.clearDropzones(); mic.close(); rig.display(S, wet()); },
      view: { save: () => mic.isOpen ? { state: S, time: scene.time, paused: scene.paused } : S.reading ? { state: S, reading: true } : null,
        restore(v) { if (v.state !== S) return; if (v.reading) { readScale(); return; } mic.open(); scene.time = v.time; scene.paused = v.paused; } },
    });
    const observationHint = () => S.target === 140 ? '钻进圆底烧瓶里看，追踪连接两个乙基的氧。' : S.fade.some(v => v === 1) ? '把导管提出管口，接着检验' + COLOR[S.fade[0] === 1 ? 1 : 0] + '试管。' : '把导管下端伸入一支检验液，观察颜色。';
    const targets = [rig.cup, rig.chips, rig.cork];
    const stopTarget = () => tipInside() ? rig.stem : S.lifted ? rig.lamp.children[0] : rig.wash;
    const bar = lessonBar({ look, back, group, ringOptions: { minOpacity: 0.61 },
      steps: TODOS.map(([id,title,todo], i) => ({ id, title, get todo() {
        if (canRestoreWash()) return S.lit ? WASH_BACK : S.message;
        if (id === 'observe' && !S.lit) return S.message;
        if (S.lifted) return S.lit ? PUT_OUT : S.message;
        if (id === 'chips' && S.sealed) return S.bump ? (S.lit ? stopHint() : S.message) : S.lit ? '液体已开始受热。不要向热液体中补加碎瓷片。' : '先点塞子取下，再将碎瓷片放进冷的混合液。';
        if (id === 'heat') return (S.lit ? '观察温度计：' : '点燃酒精灯，') + (S.target === 170 ? '让液温迅速升到 170 ℃。' : '让液温保持在约 140 ℃。');
        if (id === 'observe') return observationHint();
        return id === 'stop' ? stopHint() : todo;
      }, target: () => {
        if (mic.isOpen || S.reading || S.grip) return null;
        if (canRestoreWash()) return rig.wash;
        if (id === 'observe' && !S.lit) return rig.lamp.children[0];
        if (S.lifted) return S.lit ? rig.lamp.children[0] : null;
        if (id === 'chips' && S.sealed) return S.bump && S.lit ? stopTarget() : S.seen.heated ? null : rig.cork;
        if (id === 'heat') return S.lit ? rig.rule : rig.lamp.children[0];
        if (id === 'observe') return S.target === 140 ? rig.flask : rig.stem;
        if (id === 'stop') return stopTarget();
        return targets[i];
      } })),
      reels: { demo: { label: '老师演示', ...sandboxed, shots: [
        { cap: TODOS[0][2], dur: 3.5, during: act.path(rig.cupPick, [HOME.cup, V(-0.145, 0.15), POUR], { t0: 0.03, t1: 0.59, release: 0.91 }) },
        { cap: TODOS[1][2], dur: 2.6, during: act.path(rig.chipsPick, [HOME.chips, V(-0.115, 0.15), DROP], { t0: 0.05, t1: 0.75, release: 0.79 }) },
        { cap: TODOS[2][2], dur: 3.3, during: act.drag(rig.plugPick, SEAT, { from: HOME.plug, t0: 0.06, t1: 0.84, release: 0.91 }) },
        { cap: '平视温度计，观察液柱升到 170 ℃ 刻线。', dur: 6.4, cam: scaleCamera(), during: act.tap(rig.lampPick, 0.06) },
        { cap: '观察进气长管下端冒出的气泡。', dur: 2.8, cam: [[WX, 0.065, 0], [0, 0.10, 1], 0.20] },
        { cap: '将洗过的气体通入酸性高锰酸钾溶液。', dur: 5.4, during: act.path(rig.tipPick, [HOME.tip, V(XS[0], HOME.tip.y), wetPoint(0)], { t0: 0.04, t1: 0.36, release: 0.4 }) },
        { cap: '提出导管，改通入溴的四氯化碳溶液。', dur: 6.5, during: act.path(rig.tipPick, [wetPoint(0), V(XS[0], HOME.tip.y), V(XS[1], HOME.tip.y), wetPoint(1)], { t0: 0.04, t1: 0.48, release: 0.53 }) },
        { cap: TIP_OUT, dur: 2, during: act.path(rig.tipPick, [wetPoint(1), V(XS[1], HOME.tip.y), HOME.tip]) },
        { cap: WASH_OUT, dur: 2, during: act.drag(rig.washPick, LIFT, { from: HOME.wash }) },
        { cap: PUT_OUT, dur: 1.5, during: act.tap(rig.lampPick, 0.3) },
        { cap: '追踪相邻碳上的氢和羟基。', dur: 10.5, cam: CAM, enter: () => mic.open(true) },
      ] } } });
    [...document.querySelectorAll('.lbar')].pop().dataset.elimBar = '';
    // 转屏时重新取一次微观机位，保留学生正暂停或正在看的那一帧。
    let resizeFrame = 0;
    function resizeMicro() {
      if ((!mic.isOpen && !S.reading) || S.demo) return;
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        if (S.reading) { closeScale(); window.__lb.live.reframe(); readScale(); return; }
        if (!mic.isOpen || S.demo) return;
        const time = scene.time, paused = scene.paused;
        mic.close();
        window.__lb.live.reframe();
        mic.open();
        scene.time = time; scene.paused = paused;
      });
    }
    window.addEventListener('resize', resizeMicro);
    const wrapped = wrapPointer(drag, bar);
    const pointer = { ...wrapped, up(ray,e) { cancelled = e?.type === 'pointercancel'; try { return wrapped.up(ray,e); } finally { cancelled = false; } } };

    function updateMatter(dt) {
      S.time += dt;
      if (S.tipAim) {
        const tip = S.pos.tip, distance = tip.distanceTo(S.tipAim);
        if (distance) tip.lerp(S.tipAim, Math.min(1, dt * 0.42 / distance));
      }
      for (const [key, a] of Object.entries(S.returns)) {
        a.elapsed += dt;
        const u = Math.min(1, a.elapsed / a.duration);
        if (a.via) {
          if (u < 0.65) S.pos[key].lerpVectors(a.from, a.via, u / 0.65);
          else S.pos[key].lerpVectors(a.via, a.to, (u - 0.65) / 0.35);
        } else S.pos[key].lerpVectors(a.from, a.to, key === 'chips' && S.chips ? u*u : u*u*(3-2*u));
        if (u >= 1) delete S.returns[key];
      }
      S.pouring = (S.grip === 'cup' || S.pourLatched) && atLip(S.pos.cup) && S.fill < 1;
      S.tilt = clamp(S.tilt + dt * (S.pouring ? 4 : -4), 0, 1);
      if (S.pouring && S.tilt === 1) {
        S.fill = Math.min(1, S.fill + dt / 1.35);
        if (S.fill === 1) {
          record('加入混合液 20 mL', '无色液体流入烧瓶'); done('fill');
          status('将几片碎瓷片放入烧瓶，避免混合液受热时暴沸。');
          S.pourLatched = false; S.pouring = false;
          if (S.grip !== 'cup') homeward('cup');
        }
      }
      if (!S.bump || !S.lit) {
        const goal = S.lit ? S.target : 20;
        S.temp += clamp(goal - S.temp, -dt*23, dt*40);
      }
      if (!S.chips && S.lit && S.temp >= S.target && !S.bump) {
        S.bump = true; refresh(); record('未放碎瓷片就加热', '液面突然上冲，发生暴沸');
        status('混合液暴沸了。先防倒吸，再熄灯；重来时记得在加热前放碎瓷片。');
      }
      const branch = S.lit && !S.bump && S.temp === S.target ? (S.target === 170 ? 'ethene' : 'ether') : null;
      S.gas = !!branch;
      if (branch) {
        S.branch = branch;
        if (!S.seen[branch]) {
          S.seen[branch] = true;
          done('heat'); record('继续加热混合液', S.lifted ? '烧瓶内冒泡' : '洗气管内冒泡'); status(canRestoreWash() ? WASH_BACK : observationHint());
        }
      }
      const i = wet();
      if (branch === 'ether' && mic.isOpen && scene.time >= 6.1 && !S.steps.has('observe')) {
        record('观察微观模型', '一个氧连接两个乙基'); done('observe'); status(stopHint());
      }
      if (branch === 'ethene' && !S.lifted && i >= 0 && S.fade[i] < 1) {
        const old = S.fade[i]; S.fade[i] = Math.min(1, old + dt / 2.7);
        if (!old) record('通入' + NAMES[i], '导管口冒出气泡');
        if (S.fade[i] === 1) {
          record(NAMES[i], COLOR[i] + '褪去，溶液变为无色');
          const both = S.fade.every(v => v === 1);
          if (both) done('observe'); else refresh();
          if (!S.demo) {
            W.ui.observePrediction(both ? BOTH : NAMES[i] + '已褪色。');
            W.review.hidden = !both;
            status(both ? stopHint() : observationHint());
          }
        }
      }
    }
    function display() {
      if (S.reading && W?.ui.step !== 1) closeScale();
      rig.display(S, wet());
      cards[0](S.bump && S.lit ? '暴沸' : S.gas ? '冒泡' : S.lit ? '升温' : S.temp > 20 ? '降温' : '无色', S.sealed);
      for (const paint of plates) paint();
      if (W && !S.demo && !W.stopNote.hidden) {
        const hint = stopHint();
        if (W.stopNote.textContent !== hint) W.stopNote.textContent = hint;
      }
      readButton.text(S.reading ? '回到实验台' : '近看温度计')
        .loc(rig.plug, S.reading ? 0.016 : 0.027, S.reading ? 0.010 : 0.044, 0.003)
        .show(S.reading || canRead());
      XS.forEach((x,i) => cards[i+1](colorWord(i,S.fade[i]), S.fade[i]>0));
      if (!W) return;
      W.ui.el.toggleAttribute('data-elim-demo', S.demo); W.demoNote.hidden = !S.demo;
      if (S.demo) W.demoObs.textContent = S.steps.has('stop') ? '火焰熄灭，液温下降。' : S.gas ? NAMES[0] + ' · ' + colorWord(0,S.fade[0]) + '　' + NAMES[1] + ' · ' + colorWord(1,S.fade[1]) : S.lit ? '混合液正在升温。' : '准备圆底烧瓶中的混合液。';
      replayNote.hidden = S.branch === 'cold';
      playControls.hidden = S.demo || S.branch === 'cold'; pause.textContent = scene.paused ? '继续' : '暂停';
    }
    function reset() {
      if (bar.playing) bar.stop(); drag.clearDropzones(); closeScale(); mic.close(); rounds.clear(); S = fresh();
      W.ui.el.querySelectorAll('details[open]').forEach(el => { el.open = false; });
      W.ui.el.removeAttribute('data-ether'); W.previous.hidden = true;
      W.condition.value = '170'; W.review.hidden = true; W.tbl.clear(); W.ui.observePrediction(null); W.ui.relock();
      syncConclusion(); bar.undo(...TODOS.map(s => s[0])); bar.say(null); status(INTRO); display();
    }
    function syncConclusion() {
      const preview = S.steps.has('observe') && !S.steps.has('stop');
      W.stopNote.hidden = W.preview.hidden = !preview;
      W.flapWrap.hidden = preview;
      W.preview.open = !!S.readOriginal;
      if (preview) {
        W.conclusionButton.disabled = false;
        const original = W.ui.el.querySelector('.answer .page-crop') ?
          W.ui.el.querySelectorAll('.answer .page-crop')[S.target === 170 ? 0 : 1] : W.ui.el.querySelector('.answer blockquote');
        W.extract.replaceChildren(original.cloneNode(true));
      } else if (S.steps.has('stop') && S.readOriginal) {
        W.flapWrap.querySelector('.flap-front').click();
      }
    }
    function lockConclusion() {
      const guess = W.ui.prediction(); W.ui.relock({ full:false });
      if (guess != null) W.ui.el.querySelectorAll('.opt')[guess].click();
    }
    function chooseRound(target) {
      if (target === S.target || S.demo) return;
      drag.clearDropzones(); closeScale(); mic.close();
      if (!S.seen.heated && !rounds.size) S.target = target;
      else {
        const prior = S; rounds.set(prior.target, prior); S = rounds.get(target) || fresh(target);
        W.previous.hidden = !prior.rows.length;
        W.previous.replaceChildren(h('summary', {}, prior.target + ' ℃ 观察记录'), ...prior.rows.map(([action, obs]) => h('p', {}, action + '：' + obs)));
      }
      lockConclusion();
      W.ui.el.toggleAttribute('data-ether', target === 140);
      W.tbl.clear(); for (const row of S.rows) W.tbl.add(row, { highlight:false });
      W.review.hidden = target === 140 || !S.steps.has('observe');
      W.ui.observePrediction(target === 170 && S.steps.has('observe') ? BOTH : null);
      bar.undo(...TODOS.map(s => s[0])); for (const id of S.steps) bar.done(id);
      syncConclusion();
      refresh(); status(S.message); display();
    }
    const qa = qaFlow(drag, [
      { name: '加入混合液', drag: rig.cupPick, to: POUR, wait: 2.3 },
      { name: '放碎瓷片', drag: rig.chipsPick, to: DROP },
      { name: '塞好橡胶塞', drag: rig.plugPick, to: SEAT },
      { name: '点灯加热', tap: rig.lampPick, wait: 6 },
      { name: '通入紫色检验液', drag: rig.tipPick, to: wetPoint(0), wait: 4 },
      { name: '提出导管', drag: rig.tipPick, to: HOME.tip },
      { name: '通入橙色检验液', drag: rig.tipPick, to: wetPoint(1), wait: 5 },
      { name: '试管内不能直接熄灯', tap: rig.lampPick },
      { name: '检查收尾前仍在加热', run() { if (!S.lit || bar.finished || !S.steps.has('observe')) throw Error('提前熄灯或解锁'); } },
      { name: '提出检验导管', drag: rig.tipPick, to: HOME.tip },
      { name: '提起洗气管长管', drag: rig.washPick, to: LIFT },
      { name: '熄灭酒精灯', tap: rig.lampPick },
      { name: '检查观察记录', run() { if (S.lit || !S.lifted || !S.chips || S.branch !== 'ethene' || !bar.finished || S.fade.some(p => p !== 1)) throw Error('本轮操作或褪色未完成'); } },
      { name: '钻进去看', run: () => mic.open(), wait: 3 },
      { name: '回到桌上', run: () => mic.close(), wait: 1.5 },
    ]);
    return { group: root, pointer, card: false, toggles: ['cards','steps'],
      size: { w: 0.40, d: 0.16, h: 0.22 }, view: { elev: 14, azim: 0, lookY: 0.48, frameMargin: 1.2 },
      mount(ui) {
        const condition = h('select', { 'aria-label': '加热条件', onchange: () => chooseRound(Number(condition.value)) }, h('option', { value:'170' }, '迅速升到 170 ℃'), h('option', { value:'140' }, '保持约 140 ℃'));
        const previous = h('details', { hidden:true });
        const vary = h('details', { class:'more' }, h('summary', {}, '换个条件再试'), h('label', {}, '加热条件　', condition), h('p', { class:'fineprint' }, '两种温度各用一套试剂。切回原温度，可接着做那一轮。'), previous);
        const review = h('details', { class:'more', hidden:true }, h('summary', {}, '想一想（选做）'),
          h('p', {}, '生成的水中，除了羟基本身的氢，另一个氢原来连在哪个碳上？'));
        const model = h('details', { class:'more' }, h('summary', {}, '模型、近似和出处'), h('p', { class:'fineprint' },
          '20 mL、体积比约 1∶3、约 140 ℃ 和 170 ℃ 取自课本。室温取 20 ℃，中间温度、升降温时间、气泡、褪色快慢和暴沸均为示意。洗气管长管进、短管出。检验液只模拟乙烯引起的褪色。'),
          h('p', { class:'fineprint' }, '微观画面追踪净反应中原子的去向，省略浓硫酸、溶剂和中间过程。'),
          h('p', { class:'fineprint' }, '冷却时气体收缩，液体可能倒吸。先移出导管再停止加热，参见英国皇家化学会的制乙烯实验。'), h('p', { class:'fineprint' }, SOURCE));
        W = { ...mountXuean(ui, { controls:[vary, review, model, moreBox([],reset)], headers:['操作','本轮观察'], intro:INTRO }), ui, condition, review, previous };
        ui.notes.append(h('p', { class: 'fineprint' }, '按课本图标，戴护目镜，注意明火和热玻璃，保持通风，实验后洗手。'));
        W.next.remove(); ui.el.dataset.elimPanel = '';
        const conclusionButton = ui.data.parentElement.querySelector(':scope > button.go');
        ui.controls.prepend(conclusionButton);
        W.conclusionButton = conclusionButton;
        W.flapWrap = ui.el.querySelector('.flap-wrap');
        W.extract = h('div');
        W.preview = h('details', { class:'more', hidden:true }, h('summary', {}, '掀开看结论'), W.extract, h('p', { class:'src' }, SOURCE));
        W.preview.addEventListener('toggle', () => { if (!W.preview.hidden && W.preview.open) S.readOriginal = true; });
        W.stopNote = h('p', { class:'status', hidden:true });
        W.flapWrap.before(W.preview, W.stopNote);
        if (ui.el.querySelector('.page-crop')) ui.el.querySelector('.answer .formula')?.remove();
        W.demoObs = h('p', { class:'status' }); W.demoNote = h('div', { class:'elim-demo', hidden:true }, h('b', {}, '老师演示'), W.demoObs); ui.el.append(W.demoNote);
        ui.observePrediction(null); bar.attach(ui);
        setTimeout(() => { if (ui.el.isConnected && !conclusionButton.disabled && !S.steps.has('observe')) { lockConclusion(); bar._need(); } }, 0);
      },
      reset, update(dt) { const rate = bar.update(dt); if (rate) { drag.update(dt); updateMatter(Math.min(dt,0.08)*rate); } display(); mic.update(dt,rate); },
      dispose() { window.removeEventListener('resize', resizeMicro); cancelAnimationFrame(resizeFrame); style.remove(); W?.demoNote.remove(); W?.ui.el.removeAttribute('data-ether'); W?.ui.el.removeAttribute('data-elim-panel'); W?.ui.el.removeAttribute('data-elim-demo'); mic.dispose(); bar.dispose(); drag.dispose(); },
      debug: { get S() { return S; }, qa, bar, mic, scene, rig, picks: { cup: rig.cupPick, chips: rig.chipsPick, plug: rig.plugPick, tip: rig.tipPick, wash: rig.washPick, lamp: rig.lampPick } },
    };
  },
};
