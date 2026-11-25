#!/bin/bash
# tools/deploy.sh [--since <提交>]  检查、快进推送 main、部署并验站。首次发布可指定基线。
# tools/deploy.sh --dry-run [--since <提交>]  同样构建和测试，到推送前结束。
# tools/deploy.sh --preview  仅构建发布版，在空闲端口持续预览，可在有本地修改时使用。
set -euo pipefail
export NODE_OPTIONS=
export NO_PROXY="localhost,127.0.0.1,::1" no_proxy="localhost,127.0.0.1,::1"
cd "$(dirname "$0")/.."
root=$(pwd -P)
site=https://livebook.derekfuture.club/
mode=release
since=''
die() { echo "$*" >&2; exit 1; }
while (($#)); do
  case $1 in
    --dry-run|--preview) [[ $mode == release ]] || die '只可选择一种模式'; mode=${1#--} ;;
    --since) [[ $# -ge 2 && $2 != -* && -n $2 ]] || die '--since 后需提供提交'; since=$2; shift ;;
    *) die "未知参数：$1" ;;
  esac
  shift
done
[[ $mode != preview || -z $since ]] || die '--preview 不使用发布基线'

tmp=$(mktemp -d)
pid=''
stop_preview() {
  if [[ -n $pid ]]; then kill "$pid" 2>/dev/null || true; wait "$pid" 2>/dev/null || true; pid=''; fi
}
cleanup() {
  stop_preview
  rm -rf "$tmp"
  echo "总用时 ${SECONDS} 秒"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
step() {
  local TIMEFORMAT="$1 · %3R 秒"
  echo "== $1"
  shift
  time "$@"
}
clean() {
  [[ -z $(git status --porcelain) ]] || die '工作区有待处理的修改，停止。'
}
sync_main() {
  git fetch origin
  initial_main=$(git rev-parse origin/main)
  git merge --no-edit "$initial_main"
  rev=$(git rev-parse HEAD)
}
# 在 /tmp 运行 wrangler，在项目内它可能把 Vite 当成 Workers 并改写配置。
wrangler() { (cd /tmp && npx --yes wrangler@4.168.0 "$@"); }
auth() {
  wrangler whoami --json > /dev/null || die '无法确认 Cloudflare 已登录，停止。'
}
plan_lessons() {
  local code published base
  code=$(curl -sSL --retry 2 --max-time 20 -o "$tmp/metadata" -w '%{http_code}' "${site}release.json?r=$RANDOM$RANDOM")
  case $code in
    404|410) published='' ;;
    200)
      published=$(python3 - "$tmp/metadata" <<'PY'
import json, re, sys
from pathlib import Path
body = Path(sys.argv[1]).read_text()
# Pages 没有这个文件时，SPA 回退会返回本站首页（HTTP 200）。
if not ('<title>活页课本</title>' in body and re.search(r'<script [^>]*src="/assets/[^"]+\.js"', body) and body.lstrip().lower().startswith('<!doctype html')):
    commit = json.loads(body)['commit']
    if not re.fullmatch(r'[0-9a-f]{40}', commit):
        sys.exit('线上 release.json 中的提交号无效')
    print(commit)
PY
      ) ;;
    *) die "读取线上 release.json 失败（HTTP $code）" ;;
  esac
  if [[ -n $published ]]; then
    base=$published; echo "使用线上 release.json：$base"
  else
    base=${since:-origin/main}; echo "线上尚无 release.json，与 $base 比较。"
  fi
  base=$(git rev-parse --verify --end-of-options "${base}^{commit}") || die '找不到基线提交'
  node tools/changed-lessons.mjs "$base" > "$tmp/changed"
  changed=()
  while IFS= read -r id; do changed+=("$id"); done < "$tmp/changed"
  echo "改动课：${changed[*]:-无}"
}
covers() {
  node --input-type=module -e "import {checkCovers} from './tools/release-books.mjs'; checkCovers(process.argv[1])" "$1"
}
offline_list() {
  node --input-type=module - <<'JS'
import { FEATURES } from './src/features.js';
import { visibleBooks, subjectOf } from './tools/release-books.mjs';
import { OFFLINE_SUBJECTS } from './src/home/offlineSubjects.js';
if (FEATURES.offline) for (const s of OFFLINE_SUBJECTS) {
  if (visibleBooks.some(b => subjectOf(b) === s.label)) console.log(s.slug);
}
JS
}
strip() {
  rm -f dist/offline.html dist/offline.zip
  if [[ ! -s $tmp/subjects ]]; then rm -f dist/offline-*.{html,zip}; fi
  tools/strip_pages.sh dist
  local page
  page=$(find dist/books \( -type l -o \( -type f \( -path '*/hi/*' -o -path '*/mid/*' -o -path '*/lo/*' \) ! -name '000.jpg' \) \) -print -quit)
  [[ -z $page && ! -e dist/mock ]] || die "dist 中有内页或未剥离的目录：$page"
}
check_zip() {
  while read -r subject; do
    [[ -s dist/offline-$subject.html ]] || die "$subject 离线 HTML 缺失"
    unzip -tq "dist/offline-$subject.zip"
  done < "$tmp/subjects"
}
start_preview() {
  port=$(python3 - <<'PY'
import socket
while True:
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        port = s.getsockname()[1]
    if port not in (5188, 5189, 5215, 5217, 5221):
        print(port)
        break
PY
  )
  preview="http://127.0.0.1:$port/"
  node node_modules/vite/bin/vite.js preview --configLoader native --host 127.0.0.1 --port "$port" --strictPort > "$tmp/preview" 2>&1 &
  pid=$!
  for ((i=0;i<75;i++)); do
    kill -0 "$pid" 2>/dev/null || { cat "$tmp/preview"; die '预览进程已退出'; }
    if curl -fsS --max-time 2 "$preview" -o "$tmp/home" 2>/dev/null && cmp -s "$tmp/home" dist/index.html; then echo "$preview"; return; fi
    sleep 0.2
  done
  die '预览首页与本次构建不同'
}
check_main() {
  clean
  git fetch origin
  [[ $(git rev-parse origin/main) == "$initial_main" ]] || die '测试期间 origin/main 已改变，停止。请检查新提交后重新发布。'
  [[ $(git rev-parse HEAD) == "$rev" ]] || die '测试期间 HEAD 已改变，停止。'
  git merge-base --is-ancestor "$initial_main" HEAD || die '无法快进 main'
}
push_main() {
  git push origin HEAD:main
  [[ $(git ls-remote --exit-code origin refs/heads/main | cut -f1) == "$rev" ]] || die '远端 main 与本次提交不符'
}
# 发布后把主目录（仓库的第一个工作目录）快进到刚发布的 main，免得它落后。
# 主目录不在 main 上、或有未提交的改动挡着时只提示，不动它；这一步不影响发布结果。
sync_home() {
  local home
  home=$(git worktree list --porcelain | awk '/^worktree /{print substr($0, 10); exit}')
  [[ -n $home && $home != "$root" ]] || return 0
  if [[ $(git -C "$home" branch --show-current) != main ]]; then echo "主目录不在 main 上，没有同步：$home"; return 0; fi
  if git -C "$home" merge --ff-only --quiet origin/main 2>/dev/null; then echo "主目录已同步到 $(git -C "$home" rev-parse --short HEAD)"
  else echo "主目录没能自动同步（可能有未提交的改动），请在 $home 运行 git pull --ff-only"; fi
  return 0
}
wait_online() {
  local entry deadline remaining delay
  entry=$(python3 -c 'import re; print(re.search(r"<script\b[^>]*type=\"module\"[^>]*src=\"([^\"]+)\"", open("dist/index.html").read())[1])')
  deadline=$((SECONDS + 300))
  while ((SECONDS < deadline)); do
    remaining=$((deadline - SECONDS))
    ((remaining <= 12)) || remaining=12
    if curl -fsSL --max-time "$remaining" "${site}?r=$RANDOM$RANDOM" -o "$tmp/live" &&
      grep -E '<script [^>]*type="module"' "$tmp/live" | grep -Fq "src=\"$entry\""; then return; fi
    delay=$((deadline - SECONDS))
    ((delay > 0)) || break
    ((delay <= 5)) || delay=5
    sleep "$delay"
  done
  die "5 分钟内线上首页未引用本次入口 $entry"
}

