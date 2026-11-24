import * as THREE from 'three';
import { pairedCartRig, START_X, TOP, LANES, TRAVEL } from './kit/pairedCartRig.js';
import { WEDGE } from './kit/ticker/apparatus.js';
import { tractionRun } from './kit/ticker/traction.js';
import { advance } from './kit/ticker/motion.js';
import { liftBrake, movePair, pairedRun, pressBrake } from './kit/ticker/pairedCarts.js';
import { draggable, clamp } from './kit/interact.js';
import { block } from './kit/electronicsBench.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow } from './kit/chemlesson.js';
import { buttons, h, note, table } from './kit/ui.js';

const names = ['前车', '后车'];
const steps = [['balance', '平衡阻力'], ['hook', '挂好两盘'], ['same', '比较空车'], ['mass', '改变车质量']];
const point = (x, y, z) => new THREE.Vector3(x, y, z);
const cm = meters => (100 * meters).toFixed(1);

export default {
  id: 'pairedcarts', fig: '图4.2-3', title: '通过位移之比测量加速度之比', stampText: '比较',
  predict: {
    q: '两车从静止同时出发，都做匀加速直线运动，又同时停下。不用秒表，只量位移，能比较加速度吗？',
    options: ['能，用位移之比比较', '只能看出哪辆更快', '不能，一定要测时间'], answer: 0,
    hint: '留意黑板擦抬起和压下时，两辆车各在做什么。',
  },
  conclusion: {
    page: 93, rect: [63.8, 430.33, 378.79, 528.61],
    quote: '如果能做到让两个做初速度为0的匀加速直线运动的物体的运动时间t相等，那么由（1）式可知，它们的位移之比就等于加速度之比……',
    why: '黑板擦让两车运动的时间相同。两车都从静止做匀加速直线运动，x = at²/2，相除时 t²/2 约去。',
    src: '课本第 89 页 · 第四章 第2节 实验：探究加速度与力、质量的关系',
  },
  create(ctx) {
    const rig = pairedCartRig(), { group, board, brake, cars, weights, wedge } = rig;
    const local = obj => group.worldToLocal(obj.getWorldPosition(new THREE.Vector3()));
    const boardAt = (x, y, z) => group.worldToLocal(board.localToWorld(point(x, y, z)));
    const body = cars.map(cart => cart.car.children[0]), pans = cars.map(cart => cart.pan.children[0]);
    const eraser = brake.children[1], scales = cars.map(cart => cart.scale);
    const wedgeGrip = new THREE.Mesh(new THREE.BoxGeometry(0.112, 0.037, 0.17), new THREE.MeshBasicMaterial({ visible: false }));
    wedgeGrip.position.set(0.062, 0.0185, 0); wedgeGrip.userData.pick = true; wedge.add(wedgeGrip);
    const homes = weights.map(weight => weight.position.clone());
    const marks = LANES.map(z => Array.from({ length: 4 }, () => block(board, 0.0017, 0.0008, 0.012, 0, 0.001, z + 0.059, 0xa34831)));
    const label = ctx.tag('', 'pill'), tip = ctx.tag('', 'pill');
    const returns = new Map();
    let ui, aim, lift, trial, pair, near, held, fallSpeed, verified, hooked, loaded, owners, positions, measured, result;
    const bar = lessonBar({ ...ctx, group, back: leave, steps: steps.map(([id, title]) => ({ id, title, todo: title, target: () => aim })) });
    const rows = table(['车 前/后（kg）', '盘 前/后（g）', '前车（cm）', '后车（cm）']);
    const gaps = h('p', { style: 'font-size:16px;font-variant-numeric:tabular-nums' });
    const work = h('div', {}), field = h('input', { type: 'number', step: '0.1', inputmode: 'decimal', style: 'width:6em' });
    const caption = h('label', {}), submit = h('button', { type: 'submit', class: 'go' }, '记下读数');
    caption.append(field);
    const form = h('form', { novalidate: true, onsubmit: event => { event.preventDefault(); read(); } }, caption, submit);
    const nextCar = () => measured[0] == null ? 0 : 1;
    const sync = index => rig.setCart(index, positions[index], hooked[index], verified.every(Boolean) && !positions.some(Boolean));
    const mass = index => 0.50 + owners.filter(owner => owner === index).length * 0.25;
    const mixed = () => mass(0) !== mass(1);
    const invalid = () => pair?.state === 'missed' || (pair?.state === 'stopped' && pair.carts.some(cart => cart.x < 0.007));
    const reading = () => pair?.state === 'stopped' && !invalid() && !result && !bar.finished;
    function say(message, target) { aim = target; bar.say(message); }
    function guide(prefix = '') {
      const tell = (message, target) => say(prefix + message, target);
      const away = positions.findIndex(value => value > 0.00001);
      if (bar.finished) return tell('加重的' + names[mass(0) > mass(1) ? 0 : 1] + '走得较近。两车都从静止开始做匀加速直线运动，且运动时间相同，所以位移之比等于加速度之比。');
      if (trial) return tell('比较车旁三段等时位移：点距相等才是匀速。');
      if (!pair && away >= 0) return tell('向右拖' + names[away] + '回零线。', body[away]);
      if (!bar.has('balance')) {
        const index = verified[0] ? 1 : 0;
        return tell('向左轻推' + names[index] + '再松手；不挂小盘时，等时点距应相等。', body[index]);
      }
      if (!bar.has('hook')) {
        const index = hooked[0] ? 1 : 0;
        return tell('托起' + names[index] + '的小盘挂到绳端，两盘总质量要相同。', pans[index]);
      }
      if (pair?.state === 'moving') return tell('两车同时起步了。赶在碰到挡块前压下黑板擦，同时压住两条尾线。', eraser);
      if (pair?.state === 'atEnd') return tell('车碰到挡块了，不是黑板擦把它压停的。松开黑板擦。', eraser);
      if (reading()) return near ? tell('从零线往左数到' + names[nextCar()] + '的红指针，每小格是 0.1 cm。') : tell('黑板擦同时压停了两车。点尺面，分别读两车的位移。', scales[nextCar()]);
      if (pair && away >= 0) return tell((invalid() ? pair.state === 'missed' ? '有车先碰到挡块，这次不能比。' : '位移太短，读不准。' : '') + '向右拖' + names[away] + '回零线。', body[away]);
      if (bar.has('same') && !mixed()) return tell('两盘不变，把一枚 250 g 砝码放到一辆车上再比较。', weights[0]);
      if (rows.rows.length && loaded[0] !== loaded[1]) return tell('不同盘重的读数已记下。把两盘调成一样重，再比较两辆空车。', cars[loaded.indexOf(false)].disc);
      return tell('提起黑板擦让两车同时出发，走一段再往下压。', eraser);
    }
    function leave() { if (near) ctx.back(); near = false; bar.near(false); form.hidden = true; guide(); }
    function scaleView() {
      if (!reading() || near) return;
      near = true; bar.near(true);
      ctx.look(boardAt(START_X - TRAVEL / 2 + 0.017, 0, 0.021).toArray(), [0, 1, 0.12], 0.53, leave);
      form.hidden = false; updateField(); guide();
    }
    function updateField() {
      caption.replaceChildren(document.createTextNode(names[nextCar()] + '位移（cm） '), field); field.value = '';
    }
    function read() {
      if (!near || !reading()) return;
      const index = nextCar(), value = Number(field.value), expected = Number(cm(positions[index]));
      if (!field.value.trim() || value !== expected) {
        return say('还没对上' + names[index] + '的红指针。长线间是 1 cm，中间有十小格。');
      }
      measured[index] = value;
      if (index === 0) { updateField(); return guide('前车读数已记下。'); }
      const ratio = (measured[0] / measured[1]).toFixed(2);
      rows.add([[mass(0), mass(1)].map(number => number.toFixed(2)).join(' / '), loaded.map(on => on ? 20 : 10).join(' / '), ...measured.map(number => number.toFixed(1))]);
      work.append(h('p', { style: 'font-size:15px;color:#354d52;margin:8px 0' }, 'a前 / a后 = x前 / x后 ≈ ' + measured.map(number => number.toFixed(1)).join(' / ') + ' ≈ ' + ratio));
      result = true;
      const equalPans = loaded[0] === loaded[1];
      if (equalPans) bar.done(bar.has('same') ? 'mass' : 'same');
      leave(); guide(bar.finished ? '' : equalPans ? '空车走得一样远，加速度相同。' : '车相同，挂较重小盘的车走得较远。');
    }
    const seat = index => index ? 0.019 : -0.019;
    const attachWeight = (weight, index) => {
      const owner = owners[index];
      if (owner == null) { group.add(weight); weight.position.copy(homes[index]); }
      else { cars[owner].car.add(weight); weight.position.set(seat(index), 0.0525, 0); }
      weight.quaternion.identity();
    };
    const displayLift = () => label.loc(wedge, 0.09, 0.054, 0).text('垫高 ' + Math.round(lift) + ' mm').show(!bar.has('balance'));
    function reset() {
      if (near) ctx.back();
      near = held = result = false; fallSpeed = lift = 0; trial = pair = null;
      verified = [false, false]; hooked = [false, false]; loaded = [true, true]; owners = [null, null]; positions = [0, 0]; measured = [null, null];
      returns.clear(); rows.clear(); work.replaceChildren(); gaps.hidden = form.hidden = true; field.value = ''; brake.position.y = 0;
      rig.setLift(lift); cars.forEach((_, index) => sync(index)); weights.forEach(attachWeight);
      cars.forEach(({ pan, disc }) => { pan.add(disc); disc.position.set(0, -0.0255, 0); });
      marks.flat().forEach(mark => { mark.visible = false; }); bar.near(false); bar.undo(...steps.map(step => step[0]));
      tip.loc(group, 0, -9, 0); displayLift(); ui?.relock(); guide();
    }
    const settle = (key, draw, end) => returns.set(key, { time: 0, draw, end });
    const free = () => !returns.size && !trial && !near && !bar.finished;
    const wedgeDrag = { obj: wedgeGrip, anchor: wedge, plane: 'xy', offset: 0.085, keepOffset: true,
      enabled: () => free() && !bar.has('balance') && positions.every(value => !value), hint: '左右拖：调垫块高低',
      onDrag(pos) {
        gaps.hidden = true;
        lift = clamp((0.388 - pos.x) * 1000 * WEDGE.rise / WEDGE.len, 0, 30);
        verified.fill(false); rig.setLift(lift); cars.forEach((_, index) => sync(index));
        marks.flat().forEach(mark => { mark.visible = false; }); displayLift();
      }, onEnd() { lift = Math.round(lift); rig.setLift(lift); cars.forEach((_, index) => sync(index)); displayLift(); guide(); },
    };
    const carDrags = cars.map((cart, index) => {
      let before, origin, samples;
      return { obj: body[index], plane: 'xz', get offset() { return local(body[index]).y; }, keepOffset: true,
        enabled: () => free() && (pair ? (result || invalid()) && positions[index] > 0 : !hooked.some(Boolean) && (positions[index] > 0 || !bar.has('balance') && !verified[index] && !positions.some(Boolean))),
        hint: () => positions[index] ? '向右拖：小车归零' : '向左推：松手试滑',
        onStart(_, time = performance.now()) {
          before = positions[index]; origin = local(body[index]).x;
          samples = [{ time, x: before }];
        },
        onDrag(pos, _, time = performance.now()) {
          const x = clamp(before + (origin - pos.x) / Math.cos(board.rotation.z), 0, before || TRAVEL);
          if (!before) {
            if (x !== positions[index]) {
              gaps.hidden = true;
              marks[index].forEach(mark => { mark.visible = false; });
            }
            samples.push({ time, x });
            while (samples.length > 2 && samples[1].time <= time - 100) samples.shift();
          }
          positions[index] = x; sync(index);
        },
        onEnd(moved, time = performance.now()) {
          if (!moved) return;
          const from = positions[index];
          if (before) {
            const dest = from < 0.006 ? 0 : before;
            return settle(body[index], t => { positions[index] = from + (dest - from) * t; sync(index); }, () => {
              if (positions.every(value => !value)) { pair = null; result = false; measured.fill(null); cars.forEach((_, lane) => sync(lane)); }
              if (!pair && !verified[index] && before && dest === 0 && marks[index][3].visible) return say(lift < 15 ? '点距变短，车在减速。向左推垫块，垫高右端。' : '点距变长，车在加速。向右拉垫块，降低右端。', wedge);
              guide();
            });
          }
          const first = samples[0], last = samples.at(-1);
          const pushSpeed = time - last.time > 160 ? 0 : (last.x - first.x) * 1000 / Math.max(1, last.time - first.time);
          if (!from) return guide();
          if (pushSpeed <= 0) return say('向右拖回零线，再向左轻推，在车还在动时松手。', body[index]);
          const run = tractionRun({ mode: 'balance', lift, cartIndex: 0, hangerIndex: 0, startOffset: from, pushSpeed });
          const discriminant = run.v0 ** 2 + 2 * run.a * (TRAVEL - from);
          if (discriminant >= 0) run.end = 2 * (TRAVEL - from) / (run.v0 + Math.sqrt(discriminant));
          trial = { run, index, from }; guide();
        },
      };
    });
    const panDrags = cars.map((cart, index) => ({ obj: pans[index], anchor: cart.pan, keepOffset: true, plane: 'xy', offset: LANES[index],
      enabled: () => free() && bar.has('balance') && !positions.some(Boolean) && !hooked[index], hint: '向上拖：挂小盘',
      onDrag(pos) { cart.pan.position.copy(pos); },
      onEnd(moved) {
        if (!moved) return;
        const from = cart.pan.position.clone(), target = rig.panHook(index);
        hooked[index] = from.distanceTo(target) < 0.026;
        const dest = hooked[index] ? target : rig.panHome(index);
        settle(cart.pan, t => cart.pan.position.lerpVectors(from, dest, t), () => {
          sync(index); if (hooked[index]) { marks[index].forEach(mark => { mark.visible = false; }); gaps.hidden = true; }
          if (hooked.every(Boolean)) bar.done('hook');
          guide(hooked[index] ? '小盘挂牢了。' : '没挂上绳端。');
        });
      },
    }));
    const weightDrags = weights.map((weight, index) => {
      let origin, planeZ, target;
      return { obj: weight, plane: 'xy', get offset() { return origin ? planeZ : local(weight).z; }, keepOffset: true,
        enabled: () => free() && bar.has('same') && !pair, hint: '拖砝码：改变车质量',
        onStart() { origin = local(weight); planeZ = origin.z; group.attach(weight); target = -1; },
        onDrag(pos) {
          const home = homes[index], top = boardAt(START_X, 0.0525, 0).y;
          const eye = group.worldToLocal(ctx.camera.getWorldPosition(new THREE.Vector3())), ray = pos.clone().sub(eye);
          const slope = (home.z - 0.135) / (top - home.y);
          let along = (home.z + slope * home.y - eye.z - slope * eye.y) / (ray.z + slope * ray.y);
          const height = eye.y + along * ray.y;
          if (height > top || height < home.y) along = (clamp(height, home.y, top) - eye.y) / ray.y;
          weight.position.copy(eye).addScaledVector(ray, along);
          target = LANES.findIndex(z => weight.position.distanceTo(boardAt(START_X, 0.0525, z)) < 0.042);
        },
        onEnd(moved) {
          const from = weight.position.clone(); origin = null;
          if (moved && target >= 0) owners[index] = target;
          else if (moved && from.distanceTo(homes[index]) < 0.04) owners[index] = null;
          const owner = owners[index];
          const dest = owner == null ? homes[index] : boardAt(START_X + seat(index), 0.0525, LANES[owner]);
          settle(weight, t => weight.position.lerpVectors(from, dest, t), () => { weights.forEach(attachWeight); guide(target >= 0 && mixed() ? '两盘没变，车的质量不同了。' : ''); });
        },
      };
    });
    const brakeDrag = { obj: eraser, anchor: brake, keepOffset: true, plane: 'xy', offset: 0,
      enabled: () => free() && bar.has('hook') && (!bar.has('same') || mixed()) && (!pair || ['moving', 'atEnd'].includes(pair.state)), hint: '上下拖：放车或压停',
      onStart() { held = true; fallSpeed = 0; },
      onDrag(pos) {
        brake.position.y = clamp(pos.y - boardAt(brake.position.x, 0, 0).y, 0, 0.065);
        if (!pair && brake.position.y > 0.003) {
          pair = pairedRun(owners.map((_, index) => ({ lift, cartIndex: owners.filter(owner => owner === index).length, hangerIndex: loaded[index] ? 1 : 0 })), TRAVEL);
          liftBrake(pair); guide();
        } else if (pair && brake.position.y <= 0.001) { brake.position.y = 0; pressBrake(pair); guide(); }
      }, onEnd() { held = false; if (pair?.state === 'stopped' && !positions.some(Boolean)) { pair = null; guide(); } },
    };
    const discHome = index => rig.panHome(index).add(point(-0.012, -0.0295, 0));
    const discDrags = cars.map(({ pan, disc }, index) => ({ obj: disc, keepOffset: true, plane: 'xy', offset: LANES[index],
      enabled: () => free() && bar.has('hook') && !bar.has('same') && !pair,
      hint: () => loaded[index] ? '拖下重物：减轻小盘' : '拖回盘中：加重小盘',
      onStart() { group.attach(disc); }, onDrag(pos) { disc.position.copy(pos); disc.position.y = Math.max(0.0035, pos.y); },
      onEnd(moved) {
        const from = disc.position.clone(), socket = local(pan).add(point(0, -0.0255, 0));
        if (moved && from.distanceTo(socket) < 0.02) loaded[index] = true;
        else if (moved && from.distanceTo(discHome(index)) < 0.045) loaded[index] = false;
        const dest = loaded[index] ? socket : discHome(index);
        settle(disc, t => disc.position.lerpVectors(from, dest, t), () => {
          if (loaded[index]) { pan.add(disc); disc.position.set(0, -0.0255, 0); }
          guide(loaded[0] === loaded[1] ? '两盘一样重。' : '两盘不同重，这一轮只能比较改变牵引的效果。');
        });
      },
    }));
    const pointer = draggable(group, [wedgeDrag, ...carDrags, ...panDrags, ...discDrags, ...weightDrags, brakeDrag], { tip,
      taps: scales.map(scale => ({ obj: scale, enabled: () => reading() && !near, hint: '点尺面：凑近读数', onTap: scaleView })),
    });
    const canvas = document.getElementById('c'), clearTip = () => tip.loc(group, 0, -9, 0);
    canvas.addEventListener('pointerleave', clearTip);
    function update(dt) {
      tip.show(ui?.step === 1);
      const speed = bar.update(dt);
      for (const [key, ret] of returns) { ret.time = Math.min(1, ret.time + dt / 0.36); ret.draw(1 - (1 - ret.time) ** 2); if (ret.time === 1) { returns.delete(key); ret.end(); } }
      if (trial) {
        const { run, index, from } = trial; advance(run, dt * speed); positions[index] = from + run.x; sync(index);
        const track = marks[index];
        track.forEach((mark, number) => {
          const time = number * 0.12;
          if (mark.visible || time > run.t) return;
          mark.position.x = START_X - from - run.v0 * time - run.a * time ** 2 / 2;
          mark.visible = true;
          if (number === 3) {
            const distances = track.slice(1).map((end, i) => ((track[i].position.x - end.position.x) * 1000).toFixed(1));
            gaps.textContent = names[index] + '三段等时位移约为 ' + distances.join('、') + ' mm。';
            gaps.hidden = false;
          }
        });
        if (run.t >= run.end) {
          trial = null; verified[index] = track[3].visible && Math.abs(run.a) < 0.013;
          if (verified.every(Boolean)) { bar.done('balance'); displayLift(); }
          if (!track[3].visible) guide(positions[index] >= TRAVEL - 1e-8 ? '到挡块前没留下四个记号。' : '车在第四个记号前停住了。');
          else guide(verified[index] ? '点距均匀，阻力已平衡。' : run.a < 0 ? '点距变短，车在减速。' : '点距变长，车在加速。');
        }
      }
      dt *= 0.5;
      if (!held && brake.position.y > 0) {
        const fall = (Math.sqrt(fallSpeed ** 2 + 19.6 * brake.position.y) - fallSpeed) / 9.8;
        const falling = Math.min(dt * speed, fall); brake.position.y = Math.max(0, brake.position.y - fallSpeed * falling - 4.9 * falling ** 2); fallSpeed += 9.8 * falling;
        if (fall <= dt * speed) brake.position.y = 0;
        dt = falling / speed;
      }
      if (pair && ['moving', 'atEnd'].includes(pair.state)) {
        const previous = pair.state; movePair(pair, dt * speed);
        pair.carts.forEach((cart, index) => { positions[index] = cart.x; sync(index); });
        if (!held && !brake.position.y) pressBrake(pair);
        if (previous !== pair.state) guide();
      }
    }
    reset();
    const dragTo = (name, obj, to, extra) => ({ name, drag: obj, to, ...extra });
    const push = index => {
      const action = qaFlow(pointer, [dragTo('试滑' + names[index], body[index], () => boardAt(START_X - 0.022, 0.028, LANES[index]), { wait: 4 })])[0];
      action.run = () => {
        const drag = carDrags[index];
        drag.onStart(null, 0);
        drag.onDrag(action.mouse.to(), null, 150);
        drag.onEnd(true, 150);
      };
      return action;
    };
    const zero = index => dragTo(names[index] + '归零', body[index], () => boardAt(START_X, 0.028, LANES[index]));
    const hang = index => dragTo('挂' + names[index] + '小盘', pans[index], () => rig.panHook(index), { scale: 1 });
    const release = () => {
      const action = qaFlow(pointer, [dragTo('提擦放车再松手', eraser, () => boardAt(brake.position.x, 0.061, 0), { scale: 1 })])[0];
      action.run = () => { brakeDrag.onStart(); brakeDrag.onDrag(action.mouse.to()); for (let tick = 0; tick < 50; tick++) update(0.016); brakeDrag.onEnd(); };
      return action;
    };
    const entry = (wrong = false) => ({ name: wrong ? '试错读数' : '记录一车位移', run() {
      if (!near) throw Error('没有进入读尺视图');
      field.value = wrong ? '99' : cm(positions[nextCar()]); submit.click();
      if (wrong && measured[0] != null) throw Error('误收错误读数');
    } });
    return {
      group: new THREE.Group().add(group), card: false, size: { w: 0.91, d: 0.39, h: 0.29 }, view: { elev: 38, azim: -12, frameMargin: 1.02 }, toggles: ['steps'], reset,
      pointer: { ...pointer, items: () => pointer.items().filter(item => item.enabled()), down(ray, event) { const hit = pointer.down(ray, event); if (hit && ui?.step === 0) ui.go(1); return hit; }, move(ray, event) { return ui?.step === 1 && pointer.move(ray, event); } },
      mount(panel) {
        ui = panel; bar.attach({ ...panel, need: () => {} }); panel.controls.append(form, gaps);
        panel.data.append(note('本模型中，空车各 0.50 kg，小盘和盘中重物各 10 g。试滑每隔 0.12 s 留一条红线；两车放行用半速慢放。'), rows.el, work, buttons([{ text: '全部重来', ghost: true, onClick: reset }]).el);
        const source = ui.el.querySelector('.answer .src'); source.style.paddingRight = '84px'; source.style.minHeight = '52px';
        guide();
      }, update, dispose() { canvas.removeEventListener('pointerleave', clearTip); bar.dispose(); pointer.dispose(); },
      debug: { bar, qa: [push(0), zero(0), dragTo('推楔块垫高右端', wedgeGrip, () => point(0.348, TOP - 0.017, 0)),
        push(0), zero(0), push(1), zero(1), hang(0), hang(1),
        dragTo('取下前盘重物', cars[0].disc, () => discHome(0)),
        { name: '核对盘重不同', run() { if (loaded[0] || !loaded[1]) throw Error('取下重物没有改变盘重'); } },
        dragTo('恢复相同盘重', cars[0].disc, () => local(cars[0].pan).add(point(0, -0.0255, 0)), { scale: 1 }),
        release(), { name: '看两把尺', tap: scales[0] }, entry(true), entry(), entry(),
        zero(0), zero(1), dragTo('给前车加砝码', weights[0], () => boardAt(START_X, 0.0525, LANES[0]), { scale: 1 }), release(), { name: '再看尺', tap: scales[0] }, entry(), entry(),
        { name: '核对记录并翻开原文', run() { if (!bar.finished || rows.rows.length !== 2 || !mixed()) throw Error('缺少两轮有效测量'); ui.go(2); ui.el.querySelector('.flap-front').click(); } },
      ].map(action => action.mouse ? action : qaFlow(pointer, [action])[0]) },
    };
  },
};
