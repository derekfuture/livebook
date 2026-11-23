import * as THREE from 'three';
import { paint } from '../../live/ink.js';
import { block, wire } from './electronicsBench.js';
import { textPlate } from './props.js';
export const FILM_Y = 0.065,
  RING_X = [-0.105, 0.105],
  NEEDLE_HOME = [0.22, 0.09, 0.13];
export function soapFilmRig(models) {
  const group = new THREE.Group();
  function label(text, x, y, z, w = 0.1, h = 0.014) {
    const m = textPlate(text, {
      w,
      h,
      bg: '#e4d9bd',
      font: `bold ${Math.min(340, 430 / [...text].length, (h / w) * 410)}px sans-serif`,
    });
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    group.add(m);
  }
  const rings = models.map((model, i) => {
    const root = new THREE.Group();
    root.position.set(RING_X[i], FILM_Y, 0);
    group.add(root);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(model.radius, 0.002, 10, 100), paint(0x78817b));
    rim.rotation.x = -Math.PI / 2;
    root.add(rim);
    // Three small supports keep the same prepared ring clear of the book.
    for (const a of [Math.PI / 2, (7 * Math.PI) / 6, (11 * Math.PI) / 6]) {
      const x = RING_X[i] + model.radius * Math.cos(a),
        z = model.radius * Math.sin(a);
      block(group, 0.012, 0.063, 0.012, x, 0.0315, z, 0x6c7c73);
    }
    const stem = wire(
      root,
      [
        [0, 0, -0.072],
        [0, 0, -0.0905],
      ],
      0x78817b,
      0.002,
    );
    block(root, 0.014, 0.01, 0.035, 0, 0, -0.108, 0x866f4c);
    if (i === 1)
      wire(
        root,
        [
          [0, 0.0005, -0.07],
          [0, 0.0005, -0.03],
        ],
        0xb18a50,
        0.0008,
      );
    const thread = new THREE.Mesh(new THREE.BufferGeometry(), paint(0x98703d));
    root.add(thread);
    const film = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.MeshPhongMaterial({
        color: 0x91ced3,
        transparent: true,
        opacity: 0.52,
        side: THREE.DoubleSide,
        depthWrite: false,
        shininess: 120,
      }),
    );
    film.rotation.x = -Math.PI / 2;
    root.add(film);
    const pick = new THREE.Mesh(
      new THREE.CircleGeometry(0.07, 64),
      new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide }),
    );
    pick.rotation.x = -Math.PI / 2;
    pick.userData.pick = true;
    root.add(pick);
    label(i === 0 ? '两端固定的棉线' : '带系线的棉线圈', RING_X[i], 0.003, 0.095, 0.16, 0.017);
    function draw() {
      const points = model.points.map((p) => new THREE.Vector3(p[0], 0.0007, -p[1]));
      // Piecewise linear physical nodes; no spline overshoot across a narrow contact gap.
      const curve = new THREE.CurvePath();
      for (let k = 0; k < model.segments; k++)
        curve.add(new THREE.LineCurve3(points[k], points[(k + 1) % points.length]));
      thread.geometry.dispose();
      thread.geometry = new THREE.TubeGeometry(curve, model.segments * 3, 0.0008, 6, model.loop);
      let shape = null;
      const path = (list, Type = THREE.Shape) => {
        const p = new Type();
        p.moveTo(...list[0]);
        for (const v of list.slice(1)) p.lineTo(...v);
        p.closePath();
        return p;
      };
      const circle = Array.from({ length: 128 }, (_, k) => {
        const a = (k / 128) * 2 * Math.PI;
        return [model.radius * Math.cos(a), model.radius * Math.sin(a)];
      });
      if (model.a && model.b) shape = path(circle);
      else if (model.loop) {
        if (model.a) shape = path(model.points);
        else if (model.b) {
          shape = path(circle);
          shape.holes.push(path(model.points, THREE.Path));
        }
      } else if (model.a || model.b) {
        const arc = Array.from({ length: 63 }, (_, k) => {
          const a = -Math.PI / 2 + ((model.b ? 1 : -1) * Math.PI * (k + 1)) / 64;
          return [model.radius * Math.cos(a), model.radius * Math.sin(a)];
        });
        shape = path([...model.points, ...arc]);
      }
      film.geometry.dispose();
      film.geometry = shape ? new THREE.ShapeGeometry(shape) : new THREE.BufferGeometry();
      film.visible = !!shape;
    }
    draw();
    return { root, rim, pick, thread, film, draw };
  });
  const needle = new THREE.Group();
  needle.position.set(...NEEDLE_HOME);
  group.add(needle);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.0009, 0.0009, 0.053, 12), paint(0x9ca5a2));
  shaft.position.y = 0.034;
  needle.add(shaft);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.0009, 0.008, 12), paint(0x9ca5a2));
  tip.rotation.z = Math.PI;
  tip.position.y = 0.004;
  needle.add(tip);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.006, 0.034, 20), paint(0x9a7950));
  handle.position.y = 0.077;
  needle.add(handle);
  const hit = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.04, 16),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hit.userData.pick = true;
  handle.add(hit);
  label('热针（握柄）', 0.22, 0.003, 0.16, 0.105, 0.016);
  return {
    group,
    rings,
    needle,
    handle,
    draw() {
      rings.forEach((r) => r.draw());
    },
    dispose() {},
  };
}
