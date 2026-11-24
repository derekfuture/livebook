// 螺杆沿台面的 z 轴运动，丝横穿两测面。不同位置用同一支测微器。
import * as THREE from 'three';
import { draggable, clamp } from './interact.js';
import { micrometerTool, ANVIL_X, AXIS_Y, SCALE_ZERO } from './micrometerTool.js';
import { turnSpindle, SCREW_PITCH, micrometerReading } from './micrometer.js';
import { sfx } from './audio.js';

export function wireDiameterStation(group, sample, { look, back, say, record, finish, enter, ask, tip }) {
  const tool = micrometerTool({ textbookScale: true }), base = tool.group;
  base.rotation.order = 'YXZ';
  base.rotation.y = base.rotation.x = -Math.PI / 2;
  group.add(base);
  const height = sample.wireMesh.position.y;
  const diameter = sample.wireMesh.geometry.parameters.radiusTop * 2000;
  const contactZ = sample.group.position.z - ANVIL_X - diameter / 2000;
  const home = new THREE.Vector3(0.15, height, 0.154);
  // 拾取框落在尺架弓背上，和两个旋钮分开。
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.016, 0.013), new THREE.MeshBasicMaterial({ visible: false }));
  frame.userData.pick = true;
  frame.position.set(-0.03, AXIS_Y, 0.033);
  base.add(frame);
  const fine = tool.ratchet.children[0];
  const sites = [];
  const changeover = diameter + 0.12;
  const approach = '向右拖大旋钮，让测微螺杆靠近金属丝。';
  const useFine = '螺杆已接近金属丝。换小微调钮向右拖，听到棘轮声就松手。';
  const backOff = '大旋钮已把螺杆顶到金属丝。向左退开一点，再用微调钮轻轻夹紧。';
  let coarseContact = false;
  let gap, turns, zeroed, onWire, slipped, view, origin, returning, startGap, startTurns, locked;
  const x = () => base.position.x + AXIS_Y;
  const fresh = () => sites.every(previous => Math.abs(x() - previous) > 0.045);
  function guide(prefix = '') {
    let text, target;
    if (locked) { text = '螺杆已锁住。点锁紧钮松开，才能调节测面。'; target = tool.screw; }
    else if (coarseContact) { text = backOff; target = tool.grip; }
    else if (!zeroed) { text = '向右拖小微调钮，空合两测面，检查零线。'; target = fine; }
    else if ((!onWire || !fresh()) && gap < diameter + 0.06) {
      text = '向左拖大旋钮，张开测面，给金属丝留出空隙。'; target = tool.grip;
    } else if (!onWire || !fresh() || sites.length === 3) {
      text = sites.length === 3 ? '把尺架拖回台前，收好测微器。' : '拖住绿色尺架，把两测面放到' + (sites.length ? '另一处' : '两柱之间的') + '金属丝上。';
      target = frame;
    } else if (gap > changeover) { text = approach; target = tool.grip; }
    else { text = useFine; target = fine; }
    say(prefix + text, target === frame ? tool.frame : target);
  }
  function read() {
    view = true;
    const p = group.worldToLocal(base.localToWorld(new THREE.Vector3(SCALE_ZERO + gap / 1000, AXIS_Y, 0)));
    look(p.toArray(), [-0.012, 1, 0], 0.040);
    say(zeroed ? '先读套筒露出的半毫米，再加微分筒读数。每小格 0.01 mm，估读一位。' : '测面已轻合。看固定套筒的零线和微分筒的零线，读出此时的示数。');
    ask(zeroed ? '直径 d / mm' : '零点读数 / mm', value => {
      if (!Number.isFinite(value) || Math.abs(value - gap) > (zeroed ? 0.0011 : 0.0001)) {
        if (!zeroed) return say('两测面已合拢。看微分筒的哪条刻线对着固定基准线。');
        const correct = micrometerReading(gap);
        return say(Math.floor(value * 2) / 2 !== correct.sleeve
          ? '重看固定套筒，微分筒边缘已经露出半毫米线。'
          : '半毫米读对了。看基准线在微分筒哪两格之间，再估读一位。');
      }
      view = slipped = false;
      back();
      if (!zeroed) { zeroed = true; guide('两条零线对齐，可以测量。'); }
      else {
        sites.push(x());
        record(x(), value, sites.length);
      }
    });
  }
  function roller(obj, isFine) {
    return { obj, plane: 'xz', offset: height, enabled: () => !view && !returning,
      hint: isFine ? '右拖：轻合测面' : '左右拖：转大旋钮',
      onStart() { enter(); startGap = gap; startTurns = turns; },
      onDrag(p, from) {
        if (!from || locked) return;
        const delta = (from.x - p.x) / (2 * Math.PI * (isFine ? 0.004 : 0.0067));
        if (coarseContact && isFine) return;
        if (onWire && isFine && startGap > changeover && delta < 0) {
          say(approach, tool.grip);
          return;
        }
        const result = turnSpindle(startGap, delta, onWire ? diameter : 0, isFine);
        if (onWire && !isFine) {
          coarseContact = result.gap <= diameter;
          if (delta < 0 && result.gap <= changeover) say(coarseContact ? backOff : useFine, coarseContact ? tool.grip : fine);
        }
        if (result.slipped && !slipped) sfx.clink({ freq: 1750, gain: 0.055 });
        gap = result.gap;
        slipped = result.slipped;
        turns = startTurns + (isFine ? delta : (gap - startGap) / SCREW_PITCH);
        tool.update(gap, turns);
      },
      onEnd() {
        if (slipped && (!zeroed || (onWire && fresh() && sites.length < 3))) read();
        else guide();
      },
      onTap() { if (slipped && (!zeroed || (onWire && fresh()))) read(); else guide(); },
    };
  }
  const frameDrag = {
    obj: frame, plane: 'xz', offset: height + 0.033, keepOffset: true, anchor: base,
    enabled: () => !view && !returning, hint: '拖尺架：换测量位置',
    onStart() { enter(); origin = base.position.clone(); },
    onDrag(p) {
      if (locked || !zeroed || gap < diameter + 0.06) return;
      base.position.set(clamp(p.x, -0.25, 0.25), height + 0.012, clamp(p.z, contactZ - 0.04, home.z + 0.03));
    },
    onEnd(moved) {
      if (!moved || base.position.equals(origin)) { guide(); return; }
      if (sites.length < 3 && Math.abs(base.position.z - contactZ) < 0.025 && fresh()) {
        base.position.set(base.position.x, height, contactZ);
        onWire = true;
        slipped = false;
        guide();
      } else if (base.position.distanceTo(home) < 0.035) {
        base.position.copy(home); onWire = slipped = false;
        if (sites.length === 3) finish(); else guide();
      } else {
        returning = { start: base.position.clone(), t: 0 };
        say(fresh() ? '测面没有对准金属丝，尺架回到原处。' : '这里已经测过，沿丝换一处再夹。', tool.frame);
      }
    },
  };
  const pointer = draggable(group, [roller(tool.grip, false), roller(fine, true), frameDrag], { tip, taps: [
    { obj: tool.screw, enabled: () => !view && !returning, hint: '点一下：锁紧或松开', onTap() {
      enter(); locked = !locked; tool.screw.rotation.z = locked ? 0.55 : 0; guide();
    } },
  ] });
  function reset() {
    gap = 0.4; turns = gap / SCREW_PITCH;
    coarseContact = false;
    view = zeroed = onWire = slipped = locked = false;
    returning = null;
    sites.length = 0;
    base.position.copy(home);
    tool.screw.rotation.z = 0;
    tool.update(gap, turns);
  }
  reset();
  return { pointer, base, frame, grip: tool.grip, fine, home, contactZ, guide, reset, diameter,
    get opening() { return gap; },
    get near() { return view; },
    get parked() { return !returning && base.position.equals(home); },
    leave() { view = false; back(); guide(); },
    update(dt) {
      if (!returning) return;
      returning.t = Math.min(1, returning.t + dt / 0.38);
      base.position.lerpVectors(returning.start, origin, 1 - (1 - returning.t) ** 2);
      if (returning.t === 1) returning = null;
    },
    dispose() { pointer.dispose(); tool.dispose(); },
  };
}
