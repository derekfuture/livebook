# 图 2.13：墙 = 大块黑线 + 数字标注的方框；白色区域按 4 连通分块，上色编号，存核对图。
import numpy as np
from PIL import Image, ImageDraw
from collections import deque

im = Image.open('/tmp/geo/contour/fig213.png').convert('RGB')
a = np.asarray(im).astype(int)
H, W, _ = a.shape
lab = np.load('/tmp/geo/contour/lab.npy')
dark = lab >= 0
# 大块：线、陡崖、和线连着的圆圈
sizes = {}
for k in np.unique(lab[dark]):
    yy, xx = np.nonzero(lab == k)
    sizes[int(k)] = (len(yy), xx.max() - xx.min(), yy.max() - yy.min())
big = {k for k, (n, w, h) in sizes.items() if n > 600 or w > 120 or h > 120}
wall = np.isin(lab, list(big))
# 数字标注：方框也是墙（把被标注打断的线接上）
LABELS = {
    '250 上': (965, 33, 1060, 99), '300 上': (984, 86, 1078, 155),
    '500 ①': (451, 361, 542, 424), '450 ①': (461, 420, 553, 477), '400': (459, 514, 552, 568),
    '350': (396, 632, 490, 698), '300 下': (470, 687, 560, 769), '250 下': (494, 729, 585, 812),
    '450 ③': (895, 489, 987, 563),
}
PAD = 14
for x0, y0, x1, y1 in LABELS.values(): wall[max(0, y0 - PAD):y1 + 1 + PAD, max(0, x0 - PAD):x1 + 1 + PAD] = True
# 蓝框以外不算
inside = np.zeros((H, W), bool); inside[17:833, 17:1390] = True
free = inside & ~wall
reg = -np.ones((H, W), int); n = 0; info = []
for y0 in range(0, H, 3):
    for x0 in range(0, W, 3):
        if not free[y0, x0] or reg[y0, x0] >= 0: continue
        q = deque([(y0, x0)]); reg[y0, x0] = n; cnt = 0; sx = sy = 0
        while q:
            y, x = q.popleft(); cnt += 1; sx += x; sy += y
            for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= yy < H and 0 <= xx < W and free[yy, xx] and reg[yy, xx] < 0:
                    reg[yy, xx] = n; q.append((yy, xx))
        info.append((n, cnt, sx / cnt, sy / cnt)); n += 1
np.save('/tmp/geo/contour/reg.npy', reg); np.save('/tmp/geo/contour/wall.npy', wall)
keep = [r for r in info if r[1] > 400]
print('regions', n, 'big', len(keep))
for r in keep: print(r[0], r[1], round(r[2]), round(r[3]))
rng = np.random.default_rng(7)
out = np.full((H, W, 3), 255, np.uint8)
for r in keep:
    out[reg == r[0]] = rng.integers(120, 250, 3)
out[wall] = (40, 40, 40)
img = Image.fromarray(out); d = ImageDraw.Draw(img)
for r in keep:
    yy, xx = np.nonzero(reg == r[0]); i = len(yy) // 2
    d.rectangle([xx[i] - 2, yy[i] - 2, xx[i] + 24, yy[i] + 13], fill=(255, 255, 255)); d.text((xx[i], yy[i]), str(r[0]), fill=(0, 0, 0))
img.save('/tmp/geo/contour/regions.png')
