// 书架：三本书的“会动的图”清单由 tools/gen_content.py 从 PLAN.md 生成；实验代码在 src/lessons/<id>.js，按需加载。
import books from './books.json';

const modules = import.meta.glob('../lessons/*.js');

export const BOOK_IDS = Object.keys(books);

export function getBook(id) {
  const b = books[id] || books['wuli-8x'];
  const lessons = {};
  for (const [lid, meta] of Object.entries(b.lessons)) {
    const load = modules[`../lessons/${lid}.js`];
    if (load) lessons[lid] = { ...meta, load };          // 还没写的实验先不挂出来
  }
  return { ...b, lessons, spots: b.spots.filter((s) => lessons[s.lesson]), planned: Object.keys(b.lessons).length };
}

export function bookList() {
  return BOOK_IDS.map((id) => ({ id, title: books[id].title }));
}
