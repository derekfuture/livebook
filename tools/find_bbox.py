#!/usr/bin/env python3
"""根据图注自动框出插图的位置（PDF 点），并输出核对用的缩略图。

用法：python3 tools/find_bbox.py           # 读取 PLAN.md 里的表格，写 tools/bboxes.json
      python3 tools/find_bbox.py --sheet    # 另外生成 /tmp/lb/bbox-*.png 核对图
"""
import os
import json, re, sys
from pathlib import Path
import fitz

ROOT = Path(__file__).resolve().parent.parent
# 教材 PDF 所在目录：设环境变量 LIVEBOOK_PDF_DIR，里面放 八年级上册.pdf、八年级下册.pdf、九年级全一册.pdf（及 *.目录树.json）
LIB = Path(os.environ.get("LIVEBOOK_PDF_DIR", ROOT / "pdf")).expanduser()
PDF = {"wuli-8s": "八年级上册", "wuli-8x": "八年级下册", "wuli-9": "九年级全一册"}
OVERRIDE = ROOT / "tools" / "bbox-overrides.json"   # 自动框不准时手工改这里


def plan_rows():
    book, rows = None, []
    for line in (ROOT / "PLAN.md").read_text(encoding="utf-8").splitlines():
        m = re.search(r"\b(wuli-\w+)（", line)
        if line.startswith("## ") and m:
            book = m.group(1)
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if book and len(cells) >= 6 and re.fullmatch(r"[a-z]+", cells[0]) and cells[3].isdigit():
            rows.append({"id": cells[0], "book": book, "sec": cells[1], "fig": cells[2], "page": int(cells[3])})
    return rows


def figure_bbox(page, fig_label):
    """从图注出发，把相邻的图片、矢量图形和图内小标注连成一片。"""
    W, H = page.rect.width, page.rect.height
    num = re.match(r"图\s*([\d.\-]+)", fig_label)
    blocks = page.get_text("blocks")
    caps = []
    for b in blocks:
        t = b[4].replace("\n", "").replace(" ", "")
        if (num and t.startswith("图" + num.group(1).split("/")[0])) or (not num and fig_label[:2] in t[:6]):
            caps.append(fitz.Rect(b[:4]))
    if not caps:
        return None, None
    cap = min(caps, key=lambda r: r.width)
    body = [fitz.Rect(b[:4]) for b in blocks if len(b[4].strip()) > 14 and (b[3] - b[1]) > 20]
    items = [fitz.Rect(i["bbox"]) for i in page.get_image_info()]
    for d in page.get_drawings():
        items.append(fitz.Rect(d["rect"]))
    labels = [fitz.Rect(b[:4]) for b in blocks if len(b[4].strip()) <= 14 or (b[3] - b[1]) <= 20]
    items = [r & page.rect for r in items]
    items = [r for r in items if not r.is_empty and r.y0 > 40 and r.y1 < H - 40
             and not (r.height < 30 and r.width > W * 0.55)                  # 栏目标题色条
             and not any(r.contains(bb) or abs(r & bb) > 0.5 * abs(bb) for bb in body)]  # 包住正文的底色框
    items += [l for l in labels if not l.intersects(cap)]
    region = fitz.Rect(cap)
    for _ in range(60):
        grew = False
        for r in items:
            if r in region:
                continue
            near_y = r.y1 >= region.y0 - 22 and r.y0 <= region.y1 + 2
            near_x = r.x1 >= region.x0 - 24 and r.x0 <= region.x1 + 24
            above = r.y0 >= cap.y0 - 330 and r.y1 <= cap.y1 + 2
            if near_y and near_x and above and (r | region).width < W * 0.9:
                region |= r
                grew = True
        if not grew:
            break
    region = fitz.Rect(region.x0 - 4, region.y0 - 4, region.x1 + 4, region.y1 + 3) & page.rect
    return [round(v) for v in region], [round(v) for v in cap]


def main():
    sheet = "--sheet" in sys.argv
    overrides = json.loads(OVERRIDE.read_text()) if OVERRIDE.exists() else {}
    docs = {b: fitz.open(LIB / f"{p}.pdf") for b, p in PDF.items()}
    out = {}
    for row in plan_rows():
        page = docs[row["book"]][row["page"]]
        bbox, cap = figure_bbox(page, row["fig"])
        if row["id"] in overrides:
            bbox = overrides[row["id"]]
        out[row["id"]] = {**row, "bbox": bbox}
        flag = "" if bbox else "  <-- 没找到图注"
        print(f'{row["id"]:15} {row["book"]} p{row["page"]:<4} {bbox}{flag}')
    (ROOT / "tools" / "bboxes.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
    if sheet:
        ids = list(out)
        for k in range(0, len(ids), 12):
            chunk = ids[k:k + 12]
            cols, tw, th = 4, 260, 368
            sheet_doc = fitz.open()
            sp = sheet_doc.new_page(width=cols * tw, height=((len(chunk) + cols - 1) // cols) * (th + 16))
            for n, i in enumerate(chunk):
                row = out[i]
                src = docs[row["book"]]
                x, y = (n % cols) * tw, (n // cols) * (th + 16)
                sp.show_pdf_page(fitz.Rect(x, y + 16, x + tw, y + 16 + th), src, row["page"])
                sp.insert_text((x + 4, y + 12), i, fontsize=11, color=(0.8, 0, 0))
                if row["bbox"]:
                    s = tw / src[row["page"]].rect.width
                    b = row["bbox"]
                    sp.draw_rect(fitz.Rect(x + b[0] * s, y + 16 + b[1] * s, x + b[2] * s, y + 16 + b[3] * s), color=(1, 0.2, 0.1), width=1.6)
            sp.get_pixmap(dpi=110).save(f"/tmp/lb/bbox-{k // 12:02d}.png")


if __name__ == "__main__":
    main()
