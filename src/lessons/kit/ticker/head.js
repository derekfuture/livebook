import * as THREE from 'three';
import { paint, inked } from '../../../live/ink.js';
import { PERIOD } from './motion.js';

// 纸带从两条导轨之间穿过。坐标原点在底座下表面的中心。
export const SLOT_Y = 0.044;

// 打点计时器的电源开关（翘板）和指示灯，贴在 parent 里的一个面上：parent 的 x 朝右、y 朝上、z 朝镜头，z 是面的位置。
// 通电：翘板上半边（红）按进去、指示灯亮绿色。s：开关的缩放（面不够大时缩小，样子不变）。返回 show(on)。
export function powerControls(parent, { y, z, rockerX, lampX, s = 1 }) {
  const sw = new THREE.Group();
  sw.position.set(rockerX, y, z);
  sw.scale.setScalar(s);
  parent.add(sw);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.02, 0.004), paint(0x23292e));          // 开关的黑框
  frame.position.z = 0.001;
  sw.add(frame);
  const rocker = new THREE.Group();
  rocker.position.z = 0.004;
  sw.add(rocker);
  for (const [dy, color] of [[0.004, 0xc9402e], [-0.004, 0xe8e2d2]]) {          // 上半边（红，开）、下半边（白，关）
    const half = inked(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.008, 0.006), paint(color)), { width: 0.85 });
    half.position.y = dy;
    rocker.add(half);
  }
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 20, 12), new THREE.MeshBasicMaterial({ color: 0x3a4a3c }));
  lamp.position.set(lampX, y, z + 0.003);
  parent.add(lamp);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.005, 0.0012, 8, 24), paint(0x23292e));
  ring.position.copy(lamp.position);
  parent.add(ring);
  const show = (on) => {
    rocker.rotation.x = on ? 0.5 : -0.5;          // 通电：上半边（红）按进去、朝上翻；断开：下半边（白）按进去
    lamp.material.color.setHex(on ? 0x3fe07a : 0x3a4a3c);
  };
  show(false);
  return show;
}
export function tickerHead() {
  const group = new THREE.Group(),
    metal = 0x53616b;
  function box(w, h, d, x, y, z, color, outline = false) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), paint(color));
    if (outline) inked(mesh, { width: 0.85 });
    mesh.position.set(x, y, z);
    group.add(mesh);
  }
  function cylinder(r, h, x, y, z, color, alongZ = false) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 32), paint(color));
    if (alongZ) mesh.rotation.x = Math.PI / 2;
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  }
  box(0.077, 0.039, 0.072, 0, 0.0195, 0, 0x394b57, true);
  for (const z of [-0.024, 0.024]) box(0.05, 0.015, 0.009, 0, SLOT_Y + 0.003, z, metal);
  box(0.034, 0.011, 0.055, 0, SLOT_Y + 0.014, 0, 0x366a70, true);
  const striker = cylinder(0.003, 0.009, 0, SLOT_Y + 0.006, 0, 0x34414a);
  const light = cylinder(0.004, 0.002, 0.007, SLOT_Y + 0.021, 0, 0xa64836);
  light.material = light.material.clone();
  cylinder(0.008, 0.028, -0.019, SLOT_Y + 0.012, 0, 0x97522c, true);
  for (let i = -3; i <= 3; i++) cylinder(0.0085, 0.0012, -0.019, SLOT_Y + 0.012, i * 0.0035, 0xc07844, true);
  box(0.025, 0.002, 0.006, -0.009, SLOT_Y + 0.013, 0, metal);
  return {
    group,
    update(on, t) {
      light.material.color.setHex(on ? 0xe5653d : 0x5b4138);
      striker.position.y = SLOT_Y + 0.006 + (on ? 0.0015 * Math.sin((t / PERIOD) * 2 * Math.PI) : 0);
      light.scale.setScalar(on ? 1.6 : 1);          // 通电时指示灯亮、大一点，远看也看得出
    },
  };
}
