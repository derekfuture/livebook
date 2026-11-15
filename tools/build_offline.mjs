// 离线版：放 U 盘、拷到教室电脑上，双击 活页课本.html 就能用，不用联网，也不用开服务器。
// 双击打开的网页（file://）不能加载模块文件、不能从文件夹读数据，所以：vite build --mode offline 把代码打成一个文件，
// 书的目录、封面、pdf.js 的字库和解码器打包进代码（tools/offline_data.mjs），最后连同样式一起塞进一个 HTML。
// 用法：node tools/build_offline.mjs → dist-offline/活页课本.html，并拷一份到 public/offline.html（网站上“下载离线版”从这里取）
import { execSync } from 'child_process';
import fs from 'fs';
import zlib from 'zlib';
import { OFFLINE_README } from '../src/home/offlineReadme.js';

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

// 不带课本的压缩包也在这里做好，部署到 /offline.zip：网站上点“下载离线版”（没导入过课本时）就是浏览器直接下载它——
// 下载栏里有进度、失败了能在下载栏里重试、下载软件也接得住（反馈 2026-11-15：在网页里先拿 24 MB 再打包，哪一步出错都整个失败）。
// 大小变了的话，顺手改一下 src/home/offlinePack.js 里的 ZIP_MB（Cloudflare 回 HEAD 时不带大小，提示里用它）。
// 里面和网页里打的包一样：活页课本/活页课本.html + 活页课本/打开说明.txt；用 deflate 压缩（约为 HTML 的六成），文件名标 UTF-8
const zipped = zipFiles([
  { name: '活页课本/活页课本.html', data: Buffer.from(html, 'utf8') },
  { name: '活页课本/打开说明.txt', data: Buffer.from(OFFLINE_README, 'utf8') },
]);
fs.writeFileSync(`${dir}/活页课本.zip`, zipped);
fs.copyFileSync(`${dir}/活页课本.zip`, 'public/offline.zip');
if (zipped.length > 25 * 1024 * 1024) throw new Error(`离线版压缩包 ${(zipped.length / 1e6).toFixed(1)} MB，超过网站单个文件 25 MiB 的上限`);
console.log(`离线版压缩包 → ${dir}/活页课本.zip、public/offline.zip（${(zipped.length / 1e6).toFixed(1)} MB）`);

function zipFiles(files) {
  const d = new Date(), time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  const parts = [], dirs = [];
  let offset = 0;
  for (const f of files) {
    const name = Buffer.from(f.name, 'utf8'), crc = zlib.crc32(f.data), body = zlib.deflateRawSync(f.data, { level: 9 });
    const h = Buffer.alloc(30);          // 本地文件头：版本 2.0、UTF-8 文件名、deflate
    h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(8, 8); h.writeUInt16LE(time, 10); h.writeUInt16LE(date, 12);
    h.writeUInt32LE(crc, 14); h.writeUInt32LE(body.length, 18); h.writeUInt32LE(f.data.length, 22); h.writeUInt16LE(name.length, 26);
    parts.push(h, name, body);
    const c = Buffer.alloc(46);          // 目录项
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(8, 10); c.writeUInt16LE(time, 12); c.writeUInt16LE(date, 14);
    c.writeUInt32LE(crc, 16); c.writeUInt32LE(body.length, 20); c.writeUInt32LE(f.data.length, 24); c.writeUInt16LE(name.length, 28); c.writeUInt32LE(offset, 42);
    dirs.push(c, name);
    offset += 30 + name.length + body.length;
  }
  const dirSize = dirs.reduce((s, x) => s + x.length, 0), e = Buffer.alloc(22);          // 目录结尾
  e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(files.length, 8); e.writeUInt16LE(files.length, 10); e.writeUInt32LE(dirSize, 12); e.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, ...dirs, e]);
}
