// 人教版选择性必修 3，第 69 页实验 3-7、图 3-17，第 70 页结论。
import * as THREE from 'three';
import { h } from '../ui/Panel.js';
import { lessonBar } from './kit/lessonbar.js';
import { demoActs, mountXuean, moreBox, paperSheet, qaFlow, sandbox, wrapPointer } from './kit/chemlesson.js';
import { clamp, draggable } from './kit/interact.js';
import { micro } from './kit/microworld.js';
import { V, X, BX, RIM, WATER, LEN, BASE, R, RACK, HOMES, HOME, BATH, NAMES, bench, silverScene } from './kit/silvermirror-parts.js';

const INTRO = '先平视硝酸银滴管的刻度，读凹液面最低处。';
const FORMULA = 'CH₃CHO + 2[Ag(NH₃)₂]OH　△→　CH₃COONH₄ + 2Ag↓ + 3NH₃ + H₂O';
const METHOD = '在洁净的试管中加入1 mL 2% AgNO₃溶液，然后边振荡试管边逐滴滴入2%氨水，使最初产生的沉淀恰好溶解，制得银氨溶液。再滴入3滴乙醛，振荡后将试管放在热水浴中温热。观察实验现象。';
const ENDPOINT = 4; // 示意滴量。学生按沉淀是否消失判断，此数不作为实测值显示。
const POUR_TIME = 0.70, FALL_TIME = 0.22;
const SCALE_VIEW = [[HOMES[0].x - 0.002, HOMES[0].y + 0.035, 0], [0, 0, 1], 0.116];
const SHAKE = [V(X, 0.052), V(X - 0.012, 0.052), V(X + 0.012, 0.052), V(X, 0.052)];
const SOAK = [V(X, RIM + 0.012), V(BX, RIM + 0.012), BATH];
const steps = [
  ['salt', '加入硝酸银溶液', '核对课本要求的 1 mL，再提起硝酸银滴管，对准洁净试管口加液。'],
  ['ammonia', '滴氨水至澄清', '把氨水滴管悬在管口，按住逐滴加入，试管会同步轻振。沉淀刚消失就松手。'],
  ['aldehyde', '滴入乙醛', '把乙醛滴管悬在管口，滴入 3 滴乙醛。'],
  ['mix', '振荡试管', '把试管提出架子，在空中左右轻摇。'],
  ['warm', '热水浴温热', '提起试管，越过烧杯口，放入热水。观察试管内壁。'],
];
export default {
  id: 'silvermirror', title: '乙醛的银镜反应', fig: '实验3-7 · 图3-17', stampText: '实验', style: 'paper',
  predict: {
    q: '把乙醛滴入银氨溶液，在热水浴中温热。生成的银会在哪里出现？',
    options: ['沉到管底，堆成粉末', '附在管壁，逐渐连成亮面', '浮在液面，铺成薄膜'], answer: 1,
  },
  need: '配好银氨溶液，加入乙醛并振荡，在热水浴中观察试管内壁。',
  conclusion: {
    crops: [{ page: 74, rect: [219, 177, 533, 215] }, { page: 74, rect: [160, 127, 531, 154] }, { page: 73, rect: [65, 452, 377, 555] }],
    quote: '由于生成的银附着在试管壁上形成银镜，所以该反应又叫做银镜反应，常用来检验醛基。',
    formula: FORMULA,
    why: '配离子中的银由 +1 价变为 0 价，沉积在洁净的内壁上。乙醛被氧化，在碱性溶液中生成乙酸根。',
    src: '课本第 69–70 页 · 第三章 第三节 醛 酮',
  },
  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group(); root.add(group);
    paperSheet(group, { w: 0.405, d: 0.18, z: 0.008 });
    const { tube, tubePick, pipettes, liquid, levelSurface, tubeName, plates, film, drop, stream } = bench(group, tag);
    // Include a raised pipette in the initial framing without adding apparatus.
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.001, 0.001, 0.001), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    frame.position.set(X, 0.127, 0); group.add(frame);
    const card = tag('', 'cond'), scene = silverScene();
    const fresh = () => ({
      demo: false, salt: false, saltOut: 0, saltIn: 0, stock: [1, 1, 1], reading: false, nh: 0, aldehyde: 0, mixed: false, wet: false, earlyBath: false, growth: 0, observed: 0, deviation: '',
      pos: [...HOMES, HOME].map(p => p.clone()), returns: [], grip: null, flight: null, rock: 0, clock: 0,
    });
    let S = fresh(), W, cancelled = false, bathFocus = false;
    const say = s => { if (!S.demo) W?.ui.status(s); };
    const done = id => { if (!S.demo && !S.deviation) bar.done(id); };
    const deviate = reason => {
      if (S.demo || S.deviation) return;
      S.deviation = reason; W.retry.hidden = false; bar.say(reason); say(reason);
    };
    const log = (a, b) => { if (!S.demo) W?.tbl.add([a, b]); };
    const tipTarget = () => S.pos[3].clone().add(V(0, LEN + 0.007));
    const turbidity = () => [0, 1, 0.73, 0.32][S.nh] || 0;
    // Levels and the height wetted by shaking are exaggerated together for projection.
    const level = () => 0.020 * S.saltIn + Math.min(0.010, S.nh * 0.0014) + S.aldehyde * 0.0009;
    function readScale() {
      S.reading = true;
      look(...SCALE_VIEW, () => { S.reading = false; });
    }
    const scaleButton = tag('看滴管刻度', 'pill view', () => {
      if (S.reading) { S.reading = false; back(); } else readScale();
    });
    scaleButton.el.setAttribute('role', 'button');
    const mic = micro({ tag, look, back: () => { bathFocus = false; back(); }, group, scene, at: () => S.pos[3].clone().add(V(0, 0.022)),
      btnAt: () => S.pos[3].clone().add(V(0, LEN - 0.003, R)),
      label: '钻进试管里看', state: () => ({ growth: S.growth }), show: () => S.aldehyde === 3 && !S.earlyBath && !S.grip, bar: () => bar,
      lookD: [0.03, 0.34, 1], scale: 0.010, dist: 0.32 });

    const receive = id => {
      if (id === 0) {
        S.salt = true; log('加入 AgNO₃ 溶液', '溶液澄清'); done('salt'); say('把 2% 氨水一滴一滴加进去，留意最初出现的沉淀。');
      } else if (id === 1) {
        S.nh++;
        if (S.nh === 1) { log('初滴氨水', '出现棕褐色沉淀'); say('管底出现棕褐色沉淀。继续逐滴加入，观察沉淀。'); }
        if (S.nh === ENDPOINT) { log('继续滴氨水', '沉淀恰好溶解'); done('ammonia'); say('沉淀恰好溶解，试管里是澄清的银氨溶液。'); }
        if (S.nh === ENDPOINT + 1) {
          log('澄清后又滴氨水', '溶液仍澄清');
          if (!S.demo) bar.undo('ammonia');
          deviate('沉淀消失后又加了氨水。可继续观察，重做时在沉淀刚消失时停手。');
        }
      } else {
        S.aldehyde++; S.mixed = false;
        if (!S.demo) {
          const row = ['加入乙醛', S.aldehyde + ' 滴，仍澄清'];
          if (W.aldehydeRow == null) W.aldehydeRow = W.tbl.add(row) - 1;
          else W.tbl.set(W.aldehydeRow, row);
        }
        say(`已滴入 ${S.aldehyde} 滴乙醛。`);
        if (S.aldehyde === 3) done('aldehyde');
      }
    };
    const canDose = id => id === 0 ? !S.salt : id === 1 ? S.salt && !S.aldehyde : S.nh >= ENDPOINT && S.aldehyde < 3;
    function aim(id) {
      return S.pos[id].distanceTo(tipTarget()) < 0.0025;
    }
    function dose(id, parked = false) {
      if (!aim(id) || S.flight || !canDose(id) || (id && S.stock[id] < 0.12)) return;
      S.flight = { id, p: S.pos[id].clone(), time: 0, target: S.pos[3].clone().add(V(0, Math.max(0.002, level()))) };
      if (id === 0) {
        S.flight.parked = parked;
        S.flight.base = S.saltOut;
        S.flight.duration = (1 - S.saltOut) * POUR_TIME;
      } else {
        S.stock[id] -= 0.12;
        S.grip.next = 0.85;
      }
    }
    const closeUp = () => {
      bathFocus = true;
      look([BX, 0.045, 0], [0.025, 0.28, 1], 0.249, () => { bathFocus = false; });
    };
    function grab(id) {
      S.returns[id] = null;
      S.grip = { id, next: 0, moved: false, previous: S.pos[id].x, direction: 0, travel: 0, reversed: false, leftRack: S.wet, leftBath: !S.wet, crossed: S.wet };
    }
    function move(id, p) {
      const grip = S.grip;
      if (!grip || grip.id !== id) return;
      const pos = S.pos[id], x = clamp(p.x, -0.185, 0.163);
      grip.moved = true;
      if (id < 3) {
        const y = clamp(p.y, 0.003, 0.149);
        // The bottle neck holds the shaft until the tip clears it.
        if (Math.abs(pos.x - HOMES[id].x) < 0.003 && pos.y < 0.046 && y < 0.046) pos.set(HOMES[id].x, y, 0);
        else {
          const rim = S.pos[3].y + LEN, offset = x - S.pos[3].x;
          if (Math.abs(offset) < R + 0.002 && y < rim) {
            const side = Math.sign(pos.x - S.pos[3].x) || -1;
            if (pos.y < rim) { pos.set(S.pos[3].x + side * (R + 0.003), y, 0); return; }
          }
          let floor = Math.abs(offset) < R + 0.002 ? rim + 0.001 : 0.003;
          if (HOMES.some(home => Math.abs(x - home.x) < 0.016)) floor = Math.max(floor, 0.047);
          pos.set(x, Math.max(y, floor), 0);
        }
        if (id > 0 && !grip.next && aim(id)) dose(id);
        return;
      }
      let y = clamp(p.y, BASE, 0.112), nx = x;
      const rimClear = RIM + 0.002, rackClear = RACK + 0.002;
      if (pos.y < rackClear && Math.abs(pos.x - X) < 0.004 && y < rackClear) nx = X;
      if (Math.abs(nx - X) < 0.024 && Math.abs(nx - X) > 0.003) y = Math.max(rackClear, y);
      // Crossing the rim needs a lift first. Below the rim, glass stops the hand.
      // The rim guides the tube sideways while the hand controls its descent.
      if (y >= rimClear || grip.crossed) {
        const distance = Math.hypot(x - BX, y - (RIM + 0.009));
        nx = THREE.MathUtils.lerp(BX, nx, THREE.MathUtils.smoothstep(distance, 0.026, 0.040));
      }
      const inside = Math.abs(nx - BX) < 0.020;
      if (y >= rimClear) grip.crossed = inside;
      if (y < rimClear && inside && !grip.crossed) { nx = BX - 0.042; }
      if (y < rimClear && !inside && Math.abs(nx - BX) < 0.042) {
        if (grip.crossed) nx = clamp(nx, BX - 0.019, BX + 0.019);
        else nx = BX - 0.042;
      }
      if (grip.crossed && inside) y = clamp(p.y, 0.003, 0.112);
      if (y > RACK + 0.022) grip.leftRack = true;
      if (y > RIM + 0.002) grip.leftBath = true;
      const dx = nx - grip.previous;
      if (S.aldehyde && !S.mixed && y >= rackClear && Math.abs(nx - X) < 0.029 && Math.abs(dx) > 0.0001) {
        const dir = Math.sign(dx);
        if (grip.direction && dir !== grip.direction && grip.travel > 0.006) grip.reversed = true;
        if (dir !== grip.direction) grip.travel = 0;
        grip.travel += Math.abs(dx); grip.direction = dir;
        S.rock = clamp(-dx * 12, -0.14, 0.14);
        if (grip.reversed && grip.travel > 0.007) {
          S.mixed = true; log('轻轻振荡试管', '液体混匀'); if (S.aldehyde === 3) { done('mix'); say('试管里的液体已经摇匀。'); }
        }
      }
      grip.previous = nx; pos.set(nx, y, 0);
    }
    function release(id, moved, zone) {
      const grip = S.grip; if (grip?.id !== id) return;
      const p = S.pos[id], acted = moved && grip.moved && !cancelled;
      if (id < 3 && acted && zone && aim(id)) {
        if (!canDose(id) && !S.flight) {
          if (id === 2 && S.nh < ENDPOINT) say('先滴氨水，等沉淀恰好溶解，再加入乙醛。');
          if (id === 1 && !S.salt) say('试管里还没有 AgNO₃ 溶液。');
        } else if (!grip.next) dose(id);
      }
      if (id === 3 && acted) {
        if (zone?.position === BATH && grip.crossed) {
          if (!S.wet) {
            if (S.aldehyde !== 3 || !S.mixed) {
              S.earlyBath = true;
              deviate('水浴过早，本轮不演示反应结果。请重做，滴入 3 滴乙醛并振荡后再温热。');
            }
            log('放入热水浴', S.earlyBath ? '水浴过早' : '观察内壁');
            if (!S.demo && S.aldehyde) {
              if (!S.deviation) { bar.say('观察水浴中试管的内壁。', 'warm'); say('试管已浸入热水。留意最早出现银点的位置。'); }
              closeUp();
            }
          }
          S.wet = true;
        } else if (zone?.position === HOME) S.wet = false;
        else if (!S.wet && S.mixed) say('先提过烧杯口，再把试管底部放入热水。');
      }
      if (S.flight?.id === 0 && id === 0) {
        if (acted && zone) S.flight.parked = true;
        else S.flight.duration = Math.min(S.flight.duration, S.flight.time);
      }
      const home = id < 3 ? HOMES[id] : S.wet ? BATH : HOME;
      if (p.distanceTo(home) > 0.0001) {
        const across = Math.abs(p.x - home.x) > (id < 3 ? 0.004 : 0.019);
        const nearBath = Math.max(p.x, home.x) > BX - 0.042;
        const high = id < 3 ? Math.max(0.049, p.y, tipTarget().y * (Math.abs(p.x - X) < 0.014 ? 1 : 0)) : Math.max(p.y, nearBath ? RIM + 0.004 : RACK + 0.002);
        S.returns[id] = { from: p.clone(), home: home.clone(), high, across, t: 0 };
      }
      S.grip = null;
    }

    const picks = [...pipettes.map(d => d.pick), tubePick], bodies = [...pipettes.map(d => d.g), tube];
    const pipZone = { name: '试管口', position: tipTarget, radius: 0.024 };
    const tubeZones = [
      { name: '热水浴', position: BATH, radius: 0.033, enabled: () => S.grip?.leftBath && S.grip.crossed },
      { name: '试管架', position: HOME, radius: 0.020, enabled: () => S.grip?.leftRack },
    ];
    const drag = draggable(group, picks.map((obj, id) => ({
      obj, anchor: bodies[id], keepOffset: true, dropzones: id < 3 ? [pipZone] : tubeZones,
      enabled: () => !mic.isOpen && !S.reading && !(S.flight && (id === 3 || S.flight.parked && id === 0)),
      hint: () => id === 3 ? '提起试管，轻摇或放入热水浴' : `提起${NAMES[id]}滴管，尖端对准管口`,
      onStart: () => grab(id), onDrag: p => move(id, p), onEnd: (moved, zone) => release(id, moved, zone),
    })), { tip: tag('', 'pill') });
    const act = demoActs(drag, group);
    const cardText = () => S.earlyBath ? '水浴过早' : S.observed === 3 ? '银镜' : S.observed === 2 ? '银斑' : S.observed === 1 ? '银点' :
      turbidity() ? '有沉淀' : S.saltIn ? '澄清' : '洁净';
    function apply() {
      bodies.forEach((o, id) => { o.position.copy(S.pos[id]); });
      tube.rotation.z = S.rock;
      tube.userData.ringY = S.pos[3].y + 0.048;
      pipettes.forEach((d, i) => {
        d.g.userData.ringY = d.g.position.y + d.pick.position.y - 0.004;
        d.fill(i ? S.stock[i] : 1 - S.saltOut);
      });
      let content = S.saltIn ? '试管 · AgNO₃ 溶液' : '洁净试管';
      if (S.nh && S.nh < ENDPOINT) content = '试管 · 溶液与棕褐色沉淀';
      else if (S.aldehyde) content = S.wet || S.growth ? '试管 · 银氨溶液与乙醛的反应混合物' : '试管 · 银氨溶液与乙醛';
      else if (S.nh) content = '试管 · 银氨溶液';
      tubeName.text(content);
      const reading = S.reading || (S.demo && bar.shot === 0);
      plates.forEach(plate => plate.show(!mic.isOpen && (!reading || plate.obj === pipettes[0].g)));
      liquid.setLevel(level()).setMilk(turbidity(), 0x74513e, 0x55392d).update(S.clock);
      levelSurface(S.rock);
      film(S.growth);
      const f = S.flight;
      drop.visible = !!f && f.id !== 0; stream.visible = !!f && f.id === 0;
      if (drop.visible) {
        const u = Math.min(1, f.time / FALL_TIME);
        drop.position.copy(f.p).lerp(f.target, u * u);
      } else if (stream.visible) {
        const travel = t => THREE.MathUtils.lerp(f.p.y, S.pos[3].y + Math.max(0.002, level()), clamp(t / FALL_TIME, 0, 1) ** 2);
        const head = travel(f.time), tail = travel(f.time - f.duration);
        stream.position.set(f.p.x, (head + tail) / 2, f.p.z);
        stream.scale.y = Math.max(0.00001, tail - head);
      }
    }
    apply();
    const sb = sandbox({ get: () => S, set: s => { S = s; }, fresh, apply,
      view: {
        save() {
          const { rig, user } = window.__lb.stage;
          return { owner: S, micro: mic.isOpen ? scene.snapshot() : null, near: bathFocus,
            target: rig.target.clone(), dir: rig.dir.clone(), dist: rig.dist, minEl: rig.minEl,
            yaw: user.yaw, pitch: user.pitch, zoom: user.zoom, pan: user.pan.clone() };
        },
        restore(s) {
          if (S !== s.owner || !W?.ui.el.isConnected) return;
          if (s.micro) { scene.restore(s.micro); mic.open(); }
          else if (S.reading) readScale();
          else if (s.near) closeUp();
          const stage = window.__lb.stage;
          stage.shot(s); stage.user.yaw = s.yaw; stage.user.pitch = s.pitch;
          stage.user.zoom = s.zoom; stage.user.pan.copy(s.pan);
        },
      } });
    const demoDose = (id, until, dur) => {
      const carry = act.path(picks[id], [HOMES[id], V(HOMES[id].x, BASE + LEN + 0.012), tipTarget],
        { t0: 0.03, t1: 0.36, release: 0.96 });
      return { cap: steps[id][2], dur, enter: () => carry(0), during(k) {
        if (until()) { if (S.grip?.id === id) drag.items()[id].onEnd(true); }
        else carry(k);
      } };
    };
    const route = (points, dur, cap) => ({ cap, dur, during: act.path(tubePick, [HOME, ...points], { t0: 0.02, t1: 0.77, release: 0.9 }) });
    const bar = lessonBar({ group, look, back, steps: steps.map(([id, title, todo], i) => ({ id, title, todo,
      target: () => mic.isOpen || S.deviation ? null : bodies[Math.min(i, 3)] })),
      ringOptions: { minOpacity: 0.65 }, reels: { demo: {
        label: '演示', onStart() { sb.onStart(); mic.close(); W.ui.el.classList.add('silver-demo'); W.microEl.classList.add('silver-film'); },
        onEnd() { mic.close(); W.ui.el.classList.remove('silver-demo'); W.microEl.classList.remove('silver-film'); sb.onEnd(); },
        shots: [
          { cap: '平视凹液面最低处，读数为 1 mL。', dur: 3.5, cam: SCALE_VIEW },
          demoDose(0, () => S.salt, 3.2), demoDose(1, () => S.nh >= ENDPOINT, 7),
          demoDose(2, () => S.aldehyde >= 3, 5.8), route(SHAKE, 3, '提出试管，左右轻轻振荡。'),
          route(SOAK, 3.2, '越过杯口，把试管放入热水浴。'),
          { cap: '观察管壁上银点怎样连成亮面。', dur: 8, cam: [[BX, 0.04, 0], [0.02, 0.32, 1], 0.18] },
          { cap: '钻进试管，跟着电子看银怎样沉积在内壁上。', dur: 11.4,
            cam: [[BX, BATH.y + 0.072, 0], [0.03, 0.34, 1], 0.32], enter: () => mic.open(true) },
        ],
      } } });
    const leaveMicro = mic.mw.onClose;
    mic.mw.onClose = () => { leaveMicro(); if (S.demo && bar.shot === 7) bar.stop(); };
    function advance(dt) {
      S.clock += dt;
      S.returns.forEach((r, i) => {
        if (!r || (i === 0 && S.flight?.parked)) return;
        r.t += dt; const k = Math.min(1, r.t / 0.44), p = S.pos[i];
        if (r.across) {
          p.x = THREE.MathUtils.lerp(r.from.x, r.home.x, clamp((k - 0.20) / 0.53, 0, 1));
          p.y = k < 0.2 ? THREE.MathUtils.lerp(r.from.y, r.high, k / 0.2) : THREE.MathUtils.lerp(r.high, r.home.y, clamp((k - 0.73) / 0.27, 0, 1));
        } else p.copy(r.from).lerp(r.home, k);
        if (k === 1) { p.copy(r.home); S.returns[i] = null; if (i === 1 || i === 2) S.stock[i] = 1; }
      });
      const grip = S.grip;
      S.rock *= Math.exp(-dt * 12);
      if (grip && grip.id < 3 && grip.moved && aim(grip.id)) {
        grip.next = Math.max(0, grip.next - dt);
        if (grip.id === 1 && canDose(1)) S.rock = 0.086 * Math.sin(S.clock * 12);
        if (!grip.next) dose(grip.id);
      }
      const f = S.flight;
      if (f) {
        if (f.id === 0 && !f.parked && !aim(0)) f.duration = Math.min(f.duration, f.time);
        f.time += dt;
        if (f.id === 0) {
          S.saltOut = Math.min(1, f.base + Math.min(f.time, f.duration) / POUR_TIME);
          S.saltIn = Math.min(1, f.base + clamp(f.time - FALL_TIME, 0, f.duration) / POUR_TIME);
          if (f.time >= f.duration + FALL_TIME) {
            S.flight = null;
            if (S.saltIn >= 1 - 1e-8) receive(0);
            else if (f.parked) dose(0, true);
          }
        } else if (f.time >= FALL_TIME) { S.flight = null; receive(f.id); }
      }
      if (S.wet && !S.earlyBath && S.pos[3].y < WATER - 0.01 && S.nh >= ENDPOINT && S.aldehyde && S.growth < 1) {
        S.growth = Math.min(1, S.growth + dt / (7 + Math.min(8, S.nh - ENDPOINT)));
        const phase = S.growth >= 0.92 ? 3 : S.growth >= 0.48 ? 2 : S.growth >= 0.19 ? 1 : 0;
        if (phase > S.observed) {
          S.observed = phase;
          const result = ['','内壁出现银点','银点连成斑片','内壁形成银镜'][phase];
          log('水浴温热', result);
          if (phase === 3 && !S.demo) {
            W.ui.observePrediction('银点出现在管壁上，逐渐连成有金属光泽的银镜。');
            done('warm');
            if (bar.finished) { bar.say('观察完成，可以掀开结论了。', 'end'); W.review.hidden = false; }
            say(result + '。');
          }
        }
      }
    }
    function reset() {
      if (bar.playing) bar.stop();
      drag.clearDropzones(); mic.close(); back(); bathFocus = false; S = fresh(); apply(); W.tbl.clear(); W.aldehydeRow = null; W.review.hidden = true;
      W.retry.hidden = true; W.ui.observePrediction(null); W.ui.relock(); bar.undo(...steps.map(s => s[0])); bar.say(null); say(INTRO);
    }
    const single = (id, name) => ({ name, drag: picks[id], to: tipTarget, wait: 0.96, scale: 1 });
    const pathStep = (name, points) => ({ name, run() {
      const d = drag.items()[3]; d.onStart(); points.forEach(p => d.onDrag(p)); d.onEnd(true);
    } });
    const qa = qaFlow(drag, [
      single(0, '加入硝酸银溶液'), ...Array.from({ length: ENDPOINT }, (_, i) => single(1, '滴氨水 ' + (i + 1))),
      ...[1, 2, 3].map(n => single(2, '滴乙醛 ' + n)),
      pathStep('振荡试管', SHAKE), pathStep('放入热水浴', SOAK),
      { name: '观察银镜', wait: 9, run() {} },
      { name: '核对本轮', run() { if (S.nh !== ENDPOINT || S.aldehyde !== 3 || !S.mixed || !bar.finished) throw Error('配制、振荡或银镜未完成'); } },
      { name: '钻进试管里看', run: () => mic.open(), wait: 5, scale: 1 },
      { name: '回到桌上', run: () => mic.close(), wait: 2 },
    ]);
    const wrapped = wrapPointer(drag, bar);
    const pointer = { ...wrapped, up(ray, e) { cancelled = e?.type === 'pointercancel'; try { return wrapped.up(ray, e); } finally { cancelled = false; } } };
    return {
      group: root, pointer, card: false, toggles: ['cards', 'steps'],
      size: { w: 0.31, h: 0.176, d: 0.11 }, view: { elev: 17, azim: 0, lookY: 0.46, frameMargin: 1.12 },
      mount(ui) {
        const review = h('details', { class: 'more', hidden: true }, h('summary', {}, '想一想（选做）'),
          h('p', { class: 'fineprint' }, '试管里先出现的棕褐色沉淀和后来出现的银镜，是在同一步形成的吗？'));
        const model = h('details', { class: 'more' }, h('summary', {}, '模型、近似和出处'),
          h('p', { class: 'fineprint' }, '用量和操作依照课本第 69 页实验 3-7。氨水按沉淀恰好溶解判断终点。单手操作时，滴氨水与轻振试管同步显示。'),
          h('p', { class: 'fineprint' }, '液面和银层放大，滴氨水的次数、银点分布和生长时间为示意。微观图按第 70 页总反应追踪原子和电子，省略溶剂和旁观离子。'));
        const retry = h('button', { class: 'go', hidden: true, onclick: reset }, '重做本轮实验（清空记录）');
        W = { ...mountXuean(ui, { controls: [retry, review, model, moreBox([], reset)], headers: ['操作', '所见'], intro: INTRO }), ui, review, retry };
        const next = ui.data.parentElement.querySelector(':scope > button.go'); next.classList.add('big-next'); next.textContent = '掀开课本上的结论 →';
        W.next.remove(); ui.controls.prepend(next); ui.el.dataset.silvermirror = '';
        const crops = ui.el.querySelectorAll('.answer .page-crop');
        if (crops.length === 3) {
          // The shared textbook crop renderer also handles locally imported PDFs.
          // Put p.69's method and safety symbols with the method, p.70's answer in the flap.
          crops[2].setAttribute('role', 'img'); crops[2].setAttribute('aria-label', METHOD);
          model.insertBefore(crops[2], model.children[1]); ui.el.querySelector('.answer .formula')?.remove();
        } else model.insertBefore(h('p', { class: 'fineprint' }, METHOD), model.children[1]);
        W.css = h('style', {}, `
          .tag3d.silver-name { padding:2px 5px; border-radius:2px; background:#fffdf2ed; color:#32434a; font:500 13px/1.15 var(--sans); text-shadow:none }
          body.predicting .tag3d.silver-name { visibility:visible!important }
          @media (min-width:761px) and (max-width:1000px) and (max-height:540px) {
            #panel[data-silvermirror] { width:36vw }
            .lbar { left:calc(36vw + 26px); right:42px; bottom:5px; width:auto; transform:none }
          }
          @media (max-width:760px), (max-width:1000px) and (max-height:540px) {
            .tag3d.silver-name {font-size:10px;max-width:60px;white-space:normal;text-align:center;padding:1px 2px}
            .lbar { gap:5px; padding:4px 6px; font-size:13px; line-height:1.3 }
            .lb-steps { gap:2px }
            .lb-steps i { width:15px; height:15px; font-size:10px; line-height:14px }
          }
          [data-silvermirror].silver-demo .p-body {visibility:hidden}
          [data-silvermirror] .big-next:disabled { display:none }
          [data-silvermirror] .formula { font-size:17px; line-height:1.55 }
          .mw.silver-view .mw-cap { font-size:16px }
          .mw.silver-film {z-index:11}
          .mw.silver-film .silver-playback,.mw.silver-film .mw-close {display:none}
          .silver-playback {display:flex;justify-content:center;gap:8px;margin-top:5px;pointer-events:auto}
          .silver-playback button {font:inherit;font-size:13px;color:#3d4650;border:1px solid #a9a59d;background:#faf8f2;border-radius:12px;padding:2px 12px;cursor:pointer}
          [data-silvermirror] .answer .src {padding-right:55px;min-height:53px}
          @media (max-width:760px) {
            .mw.silver-view .mw-hud,.mw.silver-view .mw-scale {left:3vw!important;width:94vw!important}
            .mw.silver-view .mw-hud {top:43vh!important;background:#f7f4eced;padding:10px 5px;border-radius:4px}
            .mw.silver-view .mw-scale {top:8px!important}
            .mw.silver-view .mw-eq {font-size:min(5vw,22px)}
            .mw.silver-view .mw-cap {font-size:15px}
            .mw.silver-view .mw-close {left:auto!important;right:10px;top:50px!important}
          }`);
        document.head.append(W.css);
        W.microEl = Array.from(document.querySelectorAll('.mw')).pop(); W.microEl.classList.add('silver-view');
        const pause = h('button', { type: 'button', onclick: () => { scene.toggle(); pause.textContent = scene.paused ? '继续' : '暂停'; } }, '暂停');
        const replay = h('button', { type: 'button', onclick: () => { scene.replay(); pause.textContent = '暂停'; } }, '从头看');
        const playback = h('div', { class: 'silver-playback' }, pause, replay);
        W.microEl.querySelector('.mw-hud').append(playback); W.pause = pause;
        ui.observePrediction(null); bar.attach(ui);
      },
      update(dt) {
        const k = bar.update(dt);
        if (k > 0) { drag.update(dt); advance(Math.min(dt, 0.05) * k); }
        apply();
        scaleButton.text(S.reading ? '回到实验台' : '看滴管刻度')
          .loc(pipettes[0].g, S.reading ? 0.012 : 0, S.reading ? 0.050 : 0.078, 0)
          .show(!S.demo && !S.salt && !S.grip && !S.returns[0] && !mic.isOpen);
        card.text(`<div class="cc"><div class="cc-t"><span class="cc-name">试管</span><span class="cc-res">${cardText()}</span></div></div>`)
          .loc(group, S.pos[3].x + (S.wet || S.flight?.id === 0 || S.returns[0] ? 0.031 : 0), S.pos[3].y + LEN + (S.wet ? -0.009 : 0.019), 0)
          .show(!S.demo && !mic.isOpen && !S.grip && !S.reading);
        mic.update(dt, k);
        if (mic.isOpen && W) W.pause.textContent = scene.paused ? '继续' : '暂停';
      },
      reset, dispose() { W?.css.remove(); bar.dispose(); drag.dispose(); mic.dispose(); },
      debug: { bar, qa, mic, get S() { return S; }, picks: { silver: picks[0], ammonia: picks[1], aldehyde: picks[2], tube: tubePick } },
    };
  },
};
