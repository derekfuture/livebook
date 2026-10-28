// 世界里的实验记录：取代左侧网页面板。三种摆法（?ui=）：
//   page —— 书即学案：预测和结论写在夹在左页上的“记录单”上，数据用铅笔写进课本这一页印着的空表格
//   desk —— 桌上放一本实验记录本，所有记录写在本子上
//   card —— 几乎没有界面：预测是立在场景里的小卡片，数据卡片一张张落在书页上，结论是一张能掀开的卡片
// 实验代码只和这里的 api 打交道（status / setGoals / done / record / prediction），不关心摆在哪。
import * as THREE from 'three';
import { Paper, HAND, SONG, PENCIL, RED, BLUE, roundRect } from './paper.js';
import { stamps } from '../ui/Panel.js';

const P = Paper;

function wrap(g, text, maxW) {
  const lines = [];
  for (const para of String(text).replace(/<[^>]+>/g, '').split('\n')) {
    let line = '';
    for (const ch of [...para]) {
      if (g.measureText(line + ch).width > maxW && line) { lines.push(line); line = ch; } else line += ch;
    }
    lines.push(line);
  }
  return lines;
}

export class WorldNotebook {
  constructor({ mode, def, book, textures, stage, spot, root, onClose }) {
    Object.assign(this, { mode, def, book, textures, stage, spot, root, onClose });
    this.group = new THREE.Group();
    stage.scene.add(this.group);
    this.pick = null;
    this.goals = [];
    this.rows = [];
    this.unlocked = false;
    this.flap = 0;           // 0 合着 → 1 掀开
    this.flapOpen = false;
    this.stamped = false;
    this.t = 0;
    this.writing = [];       // 正在“写”的字：{ row, col, start }
    this._buildCapsule();
    this._build();
    this.api = {
      controls: document.createElement('div'), data: document.createElement('div'),     // 兼容旧接口（不显示）
      status: (m) => this.status(m),
      need: () => {},
      unlock: () => this.unlock(),
      prediction: () => this.pick,
      setGoals: (list) => { this.goals = list.map(([id, text]) => ({ id, text, done: false })); this.redraw(); },
      done: (id) => { const g = this.goals.find((x) => x.id === id); if (g && !g.done) { g.done = true; this.redraw(); if (this.goals.every((x) => x.done)) this.unlock(); } },
      record: (cells) => this.record(cells),
      hasPrediction: () => this.pick != null,
    };
    // 结论要用的课本原文（下一页），先把高清页要来
    if (def.conclusion?.page != null) textures.want([def.conclusion.page]);
  }

  // ---------------------------------------------------------------- 底部的一行提示（像 Every Joule 的胶囊条）
  _buildCapsule() {
    const el = document.createElement('div');
    el.id = 'capsule';
    el.innerHTML = `<button class="cap-back" title="放回书里">‹ 放回书里</button><span class="cap-fig"></span><span class="cap-msg"></span>`;
    el.querySelector('.cap-back').onclick = () => this.onClose();
    el.querySelector('.cap-fig').textContent = `${this.def.fig} · ${this.def.title}`;
    document.body.appendChild(el);
    this.capsule = el;
  }

  status(m) {
    const msg = this.capsule.querySelector('.cap-msg');
    msg.innerHTML = m || '';
    msg.classList.remove('flash'); void msg.offsetWidth; msg.classList.add('flash');
  }

