// 在沙箱外开一个常驻的浏览器服务，reviewer（例如 Codex）通过 tools/browse.mjs 连上来操作。
// 用法：node tools/browser-server.mjs   （会一直运行；地址写在 tools/.browser-ws）
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire('/tmp/lbshot/package.json');
const { chromium } = require('playwright-core');
const exe = process.env.HOME + '/Library/Caches/ms-playwright/chromium-1248/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const server = await chromium.launchServer({ executablePath: exe, port: 5199, host: '127.0.0.1', wsPath: 'livebook', args: ['--use-angle=metal', '--autoplay-policy=no-user-gesture-required'] });
fs.writeFileSync(new URL('./.browser-ws', import.meta.url), server.wsEndpoint());
console.log('浏览器服务：', server.wsEndpoint());
