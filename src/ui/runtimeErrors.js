// 运行中出的错：记下最近一条，用户提反馈时随诊断信息一起带上（不弹窗、不打扰）。
// 手机 App 里的浏览器（百度、微信……）各有各的毛病，我们手上没有那些机器——反馈里有这一条，才知道是哪一行出的事。
// 同一个错每帧都报时，控制台只打一次。
const KEY = 'livebook.last-runtime-error';
const seen = new Set();

export function rememberRuntimeError(err, where = '') {
  const msg = String(err?.message || err || 'Error').slice(0, 160);
  const at = String(err?.stack || '').split('\n').find((l) => /\.js/.test(l)) || '';
  const entry = { where, type: err?.name || 'Error', msg, at: at.trim().slice(0, 160), time: new Date().toISOString() };
  try { sessionStorage.setItem(KEY, JSON.stringify(entry)); } catch { /* 隐私模式 */ }
  if (!seen.has(where + msg)) { seen.add(where + msg); console.error(`[livebook] ${where}`, err); }
}

// 别处（点按、定时器里）没接住的错也记一笔；浏览器插件自己的错不算
addEventListener('error', (e) => { if (!/^(chrome|moz|safari|ms-browser)-extension:/.test(e.filename || '')) rememberRuntimeError(e.error || e.message, 'window'); });
addEventListener('unhandledrejection', (e) => rememberRuntimeError(e.reason, 'promise'));

export function lastRuntimeError() {
  try { return JSON.parse(sessionStorage.getItem(KEY)); } catch { return null; }
}
