import * as THREE from 'three';
import { paint, inked } from '../../live/ink.js';
import { Circuit, psuPart, switchPart, rheostatPart } from './circuit.js';
import { galvanometer } from './galvanometer.js';
import { textPlate } from './props.js';
export const COIL_CENTER = [0.025, -0.035];
export const INSERTED_BOTTOM = 0.01;
export const RAISED_BOTTOM = 0.115;
// A 产生的场在 B 横截面附近的局部示意。每条线代表相同份额的磁通，
// 最外一份不足一条时逐渐显现。箭头沿绕组实际产生的轴向场向上。
function fluxBundle() {
  const group = new THREE.Group();
  const lines = [];
  const count = 21;
  for (let i = 0; i < count; i++) {
    const angle = i * Math.PI * (3 - Math.sqrt(5));
    const radius = 0.024 * Math.sqrt((i * 0.618034) % 1);
    const x = radius * Math.cos(angle), z = radius * Math.sin(angle);
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(x, 0.052, z),
      new THREE.Vector3(x, 0.123, z),
      new THREE.Vector3(x * 2.4, 0.145, z * 2.4),
    );
    const mat = new THREE.MeshBasicMaterial({ color: 0x14789a, transparent: true, depthWrite: false });
    const line = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.00085, 5, false), mat);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.0028, 0.008, 8), mat);
    head.position.copy(curve.getPoint(1));
    head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), curve.getTangent(1).normalize());
    line.add(head);
    group.add(line);
    lines.push(line);
  }
  group.position.set(COIL_CENTER[0], 0, COIL_CENTER[1]);
  return { group, draw(fraction) {
    lines.forEach((line, i) => {
      const opacity = Math.max(0, Math.min(1, count * fraction - i));
      line.visible = opacity > 0.03;
      line.material.opacity = opacity;
    });
  } };
}

function pick(parent, size, position) {
  const obj = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshBasicMaterial({ visible: false }));
  obj.position.set(...position);
  obj.userData.pick = true;
  parent.add(obj);
  return obj;
}

