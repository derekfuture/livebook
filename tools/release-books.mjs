// 发布渠道与首页使用同一份书目。尚未实现的活页只在 books.json 里占位。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FEATURES } from '../src/features.js';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const books = Object.values(JSON.parse(fs.readFileSync(path.join(root, 'src/content/books.json'))));
export const visibleBooks = books.filter(b => !b.draft && !FEATURES.hiddenBooks?.includes(b.id));
export const subjectOf = book => book.title.split(' ')[0];
export const hiddenLessons = new Set(FEATURES.hiddenLessons ?? []);          // 没上线的单张活页：发布的测试和验站都跳过
export const lessonsOf = book => Object.keys(book.lessons).filter(id => !hiddenLessons.has(id) && fs.existsSync(path.join(root, 'src/lessons', id + '.js')));
export const coverSizes = ['hi', 'lo', 'mid'];

export function checkCovers(dir) {
  const missing = [];
  for (const book of visibleBooks) {
    const sizes = coverSizes.filter(size => {
      const stat = fs.statSync(path.join(dir, book.base, size, '000.jpg'), { throwIfNoEntry: false });
      return !stat?.isFile() || !stat.size;
    });
    if (sizes.length) missing.push(`${book.title} (${book.id}) · ${sizes.join('/')}`);
  }
  if (missing.length) throw new Error(`${dir} 缺少封面：\n${missing.join('\n')}`);
}
