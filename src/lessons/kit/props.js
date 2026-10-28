// 实验室器材（课本插图画风）。单位：米。每个函数返回 THREE.Group，上面挂着可调的方法。
import * as THREE from 'three';
import { paint, inked, hull, polyline, INK } from '../../live/ink.js';

export const C = {
  metal: 0x9aa3b2, darkMetal: 0x4d5668, wood: 0xd8b07a, glass: 0xdff1f8, water: 0x8fd0ef,
  red: 0xe0473a, blue: 0x2f7fd8, yellow: 0xf2cf4a, paper: 0xfdfbf5, rubber: 0x3b4150, copper: 0xc9783a,
};

/** 画布贴图。draw(g, w, h)。 */
export function canvasTex(w, h, draw, { repeat, srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  t.canvas = c;
  return t;
}

/** 一块带字的小牌子（贴在物体上，正对 +z）。 */
export function textPlate(text, { w = 0.06, h = 0.02, color = '#23293a', bg = 'rgba(255,255,255,0)', font = 'bold 64px PingFang SC, sans-serif' } = {}) {
  const tex = canvasTex(512, Math.round((512 * h) / w), (g, W, H) => {
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.fillStyle = color; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, W / 2, H / 2);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  m.raycast = () => {};
  return m;
}

/** 铁架台。height 立杆高；返回 { group, clamp(y, len) 加一个横夹 } */
export function stand({ height = 0.5, baseW = 0.16, baseD = 0.11 } = {}) {
  const g = new THREE.Group();
  const base = inked(new THREE.Mesh(new THREE.BoxGeometry(baseW, 0.016, baseD), paint(C.darkMetal)));
  base.position.set(0, 0.008, 0);
  const rod = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, height, 12), paint(C.metal)), 0.0022);
  rod.position.set(-baseW / 2 + 0.025, height / 2, 0);
  g.add(base, rod);
  g.rodX = rod.position.x;
  g.clamp = (y, len = 0.12, { ring = false, r = 0.04 } = {}) => {
    const arm = new THREE.Group();
    const bar = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, len, 10), paint(C.metal)), 0.0018);
    bar.rotation.z = Math.PI / 2;
    bar.position.x = len / 2;
    const knob = inked(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.02), paint(0x5b6272)));
    arm.add(bar, knob);
    if (ring) {
      const t = hull(new THREE.Mesh(new THREE.TorusGeometry(r, 0.003, 8, 32), paint(C.metal)), 0.0015);
      t.rotation.x = Math.PI / 2;
      t.position.x = len;
      arm.add(t);
    }
    arm.position.set(rod.position.x, y, 0);
    g.add(arm);
    return arm;
  };
  return g;
}

/**
 * 玻璃容器（烧杯/量筒/试管）。返回 group：
 *   setLevel(h) 液面高度、setColor(hex)、liquid（网格）、inner 半径
 */