  // ---------------------------------------------------------------- 纸张
  _build() {
    const book = this.book;
    const [leftPage, rightPage] = book.spread;
    const ptW = book.W / book.PW;          // 每个 PDF 点在 3D 里多长
    if (this.mode === 'page') {
      // 记录单：夹在对页上（实验所在页的另一页）
      const other = this.spot.page === rightPage ? leftPage : rightPage;
      const sw = 330, sh = this.def.worldTable && !this.def.worldTable.rect ? 430 : 360;   // 记录单的大小（PDF 点）
      this.sheet = new Paper({ w: sw * ptW, h: sh * ptW, units: sw, color: '#fbf6e8' }).flat();
      const c = book.pageToWorld(other, 262, sh > 400 ? 410 : 470, 0.006);
      this.sheet.mesh.position.copy(c);
      this.sheet.mesh.rotation.z = 0.035;
      this.group.add(this.sheet.mesh);
      this.sheetLayout = { width: sw, height: sh, table: !!this.def.worldTable && !this.def.worldTable.rect };
      // 课本上的空表格：透明的纸盖在印刷的表格上，铅笔字写在格子里
      const T = this.def.worldTable;
      if (T?.rect) {
        const [x0, y0, x1, y1] = T.rect;
        this.tablePaper = new Paper({ w: (x1 - x0) * ptW, h: (y1 - y0) * ptW, units: x1 - x0, color: 'transparent', grain: false, shadow: false }).flat();
        const tc = book.pageToWorld(this.spot.page, (x0 + x1) / 2, (y0 + y1) / 2, 0.0035);
        this.tablePaper.mesh.position.copy(tc);
        this.tablePaper.mesh.material.depthWrite = false;
        this.group.add(this.tablePaper.mesh);
      }
    } else if (this.mode === 'desk') {
      // 实验本：放在书的右前方桌面上
      const sw = 300, sh = 400;
      this.sheet = new Paper({ w: sw * ptW, h: sh * ptW, units: sw, color: '#fdfbf4' }).flat();
      this.sheet.mesh.position.set(book.W * 0.32, 0.004, book.H * 0.72);
      this.sheet.mesh.rotation.z = 0.06;
      this.group.add(this.sheet.mesh);
      // 本子的硬壳和装订线
      const cover = new THREE.Mesh(new THREE.BoxGeometry(sw * ptW * 1.04, 0.012, sh * ptW * 1.03), new THREE.MeshLambertMaterial({ color: 0x2f5f8f }));
      cover.position.copy(this.sheet.mesh.position).y = -0.004;
      cover.rotation.y = -0.06;
      cover.castShadow = cover.receiveShadow = true;
      this.group.add(cover);
      this.sheetLayout = { width: sw, height: sh, table: true };
    } else {
      // 卡片：预测卡立在实验旁边；结论卡在完成后出现
      const cw = 150, ch = 110;
      this.sheet = new Paper({ w: cw * ptW, h: ch * ptW, units: cw, color: '#fbf6e8' });
      this.cardPivot = new THREE.Group();
      this.cardPivot.add(this.sheet.mesh);
      this.sheet.mesh.position.y = (ch * ptW) / 2;
      const c = book.pageToWorld(this.spot.page, 60, 330, 0.004);
      this.cardPivot.position.copy(c);
      this.cardPivot.rotation.y = 0.45;
      this.cardPivot.rotation.x = -0.12;
      this.group.add(this.cardPivot);
      this.sheetLayout = { width: cw, height: ch, table: false, card: true };
      this.dataCards = [];
    }
    this.redraw();
  }

  redraw() {
    const L = this.sheetLayout;
    this.sheet.draw((g, paper) => (L.card ? this._drawCard(g, paper) : this._drawSheet(g, paper, L)));
    if (this.tablePaper) this.tablePaper.draw((g, paper) => this._drawPageTable(g, paper));
  }

  _drawSheet(g, paper, L) {
    const W = L.width, pad = 16;
    const d = this.def;
    let y = 24;
    P.print(g, '实验记录', pad, y, { size: 14.3, weight: 700, color: '#1f5fae' });
    P.hand(g, d.title, pad + 66, y, { size: 11.7, color: PENCIL });
    P.pencil(g, pad, y + 5, W - pad, y + 5, { width: 0.6 });
    y += 26;
    // 我的猜想
    P.print(g, '我的猜想', pad, y, { size: 11.1, weight: 700, color: '#6b6252' });
    y += 16;
    g.font = `400 10.4px ${SONG}`;
    for (const line of wrap(g, d.predict.q, W - pad * 2)) { P.print(g, line, pad, y, { size: 10.4, color: '#2c4f86' }); y += 14; }
    y += 2;
    this._options().forEach((o, i) => {
      P.box(g, pad + 2, y - 9, 9, this.pick === i);
      P.hand(g, o, pad + 16, y, { size: 11.1, color: this.pick === i ? BLUE : PENCIL, alpha: this.pick != null && this.pick !== i ? 0.45 : 1 });
      paper.region(`opt${i}`, pad, y - 13, W - pad * 2, 17);
      y += 18;
    });
    if (this.pick == null) { P.hand(g, '← 先打个勾，再动手', W - pad, y + 2, { size: 9.1, color: RED, align: 'right', font: SONG }); }
    y += 10;
    // 要做的事
    P.print(g, '动手做', pad, y, { size: 11.1, weight: 700, color: '#6b6252' });
    y += 15;
    for (const gl of this.goals) {
      P.box(g, pad + 2, y - 8.5, 8, gl.done);
      g.font = `400 9.9px ${HAND}`;
      const lines = wrap(g, gl.text, W - pad * 2 - 14);
      lines.forEach((ln, k) => P.hand(g, ln, pad + 15, y + k * 13, { size: 9.9, color: gl.done ? '#5a8a5a' : PENCIL }));
      if (gl.done) P.pencil(g, pad + 13, y - 2.5, pad + 13 + Math.min(W - pad * 2 - 14, g.measureText(lines[0]).width), y - 2.5, { color: '#5a8a5a', width: 0.4, alpha: 0.6 });
      y += 13 * lines.length + 4;
    }
    // 数据表（实验本模式才画在这里；书即学案模式写在课本的表格里）
    if (L.table) {
      y += 6;
      P.print(g, '数据', pad, y, { size: 11.1, weight: 700, color: '#6b6252' });
      y += 6;
      this._drawTable(g, pad, y, W - pad * 2, 14, 6);
      y += 14 * 7 + 8;
    }
    // 结论：纸片
    y = Math.max(y + 6, L.height - 112);
    this._drawFlap(g, paper, pad, y, W - pad * 2, L.height - y - 12);
  }

