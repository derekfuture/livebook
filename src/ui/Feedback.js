import { h } from './Panel.js';

const PROFILE_KEY = 'livebook.feedback.profile';
const drafts = new Map();
const svg = (d) => h('span', {class:'fb-icon',html:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`});
const camera = '<path d="M4 6h4l2-3h4l2 3h4v14H4z"/><circle cx="12" cy="12" r="4"/>';
const arrow = '<path d="M5 12h14m-5-5 5 5-5 5"/>';
function readProfile() {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {}; } catch { return {}; }
}

export function openFeedback(context = {}) {
  if (document.querySelector('.fb-dialog')) return;
  const previous = document.activeElement;
  const key = context.lesson || 'home';
  const saved = readProfile();
  const draft = drafts.get(key) || {};
  let shot = draft.shot || null;
  let completed = false;
  const message = h('textarea', {id:'fb-message', rows:5, maxlength:2000, required:true,
    placeholder:'比如：拖动仪器时没有反应，或希望增加一个实验……'});
  message.value = draft.message || '';
  const name = h('input', {id:'fb-name', maxlength:60, autocomplete:'name', placeholder:'如：王老师，初中化学'});
  name.value = draft.name ?? saved.name ?? '';
  const contact = h('input', {id:'fb-contact', maxlength:160, placeholder:'微信或邮箱', autocomplete:'off'});
  contact.value = draft.contact ?? saved.contact ?? '';
  const remember = h('input', {type:'checkbox'});
  remember.checked = draft.remember ?? Boolean(saved.name || saved.contact);
  const count = h('span', {}, `${message.value.length} / 2000`);
  const status = h('p', {class:'fb-status',role:'status'});
  const preview = h('div', {class:'fb-shot'});
  const attach = h('button', {type:'button',class:'fb-attach',onclick:()=>{
    try {
      if (!context.capture) throw Error('capture unavailable');
      shot = context.capture();
      renderShot();
      status.textContent = '画面已附上，你可以放大检查或移除。';
    } catch {
      status.textContent = '这次没有截取成功，可以先用文字描述问题。';
    }
  }},svg(camera),h('span',{},'附上实验画面'),h('span',{class:'fb-optional'},'选填'));
  attach.hidden = !context.capture;
  function renderShot() {
    preview.replaceChildren();
    attach.hidden = !!shot || !context.capture;
    if (!shot) return;
    const img = h('img', {src:shot,alt:'本次反馈附带的实验画面'});
    preview.append(h('button', {type:'button',class:'fb-thumb',title:'放大查看截图',onclick:()=>{
      const lightbox = h('dialog',{class:'fb-lightbox','aria-label':'实验画面预览'},
        h('button',{type:'button',class:'fb-close','aria-label':'关闭截图',onclick:()=>lightbox.close()},'×'),
        h('img',{src:shot,alt:'实验画面放大预览'}));
      lightbox.addEventListener('close',()=>lightbox.remove(),{once:true});
      lightbox.addEventListener('keydown',e=>e.stopPropagation());
      document.body.append(lightbox); lightbox.showModal();
    }},img,h('span',{},'放大查看')),
      h('div',{class:'fb-shot-caption'},h('span',{},'实验场景 · 不含操作面板'),
        h('button',{type:'button',onclick:()=>{shot=null;renderShot();status.textContent='已移除画面。';}},'移除')));
  }
  const dialog = h('dialog',{class:'fb-dialog','aria-labelledby':'fb-title'});
  dialog.addEventListener('keydown',e=>e.stopPropagation());
  dialog.addEventListener('close',()=>{
    if (!completed) drafts.set(key,{message:message.value,name:name.value,contact:contact.value,shot,remember:remember.checked});
    dialog.remove(); previous?.focus();
  },{once:true});
  message.addEventListener('input',()=>{ count.textContent=`${message.value.length} / 2000`; message.setCustomValidity(''); });
  remember.addEventListener('change',()=>{
    if (!remember.checked) {
      try { localStorage.removeItem(PROFILE_KEY); } catch {}
    }
  });
  const field = (id,title,control) => h('label',{class:'fb-field',for:id},h('span',{},title,h('small',{},'选填')),control);
  const form = h('form',{class:'fb-form',onsubmit:e=>{
    e.preventDefault();
    if (!message.value.trim()) {message.setCustomValidity('先写一点具体的问题或建议吧。');message.reportValidity();return;}
    let profileNote = '';
    try {
      if (remember.checked) {
        localStorage.setItem(PROFILE_KEY,JSON.stringify({name:name.value.trim(),contact:contact.value.trim()}));
        profileNote = '称呼和联系方式已记在此浏览器。';
      } else localStorage.removeItem(PROFILE_KEY);
    } catch {profileNote = '浏览器未允许保存，下次需要重新填写。';}
    // Preview only: never send or claim a successful real submission.
    completed = true;
    drafts.delete(key);
    dialog.replaceChildren(h('div',{class:'fb-done'},
      h('span',{class:'fb-kicker'},'交互预览 · 未发送'),
      h('div',{class:'fb-done-mark'},'✓'),
      h('h2',{id:'fb-title'},'谢谢你，让活页更好一点'),
      h('p',{},'正式接通后，反馈会送到我的飞书表格。'),
      h('div',{class:'fb-receipt'},h('b',{},context.title || '活页课本首页'),h('p',{},message.value),h('small',{},shot?'已附实验画面':'已附页面信息')),
      h('p',{class:'fb-local-note'},profileNote || '这次只是体验提交流程，没有发送任何内容。'),
      h('button',{type:'button',class:'fb-primary',onclick:()=>dialog.close()},context.lesson?'回到实验':'回到书架')));
    dialog.querySelector('button').focus();
  }});
  form.append(
    h('div',{class:'fb-message-label'},h('label',{for:'fb-message'},'哪里可以更好？'),count),
    message,
    h('div',{class:'fb-identity'},field('fb-name','怎么称呼你',name),field('fb-contact','联系方式',contact)),
    h('label',{class:'fb-remember'},remember,h('span',{},'在此设备记住称呼和联系方式',h('small',{},'下次不用重填，取消勾选即可清除。'))),
    status,
    h('div',{class:'fb-actions'},h('span',{},'这是预览，内容不会发送'),h('button',{class:'fb-primary',type:'submit'},'预览提交效果',svg(arrow))));
  dialog.append(
    h('button',{type:'button',class:'fb-close','aria-label':'关闭反馈',onclick:()=>dialog.close()},'×'),
    h('header',{class:'fb-header'},h('span',{class:'fb-kicker'},'活页课本 / 反馈与建议'),
      h('h2',{id:'fb-title'},'让下一次使用，更顺手。'),
      h('p',{},'遇到的问题、想要的实验，都可以告诉我。')),
    h('div',{class:'fb-layout'},
      h('aside',{class:'fb-context'},h('span',{class:'fb-context-label'},'这条反馈来自'),
        h('h3',{},context.title || '活页课本首页'),
        h('p',{},context.where || '书架与教材浏览'),
        h('div',{class:'fb-bound'},svg('<path d="m5 12 4 4L19 6"/>'),'页面信息已自动带上'),
        h('div',{class:'fb-divider'}),attach,preview,
        h('small',{class:'fb-capture-note'},context.capture?'画面由你选择附上，不会自动上传。':'直接写下你的想法就好。')),
      form));
  renderShot();
  document.body.append(dialog); dialog.showModal(); message.focus({preventScroll:true});
}
