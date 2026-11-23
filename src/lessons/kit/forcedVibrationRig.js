import * as THREE from 'three';
import { paint } from '../../live/ink.js';
import { block, wire } from './electronicsBench.js';
import { canvasTex, textPlate } from './props.js';
export const SPRING_TOP = 0.4,
  SPRING_REST = 0.1,
  BODY_X = [-0.075, 0.075];
export function forcedVibrationRig(model) {
  const group = new THREE.Group(),
    textures = [];
  const cylinder = (parent, radius, length, x, y, z, color) => {
    const o = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 28), paint(color));
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };
  const label = (parent, text, x, y, z, w = 0.05, h = 0.014) => {
    const p = textPlate(text, {
      w,
      h,
      bg: '#e9dfc7',
      font: `bold ${Math.floor(Math.min(((512 * h) / w) * 0.7, 450 / text.length))}px sans-serif`,
    });
    p.position.set(x, y, z);
    parent.add(p);
    textures.push(p.material.map);
    return p;
  };
  block(group, 0.4, 0.08, 0.15, 0, 0.04, 0.015, 0x698785);
  for (const x of [-0.15, 0.15]) cylinder(group, 0.005, 0.44, x, 0.29, -0.035, 0x919b9c);
  block(group, 0.31, 0.012, 0.02, 0, 0.505, -0.035, 0x7d898b);
  const motor = cylinder(group, 0.023, 0.055, 0, 0.47, -0.015, 0x798787);
  motor.rotation.x = Math.PI / 2;
  block(group, 0.045, 0.02, 0.042, 0, 0.498, -0.023, 0x798787);
  const wheel = new THREE.Group();
  wheel.position.set(0, 0.47, 0.023);
  group.add(wheel);
  const disc = cylinder(wheel, 0.026, 0.008, 0, 0, 0, 0x657b80);
  disc.rotation.x = Math.PI / 2;
  const pin = cylinder(wheel, 0.002, 0.012, 0.003, 0, 0.009, 0xb08852);
  pin.rotation.x = Math.PI / 2;
  const mark = block(wheel, 0.006, 0.003, 0.001, 0.019, 0, 0.0045, 0xe8dcc0);
  // One optical index on the wheel provides a full-turn event, independently of the speed setting.
  for (const z of [0.013, 0.034]) block(group, 0.009, 0.012, 0.006, 0.022, 0.47, z, 0x526d70);
  block(group, 0.009, 0.012, 0.027, 0.031, 0.47, 0.0235, 0x526d70);
  wire(
    group,
    [
      [0.035, 0.47, 0.013],
      [0.046, 0.48, -0.025],
      [0.145, 0.48, -0.035],
      [0.145, 0.08, -0.035],
    ],
    0x434f50,
  );
  const beam = new THREE.Group();
  beam.position.set(0, SPRING_TOP, 0.045);
  group.add(beam);
  block(beam, 0.21, 0.008, 0.012, 0, 0, 0, 0xa1a99f);
  // Scotch yoke: the eccentric pin slides in a horizontal slot; the guided beam moves vertically.
  for (const dy of [-0.004, 0.004]) block(beam, 0.054, 0.003, 0.006, 0, 0.07 + dy, -0.009, 0xadb19d);
  for (const x of [-0.026, 0.026]) {
    block(beam, 0.003, 0.011, 0.006, x, 0.07, -0.009, 0xadb19d);
    block(beam, 0.003, 0.07, 0.006, x, 0.035, -0.009, 0xadb19d);
  }
  block(group, 0.31, 0.012, 0.012, 0, 0.374, -0.035, 0x7d898b);
  for (const x of [-0.105, 0.105]) {
    cylinder(group, 0.002, 0.07, x, 0.406, 0.045, 0x8a9693);
    block(group, 0.012, 0.009, 0.08, x, 0.374, 0.005, 0x7e8c89);
    block(beam, 0.009, 0.025, 0.009, x, 0, 0, 0x5e7978);
  }
  const springs = [],
    bodies = [],
    beams = [];
  const springPoints = Array.from({ length: 241 }, (_, i) => {
    const t = i / 240,
      a = t * 12 * 2 * Math.PI;
    const r = 0.007 * Math.min(1, t * 24, (1 - t) * 24);
    return new THREE.Vector3(r * Math.cos(a), t, -r * Math.sin(a));
  });
  // Unit helix is stretched only axially, without reallocating geometry every frame.
  const springGeometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(springPoints), 240, 0.0007, 5, false);
  model.systems.forEach((p, i) => {
    const restY = SPRING_TOP - SPRING_REST - (p.mass * 9.8) / p.stiffness;
    const spring = new THREE.Mesh(springGeometry, paint(0x879196));
    group.add(spring);
    springs.push(spring);
    const body = new THREE.Group();
    body.position.set(BODY_X[i], restY - 0.016, 0.045);
    group.add(body);
    bodies.push(body);
    cylinder(body, 0.016, 0.024, 0, 0, 0, 0xa9a99c);
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.004, 0.0008, 6, 20), paint(0x6c777b));
    hook.position.y = 0.012;
    body.add(hook);
    label(body, i ? 'B' : 'A', 0, 0, 0.0161, 0.015, 0.012);
    block(body, 0.017, 0.006, 0.001, 0.023, 0, 0, 0x6d7371);
    const detector = new THREE.Group();
    detector.position.set(BODY_X[i] + 0.027, restY - 0.016, 0.045);
    group.add(detector);
    for (const z of [-0.012, 0.012]) block(detector, 0.01, 0.015, 0.008, 0, 0, z, 0x637d7b);
    block(detector, 0.009, 0.015, 0.032, 0.009, 0, 0, 0x637d7b);
    block(group, 0.006, restY - 0.096, 0.006, BODY_X[i] + 0.036, (restY - 0.096) / 2 + 0.08, 0.045, 0x8a9693);
    const light = wire(
      detector,
      [
        [0, 0, -0.008],
        [0, 0, 0.008],
      ],
      0xa95743,
      0.00035,
    );
    beams.push(light);
    label(group, i ? 'B 软弹簧' : 'A 硬弹簧', BODY_X[i], 0.105, 0.052, 0.07);
    wire(
      group,
      [
        [BODY_X[i] + 0.036, restY - 0.016, 0.035],
        [BODY_X[i] + 0.044, 0.12, 0.025],
        [BODY_X[i] + 0.044, 0.08, 0.025],
      ],
      0x424f52,
    );
  });
  const power = block(group, 0.025, 0.018, 0.012, -0.17, 0.045, 0.096, 0x9a5546);
  label(group, '电源', -0.17, 0.022, 0.097, 0.034, 0.012);
  const knob = cylinder(group, 0.018, 0.012, -0.115, 0.048, 0.099, 0x424e51);
  knob.rotation.x = Math.PI / 2;
  // Separate pointer pivots in the front (xy) plane with the knob's angle.
  const needle = new THREE.Group();
  needle.position.set(-0.115, 0.048, 0.107);
  group.add(needle);
  block(needle, 0.002, 0.014, 0.001, 0, 0.007, 0, 0xebdfbe);
  label(group, '转速', -0.115, 0.019, 0.098, 0.038, 0.012);
  const record = block(group, 0.025, 0.019, 0.012, 0.173, 0.045, 0.096, 0x967b4e);
  label(group, '测周期', 0.173, 0.021, 0.097, 0.05, 0.012);
  const tex = canvasTex(1000, 420, () => {});
  textures.push(tex);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.215, 0.07), new THREE.MeshBasicMaterial({ map: tex }));
  screen.position.set(0.027, 0.045, 0.091);
  group.add(screen);
  function animate() {
    const s = model.observe();
    wheel.rotation.z = s.phase;
    beam.position.y = SPRING_TOP + s.base;
    s.bodies.forEach((b, i) => {
      const p = model.systems[i],
        lower = SPRING_TOP - SPRING_REST - (p.mass * 9.8) / p.stiffness + b.q;
      bodies[i].position.y = lower - 0.016;
      springs[i].position.set(BODY_X[i], lower, 0.045);
      springs[i].scale.y = SPRING_TOP + s.base - lower;
      beams[i].visible = Math.abs(b.q) > 0.003;
    });
    power.position.z = model.powered ? 0.093 : 0.096;
    needle.rotation.z = -(-0.75 + ((model.frequency - 0.6) / 2) * 1.5) * Math.PI;
  }
  function draw(status, values, count = 0) {
    const g = tex.canvas.getContext('2d');
    g.fillStyle = '#eee7d4';
    g.fillRect(0, 0, 1000, 420);
    g.fillStyle = '#345052';
    g.font = 'bold 47px sans-serif';
    g.fillText('光电周期计 · f / Hz', 25, 58);
    g.font = '38px sans-serif';
    g.fillText(status, 25, 115);
    ['驱动', '钩码 A', '钩码 B'].forEach((name, i) => {
      const x = 30 + i * 330;
      g.font = '42px sans-serif';
      g.fillText(name, x, 190);
      g.font = 'bold 60px sans-serif';
      g.fillText(values?.[i]?.toFixed(2) ?? '—', x, 270);
    });
    g.font = '35px sans-serif';
    g.fillText(`各测 3 个完整周期 · 已记录 ${count} 组`, 25, 360);
    tex.needsUpdate = true;
  }
  return {
    group,
    wheel,
    beam,
    bodies,
    springs,
    knob,
    needle,
    power,
    record,
    screen,
    draw,
    animate,
    dispose() {
      textures.forEach((t) => t.dispose());
    },
  };
}
