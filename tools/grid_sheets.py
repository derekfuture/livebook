#!/usr/bin/env python3
"""把 PLAN.md 里每个实验对应的页面加上坐标网格（每 50 pt 一条），3×2 拼成核对图，用来手工读插图位置。"""
import sys
from pathlib import Path
import fitz
sys.path.insert(0, str(Path(__file__).parent))
from find_bbox import plan_rows, LIB, PDF

docs = {b: fitz.open(LIB / f"{p}.pdf") for b, p in PDF.items()}
rows = [r for r in plan_rows() if not sys.argv[1:] or r["id"] in sys.argv[1:]]
cols, tw = 3, 420
for k in range(0, len(rows), 6):
    chunk = rows[k:k + 6]
    th = tw * 737 / 521.6
    out = fitz.open()
    sp = out.new_page(width=cols * tw, height=((len(chunk) + cols - 1) // cols) * (th + 18))
    for n, r in enumerate(chunk):
        src = docs[r["book"]]
        x, y = (n % cols) * tw, (n // cols) * (th + 18) + 18
        sp.show_pdf_page(fitz.Rect(x, y, x + tw, y + th), src, r["page"])
        s = tw / src[r["page"]].rect.width
        for v in range(0, 522, 50):
            sp.draw_line((x + v * s, y), (x + v * s, y + th), color=(1, 0, 0), width=0.4 if v % 100 else 0.8)
            sp.insert_text((x + v * s + 1, y + 7), str(v), fontsize=6.5, color=(1, 0, 0))
        for v in range(0, 737, 50):
            sp.draw_line((x, y + v * s), (x + tw, y + v * s), color=(0, 0, 1), width=0.4 if v % 100 else 0.8)
            sp.insert_text((x + 1, y + v * s - 1), str(v), fontsize=6.5, color=(0, 0, 1))
        sp.insert_text((x + 4, y - 5), f'{r["id"]}  {r["fig"]}', fontsize=10, color=(0.7, 0, 0))
    sp.get_pixmap(dpi=100).save(f"/tmp/lb/grid-{k // 6:02d}.png")
print(len(rows), "pages")
