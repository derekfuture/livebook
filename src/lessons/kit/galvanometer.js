// 居中零位的灵敏电流计。正偏转是电流由红接线柱进入时的读数。
import * as THREE from 'three';
import { paint, hull, inked } from '../../live/ink.js';
import { canvasTex } from './props.js';
export function galvanometer() {
  const G = new THREE.Group();
  const box = inked(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.03), paint(0xb07a45)), { width: 1.2 });
  box.position.y = 0.035;
  const dialTex = canvasTex(512, 300, (c, w, h) => {
    c.fillStyle = '#fbfbf7';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#1d2433';
    c.fillStyle = '#1d2433';
    c.lineWidth = 4;
    const cx = w / 2,
      cy = h * 0.95,
      R = h * 0.8;
    c.beginPath();
    c.arc(cx, cy, R, -Math.PI / 2 - 0.7, -Math.PI / 2 + 0.7);
    c.stroke();
    for (let i = -10; i <= 10; i++) {
      const a = -Math.PI / 2 + (i / 10) * 0.7,
        r0 = R - (i % 5 === 0 ? 30 : 16);
      c.lineWidth = i % 5 === 0 ? 5 : 3;
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      c.lineTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      c.stroke();
    }
    c.font = 'bold 40px sans-serif';
    c.textAlign = 'center';
    c.fillText('0', cx, cy - R - 12);
    c.fillText('G', cx, cy - R * 0.4);
  });
  const dial = new THREE.Mesh(new THREE.PlaneGeometry(0.056, 0.033), new THREE.MeshBasicMaterial({ map: dialTex }));
  dial.position.set(0, 0.048, 0.0155);
  const pivot = new THREE.Group();
  pivot.position.set(0, 0.048 - 0.033 / 2 + 0.001, 0.0162);
  const needle = new THREE.Mesh(
    new THREE.BoxGeometry(0.0007, 0.027, 0.0004),
    new THREE.MeshBasicMaterial({ color: 0xd23b2b }),
  );
  needle.position.y = 0.0135;
  pivot.add(needle);
  const posts = [-1, 1].map((s) => {
    const p = hull(
      new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.008, 10), paint(s > 0 ? 0xc0392b : 0x23293a)),
      0.0008,
    );
    p.position.set(s * 0.018, 0.004, 0.02);
    G.add(p);
    return p;
  });
  G.add(box, dial, pivot);
  return { group: G, pivot, posts };
}
