#!/usr/bin/env python3
"""板块活页的数据：NOAA ETOPO1（公有领域，经 ERDDAP 取 0.25° 子样）→ 地形晕渲贴图、高度贴图；
Bird (2003) PB2002 板块边界（经 github.com/fraxen/tectonicplates）→ 按课本“六大板块”合并后的边界线。
用法：python3 tools/geo/plates_prep.py /tmp/plates/etopo.csv /tmp/plates/pb_steps.json
"""
import sys, json, math
import numpy as np
from PIL import Image
ROOT = __import__('pathlib').Path(__file__).resolve().parent.parent.parent
csv, steps = sys.argv[1], sys.argv[2]
rows = np.loadtxt(csv, delimiter=',', skiprows=2)
lat, lon, z = rows[:, 0], rows[:, 1], rows[:, 2]
la, lo = np.unique(lat), np.unique(lon)
Z = np.zeros((len(la), len(lo)), np.float32); Z[np.searchsorted(la, lat), np.searchsorted(lo, lon)] = z
Z = Z[::-1]          # 第一行是北极
H, W = Z.shape
# 高度贴图：海底 −11000 … 陆地 +9000 米 → 16 位灰度
hm = np.clip((Z + 11000) / 20000, 0, 1)
Image.fromarray((hm * 65535).astype(np.uint16)).save(ROOT / 'src/lessons/data/earth_height.png')
# 晕渲：分层设色 + 光照
def ramp(v, stops):
    v = np.asarray(v); out = np.zeros(v.shape + (3,))
    xs = [s[0] for s in stops]; cs = np.array([s[1] for s in stops], float)
    for k in range(3): out[..., k] = np.interp(v, xs, cs[:, k])
    return out
sea = ramp(Z, [(-11000, (12, 34, 78)), (-6000, (24, 62, 120)), (-3500, (40, 96, 158)), (-1000, (74, 140, 196)), (-200, (120, 176, 214)), (0, (150, 196, 222))])
land = ramp(Z, [(0, (112, 150, 92)), (300, (140, 168, 100)), (1000, (186, 176, 120)), (2000, (170, 140, 98)), (3500, (150, 118, 92)), (5000, (196, 186, 176)), (6500, (246, 246, 246))])
col = np.where((Z >= 0)[..., None], land, sea)
LA = np.linspace(90, -90, H)[:, None] * np.ones((1, W)); LO = np.linspace(-180, 180, W)[None, :] * np.ones((H, 1))
ice = (Z > 200) & ((LA < -62) | ((LA > 60) & (LO > -75) & (LO < -10)))          # 南极洲、格陵兰的冰盖：白色
col = np.where(ice[..., None], ramp(Z, [(0, (226, 234, 240)), (3000, (246, 249, 252))]), col)
gy, gx = np.gradient(Z)
dx = gx / (111000 * 0.25 * np.cos(np.radians(np.linspace(90, -90, H)))[:, None].clip(0.05)) ; dy = gy / (111000 * 0.25)
nx, ny, nz = -dx * 8, dy * 8, np.ones_like(Z)
n = np.sqrt(nx * nx + ny * ny + nz * nz); L = np.array([-0.5, 0.6, 0.62]); L /= np.linalg.norm(L)
shade = (nx * L[0] + ny * L[1] + nz * L[2]) / n
k = np.where(Z >= 0, 0.55 + 0.6 * shade, 0.8 + 0.25 * shade)[..., None]
img = np.clip(col * k, 0, 255).astype(np.uint8)
Image.fromarray(img).resize((2048, 1024), Image.LANCZOS).save(ROOT / 'src/lessons/data/earth_relief.jpg', quality=88)
# 边界：六大板块（课本图 2.20）
G = {}
for g, codes in {'EU': 'EU AS AT YA AM OK ON SU PS MA BU MS BS TI BH', 'IN': 'IN AU AR CR NH NI TO KE FT SB SS WL BR', 'PA': 'PA NZ CO JF RI GP EA JZ MN NB CL', 'AM': 'NA SA CA SC ND PM AP', 'AF': 'AF SO', 'AN': 'AN SW'}.items():
    for c in codes.split(): G[c] = g
KIND = {'OSR': 'grow', 'CRB': 'grow', 'SUB': 'die', 'OCB': 'die', 'CCB': 'die', 'OTF': 'slide', 'CTF': 'slide'}
S = json.load(open(steps))['features']; lines = []; cur = None
for f in S:
    p = f['properties']; pb = p['PLATEBOUND'].replace('/', '-').replace('\\', '-'); a, b = pb.split('-')[:2] if '-' in pb else (None, None)          # PB2002 用 / 和 \ 表示俯冲的方向，这里只要两侧是谁
    ga, gb = G.get(a[:2] if a else ''), G.get(b[:2] if b else '')
    if not ga or not gb or (ga == gb and p['STEPCLASS'] != 'CRB'): cur = None; continue          # 同一大板块里面的边界不画，只留大陆上的裂谷（东非裂谷：非洲板块里努比亚、索马里两块之间张裂）
    kind = KIND.get(p['STEPCLASS'])
    p0, p1 = (round(p['STARTLONG'], 2), round(p['STARTLAT'], 2)), (round(p['FINALLONG'], 2), round(p['FINALLAT'], 2))
    key = (kind, p['STEPCLASS'], ''.join(sorted([ga, gb])))
    if cur and cur['key'] == key and abs(cur['pts'][-1][0] - p0[0]) < 0.2 and abs(cur['pts'][-1][1] - p0[1]) < 0.2 and abs(p0[0] - p1[0]) < 90: cur['pts'].append(list(p1))
    else: cur = {'key': key, 'pts': [list(p0), list(p1)]}; lines.append(cur)
out = [{'k': l['key'][0], 'c': l['key'][1], 'p': l['key'][2], 'pts': l['pts']} for l in lines]
(ROOT / 'src/lessons/data/plates.js').write_text('// 六大板块的边界（按课本图 2.20 把 PB2002 的小板块并进六大板块，示意）。k：grow 生长边界、die 消亡边界、slide 错动（转换）边界；c：PB2002 的边界类别；p：两侧板块；pts：[经度, 纬度]。\n// 来源：Bird, P. (2003) An updated digital model of plate boundaries, G-cubed 4(3), 1027（PB2002，经 github.com/fraxen/tectonicplates）。\nexport default ' + json.dumps(out, separators=(',', ':')) + ';\n')
print(len(out), 'lines', sum(len(l['pts']) for l in out), 'pts')
