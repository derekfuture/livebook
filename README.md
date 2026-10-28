# 活页课本 · Livebook

让课本活起来：在书页上，亲手探索课本里的知识。

课本平放在桌上，可以点、拖着翻页；翻到有互动内容的那一页，点一下插图，它就在书页上“站”起来，等你动手去试、去改、去发现。

## 现在有什么

第一版是人教版初中物理：

- 3 册：八年级上册、八年级下册、九年级全一册
- 65 个可以动手的实验，覆盖 20 章和八上的绪言，从声、光、热到力、电、磁
- 每个实验是一次完整的探究：可以先猜一猜 → 动手做、自己读数 → 从自己的数据里得出规律 → 掀开课本上的结论对照，盖一个章

之后会扩展到更多教材、年级和学科。

## 运行

`pdf/` 里附带了三本教材的 PDF 和章节目录，克隆下来就能跑：

```bash
npm install
pip3 install pymupdf
npm run pages      # 把 pdf/ 里的教材渲染成书页贴图，写到 public/books/<书>/{hi,lo}/（约 20 秒）
npm run dev        # http://127.0.0.1:5188
```

想用别的目录里的 PDF，设环境变量 `LIVEBOOK_PDF_DIR` 指向它。部署：`./tools/deploy.sh`（Cloudflare Pages）。

深链接：`?book=wuli-8x` 打开某本书，`#p=23` 翻到 PDF 第 23 页，`#live=lever` 直接打开某个实验。
键盘：← → 翻页，T 目录，Esc 合上实验。

## 目录结构

```
tools/render_pages.py     PDF → public/books/<书>/{hi,lo}/NNN.jpg + book.json（页数、章节 → 页码）
tools/find_bbox.py        根据图注框出插图的位置；手工修正写在 tools/bbox-overrides.json
tools/gen_content.py      PLAN.md + bbox-overrides.json → src/content/books.json（每本书“会动的图”在哪一页、哪个位置）
src/book/                 3D 书：纸张弯曲翻页、纸堆厚度、贴图分级加载、发光热点
src/home/                 书桌：选书、继续上次、实验总览
src/live/                 把图从书页上揭下来、弹出立体实验；课本插图画风（描边 + 分层上色）
src/lessons/<id>.js       每个实验一个文件：预测题、结论、场景、物理、面板控件
src/lessons/kit/          实验共用的器材和交互：电路、光具座、测力计、磁体、拖拽、读数卡……
src/ui/                   实验面板（预测 / 实验 / 结论、掀纸片、盖章）、3D 标签
PLAN.md                   全部计划中的实验清单和完成状态
QUALITY.md                一个实验算“做好了”的标准
```

## 再加一个实验

1. 在 `PLAN.md` 的表格里加一行（id、节、图号、PDF 页），运行 `python3 tools/find_bbox.py` 找插图位置，必要时在 `tools/bbox-overrides.json` 里手工修正，再运行 `python3 tools/gen_content.py`。
2. 在 `src/lessons/` 新建 `<id>.js`，导出：
   - `predict`（题目、选项、答案）、`need`（解锁结论的条件）、`conclusion`（课本结论、公式、解释、出处页码）；
   - `create(ctx)`，返回 `{ group, size, view, mount(ui), update(dt), pointer }`。用 `ctx.ink` 里的 `paint / inked / hull / arrow / polyline` 画，风格就和其他实验一致；器材和交互尽量用 `src/lessons/kit/` 里现成的。
3. 对照 `QUALITY.md` 自查：数据要学生自己读、规律要从学生自己的数据里得出。

## 版权

- 代码以 MIT 许可证开源，见 [LICENSE](LICENSE)。
- 教材内容（`pdf/` 里的课本、书页、插图、文字）版权归人民教育出版社所有，不在 MIT 许可范围内，仅供学习研究使用。实验的结论部分引用了课本原文，并注明了页码出处。如有侵权，请联系删除。
