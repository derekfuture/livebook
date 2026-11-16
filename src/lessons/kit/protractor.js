import { canvasTex } from './props.js';
export function protractorTexture(clearCenter = false) {
  return canvasTex(1024, 1024, (c, w) => {
    const cx = w / 2,
      R = w * 0.47;
    c.fillStyle = 'rgba(255,253,245,0.82)';
    c.beginPath();
    c.arc(cx, cx, R, 0, 7);
    c.fill();
    if (clearCenter) {
      c.clearRect(0, 0, w, w);
      c.fillStyle = 'rgba(255,253,245,0.18)';
      c.beginPath();
      c.arc(cx, cx, R, 0, 7);
      c.fill();
    }
    c.strokeStyle = '#1d2433';
    c.fillStyle = '#1d2433';
    c.lineWidth = 3;
    c.beginPath();
    c.arc(cx, cx, R, 0, 7);
    c.stroke();
    c.textAlign = 'center';
    c.font = 'bold 30px sans-serif';
    for (let k = 0; k < 360; k++) {
      const a = (k * Math.PI) / 180,
        major = k % 10 === 0,
        mid = k % 5 === 0;
      const r0 = R - (major ? 34 : mid ? 24 : 14);
      c.lineWidth = major ? 3 : 1.6;
      c.beginPath();
      c.moveTo(cx + Math.sin(a) * R, cx - Math.cos(a) * R);
      c.lineTo(cx + Math.sin(a) * r0, cx - Math.cos(a) * r0);
      c.stroke();
      if (major) {
        const v = k <= 90 ? k : k <= 180 ? 180 - k : k <= 270 ? k - 180 : 360 - k;
        c.fillText(String(v), cx + Math.sin(a) * (R - 56), cx - Math.cos(a) * (R - 56) + 10);
      }
    }
  });
}
