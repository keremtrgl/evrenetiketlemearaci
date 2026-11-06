const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
async function until(fn){for(let n=0;n<150;n++){if(fn())return;await new Promise(r=>setTimeout(r,10));}throw new Error('Editör beklenen duruma gelmedi');}
function fixture(options={}){
  const dom=new JSDOM(fs.readFileSync(path.join(root,'app.html'),'utf8'),{url:'http://localhost:8766/app.html'+(options.cloud?'?mode=evren':''),runScripts:'outside-only',pretendToBeVisual:true});
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
  w.fetch=async url=>{if(options.blockFetch)throw new Error('Failed to fetch');return {blob:async()=>({name:Buffer.from(String(url).split(',')[1]||'','base64').toString()})};};
  w.createImageBitmap=async blob=>{if(blob.name==='bozuk.png')throw new Error('Görsel açılamadı');return {width:100,height:100,close(){}};};
  w.OffscreenCanvas=class{getContext(){return {drawImage(){}};}async convertToBlob(){return {name:'crop'};}};
  const saved=new Map();
  w.indexedDB={open:()=>{const request={};setTimeout(()=>{request.result={transaction:()=>{const t={objectStore:()=>({get:id=>{const r={};setTimeout(()=>{r.result=saved.get(id);r.onsuccess();},0);return r;},put:data=>{saved.set(data.id,data);setTimeout(()=>t.oncomplete(),0);}})};return t;}};request.onsuccess();},0);return request;}};
  const posted=[];
  w.Worker=class{postMessage(message){posted.push(message);setTimeout(()=>this.onmessage({data:{id:message.id,type:'result',loaded:true,classes:2,results:[{label:'Turdus_merula',score:.9}],...options.workerReply?.(message)}}),0);}terminate(){}};
  if(options.chrome){
    const original=options.chrome.tabs.sendMessage;
    w.chrome={...options.chrome,tabs:{...options.chrome.tabs,get:options.chrome.tabs.get|| (async()=>({url:'https://evren.ssyz.org.tr/annotate/id'})),sendMessage:async(id,m)=>{const r=await original(id,m);return m.type==='GET_SITE_CONTEXT'&&r.image?{ok:true,context:{...r.image,ready:true,saveState:'clean'}}:r;}}};
  }
  for(const file of ['core/image.js','core/annotations.js','core/classifier.js','core/model-bank.js','core/site-state.js','core/site-client.js','core/automation.js','src/app.js'])w.eval(fs.readFileSync(path.join(root,file),'utf8'));
  return {w,d,saved,posted,close:async()=>{await new Promise(r=>setTimeout(r,50));w.close();}};
}
function draw(f){const c=f.d.getElementById('canvas');f.d.querySelector('[data-tool="box"]').click();c.onpointerdown({clientX:10,clientY:10,pointerId:1});c.onpointerup({clientX:70,clientY:80,pointerId:1});}
test('Ağ okumaları engelliyken bellekteki görsel doğrudan açılır',async()=>{
  const chrome={tabs:{query:async()=>[{id:15}],sendMessage:async()=>({ok:true,image:{name:'kus.jpg',dataUrl:'data:image/png;base64,a3Vz',sourceToken:'token',source:{path:'/annotate/id',filename:'kus.jpg',position:'1 / 400'},siteClasses:['karatavuk'],existingCount:0}})}};
  const f=fixture({blockFetch:true,cloud:true,chrome});try{
    f.d.getElementById('capture').click();await until(()=>!f.d.getElementById('capture').disabled);
    assert.equal(f.d.getElementById('image-name').textContent,'kus.jpg');
  }finally{await f.close();}
});
async function twoExperts(f){
  for(const name of ['first.onnx','second.onnx']){
    Object.defineProperty(f.d.getElementById('own-model'),'files',{value:[new f.w.File(['x'],name)],configurable:true});
    Object.defineProperty(f.d.getElementById('own-labels'),'files',{value:[new f.w.File(['x'],'labels.json')],configurable:true});
    f.d.getElementById('load-own').click();await until(()=>!f.d.getElementById('load-own').disabled);
  }
  await until(()=>!f.d.getElementById('auto-start').disabled);
}
test('Model sözlükleri farklı yazılsa da açık eşlemeleri ortak çalışma sınıfını belirler',async()=>{
  const context={ready:true,saveState:'clean',source:{path:'/annotate/id',filename:'kus.jpg',position:'1 / 3'},siteClasses:['karatavuk'],existingCount:1,navigationToken:'nav'};
  const chrome={tabs:{query:async()=>[{id:15}],sendMessage:async(id,m)=>{assert.equal(m.type,'GET_SITE_CONTEXT');return {ok:true,context};}}};
  const f=fixture({cloud:true,chrome});try{
    const lists=['["Turdus_merula","other1"]','["turdus_merula","other2"]'];f.w.File.prototype.text=async()=>lists.shift();await twoExperts(f);
    for(const label of ['Turdus_merula','turdus_merula']){f.d.getElementById('mapping-source').value=label;f.d.getElementById('site-class').value='karatavuk';f.d.getElementById('mapping-save').click();await until(()=>f.d.getElementById('mapping-state').textContent.startsWith(label+' →'));}
    f.d.getElementById('auto-limit').value='1';f.d.getElementById('auto-start').click();await until(()=>!f.d.getElementById('capture').disabled);
    assert.equal(f.d.getElementById('auto-skipped').textContent,'1');
  }finally{await f.close();}
});
test('Görsel almadan kaydedilen tür eşlemesi farklı veri setine taşınmaz',async()=>{
  let dataset='one';const chrome={tabs:{query:async()=>[{id:15}],sendMessage:async()=>({ok:true,context:{ready:true,saveState:'clean',source:{path:'/annotate/'+dataset,filename:'kus.jpg',position:'1 / 3'},siteClasses:['karatavuk'],existingCount:0}})}};
  const f=fixture({cloud:true,chrome});try{
    await until(()=>f.d.getElementById('site-class').options.length===2);
    f.d.getElementById('mapping-source').value='Turdus_merula';f.d.getElementById('site-class').value='karatavuk';f.d.getElementById('mapping-save').click();await until(()=>f.d.getElementById('mapping-state').textContent.includes('hatırlandı'));
    dataset='two';f.d.getElementById('connection-check').click();await until(()=>f.d.getElementById('mapping-state').textContent.startsWith('0 kayıtlı'));
    f.d.getElementById('mapping-source').dispatchEvent(new f.w.Event('input'));assert.equal(f.d.getElementById('site-class').value,'');
    dataset='one';f.d.getElementById('connection-check').click();await until(()=>f.d.getElementById('mapping-state').textContent.startsWith('1 kayıtlı'));f.d.getElementById('mapping-source').dispatchEvent(new f.w.Event('input'));assert.equal(f.d.getElementById('site-class').value,'karatavuk');
  }finally{await f.close();}
});
test('Aynı görsel başka sekmede açık olsa da otomasyon sekme değiştiremez',async()=>{
  let tab=15,started=false;const events=[];
  const source={path:'/annotate/id',filename:'kus.jpg',position:'1 / 3'};
  const context={ready:true,saveState:'clean',source,siteClasses:['Turdus_merula'],existingCount:0,navigationToken:'nav'};
  const chrome={tabs:{query:async()=>{const id=tab;if(started)tab=16;return [{id}];},sendMessage:async(id,m)=>{
    if(m.type==='GET_SITE_CONTEXT')return {ok:true,context};
    events.push(m.type+':'+id);
    if(m.type==='CAPTURE_LOCAL_IMAGE')return {ok:true,image:{name:'kus.jpg',dataUrl:'data:image/png;base64,a3Vz',sourceToken:'token',source,siteClasses:context.siteClasses,existingCount:0}};
    return {ok:true};
  }}};
  const f=fixture({cloud:true,chrome});try{await twoExperts(f);started=true;f.d.getElementById('auto-start').click();await until(()=>!f.d.getElementById('capture').disabled);assert.equal(events.some(x=>/DRAW|SAVE|NEXT/.test(x)),false);assert.match(f.d.getElementById('auto-state').textContent,/sekme/i);}finally{await f.close();}
});
test('Sonraki öncesi bağlam okunurken Durdur ilerleme göndermez',async()=>{
  let started=false,reads=0,release;const events=[];
  const source={path:'/annotate/id',filename:'kus.jpg',position:'1 / 3'};
  const context={ready:true,saveState:'clean',source,siteClasses:['Turdus_merula'],existingCount:1,navigationToken:'nav'};
  const chrome={tabs:{query:async()=>[{id:15}],sendMessage:async(id,m)=>{
    if(m.type==='GET_SITE_CONTEXT'){if(started&&++reads===2)await new Promise(r=>release=r);return {ok:true,context};}
    events.push(m.type);return {ok:true};
  }}};
  const f=fixture({cloud:true,chrome});try{await twoExperts(f);started=true;f.d.getElementById('auto-limit').value='2';f.d.getElementById('auto-rate').value='60';f.d.getElementById('auto-start').click();await until(()=>release);f.d.getElementById('auto-stop').click();release();await until(()=>!f.d.getElementById('capture').disabled);assert.deepEqual(events,[]);assert.match(f.d.getElementById('auto-state').textContent,/Durduruldu/);}finally{await f.close();}
});

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

