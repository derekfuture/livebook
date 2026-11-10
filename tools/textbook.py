# 打印课本某几页的文字：python3 tools/textbook.py 上 16 17 [关键词]
import sys, fitz, re
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from pdf_paths import pdf_path
book, pages = sys.argv[1], sys.argv[2:]
kw = None
if pages and not pages[-1].isdigit(): kw = pages.pop()
path = pdf_path({'上': 'huaxue-9s', '下': 'huaxue-9x'}[book])
off = {'上': 6, '下': 4}[book]
d = fitz.open(path)
for P in map(int, pages):
    t = d[P + off].get_text()
    t = re.sub(r'\n(?=\S)', '', t) if False else t
    if kw:
        for m in re.finditer(kw, t):
            print(f'--- {book}册 p{P} …', t[max(0, m.start()-150): m.end()+200].replace('\n', ''))
    else:
        print(f'===== {book}册 p{P} =====')
        print(t.replace('\n', ''))
