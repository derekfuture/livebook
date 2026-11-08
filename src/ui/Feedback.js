import { h } from './Panel.js';
import { fileUrl } from '../content/index.js';

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
  const images = [...(draft.images || [])];
  let reading = 0;
  const message = h('textarea', {id:'fb-message', rows:5, maxlength:2000, required:true,
    placeholder:'比如：拖动仪器时没有反应，或希望增加一个实验……'});
  message.value = draft.message || '';
  const name = h('input', {id:'fb-name', maxlength:60, autocomplete:'name', placeholder:'如：王老师，初中化学'});
  name.value = draft.name ?? saved.name ?? '';
  const contact = h('input', {id:'fb-contact', maxlength:160, placeholder:'微信或邮箱', autocomplete:'off'});
  contact.value = draft.contact ?? saved.contact ?? '';
  const saveProfile = () => {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify({name:name.value,contact:contact.value})); } catch {}
  };
  name.addEventListener('input', saveProfile);
  contact.addEventListener('input', saveProfile);
  const count = h('span', {}, `${message.value.length} / 2000`);
  const status = h('p', {class:'fb-status',role:'status'});
  const preview = h('div', {class:'fb-images'});
  function viewImage(src, title) {
    const lightbox = h('dialog',{class:'fb-lightbox','aria-label':title},
      h('button',{type:'button',class:'fb-close','aria-label':'关闭图片',onclick:()=>lightbox.close()},'×'),
      h('img',{src,alt:title}));
    lightbox.addEventListener('close',()=>lightbox.remove(),{once:true});
    lightbox.addEventListener('keydown',e=>e.stopPropagation());
    document.body.append(lightbox); lightbox.showModal();
  }
  function renderImages() {
    preview.replaceChildren(...images.map((image,index)=>h('div',{class:'fb-image'},
      h('button',{type:'button',class:'fb-thumb',title:'查看图片',onclick:()=>viewImage(image.src,image.name)},
        h('img',{src:image.src,alt:image.name})),
      h('button',{type:'button',class:'fb-delete','aria-label':`删除图片 ${index+1}`,onclick:()=>{
        images.splice(index,1);renderImages();
      }},'×'))));
  }
  async function addFiles(files) {
    for (const file of files) {
      if (!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type)) {
        status.textContent = '请选择 PNG、JPG、WebP 或 GIF 图片。'; continue;
      }
      if (images.length + reading >= 6) {status.textContent='最多添加 6 张图片。';break;}
      if (file.size > 10*1024*1024) {status.textContent='单张图片请小于 10 MB。';continue;}
      reading++;
      try {
        const src = await new Promise((resolve,reject)=>{
          const reader=new FileReader();reader.onload=()=>resolve(reader.result);
          reader.onerror=()=>reject(reader.error);reader.readAsDataURL(file);
        });
        images.push({src,name:file.name || '粘贴的图片'});renderImages();
      } catch {status.textContent='图片读取失败，请重新添加。';}
      finally {reading--;}
    }
  }
  const picker = h('input',{type:'file',accept:'image/png,image/jpeg,image/webp,image/gif',multiple:true,hidden:true});
  picker.addEventListener('change',()=>{addFiles([...picker.files]);picker.value='';});
  message.addEventListener('paste',e=>{
    const files=[...(e.clipboardData?.items || [])].filter(i=>i.kind==='file' && i.type.startsWith('image/')).map(i=>i.getAsFile()).filter(Boolean);
    if (files.length) {e.preventDefault();addFiles(files);}
  });
  const attach = h('button', {type:'button',class:'fb-attach',onclick:()=>{
    if (images.length + reading >= 6) {status.textContent='最多添加 6 张图片。';return;}
    try {
      images.push({src:context.capture(),name:'当前实验场景'});renderImages();
    } catch {status.textContent='截图失败，请重试。';}
  }},svg(camera),'截取当前实验');
  attach.hidden = !context.capture;
  const dialog = h('dialog',{class:'fb-dialog','aria-labelledby':'fb-title'});
  dialog.addEventListener('keydown',e=>e.stopPropagation());
  dialog.addEventListener('close',()=>{
    drafts.set(key,{message:message.value,name:name.value,contact:contact.value,images});
    dialog.remove(); previous?.focus();
  },{once:true});
  message.addEventListener('input',()=>{ count.textContent=`${message.value.length} / 2000`; message.setCustomValidity(''); });
  const field = (id,title,control) => h('label',{class:'fb-field',for:id},h('span',{},title,h('small',{},'选填')),control);
  const form = h('form',{class:'fb-form',onsubmit:e=>{
    e.preventDefault();
    if (!message.value.trim()) {message.setCustomValidity('先写一点具体的问题或建议吧。');message.reportValidity();return;}
    saveProfile();
    // The UI is reviewable before the server endpoint is configured. Never fake delivery.
    status.textContent = '暂未接通提交服务，内容已保留。';
  }});
  form.append(
    h('div',{class:'fb-message-label'},h('label',{for:'fb-message'},'哪里可以更好？'),count),
    message,
    h('div',{class:'fb-attachment-row'},h('button',{type:'button',class:'fb-add-images',onclick:()=>picker.click()},svg(camera),'添加图片'),picker),preview,
    h('div',{class:'fb-identity'},field('fb-name','怎么称呼你',name),field('fb-contact','联系方式',contact)),
    status,
    h('div',{class:'fb-actions'},h('button',{class:'fb-primary',type:'submit'},'提交反馈',svg(arrow))));
  const account = h('details',{class:'fb-account'},
    h('summary',{},
      h('img',{src:fileUrl('/brand/gzh-avatar.jpg'),width:34,height:34,alt:''}),
      h('span',{},h('b',{},'德里克的 AI 教学实验室'),h('small',{},'用 AI 做真实的教学实践，一起探索未来教育')),
      h('span',{class:'fb-account-action'},'公众号 ↗')),
    h('div',{class:'fb-account-qr'},h('img',{src:fileUrl('/brand/gzh-qr.jpg'),width:156,height:156,alt:'德里克的 AI 教学实验室公众号二维码'})));
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
        h('div',{class:'fb-divider'}),attach),
      form),account);
  renderImages();
  document.body.append(dialog); dialog.showModal(); message.focus({preventScroll:true});
}
