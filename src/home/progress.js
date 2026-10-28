// 学习进度：每本书的书签页（翻到哪了）、做过的实验、上一次打开的实验。都存在 localStorage。
import { getBook } from '../content/index.js';
import { stamps } from '../ui/Panel.js';

const KEY = (id) => `livebook.bookmark.${id}`;

export const bookmark = {
  get: (id) => Number(localStorage.getItem(KEY(id))) || null,
  set: (id, page) => localStorage.setItem(KEY(id), String(page)),
};

/** 记下“上次在做什么”，首页的“继续上次”用 */
export function rememberLast({ book, page, lesson, title, where }) {
  localStorage.setItem('livebook.last', JSON.stringify({ book, page, lesson, title, where, href: lesson ? `?book=${book}#live=${lesson}` : `?book=${book}#p=${page}` }));
}

/** 一本书的进度：学到第几章、实验做了几个 */
export function progress(id, manifest) {
  const c = getBook(id);
  const ids = Object.keys(c.lessons);
  const done = ids.filter((x) => stamps.has(x)).length;
  const page = bookmark.get(id);
  let where = '还没翻开';
  if (page != null) {
    const ch = [...manifest.chapters].reverse().find((x) => x.page != null && x.page <= page);
    where = ch ? `翻到${ch.title.split(' ')[0]}` : '翻到前言';
  }
  return { done, total: ids.length, where };
}
