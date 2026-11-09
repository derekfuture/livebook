import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

test('PDF loads when classroom browser Promise and Math helpers are absent',()=>{
  const result=spawnSync(process.execPath,['--input-type=module','-e',`
    Promise.withResolvers=undefined;Math.sumPrecise=undefined;
    await import('./src/book/pdfCompatibility.js');
    const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
    const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] /Resources << >> >>'];
    let file='%PDF-1.4\\n', offsets=[0];
    objects.forEach((object,i)=>{offsets.push(file.length);file+=(i+1)+' 0 obj\\n'+object+'\\nendobj\\n';});
    const start=file.length;
    file+='xref\\n0 4\\n0000000000 65535 f \\n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \\n').join('')+'trailer\\n<< /Size 4 /Root 1 0 R >>\\nstartxref\\n'+start+'\\n%%EOF';
    const task=getDocument({data:new TextEncoder().encode(file),verbosity:0});
    const doc=await task.promise;
    if(doc.numPages!==1)throw new Error('incorrect page count');
    await doc.getPage(1);await task.destroy();
  `],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
});
