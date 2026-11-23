import * as THREE from 'three';
import { paint } from '../../live/ink.js';
import { clamp } from './interact.js';

export function meterProbeHandle(color, rotation) {
  const handle = new THREE.Group(),
    grip = new THREE.Group();
  handle.add(grip);
  grip.rotation.x = 0.98;
  grip.rotation.z = rotation;
  function piece(r, h, y, c) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 20), paint(c));
    m.position.y = y;
    grip.add(m);
  }
  piece(0.0008, 0.012, 0.006, 0xc7c9bc);
  piece(0.0038, 0.025, 0.0245, color);
  piece(0.0048, 0.003, 0.013, color);
  const pick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.006, 0.006, 0.031, 12),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  pick.userData.pick = true;
  pick.position.y = 0.022;
  grip.add(pick);
  return { handle, grip };
}

// 表笔的原点就在金属尖端。接触才接入求解器，拖动中保持开路。
export function meterProbes(
  circuit,
  targets,
  {
    changed,
    allow,
    mayLift,
    bounds = { x: [-0.23, 0.24], z: [-0.17, 0.16] },
    homes = { red: [-0.025, 0.001, 0.078], black: [-0.052, 0.001, 0.078] },
  },
) {
  const probes = {},
    group = circuit.group;
  let shorted = false;
  for (const [name, color] of [
    ['red', 0xb74738],
    ['black', 0x333d41],
  ]) {
    const { handle, grip } = meterProbeHandle(color, name === 'red' ? -0.35 : 0.35);
    group.add(handle);
    const lead = new THREE.Mesh(new THREE.BufferGeometry(), paint(color));
    group.add(lead);
    lead.raycast = () => {};
    const home = new THREE.Vector3(...homes[name]);
    probes[name] = { handle, grip, lead, home, target: null };
  }
  function cable(name, lifted = false) {
    const { handle, grip, lead } = probes[name];
    // 落笔后笔尾靠在桌面。接较高的柱时，从接点向下斜放。
    grip.rotation.x = lifted
      ? 1.1
      : Math.acos(clamp((0.013 - handle.position.y) / (0.037 * Math.cos(grip.rotation.z)), -1, 1));
    const socket = circuit.terminalWorld('M.' + name),
      end = group.worldToLocal(grip.localToWorld(new THREE.Vector3(0, 0.037, 0)));
    const bend = socket.clone().add(new THREE.Vector3(name === 'red' ? 0.008 : -0.016, 0, 0.034));
    const mid = bend.clone().lerp(end, 0.45);
    mid.y = 0.004;
    mid.z += 0.024;
    const footprint = circuit._footprint(circuit.get('M'));
    const points = [socket, bend, mid, end];
    if (end.z < footprint.z1 + 0.006 && end.x > footprint.x0 && end.x < footprint.x1) {
      const x = socket.x < (footprint.x0 + footprint.x1) / 2 ? footprint.x0 - 0.012 : footprint.x1 + 0.012;
      points.splice(2, 1,
        new THREE.Vector3(x, 0.006, bend.z + 0.006),
        new THREE.Vector3(x, 0.006, end.z),
      );
    }
    const curve = new THREE.CatmullRomCurve3(points);
    lead.geometry.dispose();
    lead.geometry = new THREE.TubeGeometry(curve, 32, 0.0013, 7, false);
    handle.updateMatrixWorld(true);
  }
  function disconnect(name) {
    const p = probes[name];
    if (p.target) circuit.removeWire('M.' + name, p.target);
    if (shorted) circuit.removeWire('M.red', 'M.black');
    shorted = false;
    p.target = null;
    circuit.solve();
  }
  function reset() {
    for (const name of Object.keys(probes)) {
      disconnect(name);
      probes[name].handle.position.copy(probes[name].home);
      cable(name);
    }
  }
  const drags = Object.keys(probes).map((name) => {
    const p = probes[name],
      other = probes[name === 'red' ? 'black' : 'red'];
    let origin, originalTarget, wasShort, moved;
    return {
      obj: p.handle,
      plane: 'xz',
      offset: 0.008,
      keepOffset: true,
      hint: '拖动' + (name === 'red' ? '红' : '黑') + '表笔，让金属尖端接触接线柱',
      onStart() {
        origin = p.handle.position.clone();
        originalTarget = p.target;
        wasShort = shorted;
        moved = false;
      },
      onDrag(point) {
        if (!moved) {
          const reason = mayLift(name);
          if (reason) {
            changed(reason);
            return;
          }
          disconnect(name);
          moved = true;
        }
        p.handle.position.set(clamp(point.x, ...bounds.x), 0.025, clamp(point.z, ...bounds.z));
        cable(name, true);
      },
      onEnd() {
        if (!moved) return;
        const pos = p.handle.position;
        const distance = (v) => Math.hypot(pos.x - v.x, pos.z - v.z);
        const nearest = targets
          .map((id) => [id, circuit.terminalWorld(id)])
          .sort((a, b) => distance(a[1]) - distance(b[1]))[0];
        let target = distance(nearest[1]) < 0.014 ? nearest[0] : null;
        let contact = !target && !other.target && distance(other.handle.position) < 0.013;
        let reason = allow(name, target, contact);
        if (reason) {
          target = originalTarget;
          contact = wasShort;
          pos.copy(origin);
        }
        if (target) {
          p.target = target;
          pos.copy(circuit.terminalWorld(target));
          circuit.wire('M.' + name, target, { draw: false });
        } else if (contact) {
          pos.copy(other.handle.position);
          shorted = true;
          circuit.wire('M.red', 'M.black', { draw: false });
        } else pos.y = 0.001;
        cable(name);
        circuit.solve();
        changed(reason);
      },
    };
  });
  reset();
  return {
    probes,
    drags,
    follow(id) {
      for (const [name, p] of Object.entries(probes))
        if (p.target === id) {
          p.handle.position.copy(circuit.terminalWorld(id));
          cable(name);
        }
    },
    get shorted() {
      return shorted;
    },
    reset,
    dispose() {
      for (const p of Object.values(probes)) p.lead.geometry.dispose();
    },
  };
}
