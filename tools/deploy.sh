#!/bin/bash
# 构建并部署到 Cloudflare Pages（项目 livebook，经典 Pages）。
# 前提：npx wrangler login 已登录；public/books/ 下的书页贴图已由 npm run pages 生成。
# 域名：livebook.derekfuture.club（DNS 在阿里云，CNAME livebook → livebook-1ej.pages.dev）。
# ./tools/deploy.sh --preview：不上传，按同样的步骤构建，在本地 http://127.0.0.1:5195/ 打开（和线上一样：没有书页图片）
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
export NO_PROXY="localhost,127.0.0.1,::1" no_proxy="localhost,127.0.0.1,::1"
# 离线版（U 盘上双击打开的那个 HTML）：开关在 src/features.js。开着就先做离线版，放到 public/offline.html（网站上“下载离线版”用）；关着线上不放
cd "$ROOT"
OFFLINE=$(node --input-type=module -e "const { FEATURES } = await import('./src/features.js'); process.stdout.write(FEATURES.offline ? '1' : '0')")
rm -rf dist
if [ "$OFFLINE" = 1 ]; then node tools/build_offline.mjs; fi
npm run build
if [ "$OFFLINE" != 1 ]; then rm -f dist/offline.html; fi          # public/ 里可能留着本地做的那份
# 线上不放课本书页，只留封面；用户自己导入课本 PDF（见 src/book/PageSource.js）
"$ROOT/tools/strip_pages.sh" "$ROOT/dist"
if [ "${1:-}" = "--preview" ]; then exec npx vite preview --host 127.0.0.1 --port 5195 --strictPort; fi
# 在别的目录里跑 wrangler：在项目目录里它会把 Vite 项目当成 Workers 来“自动配置”，改 package.json 和 vite.config.js
cd /tmp && npx --yes wrangler@latest pages deploy "$ROOT/dist" --project-name livebook --branch main --commit-dirty=true
