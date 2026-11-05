// 离线版（放 U 盘、双击打开）要用的数据，打包进 HTML：书的目录（book.json）、封面、作者小签的图、pdf.js 的字库和解码器。
// 双击打开的网页不能从文件夹里读这些文件（浏览器的安全限制），所以都转成 base64 放进代码。网站上这个模块是 null（照常从网址取）。
import fs from 'fs';

const ID = 'virtual:offline', RID = '\0' + ID;
const b64 = (f) => fs.readFileSync(f).toString('base64');
const MIME = { jpg: 'image/jpeg', png: 'image/png' };

export function offlineData(on) {
  return {
    name: 'livebook-offline',
    resolveId: (id) => (id === ID ? RID : null),
    load(id) {
      if (id !== RID) return null;
      if (!on) return 'export default null;';
      const books = {}, files = {}, pdfjs = { cMapUrl: {}, standardFontDataUrl: {}, wasmUrl: {} };
      for (const [bid, b] of Object.entries(JSON.parse(fs.readFileSync('src/content/books.json', 'utf8')))) {
        const dir = `public${b.base}`;          // public/books/<id>/
        books[bid] = JSON.parse(fs.readFileSync(`${dir}book.json`, 'utf8'));
        for (const k of ['hi', 'lo']) files[`${b.base}${k}/000.jpg`] = `data:image/jpeg;base64,${b64(`${dir}${k}/000.jpg`)}`;          // 只要封面
      }
      for (const f of fs.readdirSync('public/brand')) files[`/brand/${f}`] = `data:${MIME[f.split('.').pop()]};base64,${b64(`public/brand/${f}`)}`;
      const P = 'node_modules/pdfjs-dist';
      for (const f of fs.readdirSync(`${P}/cmaps`)) if (f.endsWith('.bcmap')) pdfjs.cMapUrl[f] = b64(`${P}/cmaps/${f}`);
      for (const f of fs.readdirSync(`${P}/standard_fonts`)) if (/\.(pfb|ttf|otf)$/.test(f)) pdfjs.standardFontDataUrl[f] = b64(`${P}/standard_fonts/${f}`);
      for (const f of ['jbig2.wasm', 'openjpeg.wasm']) pdfjs.wasmUrl[f] = b64(`${P}/wasm/${f}`);          // 课本里的黑白图（JBIG2）、JPEG 2000 图
      return `export default ${JSON.stringify({ books, files, pdfjs })};`;
    },
  };
}
