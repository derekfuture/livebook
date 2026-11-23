// 图 3.3-2 的叠片铁芯、带抽头线圈和活动铁轭。未装配时各件放在同一张实验台上。
import * as THREE from 'three';
import { inked, paint } from '../../live/ink.js';
import { textPlate } from './props.js';
import { meterProbeHandle } from './meterProbes.js';
import { multimeterTool } from './multimeterTool.js';
import { TAP_TURNS } from './transformer.js';

export const LEGS = [-0.11, 0.002],
  CORE_Z = -0.053,
  LEG_TOP = 0.103,
  BASE_H = 0.018;
export const AC_STOPS = [
  { label: 'OFF', mode: 'off' },
  { label: '2.5 V ~', mode: 'volt', range: 2.5 },
  { label: '10 V ~', mode: 'volt', range: 10 },
  { label: '50 V ~', mode: 'volt', range: 50 },
];
function block(parent, x, y, z, w, h, d, c) {
  const obj = inked(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), paint(c)), { width: 0.65 });
  obj.position.set(x, y, z);
  parent.add(obj);
  return obj;
}
function legend(parent, text, x, y, z, w, h) {
  const label = textPlate(text, { w, h, bg: '#e9dfc7', color: '#30383a' });
  label.rotation.x = -Math.PI / 2;
  label.position.set(x, y, z);
  parent.add(label);
}
function post(parent, x, y, z, c) {
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.009, 16), paint(c));
  pin.position.set(x, y + 0.0045, z);
  parent.add(pin);
  return new THREE.Vector3(x, y + 0.009, z);
}
function laminated(parent, x, y, z, w, h, d) {
  block(parent, x, y, z, w, h, d, 0x657077);
  for (let i = 1; i < 8; i++) {
    const layer = new THREE.Mesh(new THREE.BoxGeometry(w + 0.00015, 0.00036, d + 0.0002), paint(0x455158));
    layer.position.set(x, y - h / 2 + (i * h) / 8, z);
    parent.add(layer);
  }
}
// 连续矩形孔，铁芯可以真正穿过线圈和两个凸缘。
function bobbin(w, d, h, innerW, innerD, color) {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, -d / 2);
  shape.lineTo(w / 2, -d / 2);
  shape.lineTo(w / 2, d / 2);
  shape.lineTo(-w / 2, d / 2);
  shape.closePath();
  const bore = new THREE.Path();
  bore.moveTo(-innerW / 2, -innerD / 2);
  bore.lineTo(-innerW / 2, innerD / 2);
  bore.lineTo(innerW / 2, innerD / 2);
  bore.lineTo(innerW / 2, -innerD / 2);
  bore.closePath();
  shape.holes.push(bore);
  const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  return new THREE.Mesh(g, paint(color));
}
function winding() {
  const group = new THREE.Group();
  const innerW = 0.032,
    innerD = 0.034;
  group.add(bobbin(0.061, 0.061, 0.004, innerW, innerD, 0x534d47));
  const winding = bobbin(0.055, 0.055, 0.05, innerW, innerD, 0xb76d3d);
  winding.position.y = 0.004;
  group.add(winding);
  // 外层漆包线的匝纹；接线柱标的是从共同端起的有效匝数。
  for (let i = 1; i < 50; i += 2) {
    const turn = bobbin(0.0553, 0.0553, 0.00035, innerW, innerD, 0x8f562f);
    turn.position.y = 0.004 + i * 0.001;
    group.add(turn);
  }
  const flange = bobbin(0.067, 0.067, 0.004, innerW, innerD, 0x564f46);
  flange.position.y = 0.054;
  group.add(flange);
  block(group, 0, 0.054, 0.046, 0.096, 0.007, 0.035, 0x596269);
  const terminals = new Map();
  TAP_TURNS.forEach((turns, i) => {
    const x = (i - 1.5) * 0.022;
    terminals.set(turns, post(group, x, 0.0575, 0.042, turns ? 0x956349 : 0x353c40));
    legend(group, String(turns), x, 0.0577, 0.057, 0.021, 0.009);
  });
  return { group, terminals };
}
function cableGeometry(start, end, bend) {
  // 导线从插孔上方绕过机壳前沿，再落到桌面，不能从表壳底下穿出。
  const lip = start.clone().add(new THREE.Vector3(0, 0.002, 0.034));
  const slack = start.clone().lerp(end, 0.52);
  slack.z = Math.max(lip.z + bend, end.z + 0.030);
  slack.y = 0.003;
  const approach = end.clone().add(new THREE.Vector3(0, 0, 0.017));
  const curve = new THREE.CatmullRomCurve3([start, lip, slack, approach, end]);
  return new THREE.TubeGeometry(curve, 30, 0.0014, 7, false);
}
export function transformerRig() {
  const group = new THREE.Group();
  const mid = (LEGS[0] + LEGS[1]) / 2;
  laminated(group, mid, BASE_H / 2, CORE_Z, 0.15, BASE_H, 0.028);
  for (const x of LEGS) laminated(group, x, (LEG_TOP + BASE_H) / 2, CORE_Z, 0.027, LEG_TOP - BASE_H, 0.028);
  const yoke = new THREE.Group();
  laminated(yoke, 0, 0.01, 0, 0.15, 0.02, 0.028);
  const homeYoke = new THREE.Vector3(mid, 0, -0.136);
  yoke.position.copy(homeYoke);
  group.add(yoke);
  const coils = [winding(), winding()];
  const homes = LEGS.map((x) => new THREE.Vector3(x, 0, 0.08));
  coils.forEach((c, i) => {
    c.group.position.copy(homes[i]);
    group.add(c.group);
  });
  const source = new THREE.Group();
  source.position.set(-0.245, 0, -0.021);
  group.add(source);
  block(source, 0, 0.018, 0, 0.104, 0.036, 0.089, 0x65747a);
  legend(source, '3 V ~   50 Hz', 0, 0.0365, -0.022, 0.079, 0.016);
  const sockets = [post(source, -0.028, 0.036, 0.024, 0x895747), post(source, 0.028, 0.036, 0.024, 0x343a41)];
  const power = block(source, 0, 0.041, 0.016, 0.019, 0.009, 0.019, 0x996347);
  const indicator = new THREE.Mesh(
    new THREE.SphereGeometry(0.003, 16, 10),
    new THREE.MeshBasicMaterial({ color: 0x394d42 }),
  );
  indicator.position.set(0.03, 0.037, -0.004);
  source.add(indicator);
  const meter = multimeterTool({ stops: AC_STOPS, ac: true });
  meter.mechanical = 0;
  meter.group.position.set(0.155, 0, -0.018);
  group.add(meter.group);
  const tap = (side, n) => group.worldToLocal(coils[side].group.localToWorld(coils[side].terminals.get(n).clone()));
  const leads = [];
  const parks = [
    [-0.215, 0.002, 0.071],
    [-0.19, 0.002, 0.11],
    [0.131, 0.002, 0.096],
    [0.169, 0.002, 0.124],
  ];
  for (let i = 0; i < 4; i++) {
    const color = i % 2 ? 0x363d40 : 0xb45345;
    const lead = i < 2 ? new THREE.Group() : meterProbeHandle(color, i === 2 ? -0.35 : 0.35).handle;
    if (i < 2) {
      const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.014, 16), paint(color));
      knob.position.y = 0.007;
      lead.add(knob);
    }
    group.add(lead);
    lead.position.fromArray(parks[i]);
    const socket =
      i < 2
        ? source.localToWorld(sockets[i].clone())
        : meter.group.localToWorld(new THREE.Vector3(...meter.terminals[i === 2 ? 'red' : 'black']));
    group.worldToLocal(socket);
    const wire = new THREE.Mesh(new THREE.BufferGeometry(), paint(color));
    group.add(wire);
    wire.raycast = () => {};
    const item = { obj: lead, home: new THREE.Vector3(...parks[i]), socket, wire, side: null, turns: null };
    leads.push(item);
  }
  function drawLead(i) {
    const l = leads[i];
    const end = l.obj.position.clone();
    if (i >= 2) {
      const grip = l.obj.children[0];
      grip.rotation.x = Math.acos(
        THREE.MathUtils.clamp((0.013 - end.y) / (0.037 * Math.cos(grip.rotation.z)), -0.25, 0.6),
      );
      group.worldToLocal(grip.localToWorld(end.set(0, 0.037, 0)));
    } else end.y += 0.01;
    l.wire.geometry.dispose();
    l.wire.geometry = cableGeometry(l.socket, end, i < 2 ? 0.025 : 0.045);
  }
  leads.forEach((_, i) => drawLead(i));
  return { group, coils, homes, yoke, homeYoke, power, indicator, source, meter, leads, tap, drawLead };
}
