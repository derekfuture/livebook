"""Index explicit activity headings; this is discovery evidence, not a coverage verdict.

Usage: python3 tools/index_senior_sources.py TEXTBOOK_DIRECTORY
Needs PyMuPDF. Source PDFs are read locally and are not copied into the repo.
"""
import hashlib
import json
import re
import sys
from pathlib import Path

import fitz

BOOKS = {
    'wuli-hs1': '必修第一册',
    'wuli-hs2': '必修第二册',
    'wuli-hs3': '必修第三册',
    'wuli-hsx1': '选择性必修第一册',
    'wuli-hsx2': '选择性必修第二册',
    'wuli-hsx3': '选择性必修第三册',
}
root = Path(sys.argv[1])
result = {'scope': 'Explicit 实验/演示/做一做 headings and large-font 实验 chapter titles. Unlabelled activities, reference cases and continuations still require manual review.', 'books': []}
for book, title in BOOKS.items():
    source = root / (title + '.pdf')
    doc = fitz.open(source)
    activities = []
    for index, page in enumerate(doc):
        lines = []
        for block in page.get_text('dict')['blocks']:
            for line in block.get('lines', []):
                spans = line['spans']
                text = ''.join(s['text'] for s in spans)
                normalized = re.sub(r'\s+', '', text)
                size = max((s['size'] for s in spans), default=0)
                if normalized in ('实验', '演示', '做一做') or ('实验' in normalized and size >= 20 and '仅供' not in normalized):
                    lines.append({'heading': normalized, 'bbox': [round(v, 2) for v in line['bbox']]})
        if not lines:
            continue
        refs = sorted(set(re.findall(r'图\s*(\d+\.\d+\s*[-－]\s*\d+)', page.get_text())))
        refs = ['图' + re.sub(r'\s+', '', r).replace('－', '-') for r in refs]
        for ordinal, line in enumerate(sorted(lines, key=lambda l: (l['bbox'][1], l['bbox'][0])), 1):
            activities.append({'id': f'{book}:p{index}:{ordinal}', 'pdf_index': index, 'pdf_file_page': index + 1, **line, 'page_figure_references': refs})
    result['books'].append({'id': book, 'source_file': source.name, 'sha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'pdf_pages': len(doc), 'activities': activities})
target = Path(__file__).resolve().parents[1] / 'audit' / 'senior-physics-source-index.json'
target.parent.mkdir(exist_ok=True)
target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({b['id']: len(b['activities']) for b in result['books']}))
