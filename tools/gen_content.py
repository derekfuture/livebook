#!/usr/bin/env python3
"""PLAN.md + bbox-overrides.json → src/content/books.json（每本书的活页清单：在哪一页、哪个位置）。

PLAN.md 表格每行：| id | 节 | 图 | PDF页 | 做什么 | 状态 |
额外的挂载点（同一个实验挂在第二张图上）写在 EXTRA_SPOTS。
"""
import json, re
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).parent))
from find_bbox import plan_rows

ROOT = Path(__file__).resolve().parent.parent
BOX = json.loads((ROOT / "tools" / "bbox-overrides.json").read_text())
EXTRA_SPOTS = [
    {"lesson": "pendulum", "page": 101, "bbox": [138, 236, 386, 416], "label": "图11.4-3 · 翻开活页"},
]
TITLES = {"wuli-8s": "物理 八年级上册", "wuli-8x": "物理 八年级下册", "wuli-9": "物理 九年级全一册", "huaxue-9s": "化学 九年级上册", "huaxue-9x": "化学 九年级下册", "dili-7s": "地理 七年级上册", "dili-xb1": "地理 选择性必修1", "dili-bx1": "地理 必修第一册"}


FIG_RE = r"(图[\d.\-]+|图\d+|实验活动\d+|实验\d+-\d+|探究)"


def short_fig(fig):
    """图 x-y；没有图的：实验活动 8 / 实验 9-4 / 探究"""
    m = re.match(FIG_RE, fig)
    return m.group(1) if m else "问题"


def main():
    books = {b: {"id": b, "title": t, "base": f"/books/{b}/", "lessons": {}, "spots": []} for b, t in TITLES.items()}
    for r in plan_rows():
        if r["id"] not in BOX:
            print("缺图框：", r["id"]); continue
        fig = r["fig"]
        title = re.sub(r"^(图[\d.\-/]+\s*)+", "", fig).strip() if fig.startswith("图") else re.sub(r"^(实验活动\d+|实验\d+-\d+|探究)\s*", "", fig).strip()
        title = title or r["sec"]
        title = title.replace("问题：", "")
        sec = re.sub(r"^[\d.]+\s*", "", r["sec"])
        b = books[r["book"]]
        b["lessons"][r["id"]] = {"title": title, "fig": short_fig(fig), "sec": sec}
        b["spots"].append({"lesson": r["id"], "page": r["page"], "bbox": BOX[r["id"]], "label": f"{short_fig(fig)} · 翻开活页"})
    for s in EXTRA_SPOTS:
        for b in books.values():
            if s["lesson"] in b["lessons"]:
                b["spots"].append(s)
    out = ROOT / "src" / "content" / "books.json"
    out.write_text(json.dumps(books, ensure_ascii=False, indent=1), encoding="utf-8")
    print({k: len(v["lessons"]) for k, v in books.items()})


if __name__ == "__main__":
    main()
