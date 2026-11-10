#!/usr/bin/env python3
"""板块活页数据，可复现来源（下载日期：2026-11-07）：
NOAA ERDDAP etopo180: Topography, ETOPO1, 0.0166667 degrees, Global
(longitude -180 to 180), (Ice Sheet Surface)，ETOPO1 2009 冰面版。
元数据：https://coastwatch.pfeg.noaa.gov/erddap/info/etopo180/index.html
与输入 CSV 坐标一致的重建查询（原下载 URL 未随缓存保存）：
https://coastwatch.pfeg.noaa.gov/erddap/griddap/etopo180.csv?altitude[8:15:10793][8:15:21593]
原始网格 grid/node-registered，WGS84，经纬度为节点坐标，平均海平面基准；
每 15 个节点取一值，不做区域平均。保存 CSV 真实原点、步长，北到南行序。
边界：Bird (2003), doi:10.1029/2001GC000252；Hugo Ahlenius / Nordpil 转换。
https://github.com/fraxen/tectonicplates/blob/master/GeoJSON/PB2002_steps.json
极性定义：https://github.com/fraxen/tectonicplates/blob/master/original/README.md
保留源文件全部步段（包括转换版的重复步段），不按六大板块合并或删线。
输入 SHA256 写入生成数据 SOURCE；地形数值以 int16 小端保存，不经 Canvas 量化。
用法：python3 tools/geo/plates_prep.py /tmp/plates/etopo.csv /tmp/plates/pb_steps.json
"""
import sys, json, math, hashlib, base64
import numpy as np
from PIL import Image
ROOT = __import__('pathlib').Path(__file__).resolve().parent.parent.parent
csv, steps = sys.argv[1], sys.argv[2]
rows = np.loadtxt(csv, delimiter=',', skiprows=2)
lat, lon, z = rows[:, 0], rows[:, 1], rows[:, 2]
la, lo = np.unique(lat), np.unique(lon)
Z = np.zeros((len(la), len(lo)), np.float32); Z[np.searchsorted(la, lat), np.searchsorted(lo, lon)] = z
assert len(rows) == len(la) * len(lo) and np.isfinite(Z).all()
assert np.allclose(np.diff(la), 0.25) and np.allclose(np.diff(lo), 0.25)
Z = Z[::-1]          # 第一行是北极
H, W = Z.shape
# 高度贴图：海底 −11000 … 陆地 +9000 米 → 16 位灰度
hm = np.clip((Z + 11000) / 20000, 0, 1)
# 晕渲：分层设色 + 光照
def ramp(v, stops):
    v = np.asarray(v); out = np.zeros(v.shape + (3,))
    xs = [s[0] for s in stops]; cs = np.array([s[1] for s in stops], float)
    for k in range(3): out[..., k] = np.interp(v, xs, cs[:, k])
    return out
sea = ramp(Z, [(-11000, (12, 34, 78)), (-6000, (24, 62, 120)), (-3500, (40, 96, 158)), (-1000, (74, 140, 196)), (-200, (120, 176, 214)), (0, (150, 196, 222))])
land = ramp(Z, [(0, (112, 150, 92)), (300, (140, 168, 100)), (1000, (186, 176, 120)), (2000, (170, 140, 98)), (3500, (150, 118, 92)), (5000, (196, 186, 176)), (6500, (246, 246, 246))])
col = np.where((Z >= 0)[..., None], land, sea)
gy, gx = np.gradient(Z)
dx = gx / (111000 * 0.25 * np.cos(np.radians(la[::-1]))[:, None].clip(0.05)) ; dy = gy / (111000 * 0.25)
nx, ny, nz = -dx * 8, dy * 8, np.ones_like(Z)
n = np.sqrt(nx * nx + ny * ny + nz * nz); L = np.array([-0.5, 0.6, 0.62]); L /= np.linalg.norm(L)
shade = (nx * L[0] + ny * L[1] + nz * L[2]) / n
k = np.where(Z >= 0, 0.55 + 0.6 * shade, 0.8 + 0.25 * shade)[..., None]
img = np.clip(col * k, 0, 255).astype(np.uint8)
Image.fromarray(img).resize((2048, 1024), Image.LANCZOS).save(ROOT / 'src/lessons/data/earth_relief.jpg', quality=88)
# 保留每个有向步段，代码前项在左、后项在右；/ 右侧下插，\ 左侧下插。
KIND = {'OSR': 'grow', 'CRB': 'grow', 'SUB': 'die', 'OCB': 'die', 'CCB': 'die', 'OTF': 'slide', 'CTF': 'slide'}
S = json.load(open(steps))['features']; out = []
for f in S:
    p = f['properties']; pb = p['PLATEBOUND']; left, polarity, right = pb[:2], pb[2], pb[3:5]
    assert polarity in '-/\\' and p['STEPCLASS'] in KIND
    out.append({'id': p['SEQNUM'], 'k': KIND[p['STEPCLASS']], 'c': p['STEPCLASS'], 'p': left + right,
                'left': left, 'right': right, 'polarity': polarity,
                'subducting': right if polarity == '/' else left if polarity == '\\' else None,
                'pts': [[p['STARTLONG'], p['STARTLAT']], [p['FINALLONG'], p['FINALLAT']]]})
grid = {'width': W, 'height': H, 'lat0': float(la[-1]), 'lon0': float(lo[0]),
        'dlat': float(la[0] - la[1]), 'dlon': float(lo[1] - lo[0]), 'registration': 'grid/node', 'encoding': 'int16-le'}
source = {'downloaded': '2026-11-07', 'version': 'ETOPO1 Ice Surface 2009',
          'query': 'https://coastwatch.pfeg.noaa.gov/erddap/griddap/etopo180.csv?altitude[8:15:10793][8:15:21593]',
          'queryNote': '按缓存坐标重建，原请求地址未保存',
          'sha256': {__import__('pathlib').Path(p).name: hashlib.sha256(open(p, 'rb').read()).hexdigest() for p in [csv, steps]}}
encoded = base64.b64encode(Z.astype('<i2').tobytes()).decode('ascii')
(ROOT / 'src/lessons/data/plates.js').write_text('// Bird (2003) PB2002 全部有向步段；left/right 沿 pts 方向，polarity 保留原符号。自动生成，请改 plates_prep.py。\n'
    + 'export const GRID = ' + json.dumps(grid) + ';\n'
    + 'export const SOURCE = ' + json.dumps(source, ensure_ascii=False) + ';\n'
    + 'export const HEIGHT = "' + encoded + '";\n'
    + 'export default ' + json.dumps(out, separators=(',', ':')) + ';\n')
print(len(out), 'steps', W, H, 'height grid')
