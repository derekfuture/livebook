// 尺架开口朝下。金属丝横穿测面；提起尺架换位置时，两根接线柱保持原位。
import * as THREE from 'three';
import { draggable, clamp } from './interact.js';
import { micrometerTool, readMicrometerTick, ANVIL_X, AXIS_Y, SCALE_ZERO } from './micrometerTool.js';
import { turnSpindle, SCREW_PITCH } from './micrometer.js';
import { sfx } from './audio.js';
import { woodBlock } from './props.js';

const TAU = Math.PI * 2,
  PARK_Z = 0.222;
export function wireDiameterStation(group, sample, { look, back, say, record, enter }) {
  const tool = micrometerTool(),
    base = tool.group;
  base.rotation.order = 'YXZ';
  base.rotation.y = -Math.PI / 2;
  base.rotation.x = -Math.PI / 2;
  group.add(base);
  const centerY = sample.wireMesh.position.y,
    wireZ = sample.group.position.z;
  const diameter = sample.wireMesh.geometry.parameters.radiusTop * 2000;
  const contactZ = wireZ - ANVIL_X - diameter / 2000;
  const foot = woodBlock(0.016, 0.012, 0.008);
  foot.position.set(-0.014, AXIS_Y, -0.006);
  base.add(foot);
  let gap, turns, zeroed, onWire, clicked, locked, view, coarse, startGap, startTurns, startPos, dragged;
  const previous = [];
  const touching = () => Math.abs(gap - (onWire ? diameter : 0)) < 1e-8;
  function guide() {
    if (view === 'read')
      return say(
        coarse === null ? '点固定套筒最后露出的整毫米或半毫米线。' : '点固定基准线延长到微分筒上的位置，估读到格内。',
        null,
      );
    if (clicked) return say('棘轮已打滑。点刻度近看两筒的读数。', tool.scale);
    if (previous.length >= 3 && onWire && !locked)
      return say(
        gap < diameter + 0.06
          ? '三处已读。先把大旋钮向标尺左端滚动，松开测面。'
          : '把尺架提离金属丝，放回台前，然后接电表。',
        gap < diameter + 0.06 ? tool.grip : tool.frame,
      );
    if (locked) return say('松开锁紧装置，再旋转或提起测微器。', tool.screw);
    if (!zeroed) return say('先在空测面查零。点测微器近看，滚动小微调轮使测面轻合。', tool.ratchet);
    if (!onWire || previous.some((x) => Math.abs(x - (base.position.x + AXIS_Y)) < 0.045)) {
      if (gap < diameter + 0.06) return say('把旋钮向标尺左端滚动以张开测面，给丝留出空隙。', tool.grip);
      return say(
        (view ? '回全景，' : '') +
          '抓住绿色尺架，提到两柱之间' +
          (previous.length ? '另一处' : '的金属丝上') +
          '，松手放下。',
        tool.frame,
      );
    }
    say('点旋钮近看。把微调轮向标尺右端滚到打滑，让两测面轻轻接触金属丝。', tool.ratchet);
  }
  function home() {
    base.position.set(0.16 - AXIS_Y, centerY, PARK_Z);
  }
  function exit() {
    if (view) back();
    view = null;
    coarse = null;
    guide();
  }
  function focus(mode) {
    view = mode;
    coarse = null;
    const local = new THREE.Vector3(mode === 'read' ? SCALE_ZERO + gap / 1000 : -0.01, AXIS_Y, 0);
    const pos = group.worldToLocal(base.localToWorld(local));
    look(pos.toArray(), mode === 'read' ? [-0.01, 1, 0] : [-0.35, 1, 0], mode === 'read' ? 0.02 : 0.15, exit);
    guide();
  }
  function roll(obj, fine, radius) {
    return {
      obj,
      plane: 'xz',
      offset: centerY,
      hint: fine ? '滚动棘轮施加测量压力' : '滚动旋钮张开或收拢测面',
      onStart() {
        enter();
        startGap = gap;
        startTurns = turns;
      },
      onDrag(p, from) {
        if (locked || !from) return;
        // 尺架坐标中的 +y 指向实验台 +x。滚筒朝 −x 滚动时螺杆张开。
        const delta = (from.x - p.x) / (TAU * radius);
        const result = turnSpindle(startGap, delta, onWire ? diameter : 0, fine);
        const before = clicked;
        gap = result.gap;
        clicked = result.slipped || (clicked && touching());
        turns = startTurns + (fine ? delta : (gap - startGap) / SCREW_PITCH);
        if (!before && result.slipped) sfx.clink({ freq: 1750, gain: 0.055 });
        tool.update(gap, turns);
        guide();
      },
      onTap() {
        if (!view) focus('tool');
        else guide();
      },
    };
  }
  function read(ray) {
    const result = readMicrometerTick(tool, gap, coarse, ray);
    if (result.error) return say(result.error);
    if (result.coarse !== undefined) {
      coarse = result.coarse;
      guide();
      return;
    }
    if (result.value === undefined) return;
    const value = result.value;
    clicked = false;
    if (!zeroed) {
      zeroed = true;
      exit();
      return;
    }
    const x = base.position.x + AXIS_Y;
    exit();
    if (!onWire || previous.some((p) => Math.abs(x - p) < 0.045))
      return say('这个位置已经测过。松开测面，提起尺架移到另一处。', tool.grip);
    previous.push(x);
    record(x, value);
  }
  const manip = draggable(
    group,
    [
      roll(tool.grip, false, 0.0067),
      roll(tool.ratchet, true, 0.004),
      {
        obj: tool.frame,
        plane: 'xz',
        offset: centerY,
        hint: '提起尺架，移到金属丝另一处',
        onStart() {
          enter();
          startPos = base.position.clone();
          dragged = false;
        },
        onDrag(p, from) {
          if (!from || locked || !zeroed || gap < diameter + 0.06) return;
          dragged = true;
          base.position.set(
            clamp(startPos.x + p.x - from.x, -0.24, 0.24),
            centerY + 0.022,
            clamp(startPos.z + p.z - from.z, contactZ - 0.04, PARK_Z),
          );
        },
        onEnd(moved) {
          if (!moved) return;
          if (!dragged) {
            guide();
            return;
          }
          if (Math.abs(base.position.z - contactZ) < 0.045) {
            onWire = true;
            base.position.z = contactZ;
            base.position.y = centerY;
          } else {
            onWire = false;
            home();
          }
          clicked = false;
          if (view) exit();
          else guide();
        },
        onTap() {
          if (!view) focus('tool');
        },
      },
    ],
    {
      highlight: true,
      taps: [
        {
          obj: tool.screw,
          hint: '锁住或松开螺杆',
          onTap() {
            locked = !locked;
            tool.screw.rotation.z = locked ? 0.55 : 0;
            guide();
          },
        },
        ...[tool.sleeve, tool.scale].map((obj) => ({
          obj,
          hint: '近看测微器刻度',
          onTap() {
            enter();
            if (clicked && touching()) focus('read');
            else if (!view) focus('tool');
            else guide();
          },
        })),
      ],
    },
  );
  function reset() {
    if (view) exit();
    view = null;
    gap = 0.4;
    turns = gap / SCREW_PITCH;
    zeroed = onWire = clicked = locked = false;
    previous.length = 0;
    tool.screw.rotation.z = 0;
    home();
    tool.update(gap, turns);
  }
  reset();
  return {
    guide,
    reset,
    exit,
    get parked() {
      return !onWire;
    },
    get near() {
      return !!view;
    },
    pointer: {
      items: manip.items,
      down(ray, e) {
        if (view === 'read') {
          read(ray);
          return true;
        }
        return manip.down(ray, e) || !!view;
      },
      move(ray) {
        return view === 'read' || manip.move(ray);
      },
      up() {
        return manip.up();
      },
    },
    dispose() {
      manip.dispose();
      tool.dispose();
    },
  };
}
