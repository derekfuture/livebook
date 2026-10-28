import * as THREE from 'three';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

// “课本插图”画风：柔和的分层上色 + 深色描边。所有立体图都用这里的材质，看起来像一套。
export const INK = 0x2a3040;
export const MAGENTA = 0xd4006c;      // 课本里力的箭头用的品红

const ramp = (() => {
  const data = new Uint8Array([150, 205, 238, 255]);
  const t = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();

const mats = new Map();
const shared = new Set();     // 缓存里的共享材质，拆场景时不能释放

// 画风：color = 平涂上色（默认）；ink = 钢笔排线（像课本插图 / Every Joule），只给“有意义的东西”留颜色。
// 用 ?style=ink 切换。透明材质（玻璃、液体）和发光的东西不受影响。
export const STYLE = new URLSearchParams(location.search).get('style') || 'color';
const hatch = (m, tint) => {
  // 世界坐标里的排线（三向投影），按光照明暗分三层：亮处留白，中间一层斜线，暗处交叉线
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTint = { value: new THREE.Color(tint) };
    sh.uniforms.uSpace = { value: 0.0065 };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uTint; uniform float uSpace; varying vec3 vWP; varying vec3 vWN;\nfloat hline(float x, float w){ float d = abs(fract(x) - 0.5); float aa = fwidth(x) * 1.2; return 1.0 - smoothstep(w - aa, w + aa, d); }')
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        float lum = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
        vec3 an = abs(normalize(vWN));
        vec2 p = an.x > an.y && an.x > an.z ? vWP.zy : an.y > an.z ? vWP.xz : vWP.xy;
        p /= uSpace;
        float tone = lum * (0.55 + 0.45 * dot(uTint, vec3(0.299, 0.587, 0.114)));
        float h1 = hline((p.x + p.y) * 0.7071, 0.09) * (1.0 - smoothstep(0.78, 0.9, tone));
        float h2 = hline((p.x - p.y) * 0.7071, 0.08) * (1.0 - smoothstep(0.58, 0.7, tone));
        float h3 = hline(p.y * 1.0 + 0.25, 0.07) * (1.0 - smoothstep(0.36, 0.46, tone));
        float inkAmt = max(h1, max(h2, h3));
        vec3 paperC = mix(vec3(0.985, 0.975, 0.95), uTint, 0.22);
        gl_FragColor.rgb = mix(paperC, vec3(0.14, 0.15, 0.2), inkAmt * 0.72);`);
  };
  m.customProgramCacheKey = () => 'hatch2';
  return m;
};

/** 上色材质。unique: true 时给一份独立的（要单独改颜色/透明度的物体用）。keep: true 时墨线画风下也保留颜色。 */
export function paint(color, { unique = false, keep = false, ...opts } = {}) {
  const key = `${color}|${keep}|${JSON.stringify(opts)}`;
  if (!unique && mats.has(key)) return mats.get(key);
  const ink = STYLE === 'ink' && !keep && !opts.transparent && !opts.map;
  const m = ink ? new THREE.MeshLambertMaterial({ color: 0xffffff, ...opts }) : new THREE.MeshToonMaterial({ color, gradientMap: ramp, ...opts });
  if (ink) hatch(m, color);
  if (!unique) { mats.set(key, m); shared.add(m); }
  return m;
}

const lineMats = new Map();
export function inkLine(width = 1.6, color = INK, opacity = 1) {
  const key = `${width}|${color}|${opacity}`;
  if (lineMats.has(key)) return lineMats.get(key);
  const m = new LineMaterial({ color, linewidth: width, transparent: opacity < 1, opacity, worldUnits: false });
  lineMats.set(key, m);
  shared.add(m);
  return m;
}

/** 给网格加描边（按折角取边）。返回网格本身，方便链式写。 */
export function inked(mesh, { angle = 28, width = 1.6, color = INK, opacity = 1 } = {}) {
  if (STYLE === 'ink') { width *= 0.6; angle = Math.max(angle, 40); }
  const edges = new THREE.EdgesGeometry(mesh.geometry, angle);
  const g = new LineSegmentsGeometry().fromEdgesGeometry(edges);
  edges.dispose();
  const line = new LineSegments2(g, inkLine(width, color, opacity));
  line.raycast = () => {};
  mesh.add(line);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** 外轮廓（反面放大一圈），给球、圆柱这种没有折角的物体勾边。 */
export function hull(mesh, thickness = 0.012, color = INK) {
  if (STYLE === 'ink') { mesh.castShadow = mesh.receiveShadow = true; return mesh; }   // 轮廓由后期画
  const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
  m.onBeforeCompile = (s) => {
    s.uniforms.uThick = { value: thickness };
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uThick;')
      .replace('#include <begin_vertex>', 'vec3 transformed = position + normal * uThick;');
  };
  const h = new THREE.Mesh(mesh.geometry, m);
  h.raycast = () => {};
  mesh.add(h);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** 透明玻璃的轮廓：只画很淡的背面外壳边缘（不会挡住里面的东西）。 */
export function glassEdge(mesh, thickness = 0.0008, color = 0x5d7f95) {
  const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide, transparent: true, opacity: 0.35, depthWrite: false });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uThick = { value: thickness };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uThick;')
      .replace('#include <begin_vertex>', 'vec3 transformed = position + normal * uThick;');
  };
  const h = new THREE.Mesh(mesh.geometry, m);
  h.raycast = () => {};
  h.renderOrder = (mesh.renderOrder || 0) - 1;
  mesh.add(h);
  return mesh;
}

/** 一条折线（世界宽度固定的像素线）。points: Vector3[]，dashed 可选。 */
export function polyline(points, { width = 1.6, color = INK, dashed = false, dash = 0.03, gap = 0.02, opacity = 1 } = {}) {
  const pos = [];
  for (let i = 0; i < points.length - 1; i++) pos.push(...points[i].toArray(), ...points[i + 1].toArray());
  const g = new LineSegmentsGeometry().setPositions(pos);
  const m = new LineMaterial({ color, linewidth: width, dashed, dashSize: dash, gapSize: gap, transparent: opacity < 1, opacity, worldUnits: false });
  const l = new LineSegments2(g, m);
  if (dashed) l.computeLineDistances();
  l.raycast = () => {};
  return l;
}

/** 力的箭头（课本里的品红箭头）。长度可以随时改。 */
export function arrow(color = MAGENTA, radius = 0.006) {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, 10), mat);
  const head = new THREE.Mesh(new THREE.ConeGeometry(radius * 3, radius * 9, 14), mat);
  group.add(shaft, head);
  const up = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion();
  group.set = (from, vec) => {
    const len = vec.length();
    group.visible = len > 1e-4;
    if (!group.visible) return;
    const hl = Math.min(radius * 9, len * 0.6);
    group.position.copy(from);
    q.setFromUnitVectors(up, vec.clone().normalize());
    group.quaternion.copy(q);
    shaft.scale.y = Math.max(1e-4, len - hl);
    shaft.position.y = (len - hl) / 2;
    head.scale.setScalar(hl / (radius * 9));
    head.position.y = len - hl / 2;
  };
  return group;
}

/** 课本风格的纸面小平台：立体图从书上“站起来”时脚下那块纸。 */
export function paperCard(w, d) {
  const g = new THREE.BoxGeometry(w, 0.002, d);
  const m = inked(new THREE.Mesh(g, paint(0xfdfbf5, { keep: true })), { width: 1.2, opacity: 0.6 });
  m.position.y = -0.0012;      // 顶面略低于 y = 0，实验里的东西放在 y = 0 上不会陷进去
  return m;
}

/** 实验台板：一块有厚度的硬纸板，实验器材站在它上面（像立体书的底座）。顶面在 y = 0。 */
export function labBase(w, d, t = 0.008) {
  const g = new THREE.Group();
  const top = paint(0xf1e8d4, { keep: true }), side = paint(0xd9c9a6, { keep: true });
  const m = inked(new THREE.Mesh(new THREE.BoxGeometry(w, t, d), [side, side, top, side, side, side]), { width: 1.4, opacity: 0.85 });
  m.position.y = -t / 2;
  m.receiveShadow = true;
  g.add(m);
  return g;
}

export function disposeTree(root) {
  root.traverse((o) => {
    o.geometry?.dispose();
    for (const m of [o.material].flat()) if (m && !shared.has(m)) m.dispose();
  });
}
