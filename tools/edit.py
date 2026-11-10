#!/usr/bin/env python3
"""安全地替换一段代码，并把行尾注释放到整行最后（避免“注释吞掉后面的代码”）。
用法：python3 tools/edit.py 文件 <<'X'  然后每段：旧文本\n<<<>>>\n新文本\n=====\n  新文本里如果有  '          // ' 注释，会被挪到这一整行的最后。"""
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
for block in sys.stdin.read().split('\n=====\n'):
    if not block.strip(): continue
    old, new = block.split('\n<<<>>>\n')
    new = new.rstrip('\n'); old = old.strip('\n')
    assert s.count(old) == 1, f'找不到或不唯一：{old[:60]}'
    i = s.index(old); j = s.find('\n', i + len(old)); j = len(s) if j < 0 else j
    rest = s[i + len(old):j]
    if '          // ' in new and rest.strip():
        code, cm = new.split('          // ', 1); new = code + rest + '          // ' + cm; s = s[:i] + new + s[j:]
    else:
        s = s[:i] + new + s[i + len(old):]
open(p, 'w', encoding='utf-8').write(s)
print('ok')
