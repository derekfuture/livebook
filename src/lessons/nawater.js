// 人教版必修第一册 p36 图2-4。质量守恒 + 表面退缩 + 集总热量教学模型。
// 原页 hi/040.jpg；结论 hi/041.jpg = PyMuPDF doc[41]（仓库页序从 0 算）。
import * as THREE from 'three';
import { draggable, clamp } from './kit/interact.js';
import { chemBeaker } from './kit/chem.js';
import { water2, bubble2, flame2 } from './kit/chemfx.js';
import { Particles } from './kit/fx.js';
import { textPlate, canvasTex } from './kit/props.js';
import { lessonBar } from './kit/lessonbar.js';
import { sandbox, wrapPointer, qaFlow, demoActs, paperSheet, think, mountXuean, moreBox } from './kit/chemlesson.js';
import { micro } from './kit/microworld.js';
import { NA, radius, sodiumRate, sodiumThermal, pickBox, tweezers, sodiumKnife, storageBottle, sodiumScene } from './kit/sodium.js';
import { paint, inked } from '../live/ink.js';
import { sfx, Noise } from './kit/audio.js';
import { h } from '../ui/Panel.js';

const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const OIL = V(-0.135, 0, -0.045), PAPER = V(-0.04, 0.004, 0.03), CUP = V(0.085, 0, 0);
const TW = V(-0.135, 0.012, 0.095), KN = V(-0.03, 0.01, 0.105);
const WATER = V(0.165, 0, 0.05), PH = V(0.16, 0, -0.055), WASTE = V(0.17, 0, 0.125);
const R = 0.036, H = 0.09, VOL = 200, LEVEL = VOL * 1e-6 / (Math.PI * (R - 0.0012) ** 2);
const CUT_L = 0.028, CUT_LEFT = PAPER.x - CUT_L / 2, CUT = V(PAPER.x - 0.027, 0.009, PAPER.z);
const PREP = ['water', 'ph', 'take', 'dry', 'cut', 'put', 'observe'];
const OPTIONS = ['NaOH 和 H₂', 'Na₂O 和 H₂', 'NaOH 和 O₂'];
const OBS = {
  float: ['浮在水面', '钠的密度 0.97 g/cm³，比水小'],
  melt: ['棱角消失，熔成闪亮的小球', '反应放热；钠的熔点仅 97.79 ℃'],
  move: ['在水面游动，越来越小', '反应生成气体，推动钠；钠不断被消耗'],
  hiss: ['发出嘶嘶声，周围冒气泡', '反应剧烈，有气体生成（结合组成判断是 H₂）'],
  red: ['游过处先红，向下、向四周扩散', '溶液显碱性；结合组成判断生成 NaOH'],
};

