import * as THREE from 'three';
import { viewport } from '../ui/viewport.js';

const radius = 28; // 手指到物体轮廓的距离，单位是可见页面的 CSS 像素。
const v = new THREE.Vector3();
function selectable(mesh, roots) {
  if (!mesh.isMesh || mesh.userData.wire || mesh.material?.isLineMaterial) return false;
  if (mesh.material?.visible === false && !mesh.userData.pick && !roots.includes(mesh)) return false;
  for (let p = mesh; p; p = p.parent) if (!p.visible) return false;
  return true;
}

// 只在按下的那一帧寻找最近的轮廓。先用包围盒排除远处的网格，再投影候选网格的三角形边。
// 返回稍稍落在三角形内部的点，供原课的射线拾取和拖动平面继续使用。
function nearestPoint(roots, recursive, camera, finger) {
  let best = radius ** 2, point = null;
  const matrix = new THREE.Matrix4(), projection = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  function visit(mesh) {
    const positions = mesh.geometry?.attributes.position;
    if (!positions || mesh.isInstancedMesh || !selectable(mesh, roots)) return;
    const geo = mesh.geometry;
    if (!geo.boundingBox) geo.computeBoundingBox();
    const { min, max } = geo.boundingBox;
    matrix.multiplyMatrices(projection, mesh.matrixWorld);
    const project = () => {
      v.applyMatrix4(matrix);
      v.x = (1 + v.x) * viewport.width / 2 - finger.x;
      v.y = (1 - v.y) * viewport.height / 2 - finger.y;
    };
    let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
    for (let i = 0; i < 8; i++) {
      v.set(i & 1 ? max.x : min.x, i & 2 ? max.y : min.y, i & 4 ? max.z : min.z);
      project();
      left = Math.min(left, v.x); right = Math.max(right, v.x);
      top = Math.min(top, v.y); bottom = Math.max(bottom, v.y);
    }
    if (left > radius || right < -radius || top > radius || bottom < -radius) return;
    const vertices = Array.from({ length: positions.count }, (_, i) => {
      v.fromBufferAttribute(positions, i); project(); return v.clone();
    });
    const indices = geo.index?.array;
    const edge = (a, b, c) => {
      const dx = b.x - a.x, dy = b.y - a.y;
      const t = THREE.MathUtils.clamp(-(a.x * dx + a.y * dy) / (dx * dx + dy * dy || 1), 0, 1);
      const x = a.x + t * dx, y = a.y + t * dy;
      const d = x * x + y * y;
      if (d >= best || Math.abs(a.z + t * (b.z - a.z)) > 1) return;
      best = d;
      point = new THREE.Vector2(x + (c.x - x) * 0.001, y + (c.y - y) * 0.001);
    };
    const vertex = i => vertices[indices ? indices[i] : i];
    const count = indices?.length ?? vertices.length;
    for (let i = 0; i + 2 < count; i += 3) {
      const a = vertex(i), b = vertex(i + 1), c = vertex(i + 2);
      edge(a, b, c); edge(b, c, a); edge(c, a, b);
    }
  }
  for (const obj of roots) {
    if (recursive) obj.traverseVisible(visit); else visit(obj);
  }
  return point;
}

export class TouchRaycaster extends THREE.Raycaster {
  start(ndc, event, camera, items) {
    this.offset = new THREE.Vector2();
    this.setFromCamera(ndc, camera);
    this.finger = { x: event.clientX, y: event.clientY };
    if (!items?.length) return; // 自定义拾取：在该课给出候选物体时查找。
    const roots = items.filter(it => it.enabled?.() !== false).map(it => it.obj).filter(Boolean);
    const hits = super.intersectObjects(roots);
    if (!hits.some(hit => selectable(hit.object, roots))) {
      const delta = nearestPoint(roots, true, camera, this.finger);
      if (delta) this.offset.set(2 * delta.x / viewport.width, -2 * delta.y / viewport.height);
    }
    this.finger = null;
    this.track(ndc, camera);
  }

  track(ndc, camera) {
    this.finger = null;
    this.setFromCamera(ndc.clone().add(this.offset), camera);
    return this;
  }

  intersectObjects(objects, recursive = true, hits = []) {
    super.intersectObjects(objects, recursive, hits);
    if (!this.finger || hits.some(hit => selectable(hit.object, objects))) return hits;
    const delta = nearestPoint(objects, recursive, this.camera, this.finger);
    if (!delta) return hits;
    const probe = new THREE.Raycaster();
    const { x, y } = this.finger;
    probe.setFromCamera(new THREE.Vector2(2 * (x + delta.x) / viewport.width - 1, 1 - 2 * (y + delta.y) / viewport.height), this.camera);
    return probe.intersectObjects(objects, recursive, hits);
  }

  intersectObject(object, recursive = true, hits = []) {
    return this.intersectObjects([object], recursive, hits);
  }
}
