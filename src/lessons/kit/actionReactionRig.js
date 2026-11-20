import * as THREE from 'three';
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';
import { paint } from '../../live/ink.js';
import { canvasTex } from './props.js';
import { pairedMeters } from './actionReaction.js';

// 两表的局部 x 都从提环指向挂钩。零载长度量到两钩扣合处。
export const REST = 0.312, PER_N = 0.019, MAX = 5, AXIS_Z = 0.103, RING_Y = 0.026;
export const COLORS = ['#236e69', '#995027'];
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const metal = 0x83918f;

function part(parent, geometry, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}

function rounded(x, y, w, h, r, path = new THREE.Shape()) {
  path.moveTo(x + r, y);
  path.lineTo(x + w - r, y);
  path.quadraticCurveTo(x + w, y, x + w, y + r);
  path.lineTo(x + w, y + h - r);
  path.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  path.lineTo(x + r, y + h);
  path.quadraticCurveTo(x, y + h, x, y + h - r);
  path.lineTo(x, y + r);
  path.quadraticCurveTo(x, y, x + r, y);
  return path;
}

function horizontal(shape, depth) {
  const geom = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 8 });
  return geom.rotateX(-Math.PI / 2);
}

function gauge(parent, i) {
  const body = new THREE.Group();
  parent.add(body);
  const shell = rounded(0.016, -0.042, 0.214, 0.084, 0.014);
  shell.holes.push(rounded(0.040, -0.010, 0.172, 0.020, 0.007, new THREE.Path()));
  // 刻度框下留出拉杆的出口，两条侧壁落在台面上。
  part(body, horizontal(shell, 0.003), paint(i ? 0xb7805d : 0x528580), 0, -0.003);
  for (const z of [-0.027, 0.027])
    part(body, horizontal(rounded(0.021, -0.014, 0.204, 0.028, 0.009), 0.023),
      paint(i ? 0xa07353 : 0x406c67), 0, -0.026, z);
  const zero = 0.072, localPerN = PER_N / 1.2;
  const dial = canvasTex(1024, 400, (g, w, h) => {
    const start = 0.018, length = 0.210;
    const X = (x) => (i ? 1 - (x - start) / length : (x - start) / length) * w;
    g.fillStyle = '#f5f1df';
    // 两条刻度带之间是能看见弹簧的通槽。
    g.fillRect(0, 0, w, h * 0.362);
    g.fillRect(0, h * 0.638, w, h * 0.362);
    g.textAlign = 'center';
    for (let t = 0; t <= MAX * 5; t++) {
      const x = X(zero + t / 5 * localPerN), major = t % 5 === 0;
      g.fillStyle = '#263b39';
      g.fillRect(x - (major ? 3 : 2), major ? 103 : 121, major ? 6 : 4, major ? 42 : 24);
      g.fillRect(x - (major ? 3 : 2), 255, major ? 6 : 4, major ? 43 : 24);
      if (major) {
        g.font = 'bold 76px Arial';
        g.fillText(String(t / 5), x, 92);
      }
    }
    g.fillStyle = COLORS[i]; g.font = 'bold 72px Arial';
    g.fillText(i ? 'A' : 'B', X(0.044), 96);
    g.fillStyle = '#42504d'; g.font = 'bold 49px Arial';
    g.fillText('N', X(0.194), 94);
  });
  const face = part(body, new THREE.PlaneGeometry(0.210, 0.074), new THREE.MeshBasicMaterial({ map: dial, transparent: true }), 0.123, 0.0003);
  face.rotation.x = -Math.PI / 2;
  if (i) face.rotateZ(Math.PI);
  face.castShadow = false;

  const ring = part(body, new THREE.TorusGeometry(0.018, 0.0032, 12, 48), paint(metal));
  ring.rotation.x = -Math.PI / 2;

  part(body, horizontal(rounded(0.036, -0.012, 0.185, 0.024, 0.006), 0.003), paint(0xe3deca), 0, -0.024);
  part(body, new THREE.BoxGeometry(0.005, 0.012, 0.018), paint(metal), 0.040, -0.008);
  const anchor = 0.042, coilPoints = [];
  for (let k = 0; k <= 216; k++) {
    const a = k / 216 * 18 * Math.PI;
    coilPoints.push(V((zero - anchor) * k / 216, 0.005 * Math.cos(a), 0.0065 * Math.sin(a)));
  }
  const coil = part(body, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coilPoints), 216, 0.00115, 8, false), paint(0x516361), anchor, -0.003);
  const moving = new THREE.Group();
  body.add(moving);
  part(moving, new THREE.CylinderGeometry(0.0024, 0.0024, 0.009, 12), paint(metal), zero, -0.001);
  part(moving, new THREE.BoxGeometry(0.0028, 0.0025, 0.049), paint(0xc64332), zero, 0.003);
  const shaft = part(moving, new THREE.CylinderGeometry(0.0022, 0.0022, 0.173, 14), paint(metal), zero + 0.0865, -0.006);
  shaft.rotation.z = -Math.PI / 2;
  // 钩头的弯位互相穿扣：一只平卧，另一只立起。
  const hookPts = [V(0.243, 0, 0), V(0.251, 0, 0), V(0.257, 0, -0.006),
    V(0.262, 0, -0.006), V(0.265, 0, 0), V(0.262, 0, 0.006), V(0.255, 0, 0.006)];
  if (i) for (const p of hookPts) { p.y = p.z; p.z = 0; }
  part(moving, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hookPts), 32, 0.0012, 10, false), paint(metal), 0, -0.006);
  const pick = part(body, new THREE.BoxGeometry(0.110, 0.055, 0.085), new THREE.MeshBasicMaterial({ visible: false }), -0.017);
  pick.userData.pick = true;
  body.scale.set(1.2, 1, 1.55);
  body.rotation.y = i ? Math.PI : 0;
  return { body, pick, dial, set(f) {
    coil.scale.x = 1 + f * localPerN / (zero - anchor);
    moving.position.x = f * localPerN;
  } };
}

