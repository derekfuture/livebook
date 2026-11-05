# 打印课本某几页的文字：python3 tools/textbook.py 上 16 17 [关键词]
import sys, fitz, re
book, pages = sys.argv[1], sys.argv[2:]
kw = None
if pages and not pages[-1].isdigit(): kw = pages.pop()
path = {'上': 'pdf/化学/九年级上册.pdf', '下': 'pdf/化学/九年级下册.pdf'}[book]
off = {'上': 6, '下': 4}[book]
d = fitz.open('/Users/scout911/dev/mp/livebook/' + path)
for P in map(int, pages):
    t = d[P + off].get_text()
    t = re.sub(r'\n(?=\S)', '', t) if False else t
    if kw:
        for m in re.finditer(kw, t):
            print(f'--- {book}册 p{P} …', t[max(0, m.start()-150): m.end()+200].replace('\n', ''))
    else:
        print(f'===== {book}册 p{P} =====')
        print(t.replace('\n', ''))
