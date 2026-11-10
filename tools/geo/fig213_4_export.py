# 高度场导出给活页用：1/6 分辨率（每格 6 个原图像素），单位分米，Uint16 → base64，写成一个 JS 模块。
import numpy as np, base64, json
z = np.load('/tmp/geo/contour/dem.npy')            # 1/3 分辨率，(284, 469)
H, W = z.shape
H2, W2 = H // 2, W // 2
z2 = z[:H2 * 2, :W2 * 2].reshape(H2, 2, W2, 2).mean(axis=(1, 3))
dm = np.round(z2 * 10).astype('<u2')
b64 = base64.b64encode(dm.tobytes()).decode()
src = f"""// 课本七年级上册第 34 页图 2.13（等高线地形图）立起来以后的高度（米）。
// 从图上的等高线（250–550 米）、陡崖和两个山顶算出来的：每一圈等高线之间按离两条线的远近插值，山顶取在最里一圈以内。
// 格子：{W2} × {H2}，每格对应原图（1406 × 850 像素）的 6 × 6 像素；数值是分米（Uint16，小端），base64。
export const FIG213 = {{ w: {W2}, h: {H2}, img: [1406, 850], cell: 6, min: {float(z2.min()):.1f}, max: {float(z2.max()):.1f}, dm: '{b64}' }};
"""
open('/tmp/geo/contour/fig213.js', 'w').write(src)
print(W2, H2, len(b64), round(float(z2.min()), 1), round(float(z2.max()), 1))
