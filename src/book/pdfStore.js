// 用户导入的课本 PDF：存在这台电脑的浏览器里（IndexedDB），不上传。另外缓存渲染好的低清页，下次打开不用再渲染。
const DB = 'livebook-pdf', VER = 1;

function open() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, VER);
    r.onupgradeneeded = () => { const db = r.result; if (!db.objectStoreNames.contains('pdf')) db.createObjectStore('pdf'); if (!db.objectStoreNames.contains('lo')) db.createObjectStore('lo'); };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function tx(store, mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode), s = t.objectStore(store);
    const req = fn(s);
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

/** 导入的 PDF：{ blob, name, size, pages, at } */
export const getPdf = (bookId) => tx('pdf', 'readonly', (s) => s.get(bookId)).catch(() => null);
export async function putPdf(bookId, rec) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(['pdf', 'lo'], 'readwrite');
    t.objectStore('pdf').put(rec, bookId);
    t.objectStore('lo').delete(IDBKeyRange.bound(`${bookId}/`, `${bookId}/￿`));
    t.oncomplete = () => { db.close(); resolve(); };
    t.onerror = t.onabort = () => { db.close(); reject(t.error); };
  });
}
export async function removePdf(bookId) {
  await tx('pdf', 'readwrite', (s) => s.delete(bookId));
  await tx('lo', 'readwrite', (s) => s.delete(IDBKeyRange.bound(`${bookId}/`, `${bookId}/￿`)));
}
/** 缓存的低清页：JPEG Blob */
export const getLo = (bookId, i) => tx('lo', 'readonly', (s) => s.get(`${bookId}/${i}`)).catch(() => null);
export const putLo = (bookId, i, blob) => tx('lo', 'readwrite', (s) => s.put(blob, `${bookId}/${i}`)).catch(() => {});
/** 这台电脑上导入过的所有课本：[[bookId, { blob, name, size, pages, at }], …]（下载离线版时一起打包） */
export async function allPdfs() {
  try {
    const db = await open();
    return await new Promise((resolve) => {
      const out = [], t = db.transaction('pdf', 'readonly');
      t.objectStore('pdf').openCursor().onsuccess = (e) => { const c = e.target.result; if (c) { out.push([c.key, c.value]); c.continue(); } };
      t.oncomplete = () => resolve(out);
      t.onerror = () => resolve([]);
    });
  } catch (e) { return []; }
}
