// pdf.js 渲染课本要用的字库映射、标准字体、解码器（wasm）、色彩配置：从 node_modules 拷到 public/pdfjs/（npm run dev / build 之前自动跑）
import { cpSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
const root = fileURLToPath(new URL('..', import.meta.url));
mkdirSync(root + 'public/pdfjs', { recursive: true });
for (const d of ['cmaps', 'standard_fonts', 'wasm', 'iccs']) cpSync(`${root}node_modules/pdfjs-dist/${d}`, `${root}public/pdfjs/${d}`, { recursive: true });
console.log('pdf.js 资源已拷到 public/pdfjs/');
