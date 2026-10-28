#!/usr/bin/env python3
"""列出每一节里的插图（图号、标题、PDF 页序、图注位置）和实验/演示标题，用来挑“会动的图”。"""
import os
import json, re, sys
from pathlib import Path
import fitz

ROOT = Path(__file__).resolve().parent.parent
# 教材 PDF 所在目录：设环境变量 LIVEBOOK_PDF_DIR，里面放 八年级上册.pdf、八年级下册.pdf、九年级全一册.pdf（及 *.目录树.json）
LIB = Path(os.environ.get("LIVEBOOK_PDF_DIR", ROOT / "pdf")).expanduser()
PDF = {"wuli-8s": "八年级上册", "wuli-8x": "八年级下册", "wuli-9": "九年级全一册"}
CAP = re.compile(r"^图\s*(\d+\.\d+\s*[-–]\s*\d+)\s*(.*)$")

def main(book_id):
    man = json.loads((ROOT / "public/books" / book_id / "book.json").read_text())
    doc = fitz.open(LIB / f"{PDF[book_id]}.pdf")
    secs = [(s["page"], f'{c["title"]} {s["title"]}') for c in man["chapters"] for s in c["sections"] if s["page"]]
    secs.sort()
    out = []
    for k, (start, title) in enumerate(secs):
        end = secs[k + 1][0] if k + 1 < len(secs) else doc.page_count
        figs, heads = [], []
        for i in range(start, end):
            for b in doc[i].get_text("blocks"):
                t = b[4].strip().replace("\n", "")
                m = CAP.match(t)
                if m and len(t) < 40:
                    figs.append({"page": i, "fig": "图" + re.sub(r"\s", "", m.group(1)).replace("–", "-"), "title": m.group(2).strip(), "cap": [round(v) for v in b[:4]]})
                elif re.match(r"^(实验|演示|探究|想想做做|想想议议)", t) and len(t) < 30:
                    heads.append({"page": i, "text": t})
                elif re.match(r"^(实\s*验|演\s*示)$", t):
                    heads.append({"page": i, "text": t})
        out.append({"section": title, "start": start, "end": end, "figures": figs, "heads": heads})
    return out

if __name__ == "__main__":
    res = {b: main(b) for b in (sys.argv[1:] or PDF)}
    (ROOT / "tools" / "figures.json").write_text(json.dumps(res, ensure_ascii=False, indent=1))
    for b, secs in res.items():
        for s in secs:
            print(f"\n## {b} {s['section']} (p{s['start']}-{s['end']-1})")
            print("   heads:", "; ".join(f"{h['text']}@{h['page']}" for h in s["heads"]))
            for f in s["figures"]:
                print(f"   {f['fig']} {f['title']} @{f['page']}")
