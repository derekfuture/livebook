#!/bin/bash
# 线上不放课本书页：构建后从 dist 里删掉书页图片，只留封面（000.jpg）。
# 用户自己导入课本 PDF 后在浏览器里渲染；没导入时显示我们自己画的占位页（src/book/PageSource.js）。
set -euo pipefail
DIST=${1:-dist}
find "$DIST/books" -path '*/hi/*.jpg' ! -name '000.jpg' -delete
find "$DIST/books" -path '*/lo/*.jpg' ! -name '000.jpg' -delete
echo "书页图片已从 $DIST 删除，只留封面：$(find "$DIST/books" -name '*.jpg' | wc -l | tr -d ' ') 张"
