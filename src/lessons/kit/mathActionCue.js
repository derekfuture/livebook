import { Matrix4, Vector3 } from 'three';
import './mathActionCue.css';

// Project the silhouette, including thin or rotated pieces, in the current camera.
// A small handle gets a finger-sized ring; a larger prop keeps its own proportions.
function outline(object, camera, width, height) {
  const points = [], p = new Vector3(), matrix = new Matrix4();
  object.updateWorldMatrix(true, true);
  object.traverseVisible(mesh => {
    const pos = mesh.geometry?.attributes.position;
    if (!pos || mesh.isSprite) return;
    matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(mesh.matrixWorld);
    const { index, drawRange } = mesh.geometry;
    const end = Math.min(index?.count ?? pos.count, drawRange.start + drawRange.count);
    const stride = Math.max(1, Math.floor((end - drawRange.start) / 180));
    for (let i = drawRange.start; i < end; i += stride) {
      p.fromBufferAttribute(pos, index ? index.getX(i) : i).applyMatrix4(matrix);
      if (p.z >= -1 && p.z <= 1) points.push([(1 + p.x) * width / 2, (1 - p.y) * height / 2]);
    }
  });
  if (!points.length) return null;
  points.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const left = points[0][0], right = points.at(-1)[0];
  let top = Infinity, bottom = -Infinity;
  for (const [, y] of points) { top = Math.min(top, y); bottom = Math.max(bottom, y); }
  const x = (left + right) / 2, y = (top + bottom) / 2;
  if (Math.max(right - left, bottom - top) < 38) {
    const r = Math.max(18, Math.max(right - left, bottom - top) / 2 + 3);
    return { x, top: y - r, path: `M ${x - r} ${y} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0` };
  }
  function halfHull(sequence) {
    const hull = [];
    for (const c of sequence) {
      while (hull.length > 1) {
        const a = hull.at(-2), b = hull.at(-1);
        if ((b[0] - a[0]) * (c[1] - a[1]) > (b[1] - a[1]) * (c[0] - a[0])) break;
        hull.pop();
      }
      hull.push(c);
    }
    hull.pop();
    return hull;
  }
  const hull = [...halfHull(points), ...halfHull(points.reverse())];
  return { x, top, path: 'M' + hull.map(p => p.map(n => n.toFixed(1)).join(' ')).join('L') + 'Z' };
}

// Only the published math lessons opt in. The lesson chooses one actionable item
// by its actual phase, even when other items can still be freely explored.
export function mathActionCue(camera, pointer, dragApi, phase, select) {
  const items = new Map(dragApi.items().map(item => [item.obj, item]));
  const layer = document.createElement('div');
  layer.className = 'math-action-cue';
  layer.innerHTML = '<svg aria-hidden="true"><path class="shadow"/><path class="light"/><path class="core"/></svg><span></span>';
  const label = layer.querySelector('span'), paths = layer.querySelectorAll('path');
  document.body.append(layer);
  let target, step, lastProjection = -Infinity, quietUntil = 0, pressed = false;
  function hideBriefly() {
    quietUntil = performance.now() + 3000;
    layer.hidden = true;
  }
  layer.hidden = true;
  return {
    pointer: {
      ...pointer,
      down(ray, e) {
        pressed = pointer.down(ray, e);
        if (pressed) hideBriefly();
        return pressed;
      },
      move(ray, e) {
        const result = pointer.move(ray, e);
        if (pressed || (target && dragApi.hovered()?.obj === target)) hideBriefly();
        return result;
      },
      up(ray, e) {
        if (pressed) hideBriefly();
        pressed = false;
        return pointer.up(ray, e);
      },
    },
    update() {
      const nextStep = phase(), next = select(), time = performance.now();
      if (next !== target || nextStep !== step) {
        target = next; step = nextStep; quietUntil = 0; lastProjection = -Infinity;
      }
      const item = items.get(target);
      const guiding = !!item && item.enabled?.() !== false && item.obj.visible;
      document.body.classList.toggle('math-guiding', guiding);
      if (!guiding || time < quietUntil) { layer.hidden = true; return; }
      if (!layer.hidden && time - lastProjection < 32) return;
      lastProjection = time;
      const shape = outline(item.cueShape || item.obj, camera, innerWidth, innerHeight);
      if (!shape) { layer.hidden = true; return; }
      layer.hidden = false;
      layer.style.setProperty('--cue-color', item.cueColor || '#ffcc64');
      if (paths[0].getAttribute('d') !== shape.path) {
        for (const path of paths) path.setAttribute('d', shape.path);
      }
      const hint = item.cueText || item.hint;
      const message = typeof hint === 'function' ? hint() : hint;
      if (label.textContent !== message) label.textContent = message;
      const half = label.offsetWidth / 2 + 8;
      label.style.left = Math.max(half, Math.min(innerWidth - half, shape.x)) + 'px';
      label.style.top = Math.max(label.offsetHeight + 8, shape.top - 8) + 'px';
    },
    reset() { target = null; quietUntil = 0; pressed = false; layer.hidden = true; },
    dispose() { layer.remove(); document.body.classList.remove('math-guiding'); },
  };
}
