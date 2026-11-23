// 用同一把毫米尺量接线点间距。移尺复测时，已经读过的两端坐标成对保存。
import * as THREE from 'three';
import { rulerMesh } from './props.js';
import { clamp, draggable } from './interact.js';

const SPAN = 0.7,
  WIDTH = 0.028,
  THICK = 0.003;
export function wireLengthStation(group, circuit, { look, back, say, enter, record }) {
  // rulerMesh 的首末刻线各距贴图边缘 8 像素。两线之间应恰为 700 mm。
  const ruler = rulerMesh({
    length: (SPAN * 4096) / 4080,
    width: WIDTH,
    thick: THICK,
    divisions: 700,
    every: 10,
    labelEvery: 20,
  });
  group.add(ruler);
  // 小黄铜铆钉标出可抓取的尺端，提示圈只围住手指应落下的位置。
  const grip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.003, 0.003, 0.0006, 16),
    new THREE.MeshBasicMaterial({ color: 0xa78b54 }),
  );
  grip.position.set(-SPAN / 2 + 0.007, THICK / 2, WIDTH / 2 - 0.005);
  ruler.add(grip);
  const ends = ['X.a', 'X.b'].map((id) => circuit.terminalWorld(id));
  const alignedZ = ends[0].z + WIDTH / 2 + 0.004;
  let near = null,
    left = null,
    previousOrigin = null;
  const zero = () => ruler.position.x - SPAN / 2;
  const aligned = () => Math.abs(ruler.position.z - alignedZ) <= 0.005;
  const canRepeat = () => previousOrigin === null || Math.abs(zero() - previousOrigin) >= 0.005;
  function guide() {
    if (!aligned()) say('把刻度尺拖到两接线柱前，让刻线边贴近金属丝。');
    else if (!canRepeat()) say('两端的差已记录。把尺沿金属丝挪动至少半厘米，用另一段刻度再量一次。');
    else if (left === null) say('点左接线柱旁的尺，近看这个接入点落在哪一毫米。');
    else say('左端读到 ' + left + ' mm。点右接线柱旁的尺，读同一把尺的另一端。');
  }
  function leave() {
    if (near !== null) back();
    near = null;
  }
  function inspect(end) {
    if (!aligned() || !canRepeat()) {
      guide();
      return;
    }
    if ((end === 0) !== (left === null)) {
      guide();
      return;
    }
    near = end;
    look([ends[end].x, 0.006, alignedZ - WIDTH / 2], [0, 1, 0.08], 0.115, leave);
    say(end ? '沿右接线柱中心向下，在尺上点出毫米位置。' : '尺上数字是厘米。点左接线柱正下方的毫米刻线。');
  }
  function read(ray) {
    const hit = ray.intersectObject(ruler, false)[0];
    if (!hit) return;
    const n = Math.round(1000 * (group.worldToLocal(hit.point.clone()).x - zero()));
    const expected = (ends[near].x - zero()) * 1000;
    if (Math.abs(n - expected) > 1) {
      say('读接线柱中心正下方的尺刻，余下的丝头不计入长度。');
      return;
    }
    if (near === 0) {
      left = n;
      leave();
      guide();
      return;
    }
    const start = left;
    left = null;
    previousOrigin = zero();
    leave();
    record(start, n);
  }
  const drag = draggable(
    group,
    [
      {
        obj: ruler,
        plane: 'xz',
        offset: THICK / 2,
        keepOffset: true,
        hint: '沿金属丝移尺，点接线柱旁的尺刻近看',
        onStart() {
          enter();
        },
        onDrag(p) {
          ruler.position.x = clamp(p.x, -0.06, 0.06);
          ruler.position.z = clamp(p.z, alignedZ, 0.14);
          left = null;
        },
        onEnd(moved) {
          if (moved) guide();
        },
        onTap() {
          if (tappedEnd >= 0) inspect(tappedEnd);
          else guide();
        },
      },
    ],
    { highlight: true },
  );
  function reset() {
    leave();
    left = null;
    previousOrigin = null;
    ruler.position.set(-0.006, THICK / 2, 0.14);
  }
  reset();
  let tappedEnd = null;
  return {
    ruler,
    grip,
    guide,
    reset,
    leave,
    get stowed() {
      return ruler.position.z >= 0.13;
    },
    get near() {
      return near !== null;
    },
    pointer: {
      items: drag.items,
      down(ray, e) {
        if (near !== null) {
          read(ray);
          return true;
        }
        const hit = ray.intersectObject(ruler, false)[0];
        if (!hit) return false;
        const x = group.worldToLocal(hit.point.clone()).x;
        tappedEnd = ends.findIndex((p) => Math.abs(p.x - x) < 0.04);
        return drag.down(ray, e);
      },
      move(ray) {
        if (near !== null) return true;
        return drag.move(ray);
      },
      up() {
        return drag.up();
      },
    },
    dispose() {
      drag.dispose();
      ruler.material[2].map.dispose();
    },
  };
}
