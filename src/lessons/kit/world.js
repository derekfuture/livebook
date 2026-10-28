// 书本世界里的“控件”：不用网页面板，做成场景里的实物。
//   popup()      立体书式的场景切换：当前器材折平倒回纸面，另一套从纸上站起来
//   paperCard()  平放在书页上的小纸卡（换场景、换条件用），点一下就选中
//   pencil()     一支铅笔：点它把当前数据记下来
//   jug()        一个水壶：点它往杯里倒水
// 这些物件都带 onTap，交给 interact.js 的 draggable 统一处理（{ obj, onTap }）。
import * as THREE from 'three';
import { paint, inked, hull } from '../../live/ink.js';
import { Paper, HAND, SONG, PENCIL, BLUE, roundRect } from '../../live/paper.js';

const backOut = (t) => { const c = 1.6; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

/** 立体书式的场景切换。scenes：{ id: Group }。switchTo(id) 时旧场景折倒、新场景立起。 */
export function popup(scenes, { duration = 0.5, onShown } = {}) {
  const ids = Object.keys(scenes);
  let cur = ids[0], next = null, t = 0;
  for (const id of ids) { scenes[id].visible = id === cur; scenes[id].scale.y = id === cur ? 1 : 0.001; }
  return {
    get current() { return next || cur; },
    switchTo(id) { if (id === (next || cur)) return; next = id; t = 0; scenes[id].visible = true; scenes[id].scale.y = 0.001; },
    update(dt) {
      if (!next) return;
      t += dt / duration;
      const a = scenes[cur], b = scenes[next];
      if (t < 1) { const k = Math.min(1, t); a.scale.y = Math.max(0.001, 1 - k * k); a.rotation.x = -k * 0.5; }
      else {
        a.visible = false; a.rotation.x = 0;
        const k = Math.min(1, t - 1);
        b.scale.y = Math.max(0.001, backOut(k)); b.rotation.x = -(1 - k) * 0.5;
        if (k >= 1) { b.scale.y = 1; b.rotation.x = 0; cur = next; next = null; onShown?.(cur); }
      }
    },
  };
}

/**
 * 平放在纸面上的小卡片（像夹在书里的索引卡）。text 支持换行；active 时有蓝色边、略微抬起。
 * 返回 Mesh，mesh.setActive(bool)；尺寸单位：米（w×h）。
 */
export function paperCard(text, { w = 0.07, h = 0.028, color = '#fdf8ea', size } = {}) {
  const p = new Paper({ w, h, units: 140, res: 512, color });
  const draw = (active) => p.draw((g) => {
    const H = p.unitsH;
    if (active) { g.strokeStyle = BLUE; g.lineWidth = 3; roundRect(g, 3, 3, 134, H - 6, 6); g.stroke(); }
    else { g.strokeStyle = 'rgba(120,100,60,.35)'; g.lineWidth = 1.2; roundRect(g, 3, 3, 134, H - 6, 6); g.stroke(); }
    const lines = String(text).split('\n');
    const fs = size || Math.min(26, (H - 14) / lines.length);
    lines.forEach((ln, i) => Paper.hand(g, ln, 70, H / 2 + fs * 0.36 + (i - (lines.length - 1) / 2) * fs * 1.15, { size: fs, align: 'center', color: active ? BLUE : PENCIL }));
  });
  draw(false);
  const m = p.mesh;
  m.rotation.x = -Math.PI / 2;
  m.castShadow = true;
  m.setActive = (on) => { draw(on); m.position.y = (m.userData.y0 ?? m.position.y) + (on ? 0.002 : 0); };
  m.userData.paper = p;
  return m;
}

/** 一支铅笔（平放，笔尖朝 +x）。 */
export function pencil() {
  const g = new THREE.Group();
  const body = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.09, 6), paint(0xf2c94c)), 0.0012);
  body.rotation.z = Math.PI / 2;
  const tipWood = new THREE.Mesh(new THREE.ConeGeometry(0.004, 0.014, 6), paint(0xe9c99a));
  tipWood.rotation.z = -Math.PI / 2;
  tipWood.position.x = 0.052;
  const lead = new THREE.Mesh(new THREE.ConeGeometry(0.0014, 0.005, 6), paint(0x3a3f4e));
  lead.rotation.z = -Math.PI / 2;
  lead.position.x = 0.0605;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0042, 0.0042, 0.006, 12), paint(0xb0b7c3));
  band.rotation.z = Math.PI / 2;
  band.position.x = -0.047;
  const eraser = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.007, 12), paint(0xf2a0a0));
  eraser.rotation.z = Math.PI / 2;
  eraser.position.x = -0.0535;
  g.add(body, tipWood, lead, band, eraser);
  g.position.y = 0.004;
  let wiggle = 0, ready = false;
  g.setReady = (on) => { ready = on; };
  g.write = () => { wiggle = 1; };
  g.update = (dt, t) => {
    wiggle = Math.max(0, wiggle - dt * 1.6);
    g.rotation.y = Math.sin(wiggle * 22) * 0.18 * wiggle;
    g.rotation.z = ready && !wiggle ? Math.sin(t * 4) * 0.08 + 0.1 : wiggle * 0.3;   // 可以记录时，铅笔会“翘起来”招手
    g.position.y = 0.004 + (ready ? 0.006 + Math.sin(t * 4) * 0.002 : 0);
  };
  return g;
}

/** 水壶（点它就倒水）。返回 Group，pour() 播放倾倒动画。 */
export function jug({ color = 0xdff1f8 } = {}) {
  const g = new THREE.Group();
  const pts = [new THREE.Vector2(0.001, 0), new THREE.Vector2(0.026, 0), new THREE.Vector2(0.028, 0.05), new THREE.Vector2(0.022, 0.07), new THREE.Vector2(0.024, 0.075)];
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 32), paint(color, { transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }));
  hull(body, 0.0008);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.04, 24), paint(0x8fd0ef, { transparent: true, opacity: 0.6 }));
  water.position.y = 0.022;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.003, 8, 20, Math.PI), paint(0x9fb7c6));
  handle.rotation.z = -Math.PI / 2;
  handle.position.set(-0.028, 0.04, 0);
  const spout = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.02, 12, 1, true), paint(color, { transparent: true, opacity: 0.6, side: THREE.DoubleSide }));
  spout.rotation.z = -Math.PI / 2 - 0.5;
  spout.position.set(0.03, 0.07, 0);
  const pivot = new THREE.Group();
  pivot.add(body, water, handle, spout);
  g.add(pivot);
  let tip = 0;
  g.pour = () => { tip = 1; };
  g.update = (dt) => { tip = Math.max(0, tip - dt * 0.9); pivot.rotation.z = -Math.sin(Math.min(1, tip) * Math.PI) * 0.9; };
  return g;
}

export { HAND, SONG };
