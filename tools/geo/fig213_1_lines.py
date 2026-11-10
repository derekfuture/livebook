# 图 2.13：把黑线分成连通块，大块（等高线、陡崖）编号上色，存一张核对图。
import numpy as np
from PIL import Image, ImageDraw
from collections import deque

im = Image.open('/tmp/geo/contour/fig213.png').convert('RGB')
a = np.asarray(im).astype(int)
H, W, _ = a.shape
dark = (a[:, :, 0] < 120) & (a[:, :, 1] < 120) & (a[:, :, 2] < 120)
# 蓝色边框不算
lab = -np.ones((H, W), int)
comps = []
ys, xs = np.nonzero(dark)
for y0, x0 in zip(ys, xs):
    if lab[y0, x0] >= 0: continue
    k = len(comps); q = deque([(y0, x0)]); lab[y0, x0] = k; pts = []
    while q:
        y, x = q.popleft(); pts.append((y, x))
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                yy, xx = y + dy, x + dx
                if 0 <= yy < H and 0 <= xx < W and dark[yy, xx] and lab[yy, xx] < 0:
                    lab[yy, xx] = k; q.append((yy, xx))
    p = np.array(pts)
    comps.append({'k': k, 'n': len(pts), 'y0': p[:, 0].min(), 'y1': p[:, 0].max(), 'x0': p[:, 1].min(), 'x1': p[:, 1].max(), 'cy': p[:, 0].mean(), 'cx': p[:, 1].mean()})
np.save('/tmp/geo/contour/lab.npy', lab)
big = [c for c in comps if c['n'] > 600 or (c['x1'] - c['x0']) > 120 or (c['y1'] - c['y0']) > 120]
print('components', len(comps), 'big', len(big))
for c in sorted(big, key=lambda c: -c['n']):
    print(c['k'], c['n'], (c['x0'], c['y0'], c['x1'], c['y1']))
# 核对图：大块上色并标号
rng = np.random.default_rng(3)
out = np.full((H, W, 3), 255, np.uint8)
out[dark] = (200, 200, 200)
for c in big:
    col = rng.integers(30, 220, 3)
    out[lab == c['k']] = col
img = Image.fromarray(out); d = ImageDraw.Draw(img)
for c in big:
    # 标号放在这一块上的某个点
    yy, xx = np.nonzero(lab == c['k']); i = len(yy) // 2
    d.rectangle([xx[i] - 2, yy[i] - 2, xx[i] + 34, yy[i] + 22], fill=(255, 255, 255))
    d.text((xx[i], yy[i]), str(c['k']), fill=(0, 0, 0))
img.save('/tmp/geo/contour/cc.png')
