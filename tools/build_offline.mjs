// 离线版：放 U 盘、拷到教室电脑上，双击 活页课本.html 就能用，不用联网，也不用开服务器。
// 双击打开的网页（file://）不能加载模块文件、不能从文件夹读数据，所以：vite build --mode offline 把代码打成一个文件，
// 书的目录、封面、pdf.js 的字库和解码器打包进代码（tools/offline_data.mjs），最后连同样式一起塞进一个 HTML。
// 用法：node tools/build_offline.mjs → dist-offline/活页课本.html，并拷一份到 public/offline.html（网站上“下载离线版”从这里取）
import { execSync } from 'child_process';
import fs from 'fs';

execSync('npx vite build --mode offline --logLevel warn', { stdio: 'inherit', env: { ...process.env, NODE_OPTIONS: '' } });
const dir = 'dist-offline';
let html = fs.readFileSync(`${dir}/index.html`, 'utf8');
const js = [], css = [];
html = html.replace(/<script type="module" crossorigin src="\.\/(assets\/[^"]+\.js)"><\/script>/g, (_, f) => { js.push(f); return ''; });
html = html.replace(/<link rel="stylesheet" crossorigin href="\.\/(assets\/[^"]+\.css)">/g, (_, f) => { css.push(f); return ''; });
if (js.length !== 1) throw new Error(`应该正好一个 JS 文件，实际 ${js.length} 个`);
const code = fs.readFileSync(`${dir}/${js[0]}`, 'utf8').replace(/<\/(script)/gi, '<\\/$1');          // 代码里的 </script> 不能提前结束标签
html = html.replace('</head>', () => `${css.map((f) => `<style>${fs.readFileSync(`${dir}/${f}`, 'utf8')}</style>`).join('')}\n</head>`);
html = html.replace('</body>', () => `<script type="module">${code}</script>\n</body>`);
fs.rmSync(`${dir}/assets`, { recursive: true, force: true });
fs.rmSync(`${dir}/index.html`);
fs.writeFileSync(`${dir}/活页课本.html`, html);
fs.copyFileSync(`${dir}/活页课本.html`, 'public/offline.html');
console.log(`离线版 → ${dir}/活页课本.html（${(fs.statSync(`${dir}/活页课本.html`).size / 1e6).toFixed(1)} MB）`);
