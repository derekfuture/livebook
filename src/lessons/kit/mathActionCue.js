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
      if (!material.visible) continue;
      for (const color of [material.color, material.emissive]) {
        if (color && !colors.has(color)) colors.set(color, { base: color.clone(), last: color.clone() });
      }
    }
  }
  for (const part of parts) {
    if (part.isGroup) part.traverse(collect);
    else collect(part);
    if (item.cueGrow ?? part.isSprite) sizes.set(part, part.scale.clone());
  }
  // Point handles stay slightly larger throughout the cue. Only brightness oscillates.
  for (const [part, scale] of sizes) part.scale.copy(scale).multiplyScalar(1.4);
  function brighten(gain) {
    for (const [color, { base, last }] of colors) {
      // The lesson may recolour a piece between frames.
      if (!color.equals(last)) base.copy(color);
      color.copy(base).multiplyScalar(gain);
      last.copy(color);
    }
    item.cuePulse?.(gain);
  }
  return {
    brighten,
    restore() {
      brighten(1);
      for (const [part, scale] of sizes) part.scale.copy(scale);
    },
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
  let current, pulse, pressed = false, quietUntil = 0, started = 0, lastFrame = -Infinity;

  function clear() {
    pulse?.restore();
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
        const selected = items.get(select());
        if (pressed || (hovered && (selected?.obj === hovered || selected?.cueAlternate === hovered))) pause();
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
        started = time;
      } else if (time - lastFrame < 32) return;
      lastFrame = time;
      const phase = (time - started) * (2 * Math.PI / 1800);
      const breath = reduced.matches ? 0.5 : (1 - Math.cos(phase)) / 2;
      pulse.brighten(1 + 0.2 * breath);

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
      if (item.cueTarget?.isSprite && !item.obj.isGroup) {
        // Offset a standalone point label. A multipart prop keeps its label above its pick bounds.
        x += x + 2 * half < innerWidth ? half + 4 : -half - 4;
      }
      label.style.left = Math.max(half, Math.min(innerWidth - half, x)) + 'px';
      label.style.top = Math.max(label.offsetHeight + 8, (1 - point.y) * innerHeight / 2 - 8) + 'px';
    },
    reset() { clear(); pressed = false; quietUntil = 0; },
    dispose() { clear(); label.remove(); document.body.classList.remove('math-guiding'); },
  };
}