// 拇指压住提环外缘，弯曲的食指从下面托住；手腕在表盘外。
function pullingHand() {
  const hand = new THREE.Group(), skin = paint(0xe4b69a);
  // 用同一张皮肤表面连接掌心、指节和指腹。
  const n = 48, half = 0.07, grid = new MarchingCubes(n, skin, false, false, 12000);
  const center = V(half, 0, 0), step = 2 * half / n;
  grid.field.fill(-1); grid.isolation = 0;
  function flesh(x, y, z, a, b, c) {
    const p = V(x, y, z).sub(center).addScalar(half).divideScalar(step);
    const r = V(a, b, c).multiplyScalar(1.42 / step);
    for (let k = Math.max(0, Math.floor(p.z-r.z)); k < Math.min(n,p.z+r.z+1); k++)
      for (let j = Math.max(0, Math.floor(p.y-r.y)); j < Math.min(n,p.y+r.y+1); j++)
        for (let i = Math.max(0, Math.floor(p.x-r.x)); i < Math.min(n,p.x+r.x+1); i++) {
          const field = 1 - ((i-p.x)*step/a)**2 - ((j-p.y)*step/b)**2 - ((k-p.z)*step/c)**2;
          const index = (k*n+j)*n+i;
          grid.field[index] = Math.max(grid.field[index], field);
        }
  }
  // 食指从环的后侧绕到下方；拇指从掌侧斜跨到同一处，留下可辨的指间空隙。
  const finger = (points, radius) => {
    const curve = new THREE.CatmullRomCurve3(points.map(p => V(...p)));
    for (const p of curve.getSpacedPoints(28)) flesh(p.x, p.y, p.z, radius, radius, radius);
  };
  flesh(0.076, 0.014, 0.007, 0.034, 0.016, 0.024);
  finger([[0.071,0.014,-0.010], [0.052,0.014,-0.029], [0.035,0.006,-0.031],
    [0.028,-0.010,-0.018], [0.022,-0.0105,-0.004]], 0.0075);
  for (let k = 0; k < 3; k++) {
    const x = 0.052 + k * 0.012;
    finger([[x+0.010,0.010,0.004], [x,0.008,0.020+k*0.002],
      [x-0.006,0,0.027+k*0.001], [x-0.013,-0.005,0.020]], 0.0065-k*0.0004);
  }
  finger([[0.069,0.018,0.018], [0.054,0.021,0.017], [0.039,0.014,0.011],
    [0.024,0.012,0.002]], 0.009);
  flesh(0.099, 0.013, 0.006, 0.020, 0.0125, 0.017);
  grid.update();
  const geo = new THREE.BufferGeometry();
  for (const attr of ['position', 'normal'])
    geo.setAttribute(attr, new THREE.BufferAttribute(grid.geometry.attributes[attr].array.slice(0, grid.count * 3), 3));
  grid.geometry.dispose();
  geo.scale(half, half, half).translate(center.x, center.y, center.z);
  part(hand, geo, skin);
  const nail = part(hand, new THREE.SphereGeometry(1, 16, 12), paint(0xf7d4c0), 0.025, 0.020, 0.001);
  nail.scale.set(0.006, 0.002, 0.005); nail.rotation.z = 0.22;
  const cuff = part(hand, new THREE.CylinderGeometry(0.018, 0.020, 0.025, 32), paint(0x627784), 0.116, 0.013, 0.006);
  cuff.rotation.z = -Math.PI / 2;
  const edge = part(hand, new THREE.CylinderGeometry(0.019, 0.019, 0.005, 32), paint(0x879698), 0.105, 0.013, 0.006);
  edge.rotation.z = -Math.PI / 2;
  return hand;
}

