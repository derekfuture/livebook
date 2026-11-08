const BASE = 'APx3b8dxJa6URAsFa0ccss47nSh';
const TABLE = 'tblaj7rfvIbJ6Joa';
const MAX = 20 * 1024 * 1024;
const json = (data, status = 200) => Response.json(data, {status, headers:{'Cache-Control':'no-store'}});
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/feedback') return env.ASSETS.fetch(request);
    if (request.method !== 'POST') return json({error:'Method not allowed'},405);
    if (request.headers.get('Origin') !== url.origin) return json({error:'请求来源无效。'},403);
    if (!env.FEISHU_APP_ID || !env.FEISHU_APP_SECRET) return json({error:'提交服务暂时不可用，请稍后重试。'},503);
    try {
      if (!request.headers.get('Content-Type')?.startsWith('multipart/form-data')) return json({error:'格式不正确。'},400);
      const reader=request.body.getReader(); const chunks=[]; let size=0;
      while (true) { const {done,value}=await reader.read(); if(done) break; size+=value.length; if(size>MAX+65536){await reader.cancel();return json({error:'图片总大小请控制在 20 MB 内。'},413);} chunks.push(value); }
      const form=await new Response(new Blob(chunks),{headers:{'Content-Type':request.headers.get('Content-Type')}}).formData();
      const field=(key,max)=>{const v=form.get(key)??'';if(typeof v!=='string'||v.length>max)throw new Error('validation');return v.trim();};
      const message=field('message',2000), name=field('name',60), contact=field('contact',160), source=field('source',1000), page=field('page',2000);
      const id=field('id',36);
      if(!message || !/^[0-9a-f-]{36}$/i.test(id)) return json({error:'请填写具体的问题或建议。'},400);
      const images=form.getAll('images');
      if(images.length>6 || images.some(f=>typeof f==='string'|| !['image/png','image/jpeg','image/webp','image/gif'].includes(f.type)||f.size>10*1024*1024)||images.reduce((s,f)=>s+f.size,0)>MAX) return json({error:'最多 6 张图片，单张 10 MB、合计 20 MB 以内。'},400);
      async function api(path, init) {
        const res=await fetch('https://open.feishu.cn/open-apis/'+path,{...init,signal:AbortSignal.timeout(45000)});
        const data=await res.json();if(!res.ok || data.code!==0) throw new Error('upstream:'+data.code);return data;
      }
      const token=await api('auth/v3/tenant_access_token/internal',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({app_id:env.FEISHU_APP_ID,app_secret:env.FEISHU_APP_SECRET})});
      const headers={Authorization:'Bearer '+token.tenant_access_token}; const attachments=[];
      for(const file of images){
        const upload=new FormData();upload.set('file_name',file.name.slice(0,120));upload.set('parent_type','bitable_image');upload.set('parent_node',BASE);upload.set('size',String(file.size));upload.set('file',file);
        const result=await api('drive/v1/medias/upload_all',{method:'POST',headers,body:upload});
        attachments.push({file_token:result.data.file_token});
      }
      const fields={'反馈内容':message,'怎么称呼你':name,'联系方式':contact,'反馈来源':source,'页面链接':page};
      if(attachments.length)fields['图片附件']=attachments;
      const result=await api(`bitable/v1/apps/${BASE}/tables/${TABLE}/records?client_token=${id}`,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({fields})});
      if(!result.data?.record?.record_id)throw new Error('missing record');
      return json({ok:true});
    } catch(error) {
      if(error.message==='validation')return json({error:'内容过长，请精简后重试。'},400);
      console.error('feedback delivery failed',error.message.startsWith('upstream:')?error.message:'request failed');
      return json({error:'暂时未能确认提交成功，内容已保留，请重试。'},502);
    }
  }
};
