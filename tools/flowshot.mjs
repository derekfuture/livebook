import { existsSync } from 'fs';
// 连拍：看动起来的样子（单张截图看不到的东西：气泡、倒水、演示里的每个动作）。开发服务器要先开着（端口 5188）。
//
//   node tools/flowshot.mjs <id> --demo [--every=1.5]
//       从头放一遍老师演示，每隔 every 秒截一张整屏，拼成 /tmp/lbqa/<id>-demo.jpg（每张标上秒数和字幕）
//   node tools/flowshot.mjs <id> --upto=<步骤名> [--around=<debug.picks 里的名字>] [--every=0.4] [--n=6] [--size=220]
//       按 debug.qa 的流程做到这一步（含这一步），再连拍 n 张；给了 around 就只拍那件东西周围（特写），拼成 /tmp/lbqa/<id>-burst.jpg
import fs from 'fs';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
// playwright-core 装在 ~/.cache/livebook-tools（/tmp 会被系统定期清掉）；找不到再用 /tmp/lbshot
const PW_BASE = [`${process.env.HOME}/.cache/livebook-tools/package.json`, '/tmp/lbshot/package.json'].find((p) => existsSync(p.replace('package.json', 'node_modules/playwright-core/package.json'))) || '/tmp/lbshot/package.json';
const { chromium } = createRequire(PW_BASE)('playwright-core');

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith('--'));
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const DEMO = args.includes('--demo');
const every = +opt('every', DEMO ? 1.5 : 0.4), n = +opt('n', 6), size = +opt('size', 220), upto = opt('upto', ''), around = opt('around', '');
const books = JSON.parse(fs.readFileSync(new URL('../src/content/books.json', import.meta.url), 'utf8'));
const book = Object.entries(books).find(([, b]) => b.lessons[id])?.[0];
const exe = process.env.HOME + '/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
fs.mkdirSync('/tmp/lbqa/fs', { recursive: true });

const b = await chromium.launch({ executablePath: exe, headless: true, args: ['--use-angle=metal', '--enable-gpu'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.addInitScript(() => { window.WebSocket = class { constructor() {} addEventListener() {} removeEventListener() {} send() {} close() {} }; });     // 别人改文件不刷新这个页面
await p.goto(`http://127.0.0.1:${process.env.LB_PORT || 5188}/?book=${book}#live=${id}`);
for (let i = 0; i < 60; i++) { if (await p.evaluate(() => !!window.__lb?.live?.active?.inst && !window.__lb.live.opening)) break; await p.waitForTimeout(150); }
await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => x.textContent.includes('不猜了'))?.click());
await p.waitForTimeout(2200);
const shots = [];
if (DEMO) {
  await p.evaluate(() => __lb.live.active.inst.debug.bar.play('demo'));
  for (let k = 0; k < 80; k++) {
    const cap = await p.evaluate(() => { const b = __lb.live.active.inst.debug.bar; return b.playing ? (document.querySelector('.lbar')?.innerText || '').split('\n').find((l) => l.length > 8) || '' : null; });
    if (cap === null) break;
    const f = `/tmp/lbqa/fs/${id}-d${String(k).padStart(2, '0')}.png`;
    await p.screenshot({ path: f, clip: { x: 400, y: 60, width: 1040, height: 840 } });
    shots.push([f, `${(k * every).toFixed(1)}s ${cap.slice(0, 40)}`]);
    await p.waitForTimeout(every * 1000);
  }
} else {
  const steps = await p.evaluate(() => (__lb.live.active.inst.debug?.qa || []).map((q) => [q.name, q.wait ?? 1]));
  const last = steps.findIndex(([nm]) => nm === upto);
  if (last < 0) { console.log('没有这一步。可选：' + steps.map((s) => s[0]).join(' / ')); process.exit(1); }
  for (let k = 0; k <= last; k++) {
    await p.evaluate((k) => __lb.live.active.inst.debug.qa[k].run(), k);
    if (k < last) await p.waitForTimeout(steps[k][1] * 1000);
  }
  for (let k = 0; k < n; k++) {
    await p.waitForTimeout(every * 1000);
    let clip = { x: 400, y: 60, width: 1040, height: 840 };
    if (around) {
      const xy = await p.evaluate((key) => { const o = __lb.live.active.inst.debug.picks?.[key] || __lb.live.active.inst.debug[key]; if (!o) return null; const w = o.getWorldPosition(o.position.clone()).project(__lb.stage.camera); return [(w.x + 1) / 2 * innerWidth, (1 - w.y) / 2 * innerHeight]; }, around);
      if (xy) clip = { x: Math.max(0, xy[0] - size / 2), y: Math.max(0, xy[1] - size * 0.7), width: size, height: size };
    }
    const f = `/tmp/lbqa/fs/${id}-b${k}.png`;
    await p.screenshot({ path: f, clip });
    shots.push([f, `+${((k + 1) * every).toFixed(1)}s`]);
  }
}
await b.close();
// 拼图（每张下面写上时间 / 字幕）
const out = `/tmp/lbqa/${id}-${DEMO ? 'demo' : 'burst'}.jpg`;
execFileSync('python3', ['-c', `
import sys, json
from PIL import Image, ImageDraw, ImageFont
shots = json.loads(sys.argv[1]); out = sys.argv[2]
ims = [Image.open(f) for f, _ in shots]
w = 340 if ${DEMO ? 1 : 0} else min(300, ims[0].width); h = int(ims[0].height * w / ims[0].width)
cols = 4 if ${DEMO ? 1 : 0} else min(len(ims), 6); rows = (len(ims) + cols - 1) // cols
W = Image.new('RGB', (cols * w, rows * (h + 22)), 'white'); d = ImageDraw.Draw(W)
try: font = ImageFont.truetype('/System/Library/Fonts/Hiragino Sans GB.ttc', 13)
except Exception: font = None
for i, (im, (_, label)) in enumerate(zip(ims, shots)):
    x, y = (i % cols) * w, (i // cols) * (h + 22)
    W.paste(im.resize((w, h)), (x, y)); d.text((x + 4, y + h + 3), label, fill='black', font=font)
W.save(out, quality=85)
`, JSON.stringify(shots), out]);
console.log(out + `（${shots.length} 张）`);
