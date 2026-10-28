// 真的声音：Web Audio。浏览器要求用户点过页面才能出声，实验里的按钮点击正好满足。
let ctx = null;
export function audio() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/** 持续的音（可调音调、响度、音色），带一个分析器取波形。 */
export class Tone {
  constructor({ type = 'sine', freq = 440, gain = 0.2 } = {}) {
    const a = audio();
    this.osc = a.createOscillator();
    this.osc.type = type;
    this.osc.frequency.value = freq;
    this.g = a.createGain();
    this.g.gain.value = 0;
    this.out = a.createGain();
    this.out.gain.value = 1;
    this.analyser = a.createAnalyser();
    this.analyser.fftSize = 2048;
    this.osc.connect(this.g).connect(this.out).connect(this.analyser).connect(a.destination);
    this.osc.start();
    this.level = gain;
  }
  /** 打开/关闭（有包络，不会“啪”一声） */
  on(v = true, ramp = 0.04) {
    const t = audio().currentTime;
    this.g.gain.cancelScheduledValues(t);
    this.g.gain.setTargetAtTime(v ? this.level : 0, t, ramp);
  }
  /** 拨一下：快速起音，然后按 decay 秒衰减 */
  pluck(decay = 0.6, peak = this.level) {
    const t = audio().currentTime;
    this.g.gain.cancelScheduledValues(t);
    this.g.gain.setValueAtTime(0.0001, t);
    this.g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + 0.008);
    this.g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  }
  freq(f) { this.osc.frequency.setTargetAtTime(f, audio().currentTime, 0.01); }
  gain(v) { this.level = v; }
  /** 整体音量（真空罩抽气、隔音墙这些“传播途中”的衰减用这个） */
  volume(v) { this.out.gain.setTargetAtTime(v, audio().currentTime, 0.05); }
  wave(buf = new Float32Array(this.analyser.fftSize)) { this.analyser.getFloatTimeDomainData(buf); return buf; }
  stop() { try { this.osc.stop(); this.osc.disconnect(); this.analyser.disconnect(); } catch { /* 已经停了 */ } }
}

/** 噪声（无规则振动）。 */
export class Noise {
  constructor({ gain = 0.15 } = {}) {
    const a = audio();
    const buf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (0.6 + 0.4 * Math.sin(i * 0.0007));
    this.src = a.createBufferSource();
    this.src.buffer = buf;
    this.src.loop = true;
    this.g = a.createGain();
    this.g.gain.value = 0;
    this.out = a.createGain();
    this.analyser = a.createAnalyser();
    this.analyser.fftSize = 2048;
    this.src.connect(this.g).connect(this.out).connect(this.analyser).connect(a.destination);
    this.src.start();
    this.level = gain;
  }
  on(v = true) { this.g.gain.setTargetAtTime(v ? this.level : 0, audio().currentTime, 0.04); }
  volume(v) { this.out.gain.setTargetAtTime(v, audio().currentTime, 0.05); }
  wave(buf = new Float32Array(this.analyser.fftSize)) { this.analyser.getFloatTimeDomainData(buf); return buf; }
  stop() { try { this.src.stop(); this.src.disconnect(); this.analyser.disconnect(); } catch { /* */ } }
}

/** 闹钟铃声（一串快速的“叮”） */
export class Bell {
  constructor() {
    this.tone = new Tone({ type: 'triangle', freq: 1760, gain: 0.18 });
    this.t = 0; this.ringing = false;
  }
  update(dt) {
    if (!this.ringing) return;
    this.t += dt;
    if (this.t > 0.09) { this.t = 0; this.tone.pluck(0.08); }
  }
  ring(v) { this.ringing = v; if (!v) this.tone.on(false); }
  volume(v) { this.tone.volume(v); }
  wave(b) { return this.tone.wave(b); }
  stop() { this.tone.stop(); }
}

/** 示波器：把波形画到 canvas 上（课本里那种绿色荧光屏） */
export function drawScope(canvas, data, { gain = 1, color = '#49f2c3', grid = true, label } = {}) {
  const g = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
  g.fillStyle = '#0b1f24'; g.fillRect(0, 0, W, H);
  if (grid) {
    g.strokeStyle = 'rgba(80,180,170,.18)'; g.lineWidth = 1;
    for (let i = 1; i < 10; i++) { g.beginPath(); g.moveTo((i * W) / 10, 0); g.lineTo((i * W) / 10, H); g.stroke(); }
    for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(0, (i * H) / 6); g.lineTo(W, (i * H) / 6); g.stroke(); }
  }
  g.strokeStyle = color; g.lineWidth = 3; g.shadowColor = color; g.shadowBlur = 8;
  g.beginPath();
  // 找一个上升沿开始画，让波形稳定
  let start = 0;
  for (let i = 1; i < data.length / 2; i++) if (data[i - 1] < 0 && data[i] >= 0) { start = i; break; }
  const n = Math.min(data.length - start, 1024);
  for (let i = 0; i < n; i++) {
    const x = (i / n) * W, y = H / 2 - data[start + i] * gain * H * 0.42;
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.stroke();
  g.shadowBlur = 0;
  if (label) { g.fillStyle = 'rgba(160,255,230,.7)'; g.font = '22px sans-serif'; g.fillText(label, 12, 30); }
}

/** 由合成参数直接生成一段波形（不用发声也能画） */
export function synthWave(n, fn) {
  const d = new Float32Array(n);
  for (let i = 0; i < n; i++) d[i] = fn(i / n);
  return d;
}
