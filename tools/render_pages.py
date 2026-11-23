#!/usr/bin/env python3
"""把本地教材 PDF 渲染成书页贴图 + 目录清单，供 3D 书使用。

用法：python3 tools/render_pages.py [书目id]
输出：public/books/<id>/hi/NNN.jpg   高清页（翻到这一页时加载）
      public/books/<id>/lo/NNN.jpg   低清页（翻页动画、远处的页）
      public/books/<id>/book.json    页数、尺寸、章节 -> 页码索引
"""
import os
import json
import re
import sys
from pathlib import Path

import fitz  # PyMuPDF

ROOT = Path(__file__).resolve().parent.parent
# 教材 PDF 放在 pdf/<科目>/<版本>/<册>.pdf（旁边是同名的 .目录树.json），路径统一从 tools/pdf_paths.py 取
sys.path.insert(0, str(Path(__file__).resolve().parent))
from pdf_paths import LIB, pdf_path, toc_path
# 人工核对过的章节起始页（印刷页码），有就以它为准：可选，设环境变量 LIVEBOOK_VERIFIED_TOC 指向 .tsv
VERIFIED_TOC = Path(os.environ.get("LIVEBOOK_VERIFIED_TOC", ROOT / "pdf" / "章节与选点.tsv")).expanduser()

