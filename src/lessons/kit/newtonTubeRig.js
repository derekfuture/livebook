import * as THREE from 'three';
import { block, wire, caption } from './electronicsBench.js';
import { canvasTex } from './props.js';
import { paint } from '../../live/ink.js';
import { TUBE_DROP } from './newtonTube.js';

export const CX = -0.067,
  CY = 0.232;
function cylinder(parent, r, h, x, y, z, color) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 32), paint(color));
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
function feather() {
  const g = new THREE.Group(),
    shape = new THREE.Shape();
  shape.moveTo(0, -0.009);
  shape.quadraticCurveTo(-0.007, -0.005, -0.005, 0.006);
  shape.lineTo(-0.002, 0.005);
  shape.lineTo(-0.004, 0.01);
  shape.quadraticCurveTo(-0.003, 0.014, 0.001, 0.014);
  shape.quadraticCurveTo(0.007, 0.008, 0.005, 0.004);
  shape.lineTo(0.003, 0.003);
  shape.lineTo(0.005, 0.002);
  shape.quadraticCurveTo(0.006, -0.005, 0, -0.009);
  const vane = new THREE.Mesh(
    new THREE.ShapeGeometry(shape),
    new THREE.MeshBasicMaterial({ color: 0xc69b53, side: THREE.DoubleSide }),
  );
  g.add(vane);
  for (let i = 0; i < 6; i++) {
    const y = -0.006 + i * 0.003;
    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.003, y + 0.003, 0.0001),
      new THREE.Vector3(0, y, 0.0001),
      new THREE.Vector3(0.004, y + 0.004, 0.0001),
    ]);
    g.add(new THREE.Line(geom, new THREE.LineBasicMaterial({ color: 0x886934 })));
  }
  const stem = cylinder(g, 0.00055, 0.028, 0, 0, 0, 0xb68c54);
  stem.rotation.z = -0.05;
  g.rotation.z = -0.26;
  return g;
}
export function newtonTubeRig() {
  const group = new THREE.Group(),
    tube = new THREE.Group();
  tube.position.set(CX, CY, 0);
  group.add(tube);
  block(group, 0.122, 0.012, 0.092, CX, 0.006, -0.02, 0x465962);
  block(group, 0.018, CY, 0.02, CX, CY / 2, -0.044, 0x949c9c);
  const bearing = cylinder(group, 0.01, 0.052, CX, CY, -0.029, 0x808684);
  bearing.rotation.x = Math.PI / 2;
  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.385, 48, 1, true),
    new THREE.MeshPhongMaterial({
      color: 0xa7d5df,
      transparent: true,
      opacity: 0.17,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  tube.add(glass);
  const gates = [];
  for (const s of [-1, 1]) {
    cylinder(tube, 0.032, 0.012, 0, s * 0.195, 0, 0x5d6b6b);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.0013, 8, 44), paint(0x8eafb7));
    rim.rotation.x = Math.PI / 2;
    rim.position.y = s * 0.188;
    tube.add(rim);
    const gate = new THREE.Group();
    gate.position.set(0.029, s * 0.183, 0);
    tube.add(gate);
    const button = block(gate, 0.024, 0.012, 0.016, 0.018, 0, 0.012, 0xb36443);
    const fork = new THREE.Group();
    gate.add(fork);
    for (const z of [-0.004, 0.004]) block(fork, 0.05, 0.0016, 0.0018, -0.02, -s * 0.027, z, 0x818b8a);
    block(fork, 0.002, 0.029, 0.014, 0.005, -s * 0.013, 0, 0x818b8a);
    // 铁片薄、羽毛长。阶形托座支承两者，让两个中心具有相同的有效落差。
    block(fork, 0.014, 0.013, 0.011, -0.04, -s * 0.0205, 0, 0x818b8a);
    for (const x of [-0.011, 0.01]) {
      block(tube, 0.009, 0.003, 0.006, x, s * 0.17, -0.029, 0x42494d);
    }
    gates.push({ gate, button, fork, s });
  }
  const iron = cylinder(tube, 0.008, 0.002, 0, 0, 0, 0x626d70);
  iron.rotation.z = 0.14;
  const plume = feather();
  tube.add(plume);
  const pump = block(group, 0.092, 0.055, 0.072, 0.105, 0.031, -0.016, 0x798f91);
  const switchKey = cylinder(group, 0.009, 0.009, 0.129, 0.062, -0.006, 0xb4513f);
  block(group, 0.045, 0.03, 0.038, 0.055, 0.02, 0.052, 0x8a8a76);
  const valve = new THREE.Group();
  valve.position.set(0.055, 0.038, 0.052);
  group.add(valve);
  cylinder(valve, 0.009, 0.012, 0, 0, 0, 0x838a8d);
  block(valve, 0.038, 0.006, 0.009, 0, 0.008, 0, 0xb58946);
  caption(group, '抽气  ·  关  ·  进气', 0.055, 0.006, 0.085, 0.073, 0.013);
  wire(
    group,
    [
      [CX, CY, -0.046],
      [CX - 0.019, 0.182, -0.064],
      [-0.038, 0.02, -0.091],
      [0.018, 0.012, -0.05],
      [0.046, 0.019, 0.052],
    ],
    0x4a5050,
    0.002,
  );
  wire(
    group,
    [
      [0.078, 0.02, 0.052],
      [0.095, 0.012, 0.055],
      [0.107, 0.022, 0.019],
    ],
    0x495051,
    0.002,
  );
  block(group, 0.061, 0.008, 0.046, 0.115, 0.004, -0.075, 0x515d60);
  block(group, 0.012, 0.065, 0.012, 0.115, 0.038, -0.075, 0x788689);
  block(group, 0.104, 0.052, 0.014, 0.115, 0.094, -0.075, 0x515d60);
  const tex = canvasTex(620, 310, () => {}),
    ctx = tex.canvas.getContext('2d');
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.099, 0.047), new THREE.MeshBasicMaterial({ map: tex }));
  screen.position.set(0.115, 0.094, -0.0675);
  group.add(screen);
  const clock = (t) => (t === null ? '—' : t.toFixed(3) + ' s');
  let last = '';
  function display(p, ironTime, featherTime) {
    const values = [p.toFixed(1), clock(ironTime), clock(featherTime)];
    if (values.join('|') === last) return;
    last = values.join('|');
    ctx.fillStyle = '#d8e4cf';
    ctx.fillRect(0, 0, 620, 310);
    ctx.fillStyle = '#30483e';
    ctx.font = '42px sans-serif';
    ctx.fillText('管内压强   ' + values[0] + ' kPa', 22, 61);
    ctx.fillText('铁片    ' + values[1], 22, 160);
    ctx.fillText('羽毛    ' + values[2], 22, 249);
    tex.needsUpdate = true;
  }
  function pieces(end, distIron, distFeather) {
    iron.position.set(-0.011, end * (TUBE_DROP / 2 - distIron), 0);
    plume.position.set(0.01, end * (TUBE_DROP / 2 - distFeather), 0);
  }
  return { group, tube, gates, glass, pump, switchKey, valve, screen, display, pieces, dispose: () => tex.dispose() };
}