export function beaker({ r = 0.05, h = 0.1, color = C.water, level = 0.06, spout = true, opacity = 0.55, scale } = {}) {
  const g = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.97, h, 40, 1, true), paint(C.glass, { unique: true, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide }));
  glass.position.y = h / 2;
  glass.renderOrder = 6;
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.97, r * 0.97, 0.004, 40), paint(C.glass, { transparent: true, opacity: 0.45 }));
  floor.position.y = 0.002;
  g.add(glass, floor);
  for (const sx of [-1, 1]) g.add(polyline([new THREE.Vector3(sx * r * 0.97, 0, 0), new THREE.Vector3(sx * r, h, 0)], { width: 1.5 }));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.0016, 6, 40), paint(0xb9d6e3));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = h;
  g.add(rim);
  if (spout) {
    const s = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.012, 3, 1, true), paint(C.glass, { transparent: true, opacity: 0.4, side: THREE.DoubleSide }));
    s.rotation.z = -Math.PI / 2;
    s.position.set(r + 0.003, h - 0.004, 0);
    g.add(s);
  }
  if (scale) {   // 刻度（量筒）
    const tex = canvasTex(64, 512, (c, W, H) => {
      c.strokeStyle = '#3b4150'; c.fillStyle = '#3b4150'; c.font = 'bold 22px sans-serif';
      const n = scale.divisions;
      for (let i = 0; i <= n; i++) {
        const y = H - (i / n) * (H - 8) - 4, major = i % scale.every === 0;
        c.lineWidth = major ? 3 : 1.5;
        c.beginPath(); c.moveTo(0, y); c.lineTo(major ? 30 : 16, y); c.stroke();
        if (major && i) c.fillText(String(Math.round((i / n) * scale.max)), 32, y + 8);
      }
    });
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(r * 0.9, scale.height), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    plate.position.set(-r * 0.1, scale.height / 2 + 0.004, r + 0.0005);
    plate.renderOrder = 7;
    g.add(plate);
  }
  const lmat = paint(color, { unique: true, transparent: true, opacity, depthWrite: false });
  const liquid = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.95, r * 0.93, 1, 40), lmat);
  liquid.geometry.translate(0, 0.5, 0);
  liquid.position.y = 0.004;
  liquid.renderOrder = 5;
  const surface = new THREE.Mesh(new THREE.CircleGeometry(r * 0.95, 40), new THREE.MeshBasicMaterial({ color: 0x5fb4dd, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide }));
  surface.rotation.x = -Math.PI / 2;
  g.add(liquid, surface);
  g.liquid = liquid; g.surface = surface; g.inner = r * 0.95; g.height = h; g.glass = glass;
  g.setLevel = (lv) => {
    lv = Math.max(0, Math.min(h, lv));
    liquid.visible = surface.visible = lv > 0.0015;
    liquid.scale.y = Math.max(0.001, lv - 0.004);
    surface.position.y = lv;
    g.level = lv;
  };
  g.setColor = (hex, op = opacity) => { lmat.color.setHex(hex); lmat.opacity = op; surface.material.color.setHex(hex).multiplyScalar(0.8); };
  g.setLevel(level);
  return g;
}

/** 火焰（酒精灯/蜡烛）。返回 { group, update(t), setOn(bool), setSize(s) } */
export function flame({ size = 1, color = 0xffa53a } = {}) {
  const g = new THREE.Group();
  const outer = new THREE.Mesh(new THREE.SphereGeometry(0.012, 16, 12), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
  outer.scale.set(0.8, 2.4, 0.8);
  outer.position.y = 0.022;
  const inner = new THREE.Mesh(new THREE.SphereGeometry(0.006, 12, 10), new THREE.MeshBasicMaterial({ color: 0xfff3c4, transparent: true, opacity: 0.95, depthWrite: false }));
  inner.scale.set(0.8, 2, 0.8);
  inner.position.y = 0.014;
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.scale.set(0.09, 0.09, 1);
  glow.position.y = 0.024;
  g.add(outer, inner, glow);
  g.scale.setScalar(size);
  const light = new THREE.PointLight(0xffb35a, 0, 0.5, 2);
  light.position.y = 0.03;
  g.add(light);
  let on = true, s = 1;
  return Object.assign(g, {
    setOn(v) { on = v; },
    setSize(v) { s = v; },
    update(t) {
      const k = on ? s : 0;
      const f = 1 + Math.sin(t * 23) * 0.06 + Math.sin(t * 37 + 1) * 0.04;
      outer.scale.set(0.8 * k, 2.4 * k * f, 0.8 * k);
      inner.scale.set(0.8 * k, 2 * k, 0.8 * k);
      outer.position.x = Math.sin(t * 9) * 0.0012 * k;
      glow.material.opacity = 0.5 * k;
      light.intensity = 0.004 * k;
      g.visible = k > 0.01;
    },
  });
}

let _glow;
export function glowTexture() {
  if (_glow) return _glow;
  _glow = canvasTex(128, 128, (g, W, H) => {
    const gr = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W / 2);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  });
  return _glow;
}

