import * as THREE from 'three';
import { block, caption, wire } from './electronicsBench.js';
import { paint } from '../../live/ink.js';

export const SLIDE_START = [-0.145, 0.01, 0.092],
  STAGE = [-0.094, 0.109, -0.012];
export const SCREEN = { x: 0.112, y: 0.153, z: -0.032, w: 0.168, h: 0.132 };
function tube(parent, a, b, r, color) {
  const axis = new THREE.Vector3(...b).sub(new THREE.Vector3(...a));
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, axis.length(), 24), paint(color));
  m.position.fromArray(a).addScaledVector(axis, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.normalize());
  parent.add(m);
  return m;
}
export function microscopeRig() {
  const group = new THREE.Group();
  block(group, 0.132, 0.018, 0.12, -0.094, 0.009, -0.016, 0xabaeaa);
  block(group, 0.027, 0.177, 0.026, -0.094, 0.104, -0.057, 0xaeb4b5);
  const platform = new THREE.Shape();
  platform.moveTo(-0.0525, -0.0355);
  platform.lineTo(0.0525, -0.0355);
  platform.lineTo(0.0525, 0.0355);
  platform.lineTo(-0.0525, 0.0355);
  platform.closePath();
  const aperture = new THREE.Path();
  aperture.absarc(0, 0, 0.013, 0, Math.PI * 2, true);
  platform.holes.push(aperture);
  const stage = new THREE.Mesh(
    new THREE.ExtrudeGeometry(platform, { depth: 0.011, bevelEnabled: false }),
    paint(0x4a5459),
  );
  stage.rotation.x = -Math.PI / 2;
  stage.position.set(STAGE[0], STAGE[1] - 0.012, STAGE[2]);
  group.add(stage);
  block(group, 0.12, 0.009, 0.043, -0.119, 0.0045, 0.092, 0xb6a68c);
  tube(group, [-0.094, 0.022, -0.012], [-0.094, 0.046, -0.012], 0.017, 0xb3aea0);
  tube(group, [-0.094, 0.19, -0.057], [-0.094, 0.19, -0.012], 0.013, 0xaeb4b5);
  const turret = new THREE.Group();
  turret.position.set(-0.087, 0.158, -0.012);
  group.add(turret);
  tube(turret, [0, 0, 0], [0, 0.012, 0], 0.018, 0x525b60);
  for (const [i, c] of [0x597e99, 0x5b676e].entries()) {
    const obj = tube(turret, [i * 0.014 - 0.007, 0, 0], [i * 0.014 - 0.007, -0.036 - i * 0.005, 0], 0.0058, c);
    obj.name = i ? '100×物镜' : '40×物镜';
  }
  tube(group, [-0.094, 0.173, -0.012], [-0.094, 0.212, -0.035], 0.012, 0xbfc0b9);
  for (const s of [-1, 1])
    tube(group, [-0.094 + s * 0.006, 0.202, -0.028], [-0.094 + s * 0.014, 0.225, -0.015], 0.0057, 0x303338);
  const focus = tube(group, [-0.123, 0.104, -0.05], [-0.063, 0.104, -0.05], 0.014, 0x41484d);
  const slide = new THREE.Group();
  slide.position.fromArray(SLIDE_START);
  group.add(slide);
  const glass = block(slide, 0.069, 0.0018, 0.029, 0, 0, 0, 0xc0d7d8);
  const drop = new THREE.Mesh(new THREE.SphereGeometry(0.008, 20, 12), paint(0x667174));
  drop.scale.y = 0.16;
  drop.position.y = 0.001;
  slide.add(drop);
  const cover = block(group, 0.023, 0.0011, 0.022, -0.082, 0.01, 0.092, 0xccdede);
  for (const piece of [glass, cover])
    piece.material = new THREE.MeshPhongMaterial({
      color: 0xa2d6dc,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
    });
  block(group, 0.087, 0.013, 0.054, 0.11, 0.0065, -0.051, 0x555951);
  tube(group, [0.11, 0.013, -0.05], [0.11, 0.087, -0.05], 0.006, 0x7a7d7d);
  block(group, SCREEN.w + 0.01, SCREEN.h + 0.012, 0.009, SCREEN.x, SCREEN.y, SCREEN.z - 0.006, 0x383d3e);
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 504;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(SCREEN.w, SCREEN.h),
    new THREE.MeshBasicMaterial({ map: texture }),
  );
  screen.position.set(SCREEN.x, SCREEN.y, SCREEN.z);
  group.add(screen);
  const heater = block(group, 0.068, 0.019, 0.035, 0.005, 0.0095, 0.068, 0x65757c);
  const dial = tube(group, [0.005, 0.019, 0.068], [0.005, 0.03, 0.068], 0.009, 0xad6844);
  wire(
    group,
    [
      [0.005, 0.01, 0.05],
      [0.01, 0.004, 0.016],
      [-0.047, 0.009, -0.045],
      [-0.042, 0.103, -0.014],
    ],
    0x474b50,
  );
  const needle = block(dial, 0.0015, 0.0012, 0.006, 0, 0.006, 0, 0xf6eed3);
  caption(group, '20   40 °C', 0.005, 0.0198, 0.082, 0.046, 0.009);
  function field({ particles, selected, points, focusError, magnification, temperature, mounted, elapsed, center }) {
    const c = canvas.getContext('2d'),
      w = canvas.width,
      h = canvas.height,
      H = 446,
      span = magnification === 400 ? 60 : 24,
      scale = w / span;
    c.fillStyle = mounted ? '#dfdfc9' : '#eeeedd';
    c.fillRect(0, 0, w, h);
    if (mounted) {
      const blur = Math.abs(focusError) * 22;
      for (const p of particles) {
        const x = w / 2 + (p.x - center.x) * scale,
          y = H / 2 - (p.y - center.y) * scale,
          r = p.radius * scale;
        if (x + r + blur < 0 || x - r - blur > w || y + r + blur < 0 || y - r - blur > H) continue;
        const size = r + blur + 1,
          g = c.createRadialGradient(x, y, 0, x, y, size);
        g.addColorStop(0, 'rgba(47,47,43,' + (0.9 * r * r) / (size * size) + ')');
        g.addColorStop(Math.max(0.05, (r / size) * 0.72), 'rgba(62,62,55,' + (0.88 * r * r) / (size * size) + ')');
        g.addColorStop(1, 'rgba(68,67,61,0)');
        c.fillStyle = g;
        c.fillRect(x - size, y - size, 2 * size, 2 * size);
      }
      if (selected) {
        const x = w / 2 + (selected.x - center.x) * scale,
          y = H / 2 - (selected.y - center.y) * scale;
        c.strokeStyle = '#416f70';
        c.lineWidth = 1.8;
        c.beginPath();
        c.arc(x, y, selected.radius * scale + 5, 0, Math.PI * 2);
        c.stroke();
        c.strokeStyle = '#92734e';
        c.beginPath();
        points.forEach((q, i) => {
          const X = w / 2 + (q.x - center.x) * scale,
            Y = H / 2 - (q.y - center.y) * scale;
          i ? c.lineTo(X, Y) : c.moveTo(X, Y);
        });
        c.stroke();
        for (const q of points) {
          c.fillStyle = '#795a39';
          c.fillRect(w / 2 + (q.x - center.x) * scale - 2, H / 2 - (q.y - center.y) * scale - 2, 4, 4);
        }
      }
    }
    c.fillStyle = '#353f40';
    c.fillRect(0, H, w, h - H);
    c.fillStyle = '#faf6e7';
    c.font = '24px sans-serif';
    c.fillText(magnification + '×   ' + temperature.toFixed(1) + ' °C', 12, H + 36);
    c.fillRect(w - 18 - 5 * scale, H + 18, 5 * scale, 3);
    c.font = '18px sans-serif';
    c.textAlign = 'right';
    c.fillText('5 μm', w - 18, H + 45);
    c.textAlign = 'left';
    if (elapsed !== null) c.fillText(elapsed.toFixed(1) + ' s', w * 0.52, H + 35);
    texture.needsUpdate = true;
  }
  return {
    group,
    focus,
    turret,
    slide,
    drop,
    cover,
    screen,
    heater,
    dial,
    needle,
    field,
    dispose: () => texture.dispose(),
  };
}
