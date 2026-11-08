import { h } from './Panel.js';
import { fileUrl } from '../content/index.js';

const icon = (paths) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const chat = icon('<path d="M20 11a8 8 0 0 1-8 8H8l-5 3 1.5-5A8 8 0 1 1 20 11Z"/><path d="M8 9h7M8 13h5"/>');
const wechat = icon('<path d="M14 15a8 8 0 0 1-6 1l-4 2 1-4A6 6 0 1 1 17 7"/><path d="M22 14a5 5 0 0 1-1 3l1 3-3-1a6 6 0 1 1 3-5Z"/><path d="M7 8h.01M12 8h.01M14 13h.01M18 13h.01"/>');

export function feedbackButton(context = {}) {
  return h('button', { class: 'feedback-entry', onclick: () => openFeedback(context) }, h('span', { html: chat }), h('span', {}, context.lesson ? '反馈' : '反馈与建议'));
}
function openFeedback(context) {
  const previous = document.activeElement;
  const field = (name, hint, control) => h('label', {class:'feedback-field'}, h('span', {}, name), control, hint ? h('small', {}, hint) : null);
  const dialog = h('dialog', {class:'feedback-dialog', 'aria-labelledby':'feedback-title'},
    h('button', {class:'feedback-close', 'aria-label':'关闭反馈', onclick:()=>dialog.close()}, '×'),
    h('h2', {id:'feedback-title'}, '反馈与建议'),
    h('p', {class:'feedback-intro'}, '感谢你使用活页课本。使用中遇到问题，或有新的想法，欢迎告诉我。'),
    h('div', {class:'feedback-context'}, context.lesson ? context.title : '首页反馈', context.where ? h('small', {}, context.where) : null),
    field('反馈内容', '', h('textarea', {rows:4,required:true,placeholder:'哪里不好用、哪里需要改，或者希望增加什么……'})),
    field('怎么称呼你（选填）', '', h('input', {placeholder:'比如：王老师，初中化学', autocomplete:'name'})),
    field('联系方式（选填）', '如果愿意进一步交流，可以留下微信或邮箱。', h('input', {placeholder:'微信或邮箱'})),
    h('button', {class:'feedback-submit',disabled:true}, '提交反馈'),
    h('p', {class:'feedback-preview'}, '效果预览，暂不收集或发送填写内容。'));
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  dialog.addEventListener('close',()=>{dialog.remove();previous?.focus();},{once:true});
  document.body.append(dialog); dialog.showModal();
}
export function lessonCommunity(context) {
  const qr = h('div', {class:'lesson-account-popover',id:'lesson-account-qr',role:'region','aria-label':'公众号二维码',hidden:true},
    h('img', {src:fileUrl('/brand/gzh-qr.jpg'),alt:'德里克的 AI 教学实验室公众号二维码',width:168,height:168}),
    h('b', {}, '德里克的 AI 教学实验室'),
    h('p', {}, '用 AI 做真实的教学实践，\n一起探索未来教育'),
    h('small', {}, '新的活页、新的尝试，都在这里分享'),
    h('small', {}, '微信扫一扫，或在微信里长按识别'));
  const trigger = h('button', {class:'lesson-account-trigger','aria-label':'关注公众号','aria-controls':'lesson-account-qr','aria-expanded':'false',html:wechat});
  const account = h('div', {class:'lesson-account'},trigger,qr);
  const setOpen = on => { qr.hidden=!on;trigger.setAttribute('aria-expanded',String(on)); };
  account.addEventListener('pointerenter', e=>{if(e.pointerType!=='touch')setOpen(true);});
  account.addEventListener('pointerleave', ()=>setOpen(false));
  trigger.addEventListener('focus', ()=>setOpen(true));
  trigger.addEventListener('click', ()=>setOpen(true));
  account.addEventListener('focusout',e=>{if(!account.contains(e.relatedTarget))setOpen(false);});
  account.addEventListener('keydown',e=>{if(e.key==='Escape'){setOpen(false);e.stopPropagation();}});
  return h('div', {class:'lesson-community'},account,feedbackButton(context));
}
