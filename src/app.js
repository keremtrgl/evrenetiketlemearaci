const A=globalThis.EvrenAnnotations,C=globalThis.EvrenClassifier,B=globalThis.EvrenModelBank,S=globalThis.EvrenSiteState,Automation=globalThis.EvrenAutomation;
const $=id=>document.getElementById(id);
const canvas=$('canvas'),ctx=canvas.getContext('2d');
let items=[],current=-1,bitmap=null,selected=null,tool='select',draft=[],drag=null,zoom=0,busy=false,stopped=false,worker=null,sequence=0,ownReady=false;
const calls=new Map();
const experts=[];
const cloudMode=new URL(location.href).searchParams.get('mode')==='evren';
document.body.classList.toggle('cloud-mode',cloudMode);
let dbPromise;
let openRequest=0;
let siteWriting=false;
const siteClient=globalThis.chrome?.tabs?globalThis.EvrenSiteClient.create(chrome):null;
let siteContext=null,contextPending=null,mappings={},mappingsPath='',mappingTarget='',runner=null,reviewQueue=[],automationTab=null,automationPath=null;
function db(){
  if(!dbPromise) dbPromise=new Promise((resolve,reject)=>{
    const request=indexedDB.open('kerem-local-labels-v1',2);
    request.onupgradeneeded=()=>{for(const name of ['drafts','settings'])if(!request.result.objectStoreNames.contains(name))request.result.createObjectStore(name,{keyPath:'id'});};
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  });return dbPromise;
}
async function getDraft(id){const database=await db();return new Promise((resolve,reject)=>{const r=database.transaction('drafts').objectStore('drafts').get(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
function record(item){return {id:item.id,name:item.name,width:item.width,height:item.height,coordinateSpace:item.coordinateSpace||'original-image',source:item.source||null,annotations:structuredClone(item.annotations),transfers:structuredClone(item.transfers||{}),automationNote:item.automationNote||null,updatedAt:Date.now()};}
async function readMappings(path){const database=await db();return new Promise((resolve,reject)=>{const r=database.transaction('settings').objectStore('settings').get(path);r.onsuccess=()=>resolve(r.result?.values||{});r.onerror=()=>reject(r.error);});}
async function writeMappings(path,values){const database=await db();await new Promise((resolve,reject)=>{const t=database.transaction('settings','readwrite');t.objectStore('settings').put({id:path,values:structuredClone(values)});t.oncomplete=resolve;t.onerror=()=>reject(t.error);});}
async function save(item){
  try{const database=await db();const data=record(item);await new Promise((resolve,reject)=>{const t=database.transaction('drafts','readwrite');t.objectStore('drafts').put(data);t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);});$('save-state').textContent='Taslak kaydedildi';return true;}
  catch{$('save-state').textContent='Kayıt başarısız';status('Yerel taslak kaydedilemedi. Etiketlerini dosyaya aktar.',true);return false;}
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
  for(const id of ['detect','batch','capture','demo','load-own','files','own-model','own-labels','own-pack','input-size','domain','pipeline','site-class','mapping-source','allow-existing','mapping-save','connection-check','auto-limit','auto-rate']) $(id).disabled=value;
  $('stop').disabled=!value||siteWriting;$('classify').disabled=value||!ownReady;renderBank();renderSite();
}
function renderSite(){
  const item=active(),a=item?.annotations.find(a=>a.id===selected);
  const target=a?item.id+'|'+a.id+'|'+a.label:'';
  if(target!==mappingTarget){mappingTarget=target;$('mapping-source').value=a?.label||'';$('site-class').value=a?S.mappedClass(a.label,mappings,item.siteClasses||[]):'';}
  const reason=S.transferReason(item,a,siteContext,$('site-class').value,$('allow-existing').checked);
  $('transfer-reason').textContent=reason||'Hazır: yalnız seçili kutu çizilecek.';
  $('site-draw').disabled=busy||!!reason;
  $('site-save').disabled=busy||!item?.annotations.some(a=>item.transfers?.[a.id]?.state==='drawn');
  $('connection-badge').textContent=siteContext?.ready?'Evren bağlı':'Bağlantı bekleniyor';
  $('connection-badge').dataset.ready=String(!!siteContext?.ready);
  $('connection-detail').textContent=siteContext?.ready?`${siteContext.source.position} · ${siteContext.siteClasses.length} sınıf · ${siteContext.existingCount} etiket`:siteContext?.reason||'Evren etiketleme ekranını aç.';
  $('auto-start').disabled=busy||!cloudMode||!siteContext?.ready;
  $('auto-stop').disabled=!runner?.running;
}
async function refreshContext(){
  if(!siteClient){renderSite();return null;}
  if(contextPending)return contextPending;
  contextPending=(async()=>{
    try{const tab=(await chrome.tabs.query({active:true,currentWindow:true}))[0];if(!tab?.id)throw new Error('Etiketleme sekmesini aç');
      const result=await siteClient.request(tab.id,{type:'GET_SITE_CONTEXT'});
      if(!result?.ok||!result.context)throw new Error('Evren sayfasını yenile; eski bağlantı kodu açık kalmış olabilir.');
      siteContext={...result.context,tabId:tab.id};
      if(siteContext.ready){
        updateSiteClasses(siteContext.siteClasses);
        if(mappingsPath!==siteContext.source.path){mappings=await readMappings(siteContext.source.path);mappingsPath=siteContext.source.path;$('mapping-state').textContent=Object.keys(mappings).length+' kayıtlı eşleme · yalnız bu veri seti';}
      }
      if(siteContext.ready&&active()?.sourceTab===tab.id){$('open-workbench')?.setAttribute('href','app.html?sourceTab='+tab.id);}
    }catch(error){siteContext={ready:false,reason:error.message};}
    renderSite();return siteContext;
  })();
  try{return await contextPending;}finally{contextPending=null;}
}
$('connection-check').onclick=()=>refreshContext();
$('site-class').onchange=renderSite;$('allow-existing').onchange=renderSite;
$('mapping-source').oninput=()=>{const name=$('mapping-source').value.trim();$('site-class').value=S.mappedClass(name,mappings,siteContext?.siteClasses||[]);};
function updateSiteClasses(names){
  if(JSON.stringify([...$('site-class').options].slice(1).map(o=>o.value))===JSON.stringify(names))return;
  const selected=$('site-class').value,placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Mevcut sınıfı seç';$('site-class').replaceChildren(placeholder);
  for(const name of names){const o=document.createElement('option');o.value=name;o.textContent=name;$('site-class').append(o);}
  if(names.includes(selected))$('site-class').value=selected;
}
$('mapping-save').onclick=async()=>{
  const label=$('mapping-source').value.trim(),name=$('site-class').value,context=siteContext;
  if(busy||!context?.ready||!label||label.length>160||context.siteClasses.filter(n=>n===name).length!==1){status('Modeldeki tür adını ve tekil mevcut Evren sınıfını seç.',true);return;}
  try{const next={...mappings,[label]:name};await writeMappings(context.source.path,next);if(siteContext?.source?.path!==context.source.path)throw new Error('Veri seti değişti');mappings=next;mappingsPath=context.source.path;$('mapping-state').textContent=label+' → '+name+' eşlemesi hatırlandı.';renderSite();}
  catch{status('Eşleme kaydedilemedi; otomatik çalışma başlatılmadı.',true);}
};
$('diagnostic').onclick=()=>download('evren-tani-raporu.json',JSON.stringify(S.diagnostic({version:'0.5.0',context:siteContext,item:active(),experts,busy}),null,2));
function renderBank(){
  $('model-bank').replaceChildren();
  for(const expert of experts){
    const row=document.createElement('div');row.className='expert';
    const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.checked=expert.enabled;check.disabled=busy;check.onchange=()=>{expert.enabled=check.checked;renderBank();};label.append(check,document.createTextNode(expert.name+' · '+expert.domain+' · '+expert.classes+' sınıf'));
    const remove=document.createElement('button');remove.textContent='Kaldır';remove.disabled=busy;remove.onclick=async()=>{setBusy(true);try{await run('UNLOAD_MODEL',{modelId:expert.id});experts.splice(experts.indexOf(expert),1);}catch(e){status(e.message,true);}finally{ownReady=experts.length>0;setBusy(false);}};
    row.append(label,remove);$('model-bank').append(row);
  }
  const ready=experts.some(e=>e.enabled&&e.domain===$('domain').value);
  $('classify').disabled=busy||!ready;$('pipeline').disabled=busy||!ready;
  const labels=[...new Set(experts.filter(e=>e.enabled&&e.domain===$('domain').value).flatMap(e=>e.labels||[]))];
  $('model-labels').replaceChildren(...labels.map(name=>{const o=document.createElement('option');o.value=name;return o;}));
}
$('domain').onchange=renderBank;
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
    calls.clear();worker?.terminate();worker=null;ownReady=false;experts.length=0;renderBank();
  };return worker;
}
function run(type,payload,transfer=[]){return new Promise((resolve,reject)=>{const id=++sequence;calls.set(id,{resolve,reject});try{model().postMessage({id,type,...payload},transfer);}catch(e){calls.delete(id);reject(e);}});}
function cancel(){
  runner?.stop();
  stopped=true;worker?.terminate();worker=null;ownReady=false;experts.length=0;renderBank();
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
    const score=document.createElement('small');score.textContent=a.ensemble?({agreement:'Uzlaşma',single:'Tek uzman',uncertain:'Belirsiz',disagreement:'Uyuşmazlık'}[a.ensemble.state]):a.score===null||a.score===undefined?'Elle':Math.round(a.score*100)+'% öneri';
    row.append(check,button,score);$('annotations').append(row);
  }
  $('undo').disabled=busy||!item?.undo.length;$('redo').disabled=busy||!item?.redo.length;
  renderSite();
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
  const request=++openRequest,item=items[index];
  const data=await imageData(item);const blob=await(await fetch(data)).blob();const nextBitmap=await createImageBitmap(blob);
  if(request!==openRequest){nextBitmap.close();return;}
  if(nextBitmap.width*nextBitmap.height>25000000){nextBitmap.close();throw new Error('Görsel 25 megapikselden büyük. Önce küçültün.');}
  item.width=nextBitmap.width;item.height=nextBitmap.height;
  if(!item.restored){
    try{const stored=await getDraft(item.id)||(item.legacyId?await getDraft(item.legacyId):null);item.storageHealthy=!stored||S.canRestore(stored,item);if(stored&&item.storageHealthy){item.annotations=stored.annotations.filter(a=>{try{return !!A.validate(a);}catch{return false;}});item.transfers=stored.transfers||{};status('Yerel etiket taslağı geri yüklendi.');}if(!item.storageHealthy)status('Kaynak boyutu değişmiş; önce eski taslağı kontrol et.',true);}catch{item.storageHealthy=false;status('Yerel kayıt okunamadı; siteye aktarım kapalı. Görseli yeniden alıp dene.',true);}item.restored=true;
  }
  if(request!==openRequest){nextBitmap.close();return;}
  current=index;bitmap?.close();bitmap=nextBitmap;selected=null;draft=[];drag=null;zoom=0;
  canvas.width=bitmap.width;canvas.height=bitmap.height;canvas.hidden=false;$('empty').hidden=true;$('image-name').textContent=item.name;
  $('image-info').textContent=`${item.width} × ${item.height} · `+(item.coordinateSpace==='rendered-image'?'Evren tuvali — özgün boyutları kontrol et':'Özgün dosya');
  renderQueue();renderAnnotations();updateClasses();fit();draw();$('species').replaceChildren();
  $('allow-existing').checked=false;$('site-class').replaceChildren();
  const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Mevcut sınıfı seç';$('site-class').append(placeholder);
  for(const name of item.siteClasses||[]){const o=document.createElement('option');o.value=name;o.textContent=name;$('site-class').append(o);}
  $('site-state').textContent=item.sourceToken?`${item.source.position} · Evren'de ${item.existingCount} mevcut etiket · fotoğraf yalnız bellekte`:'Evren’den alınmış görsel yok.';
  mappings={};mappingsPath='';mappingTarget='';if(item.source){try{mappings=await readMappings(item.source.path);mappingsPath=item.source.path;}catch{item.storageHealthy=false;status('Sınıf eşlemeleri okunamadı.',true);}}
  renderSite();
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
  if(stopped)throw new Error('Yerel işlem durduruldu');
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
async function captureEvren(expectedTab,signal){
    if(!globalThis.chrome?.tabs)throw new Error('Evren etiketleme sekmesindeyken uzantı simgesine tıkla; ardından Evren’den al.');
    const explicit=Number(new URL(location.href).searchParams.get('sourceTab'));
    const tab=explicit?{id:explicit}:(await chrome.tabs.query({active:true,currentWindow:true}))[0];const id=tab?.id;
    if(!id)throw new Error('Evren etiketleme sekmesini aç');
    if(expectedTab&&id!==expectedTab)throw new Error('Kaynak sekme değişti; otomatik çalışma durdu');
    checkpoint(signal);
    const result=await siteClient.request(id,{type:'CAPTURE_LOCAL_IMAGE',fit:true},{signal});
    if(!result?.ok)throw new Error(result?.error||'Tuval okunamadı');
    const image=result.image;const itemId='evren:'+await hash(new Blob([S.sourceKey(image.source)])),legacyId=await hash(new Blob([JSON.stringify(image.source),image.dataUrl]));
    if(cloudMode&&active()&&!(await save(active())))throw new Error('Önceki taslak kaydedilemedi; fotoğraf değiştirilmedi');
    const old=items.findIndex(i=>i.id===itemId);
    if(old<0&&items.length>=200)throw new Error('200 görsellik çalışma sınırına ulaşıldı');
    items.push({...image,id:itemId,legacyId,sourceTab:id,annotations:[],undo:[],redo:[]});
    try{await open(items.length-1);}catch(error){items.pop();throw error;}
    if(cloudMode){items=[active()];current=0;renderQueue();}
    else if(old>=0){items[old]=active();items.pop();current=old;renderQueue();}
    await refreshContext();
    status('Açık fotoğraf belleğe alındı. Evren’de hiçbir etiket değiştirilmedi.');
    return active();
}
$('capture').onclick=async()=>{
  if(busy)return;setBusy(true);try{await captureEvren();}catch(e){status(e.message,true);}finally{setBusy(false);}
};
function checkpoint(signal){if(signal?.aborted){const error=new Error('Durduruldu; yeni işlem başlatılmadı');error.attempted=false;throw error;}}
async function transferAnnotation(item,a,className,allowExisting,signal){
  checkpoint(signal);
  const context=await refreshContext(),reason=S.transferReason(item,a,context,className,allowExisting);if(reason)throw new Error(reason);
  checkpoint(signal);
  item.transfers||={};
  try{
    item.transfers[a.id]={state:'pending',source:item.source,className,at:Date.now()};
    if(!(await save(item))){delete item.transfers[a.id];throw new Error('Aktarım notu kaydedilemedi. Siteye çizim yapılmadı');}
    checkpoint(signal);
    const result=await siteClient.request(item.sourceTab,{type:'DRAW_LOCAL_ANNOTATION',token:item.sourceToken,annotation:structuredClone(a),className,allowExisting},{signal});
    if(!result?.ok){if(result?.attempted===false)delete item.transfers[a.id];else item.transfers[a.id].state='uncertain';await save(item);throw new Error(result?.error||'Aktarım sonucu belirsiz. Evren tarafını kontrol et; tekrar gönderilmedi.');}
    item.transfers[a.id].state='drawn';await save(item);status(result.message);$('site-state').textContent='Çizim sayacı doğrulandı. Evren’de kontrol et ve Ctrl+S ile kaydet.';
    return result;
  }catch(error){if(error.attempted===false){delete item.transfers[a.id];await save(item);}throw error;}finally{renderSite();}
}
async function saveEvren(item,expectedCount,signal){
  checkpoint(signal);
  const live=await refreshContext();if(!live?.ready||live.tabId!==item.sourceTab||S.sourceKey(live.source)!==S.sourceKey(item.source))throw new Error('Kaydetmeden önce kaynak sekme veya görsel değişti');
  checkpoint(signal);
  const result=await siteClient.request(item.sourceTab,{type:'SAVE_LOCAL_ANNOTATIONS',token:item.sourceToken,expectedCount},{signal});
  if(!result?.ok)throw new Error(result?.error||'Kayıt sonucu belirsiz; sonraki görsele geçilmedi');
  for(const entry of Object.values(item.transfers||{}))if(entry.state==='drawn')entry.state='saved-ui';
  if(!(await save(item)))throw new Error('Kayıt makbuzu yerel günlüğe yazılamadı; çalışma durdu');
  $('site-state').textContent='Evren kayıt göstergesi tamamlandı. Sonucu görselde kontrol edebilirsin.';await refreshContext();return result;
}
$('site-draw').onclick=async()=>{
  if(busy)return;const item=active(),a=item?.annotations.find(a=>a.id===selected);siteWriting=true;setBusy(true);
  try{await transferAnnotation(item,a,$('site-class').value,$('allow-existing').checked);}catch(e){status(e.message,true);}finally{siteWriting=false;setBusy(false);}
};
$('site-save').onclick=async()=>{
  if(busy||!active())return;siteWriting=true;setBusy(true);try{const live=await refreshContext();await saveEvren(active(),live.existingCount);status('Evren’in normal kayıt adımı tamamlandı.');}catch(e){status(e.message,true);}finally{siteWriting=false;setBusy(false);}
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
  try{
    await loadExpert(file,labelsFile,Number($('input-size').value),$('domain').value);status('Uzman model topluluğa eklendi.');
  }
  catch(e){status(e.message,true);}finally{setBusy(false);}
};
async function loadExpert(file,labelsFile,size,domain,expectedHash){
  if(file.size>200000000||labelsFile.size>2000000)throw new Error('Model en fazla 200 MB, sınıf listesi en fazla 2 MB olabilir');
  if(!B.domains.includes(domain))throw new Error('Geçersiz model alanı');
  const labels=await labelsFile.text(),parsedLabels=C.parseLabels(labels);const id=await hash(file);
  if(expectedHash&&expectedHash!==id)throw new Error('Paketin model özeti uyuşmuyor');
  if(experts.some(e=>e.id===id))throw new Error('Bu model zaten yüklü');
  if(experts.length>=3||experts.reduce((n,e)=>n+e.bytes,0)+file.size>300000000)throw new Error('En fazla 3 model ve toplam 300 MB ağırlık yüklenebilir');
  if(stopped)throw new Error('Model yükleme durduruldu');
  const buffer=await file.arrayBuffer();if(stopped)throw new Error('Model yükleme durduruldu');
  const result=await run('LOAD_OWN_MODEL',{buffer,labels,size,modelId:id,domain,name:file.name},[buffer]);
  if(stopped)throw new Error('Model yükleme durduruldu');
  experts.push({id,domain,name:file.name,classes:result.classes,labels:parsedLabels,bytes:file.size,enabled:true});ownReady=true;renderBank();$('own-status').textContent=file.name+' · '+result.classes+' sınıf · yalnız yerel';
}
$('own-pack').onchange=async e=>{
  if(busy)return;const files=[...e.target.files];const infos=files.filter(f=>f.name.endsWith('.info.json'));
  if(!infos.length||infos.length>3){status('En fazla 3 modelin info.json, labels.json ve ONNX dosyalarını birlikte seç.',true);return;}
  setBusy(true);stopped=false;
  try{
    for(const infoFile of infos){
      if(infoFile.size>10000)throw new Error('Paket bilgi dosyası çok büyük');const info=JSON.parse(await infoFile.text());
      const base=infoFile.name.slice(0,-10),models=files.filter(f=>f.name===base+'.onnx'),labels=files.filter(f=>f.name===base+'.labels.json');
      if(models.length!==1||labels.length!==1||info.task!=='classify'||!Array.isArray(info.imgsz)||info.imgsz.length!==2||info.imgsz[0]!==info.imgsz[1]||!/^[a-f0-9]{64}$/.test(info.sha256||''))throw new Error('Paket dosyaları eksik veya uyumsuz');
      await loadExpert(models[0],labels[0],info.imgsz[0],info.domain||'biodiversity',info.sha256);
    }
    status(infos.length+' uzman model paketten yüklendi.');
  }catch(error){status(error.message+' Daha önce yüklenen modeller listede kalır.',true);}finally{setBusy(false);}
};
async function askExperts(target){
  const domain=$('domain').value,modelIds=B.route(experts,domain).map(e=>e.id);
  const image=new OffscreenCanvas(bitmap.width,bitmap.height),c=image.getContext('2d');c.drawImage(bitmap,0,0);
  let resultCanvas=image;
  if(target){const [x1,y1,x2,y2]=A.bounds(target);resultCanvas=new OffscreenCanvas(Math.max(1,Math.round((x2-x1)*bitmap.width)),Math.max(1,Math.round((y2-y1)*bitmap.height)));resultCanvas.getContext('2d').drawImage(image,x1*bitmap.width,y1*bitmap.height,(x2-x1)*bitmap.width,(y2-y1)*bitmap.height,0,0,resultCanvas.width,resultCanvas.height);}
  const input=await dataURL(await resultCanvas.convertToBlob({type:'image/png'}));if(stopped)throw new Error('Yerel işlem durduruldu');
  const result=await run('CLASSIFY',{image:input,modelIds,domain});
  return result.ensemble||B.summarize([{modelId:modelIds[0],name:experts.find(e=>e.id===modelIds[0]).name,results:result.results}]);
}
function showPredictions(ensemble,item,target){
  $('species').replaceChildren();
  const summary=document.createElement('p');summary.className='hint';summary.textContent={agreement:'Uzmanlar aynı güçlü sınıfı önerdi. Yine de sınırı ve türü incele.',single:'Tek uzman sonucu. Bağımsız doğrulama yok.',uncertain:'Güven veya ilk iki sınıfın farkı düşük. İnceleme gerekli.',disagreement:'Uzmanlar farklı sınıflar önerdi. Otomatik tür ataması yapılmadı.'}[ensemble.state];$('species').append(summary);
  for(const vote of ensemble.votes){
    const title=document.createElement('h3');title.textContent=vote.name||vote.modelId;$('species').append(title);
    for(const prediction of vote.results){const b=document.createElement('button');b.textContent=prediction.label+' · %'+(prediction.score*100).toFixed(1);b.onclick=()=>{
      if(active()!==item||busy)return;$('class-name').value=prediction.label;
      if(target){
        const currentTarget=item.annotations.find(a=>a.id===target.id);
        if(!currentTarget){status('Önerinin hedef etiketi artık yok. Bir etiket seçip yeniden tür önerisi al.',true);return;}
        snapshot();currentTarget.label=prediction.label;currentTarget.reviewed=false;currentTarget.ensemble=ensemble;changed();status('Seçili etiketin sınıfı değiştirildi; sınırlarını tekrar incele.');
      }else status('Tür önerisi seçildi. Yeni çizim bu sınıfla oluşturulacak.');
    };$('species').append(b);}
  }
}
$('classify').onclick=async()=>{
  if(!bitmap||!ownReady)return;const item=active(),target=item.annotations.find(a=>a.id===selected);
  setBusy(true);stopped=false;
  try{
    const result=await askExperts(target);showPredictions(result,item,target);
    $('own-status').textContent=(target?'Seçili nesne':'Tüm görsel')+' · merkez kare kırpma · '+result.votes.length+' uzman';
  }catch(e){status(e.message,true);}finally{setBusy(false);}
};
$('pipeline').onclick=async()=>{
  if(busy||!bitmap)return;const item=active();
  try{B.route(experts,$('domain').value);}catch(e){status(e.message,true);return;}
  setBusy(true);stopped=false;
  try{
    const previous=new Set(item.annotations.map(a=>a.id));await detectItem(item);if(stopped)return;
    const targets=item.annotations.filter(a=>!previous.has(a.id)).slice(0,20);
    if(!targets.length){status('Yeni kutu bulunamadı. Kutuyu elle çizebilir, seçip uzmanlara sorabilirsin.');return;}
    snapshot();let inspected=0;
    for(const a of targets){
      if(stopped)break;status((++inspected)+' / '+targets.length+' nesne uzmanlarla inceleniyor…');
      a.ensemble=await askExperts(a);if(stopped)break;
      if(a.ensemble.label){a.label=a.ensemble.label;a.score=null;}a.reviewed=false;await save(item);
    }
    changed();status(targets.length+' kutu uzmanlara soruldu. Uyuşmazlıkları ve sınırları incele. Evren’e henüz çizilmedi.');
  }catch(e){status(e.message,true);if(active()===item)changed();}finally{setBusy(false);$('progress').hidden=true;renderAnnotations();}
};
async function queueReview(context,reason,item){
  reviewQueue.push({source:context.source,reason});$('review-queue').replaceChildren();
  for(const entry of reviewQueue.slice(-100)){const li=document.createElement('li');li.textContent=entry.source.position+' · '+entry.source.filename+' · '+entry.reason;$('review-queue').append(li);}
  if(item){item.automationNote=reason;if(!(await save(item)))throw new Error('İnceleme notu kaydedilemedi; çalışma durdu');}
}
let automationItem=null;
runner=new Automation.Runner({
  context:async()=>{
    const live=await refreshContext();if(!live?.ready)throw new Error(live?.reason||'Evren bağlantısı hazır değil');
    if(automationTab===null){automationTab=live.tabId;automationPath=live.source.path;}
    if(live.tabId!==automationTab||live.source.path!==automationPath)throw new Error('Başlangıç sekmesi veya veri seti değişti; otomatik çalışma durdu');
    if(live.saveState!=='clean')throw new Error('Evren’de kaydedilmemiş veya devam eden kayıt var. Önce onu tamamla.');
    return live;
  },
  process:async(context,signal)=>{
    automationItem=null;if(context.existingCount>0)return {state:'skipped'};
    const item=await captureEvren(context.tabId,signal);automationItem=item;
    if(signal.aborted)throw new Error('Durduruldu');
    if(item.sourceTab!==context.tabId||S.sourceKey(context.source)!==S.sourceKey(item.source))throw new Error('Kaynak sekme veya görsel elle değiştirildi; otomatik çalışma durdu');
    if(!item.storageHealthy)throw new Error('Aktarım günlüğü okunamadı');
    if(Object.values(item.transfers||{}).some(t=>t.state!=='saved-ui'))throw new Error('Bu görselde yarım kalan aktarım var. Evren tarafını kontrol et.');
    if(item.annotations.length){await queueReview(context,'Yerel taslak korunuyor; kontrol gerekli',item);return {state:'review'};}
    await detectItem(item);if(signal.aborted)throw new Error('Durduruldu');
    if(!item.annotations.length||item.annotations.length>20){await queueReview(context,'Nesne bulunamadı veya kutu sınırı aşıldı',item);return {state:'review'};}
    for(const a of item.annotations){if(signal.aborted)throw new Error('Durduruldu');a.ensemble=await askExperts(a);}
    checkpoint(signal);
    const decision=Automation.approve(item.annotations,{mappings,classes:context.siteClasses});
    if(!decision.ok){await queueReview(context,decision.reason,item);changed();return {state:'review'};}
    snapshot();item.annotations=decision.annotations;changed();
    let drawn=0;
    try{
      for(const a of item.annotations){
        if(signal.aborted)throw new Error('Durduruldu');
        const live=await refreshContext();if(live.existingCount!==drawn)throw new Error('Evren’de etiket sayısı beklenmedik şekilde değişti');
        await transferAnnotation(item,a,a.siteClass,drawn>0,signal);drawn++;
      }
      if(signal.aborted)throw new Error('Durduruldu');
      await saveEvren(item,item.annotations.length,signal);return {state:'completed'};
    }catch(error){await queueReview(context,`${drawn}/${item.annotations.length} kutu; ${error.message}`,item);throw error;}
  },
  next:async(context,signal)=>{
    const live=await refreshContext();if(!live?.ready||live.tabId!==context.tabId||S.sourceKey(live.source)!==S.sourceKey(context.source))throw new Error('Kaynak sekme veya görsel değişti; ilerleme durdu');
    checkpoint(signal);
    const command=automationItem?{token:automationItem.sourceToken}:{navigationToken:context.navigationToken,source:context.source};
    const result=await siteClient.request(context.tabId,{type:'NEXT_LOCAL_IMAGE',...command},{signal});if(!result?.ok)throw new Error(result?.error||'Sonraki görsel doğrulanamadı');return result;
  },
  onUpdate:state=>{
    $('auto-completed').textContent=state.completed;$('auto-skipped').textContent=state.skipped;$('auto-review').textContent=state.review;
    $('auto-state').textContent=({running:'Çalışıyor',finished:'Sınır veya sıra sonu: tamamlandı',stopped:'Durduruldu',error:'Durdu: '+(state.error||'hata')})[state.phase]+' · '+state.visited+' görsel değerlendirildi';renderSite();
  }
});
$('auto-start').onclick=async()=>{
  if(busy)return;
  try{
    if(!cloudMode)throw new Error('Otomatik çalışma için Evren yan panelini kullan');
    const routed=B.route(experts,$('domain').value);if(routed.length<2)throw new Error('Önce aynı alanda en az iki uzman model yükle');
    const labels=routed[0].labels.filter(label=>routed.every(e=>e.labels.includes(label)));
    if(!labels.some(label=>S.mappedClass(label,mappings,siteContext?.siteClasses||[])))throw new Error('Önce ortak bir model türünü mevcut Evren sınıfına eşle');
  }
  catch(error){status(error.message,true);return;}
  stopped=false;automationTab=null;automationPath=null;setBusy(true);reviewQueue=[];$('review-queue').replaceChildren();
  try{const result=await runner.start({limit:Number($('auto-limit').value),perMinute:Number($('auto-rate').value)});status(result.error||'Otomatik çalışma '+(result.phase==='stopped'?'durduruldu.':'tamamlandı.'),!!result.error);}
  catch(error){status(error.message,true);}finally{setBusy(false);renderAnnotations();}
};
$('auto-stop').onclick=()=>{runner.stop();$('auto-state').textContent='Durduruluyor; yeni görsele geçilmeyecek.';if(calls.size)cancel();};
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
document.addEventListener('dragover',e=>e.preventDefault());document.addEventListener('drop',e=>{e.preventDefault();if(cloudMode){status('Bu panelde Evren’den al düğmesini kullan.');return;}addFiles(e.dataTransfer.files).catch(err=>status(err.message,true));});
window.addEventListener('beforeunload',e=>{if(busy){e.preventDefault();e.returnValue='';}});
renderQueue();renderAnnotations();renderBank();
if(siteClient&&cloudMode){refreshContext();setInterval(()=>{if(!busy&&!document.hidden)refreshContext();},1500);}
