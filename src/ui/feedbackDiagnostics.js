import { OFFLINE } from '../content/index.js';
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
  return JSON.stringify({build:__APP_BUILD__,mode:OFFLINE?'offline':'online',browser:navigator.userAgent,platform:navigator.platform,viewport:`${innerWidth}x${innerHeight}`,lastImportError:lastError});
}