BOOKS = {
    "wuli-hsx3": {
        "code": "hsx3", "title": "物理 选择性必修第三册", "publisher": "人民教育出版社",
        "pdf": pdf_path("wuli-hsx3"), "toc": toc_path("wuli-hsx3"),
        "first_body_index": 5, "page_offset": 4,
        "printed_pages": [[1, 2, 7, 10, 14], [18, 19, 23, 26, 31, 36], [45, 46, 50, 54, 59],
                          [66, 67, 71, 78, 84, 92], [100, 101, 108, 115, 119, 126], [132]],
        "appendices": [("索引", 136)],
        # 平台目录另附的复习资料不在本版 143 页教材中。
        "exclude_chapters": ["高考复习"],
    },
    "wuli-hsx2": {
        "code": "hsx2", "title": "物理 选择性必修第二册", "publisher": "人民教育出版社",
        "pdf": pdf_path("wuli-hsx2"), "toc": toc_path("wuli-hsx2"),
        "first_body_index": 5, "page_offset": 4,
        "printed_pages": [[1, 2, 8, 13, 17], [23, 24, 30, 35, 40], [48, 49, 54, 58, 63],
                          [70, 71, 76, 80, 83], [90, 91, 97, 103], [111]],
        "appendices": [("索引", 115)],
    },
    "wuli-hsx1": {
        "code": "hsx1", "title": "物理 选择性必修第一册", "publisher": "人民教育出版社",
        "pdf": pdf_path("wuli-hsx1"), "toc": toc_path("wuli-hsx1"),
        "first_body_index": 5, "page_offset": 4,
        "printed_pages": [[1, 2, 6, 12, 17, 21, 25], [31, 32, 36, 43, 46, 51, 54],
                          [61, 62, 67, 71, 74, 79], [84, 85, 90, 95, 101, 104, 108], [116]],
        "appendices": [("索引", 121)],
    },
    "wuli-hs3": {
        "code": "hs3", "title": "物理 必修第三册", "publisher": "人民教育出版社",
        "pdf": pdf_path("wuli-hs3"), "toc": toc_path("wuli-hs3"),
        "first_body_index": 5, "page_offset": 4,
        "printed_pages": [[1, 2, 6, 11, 18], [25, 26, 31, 35, 38, 44], [52, 53, 57, 62, 68, 72],
                          [78, 79, 83, 89, 93], [103, 104, 109, 114, 119, 124], [131], [136]],
    },
    "wuli-hs2": {
        "code": "hs2", "title": "物理 必修第二册", "publisher": "人民教育出版社",
        "pdf": pdf_path("wuli-hs2"), "toc": toc_path("wuli-hs2"),
        "first_body_index": 5, "page_offset": 4,
        "printed_pages": [[1, 2, 6, 10, 14], [22, 23, 27, 31, 35], [43, 44, 49, 55, 59, 65],
                          [73, 74, 79, 84, 89, 95], [102]],
    },
    "wuli-hs1": {
        "code": "hs1", "title": "物理 必修第一册", "publisher": "人民教育出版社",
        "pdf": pdf_path("wuli-hs1"), "toc": toc_path("wuli-hs1"),
        "first_body_index": 5, "page_offset": 4,
        # 此版目录的印刷页码，依次为章首页和各节首页。
        "printed_pages": [[2], [10, 11, 15, 21, 27], [35, 36, 39, 42, 47],
                          [56, 57, 63, 68, 72, 76], [82, 83, 88, 94, 99, 104, 109], [116], [121]],
    },
    "wuli-8s": {
        "code": "8a",
        "title": "物理 八年级上册",
        "publisher": "人民教育出版社",
        "pdf": pdf_path("wuli-8s"),
        "toc": toc_path("wuli-8s"),
        "first_body_index": 5,
        "page_offset": 6,
    },
    "wuli-9": {
        "code": "9",
        "title": "物理 九年级全一册",
        "publisher": "人民教育出版社",
        "pdf": pdf_path("wuli-9"),
        "toc": toc_path("wuli-9"),
        "first_body_index": 5,
        "page_offset": 6,
    },
    "wuli-8x": {
        "code": "8b",
        "title": "物理 八年级下册",
        "publisher": "人民教育出版社",
        "pdf": pdf_path("wuli-8x"),
        "toc": toc_path("wuli-8x"),
        "first_body_index": 5,   # 目录页之后的第一页，查找章节标题从这里开始
        "page_offset": 4,        # 印刷页码 = PDF 页序 - 4
    },
    "huaxue-9s": {
        "code": "c9a",
        "title": "化学 九年级上册",
        "publisher": "人民教育出版社",
        "pdf": pdf_path("huaxue-9s"),
        "toc": toc_path("huaxue-9s"),
        "first_body_index": 5,
        "page_offset": 6,
    },
    "huaxue-9x": {
        "code": "c9b",
        "title": "化学 九年级下册",
        "publisher": "人民教育出版社",
        "pdf": pdf_path("huaxue-9x"),
        "toc": toc_path("huaxue-9x"),
        "first_body_index": 4,
        "page_offset": 4,
    },
    "huaxue-hs1": {
        "code": "hc1",
        "title": "化学 必修第一册",
        "publisher": "人民教育出版社",
        "pdf": pdf_path("huaxue-hs1"),
        "toc": toc_path("huaxue-hs1"),
        "first_body_index": 5,
        "page_offset": 4,
        # 印刷页码，照课本目录页（章首页、各节首页，含整理与提升、实验活动）
        "printed_pages": [[2], [5, 6, 14, 22, 29], [33, 34, 44, 53, 62, 65], [67, 68, 78, 87, 90], [91, 92, 107, 113, 118, 122]],
        "exclude_chapters": [],
        "exclude_sections": ["全章复习"],
    },
    "huaxue-hs2": {
        "code": "hc2",
        "title": "化学 必修第二册",
        "publisher": "人民教育出版社",
        "pdf": pdf_path("huaxue-hs2"),
        "toc": toc_path("huaxue-hs2"),
        "first_body_index": 5,
        "page_offset": 4,
        # 印刷页码，照课本目录页（章首页、各节首页，含整理与提升、实验活动）
        "printed_pages": [[1, 2, 11, 19, 26, 29, 30], [31, 32, 42, 52, 56, 57], [59, 60, 67, 77, 83, 91, 95, 96], [97, 98, 107, 117, 123]],
        "exclude_chapters": ["综合专题"],
        "exclude_sections": ["全章复习"],
    },
    "huaxue-hsx1": {
        "code": "hcx1",
        "title": "化学 选择性必修1",
        "publisher": "人民教育出版社",
        "pdf": pdf_path("huaxue-hsx1"),
        "toc": toc_path("huaxue-hsx1"),
        "first_body_index": 5,
        "page_offset": 4,
        # 印刷页码，照课本目录页（章首页、各节首页，含整理与提升、实验活动）
        "printed_pages": [[3, 4, 14, 20], [23, 24, 32, 43, 46, 52, 55], [57, 58, 63, 71, 79, 88, 91, 94], [95, 96, 104, 111, 118, 122, 123]],
        "exclude_chapters": ["综合专题"],
        "exclude_sections": ["全章复习"],
    },
    "huaxue-hsx2": {
        "code": "hcx2",
        "title": "化学 选择性必修2",
        "publisher": "人民教育出版社",
        "pdf": pdf_path("huaxue-hsx2"),
        "toc": toc_path("huaxue-hsx2"),
        "first_body_index": 5,
        "page_offset": 2,
        # 印刷页码，照课本目录页（章首页、各节首页，含整理与提升、实验活动）
        "printed_pages": [[5, 6, 18, 30], [33, 34, 41, 52], [67, 68, 78, 86, 95, 101, 104]],
        "exclude_chapters": ["高考复习"],
        "exclude_sections": ["全章复习"],
    },
    "huaxue-hsx3": {
        "code": "hcx3",
        "title": "化学 选择性必修3",
        "publisher": "人民教育出版社",
        "pdf": pdf_path("huaxue-hsx3"),
        "toc": toc_path("huaxue-hsx3"),
        "first_body_index": 5,
        "page_offset": 4,
        # 印刷页码，照课本目录页（章首页、各节首页，含整理与提升、实验活动）
        "printed_pages": [[3, 4, 13, 23], [27, 28, 34, 43, 50], [53, 54, 59, 68, 73, 84, 93, 98, 99], [101, 102, 112, 122, 127, 130], [131, 132, 136, 152]],
        "exclude_chapters": ["##引言", "高考复习"],
        "exclude_sections": ["全章复习"],
    },
    "dili-7s": {
        "code": "g7a",
        "title": "地理 七年级上册",
        "publisher": "人民教育出版社",
        "pdf": pdf_path("dili-7s"),
        "toc": toc_path("dili-7s"),
        "first_body_index": 5,
        "page_offset": 4,
        # 自动查找找错 / 找不到的（印刷页码，取自课本目录页）
        "toc_printed": {"第一章 地球": 5, "第一节 地球的宇宙环境": 6, "【跨学科主题学习】美化校园": 41, "【跨学科主题学习】探索外来食料作物传播史": 117},
    },
    "dili-8s": {
        "code": "g8a",
        "title": "地理 八年级上册",
        "publisher": "人民教育出版社",
        "pdf": pdf_path("dili-8s"),
        "toc": toc_path("dili-8s"),
        "first_body_index": 5,
        "page_offset": 4,
        # 印刷页码，照课本目录页
        "toc_printed": {"第一章 从世界看中国": 1, "第一节 疆域": 2, "第二节 人口": 13, "第三节 民族": 18, "第二章 中国的自然环境": 23, "第一节 地形": 24, "第二节 气候": 31, "第三节 河流与湖泊": 42,
                        "【跨学科主题学习】探究“束水攻沙”原理": 53, "第三章 中国的自然资源": 57, "第一节 土地资源": 58, "第二节 水资源": 64, "第三节 矿产资源": 70, "第四节 海洋资源": 75,
                        "【跨学科主题学习】认识我国的“世界灌溉工程遗产”": 82, "第四章 中国的经济发展": 85, "第一节 农业": 86, "第二节 工业": 93, "第三节 交通运输": 101,
                        "第五章 建设美丽中国": 109, "第一节 自然灾害与防灾减灾": 110, "第二节 环境保护与发展": 118},
    },
    "dili-8x": {
        "code": "g8b",
        "title": "地理 八年级下册",
        "publisher": "人民教育出版社",
        "pdf": pdf_path("dili-8x"),
        "toc": toc_path("dili-8x"),
        "first_body_index": 5,
        "page_offset": 4,
        "toc_printed": {"第六章 中国的地理差异": 1, "【跨学科主题学习】了解二十四节气": 9, "第七章 北方地区": 11, "第七章 北方地区/第一节 自然特征与农业": 12,
                        "第七章 北方地区/第二节 “白山黑水”——东北三省": 18, "第七章 北方地区/第三节 世界最大的黄土堆积区——黄土高原": 27, "第七章 北方地区/第四节 祖国的首都——北京": 37,
                        "第八章 南方地区": 47, "第八章 南方地区/第一节 自然特征与农业": 48, "第八章 南方地区/第二节 “鱼米之乡”——长江三角洲地区": 54,
                        "第八章 南方地区/第三节 特别行政区——香港和澳门": 62, "第八章 南方地区/第四节 祖国的神圣领土——台湾省": 69, "【跨学科主题学习】认识地名的由来和演变": 75,
                        "第九章 西北地区": 77, "第九章 西北地区/第一节 自然特征与农业": 78, "第九章 西北地区/第二节 干旱的宝地——塔里木盆地": 84,
                        "第十章 青藏地区": 89, "第十章 青藏地区/第一节 自然特征与农业": 90, "第十章 青藏地区/第二节 “中华水塔”——三江源地区": 97, "第十一章 奋进中的中国": 103},
    },
    "dili-bx1": {
        "code": "gb1",
        "title": "地理 必修第一册",
        "publisher": "人民教育出版社",
        "pdf": pdf_path("dili-bx1"),
        "toc": toc_path("dili-bx1"),
        "first_body_index": 5,
        "page_offset": 4,
    },
    "dili-bx2": {
        "code": "gb2",
        "title": "地理 必修第二册",
        "publisher": "人民教育出版社",
        "pdf": pdf_path("dili-bx2"),
        "toc": toc_path("dili-bx2"),
        "first_body_index": 5,
        "page_offset": 4,
    },
    "dili-xb1": {
        "code": "gx1",
        "title": "地理 选择性必修1",
        "publisher": "人民教育出版社",
        "pdf": pdf_path("dili-xb1"),
        "toc": toc_path("dili-xb1"),
        "first_body_index": 5,
        "page_offset": 4,
    },
    "dili-xb2": {
        "code": "gx2",
        "title": "地理 选择性必修2",
        "publisher": "人民教育出版社",
        "pdf": pdf_path("dili-xb2"),
        "toc": toc_path("dili-xb2"),
        "first_body_index": 5,
        "page_offset": 4,
    },
    "shuxue-7s": {
        "code": "m7a",
        "title": "数学 七年级上册",
        "publisher": "人民教育出版社",
        "pdf": pdf_path("shuxue-7s"),
        "toc": toc_path("shuxue-7s"),
        "first_body_index": 7,
        "page_offset": 6,
    },
    "shuxue-8s": {
        "code": "m8a",
        "title": "数学 八年级上册",
        "publisher": "人民教育出版社",
        "pdf": pdf_path("shuxue-8s"),
        "toc": toc_path("shuxue-8s"),
        "first_body_index": 7,
        "page_offset": 6,
    },
    "shuxue-8x": {
        "code": "m8b",
        "title": "数学 八年级下册",
        "publisher": "人民教育出版社",
        "pdf": pdf_path("shuxue-8x"),
        "toc": toc_path("shuxue-8x"),
        "first_body_index": 7,
        "page_offset": 6,
    },
    "shuxue-9s": {
        "code": "m9a",
        "title": "数学 九年级上册",
        "publisher": "人民教育出版社",
        "pdf": pdf_path("shuxue-9s"),
        "toc": toc_path("shuxue-9s"),
        "first_body_index": 7,
        "page_offset": 6,
    },
    "shuxue-7x": {
        "code": "m7b",
        "title": "数学 七年级下册",
        "publisher": "人民教育出版社",
        "pdf": pdf_path("shuxue-7x"),
        "toc": toc_path("shuxue-7x"),
        "first_body_index": 7,
        "page_offset": 6,
    },
}

