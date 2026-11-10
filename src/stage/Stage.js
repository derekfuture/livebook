import * as THREE from 'three';
import { CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { InkPost } from './InkPost.js';
import { STYLE } from '../live/ink.js';

// 渲染器、灯光、书桌和相机。相机不直接设位置，而是追一个“机位”（目标点 + 方向 + 距离），
// 换机位时平滑过去，鼠标移动时再加一点视差，让书像真的摆在桌上。
export class Stage {
  constructor(canvas) {
    this.canvas = canvas;
    const renderer = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true }));
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.localClippingEnabled = true;      // 烧瓶倒过来时，瓶里的水用一个水平的裁切面画出水面
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    const scene = (this.scene = new THREE.Scene());
    // 主题：day（默认，白天的书桌）| night（原来的深色）
    this.theme = new URLSearchParams(location.search).get('theme') === 'night' ? 'night' : 'day';
    const bg = this.theme === 'day' ? 0xe9e1d3 : 0x2a211b;
    scene.background = new THREE.Color(bg);
    scene.fog = new THREE.Fog(bg, this.theme === 'day' ? 7 : 9, this.theme === 'day' ? 18 : 22);
    document.body.classList.add(`theme-${this.theme}`);

    this.camera = new THREE.PerspectiveCamera(30, 1, 0.02, 60);

    // 第二层：真实的网页元素放进 3D 场景里（立在书上的实验板），跟着同一台相机走
    this.cssScene = new THREE.Scene();
    this.css = new CSS3DRenderer();
    Object.assign(this.css.domElement.style, { position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: '3' });
    this.css.domElement.id = 'css3d';
    document.body.appendChild(this.css.domElement);
    // 浏览器把板上的元素“滚动到可见”时会把整层挪走：始终归位
    const pin = (el) => el.addEventListener('scroll', () => { el.scrollTop = 0; el.scrollLeft = 0; }, true);
    pin(this.css.domElement); pin(document.documentElement);
    addEventListener('scroll', () => { scrollTo(0, 0); });

    const day = this.theme === 'day';
    scene.add(new THREE.HemisphereLight(0xfffaf2, day ? 0xb8a890 : 0x8a7360, day ? 1.75 : 1.55));
    const sun = (this.sun = new THREE.DirectionalLight(day ? 0xfff6e8 : 0xfff1dc, day ? 1.7 : 1.9));
    sun.position.set(-2.2, 6.5, 3.2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.radius = 4;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.012;
    Object.assign(sun.shadow.camera, { left: -3.4, right: 3.4, top: 3, bottom: -3, near: 1, far: 14 });
    scene.add(sun, sun.target);

    this._desk();

    // 机位
    this.rig = {
      target: new THREE.Vector3(), dir: new THREE.Vector3(0, 1, 0.6).normalize(), dist: 6,
      cur: { target: new THREE.Vector3(), dir: new THREE.Vector3(0, 1, 0.6).normalize(), dist: 6 },
      parallax: new THREE.Vector2(), pointer: new THREE.Vector2(),
    };
    this.cameraOffsetX = 0;   // 屏幕上给侧边面板让出位置（像素，正数 = 画面中心右移）
    this.cameraOffsetY = 0;   // 正数 = 画面中心上移（手机上面板在下半屏）
    addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;          // 手指拖的时候不算（手机上的视差跟着手机的倾斜走，见 enableTilt）
      this.rig.pointer.set((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
    });

    this.updaters = new Set();
    if (STYLE === 'ink') { this.post = new InkPost(this.renderer, this.scene, this.camera); document.body.classList.add('ink-style'); }
    this.timer = new THREE.Timer();
    this.timer.connect?.(document);
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  /** 手机上的视差：手机一歪，画面跟着轻轻转一点，像隔着一块玻璃看桌上的东西（电脑上是跟着鼠标）。首页书桌和地理世界开。
   *  按“眼睛相对屏幕挪了”来转：手机往右歪 ≈ 眼睛往左挪，和鼠标往右一样；手机顶往外倒 ≈ 眼睛往上挪，和鼠标往下一样。
   *  不管手机怎么拿，都以“刚才那个姿势”为准（基准几秒钟慢慢跟上），所以只有动的时候有感觉，不会一直歪着。
   *  安卓等直接就有；iPhone 要先问一次“运动与方向”的权限，而且只能在点一下的那一刻问：第一次点画面时还没收到过就问；拒绝过就不再问 */
  enableTilt() {
    if (this._tilt || !('DeviceOrientationEvent' in window) || !matchMedia('(pointer: coarse)').matches) return;
    const T = (this._tilt = { live: false, base: null, last: 0 });
    const on = (e) => {
      if (e.beta == null || e.gamma == null) return;
      T.live = true;
      const a = ((screen.orientation?.angle ?? window.orientation ?? 0) % 360 + 360) % 360;
      const [x, y] = a === 90 ? [e.beta, -e.gamma] : a === 270 ? [-e.beta, e.gamma] : a === 180 ? [-e.gamma, -e.beta] : [e.gamma, e.beta];          // 换成屏幕上的左右、上下
      const now = e.timeStamp || performance.now(), dt = T.last ? Math.min(0.2, (now - T.last) / 1000) : 0; T.last = now;
      if (!T.base || Math.abs(x - T.base.x) > 50 || Math.abs(y - T.base.y) > 50) T.base = { x, y };          // 头一回、或者一下子翻过去了（竖起来时角度会跳）：从这里重新算
      const k = 1 - Math.exp(-dt / 2.5); T.base.x += (x - T.base.x) * k; T.base.y += (y - T.base.y) * k;          // 基准约 2.5 秒跟上
      const c = (v) => Math.max(-1, Math.min(1, v / 12));          // 歪 12° 就到头（和鼠标移到屏幕边上一样）
      this.rig.pointer.set(c(x - T.base.x), c(y - T.base.y));
    };
    addEventListener('deviceorientation', on);          // 没有权限时收不到，不碍事
    if (typeof DeviceOrientationEvent.requestPermission !== 'function') return;
    try { if (localStorage.getItem('livebook.tilt') === 'no') return; } catch { /* 隐私模式 */ }
    const ask = () => {
      this.canvas.removeEventListener('touchend', ask);
      if (T.live) return;          // 已经收到了（安卓新版也有这个函数，但不用问）
      DeviceOrientationEvent.requestPermission().then((r) => { if (r !== 'granted') try { localStorage.setItem('livebook.tilt', 'no'); } catch { /* 隐私模式 */ } }).catch(() => {});
    };
    this.canvas.addEventListener('touchend', ask);
  }

  _desk() {
    // 程序生成的木纹，免得再带一张贴图
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 1024;
    const g = c.getContext('2d');
    const day = this.theme === 'day';
    g.fillStyle = day ? '#c9a77f' : '#5a3f2c'; g.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 1400; i++) {
      const y = Math.random() * 1024, w = 200 + Math.random() * 900, x = Math.random() * 1024 - 100;
      const l = (day ? 52 : 24) + Math.random() * 22;
      g.strokeStyle = `hsla(${26 + Math.random() * 8}, ${day ? 32 : 38}%, ${l}%, ${0.05 + Math.random() * 0.12})`;
      g.lineWidth = 0.6 + Math.random() * 2.4;
      g.beginPath();
      g.moveTo(x, y);
      for (let k = 1; k <= 8; k++) g.lineTo(x + (w * k) / 8, y + Math.sin(k * 0.9 + y) * 3 + (Math.random() - 0.5) * 2);
      g.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
    tex.anisotropy = 8;
    const desk = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshLambertMaterial({ map: tex, color: this.theme === 'day' ? 0xf2e6d6 : 0xd8c2ad })
    );
    desk.rotation.x = -Math.PI / 2;
    desk.position.y = -0.002;
    desk.receiveShadow = true;
    this.scene.add(desk);
    this.desk = desk;          // 地理世界里换成夜空时要藏起来
  }

  // ---- 用户自己调的视角（叠加在当前机位上；换机位时自动复位） ----
  // yaw/pitch：绕目标点转（弧度）；zoom：距离倍数；pan：目标点平移
  get user() { return (this._user ||= { yaw: 0, pitch: 0, zoom: 1, pan: new THREE.Vector3(), cur: { yaw: 0, pitch: 0, zoom: 1, pan: new THREE.Vector3() } }); }
  orbit(dx, dy) { const u = this.user; u.yaw -= dx * 0.006; u.pitch += dy * 0.005; u.pitch = Math.max(-1.2, Math.min(1.2, u.pitch)); }
  zoomBy(f, ndc) {
    const u = this.user, before = u.zoom;
    u.zoom = Math.max(this.zoomMin ?? 0.12, Math.min(2.6, u.zoom * f));          // zoomMin：凑近看某处时（比如钻进溶洞口）不让再往里拉，免得穿过岩壁
    // 以鼠标指着的地方为中心缩放：把目标点朝那里挪一点
    if (ndc) {
      const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, this.camera);
      const target = this.rig.target.clone().add(u.pan);
      // 先找鼠标真正指着的东西；没有就用穿过当前目标点的水平面
      const obj = ray.intersectObjects(this.scene.children, true).find((h) => h.object.visible && h.object.isMesh);
      const hit = obj ? obj.point : ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -target.y), new THREE.Vector3());
      if (hit && hit.distanceTo(target) < 6) u.pan.addScaledVector(hit.clone().sub(target), 1 - u.zoom / before);
      if (u.pan.length() > 3) u.pan.setLength(3);
    }
  }
  panBy(dx, dy) {
    const u = this.user, d = this.rig.cur.dist * u.cur.zoom;
    const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
    const up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
    const k = (d * Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2) * 2) / innerHeight;
    u.pan.addScaledVector(right, -dx * k).addScaledVector(up, dy * k);
    if (u.pan.length() > 3) u.pan.setLength(3);
  }
  resetView() { const u = this.user; u.yaw = 0; u.pitch = 0; u.zoom = 1; u.pan.set(0, 0, 0); }
  get viewChanged() { const u = this.user; return Math.abs(u.yaw) > 0.01 || Math.abs(u.pitch) > 0.01 || Math.abs(u.zoom - 1) > 0.02 || u.pan.lengthSq() > 1e-4; }

  /** 换机位。dir 是从目标点指向相机的方向。keepView：保留用户自己调的视角 */
  shot({ target, dir, dist, instant = false, keepView = false, minEl = 0.17 }) {
    if (!keepView) this.resetView();
    this.rig.minEl = minEl;          // 俯仰下限：平时不让相机钻到桌面下；凑近读刻度时允许平视
    if (target) this.rig.target.copy(target);
    if (dir) this.rig.dir.copy(dir).normalize();
    if (dist) this.rig.dist = dist;
    if (instant) {
      this.rig.cur.target.copy(this.rig.target);
      this.rig.cur.dir.copy(this.rig.dir);
      this.rig.cur.dist = this.rig.dist;
    }
  }

  /** 能把宽 w、深 d 的矩形完整放进画面的距离（相机俯视角下近似）。 */
  fitDistance(w, d, margin = 1.08) {
    const vfov = THREE.MathUtils.degToRad(this.camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * this.camera.aspect);
    const usableW = 1 - Math.abs(this.cameraOffsetX * 2) / Math.max(1, innerWidth);
    const usableH = 1 - Math.abs(this.cameraOffsetY * 2) / Math.max(1, innerHeight);
    const byW = (w * margin) / 2 / Math.tan((hfov * usableW) / 2);
    const byD = (d * margin) / 2 / Math.tan((vfov * usableH) / 2);
    return Math.max(byW, byD);
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.css?.setSize(w, h);
    this.post?.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.onResize?.();
  }

  /** 镜头是不是已经停稳在机位上（换场景、截图之前等一等） */
  settled(eps = 0.003, { parallax = false } = {}) {          // parallax：连鼠标视差也要停（截图换页面时要；同一个舞台里接着画时不用）
    const r = this.rig;
    return r.cur.target.distanceTo(r.target) < eps && r.cur.dir.distanceTo(r.dir) < eps && Math.abs(r.cur.dist - r.dist) < eps * 4 && (!parallax || r.parallax.length() < 0.02);
  }

  /** 把现在的画面截成一张 JPEG（data URL）：换页面时先拿它盖着，新页面画好了再揭开，就不会白一下 */
  snapshot(w = innerWidth, h = innerHeight) {
    if (this.post) this.post.render(0); else this.renderer.render(this.scene, this.camera);       // 截图要和渲染在同一段脚本里（WebGL 画完的缓冲区下一帧就清了）
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(this.renderer.domElement, 0, 0, w, h);
    return c.toDataURL('image/jpeg', 0.86);
  }

  start() {
    if (this._started) return;          // 从书架拿书进来：书架那边已经开始画了，同一个舞台不再开第二个循环
    this._started = true;
    const tmp = new THREE.Vector3();
    const loop = () => {
      this.timer.update();
      const dt = Math.min(this.timer.getDelta(), 1 / 20);
      const r = this.rig, k = 1 - Math.exp(-dt * 4.2);
      r.cur.target.lerp(r.target, k);
      r.cur.dir.lerp(r.dir, k).normalize();
      r.cur.dist += (r.dist - r.cur.dist) * k;
      r.parallax.lerp(this.calm ? new THREE.Vector2() : r.pointer, 1 - Math.exp(-dt * (this.calm ? 6 : this._tilt?.live ? 5 : 2)));      // calm：换场景前不跟着鼠标晃；跟着手机倾斜时跟得快一点（不然像飘着）

      // 用户视角（平滑跟随）
      const u = this.user, uk = 1 - Math.exp(-dt * 10);
      u.cur.yaw += (u.yaw - u.cur.yaw) * uk; u.cur.pitch += (u.pitch - u.cur.pitch) * uk;
      u.cur.zoom += (u.zoom - u.cur.zoom) * uk; u.cur.pan.lerp(u.pan, uk);
      tmp.copy(r.cur.dir);
      // 鼠标视差：绕目标点轻轻转一点（用户在调视角时不加）
      const px = this._interacting ? 0 : 1;
      tmp.applyAxisAngle(new THREE.Vector3(0, 1, 0), u.cur.yaw - r.parallax.x * 0.045 * px);
      // 俯仰：限制在 4°~88° 之间
      const el = Math.asin(Math.max(-1, Math.min(1, tmp.y))), az = Math.atan2(tmp.x, tmp.z);
      const el2 = Math.max(r.minEl ?? 0.17, Math.min(1.53, el + u.cur.pitch + r.parallax.y * 0.03 * px * (r.minEl === 0 ? 0 : 1)));
      tmp.set(Math.sin(az) * Math.cos(el2), Math.sin(el2), Math.cos(az) * Math.cos(el2));
      const target = r.cur.target.clone().add(u.cur.pan);
      this.camera.position.copy(target).addScaledVector(tmp, r.cur.dist * u.cur.zoom);
      this.camera.lookAt(target);
      // 面板占了屏幕一侧（或手机上的下半屏）时，用视口偏移把画面中心挪到空出来的那块
      const off = this._offset(dt);
      if (Math.abs(off.x) > 0.5 || Math.abs(off.y) > 0.5) this.camera.setViewOffset(innerWidth, innerHeight, -off.x, off.y, innerWidth, innerHeight);
      else if (this.camera.view?.enabled) this.camera.clearViewOffset();

      for (const fn of this.updaters) fn(dt, this.timer.getElapsed());
      if (this.post) this.post.render(dt); else this.renderer.render(this.scene, this.camera);
      if (this.cssScene.children.length) this.css.render(this.cssScene, this.camera);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  _offset(dt) {
    this._off = this._off || new THREE.Vector2();
    const k = 1 - Math.exp(-dt * 4.2);
    this._off.x += (this.cameraOffsetX - this._off.x) * k;
    this._off.y += (this.cameraOffsetY - this._off.y) * k;
    return this._off;
  }

}
