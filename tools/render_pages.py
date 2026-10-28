#!/usr/bin/env python3
"""把本地教材 PDF 渲染成书页贴图 + 目录清单，供 3D 书使用。

用法：python3 tools/render_pages.py [书目id]
输出：public/books/<id>/hi/NNN.jpg   高清页（翻到这一页时加载）
      public/books/<id>/lo/NNN.jpg   低清页（翻页动画、远处的页）
      public/books/<id>/book.json    页数、尺寸、章节 -> 页码索引
"""
import os
import json
import sys
from pathlib import Path

import fitz  # PyMuPDF

ROOT = Path(__file__).resolve().parent.parent
# 教材 PDF 所在目录：设环境变量 LIVEBOOK_PDF_DIR，里面放 八年级上册.pdf、八年级下册.pdf、九年级全一册.pdf（及 *.目录树.json）
LIB = Path(os.environ.get("LIVEBOOK_PDF_DIR", ROOT / "pdf")).expanduser()
# 人工核对过的章节起始页（印刷页码），有就以它为准：可选，设环境变量 LIVEBOOK_VERIFIED_TOC 指向 .tsv
VERIFIED_TOC = Path(os.environ.get("LIVEBOOK_VERIFIED_TOC", ROOT / "pdf" / "章节与选点.tsv")).expanduser()

BOOKS = {
    "wuli-8s": {
        "code": "8a",
        "title": "物理 八年级上册",
        "publisher": "人民教育出版社",
        "pdf": LIB / "八年级上册.pdf",
        "toc": LIB / "八年级上册.目录树.json",
        "first_body_index": 5,
        "page_offset": 6,
    },
    "wuli-9": {
        "code": "9",
        "title": "物理 九年级全一册",
        "publisher": "人民教育出版社",
        "pdf": LIB / "九年级全一册.pdf",
        "toc": LIB / "九年级全一册.目录树.json",
        "first_body_index": 5,
        "page_offset": 6,
    },
    "wuli-8x": {
        "code": "8b",
        "title": "物理 八年级下册",
        "publisher": "人民教育出版社",
        "pdf": LIB / "八年级下册.pdf",
        "toc": LIB / "八年级下册.目录树.json",
        "first_body_index": 5,   # 目录页之后的第一页，查找章节标题从这里开始
        "page_offset": 4,        # 印刷页码 = PDF 页序 - 4
    },
}

HI_HEIGHT = 2048
LO_HEIGHT = 480


def find_page(doc, title, start):
    """章节标题在正文中第一次出现的页（标题去掉“第N节”前缀后匹配）。"""
    key = title.split(" ", 1)[-1].replace("跨学科实践：", "")
    for i in range(start, doc.page_count):
        text = doc[i].get_text().replace(" ", "").replace("　", "")
        if key.replace(" ", "") in text:
            return i
    return None


def build_toc(doc, toc_path, start):
    tree = json.loads(Path(toc_path).read_text(encoding="utf-8"))
    chapters, cursor = [], start
    for ch in tree:
        ch_page = find_page(doc, ch["title"], cursor)
        cursor = (ch_page + 1) if ch_page is not None else cursor   # 节标题常与章名相同（如“力”），从章首页之后找
        sections = []
        for sec in ch.get("child_nodes") or []:
            p = find_page(doc, sec["title"], cursor)
            if p is not None:
                cursor = p
            sections.append({"title": sec["title"], "page": p})
        chapters.append({"title": ch["title"], "page": ch_page, "sections": sections})
    return chapters


def apply_verified(chapters, code, offset):
    """用核对过的印刷页码覆盖自动查找的结果（按章、节的顺序对应）。"""
    if not VERIFIED_TOC.exists():
        return chapters
    rows = [r.split("\t") for r in VERIFIED_TOC.read_text(encoding="utf-8").splitlines() if r.startswith(code + "\t")]
    by_ch = {}
    for r in rows:
        by_ch.setdefault(int(r[1]), (int(r[3]), []))[1].append(int(r[6]))
    numbered = [c for c in chapters if c["title"].startswith("第")]
    for c, (num, (ch_page, sec_pages)) in zip(numbered, sorted(by_ch.items())):
        c["page"] = ch_page + offset
        for sec, sp in zip(c["sections"], sec_pages):
            sec["page"] = sp + offset
    return chapters


def main(book_id):
    cfg = BOOKS[book_id]
    out = ROOT / "public" / "books" / book_id
    (out / "hi").mkdir(parents=True, exist_ok=True)
    (out / "lo").mkdir(parents=True, exist_ok=True)

    doc = fitz.open(cfg["pdf"])
    rect = doc[1].rect
    for i, page in enumerate(doc):
        for sub, height, quality in (("hi", HI_HEIGHT, 86), ("lo", LO_HEIGHT, 72)):
            target = out / sub / f"{i:03d}.jpg"
            if target.exists():
                continue
            zoom = height / page.rect.height
            pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False)
            pix.save(target, jpg_quality=quality)
        print(f"\r渲染 {i + 1}/{doc.page_count}", end="", flush=True)
    print()

    manifest = {
        "id": book_id,
        "title": cfg["title"],
        "publisher": cfg["publisher"],
        "pageCount": doc.page_count,
        "pageSize": [round(rect.width, 3), round(rect.height, 3)],
        "pageOffset": cfg["page_offset"],
        "chapters": apply_verified(build_toc(doc, cfg["toc"], cfg["first_body_index"]), cfg["code"], cfg["page_offset"]),
    }
    (out / "book.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print("写入", out / "book.json")


if __name__ == "__main__":
    ids = sys.argv[1:] or list(BOOKS)
    for book_id in ids:
        main(book_id)
