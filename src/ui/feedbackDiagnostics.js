import { OFFLINE } from '../content/index.js';
import { lastRuntimeError } from './runtimeErrors.js';
const KEY = 'livebook.last-import-error';
export function rememberImportError(error, stage) {
  const entry = {stage, type:error?.name || 'Error', time:new Date().toISOString()};
  // Runtime failures help diagnose compatibility; never include PDF names or contents.
  if (['TypeError','ReferenceError','SyntaxError'].includes(entry.type)) entry.detail=String(error.message || '').slice(0,180);
  try { sessionStorage.setItem(KEY,JSON.stringify(entry)); } catch {}
}
export function clearImportError() { try {sessionStorage.removeItem(KEY);} catch {} }
export function feedbackDiagnostics() {
  let lastError=null;
  try {lastError=JSON.parse(sessionStorage.getItem(KEY));} catch {}
  // visible：浏览器实际露出来的那块（有的 App 内浏览器底栏会盖住页面最下面一截，和 viewport 对比就看得出来）；lastRuntimeError：最近一次运行出错
  const vv=window.visualViewport, visible=vv?`${Math.round(vv.width)}x${Math.round(vv.height)}`:null;
  return JSON.stringify({build:__APP_BUILD__,mode:OFFLINE?'offline':'online',browser:navigator.userAgent,platform:navigator.platform,viewport:`${innerWidth}x${innerHeight}`,visible,lastImportError:lastError,lastRuntimeError:lastRuntimeError()});
}