if [[ $mode != preview ]]; then
  step 工作区检查 clean
  step 同步主线 sync_main
  step 计算改动课 plan_lessons
fi
step 源封面检查 covers public
offline_list > "$tmp/subjects"
if [[ -s $tmp/subjects ]]; then step 并行离线包 node tools/build_offline.mjs; fi
step 网站打包 npm run build
step 剥离与内页检查 strip
step 成品封面检查 covers dist
if [[ $mode == preview ]]; then
  step 启动预览 start_preview
  wait "$pid"
  exit
fi
step 语法兼容检查 node tools/jsparse-check.mjs dist/assets
step 离线ZIP完整性 check_zip
step 启动预览 start_preview
step 本地验站 node tools/verify-site.mjs "$preview" ${changed[@]+"${changed[@]}"}
if [[ -s $tmp/changed ]]; then step 改动课流程 env LB_PORT="$port" node tools/qa.mjs "${changed[@]}" --flow --par=3; fi
step 全部上线课冒烟 env LB_URL="$preview" node tools/smoke.mjs --published --par=6
stop_preview
step Cloudflare登录 auth
step 复核主线 check_main
if [[ $mode == dry-run ]]; then echo 'dry-run 通过'; exit 0; fi
step 推送并确认远端 push_main
step 部署 wrangler pages deploy "$root/dist" --project-name livebook --branch main --commit-hash "$rev" --commit-dirty=false
step 等待线上入口 wait_online
step 线上验站 node tools/verify-site.mjs "$site" ${changed[@]+"${changed[@]}"}
step 同步主目录 sync_home
