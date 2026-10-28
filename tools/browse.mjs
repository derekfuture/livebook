// 用真实浏览器操作活页课本（给 reviewer / 自动化用）。开发服务器要先开着：npm run dev
//
// 用法：node tools/browse.mjs <url路径> <步骤文件.json | -> [输出目录]
//   url 路径例：'/?book=wuli-8s#live=convex'、'/?book=wuli-8x#p=23'
//   步骤（JSON 数组），每步一个对象，按顺序执行：
//     {"wait": 毫秒}
//     {"shot": "名字"}                    截图 → <输出目录>/名字.png
//     {"click": [x, y]}                   点屏幕坐标（视口 1440×900）
//     {"drag": [x1, y1, x2, y2]}          按住拖动（3D 里拖物体、翻页）
//     {"path": [[x,y], [x,y], ...]}       按住沿折线拖动（来回摩擦、绕路），松手
//     {"hold": [x, y, 毫秒]}              在这里按住一段时间再松手（倒水、充气）
//     {"move": [x, y]}                    鼠标移过去（看悬停效果）
//     {"text": "按钮上的字"}              点包含这段文字的按钮
//     {"sel": "CSS 选择器"}               点这个元素
//     {"range": [第几个滑块, 数值]}       设置面板里的滑块
//     {"key": "ArrowRight"}               按键
//     {"eval": "JS 表达式"}               在页面里执行，结果打印出来
//     {"read": true}                      打印面板上当前的状态文字、还需要做的事、读数
// 每次执行结束都会打印页面报错（如果有）。
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire('/tmp/lbshot/package.json');
const { chromium } = require('playwright-core');

const [, , urlPath = '/', stepsArg = '[]', outDir = 'review/codex'] = process.argv;
const steps = JSON.parse(stepsArg === '-' ? fs.readFileSync(0, 'utf8') : fs.existsSync(stepsArg) ? fs.readFileSync(stepsArg, 'utf8') : stepsArg);
fs.mkdirSync(outDir, { recursive: true });
const exe = process.env.HOME + '/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
// 有常驻浏览器服务（tools/browser-server.mjs）就连上去，否则自己开一个
const wsFile = new URL('./.browser-ws', import.meta.url);
const browser = fs.existsSync(wsFile)
  ? await chromium.connect(fs.readFileSync(wsFile, 'utf8').trim())
  : await chromium.launch({ executablePath: exe, args: ['--use-angle=metal', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: +(process.env.W || 1440), height: +(process.env.H || 900) } });
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto('http://127.0.0.1:5188' + urlPath);
await page.waitForTimeout(3500);
for (const s of steps) {
  try {
    if (s.wait) await page.waitForTimeout(s.wait);
    if (s.click) await page.mouse.click(...s.click);
    if (s.move) await page.mouse.move(...s.move);
    if (s.drag) {
      const [x1, y1, x2, y2] = s.drag;
      await page.mouse.move(x1, y1); await page.mouse.down();
      for (let i = 1; i <= 16; i++) { await page.mouse.move(x1 + ((x2 - x1) * i) / 16, y1 + ((y2 - y1) * i) / 16); await page.waitForTimeout(16); }
      await page.mouse.up();
    }
    if (s.path) {
      const pts = s.path;
      await page.mouse.move(...pts[0]); await page.mouse.down();
      for (let k = 1; k < pts.length; k++) { const [a, b] = [pts[k - 1], pts[k]]; for (let i = 1; i <= 10; i++) { await page.mouse.move(a[0] + ((b[0] - a[0]) * i) / 10, a[1] + ((b[1] - a[1]) * i) / 10); await page.waitForTimeout(16); } }
      await page.mouse.up();
    }
    if (s.hold) { await page.mouse.move(s.hold[0], s.hold[1]); await page.mouse.down(); await page.waitForTimeout(s.hold[2]); await page.mouse.up(); }
    if (s.text) await page.evaluate((t) => { const b = [...document.querySelectorAll('button, .opt, .flap-front')].find((x) => x.textContent.includes(t) && x.offsetParent); if (!b) throw new Error('找不到按钮：' + t); b.click(); }, s.text);
    if (s.sel) await page.click(s.sel);
    if (s.range) await page.evaluate(([i, v]) => { const r = [...document.querySelectorAll('#panel input[type=range], .board input[type=range]')].filter((x) => x.offsetParent)[i]; r.value = v; r.dispatchEvent(new Event('input')); }, s.range);
    if (s.key) await page.keyboard.press(s.key);
    if (s.eval) console.log('eval →', JSON.stringify(await page.evaluate(s.eval)));
    if (s.read) console.log('面板 →', JSON.stringify(await page.evaluate(() => ({
      标题: document.querySelector('.p-title')?.textContent,
      当前步骤: document.querySelector('.p-tab.on')?.textContent,
      状态: document.querySelector('.p-step:not([hidden]) .status')?.textContent,
      还需要: document.querySelector('.progress-need')?.textContent,
      读数: [...document.querySelectorAll('.p-step:not([hidden]) .readout div')].map((d) => d.innerText.replace(/\n/g, ' ')),
      页码: document.querySelector('#page-label')?.textContent,
    }))));
    if (s.shot) { const f = path.join(outDir, s.shot + '.png'); await page.screenshot({ path: f }); console.log('截图 →', f); }
  } catch (e) { console.log('步骤出错', JSON.stringify(s), e.message); }
}
if (errs.length) console.log('页面报错 →', errs.slice(0, 5).join(' | '));
await browser.close();
