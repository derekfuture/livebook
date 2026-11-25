// 离线版：放 U 盘、拷到教室电脑上，双击 活页课本.html 就能用，不用联网，也不用开服务器。
// 双击打开的网页（file://）不能加载模块文件、不能从文件夹读数据，所以：vite build --mode offline 把代码打成一个文件，
// 书的目录、封面、pdf.js 的字库和解码器打包进代码（tools/offline_data.mjs），最后连同样式一起塞进一个 HTML。
// 用法：node tools/build_offline.mjs → dist-offline/<科目>/活页课本.html 和 public/offline-<科目>.{html,zip}
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { visibleBooks, subjectOf } from './release-books.mjs';
import fs from 'fs';
import zlib from 'zlib';
import { OFFLINE_README } from '../src/home/offlineReadme.js';
import { OFFLINE_SUBJECTS, offlineFolder, offlinePath, offlineZipName } from '../src/home/offlineSubjects.js';

const run = promisify(execFile);
const deflate = promisify(zlib.deflateRaw);
const MiB = 1024 * 1024;
const format = (bytes) => `${(bytes / MiB).toFixed(2)} MiB`;

async function buildSubject(subject) {
  const ids = visibleBooks.filter(book => subjectOf(book) === subject.label).map(book => book.id);
  const dir = `dist-offline/${subject.slug}`;
  if (!ids.length) {
    for (const ext of ['html', 'zip']) fs.rmSync(`public${offlinePath(subject, ext)}`, { force: true });
    fs.rmSync(dir, { recursive: true, force: true });
    return;
  }
  await run(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--configLoader', 'native', '--mode', 'offline', '--outDir', dir, '--logLevel', 'warn'], {
    env: { ...process.env, NODE_OPTIONS: '', LB_OFFLINE_BOOKS: ids.join(',') },
  });
  const html = Buffer.from(inlineHtml(dir), 'utf8');
  checkSize(subject, 'HTML', html.length);
  const folder = offlineFolder(subject);
  const zip = await zipFiles([
    { name: `${folder}/活页课本.html`, data: html },
    { name: `${folder}/打开说明.txt`, data: Buffer.from(OFFLINE_README, 'utf8') },
  ]);
  checkSize(subject, 'ZIP', zip.length);
  fs.rmSync(`${dir}/assets`, { recursive: true, force: true });
  fs.rmSync(`${dir}/index.html`);
  fs.writeFileSync(`${dir}/活页课本.html`, html);
  fs.writeFileSync(`${dir}/${offlineZipName(subject)}`, zip);
  console.log(`${subject.label}离线版（${ids.length} 册）：HTML ${format(html.length)}，ZIP ${format(zip.length)}`);
  fs.copyFileSync(`${dir}/活页课本.html`, `public${offlinePath(subject, 'html')}`);
  fs.copyFileSync(`${dir}/${offlineZipName(subject)}`, `public${offlinePath(subject, 'zip')}`);
}
// 等四科都收尾再退出，失败后重试时不会撞上上一轮的写入。
const results = await Promise.allSettled(OFFLINE_SUBJECTS.map(buildSubject));
const errors = results.filter(r => r.status === 'rejected').map(r => r.reason);
if (errors.length) throw new AggregateError(errors, '离线版构建失败');
for (const extension of ['html', 'zip']) fs.rmSync(`public/offline.${extension}`, { force: true });

function inlineHtml(dir) {
  let html = fs.readFileSync(`${dir}/index.html`, 'utf8');
  const js = [], css = [];
  html = html.replace(/<script type="module" crossorigin src="\.\/(assets\/[^"]+\.js)"><\/script>/g, (_, f) => { js.push(f); return ''; });
  html = html.replace(/<link rel="stylesheet" crossorigin href="\.\/(assets\/[^"]+\.css)">/g, (_, f) => { css.push(f); return ''; });
  if (js.length !== 1) throw new Error(`应该正好一个 JS 文件，实际 ${js.length} 个`);
  const code = fs.readFileSync(`${dir}/${js[0]}`, 'utf8').replace(/<\/(script)/gi, '<\\/$1');          // 代码里的 </script> 不能提前结束标签
  html = html.replace('</head>', () => `${css.map((f) => `<style>${fs.readFileSync(`${dir}/${f}`, 'utf8')}</style>`).join('')}\n</head>`);
  return html.replace('</body>', () => `<script type="module">${code}</script>\n</body>`);
}

function checkSize(subject, type, bytes) {
  if (bytes > 25 * MiB) throw new Error(`${subject.label}离线版 ${type}（${format(bytes)}）超过网站单个文件 25 MiB 的上限`);
}

async function zipFiles(files) {
  const d = new Date(), time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  const parts = [], dirs = [];
  let offset = 0;
  for (const f of files) {
    const name = Buffer.from(f.name, 'utf8'), crc = zlib.crc32(f.data), body = await deflate(f.data, { level: 9 });
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
