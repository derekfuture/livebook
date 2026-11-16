import * as THREE from 'three';
import { paint } from '../../live/ink.js';
import { canvasTex, textPlate } from './props.js';
import { block, wire } from './electronicsBench.js';
import { SQUAT_BODY, squatPose } from './squatSupport.js';
export const SQUAT_SCALE = 0.18;
export const FORCE_SCREEN = Object.freeze({
  x: 0.115,
  y: 0.17,
  z: -0.0105,
  width: 0.29,
  height: 0.181,
  W: 1024,
  H: 640,
  L: 88,
  R: 990,
  T: 138,
  B: 548,
});
export function forcePlotRange(samples, weight = 539) {
  let low = weight - 100,
    high = weight + 100;
  for (const p of samples) {
    low = Math.min(low, p.force - 25);
    high = Math.max(high, p.force + 25);
  }
  return [Math.max(0, Math.floor(low / 50) * 50), Math.ceil(high / 50) * 50];
}
export function drawForceTrace(
  c,
  samples,
  { weight = 539, value = 539, recording = false, window = [0, 12], selected = [] } = {},
) {
  const s = FORCE_SCREEN,
    [start, end] = window,
    [low, high] = forcePlotRange(samples, weight),
    X = (t) => s.L + ((t - start) / (end - start)) * (s.R - s.L),
    Y = (f) => s.B - ((f - low) / (high - low)) * (s.B - s.T);
  c.fillStyle = '#eee9d9';
  c.fillRect(0, 0, s.W, s.H);
  c.fillStyle = '#334a4c';
  c.textAlign = 'left';
  c.font = 'bold 38px sans-serif';
  c.fillText('力传感器 · 压力', 25, 45);
  c.textAlign = 'right';
  c.fillText(value.toFixed(0) + ' N', s.W - 25, 45);
  c.textAlign = 'left';
  c.font = '27px sans-serif';
  c.fillText(
    recording ? '采集中 · 上下拖动人体' : samples.length ? '已停止 · 点曲线观察' : '待采集 · 点下方按钮',
    25,
    88,
  );
  c.textAlign = 'right';
  c.fillText('虚线 ' + weight.toFixed(0) + ' N · 自动量程', s.W - 25, 88);
  c.lineWidth = 1.5;
  c.font = '26px sans-serif';
  for (let f = low; f <= high; f += high - low > 500 ? 100 : 50) {
    const y = Y(f);
    c.strokeStyle = '#c4cec3';
    c.beginPath();
    c.moveTo(s.L, y);
    c.lineTo(s.R, y);
    c.stroke();
    c.fillStyle = '#3c5653';
    c.textAlign = 'right';
    c.fillText(String(f), s.L - 12, y + 9);
  }
  for (let k = 0; k <= 6; k++) {
    const t = start + ((end - start) * k) / 6,
      x = X(t);
    c.strokeStyle = '#c4cec3';
    c.beginPath();
    c.moveTo(x, s.T);
    c.lineTo(x, s.B);
    c.stroke();
    c.fillStyle = '#3c5653';
    c.textAlign = 'center';
    c.fillText(t.toFixed(1), x, s.B + 36);
  }
  c.textAlign = 'right';
  c.fillText('t / s', s.R, s.B + 78);
  c.textAlign = 'left';
  c.fillText('F / N', 8, s.T - 12);
  c.setLineDash([9, 7]);
  c.strokeStyle = '#607e7a';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(s.L, Y(weight));
  c.lineTo(s.R, Y(weight));
  c.stroke();
  c.setLineDash([]);
  c.save();
  c.beginPath();
  c.rect(s.L, s.T, s.R - s.L, s.B - s.T);
  c.clip();
  c.strokeStyle = '#ae5940';
  c.lineWidth = 3;
  c.beginPath();
  let previous = null;
  for (const p of samples) {
    const x = X(p.t),
      y = Y(p.force);
    if (!previous || p.t - previous.t > 0.031) c.moveTo(x, y);
    else c.lineTo(x, y);
    previous = p;
  }
  c.stroke();
  selected.forEach((p, i) => {
    c.fillStyle = '#305d79';
    c.beginPath();
    c.arc(X(p.t), Y(p.force), 7, 0, 2 * Math.PI);
    c.fill();
    c.font = 'bold 26px sans-serif';
    c.textAlign = 'center';
    c.fillText(String(i + 1), X(p.t), Y(p.force) + (p.force > weight ? -16 : 30));
  });
  c.restore();
}
export function squatSupportRig() {
  const group = new THREE.Group(),
    human = new THREE.Group();
  human.name = 'support-human';
  human.position.set(-0.16, 0.018, 0);
  human.scale.setScalar(SQUAT_SCALE);
  group.add(human);
  const platform = block(group, 0.115, 0.016, 0.105, -0.16, 0.008, 0.015, 0x647b7b);
  platform.name = 'force-platform';
  block(group, 0.105, 0.002, 0.095, -0.16, 0.017, 0.015, 0xd3d4c6);
  function sphere(parent, r, color, scale = [1, 1, 1]) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), paint(color));
    m.scale.set(...scale);
    parent.add(m);
    return m;
  }
  function segment(radius, color) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, 16), paint(color));
    human.add(m);
    return m;
  }
  function line(m, a, b) {
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.scale.y = a.distanceTo(b);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  }
  const legs = [-0.095, 0.095].map((x) => {
    const foot = block(human, 0.12, 0.08, 0.28, x, 0.04, 0.06, 0x454b51);
    foot.name = 'fixed-foot';
    return {
      x,
      shin: segment(0.052, 0x606e7b),
      thigh: segment(0.069, 0x606e7b),
      knee: sphere(human, 0.058, 0x596877),
      hip: sphere(human, 0.07, 0x596877),
    };
  });
  const upper = new THREE.Group();
  human.add(upper);
  const pelvis = sphere(upper, 0.14, 0x606e7b, [1.25, 0.7, 0.85]);
  pelvis.position.y = 0.02;
  const torso = sphere(upper, 0.2, 0x477b91, [0.84, 1.28, 0.5]);
  torso.position.y = 0.27;
  torso.name = 'drag-torso';
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.047, 0.049, 0.09, 16), paint(0xd4b18c));
  neck.position.y = 0.55;
  upper.add(neck);
  const head = sphere(upper, 0.11, 0xd4b18c, [0.82, 1.08, 0.9]);
  head.position.set(0, 0.69, 0);
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.112, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.46),
    paint(0x45413d),
  );
  hair.scale.set(0.84, 1.08, 0.92);
  hair.position.copy(head.position);
  upper.add(hair);
  const nose = sphere(upper, 0.022, 0xcda782, [0.65, 1, 1]);
  nose.position.set(0, 0.685, 0.096);
  for (const x of [-0.035, 0.035]) {
    const eye = sphere(upper, 0.007, 0x46463f);
    eye.position.set(x, 0.715, 0.087);
  }
  // Arms stay beside the torso; their fixed contribution is included in torsoMass/torsoCom.
  for (const x of [-0.2, 0.2]) {
    const shoulder = sphere(upper, 0.055, 0x477b91);
    shoulder.position.set(x, 0.46, 0);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.043, 0.27, 16), paint(0x477b91));
    arm.position.set(x, 0.33, 0.025);
    arm.rotation.x = -0.18;
    upper.add(arm);
    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.029, 0.034, 0.22, 16), paint(0xd4b18c));
    forearm.position.set(x, 0.102, 0.07);
    forearm.rotation.x = -0.18;
    upper.add(forearm);
    const hand = sphere(upper, 0.038, 0xd4b18c, [0.8, 1.15, 0.8]);
    hand.position.set(x, -0.005, 0.09);
  }
  function pose(angle) {
    const p = squatPose(angle);
    upper.position.set(0, p.hip.y, p.hip.z);
    upper.rotation.x = p.lean;
    legs.forEach((l) => {
      const ankle = new THREE.Vector3(l.x, SQUAT_BODY.ankle, 0),
        knee = new THREE.Vector3(l.x, p.knee.y, p.knee.z),
        hip = new THREE.Vector3(l.x, p.hip.y, p.hip.z);
      line(l.shin, ankle, knee);
      line(l.thigh, knee, hip);
      l.knee.position.copy(knee);
      l.hip.position.copy(hip);
    });
  }
  pose(SQUAT_BODY.standing);
  const s = FORCE_SCREEN;
  block(group, 0.32, 0.23, 0.018, s.x, 0.155, -0.02, 0x607a79);
  block(group, 0.13, 0.012, 0.09, s.x, 0.006, -0.04, 0x607a79);
  block(group, 0.014, 0.045, 0.014, s.x, 0.031, -0.04, 0x86958b);
  const texture = canvasTex(s.W, s.H, () => {}),
    screen = new THREE.Mesh(new THREE.PlaneGeometry(s.width, s.height), new THREE.MeshBasicMaterial({ map: texture }));
  screen.position.set(s.x, s.y, s.z);
  group.add(screen);
  const button = block(group, 0.073, 0.018, 0.008, s.x, 0.056, -0.006, 0x446e5a);
  button.name = 'acquisition-button';
  const label = textPlate('采集 / 停止', { w: 0.07, h: 0.013, color: '#ffffff', font: 'bold 68px sans-serif' });
  label.position.set(s.x, 0.056, -0.0018);
  group.add(label);
  wire(
    group,
    [
      [-0.102, 0.009, 0.015],
      [-0.06, 0.009, 0.07],
      [0.04, 0.009, 0.075],
      [0.11, 0.023, -0.04],
    ],
    0x505e58,
    0.0015,
  );
  const humanLabel = textPlate('55 kg 人体动作模型', {
    w: 0.16,
    h: 0.016,
    bg: '#e4d9bd',
    color: '#383b3b',
    font: '44px sans-serif',
  });
  humanLabel.rotation.x = -Math.PI / 2;
  humanLabel.position.set(-0.16, 0.0004, 0.1);
  group.add(humanLabel);
  function draw(model, window, selected) {
    screen.userData.plotRange = forcePlotRange(model.samples, model.weight);
    drawForceTrace(texture.canvas.getContext('2d'), model.samples, {
      weight: model.weight,
      value: model.sensor,
      recording: model.recording,
      window,
      selected,
    });
    texture.needsUpdate = true;
    button.material.color.setHex(model.recording ? 0x995a43 : 0x446e5a);
  }
  return {
    group,
    human,
    torso,
    platform,
    screen,
    button,
    pose,
    draw,
    dispose() {
      texture.dispose();
    },
  };
}
