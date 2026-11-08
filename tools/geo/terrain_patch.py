# 地理世界“俯冲”用的一块真实地形：以某一点为中心、边长若干千米的正方形（当地的东—北平面）。
#   python3 tools/geo/terrain_patch.py <名字> <纬度> <经度> <边长 km> [高程像素=768] [影像像素=2048] [缩放级=11]
# 产出 src/lessons/data/terrain/<名字>.png（高程，Terrarium 编码：R*256+G+B/256-32768 米）和 <名字>.jpg（卫星影像）。
# 数据：高程来自 AWS Terrain Tiles（Mapzen 汇编，SRTM、GMTED、ETOPO1 等公开数据）；
#       影像来自 Sentinel-2 cloudless 2016（EOX IT Services GmbH，CC BY 4.0，含经过处理的 Copernicus Sentinel 2016 年数据）。
import math, os, sys, io, urllib.request
import numpy as np
from PIL import Image

name, lat0, lon0, size = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4])
dem_px = int(sys.argv[5]) if len(sys.argv) > 5 else 768
img_px = int(sys.argv[6]) if len(sys.argv) > 6 else 2048
Z = int(sys.argv[7]) if len(sys.argv) > 7 else 11
CACHE = '/tmp/geodata/tiles'
os.makedirs(CACHE, exist_ok=True)
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'lessons', 'data', 'terrain')
os.makedirs(OUT, exist_ok=True)
SRC = {
    'dem': 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
    'img': 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg',
}

def tile_xy(lat, lon, z):          # Web 墨卡托：经纬度 → 第 z 级的像素坐标（瓦片 256 像素）；数组也行
    n = 2 ** z * 256
    r = np.radians(lat)
    return (np.asarray(lon) + 180) / 360 * n, (1 - np.log(np.tan(r) + 1 / np.cos(r)) / np.pi) / 2 * n

def fetch(kind, z, x, y):
    fn = os.path.join(CACHE, f'{kind}_{z}_{x}_{y}')
    if not os.path.exists(fn):
        req = urllib.request.Request(SRC[kind].format(z=z, x=x, y=y), headers={'User-Agent': 'livebook-terrain/1.0'})
        with urllib.request.urlopen(req, timeout=60) as r: data = r.read()
        open(fn, 'wb').write(data)
    return Image.open(fn).convert('RGB')

def mosaic(kind, lat_s, lat_n, lon_w, lon_e, z):
    x0, y0 = tile_xy(lat_n, lon_w, z); x1, y1 = tile_xy(lat_s, lon_e, z)
    tx0, ty0, tx1, ty1 = int(float(x0) // 256), int(float(y0) // 256), int(float(x1) // 256), int(float(y1) // 256)
    M = Image.new('RGB', ((tx1 - tx0 + 1) * 256, (ty1 - ty0 + 1) * 256))
    for ty in range(ty0, ty1 + 1):
        for tx in range(tx0, tx1 + 1):
            M.paste(fetch(kind, z, tx, ty), ((tx - tx0) * 256, (ty - ty0) * 256))
    return np.asarray(M, dtype=np.float64), tx0 * 256, ty0 * 256

def sample(arr, ox, oy, px, py):          # 双线性取样（px、py 是全图像素坐标）
    x = px - ox - 0.5; y = py - oy - 0.5
    x0 = np.clip(np.floor(x).astype(int), 0, arr.shape[1] - 2); y0 = np.clip(np.floor(y).astype(int), 0, arr.shape[0] - 2)
    fx = (x - x0)[..., None]; fy = (y - y0)[..., None]
    a = arr[y0, x0]; b = arr[y0, x0 + 1]; c = arr[y0 + 1, x0]; d = arr[y0 + 1, x0 + 1]
    return a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy

# 当地平面：东 x、北 y（千米）→ 经纬度（边长一百多千米，用等距圆柱近似就够了）
KM_LAT = 111.32; KM_LON = 111.32 * math.cos(math.radians(lat0))
half = size / 2
lat_s, lat_n = lat0 - half / KM_LAT * 1.02, lat0 + half / KM_LAT * 1.02
lon_w, lon_e = lon0 - half / KM_LON * 1.02, lon0 + half / KM_LON * 1.02

def grid(n):
    t = (np.arange(n) + 0.5) / n
    east = -half + t * size; north = half - t * size          # 图的上面是北
    E, N = np.meshgrid(east, north)
    return lat0 + N / KM_LAT, lon0 + E / KM_LON

# 高程
D, ox, oy = mosaic('dem', lat_s, lat_n, lon_w, lon_e, Z)
la, lo = grid(dem_px)
px, py = tile_xy(la, lo, Z)
rgb = sample(D, ox, oy, px, py)
elev = rgb[..., 0] * 256 + rgb[..., 1] + rgb[..., 2] / 256 - 32768
v = np.clip(elev + 32768, 0, 65535.99)
enc = np.stack([np.floor(v / 256), np.floor(v) % 256, np.zeros_like(v)], -1).astype(np.uint8)          # 精确到 1 米就够了（小数那一位不存，图小很多）
Image.fromarray(enc, 'RGB').save(os.path.join(OUT, f'{name}.png'), optimize=True)

# 影像
I, ox, oy = mosaic('img', lat_s, lat_n, lon_w, lon_e, Z)
la, lo = grid(img_px)
px, py = tile_xy(la, lo, Z)
img = np.clip(sample(I, ox, oy, px, py), 0, 255).astype(np.uint8)
Image.fromarray(img, 'RGB').save(os.path.join(OUT, f'{name}.jpg'), quality=84, optimize=True)
print(name, 'elev', round(float(elev.min())), round(float(elev.max())), 'files', os.path.getsize(os.path.join(OUT, f'{name}.png')), os.path.getsize(os.path.join(OUT, f'{name}.jpg')))