export function actionReactionRig(screenTexture) {
  const group = new THREE.Group(), meters = [gauge(group, 0), gauge(group, 1)];
  // 两处销孔位置不动。手拉一侧的提环可以离开销孔。
  for (const x of [-REST, REST]) {
    const foot = rounded(-0.031, -0.032, 0.062, 0.064, 0.006);
    foot.holes.push(new THREE.Path().absarc(0, 0, 0.0075, 0, Math.PI * 2));
    part(group, horizontal(foot, 0.005), paint(0x5e6e6c), x, 0, AXIS_Z);
    for (const z of [-0.022, 0.022])
      part(group, new THREE.CylinderGeometry(0.0035, 0.0035, 0.002, 12), paint(0xc2c5b8), x - 0.020, 0.006, AXIS_Z + z);
  }
  const pin = new THREE.Group();
  group.add(pin);
  const pinShaft = part(pin, new THREE.CylinderGeometry(0.0065, 0.0065, 0.050, 24), paint(metal));
  part(pinShaft, new THREE.CylinderGeometry(0.013, 0.011, 0.014, 24), paint(0xb78543), 0, 0.026);
  const pinPick = part(pinShaft, new THREE.CylinderGeometry(0.027, 0.027, 0.035, 24), new THREE.MeshBasicMaterial({ visible: false }), 0, 0.020);
  pinPick.userData.pick = true;
  const hand = pullingHand();
  group.add(hand);
  const screen = new THREE.Group();
  const monitor = new THREE.Group();
  group.add(monitor); monitor.add(screen);
  screen.position.set(0, 0.136, -0.125);
  screen.rotation.x = -0.52;
  part(screen, new THREE.BoxGeometry(0.777, 0.290, 0.014), paint(0x435450));
  const glass = part(screen, new THREE.PlaneGeometry(0.750, 0.272), new THREE.MeshBasicMaterial({ map: screenTexture }), 0, 0, 0.0072);
  glass.castShadow = false;
  for (const x of [-0.245, 0.245])
    part(monitor, new THREE.BoxGeometry(0.037, 0.017, 0.080), paint(0x576761), x, 0.0085, -0.060);
  const rest = [REST, REST], perN = [PER_N, PER_N];
  return { group, monitor, hand, meters, pin, pinShaft, pinPick, draw(handles, fixed) {
    const state = pairedMeters(handles, { rest, perN });
    meters.forEach((m, i) => {
      m.body.position.set(handles[i].x, RING_Y, AXIS_Z);
      m.set(state.force);
    });
    hand.position.copy(meters[1 - fixed].body.position);
    hand.rotation.y = fixed ? Math.PI : 0;
    return state;
  }, dispose() { meters.forEach((m) => m.dial.dispose()); } };
}
