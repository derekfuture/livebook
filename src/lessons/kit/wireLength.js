// 尺的首末刻线各距贴图边缘 8 像素，两线之间为 700 mm。
import * as THREE from 'three';
import { rulerMesh } from './props.js';
import { clamp, draggable } from './interact.js';

export function wireLengthStation(group, circuit, { look, back, say, enter, ask, record, finish, tip }) {
  const span = 0.7, width = 0.028, park = 0.225;
  const ruler = rulerMesh({ length: span * 4096 / 4080, width, thick: 0.003, divisions: 700, every: 10, labelEvery: 20 });
  const ends = ['X.a', 'X.b'].map(id => circuit.terminalWorld(id));
  const alignedZ = ends[0].z + width / 2 + 0.004;
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.0006, 16), new THREE.MeshBasicMaterial({ color: 0xa78b54 }));
  grip.position.set(-0.34, 0.0015, 0.008);
  ruler.add(grip);
  group.add(ruler);
  // 贴着接线柱中心的细指标，把同一横坐标引到尺的刻线边。
  const marks = ends.map(p => {
    const mark = new THREE.Mesh(new THREE.BoxGeometry(0.00027, 0.0002, 0.012), new THREE.MeshBasicMaterial({ color: 0x783928 }));
    mark.position.set(p.x, 0.0033, p.z + 0.007);
    group.add(mark);
    return mark;
  });
  let end, left, count, previous, origin, returning;
  const aligned = () => Math.abs(ruler.position.z - alignedZ) < 0.001;
  const expected = () => (ends[end].x - ruler.position.x + span / 2) * 1000;
  function guide() {
    say(count === 2 ? '两次长度已取平均。把尺拖回台前，腾出金属丝。'
      : count ? '沿丝把尺平移半厘米以上，用另一段刻度复测两柱间距。'
      : '把刻度尺拖到丝旁，量两接线柱之间通电的一段。柱外的丝头也看得见。', grip);
  }
  function inspect() {
    if (!aligned() || count === 2 || (previous !== null && Math.abs(previous - ruler.position.x) < 0.005)) return guide();
    end = left === null ? 0 : 1;
    const side = end ? '右' : '左';
    look([ends[end].x, 0.005, alignedZ - 0.002], [0, 1, 0.012], 0.16);
    say((end ? '左柱读到 ' + left + ' mm。' : '') + '读' + side + '柱中心细线所对的刻度。尺上数字是厘米，每小格是 1 mm。');
    ask(side + '柱位置 / mm', value => {
      if (!Number.isFinite(value) || Math.abs(value - expected()) > 0.55)
        return say('看接线柱中心的细线，从有数字的厘米线数小格，再换算成毫米。');
      if (end === 0) { left = value; inspect(); return; }
      previous = ruler.position.x;
      count++;
      const a = left;
      left = end = null;
      back();
      record(a, value, count);
    });
  }
  const pointer = draggable(group, [{
    obj: ruler, plane: 'xz', offset: 0.0015, keepOffset: true, enabled: () => end === null && !returning,
    hint: '拖尺：贴近金属丝',
    onStart() { enter(); origin = ruler.position.clone(); },
    onDrag(p) {
      ruler.position.set(clamp(p.x, -0.06, 0.06), 0.0015, clamp(p.z, alignedZ - 0.025, park + 0.015));
      marks.forEach(m => { m.visible = false; });
    },
    onTap: inspect,
    onEnd(moved) {
      if (!moved) return;
      if (Math.abs(ruler.position.z - alignedZ) < 0.024 && count < 2) {
        ruler.position.z = alignedZ;
        marks.forEach(m => { m.visible = true; });
        left = null;
        inspect();
      } else if (count === 2 && Math.abs(ruler.position.z - park) < 0.035) {
        ruler.position.z = park;
        finish();
      } else {
        returning = { start: ruler.position.clone(), t: 0 };
        say(count === 2 ? '尺还在丝旁，向台前再拖远一点。' : '尺边还没贴到丝旁，重新把刻线边拖到两柱前。', grip);
      }
    },
  }], { tip });
  function reset() {
    end = left = previous = returning = null;
    count = 0;
    ruler.position.set(-0.006, 0.0015, park);
    marks.forEach(m => { m.visible = false; });
  }
  reset();
  return { ruler, grip, alignedZ, park, pointer, expected, guide, reset,
    leave() { end = null; back(); say('点尺面，继续读接线柱的位置。', grip); },
    update(dt) {
      if (!returning) return;
      returning.t = Math.min(1, returning.t + dt / 0.38);
      ruler.position.lerpVectors(returning.start, origin, 1 - (1 - returning.t) ** 2);
      if (returning.t === 1) { returning = null; marks.forEach(m => { m.visible = aligned(); }); }
    },
    dispose() { pointer.dispose(); ruler.material[2].map.dispose(); },
  };
}