  /** 表格：列标题来自 def.worldTable.headers */
  _drawTable(g, x, y, w, rh, nRows) {
    const T = this.def.worldTable;
    const cols = T.cols.map((c) => c * w);
    let cx = x;
    P.pencil(g, x, y, x + w, y); P.pencil(g, x, y + rh, x + w, y + rh);
    T.headers.forEach((hd, i) => { P.print(g, hd, cx + cols[i] / 2, y + rh * 0.68, { size: 8.3, align: 'center', color: '#4b4467' }); cx += cols[i]; });
    for (let r = 1; r <= nRows; r++) P.pencil(g, x, y + rh * (r + 1), x + w, y + rh * (r + 1), { alpha: 0.35, width: 0.25 });
    cx = x;
    for (let i = 0; i <= cols.length; i++) { P.pencil(g, cx, y, cx, y + rh * (nRows + 1), { alpha: 0.35, width: 0.25 }); cx += cols[i] || 0; }
    this.rows.forEach((row, r) => {
      cx = x;
      row.forEach((cell, i) => { this._writeCell(g, cell, cx + cols[i] / 2, y + rh * (r + 1) + rh * 0.72, rh * 0.62, r, i); cx += cols[i]; });
    });
  }

  /** 课本上的表格：按 def.worldTable 给出的列宽和行高，把铅笔字写进去 */
  _drawPageTable(g, paper) {
    const T = this.def.worldTable;
    const [x0, , x1] = T.rect;
    const w = x1 - x0;
    const cols = T.pageCols || T.cols.map((c) => c * w);
    this.rows.forEach((row, r) => {
      let cx = 0;
      row.forEach((cell, i) => { this._writeCell(g, cell, cx + cols[i] / 2, T.firstRow + T.rowH * r + T.rowH * 0.7, T.rowH * 0.55, r, i); cx += cols[i]; });
    });
  }

  _writeCell(g, text, cx, cy, size, r, c) {
    // 写字动画：每个格子按顺序一个字一个字出现
    const w = this.writing.find((x) => x.r === r && x.c === c);
    let shown = String(text);
    if (w) { const n = Math.max(0, Math.floor((this.t - w.start) / 0.07)); shown = [...shown].slice(0, n).join(''); }
    P.hand(g, shown, cx, cy, { size, align: 'center', color: PENCIL });
  }