HI_HEIGHT = 2048
LO_HEIGHT = 480
MID_HEIGHT = 720          # 只给封面：书桌首页上那几摞书用（hi 的封面一张近 1 MB，十几本书首屏要下 9 MB）


def find_page(doc, title, start):
    """章节标题在正文中第一次出现的页（标题去掉“第N节”前缀后匹配）。"""
    key = title.replace("　", " ").split(" ", 1)[-1].replace("跨学科实践：", "")
    key = re.sub(r"^[\d.]+\s*", "", key)          # 数学的节名“1.1正数和负数”“13.1 三角形的概念”：课本正文里的节号是全角数字，只按后面的名字找
    m = re.match(r"(课题\s*\d+)", title)
    if m:   # 化学：“课题2 氧气”——题名常在前文出现过，先找页面开头写着“课题2 + 题名”的那一页
        head = re.sub(r"\s", "", m.group(1)) + re.sub(r"\s", "", key)
        for i in range(start, doc.page_count):
            if head in re.sub(r"\s", "", doc[i].get_text())[:160]:
                return i
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


def apply_printed(chapters, fixed, offset):
    """BOOKS 里写明的印刷页码（课本目录页上的），覆盖自动查找的结果。"""
    for c in chapters:
        if c["title"] in fixed:
            c["page"] = fixed[c["title"]] + offset
        for sec in c["sections"]:
            key = f'{c["title"]}/{sec["title"]}'          # 好几章都有“第一节 自然特征与农业”：写成“章/节”区分
            if key in fixed:
                sec["page"] = fixed[key] + offset
            elif sec["title"] in fixed:
                sec["page"] = fixed[sec["title"]] + offset
    return chapters


