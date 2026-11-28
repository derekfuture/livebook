// 网站构建只读取书目与封面。书图目录可能是指向其他 worktree 的链接。
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { coverSizes, checkCovers } from './release-books.mjs';

export function websitePublic(builtAt) {
  let config;
  return {
    name: 'livebook-website-public',
    apply: 'build',
    configResolved(resolved) { config = resolved; },
    writeBundle({ dir }) {
      const pub = config.publicDir;
      for (const name of fs.readdirSync(pub)) {
        if (name === 'mock' || name === 'books') continue;
        fs.cpSync(path.join(pub, name), path.join(dir, name), { recursive: true, dereference: true });
      }
      for (const id of fs.readdirSync(path.join(pub, 'books'))) {
        for (const rel of ['book.json', ...coverSizes.map(size => size + '/000.jpg')]) {
          const src = path.join(pub, 'books', id, rel);
          if (!fs.existsSync(src)) continue;
          const dest = path.join(dir, 'books', id, rel);
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.copyFileSync(src, dest);
        }
      }
      // 各学科工作目录不一定有别科的封面，自测打包不能因此失败；发布时 tools/deploy.sh 会在打包前后各查一次，缺了就停。
      try { checkCovers(dir); } catch (e) { console.warn(`提醒（只影响发布）：${e.message}`); }
      const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: config.root, encoding: 'utf8' }).trim();
      fs.writeFileSync(path.join(dir, 'release.json'), JSON.stringify({ commit, builtAt }) + '\n');
    },
  };
}
