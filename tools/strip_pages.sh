#!/bin/bash
# 线上不放课本书页：构建后从 dist 里删掉书页图片，只留封面（000.jpg）。
# 用户自己导入课本 PDF 后在浏览器里渲染；没导入时显示我们自己画的占位页（src/book/PageSource.js）。
set -euo pipefail
DIST=${1:-dist}
# 书图目录里可能混有 PNG 内页；每种清晰度都只发布 000.jpg。
find "$DIST/books" -type f \( -path '*/hi/*' -o -path '*/lo/*' -o -path '*/mid/*' \) ! -name '000.jpg' -delete
# public/ 里别的地方留着的课本书页（比如早期样稿用的 public/mock/）也不能上线：只有 books/ 下的封面可以
rm -rf "$DIST/mock"
echo "书页图片已从 $DIST 删除，只留封面：$(find "$DIST/books" -name '*.jpg' | wc -l | tr -d ' ') 张"
