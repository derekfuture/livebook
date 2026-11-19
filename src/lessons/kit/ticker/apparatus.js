import * as THREE from 'three';
import { paint, inked, polyline } from '../../../live/ink.js';
import { canvasTex } from '../props.js';
import { stampMass } from './loadRack.js';
import { PERIOD, TRAVEL } from './motion.js';
import { tickerHead } from './head.js';

const START = 0.14,
  PX = -0.3,
  R = 0.024;
const TIMER = 0.33,
  EDGE = 0.44;
// low：只给“探究加速度与力、质量的关系”用。木板架在两块矮木块上（不用高支架），
// 右端用一块楔形垫块调高低；槽码挂钩落到台面的软垫上为止。别的课不传 low，样子和行为不变。
export const LOW_TOP = 0.2;
export const LOW_PIVOT = -0.265;
export const WEDGE = { len: 0.12, rise: 0.045 };
const _a = new THREE.Vector3();
const metal = 0x53616b,
  wood = 0xc39a63,
  teal = 0x366a70,
  gold = 0xb78a40;

export function apparatus({ adjustable = false, low = false } = {}) {
  if (low) adjustable = true;
  const TOP = low ? LOW_TOP : 0.42,
    LINE = TOP + 0.027,
    PAPER_Y = TOP + 0.044;
  const group = new THREE.Group();
  function box(parent, size, at, color, outline = false) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(...size), paint(color));
    if (outline) inked(m, { width: 0.85 });
    m.position.set(...at);
    parent.add(m);
    return m;
  }
  function cyl(parent, radius, height, at, color, alongZ = false) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 32), paint(color));
    if (alongZ) m.rotation.x = Math.PI / 2;
    m.position.set(...at);
    parent.add(m);
    return m;
  }
  function stroke(points, color, width) {
    const line = polyline(
      points.map((p) => new THREE.Vector3(...p)),
      { color, width },
    );
    group.add(line);
    return line;
  }
  // 木板下面留出真实下落空间；桌沿不得挡住槽码。
  const board = box(group, [0.72, 0.018, 0.115], [0.08, TOP - 0.009, 0], wood, true);
  const stand = new THREE.Group();
  group.add(stand);
  if (low) {
    // 左木块的左棱是木板的转轴；右木块够长，楔形垫块在它上面推进拉出。木块比木板窄，让开板下的侧条和支架。
    box(stand, [0.045, TOP - 0.018, 0.07], [LOW_PIVOT + 0.0225, (TOP - 0.018) / 2, 0], 0xb48c5a, true);
    box(stand, [0.2, TOP - 0.018, 0.072], [0.46, (TOP - 0.018) / 2, 0], 0xb48c5a, true);
  } else
    for (const x of [-0.235, 0.398]) {
      for (const z of [-0.042, 0.042]) box(stand, [0.02, TOP - 0.018, 0.02], [x, (TOP - 0.018) / 2, z], 0xbba785);
      box(stand, [0.028, 0.017, 0.104], [x, 0.045, 0], wood);
    }
  box(group, [0.66, 0.027, 0.012], [0.08, TOP - 0.03, -0.043], 0xaa895f);
  const scaleTex = canvasTex(2048, 128, (c, w, h) => {
    c.fillStyle = '#e6ca98';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#544636';
    c.font = 'bold 41px sans-serif';
    for (let mm = 0; mm <= 700; mm++) {
      const x = (w * mm) / 700;
      c.fillRect(x, 0, mm % 10 ? 1 : 3, mm % 10 === 0 ? 42 : mm % 5 === 0 ? 28 : 15);
      if (mm % 50 === 0 && mm < 700) c.fillText(String(mm / 10), x + 5, 93);
    }
  });
  const scale = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.012), new THREE.MeshBasicMaterial({ map: scaleTex }));
  scale.position.set(0.08, TOP - 0.008, 0.058);
  group.add(scale);

  const wheel = new THREE.Group();
  wheel.position.set(PX, LINE - R, 0);
  group.add(wheel);
  cyl(wheel, R, 0.017, [0, 0, 0], gold, true);
  for (const z of [-0.009, 0.009]) cyl(wheel, R + 0.001, 0.003, [0, 0, z], gold, true);
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    cyl(wheel, 0.0038, 0.001, [0.014 * Math.cos(a), 0.014 * Math.sin(a), 0.011], 0x6d512a, true);
  }
  for (const z of [-0.017, 0.017]) box(group, [0.049, 0.009, 0.006], [PX + 0.021, LINE - R, z], metal);
  cyl(group, 0.004, 0.044, [PX, LINE - R, 0], metal, true);

  const cart = new THREE.Group();
  group.add(cart);
  box(cart, [0.104, 0.023, 0.059], [0, 0.03, 0], teal, true);
  box(cart, [0.086, 0.006, 0.049], [0, 0.044, 0], 0xb9d2cd);
  const tires = [];
  for (const x of [-0.033, 0.033])
    for (const z of [-0.032, 0.032]) {
      const tire = cyl(cart, 0.011, 0.008, [x, 0.011, z], 0x323c44, true);
      tires.push(tire);
      cyl(tire, 0.004, 0.009, [0, 0, 0], 0xc3c9c9);
    }
  box(cart, [0.012, 0.005, 0.018], [0.055, 0.044, 0], metal);
  const pan = new THREE.Group();
  group.add(pan);
  if (low) {
    // 挂钩：上端的钩子挂在绳上，槽码套在细杆上、落在底托上。原点在钩子处。
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.0045, 0.0011, 8, 20, Math.PI * 1.5), paint(metal));
    hook.position.y = -0.004;
    hook.rotation.z = Math.PI / 2;
    pan.add(hook);
    cyl(pan, 0.0016, 0.05, [0, -0.033, 0], metal);
    cyl(pan, 0.017, 0.003, [0, -0.0595, 0], metal);
  } else {
    cyl(pan, 0.019, 0.005, [0, -0.037, 0], gold);
    cyl(pan, 0.0015, 0.037, [0, -0.0185, 0], metal);
  }
  const cordMat = paint(0x393936);
  const cord = (vertical) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.0011, 0.0011, 1, 8), cordMat);
    if (!vertical) m.rotation.z = Math.PI / 2;
    group.add(m);
    return m;
  };
  const horizontal = cord(false),
    vertical = cord(true);
  const wrappedCord = stroke(
    Array.from({ length: 19 }, (_, i) => {
      const a = (i * Math.PI) / 36;
      return [PX - R * Math.sin(a), LINE - R + R * Math.cos(a), 0];
    }),
    0x393936,
    1.5,
  );

  const timer = new THREE.Group();
  timer.position.x = TIMER;
  group.add(timer);
  const head = tickerHead();
  head.group.position.y = TOP;
  timer.add(head.group);
  const adaptor = new THREE.Group();
  group.add(adaptor);
  box(adaptor, [0.078, 0.042, 0.057], [0.347, TOP + 0.021, -0.094], teal, true);
  const face = canvasTex(512, 192, (ctx, w, h) => {
    ctx.fillStyle = '#e0ddd0';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#344249';
    ctx.font = 'bold 60px sans-serif';
    ctx.fillText('AC   50 Hz', 35, 110);
  });
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.061, 0.022), new THREE.MeshBasicMaterial({ map: face }));
  plate.position.set(0.347, TOP + 0.025, -0.0654);
  adaptor.add(plate);
  for (const off of [-0.013, 0.013])
    cyl(adaptor, 0.004, 0.004, [0.347 + off, TOP + 0.044, -0.078], off < 0 ? 0xb14130 : metal);
  box(group, [0.13, 0.014, 0.08], [0.349, TOP - 0.007, -0.09], wood);
  for (const x of [0.31, 0.38]) box(group, [0.012, 0.01, 0.085], [x, TOP - 0.019, -0.08], metal);
  for (const off of [-0.013, 0.013])
    stroke(
      [
        [TIMER + off, TOP + 0.023, -0.036],
        [TIMER + off, TOP + 0.012, -0.05],
        [0.347 + off, TOP + 0.048, -0.062],
        [0.347 + off, TOP + 0.047, -0.078],
      ],
      0x454344,
      1.5,
    );

  // 纸带先沿板面滑动，余下部分垂在右端，纸张总长守恒。
  const paperMat = paint(0xfff2ce, { side: THREE.DoubleSide });
  const paper = () => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.018), paperMat);
    m.rotation.x = -Math.PI / 2;
    group.add(m);
    return m;
  };
  const strip = paper(),
    tail = paper();
  // 纸带本身很窄。触屏取带时也接受紧邻纸边的触点。
  const paperHit = new THREE.Mesh(
    new THREE.BoxGeometry(1, 0.046, 0.016),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  paperHit.userData.pick = true;
  strip.add(paperHit);
  // 垂直部分的宽度沿 z 轴。
  tail.quaternion.setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(1, 0, 0)),
  );
  const dots = new THREE.InstancedMesh(
    new THREE.CircleGeometry(0.00055, 10),
    new THREE.MeshBasicMaterial({ color: 0x253446 }),
    Math.ceil((adjustable ? 6 : 1.5) / PERIOD) + 1,
  );
  dots.frustumCulled = false;
  group.add(dots);
  const marker = new THREE.Object3D();
  marker.rotation.x = -Math.PI / 2;
  const base = adjustable ? new THREE.Group() : group;
  let support, ballast, wedge, wedgeTex;
  const markings = [];
  if (adjustable) {
    base.add(stand, group);
    // 挡块接触车头两侧，中央留出牵引绳通道。
    for (const z of [-0.022, 0.022])
      box(group, [0.009, 0.034, 0.014], [START - TRAVEL - 0.052 - 0.0045, TOP + 0.017, z], metal);
    if (low) {
      // 楔形垫块：薄端朝左。往左推进去，木板右端落在更厚的地方，就垫得更高。
      const shape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(WEDGE.len, 0), new THREE.Vector2(WEDGE.len, WEDGE.rise)]);
      const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.072, bevelEnabled: false });
      geo.translate(0, 0, -0.036);
      wedge = new THREE.Mesh(geo, paint(0xc98f4e));
      inked(wedge, { width: 0.9 });
      wedge.position.set(EDGE, TOP - 0.018, 0);
      base.add(wedge);
      wedgeTex = canvasTex(256, 80, () => {});
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.0156), new THREE.MeshBasicMaterial({ map: wedgeTex, transparent: true }));
      face.position.set(0.091, 0.0093, 0.0362);
      wedge.add(face);
    } else support = box(base, [0.052, 1, 0.11], [0.398, TOP - 0.018, 0], wood);
    const homes = low ? [0, 1, 2, 3].map((i) => [0.5, (3 - i) * 0.009 + 0.0045, 0.21]) : [0.23, 0.32].map((x) => [x, 0.0045, 0.12]);
    ballast = homes.map((at) => {
      const weight = box(base, [0.068, 0.009, 0.043], at, gold, true);
      markings.push(stampMass(weight, 250, 0.052, 0.026, 0.0045));
      weight.userData.home = weight.position.clone();
      return weight;
    });
  }
  function draw(run) {
    const angle = run.angle || 0;
    if (adjustable) {
      // 绕左支脚转木板。支架保持竖直，垫块填满右端抬高的间隙。
      const pivotX = low ? LOW_PIVOT : -0.235,
        pivotY = TOP - 0.018;
      group.rotation.z = angle;
      group.position.set(
        pivotX * (1 - Math.cos(angle)) + pivotY * Math.sin(angle),
        pivotY * (1 - Math.cos(angle)) - pivotX * Math.sin(angle),
        0,
      );
      if (support) {
        const height = (0.398 - pivotX) * Math.tan(angle);
        support.visible = height > 0;
        support.scale.y = height;
        support.position.y = pivotY + height / 2;
      }
      ballast.forEach((w, i) => {
        const loaded = i < run.ballast;
        const parent = loaded ? cart : base;
        if (w.parent !== parent) parent.add(w);
        if (w.userData.held) return;
        if (loaded) w.position.set(0, 0.052 + i * 0.009, 0);
        else w.position.copy(w.userData.home);
        w.quaternion.identity();
      });
      horizontal.visible = wrappedCord.visible = low || run.load > 0;
    }
    const travel = (run.startOffset || 0) + run.x;
    const x = START - travel,
      drop = adjustable && !run.load ? 0.381 : TRAVEL + (adjustable ? 0.046 : 0.04) - travel;
    cart.position.set(x, TOP, 0);
    pan.position.set(PX - R, drop, 0);
    let hang = LINE - R - drop;
    if (adjustable) {
      // 槽码及下垂绳段在世界坐标系中铅直。
      const anchorX = PX - R * Math.cos(angle),
        anchorY = LINE - R + R * Math.sin(angle);
      if (low) {
        // run.hookY：挂钩在台面坐标里的高度（由课里按绳长算好）
        group.updateMatrix();
        hang = Math.max(0.004, _a.set(anchorX, anchorY, 0).applyMatrix4(group.matrix).y - run.hookY);
      }
      pan.position.set(anchorX - hang * Math.sin(angle), anchorY - hang * Math.cos(angle), 0);
      pan.rotation.z = vertical.rotation.z = -angle;
    }
    wheel.rotation.z = (low ? run.wheel || 0 : travel) / R;
    tires.forEach((w) => (w.rotation.y = travel / 0.011));
    const h = x - 0.052 - PX;
    horizontal.position.set(PX + h / 2, LINE, 0);
    horizontal.rotation.z = Math.PI / 2;
    horizontal.scale.y = h;
    if (low && !run.tied) {
      // 没系上小车：绳头从滑轮顶上搭下来，松松地落在木板上。
      const dx = 0.085,
        dy = TOP + 0.0012 - LINE;
      horizontal.position.set(PX + dx / 2, LINE + dy / 2, 0);
      horizontal.rotation.z = Math.atan2(dy, dx) + Math.PI / 2;
      horizontal.scale.y = Math.hypot(dx, dy);
    }
    const v = low ? hang : LINE - R - drop;
    vertical.position.set(PX - R, drop + v / 2, 0);
    if (adjustable)
      vertical.position.set(pan.position.x + (v / 2) * Math.sin(angle), pan.position.y + (v / 2) * Math.cos(angle), 0);
    vertical.scale.y = v;
    const from = x + 0.055;
    strip.position.set((from + EDGE) / 2, PAPER_Y, 0);
    strip.scale.x = EDGE - from;
    const remain = low ? 0.03 : TRAVEL + 0.024 - travel;
    tail.position.set(EDGE, PAPER_Y - remain / 2, 0);
    tail.scale.x = remain;
    dots.count = run.marks.length;
    run.marks.forEach((m, i) => {
      marker.position.set(TIMER - run.x + m.x, PAPER_Y + 0.0004, 0);
      marker.updateMatrix();
      dots.setMatrixAt(i, marker.matrix);
    });
    dots.instanceMatrix.needsUpdate = true;
    head.update(run.recording, run.t);
  }
  return {
    group: base,
    board,
    ballast,
    support,
    wedge,
    top: TOP,
    // 垫块正面写的字（只在 low 时有）
    wedgeText(text) {
      const g = wedgeTex.canvas.getContext('2d');
      g.clearRect(0, 0, 256, 80);
      g.fillStyle = 'rgba(250,238,214,.92)';
      g.fillRect(0, 0, 256, 80);
      g.fillStyle = '#3d2c1c';
      g.font = 'bold 54px sans-serif';
      g.textAlign = 'center';
      g.fillText(text, 128, 60);
      wedgeTex.needsUpdate = true;
    },
    cart,
    pan,
    timer,
    strip,
    draw,
    dispose() {
      for (const texture of markings) texture.dispose();
      wedgeTex?.dispose();
    },
    stripLayout(run) {
      const firstX = TIMER - run.x + (run.marks[0]?.x || 0);
      const leftX = strip.position.x - strip.scale.x / 2;
      const center = strip.position.clone();
      center.x += tail.scale.x / 2;
      return {
        length: strip.scale.x + tail.scale.x,
        lead: firstX - leftX,
        center: base.worldToLocal(group.localToWorld(center)),
      };
    },
    setPaperVisible(visible) {
      strip.visible = tail.visible = dots.visible = visible;
    },
  };
}
