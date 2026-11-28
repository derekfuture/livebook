// 螺旋测微器的尺架、测砧及同轴的固定套筒、微分筒和棘轮。长度用米。
import * as THREE from 'three';
import { paint, inked } from '../../live/ink.js';
import { canvasTex } from './props.js';
import { SCREW_PITCH, THIMBLE_DIVISIONS, micrometerReading } from './micrometer.js';

export const ANVIL_X = -0.047,
  AXIS_Y = 0.009,
  SCALE_ZERO = -0.002;
const TAU = Math.PI * 2;
const metal = 0x98a6a7;

function shaft(parent, start, length, radius, color) {
  const part = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 48), paint(color));
  part.rotation.z = -Math.PI / 2;
  part.position.set(start + length / 2, 0, 0);
  parent.add(part);
  return part;
}

// 图案的横轴沿螺杆，纵轴绕圆周，正面的基准线在纹理的半高处。
function engravedTube(length, leftR, rightR, texture, shaded = false) {
  const coords = [],
    uv = [],
    indices = [];
  for (let i = 0; i <= 150; i++) {
    const theta = (i / 150 - 0.5) * TAU;
    for (const end of [0, 1]) {
      const r = end ? rightR : leftR;
      coords.push(end * length, r * Math.sin(theta), r * Math.cos(theta));
      uv.push(end, 1 - i / 150);
    }
    if (i) {
      const k = 2 * i - 2;
      indices.push(k, k + 1, k + 2, k + 2, k + 1, k + 3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(coords, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const material = shaded
    ? new THREE.MeshStandardMaterial({ map: texture, metalness: 0.15, roughness: 0.66 })
    : new THREE.MeshBasicMaterial({ map: texture });
  return new THREE.Mesh(geo, material);
}

function knurl(parent, start, len, r, count) {
  const mat = paint(0xa49987);
  for (let k = 0; k < count; k++) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(len, 0.00028, 0.00033), mat);
    const q = (k * TAU) / count;
    rib.position.set(start + len / 2, r * Math.sin(q), r * Math.cos(q));
    rib.rotation.x = -q;
    parent.add(rib);
  }
}

// 螺旋测微器和双缝测量头都使用半毫米螺距、50 等分的测微副。
export function measuringScrew(body, { textbookScale = false } = {}) {
  const lead = textbookScale ? 6 : 3;
  const sleeveLength = (27 + lead) / 1000;
  const sleeveTex = canvasTex(3072, 1024, (g, w, h) => {
    g.fillStyle = '#d1d5cd';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#263b44';
    g.fillRect(0, h / 2 - 2, w, 4);
    const x = (n) => ((n + lead) * w) / (27 + lead);
    for (let n = 0; n <= 25; n += 0.5) {
      const whole = Number.isInteger(n);
      const above = textbookScale ? !whole : whole;
      g.fillRect(x(n) - 2, above ? h / 2 : h / 2 - 60, 4, above ? 72 : 60);
      if (whole && n % 5 === 0) {
        g.save();
        g.translate(x(textbookScale && n === 0 ? -0.42 : n), h / 2 + (textbookScale ? -130 : 119));
        g.scale(textbookScale ? 2.15 : 1, -1);
        g.font = textbookScale ? '44px sans-serif' : '66px sans-serif';
        g.textAlign = 'center';
        g.fillText(String(n), 0, 0);
        g.restore();
      }
    }
  });
  const sleeve = engravedTube(sleeveLength, 0.0044, 0.0044, sleeveTex, textbookScale);
  sleeve.position.x = SCALE_ZERO - lead / 1000;
  body.add(sleeve);
  const thimbleTex = canvasTex(512, 2048, (g, w, h) => {
    g.fillStyle = '#bdc7c5';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#263b44';
    for (let k = -25; k <= 25; k++) {
      const y = (0.5 + k / THIMBLE_DIVISIONS) * h;
      g.fillRect(0, y - 1.5, k % 5 === 0 ? 210 : 115, 3);
      if (k % 5 === 0) {
        g.save();
        g.translate(232, y);
        g.scale(1, -1);
        g.font = '60px sans-serif';
        g.textBaseline = 'middle';
        g.fillText(String((k + 50) % 50), 0, 0);
        g.restore();
      }
    }
  });
  const drum = new THREE.Group();
  body.add(drum);
  const scale = engravedTube(0.006, 0.00455, 0.0067, thimbleTex, textbookScale);
  drum.add(scale);
  const grip = shaft(drum, 0.006, 0.019, 0.0067, 0x895c3d);
  knurl(drum, 0.007, 0.017, 0.0067, 48);
  shaft(drum, 0.025, 0.005, 0.0035, metal);
  return {
    sleeve, drum, scale, grip,
    setReading(mm) {
      drum.position.x = SCALE_ZERO + mm / 1000;
      drum.rotation.x = (TAU * mm) / SCREW_PITCH;
    },
    dispose() {
      sleeveTex.dispose();
      thimbleTex.dispose();
    },
  };
}

export function micrometerTool({ textbookScale = false } = {}) {
  const group = new THREE.Group(),
    body = new THREE.Group();
  group.add(body);
  body.position.y = AXIS_Y;
  const frameShape = new THREE.Shape();
  // 单独读仪器时露出测砧的接触面，丝能沿轴向送入间隙。
  const leftPost = textbookScale ? -0.050 : -0.047;
  const rightOffset = textbookScale ? -0.005 : 0;
  frameShape.moveTo(-0.053, 0);
  frameShape.lineTo(-0.053, -0.022);
  frameShape.bezierCurveTo(-0.052, -0.044, -0.004 + rightOffset, -0.045, -0.003 + rightOffset, -0.022);
  frameShape.lineTo(-0.003 + rightOffset, 0);
  frameShape.lineTo(-0.011 + rightOffset, 0);
  frameShape.lineTo(-0.011 + rightOffset, -0.015);
  frameShape.bezierCurveTo(-0.016 + rightOffset, -0.033, -0.043, -0.033, leftPost, -0.015);
  frameShape.lineTo(leftPost, 0);
  frameShape.closePath();
  const frameGeo = new THREE.ExtrudeGeometry(frameShape, { depth: 0.009, bevelEnabled: false });
  frameGeo.rotateX(-Math.PI / 2);
  const frame = inked(new THREE.Mesh(frameGeo, paint(0x497f86)), { width: 0.7 });
  frame.position.y = -0.0045;
  body.add(frame);
  shaft(body, ANVIL_X - 0.007, 0.007, 0.0032, metal);
  shaft(body, -0.021, textbookScale ? 0.0133 : 0.017, 0.006, 0x697c81);
  const spindle = shaft(body, 0, 0.045, 0.0027, 0xacb6b5);
  const drive = measuringScrew(body, { textbookScale });
  const { sleeve, drum, scale, grip } = drive;
  const sleevePick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.00445, 0.00445, 1, 32),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  sleevePick.rotation.z = -Math.PI / 2;
  sleevePick.userData.pick = true;
  const readingPick = new THREE.Group();
  body.add(readingPick);
  readingPick.add(sleevePick, scale);
  const ratchet = new THREE.Group();
  body.add(ratchet);
  shaft(ratchet, 0, 0.008, 0.004, 0xb8bab1);
  knurl(ratchet, 0.0005, 0.007, 0.004, 24);
  const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.0026, 0.0026, 0.004, 18), paint(0x4c5558));
  screw.position.set(-0.014, 0.006, 0);
  body.add(screw);
  return {
    group,
    frame,
    sleeve,
    sleevePick,
    readingPick,
    drum,
    grip,
    ratchet,
    screw,
    scale,
    update(gap, ratchetTurns) {
      const distance = gap / 1000;
      spindle.position.x = ANVIL_X + distance + 0.045 / 2;
      drive.setReading(gap);
      scale.position.copy(drum.position);
      scale.rotation.copy(drum.rotation);
      const exposed = (textbookScale ? 0.006 : 0.003) + distance;
      sleevePick.scale.y = exposed;
      sleevePick.position.x = drum.position.x - exposed / 2;
      ratchet.position.x = drum.position.x + 0.03;
      ratchet.rotation.x = ratchetTurns * TAU;
    },
    dispose: drive.dispose,
  };
}

