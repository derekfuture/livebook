// 人教版必修第二册，印刷第 44、45、57–58 页。
import * as THREE from 'three';
import { h } from '../ui/Panel.js';
import { lessonBar } from './kit/lessonbar.js';
import { paperSheet, sandbox, demoActs, mountXuean, moreBox, qaFlow, wrapPointer } from './kit/chemlesson.js';
import { clamp, draggable } from './kit/interact.js';
import { micro } from './kit/microworld.js';
import { seg } from './kit/ui.js';
import { bench, bathTilt, V, X, BX, BASE, LOW, RIM, LEN, NAMES, level, rateScene } from './kit/rate-parts.js';

const TITLES = ['水浴与气泡', '浓度与浑浊', '水浴与浑浊', '催化剂与气泡'];
const INTRO = [
  '两管各装有 2 mL 5% H₂O₂，两支滴管吸有 1 mol/L FeCl₃。',
  '甲、乙分别装有 2 mL 和 1 mL 0.1 mol/L Na₂S₂O₃。两侧量筒装 0.1 mol/L 稀硫酸，中间量筒装蒸馏水，点量筒名牌可平视刻度。',
  '甲、乙各装有 2 mL 0.1 mol/L Na₂S₂O₃。量筒内是 0.1 mol/L 稀硫酸，点量筒名牌可平视刻度。',
  '三管各装有 2 mL 10% H₂O₂。选两管分别加催化剂，留一管作对照。',
];
const DIR = {
  startFe: '拖动一支 FeCl₃ 滴管对准同侧管口，另一支同步。每次各滴一滴，共两滴。',
  bath: '提起试管越过杯口，一支浸入冷水，另一支浸入热水。',
  water: '平视量筒，核对所需的 1 mL 蒸馏水，再倒入乙管摇匀。',
  dilute: '提起加了水的试管，轻轻左右摇匀，再放回架上。',
  acid: '平视量筒，核对每管所需的 2 mL 稀硫酸，再拖到同侧管口同步加酸。',
  shake: '轻摇任一支试管，两管同步振荡，再放回原位。',
  time: '哪支试管初现乳白色浑浊，就按秒表上对应的记时键。',
  gas: '比较两支试管中气泡冒出的快慢。',
  catalyst: '把 MnO₂ 药匙和 FeCl₃ 滴管分别拖到两支试管口，另一管留作对照。',
  fe: '把 FeCl₃ 滴管对准另一支试管口，滴入两滴。',
  secondFe: '把 FeCl₃ 滴管再送到同一支试管口，滴入第二滴。',
  mn: '把盛有少量 MnO₂ 的药匙送到另一支试管口。',
  watch: '分别与空白管比较，加入催化剂后冒泡有什么变化？',
};
const NOTE = '用量和操作见必修第二册第 44、57–58 页。试剂已按课本量取。探究某影响因素时，需保持其他条件因素相同。拖动一支滴管或一只量筒，可同步给两管加试剂。水浴温度、气泡密度、反应时间和可见浑浊的阈值均为示意。温度组按水浴温度比较。酸液接触原液时开始反应和计时。振荡使溶液混合得更均匀。秒表与反应同步加快显示。催化剂组的气泡只示意各管相对空白管的变化。微观图追踪部分粒子的相遇及总反应中的原子去向，省略溶剂和中间步骤。碰撞与活化能见选择性必修 1 第 27–29 页。';
const isBath = (m) => m === 0 || m === 2;
const isThio = (m) => m === 1 || m === 2;
const bathName = (b) => b === 0 ? '冷水' : '热水';
const ID = (m) => 'run' + m;
const RING = { color: 0xef693a, minOpacity: 0.64 };
const BATH_RADIUS = .023;
const WARN = '量筒口、滴管尖端或药匙前端要对准管口，试剂才能进入试管。';
const REPEAT = '点此组实验名称可用新试剂再做一次。';
const ENERGY = '<svg role="img" aria-label="反应能量示意图" viewBox="0 0 292 91" width="270" height="84"><path d="M18 6v64h260" fill="none" stroke="#89959d"/><path d="M24 49C60 49 65 10 114 10S165 65 228 65" fill="none" stroke="#776b67" stroke-width="3"/><path d="M24 49C64 49 77 33 114 33S165 65 228 65" fill="none" stroke="#39796e" stroke-width="3"/><g font-size="10" fill="#354755"><text x="144" y="14">无催化剂</text><text x="137" y="39">有催化剂</text><text x="2" y="10">能量</text><text x="219" y="85">反应过程</text></g></svg>';
const rackX = (mode,i) => mode === 3 ? [-.052,0,.052][i] : X[i];
function trial(mode) {
  return { mode, recorded: false, water: -1, stirred: false, acid: false, clock: 0, mixedAt: null, temp: [15,45],
    age: 0, pour: null, hold: null, returns: {}, drops: 0, mn: -1, fe: -1,
    tubes: X.map((_,i) => ({ x: rackX(mode,i), y: BASE, ml: mode === 1 && i === 1 ? 1 : 2, bath: -1,
      iron: false, mn: false, age: 0, gas: 0, flux: 0, cloud: 0, progress: 0, reading: null })),
  };
}
const fresh = () => ({ demo: false, near: false, ...trial(0), trays: TITLES.map((_,mode)=>trial(mode)), rounds: [0,0,0,0], completed: [false,false,false,false] });
export default {
  id: 'rate', title: '化学反应速率的影响因素', fig: '探究 · 实验活动 7', style: 'paper', stampText: '实验',
  predict: { q: '等两管过氧化氢都冒泡后，把一管放入冷水，另一管放入热水，接下来会怎样？',
    options: ['冷水里仍冒泡，热水里冒得更快', '冷水里的反应立刻停止', '加了相同的催化剂，两边一样快'], answer: 0 },
  need: '比较水浴、浓度和催化剂对反应快慢的影响。',
  conclusion: {
    crops: [{ page: 49, rect: [65, 330, 378, 433] }],
    quote: '大量实验事实和科学研究证明：一般条件下，当其他条件相同时，增大反应物浓度，化学反应速率增大，降低反应物浓度，化学反应速率减小；升高温度，化学反应速率增大，降低温度，化学反应速率减小；催化剂可以改变化学反应速率。',
    formula: '', src: '必修第二册 · 第 45 页',
  },
  create({tag,look,back,reframe}) {
    const root = new THREE.Group(), table = new THREE.Group(), group = new THREE.Group(); root.add(table,group);
    paperSheet(table,{w:.73,d:.46,z:.008});
    const stations = [[-.15,.11],[.17,.11],[-.15,-.11],[.20,-.11]].map(([x,z],mode)=>{
      const parent = new THREE.Group(); parent.position.set(x,0,z); table.add(parent);
      const station = bench(parent,mode);
      station.frameMeshes = [];
      parent.traverse(part=>{if (part.isMesh && !part.userData.noFrame) station.frameMeshes.push(part);});
      return station;
    });
    const onTable = point => point.clone().add(group.position);
    let {tubes,baths,tools,trails,props} = stations[0];
    const cards = NAMES.map(() => tag('', 'cond'));
    const releaseHint = tag('', 'pill').show(false);
    const scene = rateScene();
    let W, cancelled = false, S = fresh(), lastDir = '', pause, lastLayout;
    const say = (msg) => { if (!S.demo) W?.ui.status(msg); };
    const n = () => S.mode === 3 ? 3 : 2;
    const tpos = i => V(S.tubes[i].x,S.tubes[i].y);
    const mouth = i => tpos(i).add(V(0,LEN + .002).applyQuaternion(tubes[i].body.quaternion));
    const rest = i => i >= 3 ? tools[i-3].home.clone() : S.tubes[i].bath < 0 ?
      V(rackX(S.mode,i),BASE) : V(BX[S.tubes[i].bath],LOW);
    const pairedFe = i => S.mode === 0 && (i === 6 || i === 8);
    const peerOf = i => i < 2 ? 1-i : pairedFe(i) ? 14-i : 7-i;
    const isPair = i => (i < 2 && S.acid) || i === 3 || i === 4 || pairedFe(i);
    const bathReady = () => S.tubes.slice(0,2).every(t => t.bath >= 0);
    const mixed = () => S.mixedAt !== null;
    const bathAvailable = (i,b) => !S.tubes.some((t,j)=>j!==i && t.bath===b);
    const nearBath = (p,b) => Math.hypot(p.x-BX[b],p.y-LOW) <= BATH_RADIUS;
    const poured = () => S.pour != null;
    const direction = () => {
      if (S.recorded) return REPEAT;
      if (S.mode === 0 && S.drops < 2) return DIR.startFe;
      if (S.mode === 3 && S.drops === 1) return DIR.secondFe;
      if (S.mode === 3) return S.mn < 0 ? (S.drops ? DIR.mn : DIR.catalyst) : S.drops < 2 ? DIR.fe : DIR.watch;
      if (isBath(S.mode) && !bathReady()) return DIR.bath;
      if (S.mode === 0) return DIR.gas;
      if (S.mode === 1 && S.water < 0) return DIR.water;
      if (S.mode === 1 && !S.stirred) return DIR.dilute;
      if (!S.acid) return DIR.acid;
      return mixed() ? DIR.time : DIR.shake;
    };
    const suggest = () => {
      if (S.near || S.hold || S.pour || mic.isOpen || S.recorded) return null;
      const d = direction();
      if (d === DIR.bath) return tubes[S.tubes[0].bath < 0 ? 0 : 1].body;
      if (d === DIR.startFe) return tools[5].body;
      if (d === DIR.water) return tools[2].body;
      if (d === DIR.acid) return tools[0].body;
      if (d === DIR.dilute) return tubes[S.water].body;
      if (d === DIR.shake) return tubes[0].body;
      if (d === DIR.fe || d === DIR.secondFe) return tools[3].body;
      if (d === DIR.mn || d === DIR.catalyst) return tools[4].body;
      return null;
    };
    function guide(force = false) {
      if (S.demo || !W) return;
      let msg = direction();
      if (S.recorded && !bar.finished && (S.mode !== 1 || S.water === 1)) msg = '已记下本组现象。在左侧选择' + TITLES[S.completed.indexOf(false)] + '，接着比较。';
      if (force || msg !== lastDir) { lastDir = msg; bar.say(msg);
        const strip = document.querySelector('.lbar.do');
        if (strip) {
          strip.querySelector('.lb-n').textContent = '（'+(S.mode+1)+'）';
          strip.querySelectorAll('.lb-steps i').forEach((el,i)=>el.classList.toggle('cur',i===S.mode));
        }
        W.ui.el.querySelector('.p-fig').textContent = S.mode === 0 ? '探究 · 课本第 44 页' : '实验活动 7 · 课本第 57–58 页'; }
    }
    function visible(i) {
      return !!props[i];
    }
    function active(i) {
      if (S.near || !visible(i) || mic.isOpen || S.recorded || poured()) return false;
      if (pairedFe(i)) return S.drops < 2;
      if (i < n()) return S.acid ? !mixed() : (isBath(S.mode) && (S.mode !== 0 || S.drops === 2)) || (S.mode === 1 && S.water === i);
      if (i < 5) return !S.acid && (S.mode === 1 ? S.stirred : bathReady());
      return i === 5 ? S.water < 0 : i === 6 ? S.drops < 2 : S.mn < 0;
    }
    function hint(i) {
      if (!active(i)) return '';
      if (pairedFe(i)) return '拖动滴管，两管同步滴入 FeCl₃';
      if (i < 2 && S.acid) return DIR.shake;
      if (i < 3) return (!isBath(S.mode) || S.acid) ? '提起试管，左右轻摇' : '提起试管，浸入水浴';
      return ['拖动量筒，两管同步加酸','拖动量筒，两管同步加酸','把蒸馏水倒入乙管','把滴管尖端对准管口','把药匙前端送到管口'][i-3];
    }
    const setPos = (i,p) => {
      props[i].body.position.copy(p);
      if (i < 3) { S.tubes[i].x = p.x; S.tubes[i].y = p.y; }
    };
    function arrange() {
      const focus = S.demo || S.rounds.slice(1).some(Boolean);
      stations.forEach((station,mode)=>{
        const state = mode === S.mode ? S : S.trays[mode];
        station.frameMeshes.forEach(part=>{part.userData.noFrame = mode !== S.mode && focus;});
        station.tubes.forEach((tube,i)=>{
          const t = state.tubes[i]; tube.rack.position.x = rackX(mode,i);
          tube.body.position.set(t.x,t.y,0); tube.body.rotation.z = bathTilt(t.bath);
          tube.contents(isThio(mode)); tube.update(t);
        });
        station.tools.forEach((tool,i)=>{
          tool.body.position.copy(tool.home); tool.body.rotation.z = 0;
          tool.volume(i < 2 ? +!state.acid : i === 2 ? +(state.water < 0) : i === 4 ? +(state.mn < 0) : 1-state.drops/2);
          tool.update?.();
          if (tool.bottle) tool.body.userData.ringY = .051;
        });
        station.baths.forEach((cup,i)=>{cup.dropRim.visible=false; cup.meter?.setTemp(state.temp[i]);});
        station.trails.forEach(drop=>{drop.visible=false;});
      });
      ({tubes,baths,tools,trails,props} = stations[S.mode]);
      group.position.copy(stations[S.mode].parent.position);
    }
    function select(m) {
      if (S.hold || S.pour || (!S.demo && bar.playing)) return;
      leaveReading(); drag.clearDropzones(); mic.close();
      returning(1);
      S.trays[S.mode] = {tubes:S.tubes, acid:S.acid, water:S.water, drops:S.drops, mn:S.mn, temp:S.temp, clock:S.clock};
      Object.assign(S,trial(m));
      S.rounds[m]++;
      arrange(); lastLayout = null;
      reframe();
      if (!S.demo) { if(m===0) W.ui.observePrediction(null); W.mode.set(m); W.temps.hidden = m !== 2; W.cold.value = S.temp[0]; W.hot.value = S.temp[1]; say(INTRO[m]); guide(true); }
    }
    function begin(i) {
      if (!active(i) || S.hold) return;
      delete S.returns[i];
      if (isPair(i)) delete S.returns[peerOf(i)];
      const p = props[i].body.position;
      S.hold = { i, lastX: p.x, direction: 0, stroke: 0, reversed: false, moved: false };
    }
    function move(i,p) {
      const g = S.hold;
      if (g?.i !== i) return;
      const o = props[i], original = o.body.position;
      p = V(clamp(p.x,-.18,.18),clamp(p.y,i<3 ? LOW : i<6 ? tools[i-3].home.y : .004, i<3 ? .135 : .205));
      if (p.distanceTo(original) > .0003) g.moved = true;
      if (i < 3) {
        const dock = rest(i), bath = S.tubes[i].bath, high = RIM+.005;
        // A tube must clear its rack or beaker before moving across the rim.
        if (isBath(S.mode) && !S.acid) {
          const requestedBath = BX.findIndex((_,b)=>nearBath(p,b));
          const channel = [X[i], ...BX].find(x => Math.abs(original.x-x) < .016);
          if (original.y < high && channel !== undefined && p.y < high) p.x = clamp(p.x,channel-.006,channel+.006);
          else if (p.y < high && ![...BX, X[i]].some(x => Math.abs(p.x-x)<.016)) p.y = high;
          g.dropBath = requestedBath >= 0 && nearBath(p,requestedBath) && bathAvailable(i,requestedBath) ? requestedBath : -1;
        } else {
          // Rock about a small region above the support. Only a return stroke counts.
          if (bath < 0 && p.y < .057) p.x = clamp(p.x,dock.x-.002,dock.x+.002);
          if (S.acid) {
            p.x = clamp(p.x,dock.x-.011,dock.x+.011);
            if (bath >= 0) p.y = Math.min(p.y,.031);
          }
          const dx = p.x-g.lastX;
          if (Math.abs(dx) > .00035) {
            const sign = Math.sign(dx);
            if (sign !== g.direction) { if (g.stroke >= .005) g.firstStroke = true; g.stroke = 0; g.direction = sign; }
            g.stroke += Math.abs(dx);
            if (g.firstStroke && g.stroke >= .005) {
              g.reversed = true;
              if (S.acid && !mixed()) S.mixedAt = S.clock;
              // 摇匀在手里就算数（反馈 2026-11-25：提起来摇了多次，松手的地方不在架上那一点，就一直提示“摇匀”）
              if (!S.acid && S.water === i && !S.stirred) { S.stirred = true; say(NAMES[i]+'管中的原液和蒸馏水已摇匀。'); guide(); }
            }
            g.lastX = p.x;
          }
          o.body.rotation.z = clamp((dock.x-p.x)*6,-.12,.12);
          if (S.acid) {
            const peer = peerOf(i);
            setPos(peer,rest(peer).add(p.clone().sub(dock)));
            props[peer].body.rotation.z = o.body.rotation.z;
          }
        }
      } else {

        if (i < 6) {
          const gap = Math.min(p.distanceTo(mouth(0)),p.distanceTo(mouth(1)));
          const near = 1-clamp(gap/.042,0,1);
          o.body.rotation.z = tools[i-3].side*near*1.91;
        } else if (i === 7) o.body.rotation.z = -.32 * (1-clamp(Math.min(...S.tubes.slice(0,n()).map((_,k)=>p.distanceTo(mouth(k))))/.04,0,1));
        if (isPair(i)) {
          const peer = peerOf(i);
          const q = p.clone(); q.x = S.tubes[0].x + S.tubes[1].x - p.x;
          setPos(peer,q); props[peer].body.rotation.z = -o.body.rotation.z;
        }
      }
      setPos(i,p);
    }
    function putBack(i) {
      const o = props[i].body;
      S.returns[i] = { p: o.position.toArray(), rz: o.rotation.z, t: 0 };
    }
    function end(i,moved,zone) {
      const g = S.hold;
      if (g?.i !== i) return;
      S.hold = null;
      if (!moved || !g.moved || cancelled) { putBack(i); if (isPair(i)) putBack(peerOf(i)); return; }
      if (i < 3) {
        if (isBath(S.mode) && !S.acid) {
          if (zone && onTable(tpos(i)).distanceToSquared(zone.position()) < 1e-10) {
            S.tubes[i].bath = zone.bath; S.age = 0;
            if (zone.bath >= 0) say(NAMES[i]+'管已浸入'+bathName(zone.bath)+'。');
          } else say('提起试管越过杯口，等管底浸入水中再松手。');
        } else if (g.reversed && S.acid) say('两管已同步振荡。观察哪管先变浑浊。');          // 松手在哪儿都算：试管会放回架上
      } else {
        if (zone) { S.pour = { i, k: zone.tube, t: 0 }; return; }
        say(WARN);
      }
      putBack(i); if (isPair(i)) putBack(peerOf(i));
      guide();
    }
    function targets(i) {
      if (i < 3) {
        const bathing = () => isBath(S.mode) && !S.acid;
        const nearBottom = (x,y,r) => tpos(i).distanceToSquared(V(x,y)) <= r*r;
        const rack = { name: '试管架', bath: -1, position: () => V(rackX(S.mode,i),BASE), radius: .018,
          enabled: () => bathing() ? nearBottom(rackX(S.mode,i),BASE,.018) : S.tubes[i].bath < 0 };
        return [rack, ...BX.map((x,b) => ({ name: bathName(b)+'烧杯', bath: b, position: () => V(x,LOW), radius: BATH_RADIUS,
          enabled: () => isBath(S.mode) && (bathing() ? nearBath(tpos(i),b) && bathAvailable(i,b) : S.tubes[i].bath===b) }))];
      }
      return NAMES.map((name,k) => ({ name: name+'管口', tube:k, position: () => mouth(k), radius: .018,
        enabled: () => {
          if (k >= n()) return false;
          if (isPair(i)) {
            const left = S.tubes[k].x < S.tubes[1-k].x;
            return left === (i === 3 || i === 8);
          }
          if (i === 6) return k !== S.mn && (S.fe < 0 || S.fe === k);
          return i !== 7 || k !== S.fe;
        } }));
    }
    const drag = draggable(table, stations.flatMap((station,mode)=>station.props.map((o,i) => ({
      mode, i, obj:o.pick, anchor:o.body, offset:station.parent.position.z, keepOffset:true,
      hint:() => hint(i), enabled:() => S.mode === mode && active(i),
      dropzones:targets(i).map(zone=>({...zone,position:()=>onTable(zone.position())})), onStart:() => begin(i),
      onDrag:p => move(i,p.clone().sub(group.position)), onEnd:(moved,zone) => end(i,moved,zone),
    })).filter(Boolean)),{tip:tag('','pill')});
    function transfer(dt) {
      const a = S.pour;
      if (!a) return;
      const duration = a.i <= 5 ? .62 : .44;
      const before = clamp(a.t/duration,0,1);
      a.t += dt;
      const u = clamp(a.t/duration,0,1);
      const pair = isPair(a.i), ids = pair ? [0,1] : [a.k];
      for (const k of ids) {
        const t = S.tubes[k], p = mouth(k), y = t.y+level(t.ml);
        if (a.i < 5 && u >= 1/7) { t.acid = true; S.acid = true; }
        if (a.i < 6) t.ml += (a.i < 5 ? 2 : 1)*(u-before);
        const drop = trails[k]; drop.visible = true;
        drop.material.color.setHex((a.i === 6 || a.i === 8) ? 0xe6bc63 : a.i === 7 ? 0x373136 : 0xa4c9d8);
        if (a.i <= 5) {
          const length = (p.y-y)*Math.min(1,u*7);
          drop.scale.set(.70,length/.004,.70);
          drop.position.set(p.x,p.y-length/2,0);
        } else {
          drop.scale.set(1,1.25,1);
          drop.position.set(p.x,p.y+(y-p.y)*u*u,0);
        }
      }
      if (a.i === 6 || a.i === 8) {
        tools[a.i-3].volume(1-(S.drops+u)/2);
        if (pair) tools[peerOf(a.i)-3].volume(1-(S.drops+u)/2);
      }
      if (a.i <= 5) ids.forEach((k) => tools[pair ? k : 2].volume(1-u));
      if (u < 1) return;
      ids.forEach(k => { trails[k].visible = false; });
      if (pairedFe(a.i)) {
        S.drops++; ids.forEach(k=>{S.tubes[k].iron=true;}); putBack(peerOf(a.i));
        say(S.drops === 1 ? '两管各滴入了一滴。再次对准管口，各滴第二滴。' : '两管各滴入了两滴 FeCl₃，均已冒泡。');
      }
      else if (pair) { putBack(7-a.i); say('两管已同时加酸，秒表正在计时。'); }
      else if (a.i === 5) { S.water = a.k; say(NAMES[a.k]+'管中已加入蒸馏水。'); }
      else if (a.i === 6) {
        S.fe = a.k; S.drops++; S.tubes[a.k].iron = true;
        say(S.drops === 1 ? '已滴入一滴。把滴管再送到同一支管口，滴第二滴。' : NAMES[a.k]+'管已滴入两滴 FeCl₃。');
      }
      else { S.mn = a.k; S.tubes[a.k].mn = true; say(NAMES[a.k]+'管中加入了少量 MnO₂。'); }
      if (a.i === 7) tools[4].volume(0);
      S.age = 0; putBack(a.i); S.pour = null; guide();
    }
    function returning(dt) {
      Object.entries(S.returns).forEach(([id,r]) => {
        const i = +id, u = Math.min(1,(r.t += dt)/.40), end = rest(i);
        const p = V(...r.p).lerp(end,u*u*(3-2*u));
        setPos(i,p); props[i].body.rotation.z = r.rz*(1-u) + (i < 3 ? bathTilt(S.tubes[i].bath)*u : 0);
        if (u === 1) delete S.returns[i];
      });
    }
    const condition = k => {
      const t = S.tubes[k];
      if (isBath(S.mode)) return t.bath < 0 ? '室温' : bathName(t.bath) + (S.mode === 2 ? ' '+S.temp[t.bath]+' ℃' : '');
      if (S.mode === 3) return t.mn ? '少量 MnO₂' : t.iron ? S.drops+' 滴 FeCl₃' : '未加催化剂';
      return (k ? '1' : '2') + ' mL 原液' + (S.water === k ? ' + 1 mL 水' : '');
    };
    const obs = t => isThio(S.mode) ? t.progress < 1 ? '澄清' : '乳白浑浊' :
      S.mode === 3 && (t.mn || t.iron) ? '比空白管快' : t.flux < .3 ? '气泡极少' : t.flux < 3 ? '缓慢冒泡' : t.flux < 6 ? '冒泡' : '密集冒泡';
    const observedTime = t => t.reading+' s（示意）';
    function react(dt) {
      S.age += dt;
      const elapsed = dt * (S.demo ? 6 : 3);
      if (S.acid && !S.recorded) S.clock += elapsed;
      for (let k=0;k<n();k++) {
        const t = S.tubes[k]; t.age += dt;
        if (!isThio(S.mode)) {
          t.flux = S.mode === 0 ? (!t.iron ? .12 : t.bath < 0 ? 4 : t.bath ? 11 : 1.35) : t.mn || t.iron ? 8 + 2*Math.sin(t.age*2 + k*2.4) : .13;
          t.gas += dt*t.flux; continue;
        }
        if (!S.acid) continue;
        // Common visible-sulfur threshold. Illustrative concentration and temperature factors only.
        const relative = ((S.mode === 1 && k === 1) ? 1 : 2) * 2 / t.ml;
        const temperature = t.bath < 0 ? 25 : S.temp[t.bath];
        const threshold = 19 / (relative * (4/t.ml) * Math.pow(1.55,(temperature-25)/10));
        t.progress += elapsed * (mixed() ? 1 : .68) / threshold;
        // The first visible haze and the split button share the same observation threshold.
        t.cloud = t.progress < 1 ? 0 : clamp(.12+(t.progress-1)*1.6,0,1);
        if (S.demo && t.progress >= 1 && t.reading === null) t.reading = Math.floor(S.clock);
      }
    }
    function record() {
      if (S.recorded || S.hold || S.pour) return;
      const ready = isThio(S.mode) ? S.acid && mixed() && S.tubes.slice(0,2).every(t => t.reading !== null)
        : S.age >= 2.0 && (S.mode === 0 ? bathReady() : S.mn >= 0 && S.drops === 2);
      if (!ready) return;
      S.recorded = true;
      const valid = S.mode !== 1 || S.water === 1;
      if (valid) S.completed[S.mode] = true;
      if (S.demo) return;
      for (let i=0;i<n();i++) {
        const t = S.tubes[i];
        W.tbl.add([TITLES[S.mode]+' · '+S.rounds[S.mode], NAMES[i]+' · '+condition(i), isThio(S.mode) ? observedTime(t) + (S.mixedAt >= 5 ? '，操作偏差：加酸后约 '+Math.round(S.mixedAt)+' s 才振荡' : '') : obs(t)]);
      }
      if (!valid) {
        say('水加进了甲管。两管总体积不同，加酸后酸的浓度也不同。点浓度与浑浊重做，保留这次记录。');
      } else {
        if (S.mode === 0) W.ui.observePrediction(S.tubes.slice(0,2).map((t,i)=> bathName(t.bath)+'中的'+NAMES[i]+'管'+obs(t)).join('，')+'。');
        bar.done(ID(S.mode)); W.mode.tick(S.mode,true);
        say(isThio(S.mode) ? '已记下两管从加酸到初现浑浊的时间。' : '已记下各管的条件和冒泡情况。');
      }
      W.review.hidden = !bar.finished; guide(true);
    }
    const microReady = () => isThio(S.mode) ? S.recorded && (S.mode !== 1 || S.water === 1)
      : S.mode === 0 ? bathReady() && S.drops === 2 : S.fe >= 0 && S.mn >= 0 && S.drops === 2;
    function microState() {
      const sulfur = isThio(S.mode);
      let ids = [0,1], tempo = [1,1], attempts = [2,2], extra = -1, explain;
      if (S.mode === 3) {
        ids = [S.tubes.findIndex(t=>!t.mn && !t.iron),S.fe]; attempts = [3,1];
        explain = '两管温度相同。能量图中，催化途径的峰较低，表示所需活化能较低。';
      } else if (S.mode === 1) {
        const dense = 2/S.tubes[0].ml > 1/S.tubes[1].ml ? 0 : 1;
        extra = dense;
        explain = '比较同样大小的一小团溶液。浓度较大的一侧，硫代硫酸根更多，单位时间内相遇的机会更多。';
      } else {
        ids.sort((a,b)=>S.tubes[a].x-S.tubes[b].x);
        const hot = S.tubes[ids[0]].bath === 1 ? 0 : 1;
        tempo[hot] = 1.3; tempo[1-hot] = .83; attempts[hot] = 1;
        explain = '热水浴中的试管内，粒子平均运动得更快，具有足够能量的粒子比例也更大。';
      }
      return { sulfur, labels: ids.map(i=>isBath(S.mode) ? '试管'+NAMES[i]+' · '+bathName(S.tubes[i].bath)+'浴' : S.mode === 1 ? NAMES[i]+'管' : condition(i)), places: ids.map(i=>bathName(S.tubes[i].bath)+'浴中的试管内'), extra, tempo, attempts, explain };
    }
    function leaveReading() {
      if (S.near) { S.near = false; back(); }
    }
    function readCylinder(j) {
      if (!visible(j+3) || S.hold || S.pour || S.demo || S.returns[j+3]) return;
      const tool = tools[j];
      S.near = true; S.readIndex = j;
      const direction = j === 2 ? [-.50,0,1] : [0,0,1];
      look(onTable(V(tool.home.x+tool.side*.008,.006+tool.fillHeight())).toArray(),direction,.16,()=>{S.near=false;});
    }
    const plates = [0,1,2].map(j=>tag('量筒 · '+(j===2?'蒸馏水':'稀硫酸'),'pill rate-plate',()=>readCylinder(j)));
    const exitReading = tag('回到实验台','pill',leaveReading);
    const watches = [1,2].map(mode=>{
      const watch = tag('', 'rate-watch').loc(stations[mode].parent,0,.006,mode === 1 ? .073 : -.074);
      const dial = h('output',{},'0 s');
      const keys = [0,1].map(i => h('button',{type:'button',onclick:()=>{
        const t = S.tubes[i];
        if (mode !== S.mode || S.demo || !S.acid || t.progress < 1 || t.reading !== null) return;
        t.reading = Math.floor(S.clock); record();
      }},'记'+NAMES[i]+'管'));
      watch.el.append(h('span',{},'秒表（示意）'),dial,h('div',{},keys));
      return {mode,watch,dial,keys};
    });
    const bathReadings = stations[2].baths.map(cup=>tag('', 'pill rate-degrees').loc(cup.meter,0,.11,0));
    const syncCards = () => {
      const show = !S.near && !S.demo && !mic.isOpen && !S.hold && !S.pour;
      cards.forEach((card,i) => {
        if (i >= n() || !show) { card.show(false); return; }
        const t = S.tubes[i];
        card.text('<div class="cc"><div class="cc-t"><span class="cc-name">'+NAMES[i]+'管</span><span class="cc-res">'+obs(t)+'</span></div></div>')
          .loc(group,t.x,t.y+LEN+.014,0).show(true);
      });
      const onBench = !S.near && !mic.isOpen;
      watches.forEach(({mode,watch,dial,keys})=>{
        watch.show(onBench);
        watch.el.classList.toggle('stowed', mode !== S.mode);
        const state = mode === S.mode ? S : S.trays[mode], [left,right] = state.tubes;
        const timeText = (left.reading !== null && right.reading !== null ? Math.max(left.reading,right.reading) : Math.floor(state.clock))+' s';
        if (dial.textContent !== timeText) dial.textContent = timeText;
        keys.forEach((key,i)=>{
          const t = state.tubes[i];
          key.disabled = mode !== S.mode || !onBench || S.demo || !S.acid || t.progress < 1 || t.reading !== null;
          const label = t.reading === null ? '记'+NAMES[i]+'管' : NAMES[i]+' '+t.reading+' s';
          if (key.textContent !== label) key.textContent = label;
        });
      });
      bathReadings.forEach((tag,b)=>{
        if (S.mode === 2) baths[b].meter.setTemp(S.temp[b]);
        tag.text(S.temp[b]+' ℃').show(onBench && S.mode === 2);
      });
      const dropBath = onBench && !S.demo ? S.hold?.dropBath : undefined;
      baths.forEach((cup,b)=>{cup.dropRim.visible=b===dropBath;});
      releaseHint.show(dropBath >= 0);
      if (dropBath >= 0) releaseHint.loc(baths[dropBath],0,RIM+.01,.024).text('松手放入'+bathName(dropBath)+'烧杯');
    };
    function update(dt) {
      const k = bar.update(dt), d = Math.min(dt,.055)*k;
      drag.update(d);
      if (d > 0) { returning(d); transfer(d); react(d); record(); }
      tools.forEach(tool=>tool.update?.());
      tubes.forEach((tube,i)=>tube.update(S.tubes[i]));
      plates.forEach((plate,j)=>{
        const o=tools[j];
        if (!o) {plate.show(false); return;}
        const reading = S.near && S.readIndex === j;
        plate.loc(o.body,o.side*.008 - (reading ? .016 : 0),reading ? -.007 : -.049,reading ? .012 : .039)
          .show(visible(j+3) && (!S.near || reading) && !mic.isOpen && !S.demo);
        plate.el.classList.toggle('passive',!!(S.near || S.hold || S.pour || S.returns[j+3]));
      });
      const readingTool = tools[S.readIndex || 0];
      exitReading.show(S.near && !S.demo);
      if (S.near) exitReading.loc(group,readingTool.home.x+readingTool.side*.008+.021,.017+readingTool.fillHeight(),.009);
      entry.text('钻进试管'+NAMES[focusTube()]+'里看 ⊙');
      syncCards(); guide(); mic.update(dt,k);
      if (W && lastLayout !== S.demo) {
        W.ui.el.classList.toggle('rate-demo',S.demo); lastLayout = S.demo;
      }
    }
    const act = demoActs(drag,table);
    const setMode = m => () => select(m);
    // Both the projected demonstration and QA use the same grip, tip and release handlers.
    const intoBath = (i,b) => [tpos(i),V(X[i],RIM+.018),V(BX[b],RIM+.018),V(BX[b],LOW)];
    const rock = i => { const x=rest(i).x, y=S.tubes[i].bath < 0 ? .064 : .027;
      return [tpos(i),V(x,y),V(x+.009,y),V(x-.009,y),V(x,y),rest(i)]; };
    const pathAct = (i,points,start,end) => {
      let path;
      return k => { if (!path || k < start) path = act.path(props[i].pick,points().map(onTable),{t0:start,t1:end-.03,release:end}); path(k); };
    };
    const carry = (mode,i,k,a,b) => act.drag(stations[mode].props[i].pick,()=>onTable(mouth(k)),{from:()=>onTable(rest(i)),t0:a,t1:b-.055,release:b});
    const shots = [
      {cap:'两管各有 2 mL 5% 过氧化氢。同步滴加氯化铁溶液，各两滴。',dur:4.4,during:act.seq(carry(0,8,0,.04,.29),carry(0,8,0,.54,.78))},
      {cap:'两支试管已经冒泡。提起试管，分别浸入冷水和热水。',dur:4.8,during:act.seq(pathAct(0,()=>intoBath(0,0),.03,.45),pathAct(1,()=>intoBath(1,1),.49,.94))},
      {cap:'比较两管在同一段时间内冒出的气泡。',dur:2.7},
      {cap:'乙管有 1 mL 硫代硫酸钠溶液。加入 1 mL 蒸馏水，摇匀。',dur:3.8,enter:setMode(1),during:act.seq(carry(1,5,1,.03,.36),pathAct(1,()=>rock(1),.58,.96))},
      {cap:'两管同时加入等量稀硫酸，振荡。',dur:3.8,during:act.seq(carry(1,3,0,.03,.31),pathAct(0,()=>rock(0),.50,.94))},
      {cap:'观察哪一管先出现乳白色浑浊。',dur:5.2,speed:2,during:act.at(.67,()=>{
        stations[2].frameMeshes.forEach(part=>{part.userData.noFrame=false;});
        reframe();
      })},
      {cap:'换两管等量原液，分别浸入冷水和热水。',dur:5.7,enter:setMode(2),during:act.seq(pathAct(0,()=>intoBath(0,0),.24,.56),pathAct(1,()=>intoBath(1,1),.61,.96))},
      {cap:'同时加酸并振荡，比较两管出现浑浊的时间。',dur:4,during:act.seq(carry(2,3,0,.02,.29),pathAct(0,()=>rock(0),.51,.94))},
      {cap:'观察热水和冷水中的试管。',dur:3.6,speed:2},
      {cap:'三管各有相同的过氧化氢溶液。一管加少量二氧化锰。',dur:2.8,enter:setMode(3),during:carry(3,7,0,.08,.70)},
      {cap:'另一管滴两滴氯化铁，余下一管留作空白对照。',dur:3.6,during:act.seq(carry(3,6,1,.04,.32),carry(3,6,1,.64,.93))},
      {cap:'观察加 MnO₂ 和加 FeCl₃ 的两支试管，分别与空白管比较。',dur:2.8},
    ];
    let studentPose;
    const sb = sandbox({get:()=>S,set:s=>{S=s;},fresh,apply:arrange,
      view:{save:()=>S.near ? {readIndex:S.readIndex} : mic.isOpen ? scene.snapshot() : null,restore:s=>{ if(s.readIndex != null) readCylinder(s.readIndex); else { scene.resume(s); mic.open(); } }}});
    const bar = lessonBar({look,back,group,ringOptions:RING,
      steps:TITLES.map((title,i)=>({id:ID(i),title,todo:[DIR.startFe,DIR.water,DIR.bath,DIR.catalyst][i],target:suggest})),
      reels:{demo:{label:'老师演示',seal:'演示',shots,onStart(){
        studentPose = props.map(o=>[o.body.position.clone(),o.body.rotation.z]);
        drag.clearDropzones(); const reading = S.near; sb.onStart(); if (reading) back(); mic.close(); reframe();
      },onEnd(){
        sb.onEnd(); if (!S.near && !mic.isOpen) reframe();
        props.forEach((o,i)=>{o.body.position.copy(studentPose[i][0]);o.body.rotation.z=studentPose[i][1];});
        lastDir='';}}}});
    const focusTube = () => S.mode === 3 && S.fe >= 0 ? S.fe : 0;
    const insideTube = () => tpos(focusTube()).add(V(0,.032));
    let entry;
    const entryTag = (...args) => { entry = tag(...args); return entry; };
    const mic = micro({tag:entryTag,look,back,group,scene,bar:()=>bar,label:'钻进试管甲里看',state:microState,at:insideTube,
      btnAt:()=>tpos(focusTube()).add(V(0,LEN-.033,.011)),lookD:[0,.56,1],dist:.32,scale:.0085,show:()=>!S.near && microReady() && !S.hold && !S.pour});
    const mw = mic.mw, mwEl = [...document.querySelectorAll('.mw')].pop(); mwEl.dataset.rate = '';
    const controls = h('div',{class:'rate-play'},pause=h('button',{onclick:()=>{scene.pause();pause.textContent=scene.paused?'继续':'暂停';}},'暂停'),
      h('button',{onclick:()=>{scene.replay();pause.textContent='暂停';}},'从头看'));
    mwEl.querySelector('.mw-hud').append(controls);
    const energy = h('div',{class:'rate-energy',html:ENERGY}); controls.before(energy);
    const open = mw.open.bind(mw);
    mw.open = (...args) => { open(...args); energy.hidden = S.mode !== 3; pause.textContent=scene.paused?'继续':'暂停'; };
    const wrapped = wrapPointer(drag,bar);
    // The catalyst groups stay in the rack. In the first activity the tubes become
    // handles after the simultaneous additions, when they can be transferred to a bath.
    const trayItems = () => drag.items().filter(item=>item.mode === S.mode &&
      (item.i >= 3 || (S.mode !== 3 && (S.mode !== 0 || S.drops === 2))));
    const pointer = {...wrapped,items:trayItems,up(ray,e){cancelled=e?.type==='pointercancel'; try{return wrapped.up(ray,e);}finally{cancelled=false;}}};
    const layout = h('style',{},`
      [data-rate-panel] .big-next:disabled,[data-rate-panel].rate-demo .p-body {display:none}
      .tag3d.rate-plate {animation:none}
      .tag3d.rate-plate.passive {pointer-events:none}
      .tag3d.rate-watch {display:grid;justify-items:center;gap:3px;padding:6px 10px;border:2px solid #344a50;border-radius:12px;background:#435a60;color:white;text-shadow:none;box-shadow:0 3px 5px #26383a55;font:600 11px/1.2 sans-serif}
      .tag3d.rate-watch.stowed {width:18px;height:18px;padding:0;border-radius:50%;background:#e4edcf;pointer-events:none}
      .rate-watch.stowed > * {display:none}
      .rate-watch.stowed::after {content:'';width:4px;height:6px;border-left:1.5px solid #344a50;border-bottom:1.5px solid #344a50;align-self:start;margin-top:3px}
      .rate-watch output {display:block;width:100%;border-radius:3px;background:#e4edcf;color:#22352f;text-align:center;font:600 20px/1.15 monospace}
      .rate-watch button {pointer-events:auto;margin:1px 2px;border:0;border-radius:4px;padding:4px 7px;background:#fff2bb;color:#293c42;cursor:pointer}
      .rate-watch button:disabled {background:#d6dfda;color:#475652;pointer-events:none}
      .rate-watch[style*="opacity: 0"] button {pointer-events:none}
      [data-rate-panel] .rate-modes .seg {display:grid;grid-template-columns:1fr 1fr}
      [data-rate-panel] .rate-temps {font-size:13px;display:flex;gap:12px;margin:8px 0}
      [data-rate-panel] .rate-temps[hidden],.rate-energy[hidden] {display:none}
      .mw[data-rate] .rate-play {display:flex;justify-content:center;gap:8px;margin-top:6px;pointer-events:auto}
      .rate-play button {border:1px solid #bbb4a5;border-radius:14px;background:#fffaf0;color:#424946;padding:3px 12px;cursor:pointer}
      .mw[data-rate] .mw-eq {font-family:Georgia,'Times New Roman',serif;letter-spacing:0}
      .rate-energy svg {background:#fffdf4;border-radius:7px;max-width:85%}
      [data-rate-panel] .answer .src {min-height:48px;padding-right:55px}
      @media(max-width:760px){.mw[data-rate] .mw-hud,.mw[data-rate] .mw-scale{left:4vw!important;width:92vw!important}.mw[data-rate] .mw-hud{top:13vh!important}.mw[data-rate] .mw-close{left:auto!important;right:8px;top:40px!important}}
    `); document.head.append(layout);
    function reset() {
      if (bar.playing) bar.stop();
      leaveReading(); drag.clearDropzones(); mic.close(); S=fresh(); S.rounds[0]=1; arrange(); reframe(); W.mode.set(0);
      TITLES.forEach((_,i)=>W.mode.tick(i,false)); W.tbl.clear(); W.review.hidden=true; W.temps.hidden=true;
      W.ui.el.querySelectorAll('details[open]').forEach(el=>{el.open=false;});
      W.cold.value = S.temp[0]; W.hot.value = S.temp[1];
      W.ui.observePrediction(null); W.ui.relock(); bar.undo(...TITLES.map((_,i)=>ID(i))); say(INTRO[0]); guide(true);
    }
    const byHand = (i,points) => () => {
      const d = drag.items().find(item=>item.obj===props[i].pick); d.onStart(); for(const p of points()) d.onDrag(onTable(p)); d.onEnd(true);
    };
    const bathStep = (i,b,wait=1)=>({name:NAMES[i]+'管浸入'+bathName(b),run:byHand(i,()=>intoBath(i,b)),wait});
    const shakeStep = (i,wait=1)=>({name:'振荡'+NAMES[i]+'管',run:byHand(i,()=>rock(i)),wait});
    const dose = (mode,i,k,name,wait=1.5)=>({name,drag:stations[mode].props[i].pick,to:()=>onTable(mouth(k)),wait});
    const takeReading = (i,wait=1) => ({name:'记下'+NAMES[i]+'管的秒表读数',run:()=>{
      watches[S.mode-1].keys[i].click();
      if (S.tubes[i].reading === null) throw Error('秒表尚未记时');
    },wait});
    const change = m => ({name:TITLES[m],run:()=>W.mode.set(m,true)});
    const inspect = label => [{name:label+'微观',run:()=>{if(!S.recorded) throw Error('本组还没有观察记录'); mic.open();},wait:2,scale:1},
      {name:'回到桌上',run:()=>mic.close(),wait:2}];
    const qa = qaFlow(drag,[
      dose(0,8,0,'同步滴入第一滴'),dose(0,6,1,'同步滴入第二滴'),
      bathStep(0,0),bathStep(1,1,4),...inspect('水浴'),
      change(1),dose(1,5,1,'乙管加水'),shakeStep(1),dose(1,3,0,'同时加酸'),shakeStep(0,7),takeReading(0,7),takeReading(1),...inspect('浓度'),
      change(2),bathStep(0,0),bathStep(1,1),dose(2,3,0,'水浴中同时加酸'),shakeStep(0,4),takeReading(1,9),takeReading(0),...inspect('温度'),
      change(3),dose(3,7,0,'甲管加 MnO₂'),dose(3,6,1,'乙管滴第一滴'),dose(3,6,1,'乙管滴第二滴',4),...inspect('催化剂'),
      {name:'核对记录和结论',run:()=>{if (!bar.finished||W.tbl.rows.length!==9||S.fe===S.mn) throw Error('观察链不完整');}},
    ]);
    S.rounds[0]=1; arrange();
    return {group:root,pointer,card:false,toggles:['cards','steps'],size:{w:.65,h:.195,d:.40},
      view:{elev:33,azim:0,lookY:.44,frameMargin:1.28},
      mount(ui) {
        const mode = seg('',TITLES,(_,m)=>select(m)); mode.el.classList.add('rate-modes');
        const bathSelect = (i,values) => h('select',{onchange:e=>{if (!S.acid && !S.demo) S.temp[i]=Number(e.target.value);}},values.map(v=>h('option',{value:v},v+' ℃')));
        const cold = bathSelect(0,[15,5]),hot = bathSelect(1,[45,35]);
        const temps = h('div',{class:'rate-temps',hidden:true},h('label',{},'冷水 ',cold),h('label',{},'热水 ',hot),'（示意）');
        const review = h('details',{class:'more',hidden:true},h('summary',{},'想一想（选做）'),h('p',{},'为什么要给只有 1 mL 原液的试管补加 1 mL 水？如果漏加，两管混合后还有哪个条件不同？'));
        review.addEventListener('toggle',()=>{if(review.open) review.scrollIntoView({block:'nearest'});});
        const model = h('details',{class:'more'},h('summary',{},'模型、近似和出处'),h('p',{class:'fineprint'},NOTE));
        W={...mountXuean(ui,{controls:[mode,temps,moreBox([],reset),model],headers:['实验 · 轮次','试管与条件','观察结果'],intro:INTRO[0]}),ui,mode,review,temps,cold,hot};
        W.next.remove(); const next = ui.el.querySelector('.p-step:nth-child(2) > button.go') || ui.data.nextElementSibling;
        if (next?.tagName === 'BUTTON') { next.classList.add('big-next'); ui.controls.append(next); }
        ui.data.append(review); ui.el.dataset.ratePanel=''; ui.observePrediction(null); bar.attach(ui); guide(true);
      },
      reset, update(dt) {update(dt); if(W) W.hot.disabled=W.cold.disabled=S.acid||S.demo;},
      dispose(){layout.remove();mic.dispose();bar.dispose();drag.dispose();},debug:{get S(){return S;},bar,qa,mic,picks:{tube:tubes[0].pick},get props(){return props;},intoBath,rock,mouth},
    };
  },
};
