// 图1.2-4 参照物的选择：同一个场景，选不同的参照物，“谁在动、谁静止”的说法就不同。
// 画面跟着参照物走（参照物在画面里不动），其他物体相对它怎么动就怎么动。
import * as THREE from 'three';
import { seg, goals, note, h } from './kit/ui.js';
import { canvasTex } from './kit/props.js';
import { paint, inked, hull } from '../live/ink.js';

const OBJS = [
  { id: 'ground', name: '地面（树、房屋）', v: 0 },
  { id: 'tanker', name: '加油机', v: 0.026 },
  { id: 'receiver', name: '受油机', v: 0.026 },
  { id: 'cloud', name: '白云（风很小）', v: 0.004 },
];

export default {
  id: 'frame',
  fig: '图1.2-4',
  title: '参照物的选择',
  predict: {
    q: '加油机给受油机进行空中加油时，飞行员说“受油机是静止的”，<br>地面上的人说“受油机在飞快地运动”。谁说得对？',
    hint: '课本第 18–19 页「想想议议」',
    options: ['飞行员说得对', '地面上的人说得对', '都对，他们选的参照物不同'],
    answer: 2,
  },
  conclusion: {
    quote: '物体的运动和静止是相对的。',
    why: '人们判断物体的运动和静止，总要选取某一个物体作为标准，这个作为标准的物体叫作<b>参照物</b>。如果一个物体的位置相对于参照物发生了变化，就说它是运动的；如果没有变化，就说它是静止的。以加油机为参照物，受油机是静止的；以地面为参照物，受油机是运动的。选择的参照物不同，描述同一个物体的运动情况时，结论一般也不一样。',
    src: '课本第 18 页 · 第一章 第2节 运动的描述',
  },

  create({ tag }) {
    const group = new THREE.Group();
    const world = new THREE.Group();     // 整个场景（随参照物平移）
    group.add(world);
    // 地面：一长条（重复的树和房屋），足够长
    const LEN = 3;
    const ground = new THREE.Group();
    const grass = new THREE.Mesh(new THREE.BoxGeometry(LEN, 0.004, 0.14), paint(0x9cc97a));
    grass.position.set(LEN / 2 - 0.3, 0.002, -0.02);
    ground.add(grass);
    for (let i = 0; i < 26; i++) {
      const x = -0.3 + i * 0.12;
      if (i % 3 === 2) {
        const house = inked(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.04), paint(0xf2e2c4)));
        house.position.set(x, 0.022, -0.05);
        const roof = inked(new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.025, 4), paint(0xc0533a)));
        roof.rotation.y = Math.PI / 4;
        roof.position.set(x, 0.054, -0.05);
        ground.add(house, roof);
      } else {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.004, 0.03, 8), paint(0x8a5a34));
        trunk.position.set(x, 0.017, -0.04);
        const crown = hull(new THREE.Mesh(new THREE.SphereGeometry(0.018, 14, 10), paint(0x4f9a4a)), 0.0015);
        crown.position.set(x, 0.042, -0.04);
        ground.add(trunk, crown);
      }
    }
    world.add(ground);

    // 飞机：旋转体机身（机头圆、机尾收细）+ 后掠主翼 + 平尾 + 垂尾 + 驾驶舱窗，机头朝 +x
    const plane = (color, scale = 1) => {
      const g = new THREE.Group();
      const C = paint(color), D = paint(0x3b4150);
      const prof = [];
      for (let i = 0; i <= 24; i++) { const t = i / 24; const x = -0.05 + t * 0.105; const r = 0.0085 * Math.sqrt(Math.max(0, Math.sin(Math.PI * Math.min(1, t * 1.15)))) * (t > 0.85 ? 1 - (t - 0.85) * 2.5 : 1); prof.push(new THREE.Vector2(Math.max(0.0003, r), x)); }
      const bodyGeo = new THREE.LatheGeometry(prof, 20); bodyGeo.rotateZ(-Math.PI / 2);
      const body = hull(new THREE.Mesh(bodyGeo, C), 0.0012);
      const wingShape = new THREE.Shape([new THREE.Vector2(0.012, 0), new THREE.Vector2(-0.004, 0.055), new THREE.Vector2(-0.014, 0.055), new THREE.Vector2(-0.01, 0)]);
      const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.0016, bevelEnabled: false }); wingGeo.rotateX(Math.PI / 2);
      for (const sgn of [1, -1]) {
        const w = inked(new THREE.Mesh(wingGeo, C), { width: 1 }); w.scale.z = sgn; w.position.set(0.004, -0.002, 0); g.add(w);
        const t = inked(new THREE.Mesh(wingGeo, C), { width: 1 }); t.scale.set(0.45, 1, sgn * 0.4); t.position.set(-0.042, 0.001, 0); g.add(t);
      }
      const finShape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(-0.016, 0.022), new THREE.Vector2(-0.024, 0.022), new THREE.Vector2(-0.018, 0)]);
      const fin = inked(new THREE.Mesh(new THREE.ExtrudeGeometry(finShape, { depth: 0.0014, bevelEnabled: false }), C), { width: 1 });
      fin.position.set(-0.03, 0.004, -0.0007);
      const glass = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), paint(0x9fc4d6, { keep: true }));
      glass.scale.set(1.8, 0.8, 1); glass.position.set(0.04, 0.004, 0);
      for (const sgn of [1, -1]) { const eng = hull(new THREE.Mesh(new THREE.CylinderGeometry(0.0028, 0.0028, 0.012, 12), D), 0.001); eng.rotation.z = Math.PI / 2; eng.position.set(0.004, -0.006, sgn * 0.022); g.add(eng); }
      g.add(body, fin, glass);
      g.scale.setScalar(scale * 1.15);
      return g;
    };
    const tanker = plane(0xb8c2cf, 1.25), receiver = plane(0x8d9aa8, 0.9);
    const hose = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 0.06, 6), paint(0x2c313c));
    hose.rotation.z = Math.PI / 2 + 0.45;
    hose.position.set(-0.07, -0.014, 0);
    tanker.add(hose);
    const cloud = new THREE.Group();
    for (const [x, y, r] of [[0, 0, 0.018], [0.018, 0.004, 0.014], [-0.017, 0.002, 0.013]]) {
      const c = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), new THREE.MeshLambertMaterial({ color: 0xffffff }));
      c.position.set(x, y, 0);
      cloud.add(c);
    }
    world.add(tanker, receiver, cloud);
    const objs = { ground, tanker, receiver, cloud };
    const tags = {
      tanker: tag('', 'pill'), receiver: tag('', 'pill'), ground: tag('', 'pill'), cloud: tag('', 'pill'),
    };

    const S = { ref: 'ground', t: 0, seen: new Set() };
    let G = null;
    const pos = (id, t) => {
      const o = OBJS.find((x) => x.id === id);
      const x0 = { ground: 0, tanker: -0.12, receiver: -0.215, cloud: 0.02 }[id];
      return x0 + o.v * t;
    };

    return {
      group,
      size: { w: 0.5, d: 0.18, h: 0.2 },
      view: { elev: 14, azim: -10, lookY: 0.5, margin: 1.02 },
      mount(ui) {
        const refSel = seg('以谁为参照物（画面跟着它走）', OBJS.map((o) => o.name), (_, k) => {
          S.ref = OBJS[k].id;
          S.seen.add(S.ref);
          const r = OBJS[k];
          const lines = OBJS.filter((o) => o.id !== r.id).map((o) => `${o.name.replace(/（.*）/, '')}${Math.abs(o.v - r.v) < 1e-6 ? '<b>静止</b>' : '<b>运动</b>'}`);
          ui.status(`以${r.name.replace(/（.*）/, '')}为参照物：${lines.join('，')}。`);
          if (S.seen.has('ground') && S.seen.has('tanker')) G.goal.done('two');
          if (S.seen.size >= 3) G.goal.done('three');
        });
        ui.controls.append(refSel.el, note('画面里不动的那个就是参照物。看看其他物体的位置相对于它有没有变化。'));
        G = { goal: goals(ui, [['two', '分别以地面和加油机为参照物看受油机'], ['three', '再换一个参照物']]) };
        ui.status('以地面为参照物：加油机、受油机都在运动。');
      },
      update(dt) {
        S.t += dt;
        if (S.t > 14) S.t = 0;        // 循环
        const t = S.t;
        for (const [id, o] of Object.entries(objs)) o.position.x = pos(id, t);
        tanker.position.y = 0.15; tanker.position.z = 0;
        receiver.position.y = 0.12; receiver.position.z = 0.02;
        cloud.position.y = 0.18; cloud.position.z = -0.06;
        // 画面跟着参照物走：参照物始终停在它在画面里的位置（地面为参照物时就是镜头不动）
        world.position.x = S.ref === 'ground' ? 0 : -(pos(S.ref, t) - pos(S.ref, 0)) - pos(S.ref, 0) * 0.6;
        const ref = OBJS.find((o) => o.id === S.ref);
        for (const o of OBJS) {
          const moving = Math.abs(o.v - ref.v) > 1e-6;
          const tg = tags[o.id];
          const obj = objs[o.id];
          const p = o.id === 'ground' ? [world.position.x * -1 + 0.0, 0.08, -0.04] : [obj.position.x, obj.position.y + 0.03, obj.position.z];
          if (o.id === 'ground') tg.loc(group, -0.15, 0.09, -0.04);
          else tg.loc(world, p[0], p[1], p[2]);
          tg.text(o.id === S.ref ? `${o.name.replace(/（.*）/, '')}（参照物）` : `${o.name.replace(/（.*）/, '')}：${moving ? '运动' : '静止'}`);
          tg.el.style.color = o.id === S.ref ? '#1f6fb8' : moving ? '#c0392b' : '#2f8a4c';
        }
      },
    };
  },
};