  _drawFlap(g, paper, x, y, w, h) {
    const d = this.def;
    if (!this.unlocked && !this.flapOpen) {
      paper.region('flap', x, y, w, h);
      g.save(); g.globalAlpha = 0.9;
      g.fillStyle = '#efe5cf'; roundRect(g, x, y, w, h, 3); g.fill();
      g.strokeStyle = '#c9b892'; g.setLineDash([3, 2]); g.lineWidth = 0.6; roundRect(g, x, y, w, h, 3); g.stroke(); g.setLineDash([]);
      g.restore();
      P.hand(g, '课本上的结论', x + w / 2, y + h / 2 - 2, { size: 11.7, color: '#8a7650', align: 'center', font: SONG });
      P.hand(g, '做完上面的事，就能掀开', x + w / 2, y + h / 2 + 11, { size: 8.5, color: '#a8987a', align: 'center', font: SONG });
      return;
    }
    // 掀开：纸片从下往上翻起（flap 0→1），下面是课本原文（从课本那一页截下来）；没做完先看的不盖章
    const k = this.flap;
    this._drawQuote(g, x, y, w, h);
    if (k < 1) {
      const fh = h * (1 - k);
      g.save();
      g.fillStyle = '#efe5cf'; g.shadowColor = 'rgba(0,0,0,.25)'; g.shadowBlur = 6; g.shadowOffsetY = -2 * k;
      roundRect(g, x, y, w, Math.max(1, fh), 3); g.fill();
      g.restore();
      if (k < 0.05) {
        P.hand(g, '掀开看课本上的结论 ↗', x + w / 2, y + h / 2 + 3, { size: 11.7, color: '#8a5a20', align: 'center' });
        paper.region('flap', x, y, w, h);
      }
    }
    if (this.stamped) P.stamp(g, '实证', x + w - 20, y + h - 18, { size: 33.8 });
  }

  _drawQuote(g, x, y, w, h) {
    const d = this.def;
    const c = d.conclusion;
    // 优先用课本原文的截图（真实的那一段），没有就用文字
    const tex = c.page != null ? this.textures.hiRes(c.page) : null;
    if (tex && c.rect) {
      const img = tex.image, [sx0, sy0, sx1, sy1] = c.rect;
      const kx = img.width / this.book.PW, ky = img.height / this.book.PH;
      const sw = (sx1 - sx0) * kx, sh = (sy1 - sy0) * ky;
      const scale = Math.min(w / (sx1 - sx0), (h - 8) / (sy1 - sy0));
      const dw = (sx1 - sx0) * scale, dh = (sy1 - sy0) * scale;
      g.save();
      g.translate(x + (w - dw) / 2, y + 4 + dh);
      g.scale(1, -1);                          // 页面贴图是上下翻过的
      g.drawImage(img, sx0 * kx, img.height - sy1 * ky, sw, sh, 0, 0, dw, dh);
      g.restore();
      P.print(g, c.src, x + 2, y + h - 2, { size: 6.5, color: '#8b8170' });
    } else {
      g.font = `400 9.8px ${SONG}`;
      let yy = y + 12;
      for (const ln of wrap(g, c.quote, w - 8)) { P.print(g, ln, x + 4, yy, { size: 9.8, color: '#1d4c8c' }); yy += 10.5; }
    }
  }

  _drawCard(g, paper) {
    const W = this.sheetLayout.width, H = this.sheetLayout.height, d = this.def, pad = 10;
    if (!this.unlocked) {
      // 预测卡
      let y = 18;
      P.print(g, '先猜一猜', pad, y, { size: 11.1, weight: 700, color: '#1f5fae' });
      y += 12;
      g.font = `400 9.1px ${SONG}`;
      for (const line of wrap(g, d.predict.q, W - pad * 2).slice(0, 4)) { P.print(g, line, pad, y, { size: 9.1, color: '#2c4f86' }); y += 9.5; }
      y += 3;
      this._options().forEach((o, i) => {
        P.box(g, pad, y - 6, 6, this.pick === i);
        g.font = `400 9.1px ${HAND}`;
        P.hand(g, wrap(g, o, W - pad * 2 - 10)[0], pad + 10, y, { size: 9.1, color: this.pick === i ? BLUE : PENCIL });
        paper.region(`opt${i}`, pad - 2, y - 9, W - pad * 2, 11.5);
        y += 12;
      });
      const left = this.goals.filter((x) => !x.done).length;
      if (this.goals.length) P.hand(g, this.pick == null ? '打个勾，然后动手试' : `还有 ${left} 件事要做`, W - pad, H - 6, { size: 8.5, color: RED, align: 'right', font: SONG });
    } else this._drawFlap(g, paper, 6, 6, W - 12, H - 12);
  }

  /** 预测选项最后自动加一个“还说不准” */
  _options() { return [...this.def.predict.options, '还说不准，做了再看']; }
  get _unsure() { return this.def.predict.options.length; }

  // ---------------------------------------------------------------- 操作
  record(cells) {
    const r = this.rows.length;
    this.rows.push(cells);
    cells.forEach((_, c) => this.writing.push({ r, c, start: this.t + c * 0.35 }));
    if (this.mode === 'card') this._dataCard(cells);
    this.redraw();
  }

