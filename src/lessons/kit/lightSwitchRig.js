import * as THREE from 'three';
import { paint } from '../../live/ink.js';
import { canvasTex } from './props.js';
import { block, caption, wire, wireGeometry } from './electronicsBench.js';
import { battery, switchPart } from './circuit.js';
import { EMITTER_WIDTH, EMITTER_Y, SENSOR_Y, SHADE_Y, SHADE_WIDTH, SENSOR_RADIUS, SHADE_FRACTION, FOOTPRINT } from './lightSwitch.js';

export const SENSOR_X = -0.105,
  SENSOR_Z = -0.018,
  SHADE_HOME = SENSOR_X + 0.067;
export const R_POS = [0.031, 0.028, 0.045];
export const knobAngle = (ohms) => (-0.75 + (1.5 * (ohms - 1000)) / 50000) * Math.PI;
export function lightSwitchRig() {
  const group = new THREE.Group(),
    v = (x, y, z) => new THREE.Vector3(x, y, z);
  block(group, 0.42, 0.007, 0.26, 0, -0.0031, 0, 0xc8a97f);
  const lampX = SENSOR_X - 0.045;
  block(group, 0.043, 0.009, 0.044, lampX, 0.0045, -0.092, 0x546168);
  block(group, 0.008, EMITTER_Y + 0.01, 0.009, lampX, (EMITTER_Y + 0.01) / 2, -0.092, 0x8d9696);
  block(group, 0.012, 0.008, 0.083, lampX, EMITTER_Y + 0.012, -0.055, 0x899598);
  block(group, EMITTER_WIDTH + 0.012, 0.012, EMITTER_WIDTH + 0.012, SENSOR_X, EMITTER_Y + 0.006, SENSOR_Z, 0x667477);
  const diffuser = new THREE.Mesh(
    new THREE.PlaneGeometry(EMITTER_WIDTH, EMITTER_WIDTH),
    new THREE.MeshBasicMaterial({ color: 0xfff6d7 }),
  );
  diffuser.rotation.x = Math.PI / 2;
  diffuser.position.set(SENSOR_X, EMITTER_Y - 0.0002, SENSOR_Z);
  group.add(diffuser);
  // 光敏面在滑片下方。电阻的蛇形沟槽也随实际受光变亮或变暗。
  const rgtex = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#c69870';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#845344';
    g.lineWidth = 7;
    g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(53, 46);
    for (let k = 0; k < 7; k++) {
      const x = k % 2 ? 56 : 198,
        y = 46 + 24 * k;
      g.lineTo(x, y);
      g.lineTo(x, y + 20);
    }
    g.stroke();
  });
  const rg = new THREE.Mesh(new THREE.CircleGeometry(SENSOR_RADIUS, 40), new THREE.MeshBasicMaterial({ map: rgtex }));
  const shadeOffset = {value: new THREE.Vector2()};
  rg.material.onBeforeCompile = shader => {
    shader.uniforms.shadeOffset = shadeOffset;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 probePoint;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nprobePoint = vec2(position.x, -position.y);');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 probePoint; uniform vec2 shadeOffset;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec2 center = shadeOffset - probePoint * ${1-SHADE_FRACTION};
        vec2 overlap = max(vec2(0.), min(vec2(${FOOTPRINT/2}), center + ${SHADE_WIDTH/2}) -
          max(vec2(-${FOOTPRINT/2}), center - ${SHADE_WIDTH/2}));
        diffuseColor.rgb *= 1. - .83 * clamp(overlap.x * overlap.y / ${FOOTPRINT**2}, 0., 1.);`);
  };
  rg.rotation.x = -Math.PI / 2;
  rg.position.set(SENSOR_X, SENSOR_Y, SENSOR_Z);
  group.add(rg);
  block(group, 0.026, 0.018, 0.026, SENSOR_X, 0.009, SENSOR_Z, 0x586567);
  caption(group, 'RG', SENSOR_X, 0.001, SENSOR_Z + 0.026);
  for (const x of [SENSOR_X - 0.035, SHADE_HOME + 0.022]) {
    block(group, 0.008, SHADE_Y, 0.009, x, SHADE_Y / 2, SENSOR_Z + 0.039, 0x677271);
  }
  const railZ = SENSOR_Z + 0.039;
  block(group, 0.133, 0.006, 0.007, SENSOR_X + 0.025, SHADE_Y - 0.005, railZ, 0x808a89);
  const shade = new THREE.Group();
  group.add(shade);
  block(shade, SHADE_WIDTH, 0.0018, SHADE_WIDTH, 0, 0, 0, 0x3c4146);
  block(shade, 0.009, 0.003, 0.016, 0, 0, 0.031, 0x826847);
  block(shade, 0.019, 0.006, 0.012, 0, 0.001, 0.039, 0xb78e5f);
  shade.position.set(SHADE_HOME, SHADE_Y, SENSOR_Z);
  const mark = block(group, 0.0016, 0.0006, 0.009, SHADE_HOME, SHADE_Y - 0.0018, railZ, 0x974b38);
  mark.visible = false;
  caption(group, '遮光片', SHADE_HOME, 0.001, 0.054);
  // 电位器的刻度直接印在轴周围，只有旋钮随手势旋转。
  const dialTex = canvasTex(768, 768, (g, w, h) => {
    g.fillStyle = '#e6dbc1';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#354442';
    g.fillStyle = '#354442';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '42px sans-serif';
    for (let i = 0; i <= 10; i++) {
      const a = knobAngle((1 + i * 5) * 1000),
        dx = Math.sin(a),
        dy = -Math.cos(a);
      g.lineWidth = i % 2 ? 4 : 6;
      g.beginPath();
      g.moveTo(w / 2 + dx * 235, h / 2 + dy * 235);
      g.lineTo(w / 2 + dx * 265, h / 2 + dy * 265);
      g.stroke();
      if (i % 2 === 0) g.fillText(String(1 + i * 5), w / 2 + dx * 305, h / 2 + dy * 305);
    }
    g.fillText('R₁ / kΩ', w / 2, h * 0.91);
  });
  block(group, 0.065, 0.016, 0.065, R_POS[0], 0.008, R_POS[2], 0x656c6b);
  const dial = new THREE.Mesh(new THREE.PlaneGeometry(0.062, 0.062), new THREE.MeshBasicMaterial({ map: dialTex }));
  dial.rotation.x = -Math.PI / 2;
  dial.position.set(R_POS[0], 0.0162, R_POS[2]);
  group.add(dial);
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.012, 40), paint(0x49504e));
  knob.position.set(R_POS[0], 0.023, R_POS[2]);
  group.add(knob);
  block(knob, 0.0016, 0.0007, 0.009, 0, 0.006, -0.007, 0xebc689);
  const E = battery('E', { cells: 4 }),
    S = switchPart('S');
  E.group.scale.setScalar(0.64);
  E.group.position.set(0.097, 0, -0.103);
  S.group.position.set(0.149, 0, -0.064);
  group.add(E.group, S.group);
  const point = (part, key) => group.worldToLocal(part.group.localToWorld(v(...part.terminals[key])));
  const plus = point(E, '+'),
    negative = point(E, '-'),
    vs = point(S, 'b');
  wire(group, [plus, [0.172, 0.005, -0.09], point(S, 'a')], 0x945742);
  const ports = {};
  function port(key, x, z, label, color) {
    const jack = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.009, 16), paint(color));
    jack.position.set(x, 0.005, z);
    group.add(jack);
    ports[key] = v(x, 0.011, z);
    caption(group, label, x, 0.001, z + 0.012, 0.017, 0.008);
  }
  port('p1', 0.067, -0.041, '+', 0xb55a4c);
  port('p2', 0.092, -0.041, '+', 0xb55a4c);
  port('n1', 0.067, 0.095, '−', 0x444d50);
  port('n2', 0.092, 0.095, '−', 0x444d50);
  port('c', 0.132, 0.027, 'c', 0x96684a);
  wire(group, [vs, [0.139, 0.003, -0.044], ports.p2, ports.p1], 0xa96349);
  wire(group, [negative, [0.014, 0.003, -0.078], [-0.013, 0.003, 0.093], ports.n1, ports.n2], 0x424a4a);
  const transistor = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.011, 20), paint(0x353d40));
  transistor.position.set(0.128, 0.017, 0.053);
  group.add(transistor);
  const base = [0.119, 0.007, 0.052],
    emitter = [0.14, 0.006, 0.059];
  wire(group, [ports.c, [0.125, 0.005, 0.037], [0.127, 0.013, 0.051]], 0x8b7f68);
  wire(group, [[0.131, 0.014, 0.056], emitter, [0.152, 0.003, 0.09], ports.n2], 0x424a4a);
  wire(group, [base, [0.121, 0.01, 0.052], [0.124, 0.015, 0.053]], 0x9c8c75);
  caption(group, 'b', 0.113, 0.001, 0.064, 0.014, 0.008);
  caption(group, 'e', 0.146, 0.001, 0.066, 0.014, 0.008);
  wire(
    group,
    [
      [SENSOR_X + 0.01, SENSOR_Y - 0.004, SENSOR_Z],
      [SENSOR_X + 0.026, 0.004, SENSOR_Z - 0.001],
      [-0.035, 0.003, 0.011],
      [0.085, 0.003, 0.052],
      base,
    ],
    0x8e715a,
  );
  wire(group, [[R_POS[0] + 0.026, 0.01, R_POS[2]], [0.089, 0.003, 0.047], base], 0x8e715a);
  const r2 = block(group, 0.02, 0.006, 0.007, 0.161, 0.012, -0.009, 0xb79c75);
  for (const x of [-0.006, -0.002, 0.004])
    block(group, 0.0014, 0.0064, 0.0074, r2.position.x + x, 0.012, -0.009, x < 0 ? 0xb1783a : 0x715442);
  wire(group, [vs, [0.193, 0.004, -0.038], [0.176, 0.007, -0.01], [0.171, 0.012, -0.009]], 0xaa664e);
  const led = new THREE.Mesh(
    new THREE.SphereGeometry(0.0065, 24, 18),
    new THREE.MeshBasicMaterial({ color: 0x623a32 }),
  );
  led.position.set(0.166, 0.02, 0.016);
  group.add(led);
  block(group, 0.02, 0.008, 0.018, 0.166, 0.004, 0.016, 0x515b5e);
  wire(
    group,
    [
      [0.151, 0.012, -0.009],
      [0.143, 0.003, 0.002],
      [0.162, 0.015, 0.014],
    ],
    0x96735c,
  );
  caption(group, 'LED', 0.184, 0.001, 0.028);
  caption(group, '330 Ω', 0.187, 0.001, -0.007, 0.031, 0.01);
  const anchors = [v(0.006, 0.011, 0.053), v(SENSOR_X - 0.01, SENSOR_Y - 0.003, SENSOR_Z), v(0.17, 0.015, 0.018)];
  const homes = [v(0.008, 0.005, 0.092), v(-0.054, 0.005, 0.086), v(0.179, 0.005, 0.074)];
  const leads = anchors.map((anchor, i) => {
    const color = [0xa57941, 0x795f51, 0xb65e49][i];
    const plug = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.011, 18), paint(color));
    group.add(plug);
    plug.position.copy(homes[i]);
    const cable = new THREE.Mesh(new THREE.BufferGeometry(), paint(color));
    group.add(cable);
    cable.raycast = () => {};
    return { anchor, home: homes[i], plug, cable, to: null };
  });
  function route(i) {
    const { anchor, plug, cable } = leads[i],
      end = plug.position;
    const bend = anchor.clone().lerp(end, 0.52);
    bend.y = 0.003;
    bend.z += 0.024;
    cable.geometry.dispose();
    cable.geometry = wireGeometry([anchor, bend, end]);
  }
  leads.forEach((l, i) => route(i));
  function draw(resistance, collector) {
    knob.rotation.y = -knobAngle(resistance);
    const b = Math.sqrt(Math.min(1, collector / 0.012));
    led.material.color.setRGB(0.12 + 0.88 * b, 0.024 + 0.1 * b, 0.018 + 0.035 * b);
    shadeOffset.value.set(shade.position.x - SENSOR_X, shade.position.z - SENSOR_Z);
  }
  return { group, S, rg, shade, knob, dial, led, mark, ports, leads, route, draw };
}
