// 八年级下册第 9—10 页：二十四节气与地球公转。圆盘是教学仪器，大小、距离不按比例。
// 黄经从春分起，每隔 15° 一个节气；地轴北端始终向右倾，夏至在左侧，北端朝向太阳。
import * as THREE from 'three';
import { canvasTex, glowTexture, textPlate } from './kit/props.js';
import { draggable } from './kit/interact.js';
import { buttons } from './kit/ui.js';
import { lessonBar } from './kit/lessonbar.js';
import { sandbox, think, demoActs, qaFlow, wrapPointer } from './kit/chemlesson.js';
import { h } from '../ui/Panel.js';

const RAD = Math.PI / 180, R = 0.222, Y = 0.026, HC = 0.075;
const TERMS = '春分 清明 谷雨 立夏 小满 芒种 夏至 小暑 大暑 立秋 处暑 白露 秋分 寒露 霜降 立冬 小雪 大雪 冬至 小寒 大寒 立春 雨水 惊蛰'.split(' ');
const DATES = '3月20日 4月5日 4月20日 5月5日 5月21日 6月5日 6月21日 7月7日 7月22日 8月7日 8月23日 9月7日 9月23日 10月8日 10月23日 11月7日 11月22日 12月7日 12月21日 1月5日 1月20日 2月4日 2月19日 3月5日'.split(' ');
const mod = (a, n = 360) => (a % n + n) % n;
const pos = (a, r = R, y = Y) => new THREE.Vector3(-r * Math.sin(a * RAD), y, -r * Math.cos(a * RAD));
const dec = (a) => Math.asin(Math.sin(23.44 * RAD) * Math.sin(a * RAD)) / RAD;
const latitude = (a) => { const d = dec(a), mv = Math.cos(a * RAD) > 0.05 ? '，向北移' : Math.cos(a * RAD) < -0.05 ? '，向南移' : ''; return Math.abs(d) < 0.05 ? `0.0°（赤道${mv}）` : `${Math.abs(d).toFixed(1)}°${d > 0 ? 'N' : 'S'}${mv}`; };          // 直射点往哪移：黄经 270°—90°（冬至到夏至）向北，90°—270° 向南；二至那一刻不写

