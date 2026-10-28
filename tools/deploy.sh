#!/bin/bash
# 构建并部署到 Cloudflare Pages（项目 livebook，经典 Pages）。
# 前提：npx wrangler login 已登录；public/books/ 下的书页贴图已由 npm run pages 生成。
# 域名：livebook.derekfuture.club（DNS 在阿里云，CNAME livebook → livebook-1ej.pages.dev）。
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
export NO_PROXY="localhost,127.0.0.1,::1" no_proxy="localhost,127.0.0.1,::1"
cd "$ROOT" && rm -rf dist && npm run build
# 在别的目录里跑 wrangler：在项目目录里它会把 Vite 项目当成 Workers 来“自动配置”，改 package.json 和 vite.config.js
cd /tmp && npx --yes wrangler@latest pages deploy "$ROOT/dist" --project-name livebook --branch main --commit-dirty=true