  _dataCard(cells) {
    const ptW = this.book.W / this.book.PW;
    const cw = 120, ch = 26;
    const p = new Paper({ w: cw * ptW, h: ch * ptW, units: cw, color: '#fdfbf4' }).flat();
    const T = this.def.worldTable;
    p.draw((g) => {
      let x = 6;
      cells.forEach((c, i) => { const w = T.cols[i] * (cw - 12); P.hand(g, String(c), x + w / 2, 17, { size: 9, align: 'center' }); x += w; });
    });
    const n = this.dataCards.length;
    const pos = this.book.pageToWorld(this.spot.page, 120 + (n % 2) * 0, 520 + n * 32, 0.005 + n * 0.0006);
    p.mesh.position.copy(pos);
    p.mesh.rotation.z = (Math.random() - 0.5) * 0.08;
    p.mesh.userData.drop = 1;
    this.group.add(p.mesh);
    this.dataCards.push(p);
  }

  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    if (this.flapOpen) { this.peeked = false; setTimeout(() => { this.stamped = true; stamps.give(this.def.id); this.redraw(); }, 300); this.status('做完了，和课本上的结论对照一下。'); }
    else this.status('做完了！去掀开纸片，看看课本上是怎么说的。');
    this.redraw();
  }

  /** 指针：点到纸上的区域就处理，返回 true */
  pointerDown(ray) {
    const id = this.sheet.hit(ray);
    if (!id) return false;
    if (id.startsWith('opt') && this.pick == null) {
      this.pick = Number(id.slice(3));
      this.redraw();
      this.status(this.pick === this._unsure ? '没关系，做完再看。直接拖动实验里的东西试试。' : '猜好了。现在动手试一试——直接拖动实验里的东西。');
      if (this.mode === 'card') this._cardAway = 1;
      return true;
    }
    if (id === 'flap' && !this.unlocked && !this.flapOpen) {
      if (!this._peek) { this._peek = true; this.redraw(); this.status('还没做完。再点一下纸片，就先掀开看看（这样不盖章）。'); setTimeout(() => { this._peek = false; this.redraw(); }, 3500); return true; }
      this.flapOpen = true; this.peeked = true; this.redraw();
      this.status('先看了结论。还可以接着做实验，对照着看。');
      return true;
    }
    if (id === 'flap' && this.unlocked && !this.flapOpen) {
      this.flapOpen = true;
      const p = this.def.predict;
      this.status(this.pick == null ? '你没有先猜。下次先猜一猜，印象会更深。' : this.pick === this._unsure ? '你一开始说不准——现在你知道了。' : this.pick === p.answer ? `✓ 你猜对了：「${p.options[this.pick]}」` : `你猜的是「${p.options[this.pick]}」，课本上的结论和你想的不一样，对照实验再想一想。`);
      if (this.mode === 'card') this._cardBack = 1;
      return true;
    }
    return id === '_paper';
  }

  update(dt) {
    this.t += dt;
    if (this.flapOpen && this.flap < 1) {
      this.flap = Math.min(1, this.flap + dt * 1.8);
      if (this.flap >= 1 && !this.stamped && !this.peeked) { setTimeout(() => { this.stamped = true; stamps.give(this.def.id); this.redraw(); }, 350); }
      this.redraw();
    }
    // 写字动画进行中就一直重画
    if (this.writing.some((w) => this.t - w.start < 1.2)) this.redraw();
    else this.writing = this.writing.filter((w) => this.t - w.start < 1.2);
    // 卡片模式：猜完后预测卡倒下去，解锁后结论卡立起来
    if (this.mode === 'card') {
      const target = this.pick != null && !this.unlocked ? -1.35 : -0.12;
      this.cardPivot.rotation.x += (target - this.cardPivot.rotation.x) * Math.min(1, dt * 5);
      for (const c of this.dataCards) { const u = c.mesh.userData; if (u.drop > 0) { u.drop = Math.max(0, u.drop - dt * 3); c.mesh.position.y += 0; c.mesh.scale.setScalar(1 + u.drop * 0.3); } }
    }
  }

  dispose() {
    this.capsule.remove();
    this.group.traverse((o) => { o.geometry?.dispose(); if (o.material) { o.material.map?.dispose(); o.material.dispose(); } });
    this.stage.scene.remove(this.group);
  }
}
