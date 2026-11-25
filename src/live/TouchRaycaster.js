import * as THREE from 'three';

// 手指刚好落在小零件边上时，补一次对该零件中心的拾取。
// 只看实验本次交给射线的物件。拖动平面仍用手指的原始射线。
export class TouchRaycaster extends THREE.Raycaster {
  setTouch(event) {
    this.touch = event?.pointerType === 'touch' && window.__lbPhoneScale < 1 ? event : null;
  }

  intersectObjects(objects, recursive = true, hits = []) {
    super.intersectObjects(objects, recursive, hits);
    if (hits.length || !this.touch || !this.camera) return hits;
    const center = new THREE.Vector3(), cameraSpace = new THREE.Vector3();
    const pixelScale = window.__lbPhoneScale;
    let distance = 16, nearest;
    for (const obj of objects) {
      if (!obj.isMesh || !obj.visible || obj.userData.wire || obj.isInstancedMesh) continue;
      if (!obj.geometry.boundingSphere) obj.geometry.computeBoundingSphere();
      const sphere = obj.geometry.boundingSphere;
      obj.localToWorld(center.copy(sphere.center));
      const depth = -cameraSpace.copy(center).applyMatrix4(this.camera.matrixWorldInverse).z;
      if (depth <= 0) continue;
      const radius = sphere.radius * obj.matrixWorld.getMaxScaleOnAxis();
      const projectedRadius = radius * innerHeight * pixelScale * this.camera.projectionMatrix.elements[5] / (2 * depth);
      if (projectedRadius > 22) continue;
      center.project(this.camera);
      const x = (center.x + 1) * innerWidth / 2, y = (1 - center.y) * innerHeight / 2;
      const offset = Math.hypot(x - this.touch.clientX, y - this.touch.clientY) * pixelScale;
      if (offset < distance) { distance = offset; nearest = { obj, point: center.clone() }; }
    }
    if (nearest) {
      const probe = new THREE.Raycaster();
      probe.setFromCamera(nearest.point, this.camera);
      probe.intersectObject(nearest.obj, recursive, hits);
    }
    return hits;
  }
}
