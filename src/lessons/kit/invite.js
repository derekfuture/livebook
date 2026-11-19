// “该动这个了”的提示光圈：一圈橙色的光，平躺着、往外扩散。
// 放在桌上的东西：光圈贴在桌面上、落在它底下；悬在半空的东西（比如乳胶管上的弹簧夹）：同样的光圈抬到它自己那一层，平躺着套住它。
// 大小按那件东西的实际范围自动定。由底部步骤栏驱动：每一步写明 target（要动的是哪件东西），到这一步就出现，做完就消失。
import * as THREE from 'three';
import { canvasTex } from './props.js';

let tex = null;
const ringTex = () => tex || (tex = canvasTex(128, 128, (g, W) => {
  g.strokeStyle = 'rgba(255,255,255,1)'; g.lineWidth = 7; g.beginPath(); g.arc(W / 2, W / 2, W * 0.4, 0, Math.PI * 2); g.stroke();
}));

export function inviteRing(group, { color = 0xff6a3d, ground = 0.02 } = {}) {
  const ring = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: ringTex(), color, transparent: true, opacity: 0, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.renderOrder = 6; ring.raycast = () => {}; ring.visible = false;
  group.add(ring);
  const box = new THREE.Box3(), tmp = new THREE.Box3(), inv = new THREE.Matrix4(), m = new THREE.Matrix4(), c = new THREE.Vector3(), sz = new THREE.Vector3();
  // 量这件东西在 group 里占的范围（不算看不见的拾取盒）
  const measure = (obj) => {
    box.makeEmpty();
    group.updateMatrixWorld(true);
    inv.copy(group.matrixWorld).invert();
    obj.traverseVisible((o) => {
      // 不算：拾取盒、看不见的；实例网格（气泡、颗粒）和点——它们的几何体是单位大小的模板，包围盒不代表实际范围
      if (!o.isMesh || o.isInstancedMesh || o.isPoints || o.userData.pick || o.material?.visible === false) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      tmp.copy(o.geometry.boundingBox).applyMatrix4(m.multiplyMatrices(inv, o.matrixWorld));
      box.union(tmp);
    });
    return !box.isEmpty();
  };
  let t = 0;
  return {
    mesh: ring,
    /** target：要动的那件东西（Object3D），null = 不显示 */
    update(target, dt) {
      t += dt;
      if (!target || !measure(target)) { ring.visible = false; return; }
      box.getCenter(c); box.getSize(sz);
      const r = Math.hypot(sz.x, sz.z) / 2 + 0.012;      // 按底面的对角线：方箱子四个角外面也露出光圈
      const onTable = box.min.y < ground;
      const ry = target.userData?.ringY;          // 插在试管架上的东西：桌面那一圈会被架子挡住，课程给一个高度（架子顶上）
      ring.position.set(c.x, typeof ry === 'number' ? ry : onTable ? 0.0015 : c.y, c.z);
      const k = (t * 0.9) % 1;
      ring.scale.setScalar(r * 2 * (0.85 + k * 0.4));
      ring.material.opacity = 0.85 * (1 - k);
      ring.visible = true;
    },
    dispose() { group.remove(ring); ring.geometry.dispose(); ring.material.dispose(); },
  };
}
