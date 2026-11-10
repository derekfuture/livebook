# 图 2.13 → 高度场：每个白色区域有一个高度带 [lo, hi)；区域里的点按“离低一层多远、离高一层多远”插值；
# 山峰区域的“高一层”是山顶那个点；最低的区域往外缓缓降。墙（线、标注框）和小圈圈用旁边的值补上，再轻轻抹平。
# 输出 1/3 分辨率的高度（米）：dem.npy；核对图：dem_check.png（算出来的等高线压在原图上）。
import numpy as np, json
from PIL import Image, ImageDraw

S = 3
reg_full = np.load('/tmp/geo/contour/reg.npy')
H0, W0 = reg_full.shape
reg = reg_full[::S, ::S]
H, W = reg.shape
BAND = {  # 区域编号 → (lo, hi)；顶上的值给山峰
    9: (500, 575), 7: (450, 500), 6: (400, 450), 15: (450, 525),
    8: (350, 400), 5: (350, 400), 3: (300, 350), 4: (300, 350),
    0: (250, 300), 2: (250, 300), 20: (250, 300), 21: (250, 300),
    1: (200, 250), 23: (200, 250),
}
PEAK = {9: (480, 293), 15: (1000, 412)}       # 山顶（原图像素）
band = np.full((H, W), np.nan); lo = np.full((H, W), np.nan); hi = np.full((H, W), np.nan)
for k, (a, b) in BAND.items():
    m = reg == k; lo[m] = a; hi[m] = b
known = ~np.isnan(lo)

def dist_from(src):
    """8 邻域倒角距离（像素，1/3 分辨率），穿过所有格子。"""
    d = np.where(src, 0.0, 1e9)
    for _ in range(max(H, W) * 2):
        prev = d
        n = d.copy()
        for dy, dx, w in ((0, 1, 1), (0, -1, 1), (1, 0, 1), (-1, 0, 1), (1, 1, 1.414), (1, -1, 1.414), (-1, 1, 1.414), (-1, -1, 1.414)):
            s = np.full_like(d, 1e9)
            ys = slice(max(dy, 0), H + min(dy, 0)); yd = slice(max(-dy, 0), H + min(-dy, 0))
            xs = slice(max(dx, 0), W + min(dx, 0)); xd = slice(max(-dx, 0), W + min(-dx, 0))
            s[ys, xs] = d[yd, xd] + w
            n = np.minimum(n, s)
        d = n
        if np.array_equal(d, prev): break
    return d

levels = sorted({v for a, b in BAND.values() for v in (a, b)})
dist_ge = {L: dist_from(known & (lo >= L)) for L in levels}       # 到“高度带不低于 L”的区域
dist_lt = {L: dist_from(known & (hi <= L)) for L in levels}       # 到“高度带不高于 L”的区域
peak_d = {}
for k, (px, py) in PEAK.items():
    src = np.zeros((H, W), bool); src[py // S, px // S] = True; peak_d[k] = dist_from(src)

z = np.full((H, W), np.nan)
for k, (a, b) in BAND.items():
    m = reg == k
    dlo = dist_lt[a][m] if a > 200 else None
    dhi = peak_d[k][m] if k in PEAK else dist_ge[b][m]
    if dlo is None:                     # 最低的区域：离高一层越远越低（缓坡）
        z[m] = np.maximum(a, b - dhi * S / 300 * 30)
    else:
        z[m] = a + (b - a) * dlo / (dlo + dhi + 1e-6)
# 墙、小圈圈：用最近的已知值补（反复往外扩）
for _ in range(200):
    miss = np.isnan(z)
    if not miss.any(): break
    acc = np.zeros((H, W)); cnt = np.zeros((H, W))
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        sh = np.full((H, W), np.nan)
        sh[max(dy, 0):H + min(dy, 0), max(dx, 0):W + min(dx, 0)] = z[max(-dy, 0):H + min(-dy, 0), max(-dx, 0):W + min(-dx, 0)]
        ok = ~np.isnan(sh); acc[ok] += sh[ok]; cnt[ok] += 1
    fill = miss & (cnt > 0); z[fill] = acc[fill] / cnt[fill]
# 轻轻抹平两遍（3×3）
for _ in range(2):
    p = np.pad(z, 1, mode='edge')
    z = sum(p[1 + dy:H + 1 + dy, 1 + dx:W + 1 + dx] for dy in (-1, 0, 1) for dx in (-1, 0, 1)) / 9
np.save('/tmp/geo/contour/dem.npy', z)
print('dem', z.shape, round(float(np.nanmin(z)), 1), round(float(np.nanmax(z)), 1))
# 核对：算出来的等高线（红）压在原图上
im = Image.open('/tmp/geo/contour/fig213.png').convert('RGB'); d = ImageDraw.Draw(im)
for L in (250, 300, 350, 400, 450, 500, 550):
    above = z >= L
    edge = above & ~(np.roll(above, 1, 0) & np.roll(above, -1, 0) & np.roll(above, 1, 1) & np.roll(above, -1, 1))
    ys, xs = np.nonzero(edge)
    for y, x in zip(ys, xs):
        if 2 < y < H - 2 and 2 < x < W - 2: d.rectangle([x * S, y * S, x * S + 2, y * S + 2], fill=(230, 40, 40))
im.save('/tmp/geo/contour/dem_check.png')