export default {
  id: 'jieqi', fig: '图1', title: '二十四节气与地球公转', stampText: '探究', style: 'real', flow: 'explore',
  ask: '二十四节气把一年分成 24 段。为什么说它和地球公转紧密相关？立夏应该标在公转轨道上的什么位置？',
  guess: { options: ['紧挨着夏至', '春分与夏至之间的角度中点', '紧挨着春分'], answer: 1 },
  need: '顺着公转方向拖着地球绕太阳走一圈，每到一个位置，把节气的名字标上去；看每个节气的大致日期和太阳直射点在哪；再回答几个问题',
  conclusion: {
    crops: [{ page: 13, rect: [64, 130, 480, 212] }, { page: 14, rect: [44, 88, 456, 128] }],
    quote: '二十四节气是我国古人了解一年中时间、气候和物候等方面变化规律而形成的知识体系，体现了中华民族的生产生活智慧。二十四节气指导着人们的农事生产，承载着深厚的精神文化内涵，影响着人们的日常生活。2016年，二十四节气被联合国教科文组织列入《人类非物质文化遗产代表作名录》。二十四节气与地球公转紧密相关。',
    why: '从地球上看，太阳一年中在天球上的视运动轨迹叫黄道，太阳在黄道上的位置用黄经表示。从春分的 0° 起，太阳黄经每增加 15°，就到下一个节气，360° ÷ 24 = 15°。<br>本图用圆形公转轨道表示这些位置：相邻节气对应的两条日地连线，在太阳处形成 15° 的夹角。相邻的二分二至之间相差 90°，分成六个 15° 的小段；四立位于第三段的终点，也就是角度上的中间位置。角度间隔相等，不表示真实轨道距离或经过的天数相等。<br>在一年公转过程中，地轴的倾斜方向近似保持不变，太阳直射点在南、北回归线之间往返：春分、秋分在赤道，夏至在北回归线，冬至在南回归线。按本模型计算，立夏、立秋的直射纬度约为 16.3°N，立冬、立春约为 16.3°S（立春、立夏时直射点向北移，立秋、立冬时向南移）；四立处在角度的中点，并不表示直射纬度也取中间值。',
    src: '课本八年级下册第 9—10 页 · 跨学科主题学习 了解二十四节气（任务二：了解二十四节气与地球公转的关系）',
  },
  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group(); root.add(group);
    let W = null;
    const fresh = () => ({ angle: 0, visited: Array(24).fill(false).map((_, i) => i % 6 === 0), flights: {}, held: false, demo: false, returned: false, answers: 0, message: '' });
    let S = fresh();
    const status = (m) => { if (!S.demo) { S.message = m; W?.ui.status(m); } };
    const brass = new THREE.MeshStandardMaterial({ color: 0xb99a59, metalness: 0.65, roughness: 0.38 });
    const woodTex = canvasTex(1024, 1024, (c, w, hh) => {
      c.fillStyle = '#66503a'; c.fillRect(0, 0, w, hh);
      for (let i = 0; i < 800; i++) { c.strokeStyle = `rgba(31,18,8,${0.04 + (i % 7) * 0.013})`; c.beginPath(); for (let x = 0; x <= w; x += 20) c.lineTo(x, i * 1.6 + Math.sin(x / 170 + i / 19) * 9); c.stroke(); }
    });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.414, 0.42, 0.024, 128), new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.72 })); base.position.y = 0.012; base.receiveShadow = true; group.add(base);
    const faceTex = canvasTex(2048, 2048, (c, w, hh) => {
      const grad = c.createRadialGradient(w * 0.4, hh * 0.3, 0, w / 2, hh / 2, w * 0.7); grad.addColorStop(0, '#ebdab0'); grad.addColorStop(1, '#b49b69'); c.fillStyle = grad; c.fillRect(0, 0, w, hh);
      for (let i = 0; i < 1000; i++) { c.strokeStyle = 'rgba(90,68,30,0.025)'; c.beginPath(); c.arc(w / 2, hh / 2, i, 0, Math.PI * 2); c.stroke(); }
    });
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.407, 128), new THREE.MeshStandardMaterial({ map: faceTex, metalness: 0.3, roughness: 0.6 })); face.rotation.x = -Math.PI / 2; face.position.y = Y - 0.001; group.add(face);
    const ring = (r, tube, y) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 160), brass); m.rotation.x = -Math.PI / 2; m.position.y = y; group.add(m); };
    ring(0.41, 0.003, Y); ring(R, 0.0012, Y + 0.001); ring(0.174, 0.0006, Y);
    const labelTargets = [], cards = [], slots = [];
    const stack = new THREE.Vector3(0.105, Y + 0.006, 0.075);
    // 每张牌沿盘缘独立摆放，两行文字；盘上的空框不提前露出答案。
    for (let i = 0; i < 24; i++) {
      const a = i * 15, p = pos(a, i === 0 ? 0.389 : 0.35, Y + 0.003);
      labelTargets.push(p);
      const peg = new THREE.Mesh(new THREE.SphereGeometry(0.003, 12, 8), brass); peg.position.copy(pos(a, R, Y + 0.003)); group.add(peg);
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([pos(a, R + 0.008, Y + 0.001), pos(a, 0.31, Y + 0.001)]), new THREE.LineBasicMaterial({ color: 0x8b754e })); group.add(line);
      const slot = new THREE.Mesh(new THREE.BoxGeometry(0.087, 0.001, 0.044), new THREE.MeshStandardMaterial({ color: 0xa58c5d, roughness: 0.7 })); slot.position.copy(p); group.add(slot); slots.push(slot);
      const tex = canvasTex(640, 280, (c, w, hh) => {
        c.fillStyle = i % 6 === 0 ? '#e9cd87' : i % 6 === 3 ? '#e5eedc' : '#f6eed9'; c.fillRect(0, 0, w, hh);
        c.strokeStyle = '#9c8152'; c.lineWidth = 6; c.strokeRect(5, 5, w - 10, hh - 10);
        c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#302b22'; c.font = 'bold 114px PingFang SC, sans-serif'; c.fillText(TERMS[i], w / 2, 94);
        c.font = '74px PingFang SC, sans-serif'; c.fillText(`${DATES[i]}前后`, w / 2, 214);
      });
      const card = new THREE.Mesh(new THREE.BoxGeometry(0.086, 0.0015, 0.043), [brass, brass, new THREE.MeshBasicMaterial({ map: tex }), brass, brass, brass]); card.position.copy(p); group.add(card); cards.push(card);
    }
    for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.086, 0.0015, 0.043), new THREE.MeshStandardMaterial({ color: 0xf0e4c8 })); m.position.copy(stack).add(new THREE.Vector3(i * 0.0007, i * 0.0018, 0)); group.add(m); }
    const stackLabel = textPlate('待标的节气牌', { w: 0.085, h: 0.014 }); stackLabel.rotation.x = -Math.PI / 2; stackLabel.position.set(stack.x, Y + 0.001, 0.112); group.add(stackLabel);
    for (const a of [45, 135, 225, 315]) {
      const arrow = new THREE.ArrowHelper(new THREE.Vector3(-Math.cos(a * RAD), 0, Math.sin(a * RAD)), pos(a, 0.19, Y + 0.002), 0.029, 0x78623a, 0.01, 0.007); group.add(arrow);
    }
    const direction = textPlate('公转方向 ↶', { w: 0.115, h: 0.022 }); direction.rotation.x = -Math.PI / 2; direction.position.set(-0.07, Y + 0.002, 0.12); group.add(direction);
    const sunBase = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.035, 0.01, 40), brass); sunBase.position.y = Y + 0.005; group.add(sunBase);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.009, 0.029, 24), brass); stem.position.y = Y + 0.024; group.add(stem);
    const sun = new THREE.Mesh(new THREE.SphereGeometry(0.025, 40, 32), new THREE.MeshBasicMaterial({ color: 0xffecad })); sun.position.y = Y + HC; group.add(sun);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffcd65, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending })); glow.position.copy(sun.position); glow.scale.setScalar(0.16); group.add(glow);
    const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.025, 24), brass); socket.position.y = Y + 0.047; group.add(socket);
    const globe = new THREE.Group(); group.add(globe);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.009, 24), brass); foot.position.y = 0.005; globe.add(foot);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.003, 0.035, 12), brass); pole.position.y = 0.026; globe.add(pole);
    const axis = new THREE.Vector3(Math.sin(23.44 * RAD), Math.cos(23.44 * RAD), 0);
    const tilt = new THREE.Group(); tilt.position.y = HC; tilt.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis); globe.add(tilt);
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.0013, 0.0013, 0.092, 12), brass); tilt.add(axle);
    const north = new THREE.Mesh(new THREE.SphereGeometry(0.003, 12, 8), new THREE.MeshBasicMaterial({ color: 0xac4932 })); north.position.y = 0.048; tilt.add(north);
    const ballTex = canvasTex(2048, 1024, (c, w, hh) => {
      c.fillStyle = '#eee9d8'; c.fillRect(0, 0, w, hh);
      for (let i = 0; i < 5000; i++) { c.fillStyle = 'rgba(115,106,86,0.09)'; c.fillRect((i * 7919) % w, (i * 3571) % hh, 3, 3); }
      c.strokeStyle = '#648b9b'; c.lineWidth = 3;
      for (let x = 0; x < w; x += w / 12) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, hh); c.stroke(); }
      for (const lat of [-66.56, -45, -23.44, 0, 23.44, 45, 66.56]) { c.strokeStyle = lat === 0 ? '#b95e45' : '#648b9b'; c.lineWidth = lat === 0 ? 8 : 4; c.setLineDash(Math.abs(lat) === 23.44 ? [18, 12] : []); const y = (90 - lat) / 180 * hh; c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    });
    const uL = { value: new THREE.Vector3(0, 0, 1) };
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.035, 64, 40), new THREE.ShaderMaterial({ uniforms: { map: { value: ballTex }, uL },
      vertexShader: 'varying vec2 vUv; varying vec3 vN; void main(){vUv=uv; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: `uniform sampler2D map; uniform vec3 uL; varying vec2 vUv; varying vec3 vN;
        void main(){float d=dot(normalize(vN),uL); vec3 base=texture2D(map,vUv).rgb;
          gl_FragColor=vec4(base*mix(vec3(0.18,0.23,0.30),vec3(0.85+0.2*max(d,0.0)),smoothstep(-0.015,0.015,d)),1.0);
          #include <colorspace_fragment>
        }` })); tilt.add(ball);
    const pick = new THREE.Mesh(new THREE.SphereGeometry(0.045, 20, 16), new THREE.MeshBasicMaterial({ visible: false })); pick.position.y = HC; pick.userData.pick = true; pick.userData.track = true; globe.add(pick);
    const tip = tag('', 'pill');
    const count = () => S.visited.filter(Boolean).length;
    const layout = () => {
      globe.position.copy(pos(S.angle)); group.updateMatrixWorld(true);
      uL.value.copy(pos(S.angle, -1, 0)).transformDirection(group.matrixWorld);
      cards.forEach((c, i) => { c.visible = S.visited[i]; const t = S.flights[i] ?? 1; c.position.copy(stack).lerp(labelTargets[i], t); c.position.y += Math.sin(t * Math.PI) * 0.13 + 0.001; });
      const i = mod(Math.round(S.angle / 15), 24);
      if (W) { W.read.innerHTML = `<b>${TERMS[i]}${Math.abs(mod(S.angle) - i * 15) > 0.4 ? '附近' : ''}</b> · 公历 ${DATES[i]}前后<br>直射点约 ${latitude(S.angle)}<br><small>黄经 ${mod(S.angle).toFixed(0)}° · 已标 ${count()} / 24</small>`; }
    };
    const arrive = (n) => { const i = mod(n, 24); status(`${TERMS[i]} · 公历 ${DATES[i]}前后：直射点约 ${latitude(i * 15)}。继续逆时针走，地轴方向保持不变。`); if (!S.visited[i]) { S.visited[i] = true; S.flights[i] = 0; } if (n > 0 && i === 0) S.returned = true;
      if (count() === 24 && S.returned && !S.demo && !bar.has('walk')) { bar.done('walk'); W?.questions[0].open(); status('一圈走完了，24 个节气都标齐了。绿色牌子是四立，看看它们和二分二至的位置，再回答问题。'); }
    };
    const move = (p) => {
      if (Math.hypot(p.x, p.z) < 0.08) return;
      const a = mod(Math.atan2(-p.x, -p.z) / RAD), d = mod(a - S.angle + 180) - 180;
      if (d < -0.12) status('公转方向是逆时针；反着走不会落牌。');
      const old = S.angle; S.angle += d;
      if (d > 0) for (let n = Math.floor((old + 0.001) / 15) + 1; n <= Math.floor((S.angle + 0.001) / 15); n++) arrive(n);
      layout();
    };
    const drag = draggable(group, [{ obj: pick, anchor: globe, keepOffset: true, plane: 'xz', offset: Y, hint: '拖着地球，逆时针绕太阳走', onStart: () => { S.held = true; }, onDrag: move, onEnd: () => { S.held = false; } }], { tip });
    const act = demoActs(drag, group);
    const arc = (a, b) => Array.from({ length: Math.round((b - a) / 5) + 1 }, (_, i) => pos(a + i * 5));
    const bar = lessonBar({ look, back, group,
      steps: [{ id: 'walk', title: '标齐节气', todo: '拖着<b>地球</b>，逆时针绕太阳走一圈，把节气标齐。', target: () => S.held ? null : globe }, { id: 'why', title: '想一想', todo: '看四立的位置，在左边回答三个问题。' }],
      reels: { demo: { label: '老师演示', ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, bar: () => bar, apply: () => { layout(); if (!S.demo && W) W.ui.status(S.message); } }), shots: [
        { cap: '从春分出发，逆时针每走 15°，落下一张节气牌。', dur: 6, during: act.path(pick, arc(0, 45), { t0: 0.05, t1: 0.9, release: 0.95 }) },
        { cap: '立夏在春分与夏至之间的角度中点，直射点约 16.3°N。继续走到夏至，北极一端歪向太阳。', dur: 6, during: act.path(pick, arc(45, 90), { t0: 0.15, t1: 0.9, release: 0.95 }) },
        { cap: '经过立秋到秋分，太阳直射点从北回归线回到赤道。地轴的方向一直没变。', dur: 7, during: act.path(pick, arc(90, 180), { t0: 0.05, t1: 0.9, release: 0.95 }) },
        { cap: '经过冬至，再回到春分：一年一圈，24 个位置。下面换你自己做。', dur: 11, during: act.path(pick, arc(180, 360), { t0: 0.03, t1: 0.9, release: 0.95 }) },
      ] } },
    });
    const reset = () => { W?.ui.relock?.(); S = fresh(); bar.undo('walk', 'why'); W?.questions.forEach((q) => q.close()); if (W) W.next.hidden = true; layout(); status('从春分开始，按逆时针方向拖地球，走过一个刻点，就标上一个节气。'); };
    layout();
    return {
      group: root, pointer: wrapPointer(drag, bar), card: false, toggles: ['cards', 'steps'],
      size: { w: 0.85, d: 0.85, h: 0.16 }, view: { elev: 52, azim: 0, lookY: 0.12, frameMargin: 1.12 },
      mount(ui) {
        ui.el.classList.add('xuean');
        const read = h('div', { class: 'note' });
        const next = h('button', { class: 'go big-next', hidden: true, onclick: () => ui.go(2) }, '对照课本原文 →');
        const qs = [
          ['在这张圆形公转示意图中，以太阳为顶点，把一周 360° 分成 24 个等角间隔，每个间隔是多少度？', ['15°（360° ÷ 24）', '24°', '30°'], '一圈是 360°，分成 24 个相等的角。', '对：相邻两个节气对应的太阳黄经相差 15°。角度相等，不表示真实轨道路程或天数相等。'],
          ['立春、立夏、立秋、立冬在轨道上的什么位置？', ['各在相邻的二分二至位置之间的角度中点（比如立夏在春分和夏至之间的 45° 处）', '各在二分二至前面的一个刻点', '各与二分二至重合'], '相邻的二分二至之间有六个 15° 的小段，四立在第三段的终点，也就是 45° 处。', '对：这里的“中间”指角度，不表示相隔天数、真实轨道弧长或直射纬度的一半。'],
          ['夏至前后，太阳直射点在哪？', ['北回归线附近（约 23.4°N）', '赤道', '南回归线'], '看夏至位置：北极一端歪向太阳，直射点在北半球。', '夏至直射北回归线附近；春分、秋分直射赤道，冬至直射南回归线附近。'],
        ];
        const questions = qs.map(([q, options, wrong, ok], i) => think({ q, options, wrong: [wrong, wrong], ok, status, onOk: () => { S.answers = i + 1; if (i < 2) questions[i + 1].open(); else { bar.done('why'); next.hidden = false; } } }));
        const more = h('details', { class: 'more' }, h('summary', {}, '更多'), buttons([{ text: '全部重来', ghost: true, onClick: reset }]).el,
          h('p', { class: 'fineprint' }, '教学模型：公转轨道采用圆形近似，球体大小和距离不按比例；本图主要表示节气对应的角度位置。从北极上空看，公转方向是逆时针（自西向东）。在一年公转过程中，地轴的空间指向可近似看作不变，与轨道面约成 66.5°。直射纬度按 δ = arcsin(sin 23.44° × sin λ) 计算，λ 是太阳黄经（春分 0°、夏至 90°、秋分 180°、冬至 270°）；课本常取约 23.5°。日期为公历常见日期，具体年份的交节日期略有变化。'));
        ui.controls.append(read, ...questions.map((q) => q.el), next, more);
        W = { ui, read, questions, next }; bar.attach(ui); reset();
      },
      update(dt) { const k = bar.update(dt); for (const i of Object.keys(S.flights)) { S.flights[i] = Math.min(1, S.flights[i] + dt * k * 1.8); if (S.flights[i] === 1) delete S.flights[i]; } layout(); },
      dispose() { bar.dispose(); tip.remove(); },
      debug: { get S() { return S; }, bar, dec,
        qa: qaFlow(drag, [
          { name: '开始动手', run: () => W.ui.go(1) },
          { name: '反向不落牌', drag: pick, to: pos(-15) },
          { name: '核对反向不落牌', run: () => { if (count() !== 4) throw new Error('反向错误落牌'); } },
          { name: '回到春分', drag: pick, to: pos(0) },
          ...Array.from({ length: 24 }, (_, i) => ({ name: `走到${TERMS[(i + 1) % 24]}`, drag: pick, to: pos((i + 1) * 15), wait: 0.8 })),
          { name: '核对一圈与纬度', run: () => { if (count() !== 24 || !S.returned) throw new Error('节气未标齐'); for (const [a, expected] of [[0, 0], [45, 16.336], [90, 23.44], [180, 0], [270, -23.44], [315, -16.336]]) if (Math.abs(dec(a) - expected) > 0.02) throw new Error('直射纬度错误'); } },
          ...[0, 1, 2].map((i) => ({ name: `回答第${i + 1}题`, run: () => W.questions[i].el.querySelector('button').click() })),
        ]),
      },
    };
  },
};
