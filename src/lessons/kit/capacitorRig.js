// 图 10.4-1 的器材和接线。双掷开关只有刀片落在触点上才导通。
import * as THREE from 'three';
import { paint, inked } from '../../live/ink.js';
import { canvasTex } from './props.js';
import { battery, resistorPart } from './circuit.js';
import { capacitorBody, capacitorSelector, capacitorVoltmeter } from './capacitorParts.js';

const CHARGE_COLOR = 0xad4d30, DISCHARGE_COLOR = 0x226e83;
export function capacitorRig() {
  const group = new THREE.Group(),
    textures = [];
  function block(parent, w, h, d, x, y, z, color) {
    const obj = inked(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), paint(color)), { width: 0.8 });
    obj.position.set(x, y, z);
    parent.add(obj);
    return obj;
  }
  function peg(parent, x, y, z, color) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.0045, 0.009, 18), paint(color));
    p.position.set(x, y, z);
    parent.add(p);
    return p;
  }
  function plate(parent, w, d, x, y, z, tex) {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: tex }));
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(x, y, z);
    parent.add(plane);
    textures.push(tex);
    return plane;
  }
  function wire(a, b, color, via = []) {
    const points = [a, ...via, b].map((p) => new THREE.Vector3(...p));
    if (points.length === 2) {
      const middle = points[0].clone().lerp(points[1], 0.5);
      middle.y += 0.008;
      points.splice(1, 0, middle);
    }
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.0014, 7, false), paint(color));
    group.add(tube);
    return tube;
  }
  const source = battery('E', { cells: 4, emf: 1.5 });
  source.group.rotation.y = Math.PI / 2;
  source.group.position.set(-0.167, 0, 0.006);
  group.add(source.group);
  const selector = capacitorSelector(),
    { group: sw, hinge, throws, blade, handle } = selector;
  sw.scale.setScalar(1.18);
  sw.position.set(-0.063, 0, -0.084);
  handle.scale.set(1.55, 1.1, 1.55);
  group.add(sw);
  const resistor = resistorPart('R', { R: 1000 });
  resistor.group.position.set(-0.012, 0, 0.093);
  group.add(resistor.group);
  for (const side of [-1, 1]) {
    const a = new THREE.Vector3(side * 0.013, 0.016, -0.004);
    const b = new THREE.Vector3(side * 0.024, 0.017, 0.006);
    const lead = new THREE.Mesh(new THREE.CylinderGeometry(0.001, 0.001, a.distanceTo(b), 10), paint(0x87908b));
    lead.position.copy(a).lerp(b, 0.5);
    lead.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
    resistor.group.add(lead);
  }
  const capacitor = capacitorBody(),
    { group: cap, positive, negative } = capacitor;
  cap.position.set(0.127, 0, 0.048);
  group.add(cap);
  const meter = new THREE.Group();
  meter.position.set(0.074, 0, -0.086);
  meter.scale.setScalar(1.50);
  group.add(meter);
  block(meter, 0.083, 0.017, 0.065, 0, 0.0085, 0, 0x52625e);
  const center = [512, 596],
    angleFor = (i) => (i / 6) * 0.86;
  const tex = canvasTex(1024, 740, (c, W, H) => {
    c.fillStyle = '#f2edda';
    c.fillRect(0, 0, W, H);
    for (let i = -6; i <= 6; i += 0.5) {
      const q = angleFor(i),
        major = Number.isInteger(i);
      const pt = (r) => [center[0] + r * Math.sin(q), center[1] - r * Math.cos(q)];
      c.strokeStyle = '#344649';
      c.lineWidth = major ? 6 : 3;
      c.beginPath();
      c.moveTo(...pt(480));
      c.lineTo(...pt(major ? 512 : 498));
      c.stroke();
      if (i % 2 === 0) {
        c.fillStyle = '#263e40';
        c.font = 'bold 56px sans-serif';
        c.textAlign = 'center';
        c.fillText(String(i), ...pt(536));
      }
    }
    c.font = 'bold 54px sans-serif';
    c.fillText('mA', W / 2, H * 0.94);
  });
  const dialWidth = 0.075,
    dialHeight = (dialWidth * 740) / 1024;
  const dial = plate(meter, dialWidth, dialHeight, 0, 0.0172, -0.003, tex);
  const needle = new THREE.Group();
  needle.position.set(0, 0.0182, dial.position.z + (center[1] / 740 - 0.5) * dialHeight);
  meter.add(needle);
  const armLength = (480 / 1024) * dialWidth;
  block(needle, 0.00125, 0.0005, armLength, 0, 0, -armLength / 2, 0x923c29);
  const mPos = peg(meter, -0.027, 0.021, 0.028, 0xa44538),
    mNeg = peg(meter, 0.027, 0.021, 0.028, 0x323b40);
  const voltageMeter = capacitorVoltmeter(),
    { group: digital, screen, positive: vPos, negative: vNeg } = voltageMeter;
  digital.position.set(0.204, 0, -0.084);
  digital.scale.setScalar(1.38);
  group.add(digital);
  group.updateMatrixWorld(true);
  const at = (obj) => group.worldToLocal(obj.getWorldPosition(new THREE.Vector3())).toArray();
  const postTop = obj => group.worldToLocal(obj.localToWorld(new THREE.Vector3(0, 0.0045, 0))).toArray();
  const terminal = (part, name) =>
    group.worldToLocal(part.group.localToWorld(new THREE.Vector3(...part.terminals[name]))).toArray();
  const paths = [];
  // sign 是从导线起点到终点的方向；电压表理想，不在它的支路画电流。
  function arrowOn(tube, fraction, chargeSign, dischargeSign) {
    const curve = tube.geometry.parameters.path;
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.0044, 0.013, 12), new THREE.MeshBasicMaterial());
    head.position.copy(curve.getPointAt(fraction));
    head.position.y += 0.008;
    head.visible = false;
    group.add(head);
    paths.push({ head, tangent: curve.getTangentAt(fraction), chargeSign, dischargeSign });
  }
  arrowOn(wire(terminal(source, '+'), at(throws[0]), 0xb44f37,
    [[-0.153, 0.012, -0.143], [-0.1, 0.008, -0.139]]), 0.59, 1, 0);
  arrowOn(wire(terminal(source, '-'), terminal(resistor, 'a'), 0x4c5758,
    [[-0.126, 0.009, 0.12], [-0.066, 0.008, 0.108]]), 0.48, -1, 0);
  arrowOn(wire(at(throws[1]), terminal(resistor, 'a'), 0x536260,
    [[-0.002, 0.014, -0.130], [-0.008, 0.007, 0.036]]), 0.72, 0, 1);
  // 四条表线各有一端已接好。线头移动时，导线弯曲，固定端留在接线柱上。
  const leads = [];
  function meterLead(a, b, color, via, rest, signs) {
    const tube = wire(a, b, color, via);
    if (signs) arrowOn(tube, 0.5, ...signs);
    const route = tube.geometry.parameters.path.points.map(p => p.clone());
    const socket = route[route.length - 1];
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.0048, 0.0036, 0.007, 16), paint(color));
    group.add(tip);
    const home = new THREE.Vector3(...rest);
    const shift = new THREE.Vector3();
    const lead = {
      tip, home, socket, connected: false,
      place(p) {
        tip.position.copy(p);
        shift.subVectors(p, socket);
        const points = route.map((v, i) => {
          const weight = (i / (route.length - 1)) ** 2;
          const point = v.clone().addScaledVector(shift, weight);
          point.y = Math.max(0.005, point.y);
          return point;
        });
        if (!lead.connected) {
          const end = points[points.length - 1];
          end.addScaledVector(points[points.length - 2].clone().sub(end).normalize(), 0.004);
        }
        const curve = new THREE.CatmullRomCurve3(points);
        tube.geometry.dispose();
        tube.geometry = new THREE.TubeGeometry(curve, 32, 0.0014, 7, false);
      },
    };
    lead.place(home);
    leads.push(lead);
  }
  meterLead(at(hinge), postTop(mPos), 0x9d6443,
    [[-0.042, 0.018, -0.037], [0.022, 0.021, -0.026]], [0.016, 0.005, -0.012], [1, -1]);
  meterLead(postTop(positive), postTop(mNeg), 0xa65a40, [], [0.086, 0.005, -0.006], [-1, 1]);
  arrowOn(wire(at(negative), terminal(resistor, 'b'), 0x56615d,
    [[0.16, 0.014, 0.077], [0.13, 0.009, 0.112], [0.045, 0.012, 0.111]]), 0.57, 1, -1);
  meterLead(postTop(vPos), postTop(positive), 0xbb5039, [[0.175, 0.026, -0.043], [0.146, 0.020, 0.008]], [0.147, 0.005, 0.004]);
  meterLead(postTop(vNeg), postTop(negative), 0x414b4b, [[0.232, 0.026, -0.043], [0.20, 0.012, 0.024]], [0.196, 0.005, 0.048]);
  function nameplate(parent, label, w, x, z, y = 0.001) {
    plate(parent, w, 0.012, x, y, z, canvasTex(Math.round(w / 0.012 * 128), 128, (c, W, H) => {
      c.fillStyle = '#f6efdc'; c.fillRect(0, 0, W, H);
      c.fillStyle = '#354743'; c.font = 'bold 103px sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, W / 2, H / 2, W * 0.94);
    }));
  }
  // 这套放大的开关用按实际长宽比绘制的触点编号。
  sw.children.filter(o => o.geometry?.type === 'PlaneGeometry').forEach(o => { o.visible = false; });
  nameplate(group, '1', 0.014, at(throws[0])[0], -0.087, 0.009);
  nameplate(group, '2', 0.014, at(throws[1])[0], -0.087, 0.009);
  nameplate(group, '电阻 R', 0.043, -0.011, 0.12);
  nameplate(group, '电容器 C', 0.060, 0.125, 0.081);
  const grip = new THREE.Mesh(new THREE.SphereGeometry(0.0095, 16, 12), new THREE.MeshBasicMaterial({ visible: false }));
  grip.userData.pick = true;
  grip.position.copy(handle.position);
  blade.add(grip);
  const pivot = group.worldToLocal(blade.getWorldPosition(new THREE.Vector3()));
  const neutral = group.worldToLocal(grip.getWorldPosition(new THREE.Vector3()));
  const radius = pivot.z - neutral.z;
  const up = new THREE.Vector3(0, 1, 0);
  let arrowMode;
  return {
    group, handle, grip, dial, screen, pivot, neutral, radius, leads,
    setAngle: selector.setAngle, throwAngle: selector.throwAngle,
    draw(voltage, current) {
      needle.rotation.y = -angleFor(current * 1000);
      voltageMeter.draw(voltage);
      const mode = Math.abs(current) < 0.00005 ? 0 : Math.sign(current);
      if (mode === arrowMode) return;
      arrowMode = mode;
      for (const { head, tangent, chargeSign, dischargeSign } of paths) {
        const sign = mode > 0 ? chargeSign : mode < 0 ? dischargeSign : 0;
        head.visible = !!sign;
        if (sign) {
          head.quaternion.setFromUnitVectors(up, tangent.clone().multiplyScalar(sign).normalize());
          head.material.color.setHex(mode > 0 ? CHARGE_COLOR : DISCHARGE_COLOR);
        }
      }
    },
    dispose() {
      textures.forEach((t) => t.dispose());
      selector.dispose();
      capacitor.dispose();
      voltageMeter.dispose();
    },
  };
}