test('Dosya hazırlığı sırasında Durdur yeni ve görünmeyen bir model yüklemez',async()=>{
  const f=fixture();let release;
  try{
    const native=f.w.File.prototype.arrayBuffer;let count=0;
    f.w.File.prototype.arrayBuffer=async function(){if(++count===2)await new Promise(resolve=>release=resolve);return native.call(this);};
    for(const id of ['own-model','own-labels'])Object.defineProperty(f.d.getElementById(id),'files',{value:[new f.w.File(['data'],id+'.json')]});
    f.d.getElementById('load-own').click();await until(()=>release);f.d.getElementById('stop').click();release();
    await until(()=>!f.d.getElementById('load-own').disabled);
    assert.equal(f.posted.filter(m=>m.type==='LOAD_OWN_MODEL').length,0);
    assert.equal(f.d.querySelectorAll('#model-bank .expert').length,0);
  }finally{await f.close();}
});

test('Kırpma kodlanırken Durdur sınıflandırmayı yeniden başlatmaz',async()=>{
  const f=fixture();let release;
  try{
    f.d.getElementById('demo').click();await until(()=>f.d.getElementById('image-name').textContent==='deneme-gorseli.png');
    for(const id of ['own-model','own-labels'])Object.defineProperty(f.d.getElementById(id),'files',{value:[new f.w.File(['data'],id+'.json')]});
    f.d.getElementById('load-own').click();await until(()=>!f.d.getElementById('classify').disabled);
    f.w.FileReader=class{readAsDataURL(){release=()=>{this.result='data:image/png;base64,Y3JvcA==';this.onload();};}};
    f.d.getElementById('classify').click();await until(()=>release);f.d.getElementById('stop').click();release();
    await until(()=>!f.d.getElementById('load-own').disabled);
    assert.equal(f.posted.filter(m=>m.type==='CLASSIFY').length,0);
  }finally{await f.close();}
});

