import * as THREE from 'three';
import { paint, inked } from '../../live/ink.js';
import { Circuit, psuPart, switchPart, lampPart } from './circuit.js';
import { inductorPart } from './inductorPart.js';
import { canvasTex, textPlate } from './props.js';

export const SLOT = [0, 0, -0.08];
export const PARKS = [
  [-0.2, 0, -0.08],
  [0.2, 0, -0.08],
];
// 断电后闭合路径：右侧导线 → 灯右端 → 灯左端 → 左侧导线 → 线圈左端。
export const RETURN_PATH = [
  [0.1, -0.04],
  [0.1, 0.055],
  [0.02, 0.075],
  [-0.02, 0.075],
  [-0.1, 0.055],
  [-0.1, -0.04],
  [-0.067, -0.067],
];
export function selfInductionOffRig() {
  const c = new Circuit(),
    group = c.group,
    textures = [];
  const add = (p, pos) => {
    c.add(p, pos);
    p.circuit = null;
    return p;
  };
  const block = (w, h, d, x, y, z, color) => {
    const o = inked(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), paint(color)));
    o.position.set(x, y, z);
    group.add(o);
    return o;
  };
  function caption(parent, text, x, z, w = 0.13) {
    const o = textPlate(text, { w, h: 0.013, bg: '#efe5cd', font: '46px sans-serif' });
    o.rotation.x = -Math.PI / 2;
    o.position.set(x, 0.009, z);
    parent.add(o);
    textures.push(o.material.map);
    return o;
  }
  const source = add(psuPart('E', { U: 4 }), [-0.21, 0.14]);
  const sw = add(switchPart('S'), [-0.065, 0.17]);
  const lamp = add(lampPart('A', { Rhot: 100, rated: 4, fixedR: true }), [0, 0.065]);
  caption(lamp.group, 'A · 4 V', 0, 0.045, 0.075);
  caption(sw.group, 'S', 0, 0.028, 0.025);
  const coils = [50, 150].map((r, i) => {
    const p = inductorPart('L' + i, { resistance: r });
    p.group.position.set(...(i ? PARKS[i] : SLOT));
    group.add(p.group);
    caption(p.group, '8 H · ' + r + ' Ω', 0, 0.037, 0.13);
    return p;
  });
  const socket = {
    name: 'socket',
    kind: 'coil',
    group: new THREE.Group(),
    terminals: { a: [-0.067, 0.02, 0.013], b: [0.067, 0.02, 0.013] },
  };
  add(socket, [SLOT[0], SLOT[2]]);
  block(0.16, 0.004, 0.058, 0, 0.002, -0.08, 0x91998d);
  for (const x of [-0.067, 0.067]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.018, 12), paint(0xaaa38a));
    post.position.set(x, 0.011, 0.013);
    socket.group.add(post);
  }
  caption(group, '线圈插座', 0, -0.125, 0.1);
  c.wire('E.+', 'S.a', { color: 0xad4a39 });
  c.wire('S.b', 'A.a', {
    points: [
      [-0.11, 0.022, 0.13],
      [-0.11, 0.022, 0.08],
    ],
    color: 0xb37042,
  });
  c.wire('A.a', 'socket.a', {
    points: [
      [-0.1, 0.02, 0.055],
      [-0.1, 0.02, -0.04],
    ],
    color: 0xb37042,
  });
  c.wire('socket.b', 'A.b', {
    points: [
      [0.1, 0.02, -0.04],
      [0.1, 0.02, 0.055],
    ],
    color: 0xb37042,
  });
  c.wire('A.b', 'E.-', {
    points: [
      [0.27, 0.02, 0.075],
      [0.27, 0.02, 0.235],
      [-0.19, 0.02, 0.235],
    ],
    color: 0x465857,
  });
  c.update(0);
  const screenTex = canvasTex(900, 380, () => {});
  textures.push(screenTex);
  block(0.18, 0.014, 0.079, 0.155, 0.007, 0.15, 0x63716b);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.168, 0.069), new THREE.MeshBasicMaterial({ map: screenTex }));
  screen.rotation.x = -Math.PI / 2;
  screen.position.set(0.155, 0.0142, 0.15);
  group.add(screen);
  const pad = new THREE.Mesh(
    new THREE.PlaneGeometry(0.3, 0.25),
    new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }),
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(0, 0.001, 0);
  group.add(pad);
  const start = new THREE.Mesh(
    new THREE.TorusGeometry(0.006, 0.001, 6, 24),
    new THREE.MeshBasicMaterial({ color: 0xb56a35 }),
  );
  start.rotation.x = -Math.PI / 2;
  start.position.set(0.1, 0.024, -0.04);
  start.visible = false;
  group.add(start);
  const stroke = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x236b73 }));
  stroke.renderOrder = 5;
  stroke.visible = false;
  group.add(stroke);
  let previousText = '';
  return {
    group,
    sw,
    lamp,
    coils,
    screen,
    pad,
    start,
    trace(points) {
      stroke.geometry.dispose();
      stroke.geometry = new THREE.BufferGeometry().setFromPoints(points.map((p) => new THREE.Vector3(p.x, 0.028, p.z)));
      stroke.visible = points.length > 1;
    },
    draw(model, dt, speed, duration, capture, record) {
      sw.closed = model.closed;
      sw.update(1);
      lamp.brightness = model.lampResponse[0];
      lamp.update(dt);
      const s = model.observe(),
        line = (speed === 1 ? '实速' : '0.1× 慢放') + ' · 通电 ' + duration.toFixed(3) + ' s';
      const lampMilliamp = s.otherCurrent * 1000;
      const second = '灯支路 ' + (Math.abs(lampMilliamp) < 0.05 ? 0 : lampMilliamp).toFixed(1) + ' mA';
      const text = line + second + (capture ? 'recording' : record?.peak?.toFixed(3) || '');
      if (text !== previousText) {
        previousText = text;
        const g = screenTex.canvas.getContext('2d');
        g.fillStyle = '#efe5cd';
        g.fillRect(0, 0, 900, 380);
        g.fillStyle = '#344946';
        g.textAlign = 'center';
        g.font = '47px sans-serif';
        g.fillText(line, 450, 78);
        g.font = '50px sans-serif';
        g.fillText(second, 450, 157);
        g.font = '33px sans-serif';
        g.fillText('正：左→右；负：右→左（观察辅助）', 450, 219);
        g.fillText(capture ? '记录断电后的起伏…' : '点计时牌切换速度并近看', 450, 288);
        screenTex.needsUpdate = true;
      }
    },
    dispose() {
      textures.forEach((t) => t.dispose());
      c.dispose();
      stroke.geometry.dispose();
      stroke.material.dispose();
    },
  };
}
