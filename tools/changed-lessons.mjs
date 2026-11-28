// 顺着课文件的相对 import、re-export 和字面量 import() 找共用文件。
// 缓存每个文件的直接依赖，每次遍历单独记 visited，循环引用也能走全。
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { requireTool } from './qa-deps.mjs';
import { root, visibleBooks, lessonsOf } from './release-books.mjs';

const { parse } = requireTool('acorn');
const { simple } = requireTool('acorn-walk');
const imports = new Map();
function localImports(file) {
  if (imports.has(file)) return imports.get(file);
  const deps = [];
  if (file.endsWith('.js') && fs.existsSync(file)) {
    const code = fs.readFileSync(file, 'utf8');
    const tree = parse(code, { ecmaVersion: 'latest', sourceType: 'module' });
    const names = [];
    const add = node => names.push(node.source?.value);
    simple(tree, {
      ImportDeclaration: add, ExportAllDeclaration: add, ExportNamedDeclaration: add, ImportExpression: add,
    });
    for (const name of names) {
      if (!name?.startsWith('.')) continue;
      const absolute = path.resolve(path.dirname(file), name);
      deps.push(path.extname(absolute) ? absolute : absolute + '.js');
    }
  }
  imports.set(file, deps);
  return deps;
}

export function dependenciesOf(file) {
  const found = new Set();
  function visit(p) {
    if (found.has(p)) return;
    found.add(p);
    localImports(p).forEach(visit);
  }
  visit(file);
  return found;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const files = execFileSync('git', ['diff', '--no-renames', '--name-only', '-z', process.argv[2], 'HEAD', '--', 'src/lessons', 'src/live', 'src/ui'], { cwd: root, encoding: 'utf8' });
  const changed = new Set(files.split('\0').filter(Boolean).map(p => path.join(root, p)));
  for (const id of new Set(visibleBooks.flatMap(lessonsOf))) {
    if (changed.size && [...dependenciesOf(path.join(root, 'src/lessons', id + '.js'))].some(f => changed.has(f))) console.log(id);
  }
}
