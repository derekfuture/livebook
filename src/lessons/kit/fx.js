// 粒子效果：气泡、蒸汽、分子、铁屑……都用 InstancedMesh / Points，一个场景几百个也不卡。
import * as THREE from 'three';
import { glowTexture } from './props.js';

/**
 * 通用粒子池。每个粒子 { p: Vector3, v: Vector3, life, age, size }。
 * spawn(fn) 加一个粒子；update(dt, step) 里 step(particle, dt) 返回 false 就回收。
 */
export class Particles {
  constructor({ max = 300, geometry, material, sprite = false, color = 0xffffff, size = 0.004, opacity = 0.8 } = {}) {
    this.max = max;
    this.list = [];
    if (sprite) {
      this.geo = new THREE.BufferGeometry();
      this.pos = new Float32Array(max * 3);
      this.alpha = new Float32Array(max);
      this.sizes = new Float32Array(max);
      this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
      this.geo.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1));
      this.geo.setAttribute('psize', new THREE.BufferAttribute(this.sizes, 1));
      this.mat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false,
        uniforms: { map: { value: glowTexture() }, color: { value: new THREE.Color(color) }, scale: { value: 1 }, uViewH: { value: innerHeight * Math.min(devicePixelRatio, 2) } },
        vertexShader: `attribute float alpha; attribute float psize; varying float vA; uniform float scale; uniform float uViewH;
          void main(){ vA = alpha; vec4 mv = modelViewMatrix * vec4(position,1.); gl_PointSize = psize * scale * projectionMatrix[1][1] * 0.5 * uViewH / -mv.z; gl_Position = projectionMatrix * mv; }`,
        fragmentShader: `uniform sampler2D map; uniform vec3 color; varying float vA;
          void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(color, t.a * vA); }`,
      });
      this.mesh = new THREE.Points(this.geo, this.mat);
      this.sprite = true;
    } else {
      this.mesh = new THREE.InstancedMesh(geometry || new THREE.SphereGeometry(size, 8, 6), material || new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity }), max);
      this.mesh.count = 0;
    }
    this.mesh.frustumCulled = false;
    this.mesh.raycast = () => {};
    this.m = new THREE.Matrix4();
    this.q = new THREE.Quaternion();
    this.s = new THREE.Vector3();
  }

  spawn(init) {
    if (this.list.length >= this.max) return null;
    const p = { p: new THREE.Vector3(), v: new THREE.Vector3(), age: 0, life: 1, size: 1, alpha: 1, ...init };
    this.list.push(p);
    return p;
  }

  clear() { this.list.length = 0; }

  update(dt, step) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.age += dt;
      const keep = step ? step(p, dt) : (p.p.addScaledVector(p.v, dt), true);
      if (keep === false || p.age > p.life) this.list.splice(i, 1);
    }
    if (this.sprite) {
      this.list.forEach((p, i) => { this.pos.set([p.p.x, p.p.y, p.p.z], i * 3); this.alpha[i] = p.alpha; this.sizes[i] = p.size; });
      this.geo.setDrawRange(0, this.list.length);
      this.geo.attributes.position.needsUpdate = true;
      this.geo.attributes.alpha.needsUpdate = true;
      this.geo.attributes.psize.needsUpdate = true;
    } else {
      this.list.forEach((p, i) => {
        this.s.setScalar(p.size);
        this.m.compose(p.p, p.rot || this.q, this.s);
        this.mesh.setMatrixAt(i, this.m);
        if (p.color && this.mesh.instanceColor !== undefined) this.mesh.setColorAt(i, p.color);
      });
      this.mesh.count = this.list.length;
      this.mesh.instanceMatrix.needsUpdate = true;
      if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    }
  }

  dispose() { this.mesh.geometry.dispose(); (this.mat || this.mesh.material).dispose?.(); }
}

/** 烧杯里的气泡。rate 每秒个数（0 = 不冒），grow=true 时上升途中变大（沸腾），false 变小（沸腾前）。 */
export function bubbles({ r = 0.045, max = 160 } = {}) {
  const ps = new Particles({ max, geometry: new THREE.SphereGeometry(1, 10, 8), material: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }) });
  let acc = 0;
  return {
    mesh: ps.mesh,
    /** level 液面高度；rate 每秒个数；grow 沸腾时气泡上升变大 */
    update(dt, { level, rate, grow }) {
      acc += rate * dt;
      while (acc > 1) {
        acc -= 1;
        const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * r * 0.85;
        ps.spawn({ p: new THREE.Vector3(Math.cos(a) * rr, 0.006, Math.sin(a) * rr), v: new THREE.Vector3(0, 0.05 + Math.random() * 0.05, 0), size: 0.0012 + Math.random() * 0.001, life: 6, grow });
      }
      ps.update(dt, (p, d) => {
        p.v.y += 0.12 * d;
        p.p.addScaledVector(p.v, d);
        p.p.x += Math.sin(p.age * 20 + p.size * 900) * 0.0003;
        p.size *= p.grow ? 1 + d * 1.6 : 1 - d * 1.5;
        if (!p.grow && p.size < 0.0004) return false;
        return p.p.y < level - p.size;
      });
    },
    dispose: () => ps.dispose(),
  };
}

/** 蒸汽/白气（往上飘、变大、变淡）。 */
export function steam({ max = 120, color = 0xffffff } = {}) {
  const ps = new Particles({ max, sprite: true, color });
  let acc = 0;
  return {
    mesh: ps.mesh,
    update(dt, { rate, origin, spread = 0.02, up = 0.06, size = 0.02 }) {
      acc += rate * dt;
      while (acc > 1) {
        acc -= 1;
        ps.spawn({ p: origin.clone().add(new THREE.Vector3((Math.random() - 0.5) * spread, 0, (Math.random() - 0.5) * spread)), v: new THREE.Vector3((Math.random() - 0.5) * 0.01, up * (0.7 + Math.random() * 0.6), 0), size, life: 2.4 });
      }
      ps.update(dt, (p, d) => {
        p.p.addScaledVector(p.v, d);
        p.v.x += (Math.random() - 0.5) * 0.02 * d;
        const k = p.age / p.life;
        p.alpha = Math.min(1, k * 6) * (1 - k) * 0.55;
        p.size = size * (1 + k * 2.5);
      });
    },
    dispose: () => ps.dispose(),
  };
}

export { THREE };
