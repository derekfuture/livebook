#!/usr/bin/env python3
"""按 src/lessons/*.js 是否存在，更新 PLAN.md 的状态列，并打印进度。"""
import re
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
have = {p.stem for p in (ROOT / "src/lessons").glob("*.js")}
shelved = {p.stem for p in (ROOT / "src/lessons/shelved").glob("*.js")}
lines, done, total = [], 0, 0
for line in (ROOT / "PLAN.md").read_text(encoding="utf-8").splitlines():
    cells = line.split("|")
    if len(cells) >= 8 and re.fullmatch(r"\s*[a-z]+\s*", cells[1]) and cells[4].strip().isdigit():
        total += 1
        ok = cells[1].strip() in have
        done += ok
        cells[6] = " ✅ " if ok else " ⏸ " if cells[1].strip() in shelved else " ⬜ "
        line = "|".join(cells)
    lines.append(line)
(ROOT / "PLAN.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
print(f"{done}/{total}")
