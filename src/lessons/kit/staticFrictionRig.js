import * as THREE from 'three';
import { paint } from '../../live/ink.js';
import { canvasTex, woodBlock } from './props.js';
import { FM, forceMeter } from './forcemeter.js';

export const BOARD = 0.012, AXIS = BOARD + 0.015, BLOCK = -0.182;
export const RING = BLOCK + 0.049 + FM.L + 0.03, ZERO = 0.012 + FM.ZERO;
export const vec = (x, y, z) => new THREE.Vector3(x, y, z);

function pick(parent, w, h, d, position) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: false }));
  mesh.position.copy(position);
  mesh.userData.pick = true;
  parent.add(mesh);
  return mesh;
}

function printFace(parent, w, h, tex, x, y, z) {
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
  face.rotation.x = -Math.PI / 2;
  face.position.set(x, y, z);
  parent.add(face);
  return face;
}

export function staticFrictionRig() {
  const group = new THREE.Group(), block = new THREE.Group(), meter = forceMeter();
  const board = woodBlock(0.50, BOARD, 0.17, { color: 0xffedcc });
  board.position.set(0, BOARD / 2, 0);
  const body = woodBlock(0.09, 0.042, 0.066, { color: 0xce995b });
  body.position.y = 0.021;
  block.add(body);
  for (const x of [-0.022, 0.022]) for (const z of [-0.015, 0.015]) {
    const weight = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.0125, 0.008, 28), paint(0x8a9499));
    weight.position.set(x, 0.046, z);
    block.add(weight);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.0085, 0.00045, 6, 26), paint(0x606e75));
    rim.rotation.x = Math.PI / 2;
    rim.position.set(x, 0.0501, z);
    block.add(rim);
  }
  const eye = new THREE.Mesh(new THREE.TorusGeometry(0.006, 0.0013, 8, 20), paint(0x66727a));
  eye.rotation.y = Math.PI / 2;
  eye.position.set(0.049, AXIS - BOARD, 0);
  block.add(eye);
  const line = new THREE.Mesh(new THREE.BoxGeometry(0.0015, 0.0003, 0.116), paint(0x443f38));
  line.position.set(BLOCK - 0.045, BOARD + 0.00015, 0);
  group.add(board, line, block, meter);
  const label = canvasTex(230, 100, (c, w, h) => {
    c.fillStyle = '#51412c'; c.textAlign = 'center'; c.font = 'bold 78px sans-serif'; c.fillText('起点', w / 2, h * 0.82);
  });
  printFace(group, 0.031, 0.014, label, line.position.x, BOARD + 0.0004, 0.069).material.transparent = true;

  meter.rotation.set(-Math.PI / 2, 0, -Math.PI / 2);
  meter.ring.scale.set(1.6, 1.6, 1);
  meter.ring.position.y = -0.001;
  // 同一块刻度板横放时，数字朝向读者。刻线与原测力计的零点和弹簧伸长严格共用坐标。
  const scale = canvasTex(1600, 368, (c, w, h) => {
    c.fillStyle = '#d2e3d1'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#f9f7ee'; c.fillRect(0, h * 0.40, w, h * 0.20);
    c.fillStyle = c.strokeStyle = '#213a3c'; c.textAlign = 'center';
    for (let k = 0; k <= FM.MAX * 5; k++) {
      const x = w * (1 - (FM.ZERO + k * FM.PER_N / 5) / FM.L);
      const major = k % 5 === 0;
      c.lineWidth = major ? 5 : 3;
      c.beginPath(); c.moveTo(x, h * 0.59); c.lineTo(x, h * (major ? 0.83 : 0.72));
      c.moveTo(x, h * 0.41); c.lineTo(x, h * (major ? 0.25 : 0.32)); c.stroke();
      if (major) { c.font = 'bold 65px sans-serif'; c.fillText(String(k / 5), x, h * 0.22); }
    }
    c.font = 'bold 64px serif'; c.fillText('N', w * 0.085, h * 0.62);
  });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(FM.L, 0.046), new THREE.MeshBasicMaterial({ map: scale }));
  face.rotation.z = Math.PI / 2;
  face.position.set(0, -0.012 - FM.L / 2, 0.00408);
  meter.add(face);
  const grip = pick(meter, 0.043, 0.037, 0.029, vec(0, 0.002, 0));
  const paper = new THREE.Group();
  // 折皱的纸面有亮面和暗面，右缘用来读数。
  const paperGeometry = new THREE.IcosahedronGeometry(0.0068, 1);
  const vertices = paperGeometry.attributes.position;
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i), y = vertices.getY(i), z = vertices.getZ(i);
    const fold = 0.93 + 0.22 * Math.sin(750 * x + 440 * y) * Math.cos(630 * z);
    vertices.setXYZ(i, x * fold, y * fold, z * fold);
  }
  paperGeometry.computeVertexNormals();
  const wad = new THREE.Mesh(paperGeometry, new THREE.MeshStandardMaterial({
    color: 0xfff5de, roughness: 1, flatShading: true,
  }));
  paper.add(wad);
  group.add(paper);
  const paperPick = pick(paper, 0.026, 0.019, 0.023, vec(0, 0, 0));
  const blockPick = pick(block, 0.091, 0.051, 0.068, vec(0, 0.026, 0));
  // 读纸团朝零刻度的一侧。沿拉力方向取实际外缘，避免用纸团中心代读。
  wad.scale.set(0.9, 0.65, 0.85);
  wad.geometry.computeBoundingBox();
  const edge = wad.geometry.boundingBox.max.x * wad.scale.x;
  const home = vec(RING - ZERO - 0.030, BOARD - wad.geometry.boundingBox.min.y * wad.scale.y, 0.064);
  const seat = (force = 0) => vec(meter.position.x - ZERO - force * FM.PER_N - edge, AXIS + 0.008, 0.004);
  function draw(s, paperForce) {
    block.position.set(BLOCK + s.x, BOARD, 0);
    meter.position.set(RING + s.handle, AXIS, 0);
    meter.set(s.tension);
    if (paperForce != null) paper.position.copy(seat(paperForce));
  }
  return { group, block, meter, paper, grip, paperPick, blockPick, face, home, seat, draw };
}