/** 酒精灯。返回 group（.flame 可控制） */
export function alcoholLamp() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.035, 28, 18, 0, Math.PI * 2, Math.PI * 0.25, Math.PI * 0.75), paint(C.glass, { transparent: true, opacity: 0.45 }));
  body.scale.y = 0.75;
  body.position.y = 0.026;
  hull(body, 0.002);
  const fuel = new THREE.Mesh(new THREE.SphereGeometry(0.032, 24, 14, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), paint(0xbfe3f2, { transparent: true, opacity: 0.6 }));
  fuel.scale.y = 0.75;
  fuel.position.y = 0.026;
  const neck = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.012, 0.016, 16), paint(0xd5d9de)));
  neck.position.y = 0.058;
  const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.008, 6), paint(0xeeeeee));
  wick.position.y = 0.07;
  const f = flame({ size: 1 });
  f.position.y = 0.068;
  g.add(body, fuel, neck, wick, f);
  g.flame = f;
  return g;
}

/** 蜡烛（可点燃）。height 可变（烧短）。 */
export function candle({ height = 0.06, r = 0.008, color = 0xf5e9d0 } = {}) {
  const g = new THREE.Group();
  const body = hull(new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 20), paint(color)), 0.0015);
  body.geometry.translate(0, 0.5, 0);
  const f = flame({ size: 0.7 });
  g.add(body, f);
  g.flame = f;
  g.setHeight = (hh) => { body.scale.y = hh; f.position.y = hh + 0.002; g.top = hh; };
  g.setHeight(height);
  return g;
}

/**
 * 温度计（实验室用，竖直）。range [min,max]；setTemp(t)；
 * 刻度画在贴图上，液柱是红色细圆柱。
 */
export function thermometer({ min = -20, max = 110, length = 0.24, color = 0xd8342a } = {}) {
  const g = new THREE.Group();
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, length, 14, 1, true), paint(0xeef6fa, { transparent: true, opacity: 0.55, depthWrite: false }));
  tube.position.y = length / 2;
  hull(tube, 0.0012);
  const bulb = hull(new THREE.Mesh(new THREE.SphereGeometry(0.0062, 14, 10), paint(color)), 0.0012);
  bulb.scale.y = 1.6;
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0016, 1, 8), new THREE.MeshBasicMaterial({ color }));
  col.geometry.translate(0, 0.5, 0);
  col.position.y = 0.006;
  const y0 = 0.025, y1 = length - 0.012;   // 刻度从 min 到 max 对应的高度
  const tex = canvasTex(128, 3072, (c, W, H) => {
    c.strokeStyle = '#1d2433'; c.fillStyle = '#1d2433'; c.font = 'bold 40px sans-serif';     // 每 1 ℃ 一小格（近看能数清）
    for (let v = Math.ceil(min); v <= max; v++) {
      const y = H - ((y0 + ((v - min) / (max - min)) * (y1 - y0)) / length) * H;
      const major = v % 10 === 0, mid = v % 5 === 0;
      c.lineWidth = major ? 5 : mid ? 3.5 : 2.2;
      c.beginPath(); c.moveTo(0, y); c.lineTo(major ? 48 : mid ? 34 : 20, y); c.stroke();
      if (major) c.fillText(String(v), 54, y + 14);
    }
  });
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.014, length), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  plate.position.set(0.011, length / 2, 0);
  plate.renderOrder = 8;
  g.add(tube, bulb, col, plate);
  g.setTemp = (t) => {
    const k = (Math.min(max, Math.max(min, t)) - min) / (max - min);
    col.scale.y = Math.max(0.001, y0 + k * (y1 - y0) - 0.006);
    g.temp = t;
  };
  g.yOf = (t) => y0 + ((t - min) / (max - min)) * (y1 - y0);
  g.setTemp(20);
  return g;
}

/**
 * 弹簧测力计（竖直挂着，原点 = 顶部吊环）。setForce(F) → 指针移动、挂钩下降。
 * hookY() 返回挂钩下端相对原点的 y（负数）。
 */