export default {
  id: 'nawater', title: '钠与水的反应', fig: '图2-4', stampText: '探究', style: 'paper',
  predict: { q: '从物质组成及氧化还原反应的角度，预测钠与水反应的生成物。', hint: '课本第 36 页【预测】。可以先猜，也可以直接动手。', options: OPTIONS, answer: 0 },
  need: '加水、滴酚酞；镊子取钠，滤纸吸油，刀切绿豆大一块，再用镊子放入水中。观察位置、形状和颜色。',
  conclusion: {
    page: 41, rect: [64.275566, 56.956806, 376.344666, 118.732804],
    quote: '钠的性质非常活泼，能与水发生剧烈反应；反应时放出热量；反应后得到的溶液显碱性。钠与水反应的化学方程式为：',
    formula: '2Na + 2H₂O ══ 2NaOH + H₂↑',
    src: '课本第 36–37 页 · 第二章 第一节 钠及其化合物',
    why: '浮：钠的密度比水小。熔：反应放热，钠的熔点低。游、响：生成气体，推动钠并发出嘶嘶声。红：溶液显碱性。结合元素组成和化合价变化，生成物是 <b>NaOH 和 H₂</b>；只凭气泡不能鉴定氢气，只凭红色不能独立鉴定 NaOH。<br>钠失去电子，化合价 0 → +1，被氧化；水中的氢得到电子，+1 → 0，被还原。',
  },
  create({ tag, look, back }) {
    const root = new THREE.Group(), group = new THREE.Group(); root.add(group);
    let W = null, sound = null;
    paperSheet(group, { w: 0.42, d: 0.27, x: 0.015, z: 0.03 });
    const bottle = storageBottle(); bottle.position.copy(OIL); group.add(bottle);
    const jug = storageBottle({ label: '水', oil: false, r: 0.018, h: 0.058 }); jug.position.copy(WATER); group.add(jug);
    const ph = storageBottle({ label: '酚酞', oil: false, r: 0.012, h: 0.04 }); ph.position.copy(PH); group.add(ph);
    const nozzle = inked(new THREE.Mesh(new THREE.ConeGeometry(0.003, 0.018, 12), paint(0xd5dce2)), { width: 0.5 }); nozzle.position.y = 0.057; nozzle.rotation.z = Math.PI; ph.add(nozzle);
    const bk = chemBeaker({ r: R, h: H, level: 0, color: 0xc3dce4, marks: true }); bk.position.copy(CUP); group.add(bk);
    // 纸本风格：补杯口和杯底的细线，不用加厚玻璃来换存在感。
    for (const y of [0.002, H]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.0005, 6, 64), paint(0x6f8190, { keep: true })); ring.rotation.x = Math.PI / 2; ring.position.y = y; bk.add(ring); }
    const cupPick = pickBox(bk, R * 2, H, R * 2, 0, H / 2);
    const basin = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.029, 0.008, 36, 1, true), paint(0xe3ded1)), { width: 0.5 }); basin.position.copy(WASTE).setY(0.005); group.add(basin);
    const wasteLabel = textPlate('废液盘', { w: 0.048, h: 0.013 }); wasteLabel.position.copy(WASTE).add(V(0, 0.012, 0.04)); group.add(wasteLabel);
    const glass = inked(new THREE.Mesh(new THREE.BoxGeometry(0.089, 0.0018, 0.069), paint(0xd5e2e5, { transparent: true, opacity: 0.28, depthWrite: false })), { width: 0.6 }); glass.position.copy(PAPER).setY(0.002); group.add(glass);
    const paper = new THREE.Group(); paper.position.copy(PAPER); group.add(paper);
    const paperBase = inked(new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.0007, 0.057), paint(0xfffced)), { width: 0.6 }); paper.add(paperBase);
    const flap = inked(new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.0006, 0.057), paint(0xfffced)), { width: 0.4 }); flap.geometry.translate(0.018, 0, 0); flap.position.x = -0.039; paper.add(flap);
    const paperPick = pickBox(paper, 0.078, 0.006, 0.057, 0, 0.002);
    const stain = new THREE.Mesh(new THREE.CircleGeometry(0.023, 32), paint(0xd5b859, { keep: true, transparent: true, opacity: 0, depthWrite: false })); stain.rotation.x = -Math.PI / 2; stain.position.y = 0.001; stain.renderOrder = 4; paper.add(stain);
    const tw = tweezers(); tw.position.copy(TW); group.add(tw);
    const knife = sodiumKnife(); knife.position.copy(KN); group.add(knife);
    const cutLine = new THREE.Mesh(new THREE.BoxGeometry(0.0006, 0.019, 0.022), paint(0x66727b)); cutLine.position.copy(PAPER).setY(0.014); group.add(cutLine);
    const sodiumMat = paint(0xdce2e8, { keep: true });
    const block = inked(new THREE.Mesh(new THREE.BoxGeometry(CUT_L, 0.012, 0.018), sodiumMat), { width: 0.7 }); group.add(block);
    const piece = inked(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), sodiumMat), { width: 0.5 }); group.add(piece);
    const held = inked(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), sodiumMat), { width: 0.5 }); held.position.x = -0.007; tw.add(held);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), new THREE.MeshStandardMaterial({ color: 0xe3eaf4, metalness: 0.68, roughness: 0.16, emissive: 0x9fa9b9, emissiveIntensity: 0.12 })); ball.renderOrder = 11; group.add(ball);
    // 方块的棱角随熔化分数连续变圆，原始形状不是预先放好的球。
    const spherePos = ball.geometry.attributes.position.clone(), cubePos = ball.geometry.attributes.position;
    for (let i = 0; i < cubePos.count; i++) { const p = V(cubePos.getX(i), cubePos.getY(i), cubePos.getZ(i)); p.multiplyScalar(0.82 / Math.max(Math.abs(p.x), Math.abs(p.y), Math.abs(p.z))); cubePos.setXYZ(i, p.x, p.y, p.z); }
    ball.geometry.morphAttributes.position = [spherePos]; ball.updateMorphTargets();
    const glint = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff })); glint.scale.setScalar(0.2); glint.position.set(-0.35, 0.7, 0.55); ball.add(glint);
    const flame = flame2({ w: 0.027, h: 0.065, core: 0xfff8cc, mid: 0xffd43b, edge: 0xff8b23, glowK: 0.32 }); group.add(flame); flame.setOn(false);
    // 显色层放在玻璃/水之后；着色是 OH⁻ 场对酚酞的响应，不是把水直接改成整杯红色。
    const field = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.0015, R - 0.0015, LEVEL - 0.002, 48, 32), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { uSrc: { value: Array.from({ length: 40 }, () => new THREE.Vector4(0, 0, -100, 0)) }, uTime: { value: 0 }, uPh: { value: 0 } },
      vertexShader: 'varying vec3 p; void main(){p=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `varying vec3 p; uniform vec4 uSrc[40]; uniform float uTime,uPh;
        void main(){float c=0.; for(int i=0;i<40;i++){vec4 s=uSrc[i];float a=uTime-s.z;
          if(s.w>0. && a>0.) {float spread=0.000008 + a*0.000018;
            vec3 d=vec3(p.x-s.x,p.y-(0.5*${LEVEL.toFixed(6)}-0.001)+min(a*0.003,${(LEVEL * 0.75).toFixed(6)}),p.z-s.y);
            c+=s.w*(exp(-dot(d,d)/(2.*spread))/pow(1.+a*0.2,0.65) + 0.24*(1.-exp(-a/15.)));}}
          float k=(1.-exp(-c*5.))*uPh;gl_FragColor=vec4(0.91,0.08,0.37,clamp(k*0.77,0.,0.77)); }`,
    })); field.position.copy(CUP).setY(LEVEL / 2 + 0.001); field.renderOrder = 10; group.add(field);
    const bubs = new Particles({ max: 160, geometry: new THREE.SphereGeometry(1, 9, 7), material: bubble2({ color: 0x657a88, white: 0.25 }) }); bubs.mesh.renderOrder = 12; group.add(bubs.mesh);
    const splash = new Particles({ max: 100, geometry: new THREE.SphereGeometry(1, 7, 5), material: paint(0xe62a73, { keep: true, transparent: true, opacity: 0.8 }) }); splash.mesh.renderOrder = 13; group.add(splash.mesh);
    const drops = new Particles({ max: 40, geometry: new THREE.SphereGeometry(1, 8, 5), material: water2({ color: 0xb4d2e1 }) }); drops.mesh.renderOrder = 11; group.add(drops.mesh);
    const slick = new THREE.Mesh(new THREE.CircleGeometry(0.015, 40), paint(0xe3c574, { keep: true, transparent: true, opacity: 0.45, depthWrite: false })); slick.rotation.x = -Math.PI / 2; slick.renderOrder = 10.8; group.add(slick);
    const soundMark = textPlate('嘶 嘶 嘶 〰', { w: 0.043, h: 0.012, color: '#536471', bg: 'rgba(255,253,245,.85)' }); soundMark.renderOrder = 14; group.add(soundMark);
    const caption = tag('', 'cond'), massCard = tag('', 'pill'), warning = tag('', 'pill');
    const fresh = () => ({ demo: false, near: false, water: 0, ph: 0, stage: 'bottle', dry: false, blot: 0, blotted: false, cut: false,
      mass: NA.mass, chosen: NA.mass, held: '', clock: 0, reaction: false, left: 0, total: 0, energy: 0, temp: 22, melt: 0, gas: 0, flux: 0, jet: 0,
      x: 0, z: 0, vx: 0.014, vz: 0.009, path: 0, bubbleAcc: 0, sourceAcc: 0, sources: [], seen: {}, finished: false,
      ignition: false, flash: 0, burned: 0, splashEnergy: 0, spill: 0, oil: 0, dump: 0,
      tools: { tw: { pos: TW.toArray(), home: TW.toArray(), drag: false, motion: null }, knife: { pos: KN.toArray(), home: KN.toArray(), drag: false, motion: null }, jug: { pos: WATER.toArray(), home: WATER.toArray(), drag: false, motion: null }, ph: { pos: PH.toArray(), home: PH.toArray(), drag: false, motion: null } } });
    let S = fresh();
    const tools = { tw, knife, jug, ph };
    const status = (m) => { if (!S.demo) W?.status(m); };
    const done = (id) => { if (!S.demo) bar.done(id); };
    const clearFx = () => { bubs.clear(); splash.clear(); drops.clear(); mw?.close(); sound?.on(false); };
    const observe = (key) => { if (S.seen[key]) return; S.seen[key] = true; if (!S.demo) W?.tbl.add(OBS[key]); };
    // 自动补齐最后几毫米的放置，以及面板备用动作，都沿相同路径移动。完成到位后才改物质状态。
    const travel = (key, dest, event) => {
      const t = S.tools[key], p = V(...t.pos), up = Math.max(0.115, p.y, dest.y + 0.025);
      t.drag = false; t.motion = { points: [V(p.x, up, p.z).toArray(), V(dest.x, up, dest.z).toArray(), dest.toArray()], event };
    };
    const home = (key) => { travel(key, V(...S.tools[key].home), ''); };
    const startReaction = () => {
      S.reaction = true; S.left = S.mass; S.total = S.mass; S.clock = 0; S.x = -0.012; S.z = 0.006;
      S.oil = S.dry ? 0 : 1; done('put'); observe('float');
      if (!S.demo) { S.near = true; look([CUP.x, LEVEL, 0], [0.08, 0.5, 1], 0.17, () => { S.near = false; }); }
      status('从侧面近看水面：钠浮着。留意棱角、走过的地方和杯里的颜色。底部可回到全景。');
    };
    const events = {
      take() { if (S.stage !== 'bottle') return; S.stage = 'heldStock'; S.held = 'stock'; done('take'); status('镊子夹住了钠。把它放到滤纸上，再点滤纸吸油。'); },
      paper() { S.stage = 'paper'; S.held = ''; status('钠放在滤纸上了。点滤纸，把表面的煤油吸干。'); },
      cut() { if (S.stage !== 'paper' || S.cut) return; S.mass = S.chosen; S.cut = true; done('cut'); status(`切下约 ${(S.mass * 1000).toFixed(0)} mg。用镊子夹起左边这块，放入水中。${S.mass > 0.15 ? '<b>这块明显大于绿豆大，留意后果。</b>' : ''}`); },
      pickup() { if (!S.cut || S.stage !== 'paper') return; S.stage = 'heldPiece'; S.held = 'piece'; },
      put() { if (S.stage !== 'heldPiece') return; S.stage = 'water'; S.held = ''; startReaction(); },
      water() { if (S.reaction || S.water >= 1) return; S.water = 1; done('water'); status('烧杯里加好了水。把酚酞滴瓶拖到杯口，滴几滴。'); },
      ph() { if (!S.water) return; S.ph = Math.min(5, S.ph + 3); done('ph'); status('滴了几滴酚酞。现在溶液无色。用镊子取钠。'); },
    };
    const A = {
      reset() { if (bar.playing) bar.stop(); clearFx(); S = fresh(); apply(); W?.tbl.clear(); W?.t1.close(); W?.t2.close(); if (W) { W.next.hidden = true; W.compare.hidden = true; W.ui.relock(); } bar.undo(...PREP); status('器材重新摆好了。先把水瓶拖到烧杯口。'); back(); },
      blot() { if (S.stage === 'paper' && !S.dry && S.blot === 0) S.blot = 0.001; },
      cutMass(g) { if (!S.cut) { S.chosen = clamp(g, 0.02, 0.28); status(`刀口准备切下约 ${(S.chosen * 1000).toFixed(0)} mg。把刀拖到滤纸上的切线。`); } },
      dump() { if (S.dump) return; S.dump = 0.001; S.reaction = false; S.left = 0; sound?.on(false); mw.close(); status('把反应后的液体倒入废液盘，换一杯水再试。剩余钠的处置在这里作省略示意。'); },
      closeView() { S.near = true; look([CUP.x, LEVEL, CUP.z], [0.01, 1, 0.02], 0.11, () => { S.near = false; }); },
    };
    function release(key) {
      const t = S.tools[key], p = V(...t.pos); t.drag = false;
      const nearXY = (v, dx = 0.045, dy = 0.06) => Math.abs(p.x - v.x) < dx && Math.abs(p.y - v.y) < dy;
      if (key === 'tw') {
        if (S.stage === 'bottle' && nearXY(OIL.clone().setY(0.07))) return travel(key, OIL.clone().setY(0.026), 'take');
        if (S.stage === 'heldStock' && nearXY(PAPER)) return travel(key, PAPER.clone().setY(0.014), 'paper');
        if (S.stage === 'paper' && S.cut && nearXY(CUT)) return travel(key, CUT.clone().add(V(0.007, 0.003, 0)), 'pickup');
        if (S.stage === 'heldPiece' && nearXY(CUP.clone().setY(H), 0.05, 0.07)) {
          if (S.water) return travel(key, CUP.clone().add(V(-0.005, LEVEL + 0.008, 0)), 'put');
          status('杯子里没有水。先加水，或者把钠放回滤纸。');
        }
        if (S.stage === 'heldPiece' && nearXY(PAPER)) { S.stage = 'paper'; S.held = ''; }
      }
      if (key === 'knife' && S.stage === 'paper' && !S.cut && nearXY(PAPER, 0.055, 0.05)) {
        S.chosen = clamp((p.x - CUT_LEFT) / CUT_L * NA.stock, 0.02, 0.28);
        return travel(key, V(CUT_LEFT + CUT_L * S.chosen / NA.stock, 0.010, PAPER.z - 0.014), 'cut');
      }
      if ((key === 'jug' || key === 'ph') && nearXY(CUP.clone().setY(H), 0.055, 0.07)) return travel(key, CUP.clone().add(V(0.009, H + 0.038, 0)), key === 'jug' ? 'water' : 'ph');
      home(key);
    }
    function tapTool(key) {
      if (key === 'tw') {
        if (S.stage === 'bottle') travel(key, OIL.clone().setY(0.026), 'take');
        else if (S.stage === 'heldStock') travel(key, PAPER.clone().setY(0.014), 'paper');
        else if (S.stage === 'paper' && S.cut) travel(key, CUT.clone().add(V(0.007, 0.003, 0)), 'pickup');
        else if (S.stage === 'heldPiece' && S.water) travel(key, CUP.clone().add(V(-0.005, LEVEL + 0.008, 0)), 'put');
      } else if (key === 'knife' && S.stage === 'paper') travel(key, V(CUT_LEFT + CUT_L * S.chosen / NA.stock, 0.01, PAPER.z - 0.014), 'cut');
      else if (key === 'jug' || key === 'ph') travel(key, CUP.clone().add(V(0.009, H + 0.038, 0)), key === 'jug' ? 'water' : 'ph');
    }
    const hints = { tw: () => S.held ? '镊子：把钠放到滤纸 / 水中' : '镊子：取钠（不要用手）', knife: () => '小刀：拖到切线，越靠右切得越大', jug: () => '水瓶：拖到烧杯口加水', ph: () => '酚酞滴瓶：拖到杯口滴几滴' };
    const drag = draggable(group, Object.entries(tools).map(([key, obj]) => ({ obj: obj.pick, plane: 'xy', offset: 0.06, keepOffset: true, anchor: obj,
      hint: () => S.near ? '' : hints[key](), onStart: () => { S.tools[key].drag = true; S.tools[key].motion = null; },
      onDrag: (p) => { S.tools[key].pos = [clamp(p.x, -0.2, 0.22), clamp(p.y, 0.012, 0.22), 0.06];
        if (key === 'knife' && S.stage === 'paper' && !S.cut) S.chosen = clamp((p.x - CUT_LEFT) / CUT_L * NA.stock, 0.02, 0.28); },
      onEnd: (moved) => { S.tools[key].drag = false; if (moved) release(key); }, onTap: () => tapTool(key),
    })), { tip: tag('', 'pill'), highlight: true, taps: [
      { obj: paperPick, hint: () => S.near ? '' : '滤纸：点一下吸干钠表面的煤油', onTap: () => A.blot() },
      { obj: cupPick, hint: '烧杯：点一下，倒入废液盘再试', onTap: () => A.dump() },
    ] });
    const act = demoActs(drag, group);
    const mw = micro({ tag, look, back, group, scene: sodiumScene(), at: () => CUP.clone().setY(LEVEL), btnAt: () => CUP.clone().add(V(0, H + 0.025, -0.02)),
      label: '钻进去看', state: () => ({ reacted: S.total - S.left, ph: S.ph > 0 }), show: () => S.total > 0 && !S.dump, bar: () => bar, scale: 0.0057, dist: 0.29 });
    const demoPath = (obj, to) => act.path(obj, [null, () => V(obj.parent.position.x, 0.145, 0.09), () => to.clone().setY(0.145), to], { t0: 0.03, t1: 0.65, release: 0.68 });
    const bar = lessonBar({ group, look, back, steps: [
      { id: 'water', title: '加水', todo: '把<b>水瓶</b>拖到烧杯口，加一些水。', target: () => jug },
      { id: 'ph', title: '滴酚酞', todo: '把<b>酚酞滴瓶</b>拖到烧杯口，滴几滴。', target: () => ph },
      { id: 'take', title: '镊子取钠', todo: '把<b>镊子</b>拖到煤油瓶里，夹取一小块钠。不要用手直接接触钠。', target: () => tw },
      { id: 'dry', title: '滤纸吸油', todo: '用<b>镊子</b>把钠放到滤纸上，再<b>点滤纸</b>吸干表面的煤油。', target: () => S.stage === 'heldStock' ? tw : paper },
      { id: 'cut', title: '刀切绿豆大', todo: '把<b>小刀</b>拖到切线，切下绿豆大一块（约 40 mg）。刀口越靠右，切下的越大。', target: () => knife },
      { id: 'put', title: '镊子投钠', todo: '用<b>镊子</b>夹起滤纸左边的小块，再拖到烧杯水面放下。不要近距离俯视烧杯。', target: () => tw },
      { id: 'observe', title: '看变化', todo: '看<b>烧杯</b>：钠的位置、形状和溶液颜色怎样变？观察记录会一行行长出来。', target: () => bk },
    ], reels: { demo: { label: '老师演示', seal: '演示',
      ...sandbox({ get: () => S, set: (s) => { S = s; }, fresh, apply: () => { clearFx(); apply(); }, bar: () => bar }),
      shots: [
        { cap: '烧杯里加入一些水。', dur: 4.5, during: demoPath(jug.pick, CUP.clone().setY(H + 0.02)) },
        { cap: '滴几滴酚酞，水还是无色的。', dur: 4, during: demoPath(ph.pick, CUP.clone().setY(H + 0.02)) },
        { cap: '用镊子取钠，不要用手直接接触。', dur: 4, during: demoPath(tw.pick, OIL.clone().setY(0.07)) },
        { cap: '放在滤纸上，吸干表面的煤油。', dur: 6.5, during: act.seq(demoPath(tw.pick, PAPER.clone().setY(0.014)), (k) => { if (k > 0.6 && S.stage === 'paper' && !S.blot) A.blot(); }) },
        { cap: '用小刀切下绿豆大一块，约 40 mg（近似）。', dur: 4, during: demoPath(knife.pick, V(CUT_LEFT + CUT_L * NA.mass / NA.stock, 0.014, PAPER.z)) },
        { cap: '镊子夹起小块钠。剩下的钠按规范回收。', dur: 3.5, during: demoPath(tw.pick, CUT.clone()) },
        { cap: '从侧面看，把钠放入水中。浮在水面，棱角开始消失。', dur: 4, during: demoPath(tw.pick, CUP.clone().setY(H)) },
        { cap: '熔成闪亮小球，嘶嘶地游动，越游越小。红色从它经过的地方往下散。', dur: 12, cam: [[CUP.x, LEVEL, 0], [0.12, 0.55, 1], 0.23] },
        { cap: '反应结束，红色散开。产气、消耗钠和生成碱，都由同一份质量计算。', dur: 6, cam: [[CUP.x, LEVEL, 0], [0.12, 0.55, 1], 0.23] },
        { cap: '钻进去看：钠失电子，水中的氢得电子；生成 Na⁺、OH⁻ 和 H₂。', dur: 9, cam: [[CUP.x, LEVEL + 0.05, 0], [0.05, 0.22, 1], 0.29], during: act.at(0.04, () => mw.open(true)) },
        { cap: '反应后的液体倒入废液盘。现在换你动手，检验自己的预测。', dur: 3, enter: () => mw.close(), during: act.tap(cupPick, 0.04) },
      ],
    } } });

    const comparePrediction = () => {
      if (!W || S.demo) return;
      const i = W.ui.prediction(); W.compare.innerHTML = `<div><b>我的预测</b>　${i == null ? '没有先猜' : OPTIONS[i]}</div><div><b>实际结论</b>　NaOH 和 H₂${i == null ? '' : i === 0 ? ' · 与预测一致' : ' · 和预测不同'}</div>`; W.compare.hidden = false;
    };
    function apply() {
      for (const [key, obj] of Object.entries(tools)) { obj.position.copy(V(...S.tools[key].pos)); obj.rotation.set(0, 0, 0); }
      bk.position.copy(CUP); bk.rotation.set(0, 0, 0); flame.setOn(false); field.visible = S.sources.length > 0; ball.visible = S.reaction && S.left > 0; renderMaterial();
    }
    function renderMaterial() {
      const stockHeld = S.held === 'stock', pieceHeld = S.held === 'piece';
      block.visible = S.stage === 'bottle' || S.stage === 'paper' || S.cut;
      if (S.stage === 'bottle') { block.position.copy(OIL).setY(0.02); block.scale.set(0.8, 0.8, 0.8); }
      else { block.position.copy(PAPER).add(V(S.cut ? CUT_L * S.mass / NA.stock / 2 : 0, 0.007, 0)); block.scale.set(S.cut ? 1 - S.mass / NA.stock : 1, 1, 1); }
      held.visible = stockHeld || pieceHeld;
      const r = radius(S.mass) * 3;
      held.scale.set(stockHeld ? CUT_L : r * 1.6, stockHeld ? 0.012 : r * 1.6, stockHeld ? 0.018 : r * 1.6);
      piece.visible = S.cut && S.stage === 'paper'; piece.position.copy(CUT); piece.scale.set(r * 1.6, r * 1.6, r * 1.6);
      cutLine.visible = S.stage === 'paper' && !S.cut; cutLine.position.x = CUT_LEFT + CUT_L * S.chosen / NA.stock;
      stain.material.opacity = S.stage !== 'bottle' && !stockHeld ? S.dry ? 0.38 : 0.15 : 0;
      stain.scale.setScalar(S.dry ? 1 : 0.6);
    }
    function step(dt, now) {
      // h 再细分，避免 qa 的 4 倍速改变热学阈值。
      for (const [key, obj] of Object.entries(tools)) {
        const t = S.tools[key];
        if (t.motion) {
          const p = V(...t.pos), goal = V(...t.motion.points[0]), d = goal.clone().sub(p), speed = key === 'tw' ? 0.24 : 0.20;
          p.addScaledVector(d, Math.min(1, dt * speed / Math.max(0.00001, d.length()))); t.pos = p.toArray();
          if (p.distanceTo(goal) < 0.0005) {
            t.motion.points.shift();
            if (!t.motion.points.length) {
              const event = t.motion.event; t.motion = null;
              if (events[event]) { events[event](); home(key); }
            }
          }
        }
        obj.position.lerp(V(...t.pos), 1 - Math.exp(-dt * 26));
        const pouring = t.motion?.event === 'water' || t.motion?.event === 'ph';
        const twVertical = key === 'tw' && ((Math.abs(obj.position.x - OIL.x) < 0.03 && obj.position.z < 0.03 && obj.position.y < 0.14) || (Math.abs(obj.position.x - CUP.x) < 0.045 && obj.position.z < 0.035 && obj.position.y < 0.14));
        const tilt = twVertical ? Math.PI / 2 : pouring && obj.position.distanceTo(CUP.clone().add(V(0.009, H + 0.038, 0))) < 0.018 ? key === 'jug' ? -1.7 : Math.PI : 0;
        obj.rotation.z += (tilt - obj.rotation.z) * Math.min(1, dt * 12);
        const knifeTurn = key === 'knife' && Math.abs(obj.position.x - PAPER.x) < 0.06 && obj.position.z < 0.075 && obj.position.y < 0.08 ? Math.PI / 2 : 0;
        obj.rotation.y += (knifeTurn - obj.rotation.y) * Math.min(1, dt * 12);
        // 滴头可见的水滴，跟着瓶子移动。
        if (pouring && tilt && Math.random() < dt * 25) drops.spawn({ p: CUP.clone().add(V(0, H + 0.016, 0)), v: V(0, -0.08), size: key === 'jug' ? 0.0018 : 0.0011, life: 1 });
      }
      // 开煤油瓶盖：镊子靠近时向旁边抬起，取出后盖回，不把镊子穿过瓶盖。
      const capOut = S.tools.tw.drag || S.tools.tw.motion?.event === 'take';
      bottle.cap.position.x += ((capOut ? -0.035 : 0) - bottle.cap.position.x) * Math.min(1, dt * 10);
      bottle.cap.position.y += ((capOut ? 0.083 : 0.073) - bottle.cap.position.y) * Math.min(1, dt * 10);
      if (S.blot > 0 && S.blot < 1) {
        S.blot = Math.min(1, S.blot + dt / 1.1);
        if (S.blot > 0.65 && !S.dry) { S.dry = true; S.blotted = true; done('dry'); status('煤油被滤纸吸走了。用小刀沿切线切下绿豆大一块。'); }
      }
      flap.rotation.z = S.blot ? Math.sin(S.blot * Math.PI) * 2.5 : 0;
      const blotLift = S.blot ? Math.sin(S.blot * Math.PI) : 0; paper.position.y = PAPER.y + blotLift * 0.010; paper.rotation.z = blotLift * 0.15;
      const maxSub = Math.max(1, Math.ceil(dt / 0.012));
      for (let sub = 0; sub < maxSub; sub++) {
        const h = dt / maxSub;
        if (S.total > 0 && !S.dump) S.clock += h;
        if (!S.reaction) continue;
        if (S.oil > 0) { S.oil = Math.max(0, S.oil - h / 3); continue; }
        const r = radius(S.left); let dm = Math.min(S.left, sodiumRate(S.left, S.temp) * h);
        if (S.left - dm < 0.00001) dm = S.left;
        S.flux = dm / h; S.left = Math.max(0, S.left - dm); S.gas += dm / NA.molar / 2 * 24500;
        S.energy = Math.max(0, S.energy + dm * NA.heat * NA.retain - NA.cooling / Math.max(r, 0.0005) * (S.temp - 22) * h);
        const thermal = sodiumThermal(S.energy, S.total); S.temp = thermal.temp; S.melt = Math.max(S.melt, thermal.melt);
        const h2rate = S.flux / NA.molar / 2 * 24500;
        const force = h2rate * 0.03, th = Math.sin(S.clock * 2.3) * 2.3 + S.clock * 0.75;          // 氢气喷出推着钠走：最快约每秒两三厘米（示意）
        S.vx += (Math.cos(th) * force - S.vx * 1.6) * h; S.vz += (Math.sin(th) * force - S.vz * 1.6) * h;
        S.x += S.vx * h; S.z += S.vz * h; S.path += Math.hypot(S.vx, S.vz) * h;
        const lim = R - Math.max(0.004, radius(S.left) * 3) - 0.002, rr = Math.hypot(S.x, S.z);
        if (rr > lim) { const nx = S.x / rr, nz = S.z / rr, dot = S.vx * nx + S.vz * nz; S.x = nx * lim; S.z = nz * lim; S.vx -= 1.8 * dot * nx; S.vz -= 1.8 * dot * nz; }
        S.sourceAcc += dm;
        if (S.sourceAcc > 0.001 || S.left === 0) { S.sources.push([S.x, S.z, S.clock, S.sourceAcc / NA.mass]); S.sourceAcc = 0; if (S.sources.length > 40) { const a = S.sources.shift(); S.sources[0][3] += a[3]; } }
        S.bubbleAcc += h2rate * h * 7;
        while (S.bubbleAcc > 1) { S.bubbleAcc--; bubs.spawn({ p: CUP.clone().add(V(S.x + (Math.random() - 0.5) * 0.008, LEVEL + 0.0008, S.z)), v: V(-S.vx * 0.4, 0.025 + h2rate * 0.001, -S.vz * 0.4), size: 0.0006 + Math.min(0.0015, h2rate * 0.00015), life: 0.6 }); }
        if (S.melt > 0.9) observe('melt'); if (S.path > 0.012) observe('move'); if (S.gas > 0.15) observe('hiss'); if (S.ph && S.sources.length > 1 && S.clock > 1.5) observe('red');
        // 一小团氢气与空气的混合：停留 0.12 s，周围空气 12 mL/s（均为教学近似）。
        S.jet += (h2rate * 0.12 - S.jet) * Math.min(1, h * 10);
        const fraction = S.jet / (S.jet + 12 * 0.12);
        if (!S.ignition && S.temp >= 560 && fraction > 0.04 && fraction < 0.75) {
          S.ignition = true; S.flash = 1; S.burned = S.jet;
          // 氢燃烧约 242 kJ/mol（生成水蒸气），0.15% 转为液滴动能；不是对真实爆炸的预测。
          S.splashEnergy = S.jet / 24500 * 242000 * 0.0015;
          const speed = Math.min(0.75, Math.sqrt(2 * S.splashEnergy / 0.003));
          for (let i = 0; i < Math.ceil(20 + S.jet * 8); i++) { const a = i * 2.39996; splash.spawn({ p: CUP.clone().add(V(S.x, LEVEL + 0.005, S.z)), v: V(Math.cos(a) * speed * 0.5, speed * (0.8 + Math.random() * 0.3), Math.sin(a) * speed * 0.5), size: 0.0012 + Math.random() * 0.001, life: 2.2 }); }
          status('黄色火焰，液滴炸开溅出！大块钠放热、产气更多。这就是课本只取绿豆大的原因。点烧杯倒掉，再重来。'); sfx.whoosh({ dur: 0.5, gain: 0.15 });
        }
        if (S.left < 0.00001) {
          S.left = 0; S.reaction = false; S.finished = true; S.flux = 0; done('observe');
          if (!S.demo) { comparePrediction(); W?.t1.open(); if (W) W.next.hidden = false; }
          status(S.ph ? '钠消失了，红色继续向下、向四周散开。先看自己的记录，再和预测对一对。' : '钠消失了。<b>没有滴酚酞</b>，溶液看不出颜色变化——生成的碱要靠酚酞才看得出来。可以倒掉重做一次。');
        }
      }
      S.flash = Math.max(0, S.flash - dt / 3.5);
      const effective = radius(S.left) * 3;
      ball.visible = S.left > 0 && S.stage === 'water' && !S.dump;
      ball.position.copy(CUP).add(V(S.x, LEVEL - effective * 0.78, S.z));
      // 密度接近水：大部分体积在水下（按浮力平衡取约 97% 浸入）。
      ball.scale.set(effective * (1.2 - S.melt * 0.2), effective * (0.72 + S.melt * 0.28), effective);
      ball.morphTargetInfluences[0] = S.melt; glint.visible = S.melt > 0.5;
      ball.rotation.y += dt * (1 - S.melt) * 2;
      flame.position.copy(ball.position).add(V(0, effective, 0)); flame.setOn(S.ignition && S.left > 0 || S.flash > 0); flame.setSize(Math.max(0.35, S.flash)); flame.update(now);
      slick.visible = S.oil > 0 && S.stage === 'water'; slick.position.copy(CUP).add(V(S.x, LEVEL + 0.0005, S.z)); slick.material.opacity = S.oil * 0.45;
      bk.setLevel(S.water * LEVEL);
      for (const [i, u] of field.material.uniforms.uSrc.value.entries()) u.set(...(S.sources[i] || [0, 0, -100, 0]));
      field.material.uniforms.uTime.value = S.clock; field.material.uniforms.uPh.value = S.ph ? 1 : 0; field.visible = S.sources.length > 0 && !!S.water;
      bubs.update(dt, (p, d) => { p.p.addScaledVector(p.v, d); return p.p.y < LEVEL + 0.02; });
      splash.update(dt, (p, d) => { p.v.y -= d * 0.8; p.p.addScaledVector(p.v, d); if (p.p.y < 0.003) { p.p.y = 0.003; p.v.set(0, 0, 0); p.size *= 1 + d; } return true; });
      drops.update(dt, (p, d) => { p.v.y -= d * 0.5; p.p.addScaledVector(p.v, d); return p.p.y > LEVEL; });
      if (S.dump > 0) {
        S.dump = Math.min(1, S.dump + dt / 2.2);
        const k = S.dump, a = Math.sin(k * Math.PI); bk.position.copy(CUP).lerp(WASTE.clone().setY(0.12), a); bk.rotation.z = -a * 1.45;
        S.water = Math.max(0, 1 - clamp((k - 0.2) / 0.5, 0, 1)); field.visible = false; ball.visible = false;
        if (k === 1) { const demo = S.demo; S = fresh(); S.demo = demo; clearFx(); apply(); back(); if (!demo) { bar.undo(...PREP); W?.t1.close(); W?.t2.close(); W.next.hidden = true; W.compare.hidden = true; W.ui.relock({ full: false }); } status('换了干净烧杯。保留上轮记录作比较，重新加水、取钠。'); }
      }
      renderMaterial();
      soundMark.visible = S.reaction && S.gas > 0.1 && !S.oil; soundMark.position.copy(CUP).add(V(S.x, LEVEL + 0.032, S.z));
      if (sound) { sound.level = Math.min(0.1, S.flux * 8); sound.on(S.reaction && S.flux > 0 && !sfx.muted); }
      const reactionWords = [S.seen.float ? '浮' : '', S.seen.melt ? '熔' : '', S.seen.move ? '游' : '', S.seen.hiss ? '响' : '', S.seen.red ? '红' : ''].filter(Boolean).join(' · ');
      caption.text(`<div class="cc"><div class="cc-t"><span class="cc-name">${S.ignition ? '黄色火焰 · 飞溅' : reactionWords}</span></div><div class="cc-more">${S.finished ? '钠已反应完' : `剩余约 ${Math.max(0, S.left * 1000).toFixed(0)} mg`} · H₂ 约 ${S.gas.toFixed(1)} mL<br>钠的直径放大 3 倍 · 时间按实秒</div></div>`).loc(group, CUP.x + 0.052, H + 0.005, 0).show(S.total > 0 && !S.dump);
      massCard.text(`切下约 ${(S.chosen * 1000).toFixed(0)} mg${S.chosen < 0.065 ? ' · 绿豆大（近似）' : S.chosen > 0.15 ? ' · 明显太大' : ''}`).loc(group, PAPER.x, 0.04, PAPER.z).show(S.stage === 'paper' && !S.cut && !bar.playing);
      // 真实镜头位置检测：世界坐标换回本课坐标，再测相对杯口的方向和距离。
      const cam = window.__lb?.stage?.camera;
      let danger = false;
      if (cam && S.water) { const p = group.worldToLocal(cam.position.clone()), d = p.sub(CUP.clone().setY(H)); const forward = cam.getWorldDirection(V(0, 0, 0)), cupW = group.localToWorld(CUP.clone().setY(H)).sub(cam.position).normalize(); danger = d.length() < 0.22 && d.y / d.length() > 0.82 && forward.dot(cupW) > 0.92; }
      warning.text('注意　不要近距离俯视烧杯！').loc(group, CUP.x, H + 0.055, 0).show(danger);
      bar.near(S.near); mw.update(dt);
    }
    apply();
    const pointer = wrapPointer(drag, bar), down = pointer.down;
    pointer.down = (r, e) => { if (!sound) { try { sound = new Noise({ gain: 0.035 }); } catch { /* 画面同时显示嘶嘶声 */ } } return down(r, e); };
    return {
      group: root, pointer, card: false, toggles: ['cards', 'steps'], size: { w: 0.4, d: 0.25, h: 0.15 },
      view: { elev: 28, azim: -6, lookY: 0.34, frameMargin: 1.02 },
      mount(ui) {
        const compare = h('div', { class: 'sum-ctx', hidden: true });
        const t2 = think({ q: '钠着火了，能用水灭吗？', ctx: () => `这轮钠约 ${(S.total * 1000).toFixed(0)} mg，放出了约 ${S.gas.toFixed(1)} mL 氢气。`, options: ['不能。用专用灭火剂或干砂', '能。水可以降温'], wrong: ['水会继续和钠反应，放热并生成氢气，会加剧危险。'], ok: '课本第 37 页：活泼金属着火时，不能用水灭火，可使用专用灭火剂或干砂灭火。', status, onOk: () => {} });
        const t1 = think({ q: '钠为什么保存在煤油里？', ctx: () => `你的操作：从煤油中取钠，${S.dry || S.blotted ? '用滤纸吸干了煤油' : '<b>没有吸干煤油</b>'}，切下约 ${(S.total * 1000).toFixed(0)} mg 投进水中${S.ph ? '（滴了酚酞）' : '（<b>没有滴酚酞</b>）'}；钠很快消失。`, options: ['隔绝空气，也防止接触水', '煤油能让钠变得不活泼', '为了让钠更容易熔化'], wrong: ['钠的性质没有改变。煤油隔开了空气和水。', '保存钠不是为了加热。回想它遇水后的现象。'], ok: '钠很活泼。煤油把钠和空气、水隔开；滤纸吸掉煤油后再做实验。', status, onOk: () => t2.open() });
        const sizes = h('details', { class: 'more' }, h('summary', {}, '换个切口再试'), h('p', { class: 'fineprint' }, '拖动刀口也能改大小。明显大于绿豆大的钠，可能着火、炸开飞溅。不是安全剂量演算。'),
          h('div', { class: 'btn-row' }, ...[[0.04, '绿豆大 · 40 mg'], [0.12, '较大 · 120 mg'], [0.26, '黄豆大以上 · 260 mg']].map(([g, s]) => h('button', { class: 'go ghost', onclick: () => A.cutMass(g) }, s))));
        const more = moreBox([['镊子：取 / 放钠', () => tapTool('tw')], ['滤纸吸干煤油', () => A.blot()], ['小刀沿切线切下', () => tapTool('knife')], ['加水', () => tapTool('jug')], ['滴酚酞', () => tapTool('ph')], ['凑近俯视试试', () => A.closeView()], ['回到全景', () => { S.near = false; back(); }], ['倒掉这杯再试', () => A.dump()], ['钻进去看 / 重看', () => mw.open()]], () => A.reset());
        const note = h('details', { class: 'more' }, h('summary', {}, '模型、近似和出处'), h('p', { class: 'fineprint', html: '水约 200 mL、22 ℃。绿豆大按 40 mg 近似（绿豆形状不一，不是固定质量）；刀口可切约 20–280 mg。钠的直径放大 3 倍，初始大块/器材为操作示意；时间不加快，40 mg 约 18 秒消失。<br>课本第 34 页：密度 0.97 g/cm³，熔点 97.79 ℃。消耗按球表面退缩 dr/dt ≈ −0.105 mm/s；dm = ρ·4πr²·dr，产氢 n(H₂)=n(Na)/2，NaOH 与 Na 等物质的量。气体按室温约 24.5 L/mol。浮力按 ρ钠/ρ水≈0.97；画面把水下轮廓显出来，便于观察。<br>放热取约 184 kJ/mol；局部热量 Q 的 15% 留存、散热 (3×10⁻⁵/r)·(T−22) W，比热取 1.23 J/(g·K)，熔化热取 113 J/g（NIST 数据取整）。它是集总教学模型，温度不当实测温度显示。氢气与空气局部混合、满足 4–75% 且局部温度达到 560 ℃时演示燃烧；黄色来自钠的发光，氢焰本身不为黄色。飞溅把燃烧热的 0.15% 换成液滴动能；真实起火、爆裂还受表面状态、传热、库仑作用等影响，不能用本模型预测安全界限。<br>红色按每一小份钠反应后生成的 OH⁻ 从当时位置输运：高斯展宽 D≈1.8×10⁻⁵ m²/s、向下对流约 3 mm/s；这是对流混合示意，远大于分子扩散系数。未滴酚酞就不显红；没吸油会先留下淡黄油膜，延迟接触。' }),
          h('p', { class: 'fineprint', html: '补充依据：<a href="https://webbook.nist.gov/cgi/cbook.cgi?ID=C7440235&amp;Mask=2" target="_blank" rel="noreferrer">NIST 钠热容</a>；<a href="https://sti.srs.gov/fulltext/SRNL-STI-2016-00104.pdf" target="_blank" rel="noreferrer">SRNL 热化学数据</a>；<a href="https://www.ilo.org/dyn/icsc/showcard.display?p_card_id=0001&p_lang=en" target="_blank" rel="noreferrer">ILO/WHO 氢气 ICSC 0001</a>；<a href="https://chemicalsafety.ilo.org/dyn/icsc/showcard.display?p_card_id=0717&p_lang=en" target="_blank" rel="noreferrer">钠 ICSC 0717</a>。反应速率、散热、混合与飞溅参数为教学设定。' }));
        const base = mountXuean(ui, { controls: [compare, t1, t2, sizes, more, note], headers: ['实验现象', '分析及结论'], intro: '先加水、滴酚酞。桌上的镊子、滤纸和小刀都能操作；也可以先看老师演示。' });
        // 先看自己的观察记录，再对照预测、想一想；沿用学案的阅读顺序。
        ui.data.append(compare, t1.el, t2.el, base.next);
        W = { ...base, ui, t1, t2, compare, status: ui.status }; bar.attach(ui);
      },
      update(dt, t) { const k = bar.update(dt); step(Math.min(dt, 1 / 30) * k, t); },
      dispose() { bar.dispose(); drag.dispose(); mw.dispose(); sound?.stop(); bubs.dispose(); splash.dispose(); drops.dispose(); field.material.dispose(); },
      debug: { get S() { return S; }, bar, A, mw, tools, bk, ball, field, constants: { NA, VOL, LEVEL },
        picks: { tw: tw.pick, knife: knife.pick, paper: paperPick, cup: cupPick, jug: jug.pick, ph: ph.pick },
        qa: qaFlow(drag, [
          { name: '加水', drag: jug.pick, to: () => CUP.clone().setY(H + 0.02), wait: 3 },
          { name: '滴酚酞', drag: ph.pick, to: () => CUP.clone().setY(H + 0.02), wait: 3 },
          { name: '镊子取钠', drag: tw.pick, to: () => OIL.clone().setY(0.07), wait: 3 },
          { name: '放到滤纸', drag: tw.pick, to: () => PAPER.clone().setY(0.015), wait: 3 },
          { name: '滤纸吸油', tap: paperPick, wait: 2 },
          { name: '刀切绿豆大', drag: knife.pick, to: () => V(CUT_LEFT + CUT_L * NA.mass / NA.stock, 0.014, PAPER.z), wait: 3 },
          { name: '夹起小块', drag: tw.pick, to: () => CUT.clone().setY(0.014), wait: 3 },
          { name: '放入水中', drag: tw.pick, to: () => CUP.clone().setY(H), wait: 3, scale: 1 },
          { name: '浮熔游响红', run: () => {}, wait: 4, scale: 1 },
          { name: '反应结束', run: () => {}, wait: 22 },
          { name: '核对观察和预测', run: () => { if (!S.finished || Object.keys(S.seen).length !== 5) throw new Error('五种现象尚未完整出现'); if (S.total < 0.025 || S.total > 0.07) throw new Error('绿豆大质量不符'); }, wait: 1 },
          { name: '为什么存煤油', run: () => W.t1.el.querySelector('button').click() },
          { name: '着火能用水吗', run: () => W.t2.el.querySelector('button').click() },
        ]),
      },
    };
  },
};
