// 同一支注射器标定单滴体积并滴到水面；油膜面积只从学生自己留下的轮廓取得。
import * as THREE from 'three';
import {
  oilFilmRig,
  STOCK_X,
  CUP_X,
  PAN_X,
  PAN_W,
  WATER_Y,
  PLATE_Y,
  BAG_HOME,
  CAPACITY,
  STROKE,
  SYRINGE_ZERO,
} from './kit/oilFilmRig.js';
import {
  OIL_FRACTION,
  GRID,
  DROP_ML,
  pureOilPerDrop,
  filmOutline,
  polygonArea,
  countFilmSquares,
  molecularSizeNm,
} from './kit/oilFilm.js';
import { clamp, draggable } from './kit/interact.js';
import { lessonBar } from './kit/lessonbar.js';
import { qaFlow } from './kit/chemlesson.js';
import { h, note } from './kit/ui.js';

export default {
  id: 'oilfilm',
  fig: '图1.2-2',
  title: '用油膜法估测油酸分子的大小',
  stampText: '估测',
  predict: {
    q: '一个油酸分子小到看不见。一滴稀释液摊成单层油膜，哪段长度可以用来估测分子直径？',
    options: ['油膜的厚度', '油膜最宽处的长度', '滴下前液滴的直径'],
    answer: 0,
  },
  conclusion: {
    crops: [
      { page: 11, rect: [63.78, 408.37, 384.83, 492.49] },
      { page: 11, rect: [63.76, 658.45, 381.1, 702.49] },
    ],
    quote: '尽管油酸分子有着复杂的结构和形状，分子间也存在着间隙，但在估测其大小时，可以把它简化为球形处理，并认为它们紧密排布（图1.2-1）。测出油膜的厚度d，它就相当于分子的直径。……这里可以粗略地认为，油膜的厚度d 等于1 滴油酸酒精溶液中纯油酸的体积V与它在水面上摊开的面积S之比。',
    why: '油酸亲水的一端朝向水，另一端朝外。把充分铺展的油酸近似为紧密排列的一层分子，所得厚度是分子尺度的估计。滴数、读数和轮廓的半格取舍都会影响结果。',
    src: '课本第 7 页 · 第一章 第2节 实验：用油膜法估测油酸分子的大小',
  },
  create(ctx) {
    const rig = oilFilmRig();
    const { group, syringe, thumb, scale, bag, plate } = rig;
    const point = (x, y, z) => new THREE.Vector3(x, y, z);
    const local = (obj) => group.worldToLocal(obj.getWorldPosition(new THREE.Vector3()));
    group.position.x = -0.076;
    const steps = [
      ['drop', '测一滴的体积'], ['powder', '撒爽身粉'], ['spread', '滴一滴溶液'],
      ['trace', '描油膜轮廓'], ['area', '数方格'], ['size', '估算直径'],
    ];
    let ui, aim, view, fieldKind, ret, moving;
    let slideY;
    let ml, startMl, count, pure, area, residue, liquid, grabMl;
    let film, origin, spread, spoiled, covered, trace, traced, erasing, shakeAt;
    const marks = new Set(), drops = [];
    let rippleTime = 0;
    const stock = () => Math.abs(syringe.position.x - STOCK_X) < 0.013 && Math.abs(syringe.position.z) < 0.013;
    const cup = () => Math.abs(syringe.position.x - CUP_X) < 0.014 && Math.abs(syringe.position.z) < 0.014;
    const overWater = () => Math.max(Math.abs(syringe.position.x - PAN_X), Math.abs(syringe.position.z)) < PAN_W / 2 - 0.004;
    const inFlight = () => drops.length > 0;
    const full = () => ml >= CAPACITY - 0.00001;
    const bar = lessonBar({ ...ctx, group, back: leave, steps: steps.map(([id, title]) => ({ id, title, todo: title, target: () => aim })) });
    const say = (text, obj = null) => { aim = obj; bar.say(text); };
    const label = h('label', { for: 'oil-measure' });
    const input = h('input', { id: 'oil-measure', type: 'number', step: 'any', inputmode: 'decimal',
      style: 'font:inherit;width:5.2em;padding:4px 7px;border:1px solid #a99c82;border-radius:3px;background:#fffcf4' });
    const submit = h('button', { type: 'submit', class: 'go', style: 'width:auto;margin:0;padding:5px 12px' }, '记录');
    const form = h('form', { hidden: true, onsubmit(e) { e.preventDefault(); record(); } },
      label, h('div', { style: 'display:flex;gap:8px;margin:6px 0 14px' }, input, submit));
    const captions = { volume: '溶液体积 / mL', drops: '落入烧杯的滴数', pure: '每滴含纯油酸 / μL', area: '轮廓内的方格数', size: '分子直径 / nm' };
    const work = h('div');
    const resetTray = h('button', { class: 'go ghost', hidden: true, onclick: newTray }, '换一盘清水');
    const retry = h('button', { class: 'go ghost', hidden: true, onclick: restartDrops }, '重新数滴');
    function field(kind) {
      if (kind !== fieldKind) input.value = '';
      fieldKind = kind;
      form.hidden = !kind;
      label.textContent = captions[kind] || '';
    }
    function leave() {
      ctx.back();
      view = null;
      bar.near(false);
      guide();
    }
    function near(which) {
      view = which;
      const wide = ctx.camera.aspect >= 1;
      if (which === 'drip') {
        ctx.look([group.position.x + PAN_X, 0.079, 0], [0.12, 0.65, 1], wide ? 0.64 : 0.47, leave);
      } else if (which === 'syringe') {
        const { x, y, z } = syringe.position;
        const distance = wide ? 0.43 : startMl === null ? 0.19 : 0.41;
        ctx.look([group.position.x + x + 0.008, y + (wide ? 0.054 : 0.045), z], [0, 0.03, 1], distance, leave);
      } else ctx.look([group.position.x + PAN_X, PLATE_Y, 0], [0, 1, 0.001], wide ? 0.60 : 0.62, leave);
      bar.near(true);
      guide();
    }
    function guide() {
      if (bar.finished) return say('这一层油膜只有一个分子厚。你算出的膜厚，就是分子直径的估计值。');
      if (spoiled) return say(spoiled);
      if (!bar.has('drop')) {
        if (startMl === null) {
          if (!view || !cup()) field(null);
          if (!full()) return say('先测一滴里有多少纯油酸。向上拉活塞到头，吸满一管稀释液。', thumb);
          if (!cup()) return say('已吸满。拖棕色夹头到数滴烧杯上方，准备测这一管的体积。', rig.clamp);
          if (!view) return say('点针管刻度，凑近读出这管溶液的体积。', scale);
          field('volume');
          return say('平视黑色胶塞下沿，每小格 0.01 mL。把读数记在笔记本上。');
        }
        if (fieldKind === 'pure') return say('一滴里只有一小部分是油酸。按配液比例换算，填入纯油酸体积。');
        if (ml > 0.00001 || inFlight()) return say('缓缓下推活塞到底，每落一滴数一次，数清这一管共有几滴。', ml > 0.00001 ? thumb : null);
        field('drops');
        return say('整管溶液已滴完。记下你数的滴数，就能求一滴溶液的平均体积。');
      }
      if (!bar.has('powder')) return say('一滴的纯油酸体积已知。拖粉袋扫过水面四周，撒匀后才容易看清油膜边界。', bag);
      if (!film) {
        if (ml + residue < DROP_ML - 0.00001) return stock()
          ? say('针尖已浸入稀释液。向上拉活塞，吸取足够滴一滴的溶液。', thumb)
          : say('水面已撒匀。把同一支针管移回稀释液杯，再拉活塞取液。', rig.clamp);
        if (!overWater()) return say('把夹头拖到浅盘中央，让一滴溶液有足够的水面铺开。', rig.clamp);
        return say('轻推活塞，第一滴离开针尖就松手。观察水面的粉粒。', thumb);
      }
      if (spread < 1) return say('油酸正在摊开，把粉粒推向四周。等边界稳定下来。');
      if (!covered) {
        if (!cup()) return say('无粉区就是油膜。把针管移回数滴烧杯，给玻璃板腾出位置。', rig.clamp);
        return say('边界已稳定。把右侧方格玻璃板拖到盘沿上，对齐四边。', plate);
      }
      if (!traced) return view === 'plate'
        ? say('按住粉粒内缘描一圈，回到起点，把油膜的形状留在玻璃板上。')
        : say('玻璃板已盖好。点它俯视，找出无粉区的边界。', plate);
      if (!bar.has('area')) return say('沿描线逐排数，可划过格子作记号。不足半格舍去，多于半格算一格。', view ? null : plate);
      say('用纯油酸的体积 V 除以面积 S，算出这层膜有多厚。用 nm 记录。');
    }
    function entry(text) {
      work.append(h('p', { style: 'margin:6px 0;font-size:15px;line-height:1.55;color:#344d53' }, text));
    }
    function restartDrops() {
      if (view) leave();
      drops.forEach(d => { d.mesh.visible = false; });
      drops.length = 0;
      ml = count = residue = liquid = rippleTime = 0;
      startMl = pure = null;
      rig.position(STOCK_X, 0.047, 0);
      rig.volume(0);
      rig.cup.setLevel(0);
      retry.hidden = true;
      rig.hanging.visible = ripple.visible = false;
      work.replaceChildren();
      field(null);
      guide();
    }
    function newTray() {
      if (view) leave();
      for (let i = drops.length - 1; i >= 0; i--) {
        if (drops[i].site === 'pan') { drops[i].mesh.visible = false; drops.splice(i, 1); }
      }
      ret = moving = slideY = null;
      film = origin = spoiled = null;
      spread = 0;
      covered = traced = false;
      area = null;
      trace = [];
      marks.clear();
      rig.resetTray();
      resetTray.hidden = true;
      bar.undo('powder', 'spread', 'trace', 'area', 'size');
      field(null);
      guide();
    }
    function reset() {
      bar.undo('drop');
      newTray();
      restartDrops();
      ui?.relock();
      guide();
    }
    function record() {
      const v = input.valueAsNumber;
      if (!Number.isFinite(v)) return say('先填入这一项的数值，再记录。');
      switch (fieldKind) {
        case 'volume':
          if (Math.abs(v - ml) > 0.00001) return say('再看胶塞靠针尖的一边。从零刻度起，每小格是 0.01 mL。');
          startMl = v;
          entry('一管溶液　' + v.toFixed(2) + ' mL');
          field(null);
          if (view && ctx.camera.aspect < 1) near('syringe');
          return guide();
        case 'drops':
          if (v !== count) { retry.hidden = false; return say('滴数和实际落入杯中的次数不符。可以改填，也可以重新吸一管数。'); }
          retry.hidden = true;
          entry('一滴溶液　' + startMl.toFixed(2) + ' ÷ ' + count + ' = ' + (startMl / count).toFixed(3) + ' mL');
          field('pure');
          return guide();
        case 'pure': {
          const expected = pureOilPerDrop(startMl, 0, count) * 1000;
          if (Math.abs(v - expected) > 0.0005) return say('用一滴溶液的体积乘 1/500，再把 mL 换为 μL。1 mL = 1 000 μL。');
          pure = v / 1000;
          entry('纯油酸 V　' + (startMl / count).toFixed(3) + ' × 1/500 × 1 000 ≈ ' + v + ' μL');
          field(null);
          bar.done('drop');
          if (view) leave();
          return guide();
        }
        case 'area': {
          const expected = countFilmSquares(trace);
          if (!Number.isInteger(v)) return say('边格取舍以后，每个留下的格子都算一格。请填整数。');
          if (Math.abs(v - expected) > 2)
            return say(v > expected ? '数多了。检查描线经过的边格，不足半格要舍去。' : '数少了。检查描线经过的边格，多于半格要算一格。');
          area = v;
          entry('油膜面积 S　' + v + ' × 1 cm² = ' + v + ' cm²');
          bar.done('area');
          field('size');
          return guide();
        }
        case 'size': {
          const nm = molecularSizeNm(pure, area);
          if (Math.abs(v - nm) > 0.05 || v <= 0) return say('先统一单位。1 μL = 10⁻⁹ m³，1 cm² = 10⁻⁴ m²，1 m = 10⁹ nm。');
          entry('膜厚 d = V/S　' + (pure * 1000).toFixed(3) + ' × 10⁻⁹ ÷ (' + area + ' × 10⁻⁴) m ≈ ' + v + ' nm');
          field(null);
          bar.done('size');
          return guide();
        }
      }
    }
    const ripple = new THREE.Mesh(new THREE.RingGeometry(0.006, 0.007, 32),
      new THREE.MeshBasicMaterial({ color: 0x54827d, transparent: true, depthWrite: false }));
    ripple.rotation.x = -Math.PI / 2;
    group.add(ripple);
    function release(site) {
      let mesh = rig.drops.children.find(m => !m.visible);
      if (!mesh) {
        mesh = new THREE.Mesh(new THREE.SphereGeometry(0.0020, 16, 12), new THREE.MeshBasicMaterial({ color: 0x619891 }));
        rig.drops.add(mesh);
      }
      mesh.visible = true;
      mesh.position.copy(syringe.position);
      drops.push({ mesh, site, from: mesh.position.y, t: 0 });
    }
    function land(d) {
      d.mesh.visible = false;
      if (d.site === 'cup') {
        count++;
        liquid += DROP_ML;
        rig.cup.setLevel(0.004 + liquid * 1e-6 / (Math.PI * rig.cup.inner ** 2));
        rippleTime = 0.35;
        ripple.position.set(CUP_X, rig.cup.level + 0.002, 0);
      } else {
        const x = d.mesh.position.x - PAN_X, z = d.mesh.position.z;
        const extra = !!film;
        if (!origin) origin = { x, z };
        film = filmOutline(origin.x, origin.z, DROP_ML * OIL_FRACTION * (extra ? 2 : 1), origin.x * 10);
        spread = 0;
        if (extra) spoiled = '又落了一滴，油膜已混在一起。换一盘清水再测一滴。';
        else if (!rig.powdered) spoiled = '粉没有撒匀，油膜的边界看不全。换一盘清水，先把粉撒匀。';
        else if (film.some(p => Math.max(Math.abs(p.x), Math.abs(p.z)) >= PAN_W / 2))
          spoiled = '油膜碰到盘边，不能充分摊开。换一盘清水，下一滴放在中央。';
        if (spoiled) resetTray.hidden = false;
      }
      guide();
    }
    function moveVolume(next) {
      if (next < ml) {
        residue += ml - next;
        while (residue + 1e-9 >= DROP_ML) {
          residue = Math.max(0, residue - DROP_ML);
          release(cup() ? 'cup' : 'pan');
        }
      } else residue = Math.max(0, residue - (next - ml));
      ml = next;
      rig.volume(ml);
      rig.hanging.visible = residue > 0.0003;
      rig.hanging.scale.setScalar(Math.cbrt(residue / DROP_ML));
      rig.hanging.position.y = -0.0017 * rig.hanging.scale.x;
    }
    function mark(p) {
      const x = p.x - PAN_X, z = p.z;
      const last = trace[trace.length - 1];
      if (traced) {
        const key = Math.floor(x / GRID) + '/' + Math.floor(z / GRID);
        if (erasing) marks.delete(key); else marks.add(key);
        rig.grid(trace, marks);
      } else if (!last || Math.hypot(last.x - x, last.z - z) > 0.0008) {
        trace.push({ x, z });
        rig.grid(trace);
      }
    }
    function finishTrace() {
      const first = trace[0], last = trace[trace.length - 1];
      if (trace.length < 12 || Math.hypot(first.x - last.x, first.z - last.z) > 0.009)
        return say('描线还没合上。从线尾接着描，回到起点。');
      const off = trace.filter(p => film.every(q => Math.hypot(q.x - p.x, q.z - p.z) > 0.007));
      if (off.length > trace.length * 0.1 || Math.abs(polygonArea(trace) / polygonArea(film) - 1) > 0.12) {
        trace = []; rig.grid();
        return say('这圈线偏离了粉粒内缘。沿无粉区的边界重新描一圈。');
      }
      trace.push(first);
      traced = true;
      rig.grid(trace);
      field('area');
      bar.done('trace');
      guide();
    }
    const current = (s) => s === bar.current;
    function returnTo(obj, home) { ret = { obj, from: obj.position.clone(), home: home.clone(), t: 0 }; }
    const piston = {
      obj: thumb, plane: 'xy', get offset() { return syringe.position.z; },
      enabled: () => !ret && !spoiled && !covered && !fieldKind && (stock() || (cup() && startMl !== null && !pure) || (pure && overWater())),
      hint: () => stock() ? '上拉：吸取稀释液' : '下推：滴出溶液',
      onStart() { grabMl = ml; },
      onDrag(p, start) {
        if (!start || spoiled) return;
        const volume = clamp(grabMl + (p.y - start.y) * CAPACITY / STROKE, 0, CAPACITY);
        moveVolume(stock() ? Math.max(ml, volume) : Math.min(ml, volume));
      },
      onEnd() { guide(); },
    };
    const carriage = {
      obj: rig.clamp, plane: 'xz', get offset() { return (slideY == null ? syringe.position.y : slideY) + rig.clamp.position.y; },
      enabled: () => !ret && !spoiled && !covered && !inFlight() && !view && (pure || (startMl === null && full())),
      hint: '拖夹头：移动针管',
      onStart() { moving = syringe.position.clone(); slideY = moving.y; },
      onDrag(p, start) {
        if (!start) return;
        const x = moving.x + p.x - start.x, z = moving.z + p.z - start.z;
        const lift = Math.min(1, Math.hypot(x - moving.x, z - moving.z) / 0.008);
        rig.position(clamp(x, STOCK_X - 0.012, PAN_X + PAN_W / 2), moving.y + (0.065 - moving.y) * lift, clamp(z, -0.12, 0.12));
      },
      onEnd(moved) {
        slideY = null;
        if (!moved) return;
        if (stock()) rig.position(STOCK_X, 0.047, 0);
        else if (cup()) rig.position(CUP_X, 0.054, 0);
        else if (!pure || !overWater()) { returnTo(syringe, moving); return say('针尖没有对准容器，夹头已退回。对准杯口或水面再松手。', rig.clamp); }
        if (overWater() && !film && rig.powdered) near('drip');
        else guide();
      },
    };
    const powderBag = {
      obj: bag, plane: 'xz', offset: WATER_Y + 0.023, keepOffset: true,
      enabled: () => !ret && bar.has('drop') && !film && !view && !covered,
      hint: '拖粉袋：在水面撒粉',
      onStart() { shakeAt = null; },
      onDrag(p) {
        bag.position.set(p.x, WATER_Y + 0.023, p.z);
        if (!shakeAt || p.distanceTo(shakeAt) > 0.012) { rig.sprinkle(p.x - PAN_X, p.z); shakeAt = p.clone(); }
      },
      onEnd(moved) {
        if (!moved) return;
        returnTo(bag, BAG_HOME);
        if (rig.powdered) { bar.done('powder'); guide(); }
        else say('还有水面没撒到。让粉袋扫过裸露的地方。', bag);
      },
    };
    const glass = {
      obj: plate, plane: 'xz', offset: PLATE_Y,
      enabled: () => !ret && !spoiled && bar.has('spread') && cup() && !bar.finished && (!covered || !view || !bar.has('area')),
      hint: () => !covered ? '拖玻璃板：盖住浅盘' : !view ? '点一下：俯视方格' : traced ? '点或划：标记或擦除' : '沿边拖：描油膜轮廓',
      onStart(p) {
        moving = plate.position.clone();
        if (covered && view === 'plate' && p) {
          erasing = marks.has(Math.floor((p.x - PAN_X) / GRID) + '/' + Math.floor(p.z / GRID));
          const last = trace[trace.length - 1];
          if (!traced && last && Math.hypot(p.x - PAN_X - last.x, p.z - last.z) > 0.014) trace = [];
          mark(p);
        }
      },
      onDrag(p, start) {
        if (!start) return;
        if (!covered) plate.position.copy(moving).add(p.clone().sub(start));
        else if (view === 'plate') mark(p);
      },
      onEnd(moved) {
        if (!moved) return;
        if (covered) { if (view === 'plate' && !traced) finishTrace(); return; }
        if (Math.hypot(plate.position.x - PAN_X, plate.position.z) > 0.023) {
          returnTo(plate, rig.plateHome);
          return say('板边没有搭稳。把玻璃板的四边对准盘沿再松手。', plate);
        }
        plate.position.set(PAN_X, PLATE_Y, 0);
        covered = true;
        guide();
      },
      onTap() { if (covered && !view) near('plate'); },
    };
    const manip = draggable(group, [piston, carriage, powderBag, glass], {
      taps: [{ obj: scale, enabled: () => !view && cup() && (startMl === null || (current('drop') && !fieldKind)),
        hint: '点一下：近看刻度', onTap: () => near('syringe') }],
    });
    const tip = ctx.tag('', 'pill');
    const hideTip = () => tip.loc(group, 0, -9, 0);
    const canvas = document.getElementById('c');
    canvas.addEventListener('pointerleave', hideTip);
    reset();
    const atThumb = (v) => point(syringe.position.x, syringe.position.y + SYRINGE_ZERO + STROKE * v / CAPACITY + thumb.position.y, syringe.position.z);
    const atClamp = (x, z = 0) => point(x + rig.clamp.position.x, syringe.position.y + rig.clamp.position.y, z + rig.clamp.position.z);
    const push = (name, volume) => ({ name, drag: thumb, to: () => atThumb(volume) });
    const slide = (name, x, z = 0) => ({ name, drag: rig.clamp, to: () => atClamp(x, z) });
    const write = (name, kind, value) => ({ name, run() {
      if (form.hidden || fieldKind !== kind) throw Error('读数栏未到 ' + kind);
      input.value = String(typeof value === 'function' ? value() : value);
      submit.click();
    } });
    const qa = qaFlow(manip, [
      push('吸满一管', CAPACITY + 0.01), slide('移到烧杯', CUP_X), { name: '近看刻度', tap: scale },
      write('误读胶塞', 'volume', 0.15), write('记录溶液体积', 'volume', CAPACITY),
      { ...push('慢推活塞数滴', -0.01), wait: 6 },
      write('核对漏数', 'drops', 9), write('记录滴数', 'drops', 10), write('折算纯油酸体积', 'pure', 0.04),
      { name: '扫过水面前部', drag: bag, to: point(PAN_X + 0.080, WATER_Y + 0.023, 0.065) },
      { name: '扫过左后角', drag: bag, to: point(PAN_X - 0.074, WATER_Y + 0.023, -0.082) },
      { name: '扫过水面后部', drag: bag, to: point(PAN_X + 0.080, WATER_Y + 0.023, -0.078) },
      slide('移回稀释液', STOCK_X), push('再次取液', CAPACITY + 0.01), slide('靠近盘心', PAN_X),
      push('滴入一滴', CAPACITY - DROP_ML * 1.35), slide('收回针管', CUP_X),
      { name: '盖方格板', drag: plate, to: point(PAN_X, PLATE_Y, 0) }, { name: '俯视油膜', tap: plate },
      { name: '沿粉边合拢描线', run() {
        if (!covered || view !== 'plate' || !film) throw Error('没有可描的油膜');
        const path = film.map(p => point(PAN_X + p.x, PLATE_Y, p.z));
        glass.onStart(path[0]);
        for (const p of path) glass.onDrag(p, path[0]);
        glass.onDrag(path[0], path[0]); glass.onEnd(true);
      } },
      write('边格取舍错误', 'area', 250), write('记录方格面积', 'area', () => countFilmSquares(trace)),
      write('直径单位算错', 'size', 0.002), write('用本轮数据估直径', 'size', () => molecularSizeNm(pure, area).toFixed(2)),
      { name: '掀开原文', run() {
        if (!bar.finished || work.children.length !== 5) throw Error('测量记录不完整');
        ui.go(2); ui.el.querySelector('.flap-front').click();
      } },
    ]);
    // 没有真实鼠标的质检也从器材原位起拖。
    for (const step of qa) if (step.mouse?.kind === 'drag') {
      step.run = () => {
        const item = manip.items().find(i => i.obj === step.mouse.obj);
        const start = local(item.obj);
        const end = step.mouse.to();
        item.onStart(start);
        for (let k = 1; k <= 16; k++) item.onDrag(start.clone().lerp(end, k / 16), start);
        item.onEnd(true);
      };
    }
    return {
      group: new THREE.Group().add(group), size: { w: 0.78, h: 0.23, d: 0.34 },
      view: { elev: 39, azim: 8, frameMargin: 0.99 }, toggles: ['steps'], reset,
      pointer: {
        items: () => manip.items().filter(i => i.enabled()),
        down(ray, e) {
          hideTip();
          if (ui?.step === 2) return false;
          const held = manip.down(ray, e);
          if (held && ui?.step === 0) ui.go(1);
          return held;
        },
        move(ray, e) {
          if (ui?.step !== 1) { hideTip(); return false; }
          const dragging = manip.move(ray, e), item = manip.hovered();
          if (dragging || !item) hideTip();
          else {
            const hit = ray.intersectObject(item.obj, true)[0];
            if (hit) {
              const p = group.worldToLocal(hit.point.clone());
              tip.loc(group, p.x, p.y + 0.013, p.z).text(typeof item.hint === 'function' ? item.hint() : item.hint);
            }
          }
          return dragging;
        },
        up(ray, e) { hideTip(); return manip.up(ray, e); },
      },
      mount(panel) {
        ui = panel;
        document.querySelector('.lbar').dataset.oilfilm = '';
        panel.el.append(h('style', {}, `@media (max-width:760px) {
          .lbar[data-oilfilm] { flex-wrap:wrap; gap:3px 6px; padding:5px 8px }
          .lbar[data-oilfilm] .lb-main { flex:0 0 calc(100% - 32px) }
          .lbar[data-oilfilm] .lb-steps { margin-left:26px; max-width:none; flex-wrap:nowrap }
          .lbar[data-oilfilm] .lb-snd { margin-left:auto }
        }`));
        bar.attach({ need: () => ui.need(''), unlock() { ui.unlock(); ui.need(''); } });
        const source = ui.el.querySelector('.answer .src');
        source.style.minHeight = '58px';
        source.style.paddingRight = '82px';
        panel.controls.append(form, retry, resetTray);
        panel.data.append(note('配液：取 1 mL 油酸，加酒精至总体积 500 mL。'), work);
        panel.notes.append(note('液滴、粉粒和油膜展开过程为示意。玻璃板每小格边长 1 cm。'),
          h('button', { class: 'go ghost', onclick: reset }, '全部重来'));
        guide();
      },
      update(dt) {
        dt *= bar.update(dt);
        if (ret) {
          ret.t = Math.min(1, ret.t + dt / 0.40);
          const pos = ret.obj.position.lerpVectors(ret.from, ret.home, ret.t * (2 - ret.t));
          if (ret.obj === syringe) rig.position(pos.x, pos.y, pos.z);
          if (ret.t === 1) ret = null;
        }
        for (let i = drops.length - 1; i >= 0; i--) {
          const d = drops[i];
          d.t += dt;
          d.mesh.position.y = d.from - 0.85 * d.t ** 2;
          if (d.mesh.position.y <= (d.site === 'cup' ? Math.max(0.004, rig.cup.level) : WATER_Y)) {
            drops.splice(i, 1);
            land(d);
          }
        }
        rippleTime = Math.max(0, rippleTime - dt);
        ripple.visible = rippleTime > 0;
        ripple.scale.setScalar(0.3 + 1.7 * (1 - rippleTime / 0.35));
        ripple.material.opacity = rippleTime / 0.35;
        if (film && spread < 1) {
          spread = Math.min(1, spread + dt / 1.4);
          rig.water(film, origin, 1 - (1 - spread) ** 2);
          if (spread === 1) {
            if (!spoiled) bar.done('spread');
            if (view === 'drip') leave(); else guide();
          }
        }
      },
      dispose() { canvas.removeEventListener('pointerleave', hideTip); manip.dispose(); bar.dispose(); },
      debug: { bar, qa },
    };
  },
};
