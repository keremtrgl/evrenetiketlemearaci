const A=globalThis.EvrenAnnotations,C=globalThis.EvrenClassifier;
const $=id=>document.getElementById(id);
const canvas=$('canvas'),ctx=canvas.getContext('2d');
let items=[],current=-1,bitmap=null,selected=null,tool='select',draft=[],drag=null,zoom=0,busy=false,stopped=false,worker=null,sequence=0,ownReady=false;
const calls=new Map();
let dbPromise;
function db(){
  if(!dbPromise) dbPromise=new Promise((resolve,reject)=>{
    const request=indexedDB.open('kerem-local-labels-v1',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('drafts',{keyPath:'id'});
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  });return dbPromise;
}
async function getDraft(id){const database=await db();return new Promise((resolve,reject)=>{const r=database.transaction('drafts').objectStore('drafts').get(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
function record(item){return {id:item.id,name:item.name,width:item.width,height:item.height,coordinateSpace:item.coordinateSpace||'original-image',source:item.source||null,annotations:structuredClone(item.annotations),updatedAt:Date.now()};}
async function save(item){
  try{const database=await db();const data=record(item);await new Promise((resolve,reject)=>{const t=database.transaction('drafts','readwrite');t.objectStore('drafts').put(data);t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);});$('save-state').textContent='Taslak kaydedildi';}
  catch{$('save-state').textContent='Kayıt başarısız';status('Yerel taslak kaydedilemedi. Etiketlerini dosyaya aktar.',true);}
}
function status(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error);}
function active(){return items[current];}
function escapeName(name){return name.replace(/[^\p{L}\p{N}_.-]+/gu,'_').slice(0,100)||'etiketler';}
function download(name,text,type='application/json'){
  const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
async function dataURL(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('Görsel dosyası okunamadı'));r.readAsDataURL(file);});}
async function imageData(item){return item.dataUrl||dataURL(item.file);}
async function hash(blob){const bytes=await blob.arrayBuffer();const digest=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');}
function setBusy(value){
  busy=value;
  for(const id of ['detect','batch','capture','demo','load-own','files','own-model','own-labels','input-size']) $(id).disabled=value;
  $('stop').disabled=!value;$('classify').disabled=value||!ownReady;
}
function model(){
  if(worker) return worker;
  worker=new Worker('dist/worker.js',{type:'module'});
  worker.onmessage=({data:m})=>{
    const pending=calls.get(m.id);if(!pending)return;
    if(m.type==='progress'){
      $('progress').hidden=false;$('progress').value=m.progress.progress||0;
      $('engine-state').textContent=(m.progress.status==='progress'?'Model indiriliyor':m.progress.status)+' '+m.progress.file;
    }else{
      calls.delete(m.id);m.type==='error'?pending.reject(new Error(m.message)):pending.resolve(m);
    }
  };
  worker.onerror=()=>{
    for(const pending of calls.values())pending.reject(new Error('Yerel motor başlatılamadı. Uzantıyı yenileyip tekrar dene.'));
    calls.clear();worker?.terminate();worker=null;ownReady=false;$('classify').disabled=true;
  };return worker;
}
function run(type,payload,transfer=[]){return new Promise((resolve,reject)=>{const id=++sequence;calls.set(id,{resolve,reject});try{model().postMessage({id,type,...payload},transfer);}catch(e){calls.delete(id);reject(e);}});}
function cancel(){
  stopped=true;worker?.terminate();worker=null;ownReady=false;
  for(const p of calls.values())p.reject(new Error('Yerel işlem durduruldu'));calls.clear();
  $('own-status').textContent='Motor durduruldu. Tür önerisi için modeli yeniden yükle.';
  $('progress').hidden=true;status('Yerel işlem durduruldu. Mevcut etiketler korundu.');
}
function renderQueue(){
  $('items').replaceChildren();
  items.forEach((item,i)=>{
    const li=document.createElement('li'),b=document.createElement('button');b.className=i===current?'current':'';b.textContent=item.name;
    const small=document.createElement('small');small.textContent=item.annotations.length+' etiket · '+(item.analyzed?'analiz edildi':'bekliyor');b.append(small);b.onclick=()=>!busy&&open(i).catch(e=>status(e.message,true));li.append(b);$('items').append(li);
  });
  $('position').textContent=items.length?`${current+1} / ${items.length}`:'0 / 0';
  $('previous').disabled=busy||current<=0;$('next').disabled=busy||current>=items.length-1;
  $('total').textContent=items.length+' görsel · '+items.reduce((n,i)=>n+i.annotations.length,0)+' etiket';
}
function renderAnnotations(){
  const item=active();$('annotations').replaceChildren();$('annotation-count').textContent=String(item?.annotations.length||0);
  for(const a of item?.annotations||[]){
    const row=document.createElement('div');row.className='annotation'+(a.id===selected?' active':'');
    const check=document.createElement('input');check.type='checkbox';check.checked=!!a.reviewed;check.setAttribute('aria-label',a.label+' incelendi');check.disabled=busy;check.onchange=()=>{snapshot();a.reviewed=check.checked;changed();};
    const button=document.createElement('button');button.textContent=a.label;button.disabled=busy;button.onclick=()=>{selected=a.id;$('class-name').value=a.label;renderAnnotations();draw();};
    const score=document.createElement('small');score.textContent=a.score===null||a.score===undefined?'Elle':Math.round(a.score*100)+'% öneri';
    row.append(check,button,score);$('annotations').append(row);
  }
  $('undo').disabled=busy||!item?.undo.length;$('redo').disabled=busy||!item?.redo.length;
}
function snapshot(){const item=active();if(!item)return;item.undo.push(structuredClone(item.annotations));item.undo=item.undo.slice(-40);item.redo=[];}
function changed(){const item=active();if(!item)return;renderAnnotations();renderQueue();draw();save(item);updateClasses();}
function updateClasses(){
  const labels=[...new Set(items.flatMap(i=>i.annotations.map(a=>a.label)))];
  $('classes').replaceChildren(...labels.map(label=>{const o=document.createElement('option');o.value=label;return o;}));
}
function fit(){
  if(!bitmap)return;const stage=$('stage');const scale=zoom||Math.min((stage.clientWidth-42)/bitmap.width,(stage.clientHeight-42)/bitmap.height,2);
  canvas.style.width=Math.max(1,bitmap.width*scale)+'px';canvas.style.height=Math.max(1,bitmap.height*scale)+'px';$('zoom-value').textContent=Math.round(scale*100)+'%';
}
function path(a){
  ctx.beginPath();if(a.type==='box'){const [x1,y1,x2,y2]=a.geometry;ctx.rect(x1*canvas.width,y1*canvas.height,(x2-x1)*canvas.width,(y2-y1)*canvas.height);}
  else{a.geometry.forEach(([x,y],i)=>i?ctx.lineTo(x*canvas.width,y*canvas.height):ctx.moveTo(x*canvas.width,y*canvas.height));ctx.closePath();}
}
function draw(){
  if(!bitmap)return;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0);
  const scale=canvas.width/(canvas.getBoundingClientRect().width||canvas.width),line=2*scale;
  for(const a of active().annotations){
    path(a);ctx.fillStyle=a.id===selected?'#6ae3cc30':'#7bdacb12';ctx.fill();ctx.strokeStyle=a.reviewed?'#6ae3cc':'#efbf72';ctx.lineWidth=a.id===selected?line*1.8:line;ctx.stroke();
    const [x,y]=A.bounds(a);ctx.font=`${Math.max(10,12*scale)}px Segoe UI`;const text=a.label;const w=ctx.measureText(text).width+10*scale;const top=Math.max(0,y*canvas.height-20*scale);ctx.fillStyle='#152a29ee';ctx.fillRect(x*canvas.width,top,w,20*scale);ctx.fillStyle='#eaf9f5';ctx.fillText(text,x*canvas.width+5*scale,top+14*scale);
    if(a.id===selected){const pts=a.type==='box'?[[a.geometry[0],a.geometry[1]],[a.geometry[2],a.geometry[3]]]:a.geometry;ctx.fillStyle='#d7fff2';for(const [px,py] of pts)ctx.fillRect(px*canvas.width-3*scale,py*canvas.height-3*scale,6*scale,6*scale);}
  }
  if(draft.length){ctx.beginPath();draft.forEach(([x,y],i)=>i?ctx.lineTo(x*canvas.width,y*canvas.height):ctx.moveTo(x*canvas.width,y*canvas.height));ctx.strokeStyle='#6ae3cc';ctx.lineWidth=line;ctx.stroke();for(const [x,y]of draft){ctx.fillStyle='#6ae3cc';ctx.fillRect(x*canvas.width-3*scale,y*canvas.height-3*scale,6*scale,6*scale);}}
}
async function open(index){
  if(index<0||index>=items.length)return;
  const item=items[index];current=index;selected=null;draft=[];drag=null;zoom=0;
  const data=await imageData(item);const blob=await(await fetch(data)).blob();const nextBitmap=await createImageBitmap(blob);
  if(current!==index){nextBitmap.close();return;}
  if(nextBitmap.width*nextBitmap.height>25000000){nextBitmap.close();throw new Error('Görsel 25 megapikselden büyük. Önce küçültün.');}
  bitmap?.close();bitmap=nextBitmap;
  item.width=bitmap.width;item.height=bitmap.height;
  if(!item.restored){
    try{const stored=await getDraft(item.id);if(stored && stored.width===item.width && stored.height===item.height){item.annotations=stored.annotations.filter(a=>{try{return !!A.validate(a);}catch{return false;}});status('Yerel etiket taslağı geri yüklendi.');}}catch{status('Yerel kayıt okunamadı; çalışmaya devam edebilirsin.',true);}item.restored=true;
  }
  if(active()!==item)return;
  canvas.width=bitmap.width;canvas.height=bitmap.height;canvas.hidden=false;$('empty').hidden=true;$('image-name').textContent=item.name;
  $('image-info').textContent=`${item.width} × ${item.height} · `+(item.coordinateSpace==='rendered-image'?'Evren tuvali — özgün boyutları kontrol et':'Özgün dosya');
  renderQueue();renderAnnotations();updateClasses();fit();draw();$('species').replaceChildren();
}
async function addFiles(files){
  if(busy)return;
  for(const file of [...files].slice(0,200-items.length)){
    if(!['image/png','image/jpeg','image/webp','image/bmp'].includes(file.type)||file.size>60000000){status(file.name+': desteklenmeyen biçim veya 60 MB sınırı aşıldı',true);continue;}
    const id=await hash(file);if(items.some(i=>i.id===id))continue;
    items.push({id,name:file.name,file,annotations:[],undo:[],redo:[],coordinateSpace:'original-image'});
  }
  renderQueue();if(current<0 && items.length)await open(0);
}
function point(e){const r=canvas.getBoundingClientRect();return [Math.min(1,Math.max(0,(e.clientX-r.left)/r.width)),Math.min(1,Math.max(0,(e.clientY-r.top)/r.height))];}
function create(type,geometry){
  const a={id:crypto.randomUUID(),type,label:$('class-name').value.trim(),geometry,source:'manual',score:null,reviewed:false};A.validate(a);snapshot();active().annotations.push(a);selected=a.id;changed();
}
function finishPolygon(){if(draft.length>=3){try{create('polygon',structuredClone(draft));draft=[];draw();}catch(e){status(e.message,true);}}}
function setTool(value){tool=value;draft=[];drag=null;document.querySelectorAll('[data-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tool===value)));draw();}
canvas.onpointerdown=e=>{
  if(busy||!bitmap)return;canvas.focus();const p=point(e);
  if(tool==='polygon'){draft.push(p);draw();return;}
  if(tool==='box'){drag={kind:'new',start:p};canvas.setPointerCapture(e.pointerId);return;}
  const found=[...active().annotations].reverse().find(a=>{const [x1,y1,x2,y2]=A.bounds(a);return p[0]>=x1&&p[0]<=x2&&p[1]>=y1&&p[1]<=y2;});
  if(found){selected=found.id;$('class-name').value=found.label;snapshot();drag={kind:'move',start:p,original:structuredClone(found.geometry),id:found.id};
    const rect=canvas.getBoundingClientRect();const pts=found.type==='box'?[[found.geometry[0],found.geometry[1]],[found.geometry[2],found.geometry[3]]]:found.geometry;
    const corner=pts.findIndex(q=>Math.hypot((q[0]-p[0])*rect.width,(q[1]-p[1])*rect.height)<12);
    if(corner>=0){drag.kind='resize';drag.corner=corner;}canvas.setPointerCapture(e.pointerId);
  }else selected=null;renderAnnotations();draw();
};
canvas.onpointermove=e=>{
  if(!drag||busy)return;const p=point(e);
  if(drag.kind==='new'){
    draw();const s=drag.start;ctx.strokeStyle='#6ae3cc';ctx.lineWidth=2*canvas.width/canvas.getBoundingClientRect().width;ctx.strokeRect(s[0]*canvas.width,s[1]*canvas.height,(p[0]-s[0])*canvas.width,(p[1]-s[1])*canvas.height);return;
  }
  const a=active().annotations.find(a=>a.id===drag.id);if(!a)return;
  if(drag.kind==='resize'){
    if(a.type==='box'){const g=[...drag.original];if(drag.corner===0){g[0]=Math.min(p[0],g[2]-.001);g[1]=Math.min(p[1],g[3]-.001);}else{g[2]=Math.max(p[0],g[0]+.001);g[3]=Math.max(p[1],g[1]+.001);}a.geometry=g;}
    else{a.geometry=structuredClone(drag.original);a.geometry[drag.corner]=p;}
  }else{
    const original={...a,geometry:drag.original},[x1,y1,x2,y2]=A.bounds(original);
    const dx=Math.max(-x1,Math.min(1-x2,p[0]-drag.start[0])),dy=Math.max(-y1,Math.min(1-y2,p[1]-drag.start[1]));
    a.geometry=a.type==='box'?[x1+dx,y1+dy,x2+dx,y2+dy]:drag.original.map(([x,y])=>[x+dx,y+dy]);
  }
  a.reviewed=false;draw();
};
canvas.onpointerup=e=>{
  if(!drag)return;const d=drag;drag=null;
  if(d.kind==='new'){const p=point(e),s=d.start;if(Math.abs(p[0]-s[0])>.002 && Math.abs(p[1]-s[1])>.002){try{create('box',[Math.min(p[0],s[0]),Math.min(p[1],s[1]),Math.max(p[0],s[0]),Math.max(p[1],s[1])]);}catch(err){status(err.message,true);}}}
  else{const a=active().annotations.find(a=>a.id===d.id);try{A.validate(a);}catch{a.geometry=d.original;}changed();}
  draw();
};
canvas.ondblclick=()=>tool==='polygon'&&finishPolygon();
canvas.onpointercancel=()=>{if(drag?.id){const a=active().annotations.find(a=>a.id===drag.id);if(a)a.geometry=drag.original;}drag=null;draw();};
async function detectItem(item){
  const data=await imageData(item);status(item.name+' yerel modelle analiz ediliyor…');
  const result=await run('DETECT',{image:data,threshold:Number($('threshold').value)});
  if(stopped)return;
  const {annotations,rejected}=A.fromDetections(result.results,item.width,item.height,Number($('threshold').value));
  if(item===active())snapshot();
  const existing=new Set(item.annotations.map(a=>a.label+JSON.stringify(a.geometry.map(n=>Math.round(n*1000)))));
  for(const a of annotations){const key=a.label+JSON.stringify(a.geometry.map(n=>Math.round(n*1000)));if(!existing.has(key)){item.annotations.push(a);existing.add(key);}}
  item.analyzed=true;await save(item);
  if(item===active())changed();else renderQueue();
  $('engine-state').textContent='Yerel model hazır. Model puanları doğruluk garantisi değildir.';
  status(`${annotations.length} kutu önerildi${rejected?'; '+rejected+' geçersiz sonuç ayrıldı':''}. Sınıfları ve sınırları incele.`);
}
async function doDetect(batch=false){
  if(!active()){status('Önce bir görsel aç.',true);return;}stopped=false;setBusy(true);
  try{
    if(batch){for(let i=0;i<items.length&&!stopped;i++){const item=items[i];if(item.annotations.length){$('queue-status').textContent=(i+1)+' / '+items.length+' · mevcut etiketler korundu';continue;}await open(i);await detectItem(item);$('queue-status').textContent=(i+1)+' / '+items.length+' işlendi';}}
    else await detectItem(active());
  }catch(e){status(e.message,true);}finally{setBusy(false);$('progress').hidden=true;renderQueue();renderAnnotations();}
}
$('files').onchange=e=>addFiles(e.target.files).catch(e=>status(e.message,true));
$('demo').onclick=async()=>{
  if(busy)return;
  const demo=document.createElement('canvas');demo.width=640;demo.height=480;const d=demo.getContext('2d');
  d.fillStyle='#dce6e3';d.fillRect(0,0,640,480);d.fillStyle='#b5b1a1';d.fillRect(0,320,640,160);
  d.fillStyle='#25333f';d.fillRect(150,90,330,230);d.fillStyle='#729da5';d.fillRect(165,105,300,200);
  d.fillStyle='#3c4d58';d.beginPath();d.moveTo(150,320);d.lineTo(480,320);d.lineTo(525,370);d.lineTo(105,370);d.closePath();d.fill();
  d.fillStyle='#d5e6e2';d.font='22px Segoe UI';d.fillText('Yerel etiketleme',225,210);
  const url=demo.toDataURL('image/png'),id=await hash(new Blob([url]));const existing=items.findIndex(i=>i.id===id);
  if(existing>=0){await open(existing);return;}if(items.length>=200)return;
  items.push({id,name:'deneme-gorseli.png',dataUrl:url,annotations:[],undo:[],redo:[],coordinateSpace:'original-image'});await open(items.length-1);
};
$('capture').onclick=async()=>{
  try{
    const id=Number(new URL(location.href).searchParams.get('sourceTab'));
    if(!id||!globalThis.chrome?.tabs)throw new Error('Evren etiketleme sekmesindeyken uzantı simgesine tıkla; ardından Evren’den al.');
    const result=await chrome.tabs.sendMessage(id,{type:'CAPTURE_LOCAL_IMAGE'});
    if(!result?.ok)throw new Error(result?.error||'Tuval okunamadı');
    const image=result.image;const itemId=await hash(new Blob([image.dataUrl]));const old=items.findIndex(i=>i.id===itemId);
    if(old>=0){await open(old);return;}if(items.length>=200)throw new Error('200 görsellik çalışma sınırına ulaşıldı');
    items.push({...image,id:itemId,annotations:[],undo:[],redo:[]});await open(items.length-1);status('Tuval belleğe alındı. Evren’de hiçbir etiket değiştirilmedi.');
  }catch(e){status(e.message,true);}
};
$('detect').onclick=()=>doDetect(false);$('batch').onclick=()=>doDetect(true);$('stop').onclick=cancel;
$('previous').onclick=()=>!busy&&open(current-1).catch(e=>status(e.message,true));$('next').onclick=()=>!busy&&open(current+1).catch(e=>status(e.message,true));
$('threshold').oninput=()=>$('threshold-value').textContent='%'+Math.round($('threshold').value*100);
document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>!busy&&setTool(b.dataset.tool));
$('fit').onclick=()=>{zoom=0;fit();draw();};$('zoom-in').onclick=()=>{zoom=(zoom||canvas.getBoundingClientRect().width/canvas.width)*1.25;fit();draw();};$('zoom-out').onclick=()=>{zoom=Math.max(.1,(zoom||canvas.getBoundingClientRect().width/canvas.width)/1.25);fit();draw();};
new ResizeObserver(()=>{if(!zoom){fit();draw();}}).observe($('stage'));
$('undo').onclick=()=>{const i=active();if(!busy&&i?.undo.length){i.redo.push(structuredClone(i.annotations));i.annotations=i.undo.pop();selected=null;changed();}};
$('redo').onclick=()=>{const i=active();if(!busy&&i?.redo.length){i.undo.push(structuredClone(i.annotations));i.annotations=i.redo.pop();selected=null;changed();}};
$('remove').onclick=()=>{if(!busy&&selected){snapshot();active().annotations=active().annotations.filter(a=>a.id!==selected);selected=null;changed();}};
$('rename').onclick=()=>{if(busy)return;const a=active()?.annotations.find(a=>a.id===selected);if(a){try{A.validate({...a,label:$('class-name').value.trim()});snapshot();a.label=$('class-name').value.trim();a.reviewed=false;changed();}catch(e){status(e.message,true);}}};
$('review-all').onclick=()=>{if(!busy&&active()){snapshot();active().annotations.forEach(a=>a.reviewed=true);changed();}};
$('load-own').onclick=async()=>{
  const file=$('own-model').files[0],labelsFile=$('own-labels').files[0];
  if(!file||!labelsFile){status('ONNX modeli ve sıralı sınıf listesini seç.',true);return;}
  if(file.size>200000000||labelsFile.size>2000000){status('Model en fazla 200 MB, sınıf listesi en fazla 2 MB olabilir.',true);return;}
  setBusy(true);stopped=false;
  try{const labels=await labelsFile.text();C.parseLabels(labels);const buffer=await file.arrayBuffer();const result=await run('LOAD_OWN_MODEL',{buffer,labels,size:Number($('input-size').value)},[buffer]);ownReady=true;$('own-status').textContent=file.name+' · '+result.classes+' sınıf · yalnız yerel';status('Kendi modelin yerel belleğe yüklendi.');}
  catch(e){status(e.message,true);}finally{setBusy(false);}
};
$('classify').onclick=async()=>{
  if(!bitmap||!ownReady)return;const item=active(),target=item.annotations.find(a=>a.id===selected);
  const image=new OffscreenCanvas(bitmap.width,bitmap.height),c=image.getContext('2d');c.drawImage(bitmap,0,0);
  let resultCanvas=image;
  if(target){const [x1,y1,x2,y2]=A.bounds(target);resultCanvas=new OffscreenCanvas(Math.max(1,Math.round((x2-x1)*bitmap.width)),Math.max(1,Math.round((y2-y1)*bitmap.height)));resultCanvas.getContext('2d').drawImage(image,x1*bitmap.width,y1*bitmap.height,(x2-x1)*bitmap.width,(y2-y1)*bitmap.height,0,0,resultCanvas.width,resultCanvas.height);}
  setBusy(true);stopped=false;
  try{
    const input=await dataURL(await resultCanvas.convertToBlob({type:'image/png'}));const result=await run('CLASSIFY',{image:input});$('species').replaceChildren();
    for(const prediction of result.results){const b=document.createElement('button');b.textContent=prediction.label+' · %'+(prediction.score*100).toFixed(1);b.onclick=()=>{
      if(active()!==item||busy)return;$('class-name').value=prediction.label;
      if(target){snapshot();target.label=prediction.label;target.reviewed=false;changed();status('Seçili etiketin sınıfı değiştirildi; sınırlarını tekrar incele.');}else status('Tür önerisi seçildi. Yeni çizim bu sınıfla oluşturulacak.');
    };$('species').append(b);}
    $('own-status').textContent=(target?'Seçili nesne':'Tüm görsel')+' · merkez kare kırpma · ilk 5 öneri';
  }catch(e){status(e.message,true);}finally{setBusy(false);}
};
$('export').onclick=()=>{
  try{
    if(!active())throw new Error('Önce bir görsel aç.');
    const only=$('review-only').checked,format=$('format').value;
    const output=items.filter(i=>i.width).map(i=>({...record(i),annotations:i.annotations.filter(a=>!only||a.reviewed)}));
    if(format==='json'){download('kerem-etiketleme-projesi.json',JSON.stringify({version:1,engine:'local',images:output},null,2));return;}
    if(format==='coco'){download('annotations.coco.json',JSON.stringify(A.toCoco(output),null,2));return;}
    const annotations=active().annotations.filter(a=>!only||a.reviewed);if(!annotations.length)throw new Error('Dışa aktarılacak incelenmiş etiket yok.');
    const classes=[...new Set(items.flatMap(i=>i.annotations.map(a=>a.label)))];
    const text=A.toYolo(annotations,classes,format==='yolo-box'?'detection':'segmentation');
    download(escapeName(active().name.replace(/\.[^.]+$/,''))+'.txt',text,'text/plain');download('classes.txt',classes.join('\n'),'text/plain');
  }catch(e){status(e.message,true);}
};
$('backup').onclick=async()=>{
  try{const database=await db();const records=await new Promise((resolve,reject)=>{const r=database.transaction('drafts').objectStore('drafts').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});download('yerel-taslak-yedegi.json',JSON.stringify({version:1,drafts:records},null,2));}catch{status('Yedek oluşturulamadı',true);}
};
document.addEventListener('keydown',e=>{
  if(e.target.matches('input,textarea,select')||busy)return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();$(e.shiftKey?'redo':'undo').click();return;}
  if(e.key==='Escape'){draft=[];drag=null;draw();}
  if(e.key==='Enter'&&tool==='polygon'){e.preventDefault();finishPolygon();}
  if(e.key==='Backspace'&&tool==='polygon'){e.preventDefault();draft.pop();draw();}
  if(e.key==='Delete')$('remove').click();
  if(['v','b','p'].includes(e.key.toLowerCase()))setTool({v:'select',b:'box',p:'polygon'}[e.key.toLowerCase()]);
});
document.addEventListener('dragover',e=>e.preventDefault());document.addEventListener('drop',e=>{e.preventDefault();addFiles(e.dataTransfer.files).catch(err=>status(err.message,true));});
window.addEventListener('beforeunload',e=>{if(busy){e.preventDefault();e.returnValue='';}});
renderQueue();renderAnnotations();
