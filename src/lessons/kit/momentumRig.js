// 图 1.4-1。两个独立光电门各有自己的计时显示，遮光片沿导轨方向宽 10 mm。
import * as THREE from 'three';
import { paint, inked } from '../../live/ink.js';
import { canvasTex } from './props.js';
import { GATES, FLAG_WIDTH } from './momentum.js';

export const TRACK_Y = 0.107;
export function momentumRig() {
  const group = new THREE.Group(),
    rail = new THREE.Group(),
    textures = [];
  group.add(rail);
  function box(parent, w, h, d, x, y, z, color) {
    const o = inked(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), paint(color)), { width: 0.65 });
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  }
  function cyl(parent, r, h, x, y, z, color) {
    const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24), paint(color));
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  }
  function top(parent, x, y, z, w, d, tex) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: tex }));
    p.rotation.x = -Math.PI / 2;
    p.position.set(x, y, z);
    parent.add(p);
    textures.push(tex);
    return p;
  }
  function label(parent, str, x, y, z, w, d) {
    return top(
      parent,
      x,
      y,
      z,
      w,
      d,
      canvasTex(512, 96, (c, W, H) => {
        c.fillStyle = '#e8dec2';
        c.fillRect(0, 0, W, H);
        c.fillStyle = '#273b3b';
        c.font = 'bold 65px sans-serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(str, W / 2, H / 2);
      }),
    );
  }
  // 挤出截面：形状坐标分别表示横向 z 和高度 y。
  function prism(parent, outline, len, color) {
    const shape = new THREE.Shape();
    outline.forEach(([z, y], i) => shape[i ? 'lineTo' : 'moveTo'](-z, y));
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: len, bevelEnabled: false });
    geo.translate(0, 0, -len / 2);
    geo.rotateY(Math.PI / 2);
    const m = inked(new THREE.Mesh(geo, paint(color)), { width: 0.7 });
    parent.add(m);
    return m;
  }
  prism(
    rail,
    [
      [-0.036, 0.065],
      [0.036, 0.065],
      [0.036, 0.076],
      [0, TRACK_Y],
      [-0.036, 0.076],
    ],
    1.24,
    0x859c99,
  );
  for (const x of [-0.48, 0.48]) {
    box(group, 0.1, 0.015, 0.18, x, 0.0075, 0.02, 0x647071);
    cyl(group, 0.016, 0.052, x, 0.039, 0, 0x65726e);
  }
  cyl(group, 0.009, 0.05, -0.48, 0.035, 0.077, 0x66736a);
  box(rail, 0.036, 0.008, 0.092, -0.48, 0.062, 0.039, 0x6b7772);
  const screw = cyl(group, 0.028, 0.012, -0.48, 0.047, 0.077, 0xba9962);
  for (let j = 0; j < 12; j++) {
    const a = (j * Math.PI) / 6;
    box(screw, 0.003, 0.013, 0.003, 0.026 * Math.sin(a), 0, 0.026 * Math.cos(a), 0x837756);
  }
  for (const x of [-0.62, 0.62]) box(rail, 0.01, 0.065, 0.066, x, 0.095, 0, 0x5b6664);
  const bubbleBase = box(rail, 0.112, 0.009, 0.024, -0.42, 0.071, 0.049, 0x54635b);
  top(
    bubbleBase,
    0,
    0.0048,
    0,
    0.095,
    0.018,
    canvasTex(512, 88, (c, W, H) => {
      c.fillStyle = '#bbcc9e';
      c.fillRect(0, 0, W, H);
      c.fillStyle = '#374642';
      for (const x of [0.4, 0.6]) c.fillRect(W * x - 2, 0, 4, H);
    }),
  );
  const bubble = new THREE.Mesh(new THREE.SphereGeometry(0.007, 16, 10), paint(0xffedb5));
  bubble.scale.set(1.25, 0.55, 0.7);
  bubbleBase.add(bubble);
  bubble.position.y = 0.008;
  const pump = new THREE.Group();
  pump.position.set(-0.47, 0, 0.18);
  group.add(pump);
  box(pump, 0.13, 0.063, 0.086, 0, 0.0315, 0, 0x637d7b);
  const power = box(pump, 0.029, 0.009, 0.029, 0.038, 0.067, 0, 0xb0563a);
  label(pump, '气源', -0.019, 0.0635, 0, 0.062, 0.022);
  const hosePath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.53, 0.038, 0.18),
    new THREE.Vector3(-0.61, 0.022, 0.15),
    new THREE.Vector3(-0.66, 0.044, 0.062),
    new THREE.Vector3(-0.615, 0.079, 0),
  ]);
  group.add(new THREE.Mesh(new THREE.TubeGeometry(hosePath, 32, 0.006, 12, false), paint(0x393f44)));
  const colors = [0xac6449, 0x467d82];
  const carts = colors.map((color, i) => {
    const cart = new THREE.Group();
    rail.add(cart);
    prism(
      cart,
      [
        [-0.038, -0.028],
        [-0.038, -0.019],
        [-0.014, 0.012],
        [0.014, 0.012],
        [0.038, -0.019],
        [0.038, -0.028],
        [0, 0.002],
      ],
      0.088,
      color,
    );
    box(cart, 0.023, 0.008, 0.019, 0.026, 0.016, 0.001, color);
    box(cart, FLAG_WIDTH, 0.034, 0.0025, 0, 0.031, -0.008, 0x433e39);
    label(cart, (i ? '乙' : '甲') + ' 200 g', 0, 0.013, 0.002, 0.072, 0.019);
    const spring = new THREE.Group();
    cart.add(spring);
    const sign = i ? -1 : 1;
    for (const z of [-0.011, 0.011]) box(spring, 0.01, 0.004, 0.003, sign * 0.0495, 0.005, z, 0x78684b);
    box(spring, 0.002, 0.005, 0.025, sign * 0.054, 0.005, 0, 0xc4a361);
    cart.userData.spring = spring;
    cart.position.set(i ? 0 : -0.46, TRACK_Y, 0);
    return cart;
  });
  const gates = GATES.map((x, i) => {
    const gate = new THREE.Group();
    gate.position.x = x;
    rail.add(gate);
    box(gate, 0.026, 0.007, 0.112, 0, 0.062, 0, 0x746b60);
    for (const sign of [-1, 1]) {
      box(gate, 0.013, 0.094, 0.01, 0, 0.112, sign * 0.051, 0x464d50);
      box(gate, 0.006, 0.008, 0.009, 0, TRACK_Y + 0.033, sign * 0.044, 0x935041);
    }
    return gate;
  });
  const timers = GATES.map((x, i) => {
    const base = new THREE.Group();
    base.position.set(x, 0, 0.178);
    group.add(base);
    box(base, 0.172, 0.034, 0.1, 0, 0.017, 0, 0xc4bbb0);
    const tex = canvasTex(1024, 460, () => {}),
      screen = top(base, 0, 0.0343, 0, 0.16, 0.083, tex);
    function draw(entries) {
      const c = tex.canvas.getContext('2d');
      c.fillStyle = '#263739';
      c.fillRect(0, 0, 1024, 460);
      c.textAlign = 'left';
      c.textBaseline = 'middle';
      c.fillStyle = '#e8dcbc';
      c.font = 'bold 66px sans-serif';
      c.fillText((i ? '右门' : '左门') + '   Δt / ms', 34, 63);
      c.font = 'bold 72px sans-serif';
      c.fillStyle = '#f7a37d';
      if (!entries.length) c.fillText('—', 44, 212);
      entries
        .slice(-3)
        .forEach((e, j) =>
          c.fillText(String(j + 1) + '   ' + ((e.exit - e.enter) * 1000).toFixed(1), 44, 164 + j * 99),
        );
      tex.needsUpdate = true;
    }
    const cable = new THREE.CatmullRomCurve3([
      new THREE.Vector3(x, 0.087, 0.053),
      new THREE.Vector3(x + 0.024, 0.022, 0.082),
      new THREE.Vector3(x + 0.04, 0.005, 0.122),
      new THREE.Vector3(x + 0.047, 0.018, 0.13),
    ]);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(cable, 20, 0.0018, 8, false), paint(0x424c4e)));
    draw([]);
    return { screen, draw };
  });
  box(rail, 0.19, 0.006, 0.024, 0, 0.063, 0.052, 0x778580);
  label(rail, '10 mm 遮光片   +x →', 0, 0.067, 0.052, 0.18, 0.02);
  const weight = box(group, 0.037, 0.015, 0.027, 0, 0, 0, 0x9c8060);
  label(weight, '100 g', 0, 0.0077, 0, 0.034, 0.02);
  const rack = box(group, 0.16, 0.009, 0.074, 0.49, 0.0045, 0.16, 0x997c5a);
  const sleeves = colors.map((_, i) => {
    const o = box(group, 0.011, 0.02, 0.035, 0, 0, 0, i ? 0x839189 : 0x9b9684);
    label(o, i ? '乙' : '甲', 0, 0.0102, 0, 0.009, 0.016);
    return o;
  });
  function massAt(index) {
    if (index === null) {
      group.attach(weight);
      weight.position.set(0.48, 0.017, 0.167);
    } else {
      carts[index].add(weight);
      weight.position.set(-0.024, 0.02, 0.002);
    }
  }
  function sleeveAt(i, on) {
    const o = sleeves[i];
    carts[i].userData.spring.visible = !on;
    if (on) {
      carts[i].add(o);
      o.position.set(i ? -0.0495 : 0.0495, 0.005, 0);
    } else {
      group.attach(o);
      o.position.set(0.435 + i * 0.028, 0.019, 0.15);
    }
  }
  function level(slope) {
    // 右端为支点。左调平脚升降，导轨和门共同倾斜。
    rail.rotation.z = Math.atan(slope);
    rail.position.y = -0.48 * Math.sin(rail.rotation.z);
    screw.rotation.y = -slope * 185;
    bubble.position.x = Math.max(-0.037, Math.min(0.037, slope * 5.5));
  }
  return {
    group,
    rail,
    screw,
    power,
    weight,
    sleeves,
    carts,
    gates,
    timers,
    massAt,
    sleeveAt,
    level,
    dispose() {
      textures.forEach((tex) => tex.dispose());
    },
  };
}
