import { createRequire } from 'module';
import { readdirSync } from 'fs';
const { chromium } = createRequire(`${process.env.HOME}/.cache/livebook-tools/package.json`)('playwright-core');
const exe = process.env.HOME + '/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const b = await chromium.launch({ executablePath: exe, headless: true, args: ['--allow-file-access-from-files'] });
for (const f of readdirSync('/tmp/pv_poster').filter((x) => x.endsWith('.html')).sort()) {
  const p = await b.newPage({ viewport: { width: 900, height: 1000 }, deviceScaleFactor: 2 });
  await p.goto('file:///tmp/pv_poster/' + f); await p.waitForTimeout(800);
  await p.screenshot({ path: '/tmp/pv_poster/' + f.replace('.html', '.png'), fullPage: true });
  const h = await p.evaluate(() => document.body.scrollHeight); console.log(f, h);
  await p.close();
}
await b.close();
