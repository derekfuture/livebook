import { Box3, Vector3 } from 'three';
import './mathActionCue.css';

// Add light on the existing surface, after its texture and lighting have been
// evaluated. The per-channel square root keeps the lift perceptually similar
// on dark wood, brass and paper, while retaining their texture and hue.
const emissions = new WeakMap();
function surfaceEmission(material) {
  if (emissions.has(material)) return emissions.get(material);
  const strength = { value: 0 };
  const compile = material.onBeforeCompile, key = material.customProgramCacheKey();
  material.onBeforeCompile = function (shader, renderer) {
    compile.call(this, shader, renderer);
    shader.uniforms.cueEmission = strength;
    shader.fragmentShader = 'uniform float cueEmission;\n' + shader.fragmentShader.replace(
      '#include <tonemapping_fragment>',
      `vec3 lift = cueEmission * vec3(1.015, 1.0, 0.985);
       gl_FragColor.rgb += lift * (2.0 * sqrt(max(gl_FragColor.rgb, vec3(0.0))) + lift);
       #include <tonemapping_fragment>`,
    );
  };
  material.customProgramCacheKey = () => key + '-math-emission';
  material.needsUpdate = true;
  emissions.set(material, strength);
  return strength;
}

function highlight(item) {
  const lights = new Set(), sizes = new Map();
  const target = item.cueTarget || item.obj;
  const parts = Array.isArray(target) ? target : [target];
  function collect(part) {
    if (!part.material) return;
    for (const material of Array.isArray(part.material) ? part.material : [part.material]) {
      if (material.visible) lights.add(surfaceEmission(material));
    }
  }
  for (const part of parts) {
    if (part.isGroup) part.traverse(collect);
    else collect(part);
    if (item.cueGrow ?? part.isSprite) sizes.set(part, part.scale.clone());
  }
  // Point handles stay slightly larger throughout the cue. Only brightness oscillates.
  for (const [part, scale] of sizes) part.scale.copy(scale).multiplyScalar(1.4);
  function brighten(amount) {
    const strength = amount * (item.cueStrength ?? 0.09);
    for (const light of lights) light.value = strength;
    item.cuePulse?.(strength);
  }
  return {
    brighten,
    restore() {
      brighten(0);
      for (const [part, scale] of sizes) part.scale.copy(scale);
    },
  };
}

export function mathActionCue(camera, pointer, dragApi, select) {
  const items = new Map(dragApi.items().map(item => [item.obj, item]));
  const label = document.createElement('div');
  label.className = 'math-action-cue';
  label.setAttribute('aria-hidden', 'true');
  document.body.append(label);
  const bounds = new Box3(), point = new Vector3();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const canvas = document.getElementById('c');
  let current, step, hovered, lit, pulse, pressed = false;
  let idleSince = 0, quietUntil = 0, started = 0, lastFrame = -Infinity;

  function hideLabel() {
    if (label.getAttribute('aria-hidden') !== 'true') label.setAttribute('aria-hidden', 'true');
  }
  function stopLight() {
    pulse?.restore();
    pulse = lit = null;
  }
  function setHover(item) {
    if (hovered === item) return;
    idleSince = performance.now();
    if (hovered && !item) quietUntil = idleSince + 3000;
    hovered = item;
  }
  function updateHoverCursor() {
    const hit = dragApi.hovered();
    if (hit?.cueTapOnly?.()) canvas.style.cursor = 'pointer';
    return hit;
  }
  function leave() {
    setHover(null);
    if (!pressed) canvas.style.cursor = '';
  }
  canvas.addEventListener('pointerleave', leave);

  return {
    pointer: {
      ...pointer,
      down(ray, e) {
        pressed = pointer.down(ray, e);
        if (pressed) {
          if (canvas.style.cursor === 'grab') canvas.style.cursor = 'grabbing';
          setHover(null);
          stopLight();
          hideLabel();
        }
        return pressed;
      },
      move(ray, e) {
        const result = pointer.move(ray, e);
        const hit = updateHoverCursor();
        if (!pressed) setHover(e?.pointerType === 'mouse' ? hit : null);
        return result;
      },
      up(ray, e) {
        const result = pointer.up(ray, e);
        if (pressed) {
          idleSince = performance.now();
          quietUntil = idleSince + 3000;
          if (e?.pointerType === 'mouse' && e.type === 'pointerup'
              && document.elementFromPoint(e.clientX, e.clientY) === canvas) {
            dragApi.move(ray, e);
            updateHoverCursor();
          }
        }
        pressed = false;
        return result;
      },
    },
    update(nextStep) {
      const time = performance.now();
      const selected = items.get(select());
      const item = selected?.obj.visible && selected.enabled?.() !== false ? selected : null;
      document.body.classList.toggle('math-guiding', !!item);
      if (current !== item || step !== nextStep) {
        current = item;
        step = nextStep;
        idleSince = time;
        hovered = null;
        hideLabel();
        stopLight();
      }
      if (!item || pressed) return;
      if (time - lastFrame < 32) return;
      lastFrame = time;
      if (hovered && (!hovered.obj.visible || hovered.enabled?.() === false)) leave();
      const focus = hovered && hovered.obj !== item.cueAlternate ? hovered : item;
      if (time >= quietUntil || hovered) {
        if (focus !== lit) {
          stopLight();
          pulse = highlight(focus);
          lit = focus;
          started = time;
        }
        const phase = (time - started) * (2 * Math.PI / 1600);
        const breath = reduced.matches ? 0.5 : (1 - Math.cos(phase)) / 2;
        pulse.brighten(hovered ? 1 : breath);
      } else if (lit) stopLight();

      if (!hovered && time - idleSince < 8000) { hideLabel(); return; }
      // Project the existing pick bounds to place the text above the handle.
      // Three caches geometry bounds, so this does not sample mesh vertices.
      focus.obj.updateWorldMatrix(true, false);
      bounds.setFromObject(focus.obj);
      if (bounds.isEmpty()) { hideLabel(); return; }
      bounds.getCenter(point);
      point.y = bounds.max.y;
      point.project(camera);
      if (point.z < -1 || point.z > 1) { hideLabel(); return; }
      const hint = focus.cueText || focus.hint;
      const message = typeof hint === 'function' ? hint() : hint;
      if (label.textContent !== message) label.textContent = message;
      label.classList.toggle('idle', !hovered);
      if (label.getAttribute('aria-hidden') !== 'false') label.setAttribute('aria-hidden', 'false');
      const half = label.offsetWidth / 2 + 8;
      let x = (1 + point.x) * innerWidth / 2;
      if (focus.cueTarget?.isSprite && !focus.obj.isGroup) {
        // Offset a standalone point label. A multipart prop keeps its label above its pick bounds.
        x += x + 2 * half < innerWidth ? half + 4 : -half - 4;
      }
      label.style.left = Math.max(half, Math.min(innerWidth - half, x)) + 'px';
      label.style.top = Math.max(label.offsetHeight + 8, (1 - point.y) * innerHeight / 2 - 8) + 'px';
    },
    reset() {
      stopLight();
      hideLabel();
      current = hovered = null;
      pressed = false;
      quietUntil = 0;
      canvas.style.cursor = '';
    },
    dispose() {
      stopLight();
      canvas.removeEventListener('pointerleave', leave);
      label.remove();
      document.body.classList.remove('math-guiding');
    },
  };
}
