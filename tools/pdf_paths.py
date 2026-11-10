"""教材 PDF 放在哪：pdf/<科目>/<版本>/<册>.pdf，旁边是同名的 <册>.目录树.json（仓库里只带目录树，PDF 自己准备）。

所有用到教材 PDF 的工具都从这里取路径（render_pages.py、find_bbox.py、grid_sheets.py、list_figures.py、textbook.py）。
设环境变量 LIVEBOOK_PDF_DIR 可以换一个目录，里面的结构和 pdf/ 一样。
"""
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LIB = Path(os.environ.get("LIVEBOOK_PDF_DIR", ROOT / "pdf")).expanduser()

# 书 id → (科目, 版本, 册)
BOOK_FILES = {
    "wuli-8s": ("物理", "人教版", "八年级上册"),
    "wuli-8x": ("物理", "人教版", "八年级下册"),
    "wuli-9": ("物理", "人教版", "九年级全一册"),
    "huaxue-9s": ("化学", "人教版", "九年级上册"),
    "huaxue-9x": ("化学", "人教版", "九年级下册"),
    "dili-7s": ("地理", "人教版", "七年级上册"),
    "dili-8s": ("地理", "人教版", "八年级上册"),
    "dili-8x": ("地理", "人教版", "八年级下册"),
    "dili-bx1": ("地理", "人教版", "必修第一册"),
    "dili-bx2": ("地理", "人教版", "必修第二册"),
    "dili-xb1": ("地理", "人教版", "选择性必修1"),
    "dili-xb2": ("地理", "人教版", "选择性必修2"),
}


def pdf_path(book_id):
    """这本书的 PDF：pdf/<科目>/<版本>/<册>.pdf"""
    subject, edition, name = BOOK_FILES[book_id]
    return LIB / subject / edition / f"{name}.pdf"


def toc_path(book_id):
    """这本书的章节目录：和 PDF 同一个文件夹，<册>.目录树.json"""
    subject, edition, name = BOOK_FILES[book_id]
    return LIB / subject / edition / f"{name}.目录树.json"


if __name__ == "__main__":          # python3 tools/pdf_paths.py：列出每本书的 PDF、目录树在不在
    for bid in BOOK_FILES:
        p, t = pdf_path(bid), toc_path(bid)
        print(f"{bid:10s} {'✓' if p.exists() else '✗'} {p.relative_to(LIB) if p.is_relative_to(LIB) else p}   目录树 {'✓' if t.exists() else '✗'}")