export function springScale({ max = 5, perN = 0.014, length = 0.16 } = {}) {
  const g = new THREE.Group();
  const body = inked(new THREE.Mesh(new THREE.BoxGeometry(0.032, length, 0.012), paint(0xe9edf2)), { width: 1.4 });
  body.position.y = -0.012 - length / 2;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.008, 0.0018, 6, 16), paint(C.rubber));
  ring.position.y = -0.004;
  const zero = 0.03, span = max * perN;
  const tex = canvasTex(128, 640, (c, W, H) => {
    c.fillStyle = '#f6f2e6'; c.fillRect(0, 0, W, H);
    const px = H / length;
    c.strokeStyle = '#23293a'; c.fillStyle = '#23293a'; c.font = 'bold 34px sans-serif'; c.textAlign = 'right';
    const step = max > 10 ? 1 : 0.2;
    for (let f = 0; f <= max + 1e-6; f += step) {
      const y = (zero + f * perN) * px, major = Math.abs(f - Math.round(f)) < 1e-6;
      c.lineWidth = major ? 4 : 2;
      c.beginPath(); c.moveTo(0, y); c.lineTo(major ? 56 : 30, y); c.stroke();
      if (major && (max <= 10 || Math.round(f) % 2 === 0)) c.fillText(String(Math.round(f)), 120, y + 12);
    }
    c.fillText('N', 120, H - 12);
  });
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.022, length), new THREE.MeshBasicMaterial({ map: tex }));
  plate.position.set(0, -0.012 - length / 2, 0.0062);
  const pointer = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.0025, 0.003), new THREE.MeshBasicMaterial({ color: 0xd4006c }));
  pointer.position.z = 0.008;
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.0018, 0.0018, 1, 8), paint(C.rubber));
  rod.geometry.translate(0, -0.5, 0);
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.006, 0.0015, 6, 14, Math.PI * 1.4), paint(C.rubber));
  hook.rotation.z = Math.PI * 0.8;
  g.add(body, ring, plate, pointer, rod, hook);
  let ext = 0;
  g.setForce = (F) => {
    ext = Math.max(0, Math.min(max * 1.06, F)) * perN;
    pointer.position.y = -0.012 - zero - ext;
    rod.position.y = -0.012 - zero - ext;
    rod.scale.y = length - zero + 0.012;
    hook.position.y = -0.012 - length - ext - 0.004 + zero;
    g.force = F;
  };
  g.hookY = () => hook.position.y - 0.006;
  g.setForce(0);
  return g;
}

/** 钩码（每个 0.5 N 那种），返回单个。 */
export function hookWeight({ r = 0.011, h = 0.02, color = 0x6a7385 } = {}) {
  const g = new THREE.Group();
  const body = hull(new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24), paint(color)), 0.0018);
  body.position.y = -h / 2 - 0.006;
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.0004, r + 0.0004, 0.003, 24), paint(0xc9a347));
  rim.position.y = -0.0075;
  const loop = new THREE.Mesh(new THREE.TorusGeometry(0.004, 0.0012, 6, 12), paint(C.rubber));
  loop.position.y = -0.002;
  g.add(body, rim, loop);
  g.height = h + 0.006;
  return g;
}

/** 木块。grain=true 时带木纹。 */
export function woodBlock(w, h, d, { color = 0xd9b07a } = {}) {
  const tex = canvasTex(256, 128, (g, W, H) => {
    g.fillStyle = '#e2bf8b'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 26; i++) {
      g.strokeStyle = `rgba(150,100,55,${0.08 + Math.random() * 0.15})`; g.lineWidth = 1 + Math.random() * 2;
      const y = Math.random() * H; g.beginPath(); g.moveTo(0, y);
      for (let x = 0; x <= W; x += 32) g.lineTo(x, y + Math.sin(x * 0.03 + i) * 3);
      g.stroke();
    }
  });
  const m = new THREE.MeshToonMaterial({ map: tex, color, gradientMap: paint(0xffffff).gradientMap });
  return inked(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m));
}

/** 课本里那种虚线辅助线 + 角度弧。 */
export function arc(radius, a0, a1, { color = INK, width = 1.3 } = {}) {
  const pts = [];
  for (let i = 0; i <= 24; i++) { const a = a0 + ((a1 - a0) * i) / 24; pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0)); }
  return polyline(pts, { color, width });
}

