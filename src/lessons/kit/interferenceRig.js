import * as THREE from 'three';
import { rippleRig, WATER, TANK_D } from './rippleRig.js';
import { SOURCES } from './interferenceTank.js';
import { block } from './electronicsBench.js';
import { paint } from '../../live/ink.js';
import { canvasTex, textPlate } from './props.js';
export const GAIN = 12;
export function interferenceRig(tank) {
  const rig = rippleRig(tank, { interference: true, gain: GAIN }),
    { group } = rig;
  const plate = new THREE.Group();
  group.add(plate);
  block(plate, 0.116, 0.006, 0.018, 0, 0.071, -0.06, 0xa8a495);
  block(plate, 0.014, 0.006, 0.102, 0, 0.071, -0.111, 0xa8a495);
  block(group, 0.014, 0.044, 0.018, 0, 0.05, -TANK_D / 2 - 0.025, 0x7b827a);
  const rods = SOURCES.map(([x, z]) => {
    const rod = new THREE.Group();
    rod.position.set(x, 0, z);
    rod.userData.lift = 0;
    plate.add(rod);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.0024, 0.0024, 0.063, 16), paint(0xb8b8a6));
    shaft.position.y = 0.048;
    rod.add(shaft);
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.008, 20), paint(0x9c704b));
    grip.position.y = 0.083;
    rod.add(grip);
    const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.015, 18), paint(0x687575));
    socket.position.set(x, 0.072, z);
    plate.add(socket);
    return rod;
  });
  const marker = new THREE.Mesh(
    new THREE.TorusGeometry(0.004, 0.0008, 6, 24),
    new THREE.MeshBasicMaterial({ color: 0x9b482f }),
  );
  marker.rotation.x = -Math.PI / 2;
  marker.position.set(0, WATER + 0.002, 0.065);
  group.add(marker);
  const pick = new THREE.Mesh(
    new THREE.PlaneGeometry(0.022, 0.022),
    new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }),
  );
  pick.userData.pick = true;
  marker.add(pick);
  const label = textPlate('P', { w: 0.009, h: 0.011, font: 'bold 390px sans-serif' });
  label.position.set(0.007, 0.009, 0);
  marker.add(label);
  const box = block(group, 0.22, 0.026, 0.072, 0, 0.013, 0.19, 0x657c7f);
  const tex = canvasTex(1100, 360, () => {}),
    screen = new THREE.Mesh(new THREE.PlaneGeometry(0.208, 0.064), new THREE.MeshBasicMaterial({ map: tex }));
  screen.rotation.x = -Math.PI / 2;
  screen.position.set(0, 0.0265, 0.19);
  group.add(screen);
  function drawTrace(samples, caption, recording = false) {
    const c = tex.canvas,
      g = c.getContext('2d');
    g.fillStyle = '#f3ecd9';
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#3e484b';
    g.font = '50px sans-serif';
    g.textAlign = 'left';
    g.fillText(caption, 24, 48);
    g.font = '37px sans-serif';
    g.fillText(recording ? '记录中 · 约 5 个周期' : '点水面选择 P，再点红环记录', 24, 92);
    const L = 45,
      R = 1060,
      T = 125,
      B = 310,
      scale = 0.07;
    g.strokeStyle = '#c5cec9';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(L, (T + B) / 2);
    g.lineTo(R, (T + B) / 2);
    g.stroke();
    g.strokeStyle = '#28696b';
    g.lineWidth = 3;
    g.beginPath();
    samples.forEach(([t, y], i) => {
      const x = L + (t / 1.01) * (R - L),
        v = (T + B) / 2 - ((y / scale) * (B - T)) / 2;
      i ? g.lineTo(x, v) : g.moveTo(x, v);
    });
    g.stroke();
    g.font = '24px sans-serif';
    g.fillText('0', L, 345);
    g.fillText('1 s', R - 35, 345);
    tex.needsUpdate = true;
  }
  function animate() {
    rig.paintWave();
    // 共用振动片的位移取同步驱动相位，抬杆只改变是否入水，不换振源时钟。
    plate.position.y = 0.0015 * Math.sin(tank.phase);
    rods.forEach((r, i) => (r.position.y = r.userData.lift));
    marker.position.y = WATER + 0.002 + 0.0007 * GAIN * tank.sample(marker.position.x, marker.position.z);
  }
  return {
    ...rig,
    plate,
    rods,
    marker,
    screen,
    drawTrace,
    animate,
    dispose() {
      rig.dispose();
      tex.dispose();
    },
  };
}
