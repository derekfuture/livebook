// 本课的电子天平、轻弹簧和细线。斜面机械能实验仍使用原来的导轨。
import * as THREE from 'three';
import { paint, inked } from '../../live/ink.js';
import { canvasTex } from './props.js';
import { momentumRig, TRACK_Y } from './momentumRig.js';

export const point = (x, y, z) => new THREE.Vector3(x, y, z);
export const panSeat = point(0, 0.073, 0.215);
export const coilHome = point(0.494, 0.023, 0.25);
export const freeLength = 0.104;
export const springSeat = point(-0.011, TRACK_Y + 0.018, 0);

export function momentumBench() {
  const rig = momentumRig(),
    { group, carts } = rig;
  const textures = [];
  function box(parent, size, at, color) {
    const mesh = inked(new THREE.Mesh(new THREE.BoxGeometry(...size), paint(color)));
    mesh.position.copy(at);
    parent.add(mesh);
    return mesh;
  }
  function pick(parent, w, h, d, x = 0, y = 0, z = 0) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: false }));
    mesh.userData.pick = true;
    parent.add(mesh);
    mesh.position.set(x, y, z);
    return mesh;
  }
  function display(parent, at, w, d, pixels, draw) {
    const tex = canvasTex(...pixels, draw);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: tex }));
    parent.add(mesh);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(at);
    textures.push(tex);
    return mesh;
  }
  const base = box(group, [0.17, 0.027, 0.175], point(0, 0.0135, 0.232), 0x687a79);
  box(group, [0.134, 0.017, 0.092], point(0, 0.0365, panSeat.z), 0xb9c1b8);
  const lcd = display(base, point(0, 0.0138, 0.058), 0.125, 0.039, [512, 144], () => {});
  function weigh(grams) {
    const tex = lcd.material.map,
      c = tex.canvas.getContext('2d');
    c.fillStyle = '#d5dfc2';
    c.fillRect(0, 0, 512, 144);
    c.fillStyle = '#243d32';
    c.font = 'bold 106px monospace';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(grams + ' g', 256, 75);
    tex.needsUpdate = true;
  }
  const lamp = box(rig.power.parent, [0.022, 0.005, 0.013], point(0.038, 0.066, -0.025), 0x384744);
  lamp.material = new THREE.MeshBasicMaterial({ color: 0x384744 });
  const powerPick = pick(rig.power.parent, 0.065, 0.027, 0.077, 0.031, 0.069, 0);
  function air(on) {
    rig.power.rotation.x = on ? -0.25 : 0.15;
    lamp.material.color.setHex(on ? 0x91ff74 : 0x384744);
    rig.power.material.color.setHex(on ? 0x409661 : 0xaf5945);
  }
  const cartPicks = carts.map((cart) => pick(cart, 0.103, 0.063, 0.077, 0, 0.006, 0));
  const springPads = carts.map((cart, i) => {
    const sign = i ? -1 : 1;
    const pad = box(cart, [0.006, 0.031, 0.027], point(sign * 0.052, 0.014, 0), 0x9b8470);
    pad.visible = false;
    // 把编号放在朝向学生的斜面上，加砝码后仍然能辨认甲、乙。
    const topLabel = cart.children.find((o) => o.geometry?.type === 'PlaneGeometry');
    if (topLabel) topLabel.visible = false;
    const badge = display(cart, point(0, -0.0016, 0.025), 0.046, 0.02, [220, 96], (c, w, h) => {
      c.fillStyle = i ? '#d8ece5' : '#f4ddc0';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#283b39';
      c.font = 'bold 83px sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(i ? '乙' : '甲', w / 2, h / 2);
    });
    badge.rotation.x = -Math.atan(0.024 / 0.031);
    return pad;
  });
  const screwPick = pick(rig.screw, 0.066, 0.032, 0.065);
  const sleevePicks = rig.sleeves.map((o) => pick(o, 0.024, 0.033, 0.045));
  const weightPick = pick(rig.weight, 0.048, 0.027, 0.047);
  // 分开两个搭扣的存放位，使每一片都有独立的抓取区。
  const sleeveHome = [point(0.435, 0.02, 0.147), point(0.542, 0.02, 0.147)];
  function setSleeve(i, on) {
    rig.sleeveAt(i, on);
    if (!on) rig.sleeves[i].position.copy(sleeveHome[i]);
  }
  function face(i) {
    return carts[i].localToWorld(point(i ? -0.0495 : 0.0495, 0.005, 0));
  }
  const coil = new THREE.Group();
  group.add(coil);
  const pts = Array.from({ length: 145 }, (_, i) => {
    const angle = (i / 144) * 16 * Math.PI;
    return point((i / 144 - 0.5) * freeLength, 0.011 * Math.cos(angle), 0.011 * Math.sin(angle));
  });
  const wire = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 144, 0.0016, 8, false),
    paint(0xb08045),
  );
  coil.add(wire);
  const coilPick = pick(coil, 0.108, 0.033, 0.04);
  box(group, [0.137, 0.009, 0.055], point(coilHome.x, 0.0045, coilHome.z), 0x967c61);
  const thread = new THREE.Group();
  group.add(thread);
  // 水平细线圈绕住两个滑块，遮光片和两端的光电门仍然露出。
  const ends = [-0.112, 0.14],
    z = 0.039;
  const loop = [
    point(ends[0], 0, -z),
    point(ends[1], 0, -z),
    point(ends[1], 0, z),
    point(ends[0], 0, z),
    point(ends[0], 0, -z),
  ];
  for (let i = 1; i < loop.length; i++) {
    const delta = loop[i].clone().sub(loop[i - 1]);
    const side = new THREE.Mesh(new THREE.CylinderGeometry(0.0014, 0.0014, delta.length(), 8), paint(0x704b37));
    side.quaternion.setFromUnitVectors(point(0, 1, 0), delta.clone().normalize());
    side.position.copy(loop[i - 1]).lerp(loop[i], 0.5);
    thread.add(side);
  }
  const threadPick = pick(thread, 0.18, 0.028, 0.033, 0, 0, z);
  const gateLamps = rig.gates.map((gate) => box(gate, [0.018, 0.009, 0.013], point(0, 0.162, 0.051), 0x53625c));
  function gateLight(i, on) {
    gateLamps[i].material.color.setHex(on ? 0xffb855 : 0x53625c);
  }
  // 大字只画在计时器上，读数之前不抄进笔记本。
  function timer(i, entries) {
    const tex = rig.timers[i].screen.material.map,
      c = tex.canvas.getContext('2d');
    c.fillStyle = '#203633';
    c.fillRect(0, 0, 1024, 460);
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    c.fillStyle = '#dae4cc';
    c.font = 'bold 70px sans-serif';
    c.fillText((i ? '右门' : '左门') + '     Δt / ms', 42, 63);
    c.fillStyle = '#a0b5a7';
    c.font = '60px sans-serif';
    if (!entries.length) c.fillText('—', 55, 239);
    entries.forEach((e, j) => {
      const y = 192 + j * 166;
      c.fillStyle = '#abbbad';
      c.font = '62px sans-serif';
      c.fillText(String(j + 1), 46, y);
      c.fillStyle = '#ffce92';
      c.font = 'bold 135px monospace';
      c.fillText(((e.exit - e.enter) * 1000).toFixed(1), 185, y);
    });
    tex.needsUpdate = true;
  }
  function mark(at) {
    const mesh = display(group, point(at, 0.002, 0.088), 0.066, 0.026, [128, 52], (c, w, h) => {
      c.fillStyle = '#f0dfab';
      c.beginPath();
      c.moveTo(w / 2, 0);
      c.lineTo(w * 0.82, h);
      c.lineTo(w * 0.18, h);
      c.fill();
    });
    mesh.visible = false;
    return mesh;
  }
  const marker = mark(0);
  return {
    ...rig,
    lcd,
    weigh,
    air,
    powerPick,
    cartPicks,
    screwPick,
    sleevePicks,
    weightPick,
    sleeveHome,
    setSleeve,
    face,
    springPads,
    coil,
    coilPick,
    thread,
    threadPick,
    marker,
    gateLight,
    timer,
    dispose() {
      textures.forEach((tex) => tex.dispose());
      rig.dispose();
    },
  };
}
