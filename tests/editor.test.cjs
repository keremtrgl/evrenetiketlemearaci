const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
async function until(fn){for(let n=0;n<150;n++){if(fn())return;await new Promise(r=>setTimeout(r,10));}throw new Error('Editör beklenen duruma gelmedi');}
function fixture(){
  const dom=new JSDOM(fs.readFileSync(path.join(root,'app.html'),'utf8'),{url:'http://localhost:8766/app.html',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,d=w.document;
  w.structuredClone=structuredClone;Object.defineProperty(w.crypto,'subtle',{value:require('node:crypto').webcrypto.subtle});
  w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:()=>({width:10})},{get:(o,key)=>o[key]||(()=>{})});
  w.HTMLCanvasElement.prototype.toDataURL=()=>'data:image/png;base64,'+Buffer.from('demo').toString('base64');
  w.HTMLCanvasElement.prototype.getBoundingClientRect=()=>({left:0,top:0,width:100,height:100});
  w.HTMLCanvasElement.prototype.setPointerCapture=()=>{};
  w.ResizeObserver=class{observe(){}disconnect(){}};
  w.File.prototype.arrayBuffer=async function(){return Uint8Array.from(Buffer.from(this.name)).buffer;};
  w.File.prototype.text=async function(){return '["nesne","Turdus_merula"]';};
  w.FileReader=class{readAsDataURL(file){this.result='data:image/png;base64,'+Buffer.from(file.name||'crop').toString('base64');setTimeout(()=>this.onload(),0);}};
  w.fetch=async url=>({blob:async()=>({name:Buffer.from(String(url).split(',')[1]||'','base64').toString()})});
  w.createImageBitmap=async blob=>{if(blob.name==='bozuk.png')throw new Error('Görsel açılamadı');return {width:100,height:100,close(){}};};
  w.OffscreenCanvas=class{getContext(){return {drawImage(){}};}async convertToBlob(){return {name:'crop'};}};
  const saved=new Map();
  w.indexedDB={open:()=>{const request={};setTimeout(()=>{request.result={transaction:()=>{const t={objectStore:()=>({get:id=>{const r={};setTimeout(()=>{r.result=saved.get(id);r.onsuccess();},0);return r;},put:data=>{saved.set(data.id,data);setTimeout(()=>t.oncomplete(),0);}})};return t;}};request.onsuccess();},0);return request;}};
  w.Worker=class{postMessage(message){setTimeout(()=>this.onmessage({data:{id:message.id,type:'result',loaded:true,classes:2,results:[{label:'Turdus_merula',score:.9}]}}),0);}terminate(){}};
  for(const file of ['core/annotations.js','core/classifier.js','src/app.js'])w.eval(fs.readFileSync(path.join(root,file),'utf8'));
  return {w,d,saved,close:async()=>{await new Promise(r=>setTimeout(r,50));w.close();}};
}
function draw(f){const c=f.d.getElementById('canvas');f.d.querySelector('[data-tool="box"]').click();c.onpointerdown({clientX:10,clientY:10,pointerId:1});c.onpointerup({clientX:70,clientY:80,pointerId:1});}

test('Bozuk görsel açma başarısızsa görünen dosya ve düzenleme hedefi aynı kalır',async()=>{
  const f=fixture();
  try{
    f.d.getElementById('demo').click();await until(()=>f.d.getElementById('image-name').textContent==='deneme-gorseli.png');
    const input=f.d.getElementById('files');Object.defineProperty(input,'files',{value:[new f.w.File(['bad'],'bozuk.png',{type:'image/png'})]});input.dispatchEvent(new f.w.Event('change'));
    await until(()=>f.d.querySelectorAll('#items button').length===2);
    f.d.querySelectorAll('#items button')[1].click();await until(()=>f.d.getElementById('status').textContent==='Görsel açılamadı');
    draw(f);await until(()=>f.saved.size>0);
    assert.equal(f.d.getElementById('image-name').textContent,'deneme-gorseli.png');
    const rows=[...f.d.querySelectorAll('#items button')].map(b=>b.textContent);
    assert.match(rows[0],/1 etiket/);assert.match(rows[1],/0 etiket/);
    assert.equal([...f.saved.values()][0].name,'deneme-gorseli.png');
  }finally{await f.close();}
});

test('Geri al ve yinele sonrasında tür önerisi güncel etikete uygulanır',async()=>{
  const f=fixture();
  try{
    f.d.getElementById('demo').click();await until(()=>f.d.getElementById('image-name').textContent==='deneme-gorseli.png');draw(f);
    for(const id of ['own-model','own-labels'])Object.defineProperty(f.d.getElementById(id),'files',{value:[new f.w.File(['data'],id+'.json')]});
    f.d.getElementById('load-own').click();await until(()=>!f.d.getElementById('classify').disabled);
    f.d.getElementById('classify').click();await until(()=>f.d.querySelector('#species button') && !f.d.getElementById('classify').disabled);
    f.d.getElementById('undo').click();f.d.getElementById('redo').click();f.d.querySelector('#species button').click();
    assert.equal(f.d.querySelector('#annotations button').textContent,'Turdus_merula');
  }finally{await f.close();}
});