test('Evren modu yalnız son fotoğrafı tutar; kalıcı taslakta fotoğraf bulunmaz',async()=>{
  let photo=1;
  const chrome={tabs:{query:async()=>[{id:15}],sendMessage:async()=>({ok:true,image:{name:'kus'+photo+'.jpg',dataUrl:'data:image/png;base64,'+Buffer.from('kus'+photo).toString('base64'),sourceToken:'token'+photo,source:{path:'/annotate/id',filename:'kus'+photo+'.jpg',position:photo+' / 400'},siteClasses:['karatavuk'],existingCount:0}})}};
  const f=fixture({cloud:true,chrome});
  try{
    f.d.getElementById('capture').click();await until(()=>f.d.getElementById('image-name').textContent==='kus1.jpg'&&!f.d.getElementById('capture').disabled);draw(f);
    photo=2;f.d.getElementById('capture').click();await until(()=>f.d.getElementById('image-name').textContent==='kus2.jpg'&&!f.d.getElementById('capture').disabled);
    assert.equal(f.d.querySelectorAll('#items button').length,1);assert.equal(f.d.getElementById('position').textContent,'1 / 1');
    const first=[...f.saved.values()].find(r=>r.name==='kus1.jpg');assert.equal(first.annotations.length,1);assert.equal(Object.hasOwn(first,'dataUrl'),false);assert.equal(Object.hasOwn(first,'file'),false);
  }finally{await f.close();}
});

test('Geri al/yinele aktarım günlüğünü silmez; aynı etiket tekrar gönderilmez',async()=>{
  let transfers=0;
  const chrome={tabs:{query:async()=>[{id:15}],sendMessage:async(id,message)=>{
    if(message.type==='DRAW_LOCAL_ANNOTATION'){transfers++;return {ok:true,state:'drawn',message:'Çizildi'};}
    return {ok:true,image:{name:'kus.jpg',dataUrl:'data:image/png;base64,a3Vz',sourceToken:'token',source:{path:'/annotate/id',filename:'kus.jpg',position:'1 / 400'},siteClasses:['karatavuk'],existingCount:0}};
  }}};
  const f=fixture({cloud:true,chrome});
  try{
    f.d.getElementById('capture').click();await until(()=>f.d.getElementById('image-name').textContent==='kus.jpg'&&!f.d.getElementById('capture').disabled);draw(f);f.d.getElementById('review-all').click();f.d.getElementById('site-class').value='karatavuk';f.d.getElementById('site-class').dispatchEvent(new f.w.Event('change'));
    f.d.getElementById('site-draw').click();await until(()=>f.d.getElementById('status').textContent==='Çizildi'&&!f.d.getElementById('capture').disabled);
    f.d.getElementById('undo').click();f.d.getElementById('redo').click();f.d.querySelector('#annotations button').click();f.d.getElementById('site-draw').click();
    assert.equal(transfers,1);assert.equal(f.d.getElementById('site-draw').disabled,true);assert.match(f.d.getElementById('transfer-reason').textContent,/zaten denendi/);
    assert.equal(Object.keys([...f.saved.values()][0].transfers).length,1);
  }finally{await f.close();}
});

