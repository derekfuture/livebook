# 地势三级阶梯（jieti）用的三条真实地形剖面带：沿 36°N、沿 30°N、沿 105°E。
#   python3 tools/geo/profile_strips.py
# 每条带：顺着线每 0.05° 一格，横过线 7 格（往北或往西共 0.5°），每格取格子里的平均高程（米，海里记 0）。
# 线的两头都选在我国境内、远离边界争议地区（不画任何边界，只是地形剖面）。
# 数据：AWS Terrain Tiles（Mapzen 汇编，SRTM、GMTED、ETOPO1 等公开数据），第 7 级（约 1 千米一像素）。
import json, math, os, urllib.request
import numpy as np
from PIL import Image

Z = 7
CACHE = '/tmp/geodata/tiles'
os.makedirs(CACHE, exist_ok=True)
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'lessons', 'data', 'jieti.js')
URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'

def tile_xy(lat, lon, z):
    n = 2 ** z * 256
    r = np.radians(lat)
    return (np.asarray(lon) + 180) / 360 * n, (1 - np.log(np.tan(r) + 1 / np.cos(r)) / np.pi) / 2 * n

def fetch(z, x, y):
    fn = os.path.join(CACHE, f'dem_{z}_{x}_{y}')
    if not os.path.exists(fn):
        req = urllib.request.Request(URL.format(z=z, x=x, y=y), headers={'User-Agent': 'livebook-terrain/1.0'})
        with urllib.request.urlopen(req, timeout=60) as r: open(fn, 'wb').write(r.read())
    return Image.open(fn).convert('RGB')

def mosaic(lat_s, lat_n, lon_w, lon_e):
    x0, y0 = tile_xy(lat_n, lon_w, Z); x1, y1 = tile_xy(lat_s, lon_e, Z)
    tx0, ty0, tx1, ty1 = int(float(x0) // 256), int(float(y0) // 256), int(float(x1) // 256), int(float(y1) // 256)
    M = Image.new('RGB', ((tx1 - tx0 + 1) * 256, (ty1 - ty0 + 1) * 256))
    for ty in range(ty0, ty1 + 1):
        for tx in range(tx0, tx1 + 1):
            M.paste(fetch(Z, tx, ty), ((tx - tx0) * 256, (ty - ty0) * 256))
    a = np.asarray(M, dtype=np.float64)
    return a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768, tx0 * 256, ty0 * 256

def sample(arr, ox, oy, px, py):
    x = px - ox - 0.5; y = py - oy - 0.5
    x0 = np.clip(np.floor(x).astype(int), 0, arr.shape[1] - 2); y0 = np.clip(np.floor(y).astype(int), 0, arr.shape[0] - 2)
    fx = x - x0; fy = y - y0
    return arr[y0, x0] * (1 - fx) * (1 - fy) + arr[y0, x0 + 1] * fx * (1 - fy) + arr[y0 + 1, x0] * (1 - fx) * fy + arr[y0 + 1, x0 + 1] * fx * fy

STEP, NC, WIDTH, SUB = 0.05, 7, 0.5, 5
LINES = {
    '36N': dict(kind='lat', at=36.0, a0=80.0, a1=121.0),          # 昆仑山脉（新疆、西藏交界一带的东昆仑以东）到黄海
    '30N': dict(kind='lat', at=30.0, a0=83.0, a1=122.2),          # 西藏中部到东海
    '105E': dict(kind='lon', at=105.0, a0=24.0, a1=40.5),         # 云南东部到阿拉善
}
out = {}
for key, L in LINES.items():
    na = int(round((L['a1'] - L['a0']) / STEP)) + 1
    along = L['a0'] + np.arange(na) * STEP
    across = L['at'] + (np.arange(NC) / (NC - 1)) * WIDTH * (1 if L['kind'] == 'lat' else -1)          # 纬线：往北；经线：往西（镜头在东边往西看，南在左、北在右）
    if L['kind'] == 'lat':
        arr, ox, oy = mosaic(L['at'] - 0.1, L['at'] + WIDTH + 0.1, L['a0'] - 0.1, L['a1'] + 0.1)
    else:
        arr, ox, oy = mosaic(L['a0'] - 0.1, L['a1'] + 0.1, L['at'] - WIDTH - 0.1, L['at'] + 0.1)
    H = np.zeros((NC, na))
    cell_c = WIDTH / (NC - 1)
    for j, c in enumerate(across):
        acc = np.zeros(na)
        for si in range(SUB):
            for sj in range(SUB):
                da = (si + 0.5) / SUB - 0.5; dc = (sj + 0.5) / SUB - 0.5
                a = along + da * STEP; cc = c + dc * cell_c
                lat, lon = (np.full(na, cc), a) if L['kind'] == 'lat' else (a, np.full(na, cc))
                px, py = tile_xy(lat, lon, Z)
                acc += np.maximum(0, sample(arr, ox, oy, px, py))
        H[j] = acc / SUB / SUB
    km = (L['a1'] - L['a0']) * (111.32 * math.cos(math.radians(L['at'])) if L['kind'] == 'lat' else 110.95)
    out[key] = dict(L, na=na, nc=NC, width=WIDTH, km=round(km, 1), h=[int(round(v / 10) * 10) for v in H.flatten()])
    f = H[0]
    print(key, na, 'km', round(km), 'front max', int(f.max()), 'at', round(float(along[f.argmax()]), 2), 'min', int(f.min()))
open(OUT, 'w').write('// tools/geo/profile_strips.py 生成，不要手改。三条地形剖面带：每条 nc 行 × na 列（第 0 行就是线上那一行），高程米（海里 0）。\nexport default ' + json.dumps(out, separators=(',', ':')) + ';\n')
print('->', OUT, os.path.getsize(OUT) // 1024, 'KB')
