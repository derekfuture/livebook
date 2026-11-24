// 图 2.2-1：筒固定在架上，中空柱塞和压力表一起移动，读柱塞下端对应的尺刻。
import * as THREE from 'three';
import { paint, inked } from '../../live/ink.js';
import { canvasTex } from './props.js';
import { AREA } from './gasColumn.js';

export const ZERO_Y = 0.027,
  DIAL_R = 0.022,
  STEM = 0.070,
  DIAL_FRONT = 0.008;
export const CAP_HOME = new THREE.Vector3(0.037, 0.010, 0);
export const SEAT = new THREE.Vector3(0, ZERO_Y - 0.005, 0);
export const dialAngle = (kPa) => (kPa / 300 - 0.5) * Math.PI * 1.32;
function cylinder(parent, x, y, z, r, h, color) {
  const obj = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 40), paint(color));
  obj.position.set(x, y, z);
  parent.add(obj);
  return obj;
}
function block(parent, x, y, z, w, h, d, color) {
  const mesh = inked(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), paint(color)), { width: 0.65 });
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}
function dialTexture() {
  return canvasTex(1024, 1024, (g, w, h) => {
    const c = w / 2;
    g.fillStyle = '#eeeadb';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#263e45';
    g.fillStyle = '#263e45';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '56px sans-serif';
    for (let k = 0; k <= 300; k += 5) {
      const a = dialAngle(k),
        s = Math.sin(a),
        v = -Math.cos(a);
      const major = k % 50 === 0,
        inner = major ? 0.74 : k % 10 === 0 ? 0.81 : 0.86;
      g.lineWidth = major ? 6 : 3;
      g.beginPath();
      g.moveTo(c + 0.91 * c * s, c + 0.91 * c * v);
      g.lineTo(c + c * inner * s, c + c * inner * v);
      g.stroke();
      if (major) g.fillText(String(k), c + c * 0.62 * s, c + c * 0.62 * v);
    }
    g.font = '42px sans-serif';
    g.fillText('绝对压强 / kPa', c, c * 1.48);
  });
}
export function gasColumnRig() {
  const group = new THREE.Group(),
    holder = new THREE.Group();
  group.add(holder);
  block(group, 0, 0.003, 0, 0.101, 0.006, 0.056, 0x595c58);
  cylinder(group, -0.037, 0.054, -0.009, 0.0025, 0.096, 0x848d8b);
  block(group, -0.022, 0.077, -0.008, 0.037, 0.008, 0.01, 0x996343);
  const clamp = new THREE.Mesh(new THREE.TorusGeometry(0.0072, 0.002, 10, 40), paint(0xaa7852));
  clamp.rotation.x = Math.PI / 2;
  clamp.position.y = 0.077;
  group.add(clamp);
  const innerRadius = Math.sqrt(AREA / Math.PI);
  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(innerRadius + 0.00055, innerRadius + 0.00055, 0.052, 48, 1, true),
    paint(0xb6d3cf, { side: THREE.DoubleSide, transparent: true, opacity: 0.24, depthWrite: false }),
  );
  glass.position.y = ZERO_Y + 0.026;
  group.add(glass);
  cylinder(group, 0, ZERO_Y - 0.001, 0, 0.0062, 0.002, 0x9eada6);
  cylinder(group, 0, ZERO_Y - 0.004, 0, 0.0022, 0.006, 0xb0a594);
  // 共用一组刻线。横截面积 1 cm²，每 1 mm 柱长对应 0.1 cm³。
  const rulerTex = canvasTex(600, 1400, (g, w, h) => {
    g.fillStyle = '#f0e4c8';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#293e43';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const yAt = mm => h * (1 - (mm + 2) / 59);
    g.font = 'bold 62px sans-serif';
    g.fillText('mm', 271, yAt(54));
    g.fillText('cm³', 475, yAt(54));
    for (let mm = 0; mm <= 50; mm++) {
      const y = yAt(mm);
      const major = mm % 10 === 0;
      g.fillRect(0, y - 2, major ? 153 : mm % 5 === 0 ? 109 : 62, major ? 6 : 4);
      if (major) {
        g.font = '74px sans-serif';
        g.fillText(String(mm), 270, y);
        g.fillStyle = '#205f64';
        g.fillText(String(mm / 10), 475, y);
        g.fillStyle = '#293e43';
      }
    }
  });
  const ruler = new THREE.Mesh(new THREE.PlaneGeometry(0.024, 0.059), new THREE.MeshBasicMaterial({ map: rulerTex }));
  ruler.position.set(0.019, ZERO_Y + 0.0275, 0.00585);
  group.add(ruler);
  block(group, 0.019, ZERO_Y + 0.0275, 0.0046, 0.024, 0.059, 0.0022, 0x817968);
  // 尺背的小支脚与立架相连。
  block(group, -0.01, ZERO_Y + 0.049, -0.008, 0.06, 0.002, 0.003, 0x795c45);
  block(group, 0.015, ZERO_Y + 0.049, -0.002, 0.006, 0.003, 0.012, 0x795c45);
  // 固定在筒口的摩擦定位套持续支撑柱塞，松手读数时保持位置。
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.0033, 0.0013, 8, 32), paint(0x686358));
  collar.rotation.x = Math.PI / 2;
  collar.position.y = ZERO_Y + 0.05;
  group.add(collar);
  block(group, -0.005, ZERO_Y + 0.05, 0, 0.006, 0.002, 0.003, 0x78674f);
  const piston = cylinder(holder, 0, 0.0013, 0, innerRadius, 0.0026, 0x8d754f);
  cylinder(holder, 0, 0.025, 0, 0.0024, 0.05, 0xa6aaa1);
  const grip = cylinder(holder, 0, 0.045, 0, 0.009, 0.006, 0xab6547);
  // 红边与柱塞底面齐平；贴近尺面平视时与刻线在同一高度。
  cylinder(holder, 0, 0.00025, 0, innerRadius + 0.00004, 0.0005, 0x983d2a);
  const gauge = new THREE.Group();
  gauge.position.y = STEM;
  holder.add(gauge);
  const caseBody = new THREE.Mesh(
    new THREE.CylinderGeometry(DIAL_R + 0.001, DIAL_R + 0.001, 0.008, 64),
    paint(0x687674),
  );
  caseBody.rotation.x = Math.PI / 2;
  caseBody.position.z = 0.003;
  gauge.add(caseBody);
  const face = new THREE.Mesh(
    new THREE.CircleGeometry(DIAL_R, 72),
    new THREE.MeshBasicMaterial({ map: dialTexture() }),
  );
  face.position.z = DIAL_FRONT;
  gauge.add(face);
  const pointer = new THREE.Group();
  pointer.position.z = DIAL_FRONT + 0.0003;
  gauge.add(pointer);
  const needle = new THREE.Mesh(
    new THREE.PlaneGeometry(0.00037, DIAL_R * 0.86),
    new THREE.MeshBasicMaterial({ color: 0x3c4244 }),
  );
  needle.position.y = DIAL_R * 0.43;
  pointer.add(needle);
  const hub = new THREE.Mesh(new THREE.CircleGeometry(0.00135, 24), new THREE.MeshBasicMaterial({ color: 0x896142 }));
  hub.position.z = 0.00012;
  pointer.add(hub);
  const cap = new THREE.Group();
  group.add(cap);
  const sleeve = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0033, 0.0033, 0.006, 32, 1, true),
    paint(0x874839, { side: THREE.DoubleSide }),
  );
  cap.add(sleeve);
  cylinder(cap, 0, -0.0034, 0, 0.0033, 0.0008, 0x874839);
  const pick = new THREE.Mesh(
    new THREE.BoxGeometry(0.012, 0.009, 0.012),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  pick.userData.pick = true;
  cap.add(pick);
  function set(length, pressure) {
    holder.position.y = ZERO_Y + length;
    pointer.rotation.z = -dialAngle(Math.min(300, pressure / 1000));
  }
  return { group, holder, piston, grip, gauge, face, ruler, cap, capPick: pick, set };
}
