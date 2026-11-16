import * as THREE from 'three';
import { block } from './electronicsBench.js';
import { rulerMesh } from './props.js';
import { paint } from '../../live/ink.js';
import { DX, NX, NZ, BARRIER } from './rippleTank.js';

export const TANK_W = (NX - 1) * DX,
  TANK_D = (NZ - 1) * DX,
  WATER = 0.019,
  WALL_Z = BARRIER * DX - TANK_D / 2;
export function rippleRig(tank, { interference = false, reflection = false, gain = 1 } = {}) {
  const group = new THREE.Group();
  block(group, TANK_W + 0.018, 0.0164, TANK_D + 0.018, 0, 0.0082, 0, 0xcbc4af);
  for (const s of [-1, 1]) {
    const wallX = (s * (TANK_W + 0.006)) / 2;
    for (const [a, b] of interference || reflection
      ? [[-TANK_D / 2 - 0.006, TANK_D / 2 + 0.006]]
      : [
          [-TANK_D / 2 - 0.006, WALL_Z - 0.002],
          [WALL_Z + 0.005, TANK_D / 2 + 0.006],
        ]) {
      block(group, 0.006, 0.028, b - a, wallX, 0.014, (a + b) / 2, 0x7a8788);
    }
    block(group, TANK_W, 0.028, 0.006, 0, 0.014, (s * (TANK_D + 0.006)) / 2, 0x7a8788);
  }
  // ImageData 上方对应振源，下方对应透射侧。桌面与笔记本从同一帧取样。
  const canvas = document.createElement('canvas');
  canvas.width = NX;
  canvas.height = NZ;
  const ctx = canvas.getContext('2d'),
    pixels = ctx.createImageData(NX, NZ);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  const geo = new THREE.PlaneGeometry(TANK_W, TANK_D, NX - 1, NZ - 1);
  geo.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: texture }));
  water.position.y = WATER;
  group.add(water);
  const boards = (interference || reflection ? [] : [-1, 1]).map((s) => {
    const b = new THREE.Group();
    // 板身的外端越过槽壁；沿壁收纳，内端的位置就是实际缝边。
    const plate = block(b, TANK_W / 2 + 0.009, 0.016, 0.005, 0, 0.024, WALL_Z + 0.00125, 0x855f39);
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.006, 0.009, 16), paint(0xd9b37f));
    knob.position.set(0, 0.035, WALL_Z + 0.00125);
    b.add(knob);
    group.add(b);
    return { b, plate, knob, s };
  });
  function layout() {
    boards.forEach(({ b, plate, knob, s }) => {
      const edge = s < 0 ? tank.left : tank.right;
      b.position.x = edge + (s * (TANK_W / 2 + 0.009)) / 2;
      plate.position.x = 0;
      knob.position.x = edge + s * 0.009 - b.position.x;
    });
  }
  const ruler = rulerMesh({ length: TANK_D, width: 0.015, divisions: 270, every: 10, labelEvery: 20 });
  ruler.rotation.y = -Math.PI / 2;
  ruler.position.set(-TANK_W / 2 - 0.017, 0.0015, 0);
  group.add(ruler);
  const paddle = block(group, TANK_W - 0.014, 0.016, 0.004, 0, 0.023, -TANK_D / 2 + 0.002, 0xb5a891);
  const drive = block(group, 0.064, 0.028, 0.035, 0, 0.014, -TANK_D / 2 - 0.022, 0x6e7c80);
  const arm = block(group, 0.012, 0.006, 0.044, 0, 0.028, -TANK_D / 2 - 0.01, 0x9b9c92);
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.01, 0.009, 18), paint(0xb95640));
  knob.position.set(0.019, 0.033, -TANK_D / 2 - 0.023);
  group.add(knob);
  function paintWave() {
    const values = tank.surface,
      vert = geo.attributes.position;
    for (let i = 0; i < values.length; i++) {
      const h = values[i] * gain,
        next = values[Math.min(i + NX, values.length - 1)] * gain;
      const shade = Math.tanh(1.45 * (h + 0.55 * (next - h)));
      const j = 4 * i;
      pixels.data[j] = 145 + shade * 88;
      pixels.data[j + 1] = 184 + shade * 65;
      pixels.data[j + 2] = 183 + shade * 55;
      pixels.data[j + 3] = 255;
      vert.setY(i, 0.0007 * h);
    }
    vert.needsUpdate = true;
    ctx.putImageData(pixels, 0, 0);
    texture.needsUpdate = true;
    if (!interference) {
      paddle.position.y = 0.023 + 0.002 * tank.surface[0];
      arm.position.y = paddle.position.y + 0.005;
    }
  }
  function snapshot(x, z) {
    const photo = document.createElement('canvas');
    photo.width = NX * 2;
    photo.height = NZ * 2;
    photo.style.cssText = 'width:100%;height:auto';
    const c = photo.getContext('2d');
    c.drawImage(canvas, 0, 0, photo.width, photo.height);
    const px = (m) => (m / DX + (NX - 1) / 2) * 2;
    if (!interference && !reflection) {
      c.fillStyle = '#805e40';
      c.fillRect(0, BARRIER * 2, px(tank.left), 4);
      c.fillRect(px(tank.right), BARRIER * 2, photo.width - px(tank.right), 4);
    }
    c.strokeStyle = '#804126';
    c.beginPath();
    c.arc(px(x), ((z + TANK_D / 2) / DX) * 2, 5, 0, 2 * Math.PI);
    c.stroke();
    return photo;
  }
  if (interference) paddle.visible = arm.visible = false;
  layout();
  paintWave();
  return { group, water, drive, knob, boards, paintWave, layout, snapshot, dispose: () => texture.dispose() };
}