test('Aynı Evren görselinin önizleme pikselleri değişince taslak ve aktarım günlüğü korunur',async()=>{
  let pixels='one';
  const chrome={tabs:{query:async()=>[{id:15}],sendMessage:async()=>({ok:true,image:{name:'kus.jpg',dataUrl:'data:image/png;base64,'+Buffer.from(pixels).toString('base64'),sourceToken:pixels,source:{path:'/annotate/id',filename:'kus.jpg',position:'1 / 400'},siteClasses:['karatavuk'],existingCount:0}})}};
  const f=fixture({cloud:true,chrome});try{
    f.d.getElementById('capture').click();await until(()=>f.d.getElementById('image-name').textContent==='kus.jpg'&&!f.d.getElementById('capture').disabled);draw(f);await until(()=>f.saved.size>0);
    pixels='two';f.d.getElementById('capture').click();await until(()=>!f.d.getElementById('capture').disabled);
    assert.equal(f.d.querySelectorAll('#annotations .annotation').length,1);assert.equal(f.d.querySelectorAll('#items button').length,1);
  }finally{await f.close();}
});

test('Uygulama iki görseli yerel modellerle çizip kaydeder, sınırda durur',async()=>{
  let position=1;const counts={1:0,2:0,3:0},events=[];
  const source=()=>({path:'/annotate/id',filename:'kus'+position+'.jpg',position:position+' / 3'});
  const context=()=>({ready:true,saveState:'clean',source:source(),siteClasses:['Turdus_merula'],existingCount:counts[position],navigationToken:'nav'+position});
  const chrome={tabs:{query:async()=>[{id:15}],sendMessage:async(id,m)=>{
    if(m.type==='GET_SITE_CONTEXT')return {ok:true,context:context()};
    if(m.type==='CAPTURE_LOCAL_IMAGE')return {ok:true,image:{name:source().filename,dataUrl:'data:image/png;base64,'+Buffer.from('photo'+position).toString('base64'),sourceToken:'photo'+position,source:source(),siteClasses:context().siteClasses,existingCount:counts[position]}};
    if(m.type==='DRAW_LOCAL_ANNOTATION'){events.push('draw'+position);counts[position]++;return {ok:true,message:'Çizildi',state:'drawn'};}
    if(m.type==='SAVE_LOCAL_ANNOTATIONS'){events.push('save'+position);return {ok:true,state:'saved-ui'};}
    if(m.type==='NEXT_LOCAL_IMAGE'){events.push('next'+position);position++;return {ok:true,end:false};}
    throw new Error('Beklenmeyen site komutu');
  }}};
  const f=fixture({cloud:true,chrome,workerReply:m=>m.type==='DETECT'?{results:[{label:'bird',score:.99,box:{xmin:10,ymin:10,xmax:70,ymax:80}}]}:m.type==='CLASSIFY'?{ensemble:{state:'agreement',label:'Turdus_merula',votes:m.modelIds.map(modelId=>({modelId,results:[{label:'Turdus_merula',score:.97},{label:'nesne',score:.02}]}))}}:{}});
  try{
    for(const name of ['first.onnx','second.onnx']){
      Object.defineProperty(f.d.getElementById('own-model'),'files',{value:[new f.w.File(['x'],name)],configurable:true});
      Object.defineProperty(f.d.getElementById('own-labels'),'files',{value:[new f.w.File(['x'],'labels.json')],configurable:true});
      f.d.getElementById('load-own').click();await until(()=>!f.d.getElementById('load-own').disabled);
    }
    await until(()=>!f.d.getElementById('auto-start').disabled);f.d.getElementById('auto-limit').value='2';f.d.getElementById('auto-rate').value='60';f.d.getElementById('auto-start').click();
    await until(()=>f.d.getElementById('auto-completed').textContent==='2');await until(()=>!f.d.getElementById('capture').disabled);
    assert.deepEqual(events,['draw1','save1','next1','draw2','save2']);assert.equal(position,2);assert.equal(f.d.getElementById('auto-skipped').textContent,'0');
  }finally{await f.close();}
});
