import { AdditiveBlending, Box3, Sprite, SpriteMaterial, Vector3 } from 'three';
import { glowTexture } from './props.js';
import './mathActionCue.css';

// The pick area can be much bigger than the prop. Only change the visible
// material(s) named by the lesson. A sprite handle also grows around its centre.
function highlight(item) {
  const materials = new Map(), sizes = new Map();
  const target = item.cueTarget || item.obj;
  const parts = Array.isArray(target) ? target : [target];
  function collect(part) {
    if (!part.material) return;
    for (const material of Array.isArray(part.material) ? part.material : [part.material]) {
      if (!material.visible || !material.color || materials.has(material)) continue;
      materials.set(material, {
        base: material.color.clone(), last: material.color.clone(), emission: material.emissive?.clone(),
      });
    }
  }
  for (const part of parts) {
    if (part.isGroup) part.traverse(collect);
    else collect(part);
    if (part.isSprite && item.cueGrow !== false) sizes.set(part, part.scale.clone());
  }
  if (item.cueGrow) sizes.set(item.cueGrow, item.cueGrow.scale.clone());
  return amount => {
    for (const [material, { base, last, emission }] of materials) {
      const color = material.color;
      // Some lessons recolour a piece when it moves to its next position.
      if (!color.equals(last)) base.copy(color);
      const emits = emission && material.emissiveIntensity > 0;
      const tint = amount * (emits ? 0.25 : 1);
      const gain = 1 + 0.9 * amount;
      color.setRGB(base.r * gain + 1.7 * tint, base.g * gain + 0.62 * tint, base.b * gain + 0.1 * tint);
      if (emission) {
        // Keep dark details (reels, legs, lens) distinct within the lit prop.
        const reflectance = material.map ? 0.38 : 0.2 + 0.8 * Math.min(1, base.g);
        const light = reflectance * amount;
        material.emissive.setRGB(emission.r + 1.9 * light, emission.g + 0.62 * light, emission.b + 0.08 * light);
      }
      last.copy(color);
    }
    for (const [part, scale] of sizes) {
      part.scale.copy(scale).multiplyScalar(amount ? 2.65 + 0.35 * amount : 1);
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
  const halo = new Sprite(new SpriteMaterial({
    map: glowTexture(), color: 0xffb64e, transparent: true, depthWrite: false, blending: AdditiveBlending,
  }));
  halo.userData.noFrame = true;
  halo.raycast = () => {};
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let current, pulse, pressed = false, quietUntil = 0, lastFrame = -Infinity;

  function clear() {
    halo.removeFromParent();
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
        if (item.cueGlow) {
          halo.material.depthTest = !item.cueGlow.onSurface;
          halo.position.fromArray(item.cueGlow.offset || [0, 0, 0]);
          item.cueGlow.anchor.add(halo);
        }
      } else if (time - lastFrame < 32) return;
      lastFrame = time;
      const amount = reduced.matches ? 0.8 : 0.78 + 0.22 * Math.sin(time * 0.003);
      pulse(amount);
      if (item.cueGlow) {
        halo.scale.setScalar(item.cueGlow.size * (0.78 + 0.22 * amount));
        halo.material.opacity = 0.48 + 0.48 * amount;
      }

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
    dispose() { clear(); halo.material.dispose(); label.remove(); document.body.classList.remove('math-guiding'); },
  };
}
