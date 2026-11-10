# 生成预览图：封面 + 按册的活页一览（每张：截图、标题、在课本第几页、这张活页问的问题）→ HTML，再用无头浏览器截成长图
import json, re, html
from pathlib import Path
G = Path('/Users/scout911/dev/mp/livebook/.claude/worktrees/geo')
T = Path('/tmp/pv_thumbs'); OUT = Path('/tmp/pv_poster')
books = json.load(open(G / 'src/content/books.json'))
SHORT = {'dili-7s': '七年级上册', 'dili-8s': '八年级上册', 'dili-8x': '八年级下册', 'dili-bx1': '必修第一册', 'dili-bx2': '必修第二册', 'dili-xb1': '选择性必修1', 'dili-xb2': '选择性必修2'}
ABBR = {'dili-7s': '七上', 'dili-8s': '八上', 'dili-8x': '八下', 'dili-bx1': '必修一', 'dili-bx2': '必修二', 'dili-xb1': '选必一', 'dili-xb2': '选必二'}
def lessons(bid):
    bk = books[bid]; off = json.load(open(G / f'public/books/{bid}/book.json')).get('pageOffset', 0); seen = set(); out = []
    for s in bk['spots']:
        lid = s['lesson']
        if lid in seen: continue
        seen.add(lid); L = bk['lessons'][lid]; src = (G / f'src/lessons/{lid}.js').read_text()
        m = re.search(r"^\s*ask:\s*'([^']+)'", src, re.M)
        ask = re.sub(r'<[^>]+>', '', m.group(1)) if m else ''
        out.append(dict(id=lid, title=L['title'], fig=L.get('fig', ''), page=s['page'] - off, ask=ask, bid=bid))
    return sorted(out, key=lambda x: x['page'])
CSS = '''
* { box-sizing: border-box; margin: 0; padding: 0; }
body { width: 900px; background: #f4eee2; color: #2b2620; font-family: "PingFang SC", "Hiragino Sans GB", sans-serif; }
.wrap { padding: 46px 40px 40px; }
.brand { display: flex; align-items: baseline; gap: 14px; }
.brand b { font: 700 30px/1 "Songti SC", serif; letter-spacing: .12em; }
.brand span { font: 15px/1 "Songti SC", serif; color: #8a7b66; letter-spacing: .2em; }
.tag { display: inline-block; margin-left: auto; padding: 5px 12px; border-radius: 999px; background: #2f3a52; color: #f6eedb; font-size: 13px; letter-spacing: .1em; }
h1 { margin: 26px 0 6px; font: 700 44px/1.25 "Songti SC", serif; letter-spacing: .06em; }
.sub { font-size: 17px; color: #6d604f; letter-spacing: .04em; }
.hero { margin: 26px 0 0; border-radius: 14px; overflow: hidden; box-shadow: 0 18px 40px rgba(40,30,15,.25); }
.hero img { display: block; width: 100%; }
.cap { margin-top: 10px; font-size: 13px; color: #8a7b66; text-align: center; }
.steps { margin-top: 30px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.step { background: #fffaf0; border-radius: 12px; padding: 16px 16px 18px; box-shadow: 0 4px 14px rgba(60,40,10,.08); }
.step i { display: inline-flex; width: 26px; height: 26px; border-radius: 50%; background: #c8342a; color: #fff; font: 700 14px/26px sans-serif; justify-content: center; font-style: normal; }
.step p { margin-top: 10px; font-size: 16px; line-height: 1.55; }
.link { margin-top: 26px; padding: 18px 20px; border-radius: 12px; background: #2f3a52; color: #f6eedb; }
.link small { display: block; font-size: 13px; color: #c9c1ae; letter-spacing: .06em; }
.link b { display: block; margin-top: 6px; font: 600 22px/1.3 "SF Mono", Menlo, monospace; letter-spacing: .01em; word-break: break-all; }
.count { margin-top: 24px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
.count div { background: #fffaf0; border-radius: 12px; padding: 16px 18px; box-shadow: 0 4px 14px rgba(60,40,10,.08); }
.count b { font: 700 34px/1 "Songti SC", serif; color: #c8342a; }
.count span { margin-left: 6px; font-size: 15px; color: #6d604f; }
.count p { margin-top: 8px; font-size: 14px; color: #6d604f; line-height: 1.5; }
.foot { margin-top: 26px; font-size: 13px; color: #9a8b75; text-align: center; letter-spacing: .08em; }
.hd { display: flex; align-items: baseline; gap: 12px; margin: 6px 0 20px; }
.hd b { font: 700 32px/1 "Songti SC", serif; letter-spacing: .1em; }
.hd span { font-size: 15px; color: #8a7b66; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 22px 20px; }
.card { background: #fffaf0; border-radius: 12px; overflow: hidden; box-shadow: 0 6px 18px rgba(60,40,10,.1); }
.card img { display: block; width: 100%; aspect-ratio: 1940 / 1540; object-fit: cover; }
.card .tx { padding: 12px 14px 15px; }
.card h3 { font: 700 20px/1.3 "Songti SC", serif; letter-spacing: .02em; }
.card .meta { margin-top: 4px; font-size: 12.5px; color: #9a8b75; letter-spacing: .04em; }
.card .ask { margin-top: 7px; font-size: 14px; line-height: 1.55; color: #4a4136; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.sec { margin: 30px 0 14px; font: 700 22px/1 "Songti SC", serif; letter-spacing: .1em; color: #5a4c3a; }
.sec:first-of-type { margin-top: 0; }
'''
URL = 'https://geo-preview.livebook-1ej.pages.dev'
def page(name, body):
    (OUT / f'{name}.html').write_text(f'<!doctype html><meta charset="utf-8"><style>{CSS}</style><body><div class="wrap">{body}</div></body>', encoding='utf-8')