/** 带刻度的尺（贴图）。length 米，unit 每格的米数。 */
export function rulerMesh({ length = 0.3, width = 0.03, thick = 0.003, divisions = 300, every = 10, labelEvery = 10, startLabel = 0, color = '#f5f1e6' } = {}) {
  const tex = canvasTex(4096, Math.round((4096 * width) / length), (g, W, H) => {
    g.fillStyle = color; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#1d2433'; g.fillStyle = '#1d2433';
    g.font = `bold ${Math.round(H * 0.32)}px sans-serif`; g.textAlign = 'center';
    for (let i = 0; i <= divisions; i++) {
      const x = 8 + (i / divisions) * (W - 16), major = i % every === 0, half = i % (every / 2) === 0;
      const lw = Math.max(2, W / divisions / 7);     // 线宽跟着格子宽度走，缩小显示时不会消失
      g.lineWidth = major ? lw * 1.8 : lw;
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H * (major ? 0.42 : half ? 0.32 : 0.22)); g.stroke();
      if (i % labelEvery === 0) g.fillText(String(startLabel + i / every), x, H * 0.82);
    }
  });
  const top = new THREE.MeshBasicMaterial({ map: tex });
  const side = paint(0xe6dfcd);
  const m = new THREE.Mesh(new THREE.BoxGeometry(length, thick, width), [side, side, top, side, side, side]);
  inked(m, { width: 1.2 });
  return m;
}

/**
 * 一个小人（半身，面朝 +x），课本插图里学生的样子。scale 1 时头宽约 4 cm、总高约 13 cm。
 * 返回 group：.head（头的组，可以转）、.earY（耳朵高度）、.earZ（耳朵离中线）
 */
export function person({ shirt = 0x5b8fd6, hair = 0x2c2a33, skin = 0xf3c9a5 } = {}) {
  const g = new THREE.Group();
  const S = paint(skin), C = paint(shirt), H = paint(hair);
  // 身体：肩膀圆一点的躯干
  const torso = hull(new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.04, 6, 16), C), 0.0015);
  torso.scale.set(0.8, 1, 1.25);
  torso.position.y = 0.045;
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.009, 0.003, 6, 16), paint(0xffffff));
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.088;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.008, 0.012, 12), S);
  neck.position.y = 0.093;
  // 手臂
  for (const s of [-1, 1]) {
    const arm = hull(new THREE.Mesh(new THREE.CapsuleGeometry(0.008, 0.035, 4, 10), C), 0.0012);
    arm.position.set(0.004, 0.05, s * 0.036);
    arm.rotation.x = s * 0.12;
    const hand = hull(new THREE.Mesh(new THREE.SphereGeometry(0.0075, 12, 8), S), 0.001);
    hand.position.set(0.006, 0.022, s * 0.039);
    g.add(arm, hand);
  }
  // 头
  const head = new THREE.Group();
  head.position.y = 0.122;
  const skull = hull(new THREE.Mesh(new THREE.SphereGeometry(0.022, 24, 18), S), 0.0014);
  skull.scale.set(1, 1.08, 0.95);
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.0232, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), H);
  hairCap.scale.set(1.02, 1.1, 0.98);
  hairCap.rotation.z = 0.35;            // 刘海往前
  hairCap.position.set(-0.002, 0.002, 0);
  const back = new THREE.Mesh(new THREE.SphereGeometry(0.0225, 20, 12), H);
  back.scale.set(0.9, 0.95, 0.96);
  back.position.set(-0.006, 0.001, 0);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.0025, 10, 8), paint(0x1d1f26));
    eye.position.set(0.02, 0.003, s * 0.008);
    const ear = hull(new THREE.Mesh(new THREE.SphereGeometry(0.0055, 12, 8), S), 0.001);
    ear.scale.set(0.7, 1, 0.5);
    ear.position.set(-0.002, -0.001, s * 0.021);
    const cheek = new THREE.Mesh(new THREE.CircleGeometry(0.0035, 12), new THREE.MeshBasicMaterial({ color: 0xf2a0a0, transparent: true, opacity: 0.45 }));
    cheek.position.set(0.0195, -0.006, s * 0.011);
    cheek.rotation.y = Math.PI / 2 - s * 0.5;
    head.add(eye, ear, cheek);
  }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.0028, 10, 8), S);
  nose.position.set(0.022, -0.003, 0);
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.004, 0.0008, 4, 12, Math.PI), paint(0x9c4a3a));
  mouth.rotation.set(0, Math.PI / 2, Math.PI);
  mouth.position.set(0.0205, -0.009, 0);
  head.add(skull, back, hairCap, nose, mouth);
  g.add(torso, collar, neck, head);
  g.head = head;
  g.earY = 0.121; g.earZ = 0.021;
  return g;
}
