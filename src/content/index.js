// 书架：三本书的“会动的图”清单由 tools/gen_content.py 从 PLAN.md 生成；实验代码在 src/lessons/<id>.js，按需加载。
import books from './books.json';
import OFF from 'virtual:offline';

const modules = import.meta.glob('../lessons/*.js');

export const BOOK_IDS = Object.keys(books);

// 离线版（U 盘上双击打开）：书的目录、封面这些都打包在 HTML 里（tools/offline_data.mjs）；网站上 OFF 是 null，照常从网址取
export const OFFLINE = !!OFF;
export const OFFLINE_DATA = OFF;
/** 书的目录、页数（public/books/<id>/book.json） */
export const getManifest = async (id) => (OFF ? OFF.books[id] : (await fetch(`${books[id].base}book.json`)).json());
/** 网站上的文件地址（封面、作者小签的图）；离线版换成打包好的那份 */
export const fileUrl = (p) => OFF?.files[p] ?? p;

// 显示用的书名，前面带版本：“人教版 物理 八年级下册”（以后有别的版本也分得清）
const fullTitle = (b) => `${b.publisher || '人教版'} ${b.title}`;

export function getBook(id) {
  const b = books[id] || books['wuli-8x'];
  const lessons = {};
  for (const [lid, meta] of Object.entries(b.lessons)) {
    const load = modules[`../lessons/${lid}.js`];
    if (load) lessons[lid] = { ...meta, load };          // 还没写的实验先不挂出来
  }
  return { ...b, full: fullTitle(b), lessons, spots: b.spots.filter((s) => lessons[s.lesson]), planned: Object.keys(b.lessons).length };
}

// 科目：书名“物理 八年级上册”的前半截。颜色取自课本封面（物理偏青蓝、化学偏紫、地理偏青绿），首页的分隔标签、书的侧边用它
export const SUBJECTS = {
  物理: { color: '#2f7bb5', side: 0x3f7cb0 },
  化学: { color: '#6a58b0', side: 0x5d58a6 },
  地理: { color: '#2f8f7a', side: 0x3f8c78 },
};
const OTHER = { color: '#7a6a4a', side: 0x8a7a5a };
export const subjectOf = (title) => title.split(' ')[0];

export function bookList() {
  return BOOK_IDS.map((id) => {
    const t = books[id].title, [subject, ...rest] = t.split(' ');
    return { id, title: t, full: fullTitle(books[id]), subject, vol: rest.join(' ') || t, publisher: books[id].publisher || '人教版', ...(SUBJECTS[subject] || OTHER) };
  });
}