def card(L):
    return (f'<div class="card"><img src="file://{T}/{L["id"]}.png"><div class="tx"><h3>{html.escape(L["title"])}</h3>'
            f'<div class="meta">{ABBR[L["bid"]]} · 课本第 {L["page"]} 页{(" · " + html.escape(L["fig"])) if L["fig"] else ""}</div>'
            f'<div class="ask">{html.escape(L["ask"])}</div></div></div>')
def section(title, ls): return f'<div class="sec">{title}</div><div class="grid">{"".join(card(L) for L in ls)}</div>'
def header(t, s): return f'<div class="brand"><b>活页课本</b><span>地理 · 测试版</span><em class="tag">{t}</em></div><div class="hd" style="margin-top:22px"><span>{s}</span></div>'
# 封面
n_j = sum(len(lessons(b)) for b in ['dili-7s', 'dili-8s', 'dili-8x']); n_s = sum(len(lessons(b)) for b in ['dili-bx1', 'dili-bx2', 'dili-xb1', 'dili-xb2'])
page('01_cover', f'''
<div class="brand"><b>活页课本</b><span>纸上得来，不再浅</span><em class="tag">地理 · 测试版</em></div>
<h1>人教版地理课本上的图，<br>翻开就能动手</h1>
<div class="sub">初中 {n_j} 张、高中 {n_s} 张，一共 {n_j + n_s} 张活页</div>
<div class="hero"><img src="file://{T}/_world.png"></div>
<div class="cap">地理世界：所有地理课本围成一圈，地球按此刻真实的太阳照着；点一本书、或在左边目录里点一张活页</div>
<div class="steps">
  <div class="step"><i>1</i><p>用<b>电脑</b>的 Chrome 或 Edge 打开下面的链接（手机屏幕太小）</p></div>
  <div class="step"><i>2</i><p>在书桌上点<b>“地理”</b>，进入地理世界</p></div>
  <div class="step"><i>3</i><p>在目录里点一张活页，跟着左边的纸卡动手</p></div>
</div>
<div class="link"><small>测试地址</small><b>{URL}</b></div>
<div class="count">
  <div><b>{n_j}</b><span>张 · 初中</span><p>七年级上册、八年级上册、八年级下册</p></div>
  <div><b>{n_s}</b><span>张 · 高中</span><p>必修第一册、必修第二册、选择性必修1、选择性必修2</p></div>
</div>
<div class="foot">测试版 · 仅供试用，请勿转发 · 后面几张是全部活页</div>''')
page('02_7s', header('初中', '七年级上册 · 7 张') + section('七年级上册', lessons('dili-7s')))
page('03_8', header('初中', '八年级上册 · 八年级下册 · 4 张') + section('八年级上册', lessons('dili-8s')) + section('八年级下册', lessons('dili-8x')))
page('04_bx', header('高中', '必修第一册 · 必修第二册 · 7 张') + section('必修第一册', lessons('dili-bx1')) + section('必修第二册', lessons('dili-bx2')))
xb1 = lessons('dili-xb1')
page('05_xb1a', header('高中', f'选择性必修1 · 第 1—7 张（共 {len(xb1)} 张）') + section('选择性必修1', xb1[:7]))
page('06_xb1b', header('高中', f'选择性必修1 · 第 8—{len(xb1)} 张 · 选择性必修2') + section('选择性必修1（续）', xb1[7:]) + section('选择性必修2', lessons('dili-xb2')))
print('ok', n_j, n_s)
