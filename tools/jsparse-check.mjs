// 构建出来的 JS 里有没有 iOS 15 / Chrome 87 不认的语法（兼容基线，见 vite.config.js）
//   node tools/jsparse-check.mjs <dist/assets 目录>
// 查：class 里的 static {} 块、正则的 v 标志、正则的后行断言 (?<= / (?<!、私有字段 in（#x in obj）。
import { requireTool } from './qa-deps.mjs';
import fs from 'fs';
import path from 'path';
const acorn = requireTool('acorn'), walk = requireTool('acorn-walk');
const dir = process.argv[2];
if (!dir) { console.error('用法：node jsparse-check.mjs <目录>'); process.exit(2); }
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));
const bad = [];
for (const f of files) {
  const src = fs.readFileSync(path.join(dir, f), 'utf8');
  let ast;
  try { ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module' }); }
  catch (e) { bad.push(`${f}: 解析失败 ${e.message}`); continue; }
  walk.full(ast, (n) => {
    if (n.type === 'StaticBlock') bad.push(`${f}: class static {} 块 @${n.start}`);
    if (n.type === 'Literal' && n.regex) {
      if (n.regex.flags.includes('v')) bad.push(`${f}: 正则 v 标志 /${n.regex.pattern.slice(0, 40)}/`);
      if (/\(\?<[=!]/.test(n.regex.pattern)) bad.push(`${f}: 正则后行断言 /${n.regex.pattern.slice(0, 40)}/`);
    }
    if (n.type === 'BinaryExpression' && n.operator === 'in' && n.left.type === 'PrivateIdentifier') bad.push(`${f}: #私有字段 in @${n.start}`);
  });
}
console.log(`查了 ${files.length} 个文件`);
if (bad.length) { console.log(bad.slice(0, 30).join('\n')); console.log(`共 ${bad.length} 处 iOS 15 / Chrome 87 不认的语法`); process.exit(1); }
console.log('都没有 iOS 15 / Chrome 87 不认的语法');