// 合拢查零时两筒的分界恰好落在零线上，两侧边缘都应能点中它。
export function readMicrometerTick(tool, gap, coarse, ray) {
  const hit = ray.intersectObjects([tool.sleeve, tool.scale])[0];
  if (!hit) return {};
  const expected = micrometerReading(gap);
  if (coarse === null) {
    const x = tool.group.worldToLocal(hit.point.clone()).x;
    if (hit.object !== tool.sleeve && !(gap < 1e-8 && Math.abs(x - SCALE_ZERO) < 0.00024))
      return { error: '先读左边的固定套筒。' };
    const n = Math.round((x - SCALE_ZERO) * 2000) / 2;
    if (n !== expected.sleeve) return { error: '从微分筒左缘向左找，点刚露出的最后一条刻线。' };
    return { coarse: n };
  }
  if (hit.object !== tool.scale) return {};
  let n = Math.round((((0.5 - hit.uv.y) * THIMBLE_DIVISIONS + 50) % 50) * 10) / 10;
  if (n === 50 || (expected.division === 0 && n >= 49.8)) n = 0;
  if (Math.abs(n - expected.division) > 0.21) return { error: '沿固定套筒的长横线，点它延长到微分筒上的位置。' };
  return { division: n, value: coarse + n / 100 };
}