export function mutualInductionRig() {
  const circuit = new Circuit(),
    group = circuit.group,
    textures = [],
    dynamic = [];
  const add = (p, position) => {
    circuit.add(p, position);
    p.circuit = null;
    return p;
  };
  const label = (parent, text, x, y, z, w = 0.05) => {
    const p = textPlate(text, {
      w,
      h: 0.014,
      bg: '#efe5cd',
      font: `bold ${Math.floor(Math.min(((512 * 0.014) / w) * 0.7, 420 / text.length))}px sans-serif`,
    });
    p.position.set(x, y, z);
    p.rotation.x = -Math.PI / 2;
    parent.add(p);
    textures.push(p.material.map);
    return p;
  };
  const wire = (points, color = 0.0) => {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    return new THREE.Mesh(new THREE.TubeGeometry(curve, 36, 0.0013, 7, false), paint(color));
  };
  function coil(radius, inside, height, turns, name) {
    const g = new THREE.Group();
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 48, 1, true), paint(0x9f6641));
    shell.position.y = height / 2;
    g.add(shell);
    const liner = new THREE.Mesh(
      new THREE.CylinderGeometry(inside, inside, height, 48, 1, true),
      paint(0x6f695d, { side: THREE.BackSide }),
    );
    liner.position.y = height / 2;
    g.add(liner);
    for (const y of [0, height]) {
      const rim = new THREE.Mesh(
        new THREE.RingGeometry(inside, radius + 0.0015, 48),
        paint(0x99b4b4, { side: THREE.DoubleSide }),
      );
      rim.rotation.x = -Math.PI / 2;
      rim.position.y = y;
      g.add(rim);
    }
    const points = Array.from({ length: turns * 24 + 1 }, (_, i) => {
      const t = i / (turns * 24),
        a = t * turns * 2 * Math.PI;
      return new THREE.Vector3(radius * Math.cos(a), 0.001 + t * (height - 0.002), -radius * Math.sin(a));
    });
    g.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), turns * 24, 0.00055, 5, false),
        paint(0xb47b48),
      ),
    );
    const posts = [-1, 1].map((s) => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.008, 12), paint(0x8f99a8));
      p.position.set(s * (radius - 0.004), height + 0.004, 0.006);
      g.add(p);
      return p;
    });
    // a 为下端引线，b 为上端；正电流从下到上绕行，俯视逆时针。
    g.add(
      wire(
        [
          [radius, 0.001, 0],
          [radius + 0.001, 0.001, 0.006],
          [radius + 0.004, height + 0.009, 0.006],
          [radius + 0.004, height + 0.020, 0.022],
          [-radius + 0.004, height + 0.020, 0.022],
          [-radius + 0.004, height + 0.009, 0.006],
        ],
        0x5a6060,
      ),
    );
    g.add(
      wire(
        [
          [radius, height - 0.001, 0],
          [radius + 0.004, height + 0.014, 0.016],
          [radius - 0.004, height + 0.014, 0.016],
          [radius - 0.004, height + 0.010, 0.006],
          [radius - 0.004, height + 0.008, 0.006],
        ],
        0x9a553d,
      ),
    );
    const badge = label(g, name, 0, height + 0.011, -0.012, 0.018);
    return { group: g, posts, height, badge };
  }
  const source = add(psuPart('E', { U: 6 }), [-0.22, -0.12]);
  const sw = add(switchPart('S'), [-0.22, 0.015]);
  const rheostat = add(rheostatPart('R', { Rmax: 100, pos: 0.28 }), [-0.115, 0.14]);
  label(sw.group, 'S', 0, 0.008, 0.028, 0.025);
  label(rheostat.group, 'R', 0, 0.007, -0.032, 0.025);
  const outer = coil(0.034, 0.028, 0.06, 48, 'B');
  outer.badge.position.set(0, 0.035, 0.0346);
  outer.badge.rotation.x = 0;
  outer.group.position.set(COIL_CENTER[0], 0.01, COIL_CENTER[1]);
  group.add(outer.group);
  const foot = inked(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.008, 0.085), paint(0x7e6855)));
  foot.position.set(COIL_CENTER[0], 0.004, COIL_CENTER[1]);
  group.add(foot);
  const inner = coil(0.021, 0.016, 0.075, 38, 'A');
  inner.badge.position.set(0, 0.069, 0.0218);
  inner.badge.rotation.x = 0;
  inner.group.position.set(COIL_CENTER[0], RAISED_BOTTOM, COIL_CENTER[1]);
  group.add(inner.group);
  const grip = inked(new THREE.Mesh(new THREE.BoxGeometry(0.059, 0.008, 0.012), paint(0x809f9e)));
  grip.position.set(0, 0.086, -0.012);
  inner.group.add(grip);
  // 手动导向架只约束同轴升降，避免未抓取时内线圈悬空；不改变两回路。
  const guideRod = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.225, 16), paint(0x8c989b));
  guideRod.position.set(COIL_CENTER[0], 0.1125, COIL_CENTER[1] - 0.064);
  group.add(guideRod);
  const guideFoot = inked(new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.007, 0.035), paint(0x697b7b)));
  guideFoot.position.set(COIL_CENTER[0], 0.0035, COIL_CENTER[1] - 0.064);
  group.add(guideFoot);
  const collar = inked(new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.014, 0.012), paint(0x809f9e)));
  collar.position.set(0, 0.086, -0.064);
  inner.group.add(collar);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.064, 12), paint(0x8c989b));
  arm.rotation.x = Math.PI / 2;
  arm.position.set(0, 0.086, -0.032);
  inner.group.add(arm);
  const G = galvanometer();
  G.group.position.set(0.185, 0, 0.025);
  G.group.scale.setScalar(1.65);
  // 加粗原表针，整套装置同框时也能观察瞬间的偏转。
  G.pivot.children[0].scale.x = 2;
  const bundle = fluxBundle();
  group.add(bundle.group);
  const coilPick = pick(inner.group, [0.067, 0.032, 0.038], [0, 0.084, -0.006]);
  const switchPick = pick(sw.group, [0.062, 0.046, 0.029], [0, 0.024, 0]);
  const sliderPick = pick(rheostat.slider, [0.023, 0.022, 0.026], [0, 0.038, 0]);
  const meterPick = pick(G.group, [0.071, 0.071, 0.033], [0, 0.036, 0]);
  group.add(G.group);
  circuit.wire('E.+', 'S.a', { points: [[-0.27, 0.018, -0.035]], color: 0xa65140 });
  circuit.wire('S.b', 'R.A', {
    points: [
      [-0.178, 0.016, 0.059],
      [-0.21, 0.012, 0.122],
    ],
    color: 0xa65140,
  });
  circuit.update(0);
  const postPos = (o, p) => {
    group.updateMatrixWorld(true);
    return group.worldToLocal(p.getWorldPosition(new THREE.Vector3())).toArray();
  };
  const primaryEnds = () => inner.posts.map((p) => postPos(inner.group, p));
  const ends = outer.posts.map((p) => postPos(outer.group, p)),
    gEnds = G.posts.map((p) => postPos(G.group, p));
  group.add(
    wire(
      [ends[0], [-0.018, 0.08, -0.065], [-0.015, 0.035, -0.105], [0.107, 0.014, -0.095], [0.107, 0.011, 0.061], [0.133, 0.011, 0.076], gEnds[0]],
      0x454c4f,
    ),
  );
  group.add(wire([ends[1], [0.1, 0.08, -0.015], [0.12, 0.015, 0.07], [0.22, 0.01, 0.065], gEnds[1]], 0xa65140));
  const incoming = () => [-0.115 - 0.066, 0.05, 0.14],
    outgoing = () => {
      const p = source.group.localToWorld(new THREE.Vector3(...source.terminals['-']));
      return group.worldToLocal(p).toArray();
    };
  let lastHeight = null;
  function lift(bottom) {
    inner.group.position.y = bottom;
    if (lastHeight === bottom) return;
    lastHeight = bottom;
    dynamic.forEach((o) => {
      group.remove(o);
      o.geometry.dispose();
      o.material.dispose();
    });
    dynamic.length = 0;
    const e = primaryEnds();
    dynamic.push(
      wire([incoming(), [-0.17, 0.055, 0.2], [-0.045, 0.03, 0.19], [-0.04, bottom + 0.1, 0.035], e[0]], 0xa65140),
    );
    dynamic.push(
      wire([e[1], [0.085, bottom + 0.11, -0.1], [0.06, 0.035, -0.17], [-0.17, 0.032, -0.19], [-0.212, 0.066, -0.158], outgoing()], 0x454c4f),
    );
    dynamic.forEach((o) => group.add(o));
  }
  lift(RAISED_BOTTOM);
  return {
    group,
    source,
    sw,
    rheostat,
    outer,
    inner,
    grip, coilPick, switchPick, sliderPick, meterPick,
    meter: G.group,
    pivot: G.pivot,
    lift,
    draw(model, fluxFraction, needleAngle) {
      sw.closed = model.closed;
      sw.update(1);
      rheostat.setPos(model.resistance / 100);
      G.pivot.rotation.z = -needleAngle;
      bundle.draw(fluxFraction);
    },
    dispose() {
      textures.forEach((t) => t.dispose());
      circuit.dispose();
      G.group.traverse((o) => o.material?.map?.dispose());
      dynamic.forEach((o) => {
        o.geometry.dispose();
        o.material.dispose();
      });
    },
  };
}
