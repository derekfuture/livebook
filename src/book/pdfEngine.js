// pdf.js 和它的 worker（合起来约 1.8 MB）：只有导入过课本 PDF（或离线包里带了课本）的人才用得上，
// 所以单独放一个包，PageSource 用到时才 import()；网站首屏不下载它。离线版是单文件，照样打在一起。
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import WorkerConstructor from './pdf.worker.js?worker&inline';

// A bundled worker avoids a separate worker download and works in offline packages.
let port = null;
/** 配好 worker 的 pdf.js（worker 只起一个，几本书共用） */
export function engine() {
  pdfjs.GlobalWorkerOptions.workerPort = (port ||= new WorkerConstructor());
  return pdfjs;
}
