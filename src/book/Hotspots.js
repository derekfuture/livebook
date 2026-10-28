import * as THREE from 'three';
import { tag } from '../ui/tags.js';

// 书页上“会动的图”：在原图外画一圈呼吸的光边，并挂一个小标签。
const vert = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const frag = /* glsl */`
  uniform float uTime, uHover, uAlpha, uPad;
  uniform vec2 uSize;
  varying vec2 vUv;
  float sdBox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
  void main() {
    vec2 p = (vUv - 0.5) * uSize;
    float d = sdBox(p, uSize * 0.5 - uPad, 0.025);
    float line = smoothstep(0.006, 0.0, abs(d));
    float glow = exp(-max(d, 0.0) * 55.0) * step(0.0, d);
    float a = atan(p.y, p.x);
    float run = 0.5 + 0.5 * sin(a * 2.0 - uTime * 2.4);
    float breathe = 0.65 + 0.35 * sin(uTime * 2.2);
    vec3 c1 = vec3(1.0, 0.42, 0.24), c2 = vec3(0.92, 0.12, 0.45);
    vec3 col = mix(c1, c2, run);
    float inside = (1.0 - step(0.0, d)) * (0.035 + 0.06 * uHover);
    float alpha = line * (0.55 + 0.45 * run) + glow * 0.5 * breathe + inside;
    gl_FragColor = vec4(col, alpha * uAlpha * (0.75 + 0.25 * uHover + 0.25 * uHover));
  }
`;

export class Hotspots {
  constructor(stage, book, spots) {
    this.stage = stage;
    this.book = book;
    this.spots = spots;
    this.active = [];
    this.hovered = null;
    this.enabled = true;
    book.on((type) => {
      if (type === 'turnstart') this.clear();
      else this.build();
    });
    stage.updaters.add((dt, t) => this.update(dt, t));
  }

  clear() {
    for (const h of this.active) {
      this.book.group.remove(h.mesh);
      h.mesh.geometry.dispose(); h.mesh.material.dispose();
      h.label.remove();
    }
    this.active = [];
    this.hovered = null;
  }

  build() {
    this.clear();
    const book = this.book;
    for (const s of this.spots) {
      if (!book.sideOf(s.page)) continue;
      const [x0, y0, x1, y1] = s.bbox;
      const a = book.pageToWorld(s.page, x0, y0), b = book.pageToWorld(s.page, x1, y1);
      const pad = 0.05;
      const w = Math.abs(b.x - a.x) + pad * 2, d = Math.abs(b.z - a.z) + pad * 2;
      const mat = new THREE.ShaderMaterial({
        vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false,
        uniforms: { uTime: { value: 0 }, uHover: { value: 0 }, uAlpha: { value: 0 }, uPad: { value: pad }, uSize: { value: new THREE.Vector2(w, d) } },
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set((a.x + b.x) / 2, Math.max(a.y, b.y) + 0.001, (a.z + b.z) / 2);
      mesh.renderOrder = 2;
      mesh.userData.spot = s;
      book.group.add(mesh);
      const label = tag(`✦ ${s.label || '让它动起来'}`, 'pill');
      label.at(mesh.position.x, mesh.position.y, mesh.position.z - d / 2 + 0.005);
      this.active.push({ spot: s, mesh, label, hover: 0 });
    }
  }

  pick(raycaster) {
    if (!this.enabled) return null;
    const hits = raycaster.intersectObjects(this.active.map((h) => h.mesh), false);
    return hits.length ? hits[0].object.userData.spot : null;
  }

  setHover(spot) { this.hovered = spot; }

  update(dt, t) {
    for (const h of this.active) {
      const u = h.mesh.material.uniforms;
      u.uTime.value = t;
      u.uAlpha.value += ((this.enabled ? 1 : 0) - u.uAlpha.value) * Math.min(1, dt * 4);
      h.hover += ((this.hovered === h.spot ? 1 : 0) - h.hover) * Math.min(1, dt * 8);
      u.uHover.value = h.hover;
      h.label.show(this.enabled);
    }
  }
}
