# 用法：python3 tools/quote_check.py <lesson.js> <book-id>
# 检查 conclusion.quote 的每一段（按“……”分开）都在 crops 框里的课本文字里、按顺序出现；脚注号①②…和排版空白不算。
import sys, re, json
import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pdf_paths import pdf_path
import fitz
src = open(sys.argv[1], encoding='utf-8').read()
book = sys.argv[2]
conc = src.split('conclusion:')[1].split('formula:')[0]
crops = re.findall(r"page:\s*(\d+),\s*rect:\s*\[([\d.,\s]+)\]", conc)
quote = re.search(r"quote:\s*'([^']*)'", src).group(1)
doc = fitz.open(pdf_path(book))
norm = lambda t: re.sub(r'[\s①②③④⑤⑥⑦⑧⑨⑩]', '', t)
text = ''
for page, rect in crops:
    r = fitz.Rect(*[float(v) for v in rect.split(',')])
    t = doc[int(page)].get_text(clip=r)
    print(f'--- page {page} {list(r)}\n{t.strip()}\n')
    text += norm(t)
pos = 0; ok = True
for seg in quote.split('……'):
    s = norm(seg)
    i = text.find(s, pos)
    print(('OK  ' if i >= 0 else 'MISS'), s[:50], '…' if len(s) > 50 else '')
    if i < 0:
        ok = False
        # 找最长能对上的前缀
        k = len(s)
        while k > 0 and text.find(s[:k], pos) < 0: k -= 1
        print('     matched prefix:', s[:k][-30:], '| next expected:', s[k:k+20], '| book has:', text[text.find(s[:k], pos)+k: text.find(s[:k], pos)+k+20] if k else '')
    else: pos = i + len(s)
print('RESULT', 'PASS' if ok else 'FAIL', '| ends with ？' if quote.rstrip().endswith(('？', '?')) else '')