def main(book_id):
    cfg = BOOKS[book_id]
    out = ROOT / "public" / "books" / book_id
    (out / "hi").mkdir(parents=True, exist_ok=True)
    (out / "lo").mkdir(parents=True, exist_ok=True)
    (out / "mid").mkdir(parents=True, exist_ok=True)

    doc = fitz.open(cfg["pdf"])
    rect = doc[1].rect
    for i, page in enumerate(doc):
        sizes = (("hi", HI_HEIGHT, 86), ("lo", LO_HEIGHT, 72)) + ((("mid", MID_HEIGHT, 82),) if i == 0 else ())
        for sub, height, quality in sizes:
            target = out / sub / f"{i:03d}.jpg"
            if target.exists():
                continue
            zoom = height / page.rect.height
            pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False)
            pix.save(target, jpg_quality=quality)
        print(f"\r渲染 {i + 1}/{doc.page_count}", end="", flush=True)
    print()

    chapters = apply_verified(build_toc(doc, cfg["toc"], cfg["first_body_index"]), cfg["code"], cfg["page_offset"])
    if "exclude_chapters" in cfg:
        chapters = [c for c in chapters if c["title"] not in cfg["exclude_chapters"]]
    for c in chapters:          # 平台目录里另附的“全章复习”不在课本里
        c["sections"] = [x for x in c["sections"] if x["title"] not in cfg.get("exclude_sections", [])]
    if "printed_pages" in cfg:
        for chapter, pages in zip(chapters, cfg["printed_pages"]):
            chapter["page"] = pages[0] + cfg["page_offset"]
            for section, page in zip(chapter["sections"], pages[1:]):
                section["page"] = page + cfg["page_offset"]
    for title, printed in cfg.get("appendices", []):
        if not any(c["title"] == title for c in chapters):
            chapters.append({"title": title, "page": printed + cfg["page_offset"], "sections": []})
    manifest = {
        "id": book_id,
        "title": cfg["title"],
        "publisher": cfg["publisher"],
        "pageCount": doc.page_count,
        "pageSize": [round(rect.width, 3), round(rect.height, 3)],
        "pageOffset": cfg["page_offset"],
        "chapters": apply_printed(chapters, cfg.get("toc_printed", {}), cfg["page_offset"]),
    }
    (out / "book.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print("写入", out / "book.json")


if __name__ == "__main__":
    ids = sys.argv[1:] or [key for key, cfg in BOOKS.items() if cfg["pdf"].is_file()]
    if not ids:
        sys.exit(f"没有找到教材 PDF：{LIB}")
    for book_id in ids:
        main(book_id)
