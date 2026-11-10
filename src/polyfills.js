// 老一点的手机浏览器（iOS 15.0–15.3、Chrome 92 以前）还没有的几个小函数，活页里用到了：补上，免得点开就报错。
// 语法上的兼容由构建目标管（vite.config.js 的 target：iOS 15 / Chrome 87）
const def = (o, k, v) => { if (!(k in o)) Object.defineProperty(o, k, { value: v, configurable: true, writable: true }); };
function at(i) { i = Math.trunc(i) || 0; if (i < 0) i += this.length; return i < 0 || i >= this.length ? undefined : this[i]; }
for (const C of [Array, String, Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array]) def(C.prototype, 'at', at);
def(Object, 'hasOwn', (o, k) => Object.prototype.hasOwnProperty.call(o, k));
