// 人教版选择性必修1，第96页实验4-1、图4-1，第97页工作原理。
import * as THREE from 'three';
import { h } from '../ui/Panel.js';
import { chemBeaker } from './kit/chem.js';
import { ammeter, strip, V } from './kit/galvanic-parts.js';
import { clamp, draggable } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { micro } from './kit/microworld.js';
import { demoActs, moreBox, mountXuean, paperSheet, qaFlow, sandbox, think, wrapPointer } from './kit/chemlesson.js';
import { bridgeClip, gripRadius, lead, leg, saltBridge, span, transportScene } from './kit/saltbridge-parts.js';

const mid = 0.038, radius = 0.043, rim = 0.073, level = 0.054, bridgeZ = 0.012;
const glassBase = 0.0006, lipRadius = 0.00065, lean = Math.PI / 18;
const centers = [mid - 0.062, mid + 0.062];
const outside = centers[0] - radius - span - 0.006, clear = rim + leg + 0.005;
const stripTop = glassBase + 0.096 * Math.cos(lean) + 0.009 * Math.sin(lean);
const pins = centers.map((x, i) => V(x + (i ? 0.0373 : -0.0373), stripTop, -0.008));
const dock = V(mid, glassBase + rim + lipRadius + gripRadius, bridgeZ);
const lift = () => dock.clone().setY(rim + leg + 0.014);
const home = [V(-0.129, 0.0052, bridgeZ), V(-0.086, 0.015, pins[0].z), V(0.186, 0.015, pins[1].z)];
const intro = '锌片浸在硫酸锌溶液里，铜片浸在硫酸铜溶液里。拿起左边的盐桥，让两端分别浸入两杯溶液。';
const rimHint = '先向上提，让盐桥两端都高过杯沿，再横移到两杯上方。';
const outHint = '先提起盐桥，让两端高过杯沿，再向左移。等两端都移到烧杯外再松手。';
const moves = [
  ['bridge', '放入盐桥', '拿起盐桥，越过杯口，把两端分别浸入两杯溶液。', 0, () => dock.clone()],
  ['black', '夹住锌片', '把电流表的黑导线夹夹到锌片上端。', 1, () => pins[0].clone().add(V(0, 0.011))],
  ['red', '夹住铜片', '把电流表的红导线夹夹到铜片上端，观察指针。', 2, () => pins[1].clone().add(V(0, 0.011))],
  ['out', '取出盐桥', '保持接线，提起盐桥，移到杯外再松手，观察指针。', 0, lift],
];
export default {
  id: 'saltbridge', title: '盐桥与锌铜原电池', fig: '图4-1', stampText: '实验', style: 'paper',
  predict: {
    q: '等电路接通、指针偏转后，只取出盐桥，保持导线连接，指针会怎样？',
    hint: '实验4-1 · 先猜，再动手验证。', options: ['保持偏转', '回到零点', '偏转更大'], answer: 1,
  },
  need: '比较接通电路和取出盐桥时的指针位置。',
  conclusion: {
    crops: [{ page: 100, rect: [219, 545, 535, 648] }],
    quote: '实验表明，接通电路时，电流表的指针发生偏转，即电路中有电流通过。从上述装置中取出盐桥，电流表的指针又回到零点，即电路中没有电流通过。如图4-1所示的原电池叫做锌铜原电池，其中锌一端为负极，铜一端为正极。',
    formula: 'Zn + Cu²⁺ = Zn²⁺ + Cu',
    why: '电子经导线从锌极流向铜极。盐桥中的 Cl⁻ 移向硫酸锌溶液，K⁺ 移向硫酸铜溶液，两杯溶液得以保持电中性。',
    src: '课本第 96～97 页 · 第四章 第一节',
  },
  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group();
    root.add(group);
    paperSheet(group, { w: 0.42, d: 0.26 });
    const names = [];
    function nameplate(obj, text, x, y, z, side = '') {
      const badge = tag('<span>' + text + '</span>', 'saltbridge-name ' + side).loc(obj, x, y, z);
      names.push(badge);
      return badge;
    }
    centers.forEach((x, i) => {
      const cup = chemBeaker({ r: radius, h: rim, level, color: i ? 0x429cda : 0xe1ece9, marks: false });
      cup.position.x = x;
      const lip = new THREE.Mesh(new THREE.TorusGeometry(radius + 0.0018, lipRadius, 8, 48),
        new THREE.MeshBasicMaterial({ color: 0xa5bbbc, transparent: true, opacity: 0.65, depthWrite: false }));
      lip.rotation.x = Math.PI / 2;
      lip.position.y = glassBase + rim;
      cup.add(lip);
      nameplate(cup, i ? '烧杯 · CuSO₄ 溶液' : '烧杯 · ZnSO₄ 溶液', i ? 0.012 : -0.012, 0.019, radius, 'cup-name');
      const metal = strip(i === 1);
      metal.rotation.z = i ? -lean : lean;
      metal.position.copy(pins[i]);
      metal.translateY(-0.048);
      nameplate(metal, i ? '铜片' : '锌片', 0, 0.033, 0.002);
      group.add(cup, metal);
    });
    const meter = ammeter();
    meter.g.position.set(mid, 0, 0.073);
    meter.g.scale.setScalar(0.85);
    group.add(meter.g);
    const bridge = saltBridge();
    const clips = [bridgeClip(0x343e42), bridgeClip(0xb74a39)];
    const tools = [bridge.grip, ...clips.map(c => c.grip)];
    group.add(bridge.body, tools[1], tools[2]);
    const leads = meter.posts.map((post, i) => {
      const pin = post.position.clone().add(V(0, 0.0045)).multiplyScalar(0.85).add(meter.g.position);
      return lead(group, pin, i ? 1 : -1);
    });
    const bridgeName = nameplate(bridge.body, '盐桥<small>含 KCl 饱和溶液的琼脂</small>', 0, 0.006, 0.001, 'bridge-name');
    tools.slice(1).forEach((tool, i) => {
      nameplate(tool, i ? '红导线夹' : '黑导线夹', i ? 0.006 : -0.006, 0.006, 0.006, i ? 'right-name' : 'left-name');
    });
    const fresh = () => ({
      demo: false, pos: home.map(p => p.clone()), attached: [false, false], resting: false,
      returns: [null, null, null], immersed: false, worked: false, observedOn: false, removal: false,
      needle: 0, lastRecord: '', drag: -1, microPaused: false,
    });
    let S = fresh(), W, generation = 0;
    const wired = () => S.attached.every(Boolean);
    const closed = () => wired() && S.immersed;
    const angle = () => -Math.acos(clamp((S.pos[0].y - home[0].y) / leg, 0, 1));
    function render() {
      tools.forEach((tool, i) => {
        (i === 0 ? bridge.body : tool).position.copy(S.pos[i]);
        tool.userData.ringY = S.pos[i].y + 0.005;
      });
      bridge.body.rotation.x = angle();
      clips.forEach((c, i) => c.open(S.drag === i + 1 && !S.attached[i]));
      bridgeName.el.classList.toggle('on-tray', S.pos[0].x < centers[0] - radius && S.pos[0].y < level);
      leads.forEach((updateLead, i) => updateLead(S.pos[i + 1].clone().add(V(0, 0.008))));
      meter.needle.rotation.z = 0.78 - S.needle * 1.05;
    }
    const aligned = p => centers.every((x, i) =>
      Math.hypot(p.x + (i ? span : -span) - x, bridgeZ) < radius - 0.006);
    function contact() {
      const p = S.pos[0];
      const wet = aligned(p) && p.y - leg * Math.cos(angle()) < level - 0.001;
      if (S.immersed && !wet && wired() && S.observedOn) S.removal = true;
      if (wet && S.removal) {
        S.removal = false;
        S.observedOn = false;
      }
      S.immersed = wet;
    }
    function record(action, hint = '点电流表，凑近看指针。') {
      if (S.demo || !W) return;
      W.ui.status(hint);
      if (S.lastRecord === action) return;
      S.lastRecord = action;
      W.tbl.add([action, '']);
      const note = h('input', { class: 'saltbridge-observation', 'aria-label': action + '后的指针位置',
        placeholder: '记下你看到的', oninput: e => { e.target.defaultValue = e.target.value; } });
      W.tbl.el.querySelector('tbody tr:last-child td:last-child').append(note);
    }
    function done(id) {
      if (S.demo) return;
      bar.done(id);
      if (bar.finished && W.next.hidden) {
        W.next.hidden = false;
        W.question.open();
      }
    }
    function invalid(msg) { if (!S.demo) W.ui.status(msg); }
    let inspecting = false;
    function inspectMeter() {
      inspecting = true;
      look([mid, 0.033, 0.086], [0, 0.02, 1], 0.17, () => { inspecting = false; });
    }
    function toggleMeter() {
      if (S.demo) return;
      if (bar.ui?.step === 0) bar.ui.go(1);
      if (inspecting) { inspecting = false; back(); }
      else inspectMeter();
    }
    const meterButton = tag('电流表 ⊕', 'pill saltbridge-meter', toggleMeter).loc(group, mid, 0.006, 0.095);
    const scene = transportScene();
    const mic = micro({
      tag: (text, cls, click) => tag(text, cls + ' saltbridge-micro-entry', click),
      look, back, group, scene, at: () => V(mid, 0.07, 0.027), btnAt: () => V(centers[0], 0.051, radius),
      scale: 0.0115, dist: 0.30, lookD: [0, 0.46, 1], label: '从锌极追踪整个电路',
      state: () => ({ immersed: S.immersed, wired: wired(), closed: closed(), worked: S.worked, paused: S.microPaused }),
      key: () => [S.immersed, wired(), closed()].join('/'), show: () => !inspecting && S.drag < 0 && (S.resting || S.worked), bar: () => bar,
    });
    const overlays = document.querySelectorAll('.mw');
    const overlay = overlays[overlays.length - 1];
    overlay.classList.add('saltbridge-micro');
    const drawing = overlay.querySelector('canvas');
    const pause = h('button', { class: 'saltbridge-replay', onclick: () => { S.microPaused = !S.microPaused; } }, '暂停');
    const replay = h('button', { class: 'saltbridge-replay', onclick: () => { scene.time = 0; S.microPaused = false; } }, '重播');
    overlay.querySelector('.mw-hud').append(pause, replay);
    const skin = h('style', {}, `
      .saltbridge-micro .mw-dim{background:rgba(249,247,239,.94);mask-image:none;-webkit-mask-image:none}
      .saltbridge-name span{display:block;text-align:center;background:#fffaf0;color:#34342d;padding:2px 4px;border-radius:2px;font:600 13px/1.15 var(--sans);text-shadow:none}
      .saltbridge-name small{display:block;font-size:12px}
      .saltbridge-name.bridge-name span{transform:translateY(-53%)}
      @media(min-width:761px){.saltbridge-name.bridge-name.on-tray span{transform:translate(-30%,-53%)}}
      .saltbridge-name.left-name span{transform:translateX(-50%)}
      .saltbridge-name.right-name span{transform:translateX(50%)}
      .tag3d.saltbridge-meter,.tag3d.saltbridge-micro-entry{animation:none}
      body.predicting .tag3d.saltbridge-name,body.predicting .tag3d.saltbridge-meter{visibility:visible!important}
      .saltbridge-observation{width:100%;box-sizing:border-box;text-align:center;border:0;border-bottom:1px dotted #ab9f8b;background:transparent;font:inherit;color:inherit}
      .saltbridge-replay + .saltbridge-replay{margin-left:5px}
      .saltbridge-replay{pointer-events:auto;cursor:pointer;margin-top:6px;padding:3px 12px;border:1px solid #a69d8b;border-radius:3px;background:#fffaf0;color:#443f36}
      #panel .answer .src{padding-right:56px;min-height:28px}
      #panel .answer .seal-stamp{width:38px;height:38px;font-size:15px;bottom:9px;border-width:2px}
      @media(max-width:760px){
        .saltbridge-name span,.saltbridge-name small{font-size:10px;padding:1px 2px}
        .saltbridge-name.bridge-name.on-tray span{transform:translateY(115%)}
        .saltbridge-name.left-name span,.saltbridge-name.right-name span{transform:translateY(-135%)}
        .saltbridge-name.cup-name span{max-width:62px;white-space:normal}
        .saltbridge-micro-entry{font-size:10px!important;padding:3px 5px!important}
        body.lesson-on #viewctl{top:49px;bottom:auto;right:10px;flex-direction:row;align-items:center;gap:4px;pointer-events:none}
        #viewctl button{pointer-events:auto}
        #viewctl .show-tg:last-of-type,#viewctl .lesson-community{margin:0}
        #viewctl .lesson-community{padding:0;border:0}
        body.lesson-on:not(.predicting):not(.hide-steps) .lbar.do,body.lesson-on:not(.predicting) .lbar.film{
          display:grid;grid-template-columns:auto 1fr auto auto;gap:3px 6px;padding:5px 7px;font-size:13px}
        .lbar .lb-main{grid-column:2/-1}
        .lbar .lb-steps{grid-column:2;max-width:none;flex-wrap:nowrap}
        .lbar .lb-seal{writing-mode:horizontal-tb;white-space:nowrap}
        .saltbridge-micro .mw-hud,.saltbridge-micro .mw-scale{left:4%!important;width:92%!important}
        .saltbridge-micro .mw-hud{top:55vh!important;background:#fffcf3;padding:8px;box-sizing:border-box}
        .saltbridge-micro .mw-close{top:52px!important;left:auto!important;right:8px}
        .saltbridge-micro .mw-scale{top:54px!important;text-align:left}
      }`);
    document.head.append(skin);
    const hints = ['拿起盐桥，把两端分别放入两杯溶液', '把黑夹夹到锌片上端', '把红夹夹到铜片上端'];
    function settle(i, to = home[i], next = []) {
      S.returns[i] = { from: S.pos[i].clone(), to: to.clone(), elapsed: 0, next };
    }
    function moveBridge(p) {
      const pos = S.pos[0];
      const y = clamp(p.y, home[0].y, 0.17);
      let x = clamp(p.x, -0.184, 0.174);
      // 低于杯沿时玻璃挡住横移。先抬高手，再平移，不让器材自行升空。
      if (y < clear && pos.y < clear) {
        if (pos.x <= outside && x > outside) {
          x = outside;
          invalid(rimHint);
        }
        else if (aligned(pos) && !aligned(V(x, y))) x = pos.x;
      }
      const minY = x <= outside ? home[0].y : aligned(V(x, y)) ? dock.y : clear;
      pos.set(x, Math.max(y, minY), bridgeZ);
      contact();
    }
    const drag = draggable(group, tools.map((tool, i) => ({
      obj: tool, anchor: i === 0 ? bridge.body : tool, plane: 'xy', offset: home[i].z, keepOffset: true,
      dropOffset: i ? V(0, -0.011) : V(-span, -leg),
      dropzones: [{
        name: ['两杯溶液', '锌片上端', '铜片上端'][i],
        position: i ? pins[i - 1] : dock.clone().add(V(-span, -leg)),
        radius: i ? 0.03 : 0.037,
        enabled: () => i ? S.pos[i].y > rim + 0.009 : !S.resting &&
          (aligned(S.pos[0]) || S.pos[0].y >= rim + leg + 0.005),
        onDrop() {
          if (i) {
            S.attached[i - 1] = true;
            done(moves[i][0]);
            if (!closed()) record(i === 1 ? '黑夹接锌片' : '红夹接铜片');
          } else {
            S.resting = true;
            done('bridge');
            if (!closed()) record('放入盐桥');
          }
        },
      }],
      hint: () => i === 0 && S.resting ? '向上提起盐桥，观察电流表' : hints[i],
      onStart() { S.drag = i; },
      onDrag(p) {
        S.returns[i] = null;
        if (i === 0) {
          moveBridge(p);
        }
        else {
          const pos = S.pos[i], side = i === 1 ? -1 : 1;
          const wall = centers[i - 1] + side * (radius + 0.009);
          let x = p.x;
          if (Math.max(pos.y, p.y) < rim + 0.015 && (pos.x - wall) * side >= -0.00001) {
            x = side < 0 ? Math.min(wall, x) : Math.max(wall, x);
          }
          pos.set(x, clamp(p.y, 0.014, 0.17), home[i].z);
          if (S.attached[i - 1]) {
            S.attached[i - 1] = false;
            S.lastRecord = '';
            S.removal = false;
            S.observedOn = false;
            if (!S.demo) W.ui.status('导线夹已松开，外电路断开。');
          }
        }
        render();
      },
      onEnd(moved, zone) {
        S.drag = -1;
        if (!moved || zone) return;
        if (i) {
          S.attached[i - 1] = false;
          settle(i);
          invalid('导线夹没有夹住金属片。把夹口对准金属片上端再松手。');
        } else {
          const pos = S.pos[0];
          if (pos.x <= outside) {
            S.resting = false;
            settle(0);
          } else if (S.resting) {
            if (aligned(pos)) settle(0, pos.clone().setY(dock.y));
            else settle(0, dock.clone().setY(pos.y), [dock]);
            if (wired() && !bar.has('out')) {
              invalid(outHint);
              bar.say(outHint, 'out');
            }
          } else {
            const height = Math.max(clear, pos.y);
            settle(0, pos.clone().setY(height), [home[0].clone().setY(height), home[0]]);
            invalid(rimHint);
          }
        }
        render();
      },
    })), { tip: tag('', 'pill'), taps: [{
      obj: meter.g, hint: () => inspecting ? '回到实验台' : '凑近看指针', onTap: toggleMeter,
    }] });
    const act = demoActs(drag, group);
    const shots = moves.map(([, , cap, i, to], j) => ({
      cap, dur: 3.4,
      during: act.path(tools[i], j === 0
        ? [home[0], home[0].clone().setY(lift().y), lift, to]
        : i ? [() => S.pos[i], () => S.pos[i].clone().setY(0.123), to] : [() => S.pos[i], to], { t1: 0.69, release: 0.73 }),
    }));
    shots.splice(3, 0, { cap: '沿导线追踪电子，再看盐桥中的离子。', dur: 12,
      cam: [[mid, 0.12, 0.027], [0, 0.46, 1], 0.30], enter: () => mic.open(true) });
    shots[4].enter = () => mic.close();
    shots[4].dur = 5;
    shots[4].during = act.path(tools[0], [() => S.pos[0], lift, home[0].clone().setY(lift().y), home[0]],
      { t1: 0.86, release: 0.9 });
    const apply = () => {
      drag.clearDropzones();
      mic.close();
      if (inspecting) { inspecting = false; back(); }
      render();
    };
    const bar = lessonBar({
      look, back, group, ringOptions: { minOpacity: 0.57 },
      steps: moves.map(([id, title, todo, i]) => ({ id, title, todo, target: () => id === 'out' && S.immersed && !wired()
        ? tools[S.attached[0] ? 2 : 1] : tools[i] })),
      reels: { demo: { label: '老师演示', seal: '演示', shots, ...sandbox({
        get: () => S, set: s => { S = s; }, fresh, apply, bar: () => bar,
        view: { save: () => ({ generation, inspecting, micro: mic.isOpen, paused: S.microPaused, time: scene.time }),
          restore: v => {
            if (v.generation !== generation) return;
            if (v.inspecting) inspectMeter();
            else if (v.micro) { mic.open(); scene.time = v.time; S.microPaused = v.paused; }
          } },
      }) } },
    });
    function reset() {
      generation++;
      if (bar.playing) bar.stop();
      S = fresh();
      apply();
      W.tbl.clear();
      W.question.close();
      W.next.hidden = true;
      W.ui.relock();
      bar.undo(...moves.map(m => m[0]));
      bar.say(null);
      W.ui.observePrediction('');
      W.ui.status(intro);
      W.ui.controls.querySelectorAll('details').forEach(el => { el.open = false; });
    }
    function update(dt) {
      const k = bar.update(dt);
      drag.update(dt * k);
      S.returns.forEach((r, i) => {
        if (!r) return;
        r.elapsed += dt * k;
        const t = clamp(r.elapsed / 0.40, 0, 1);
        S.pos[i].lerpVectors(r.from, r.to, t);
        if (t === 1) {
          S.pos[i].copy(r.to);
          if (r.next.length) settle(i, r.next[0], r.next.slice(1));
          else S.returns[i] = null;
        }
        if (i === 0) contact();
      });
      const on = closed();
      S.needle = THREE.MathUtils.damp(S.needle, on ? 1 : 0, 11, dt * k);
      if (on && S.needle > 0.9 && !S.observedOn) {
        S.worked = S.observedOn = true;
        record('接通电路', '点电流表看指针，也可以从锌极追踪整个电路。');
      }
      if (!S.demo && S.removal && S.drag === 0 && S.pos[0].y < clear) {
        const hint = '盐桥两端已离开液面。观察指针，再向上提过杯口。';
        if (hint !== S.liftHint) W.ui.status(hint);
        S.liftHint = hint;
      } else S.liftHint = null;
      if (S.removal && !S.immersed && wired() && S.drag !== 0 && !S.returns[0] && S.pos[0].equals(home[0]) && S.needle < 0.02) {
        S.removal = S.observedOn = false;
        record('保持接线，取出盐桥', '点电流表看指针。想再看离子迁移，可以放回盐桥。');
        done('out');
        if (!S.demo) W.ui.observePrediction('导线仍连着，取出盐桥后指针回到零点。');
      }
      render();
      if (!S.demo && !S.returns[0] && bar.current === 'out') {
        const missing = !S.immersed && !S.removal ? '先把盐桥两端放回溶液，再比较取出前后的指针。'
          : !S.attached[0] ? hints[1] : !S.attached[1] ? hints[2] : null;
        if (missing !== S.guidance) { S.guidance = missing; bar.say(missing); }
      }
      names.forEach(name => name.show(!mic.isOpen && !inspecting));
      meterButton.text(S.demo ? '电流表' : inspecting ? '回到实验台' : '电流表 ⊕').show(!mic.isOpen);
      if (!mic.isOpen) S.microPaused = false;
      pause.hidden = replay.hidden = S.demo || !on;
      pause.textContent = S.microPaused ? '继续' : '暂停';
      mic.update(dt, k);
      if (mic.isOpen) drawing.style.opacity = on ? scene.opacity : 1;
    }
    render();
    const qa = qaFlow(drag, [
      { name: '放入盐桥', run: () => {
        const d = drag.items()[0];
        d.onStart();
        [home[0].clone().setY(lift().y), lift(), dock].forEach(p => d.onDrag(p));
        d.onEnd(true);
      } },
      ...moves.slice(1, 3).map(([, name, , i, to]) => ({ name, drag: tools[i], to })),
      { name: '钻进去看', run: () => { if (!closed() || !S.worked) throw Error('电路未通'); mic.open(); }, wait: 3 },
      { name: '回到桌上', run: () => mic.close(), wait: 2 },
      { name: '在两杯上方松手', drag: tools[0], to: lift, wait: 2 },
      { name: '核对落回杯沿', run: () => {
        if (!closed() || !S.resting || S.pos[0].y !== dock.y || S.needle < 0.9 || bar.has('out') || !W.next.hidden) throw Error('提前松手未正确落回杯沿');
      } },
      { name: '取出盐桥', drag: tools[0], to: () => home[0].clone().setY(lift().y), wait: 2 },
      { name: '核对归零', run: () => {
        if (closed() || !wired() || S.needle > 0.02 || !bar.finished || W.next.hidden) throw Error('取桥对照未完成');
      } },
    ]);
    return {
      group: root, card: false, toggles: ['steps'],
      size: { w: 0.39, h: 0.155, d: 0.22 }, view: { elev: 26, azim: 0, lookY: 0.39, frameMargin: 1.08 },
      pointer: wrapPointer(drag, bar), reset, update,
      mount(ui) {
        const question = think({ title: '想一想（选做）', q: '锌极产生 Zn²⁺，盐桥中哪种离子向这一侧移动？',
          options: ['Cl⁻', 'K⁺'], ok: 'Cl⁻ 移向锌侧，补偿溶液中增加的正电荷。',
          wrong: ['锌极附近正电荷增加，需要哪种电荷来补偿？'], status: ui.status });
        const note = h('details', { class: 'more' }, h('summary', {}, '模型、近似和出处'), h('p', { class: 'fineprint' },
          '依据第 96 页实验4-1、图4-1及第 97 页工作原理。盐桥中装有含 KCl 饱和溶液的琼脂。指针偏角为示意。微观图压缩了导线和盐桥的长度，分步追踪电子转移和离子的净迁移，粒子数量、距离和运动时间均为示意。'));
        const base = mountXuean(ui, { intro, headers: ['操作', '指针位置'], controls: [moreBox([], reset), note] });
        ui.data.nextElementSibling.style.display = 'none';
        ui.data.append(base.next, question.el);
        W = { ...base, ui, question };
        ui.observePrediction('');
        bar.attach(ui);
      },
      dispose() { generation++; skin.remove(); mic.dispose(); drag.dispose(); bar.dispose(); },
      debug: { get S() { return S; }, bar, qa, picks: { bridge: tools[0], black: tools[1], red: tools[2] } },
    };
  },
};
