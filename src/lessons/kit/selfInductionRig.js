import * as THREE from 'three';
import { paint, inked } from '../../live/ink.js';
import { Circuit, psuPart, switchPart, lampPart, rheostatPart, meterPart } from './circuit.js';
import { canvasTex, textPlate } from './props.js';
import { inductorPart } from './inductorPart.js';

// 仅复用原有器材和布线绘制；电学状态全部由 selfInduction.js 推进，不调用直流求解器。
export function selfInductionRig() {
  const circuit = new Circuit(),
    group = circuit.group,
    textures = [];
  const add = (part, pos) => {
    circuit.add(part, pos);
    part.circuit = null;
    return part;
  };
  function block(parent, w, h, d, x, y, z, color) {
    const o = inked(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), paint(color)));
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  }
  function caption(parent, text, x, z, w = 0.075) {
    const p = textPlate(text, { w, h: 0.012, bg: '#efe5cd', font: '48px sans-serif' });
    p.rotation.x = -Math.PI / 2;
    p.position.set(x, 0.009, z);
    parent.add(p);
    textures.push(p.material.map);
  }
  const source = add(psuPart('E', { U: 8 }), [-0.255, 0.01]);
  const sw = add(switchPart('S'), [0.12, 0.165]);
  const balance = add(rheostatPart('R', { Rmax: 150, pos: 100 / 150 }), [-0.08, 0.035]);
  const common = add(rheostatPart('R1', { Rmax: 75, pos: 50 / 75 }), [-0.08, 0.165]);
  const lamps = [
    add(lampPart('A1', { Rhot: 100, rated: 4, fixedR: true }), [0.13, -0.09]),
    add(lampPart('A2', { Rhot: 100, rated: 4, fixedR: true }), [0.13, 0.035]),
  ];
  const meter = add(meterPart('V', { type: 'V', ranges: [6, 12] }), [0.25, -0.025]);
  const coil = add(inductorPart('L'), [-0.08, -0.09]);
  caption(coil.group, 'L', 0, 0.035);
  caption(balance.group, 'R · 调两灯等亮', 0, 0.065, 0.125);
  caption(common.group, 'R₁ · 调正常亮度', 0, 0.08, 0.125);
  lamps.forEach((p, i) => caption(p.group, 'A' + (i + 1) + ' · 4 V', 0, 0.033));
  caption(sw.group, 'S', 0, 0.027, 0.03);
  circuit.wire('E.+', 'R1.A', {
    points: [
      [-0.23, 0.018, 0.15],
      [-0.18, 0.012, 0.18],
    ],
    color: 0xac4b39,
  });
  circuit.wire('R1.C', 'S.a', {
    points: [
      [-0.14, 0.055, 0.22],
      [0.07, 0.018, 0.22],
    ],
  });
  circuit.wire('S.b', 'L.a', {
    points: [
      [0.18, 0.02, 0.22],
      [0.2, 0.015, 0.27],
      [-0.2, 0.015, 0.27],
      [-0.19, 0.018, 0.10],
      [-0.19, 0.018, -0.04],
      [-0.2, 0.018, -0.08],
    ],
  });
  circuit.wire('L.a', 'R.A', {
    points: [
      [-0.175, 0.02, -0.06],
      [-0.175, 0.02, 0.035],
    ],
  });
  circuit.wire('L.b', 'A1.a');
  circuit.wire('R.C', 'A2.a', {
    points: [
      [-0.14, 0.055, 0.075],
      [0.065, 0.025, 0.075],
    ],
  });
  circuit.wire('A1.b', 'A2.b', {
    points: [
      [0.18, 0.02, -0.07],
      [0.18, 0.02, 0.035],
    ],
  });
  circuit.wire('A2.b', 'E.-', {
    points: [
      [0.2, 0.02, 0.11],
      [-0.235, 0.015, 0.11],
      [-0.245, 0.058, 0.052],
      [-0.245, 0.058, 0.022],
    ],
    color: 0x465857,
  });
  circuit.wire('A1.a', 'V.6', {
    points: [
      [0.095, 0.02, -0.14],
      [0.31, 0.025, -0.14],
      [0.31, 0.022, 0.016],
      [0.276, 0.022, 0.016],
    ],
    color: 0xa94b39,
  });
  circuit.wire('A1.b', 'V.-', { points: [[0.20, 0.023, -0.01], [0.20, 0.022, 0.019], [0.216, 0.022, 0.019]], color: 0x465857 });
  circuit.update(0);
  const clockTex = canvasTex(768, 210, () => {});
  textures.push(clockTex);
  block(group, 0.2, 0.012, 0.057, 0.015, 0.006, -0.19, 0x63716b);
  const clock = new THREE.Mesh(new THREE.PlaneGeometry(0.188, 0.048), new THREE.MeshBasicMaterial({ map: clockTex }));
  clock.rotation.x = -Math.PI / 2;
  clock.position.set(0.015, 0.0122, -0.19);
  group.add(clock);
  let clockText = '';
  return {
    group,
    sw,
    balance,
    common,
    lamps,
    meter,
    coil,
    clock,
    draw(model, dt, speed, elapsed) {
      sw.closed = model.closed;
      sw.update(1);
      lamps.forEach((lamp, i) => {
        lamp.brightness = model.lampResponse[i];
        lamp.update(dt);
      });
      meter.range = 6;
      meter.reading = model.current * model.lampResistance;
      meter.update(dt);
      const text = (speed === 1 ? '实速' : '0.1× 慢放') + ' · ' + elapsed.toFixed(3) + ' s';
      if (text !== clockText) {
        clockText = text;
        const c = clockTex.canvas.getContext('2d');
        c.fillStyle = '#efe5cd';
        c.fillRect(0, 0, 768, 210);
        c.fillStyle = '#344946';
        c.textAlign = 'center';
        c.font = '50px sans-serif';
        c.fillText(text, 384, 82);
        c.font = '32px sans-serif';
        c.fillText('本轮通电时长 · 点此切换观察速度', 384, 153);
        clockTex.needsUpdate = true;
      }
    },
    dispose() {
      textures.forEach((t) => t.dispose());
      circuit.dispose();
    },
  };
}
