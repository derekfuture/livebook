import * as THREE from 'three';

// 落点：照初中的做法——不画落点圈、不加高亮、不出提示，只是热区大、靠近就自动吸过去对准，松手就放稳（作者 2026-11-21：“就按初中那种……自动吸附的、热区大一点”）。
// SHOW 留着给以后需要时打开画圈和提示，现在关着。
const SHOW = false;

function dashedRing() {
  const vertices = [];
  const point = (radius, angle) => [radius * Math.cos(angle), radius * Math.sin(angle), 0];
  for (let dash = 0; dash < 12; dash++) {
    for (let segment = 0; segment < 4; segment++) {
      const angle = (dash + 0.16 * segment) * Math.PI / 6;
      const next = angle + 0.16 * Math.PI / 6;
      const inner = point(0.86, angle), outer = point(1, angle);
      const innerNext = point(0.86, next), outerNext = point(1, next);
      vertices.push(...inner, ...outer, ...outerNext, ...inner, ...outerNext, ...innerNext);
    }
  }
  return new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
}

export function dropzones(root, tip) {
  const ring = dashedRing(), fill = new THREE.CircleGeometry(1, 48);
  const layer = new THREE.Group();
  layer.name = 'dropzones';
  root.add(layer);
  const material = (color, opacity) => new THREE.MeshBasicMaterial({
    color, opacity, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  });
  const idle = material(0x477871, 0.84), strong = material(0x007e70, 1), wash = material(0x32bfaa, 0.24);
  const markers = [];
  const shift = new THREE.Vector3(), goal = shift.clone(), work = shift.clone();
  let session = null, hintVisible = false;

  function marker(index) {
    if (markers[index]) return markers[index];
    const outline = new THREE.Mesh(ring, idle), disc = new THREE.Mesh(fill, wash);
    outline.raycast = disc.raycast = () => {};
    outline.renderOrder = 32;
    disc.renderOrder = 31;
    outline.add(disc);
    layer.add(outline);
    markers.push({ outline, disc });
    return markers[index];
  }

  function hint(target) {
    if (target) tip?.loc(root, target.position.x, target.position.y + target.zone.radius + 0.012, target.position.z)
      .text(`松手：放到 ${target.zone.name}`);
    else if (hintVisible) tip?.loc(root, 0, -9, 0).text('');
    hintVisible = !!target;
  }

  function scan(raw, draw = SHOW) {
    const { item } = session;
    const plane = item.plane || 'xy';
    if (raw) {
      work.copy(raw);
      if (item.dropOffset) work.add(item.dropOffset);
    }
    let count = 0, target = null, nearest = Infinity;
    for (const zone of item.dropzones) {
      if (zone.enabled?.() === false) continue;
      const position = typeof zone.position === 'function' ? zone.position() : zone.position;
      if (draw) {
        const { outline, disc } = marker(count);
        outline.visible = true;
        outline.material = idle;
        disc.visible = false;
        outline.position.copy(position);
        outline.rotation.set(plane === 'xz' ? -Math.PI / 2 : 0, plane === 'yz' ? Math.PI / 2 : 0, 0);
        outline.scale.setScalar(zone.radius);
      }
      if (raw) {
        const dx = plane === 'yz' ? 0 : work.x - position.x;
        const dy = plane === 'xz' ? 0 : work.y - position.y;
        const dz = plane === 'xy' ? 0 : work.z - position.z;
        const distance = dx * dx + dy * dy + dz * dz;
        if (distance <= zone.radius * zone.radius && distance < nearest) {
          nearest = distance;
          target = { zone, position, index: count };
        }
      }
      count++;
    }
    if (draw) {
      for (let index = count; index < markers.length; index++) markers[index].outline.visible = false;
      if (target) {
        markers[target.index].outline.material = strong;
        markers[target.index].disc.visible = true;
      }
      hint(target);
    }
    return target;
  }

  function clear() {
    session = null;
    shift.set(0, 0, 0);
    for (const { outline } of markers) outline.visible = false;
    hint(null);
  }

  function anchor(target, item) {
    const position = target.position.clone();
    return item.dropOffset ? position.sub(item.dropOffset) : position;
  }

  return {
    clear,
    wrap(item) {
      return {
        ...item,
        onStart(start) {
          clear();
          item.onStart?.(start);
          session = { item, raw: null, start };
          scan(null);
        },
        onDrag(raw, start) {
          if (session?.item !== item) return item.onDrag?.(raw, start);
          session.raw = raw.clone();
          session.start = start;
          if (!scan(raw)) shift.set(0, 0, 0);
          item.onDrag?.(raw.clone().add(shift), start);
        },
        onEnd(moved, cancelled, raw) {
          const held = session?.item === item ? session : null;
          const target = held && moved && !cancelled ? scan(raw === undefined ? held.raw : raw, false) : null;
          if (held) clear();
          if (target) {
            item.onDrag?.(anchor(target, item), held.start);
            target.zone.onDrop?.(target.position.clone());
          }
          item.onEnd?.(moved, target?.zone);
        },
      };
    },
    update(dt) {
      if (!session) return;
      const { item, raw, start } = session;
      const target = scan(raw);
      if (!raw || dt <= 0) return;
      if (target) goal.copy(anchor(target, item)).sub(raw);
      else goal.set(0, 0, 0);
      if (shift.distanceToSquared(goal) < 1e-12) return;
      if (target) shift.lerp(goal, -Math.expm1(-dt / 0.045));
      else shift.copy(goal);
      item.onDrag?.(raw.clone().add(shift), start);
    },
    dispose() {
      clear();
      root.remove(layer);
      for (const resource of [ring, fill, idle, strong, wash]) resource.dispose();
    },
  };
}
