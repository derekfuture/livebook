#!/usr/bin/env python3
"""查“注释吞掉代码”：一行里 // 注释后面又出现了像代码的东西（; 结尾的语句、block.add( 之类）。用法：python3 tools/lint_comments.py src/lessons/*.js"""
import re, sys
bad = 0
for f in sys.argv[1:]:
    for n, line in enumerate(open(f, encoding='utf-8'), 1):
        m = re.search(r'\s//\s', line)
        if not m or line.lstrip().startswith('//'): continue
        tail = line[m.end():]
        if re.search(r'[A-Za-z_$][\w$.]*\([^)]*\);|\b(const|let|return|if)\b\s|=\s*[^=]', tail) and not re.search(r'[一-鿿]', tail[-12:] if tail.strip().endswith(';') else ''):
            if re.search(r';\s*$', tail.strip()) or re.search(r'\w\.\w+\(.*\);', tail):
                print(f'{f}:{n}: {line.strip()[:160]}'); bad += 1
                continue
        if re.search(r'\?\.\w|\)\s*;|\bconst\s|\blet\s|\bnew THREE\b|=>(?!\s*\{\})', tail):          # 更严：注释里出现 ?. 、); 、const、new THREE、箭头函数，几乎一定是吞掉的代码
            print(f'{f}:{n}: {line.strip()[:160]}'); bad += 1
sys.exit(1 if bad else 0)
