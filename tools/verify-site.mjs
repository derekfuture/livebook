// NODE_OPTIONS= node tools/verify-site.mjs <本地或线上首页 URL> [改过的课 id…]
// dist/index.html 是本次构建的入口依据。未改动的学科各抽一课。
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { requireTool } from './qa-deps.mjs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { FEATURES } from '../src/features.js';
import { books, visibleBooks, lessonsOf, root, subjectOf } from './release-books.mjs';

const [base, ...changed] = process.argv.slice(2);
const url = new URL(base);
const { chromium } = requireTool('playwright-core');
const browser = await chromium.launch({
  executablePath: chromium.executablePath(), args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
  ...(url.protocol === 'https:' && process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY } } : {}),
});

try {
  const page = await browser.newPage();
  page.setDefaultTimeout(60000);
  const errors = [];
  page.on('pageerror', e => errors.push(page.url() + ' ' + e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(page.url() + ' ' + msg.text()); });
  const visit = async (book, lesson) => {
    const target = new URL(base);
    target.searchParams.set('release_check', randomUUID());
    if (book) target.searchParams.set('book', book.id);
    if (lesson) target.hash = 'live=' + lesson;
    await page.goto(target.href, { waitUntil: 'domcontentloaded' });
  };
  const ids = visibleBooks.map(b => b.id).sort();
  const subjects = [...new Set(visibleBooks.map(subjectOf))].sort();
  const hidden = books.filter(b => !ids.includes(b.id));
  if (hidden.length) await page.addInitScript(book => {
    localStorage.setItem('livebook.last', JSON.stringify({ book, title: '隐藏书签测试' }));
  }, hidden[0].id);
  const html = fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8');
  const entry = html.match(/<script\b[^>]*type="module"[^>]*src="([^"]+)"/)[1];
  for (const [width, height] of [[390, 844], [1440, 900], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    await visit();
    await page.waitForFunction(() => window.__home?.items.length && __home.items.every(g => g.userData.coverReady)
      && Number(getComputedStyle(document.querySelector('#loader')).opacity) === 0);
    const shelf = await page.evaluate(() => ({
      ids: __home.items.map(g => g.userData.id).sort(),
      subjects: [...new Set(__home.subjects.map(s => s.name))].sort(),
      overflow: document.documentElement.scrollWidth > innerWidth,
      entries: [...document.querySelectorAll('script[type=module][src]')].map(s => s.getAttribute('src')),
    }));
    assert.deepEqual(shelf, { ids, subjects, overflow: false, entries: [entry] }, `首页 ${width}×${height}`);
    assert.doesNotMatch(await page.locator('#home').innerText(), /隐藏书签测试/);
    console.log(`${width}×${height}：${subjects.join('、')}，${ids.length} 册封面就绪`);
  }

  const offline = page.locator('button.home-offline');
  if (FEATURES.offline) {
    await offline.click();
    assert.deepEqual((await page.locator('.offline-subject-name').allTextContents()).sort(), subjects);
    await offline.click();
  } else assert.equal(await offline.count(), 0);

  await page.locator('.home-overview').click();
  assert.deepEqual(await page.locator('.ov-tabs button').evaluateAll(es => es.map(e => e.dataset.id).sort()), ids);
  await page.locator('.ov-close').click();
  for (const book of hidden) {
    await page.locator('input[type=search]').fill(book.title);
    assert.ok(!(await page.locator('.search-item span').allTextContents()).includes(`${book.publisher || '人教版'} ${book.title}`), book.id);
  }
  // 每册都真正进入阅读器。需要验贴图的课随同该册一起打开。
  const sample = new Set(changed);
  for (const subject of subjects) {
    const lessons = visibleBooks.filter(b => subjectOf(b) === subject).flatMap(lessonsOf);
    assert.ok(lessons.length, subject + ' 没有可抽查的活页');
    if (!lessons.some(id => sample.has(id))) sample.add(lessons[0]);
  }
  for (const book of visibleBooks) {
    const lessons = lessonsOf(book).filter(id => sample.has(id));
    for (const lesson of lessons.length ? lessons : [null]) {
      await visit(book, lesson);
      await page.waitForFunction(id => window.__lb?.live.content.id === id, book.id);
      if (lesson) {
        await page.waitForFunction(id => window.__lb.live.active?.spot.lesson === id && __lb.live.active.inst && !__lb.live.opening, lesson);
        console.log(`${book.title} · ${lesson}`);
      }
      assert.equal(await page.evaluate(() => __lb.textures.source.kind), 'placeholder', book.id);
    }
  }
  for (const book of hidden) {
    await visit(book, lessonsOf(book)[0]);
    await page.waitForFunction(() => window.__home?.items.length && !window.__lb);
  }
  assert.deepEqual(errors, []);
  console.log(`${ids.length} 册可打开，${hidden.length} 册隐藏，${sample.size} 课占位页通过`);
} finally {
  await browser.close();
}
