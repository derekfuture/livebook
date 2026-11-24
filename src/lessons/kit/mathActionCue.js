import { Box3, Vector3 } from 'three';
import './mathActionCue.css';

// The pick area can be much bigger than the prop. Only change the visible
// material(s) named by the lesson. A sprite handle also grows around its centre.
function highlight(item) {
  const colors = new Map(), sizes = new Map();
  const target = item.cueTarget || item.obj;
  const parts = Array.isArray(target) ? target : [target];
  function collect(part) {
    if (!part.material) return;
    for (const material of Array.isArray(part.material) ? part.material : [part.material]) {
      if (!material.visible || !material.color || colors.has(material.color)) continue;
      const color = material.color;
      colors.set(color, { base: color.clone(), last: color.clone() });
    }
  }
  for (const part of parts) {
    if (part.isGroup) part.traverse(collect);
    else collect(part);
    if (part.isSprite || item.cueGrow) sizes.set(part, part.scale.clone());
  }
  return amount => {
    for (const [color, { base, last }] of colors) {
      // Some lessons recolour a piece when it moves to its next position.
      if (!color.equals(last)) base.copy(color);
      const gain = 1 + 0.75 * amount;
      color.setRGB(base.r * gain + 0.26 * amount, base.g * gain + 0.20 * amount, base.b * gain + 0.13 * amount);
      last.copy(color);
    }
    for (const [part, scale] of sizes) {
      part.scale.copy(scale).multiplyScalar(1 + (part.isSprite ? 0.42 : 0.18) * amount);
    }
    item.cuePulse?.(amount);
  };
}

export function mathActionCue(camera, pointer, dragApi, select) {
  const items = new Map(dragApi.items().map(item => [item.obj, item]));
  const label = document.createElement('div');
  label.className = 'math-action-cue';
  label.hidden = true;
  document.body.append(label);
  const bounds = new Box3(), point = new Vector3();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let current, pulse, pressed = false, quietUntil = 0, lastFrame = -Infinity;

  function clear() {
    pulse?.(0);
    pulse = null;
    current = null;
    label.hidden = true;
  }
  function pause() {
    quietUntil = performance.now() + 3000;
    clear();
  }
  return {
    pointer: {
      ...pointer,
      down(ray, e) {
        pressed = pointer.down(ray, e);
        if (pressed) pause();
        return pressed;
      },
      move(ray, e) {
        const result = pointer.move(ray, e);
        const hovered = dragApi.hovered()?.obj;
        if (pressed || (hovered && hovered === select())) pause();
        return result;
      },
      up(ray, e) {
        if (pressed) pause();
        pressed = false;
        return pointer.up(ray, e);
      },
    },
    update() {
      const item = items.get(select()), time = performance.now();
      const guiding = !!item && item.enabled?.() !== false && item.obj.visible;
      document.body.classList.toggle('math-guiding', guiding);
      if (!guiding || pressed || time < quietUntil) {
        if (current) clear();
        return;
      }
      if (item !== current) {
        clear();
        current = item;
        pulse = highlight(item);
      } else if (time - lastFrame < 32) return;
      lastFrame = time;
      pulse(reduced.matches ? 0.8 : 0.82 + 0.18 * Math.sin(time * 0.0028));

      // Project the existing pick bounds to place the text above the handle.
      // Three caches geometry bounds, so this does not sample mesh vertices.
      item.obj.updateWorldMatrix(true, false);
      bounds.setFromObject(item.obj);
      if (bounds.isEmpty()) { label.hidden = true; return; }
      bounds.getCenter(point);
      point.y = bounds.max.y;
      point.project(camera);
      if (point.z < -1 || point.z > 1) { label.hidden = true; return; }
      const hint = item.cueText || item.hint;
      const message = typeof hint === 'function' ? hint() : hint;
      if (label.textContent !== message) label.textContent = message;
      label.hidden = false;
      const half = label.offsetWidth / 2 + 8;
      let x = (1 + point.x) * innerWidth / 2;
      if (item.cueTarget?.isSprite) {
        // Leave the point and its axis markings clear.
        x += x + 2 * half < innerWidth ? half + 4 : -half - 4;
      }
      label.style.left = Math.max(half, Math.min(innerWidth - half, x)) + 'px';
      label.style.top = Math.max(label.offsetHeight + 8, (1 - point.y) * innerHeight / 2 - 8) + 'px';
    },
    reset() { clear(); pressed = false; quietUntil = 0; },
    dispose() { clear(); label.remove(); document.body.classList.remove('math-guiding'); },
  };
}
