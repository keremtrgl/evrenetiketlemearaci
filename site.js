(()=>{
  if(window.top!==window || window.__evrenLocalBridge) return;
  window.__evrenLocalBridge=true;
  let snapshot=null,writing=false,navigation=null;
  const attempts=new Set();
  const text=node=>node?.innerText||node?.textContent||'';
  const fold=value=>value.normalize('NFKD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/ı/g,'i');
  function classes(){return [...document.querySelector('input[placeholder="Sınıf ara..."]')?.closest('aside')?.querySelectorAll('button')||[]].map(button=>({button,name:text(button.querySelector('span.flex-1')).trim()})).filter(c=>c.name);}
  function annotationCount(){const sidebar=[...document.querySelectorAll('aside')].find(a=>/^etiketler\s*\(/.test(fold(text(a)).trim()));const match=fold(text(sidebar)).match(/^etiketler\s*\((\d+)\)/);if(!match)throw new Error('Sağdaki etiket panelini aç');return Number(match[1]);}
  function source(){
    const header=document.querySelector('header'),content=text(header);
    const filename=[...header?.querySelectorAll('span')||[]].map(n=>text(n).trim()).find(s=>/\.(?:jpe?g|png|webp|bmp|avif)$/i.test(s)&&!s.includes('\n'))||content.match(/[^\s/\\]+\.(?:jpe?g|png|webp|bmp|avif)/i)?.[0];
    const position=content.match(/\d+\s*\/\s*\d+/)?.[0];
    if(!filename||!position)throw new Error('Görsel kimliği veya sıra bilgisi henüz hazır değil');
    return {path:location.pathname,item:new URL(location.href).searchParams.get('item'),filename,position};
  }
  function canvases(){const scope=document.querySelector('[role="application"][aria-label="Anotasyon alani"]')||document;return [...scope.querySelectorAll('canvas')].filter(c=>c.width>=100&&c.height>=100);}
  function saveState(){const labels=[...document.querySelectorAll('header button')].map(b=>fold(text(b)).trim());return labels.some(s=>s.includes('kaydediliyor'))?'saving':labels.some(s=>s.includes('kaydet'))?'dirty':labels.some(s=>s==='sonraki')?'clean':'unknown';}
  function context(){
    const result={bridgeVersion:'0.5.0',ready:false};
    try{
      if(location.origin!=='https://evren.ssyz.org.tr'||!location.pathname.startsWith('/annotate/'))throw new Error('Evren etiketleme ekranını aç');
      const region=document.querySelector('[role="application"][aria-label="Anotasyon alani"]');
      const loading=[...document.querySelectorAll('[aria-busy="true"],[role="progressbar"]')].some(e=>e.getBoundingClientRect().width>0)||/yukleniyor/.test(fold(text(region?.parentElement)));
      if(loading)throw new Error('Görsel veya etiketler yükleniyor; tamamlanmasını bekle');
      result.source=source();result.siteClasses=classes().map(c=>c.name);result.existingCount=annotationCount();result.saveState=saveState();
      if(!result.siteClasses.length)throw new Error('Soldaki sınıf panelini aç ve arama filtresini temizle');
      const layers=canvases();result.canvasCount=layers.length;
      if(layers.length<2||layers.length>4)throw new Error('Çizim katmanları henüz hazır değil');
      const box=layers[0].getBoundingClientRect();result.frame={width:layers[0].width,height:layers[0].height,left:box.left,top:box.top,cssWidth:box.width,cssHeight:box.height};
      if(box.width<=0||box.height<=0)throw new Error('Etiketleme tuvali görünür değil');
      if(!document.querySelector('button[aria-label="Kutu"]'))throw new Error('Kutu aracı bulunamadı');
      result.ready=true;
      if(!navigation||JSON.stringify(navigation.source)!==JSON.stringify(result.source))navigation={source:result.source,token:crypto.randomUUID()};
      result.navigationToken=navigation.token;
    }catch(error){result.reason=error.message;}
    return result;
  }
  function capture(){
    const state=context();if(!state.ready)throw new Error(state.reason);
    const candidates=canvases();
    if(!candidates.length) throw new Error('Okunabilir görüntü tuvali bulunamadı');
    const canvas=candidates[0],w=canvas.width,h=canvas.height;
    if(w*h>16000000) throw new Error('Tuval çok büyük; görünümü küçültüp tekrar deneyin');
    const pixels=canvas.getContext('2d').getImageData(0,0,w,h).data;
    let x1=w,y1=h,x2=-1,y2=-1,count=0;
    for(let y=0;y<h;y++) for(let x=0;x<w;x++) if(pixels[(y*w+x)*4+3]>250){x1=Math.min(x1,x);x2=Math.max(x2,x);y1=Math.min(y1,y);y2=Math.max(y2,y);count++;}
    if(x2<0 || x1<2 || y1<2 || x2>w-3 || y2>h-3) throw new Error('Fotoğraf tam görünmüyor veya katman ayrılamıyor. Görseli tuvale sığdırın ya da dosyadan açın.');
    const width=x2-x1+1,height=y2-y1+1;
    if(count/(width*height)<.995) throw new Error('Fotoğraf sınırı güvenilir biçimde ayrılamadı; dosyadan açın');
    const cropped=document.createElement('canvas');cropped.width=width;cropped.height=height;
    cropped.getContext('2d').drawImage(canvas,x1,y1,width,height,0,0,width,height);
    const rect=canvas.getBoundingClientRect();
    return {name:state.source.filename,dataUrl:cropped.toDataURL('image/png'),width,height,coordinateSpace:'rendered-image',source:state.source,frame:{x:x1,y:y1,width,height,canvasWidth:w,canvasHeight:h,left:rect.left,top:rect.top,cssWidth:rect.width,cssHeight:rect.height},siteClasses:state.siteClasses,existingCount:state.existingCount,requiresDimensionCheck:true};
  }
  function sameImage(a,b){return a.dataUrl===b.dataUrl&&JSON.stringify(a.source)===JSON.stringify(b.source)&&JSON.stringify(a.frame)===JSON.stringify(b.frame);}
  const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  async function draw(message){
    if(writing)return {ok:false,attempted:false,error:'Başka aktarım sürüyor'};
    let attempted=false;
    try{
      if(!snapshot||snapshot.sourceToken!==message.token)throw new Error('Görseli panelden yeniden al');
      const a=globalThis.EvrenAnnotations.validate(message.annotation);
      if(a.type!=='box')throw new Error('Bu beta yalnız kutu aktarır. Poligonu yerelde düzenleyip dışa aktarabilirsin');
      if(typeof a.id!=='string'||!a.id||a.id.length>160)throw new Error('Etiket kimliği geçersiz');
      if(!a.reviewed)throw new Error('Önce etiketi inceleyip işaretle');
      const key=JSON.stringify(snapshot.source)+'|'+a.id;
      if(attempts.has(key))throw new Error('Bu etiket için aktarım zaten denendi; Evren tarafını kontrol et');
      if(document.querySelector('[role="dialog"],[aria-modal="true"]'))throw new Error('Önce açık site penceresini kapat');
      if(!sameImage(snapshot,capture()))throw new Error('Görsel veya görünüm değişti; yeniden al');
      const before=annotationCount();if(before&&!message.allowExisting)throw new Error('Bu görselde mevcut etiketler var; farklı bir nesne eklediğini onayla');
      const matches=classes().filter(c=>c.name===message.className);
      if(matches.length!==1||matches[0].button.disabled)throw new Error('Tek bir mevcut Evren sınıfı seç');
      const button=document.querySelector('button[aria-label="'+(a.type==='box'?'Kutu':'Poligon')+'"]');
      if(!button||button.disabled)throw new Error('Normal çizim aracı bulunamadı');
      writing=true;document.activeElement?.blur();document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true,cancelable:true}));matches[0].button.click();button.click();
      for(let n=0;n<20;n++){await pause(50);if(button.getAttribute('aria-pressed')==='true'&&matches[0].button.className.includes('ring-evren'))break;}
      if(button.getAttribute('aria-pressed')!=='true')throw new Error('Çizim aracı etkinleşmedi');
      if(!matches[0].button.className.includes('ring-evren'))throw new Error('Hedef sınıf seçimi doğrulanamadı');
      if(!sameImage(snapshot,capture()))throw new Error('Çizim öncesinde görsel değişti');
      const canvases=[...document.querySelectorAll('canvas')].filter(c=>c.width===snapshot.frame.canvasWidth&&c.height===snapshot.frame.canvasHeight);
      const target=canvases.at(-1);if(!target||canvases.length<2||canvases.length>4)throw new Error('Çizim katmanı güvenilir biçimde bulunamadı');
      const f=snapshot.frame;
      const rect=target.getBoundingClientRect();
      if(rect.width<=0||rect.height<=0||Math.abs(rect.left-f.left)>.5||Math.abs(rect.top-f.top)>.5||Math.abs(rect.width-f.cssWidth)>.5||Math.abs(rect.height-f.cssHeight)>.5)throw new Error('Çizim katmanı fotoğrafla hizalı değil; yeniden al');
      const xy=([x,y])=>({clientX:f.left+(f.x+x*f.width)*f.cssWidth/f.canvasWidth,clientY:f.top+(f.y+y*f.height)*f.cssHeight/f.canvasHeight});
      const mouse=(type,p,buttons=0)=>target.dispatchEvent(new MouseEvent(type,{...xy(p),bubbles:true,cancelable:true,button:0,buttons,view:window}));
      attempts.add(key);attempted=true;
      const [x1,y1,x2,y2]=a.geometry;mouse('mousedown',[x1,y1],1);mouse('mousemove',[(x1+x2)/2,(y1+y2)/2],1);mouse('mousemove',[x2,y2],1);mouse('mouseup',[x2,y2]);
      let after=before;for(let n=0;n<20;n++){await pause(100);after=annotationCount();if(after!==before)break;}
      if(after!==before+1)throw new Error('Çizim sonucu doğrulanamadı. Tekrar aktarılmadı; Evren tarafını kontrol et');
      if(!sameImage(snapshot,capture()))throw new Error('Çizimden sonra görsel değişti. Evren tarafını kontrol et; tekrar aktarılmadı');
      snapshot.pendingWrites=(snapshot.pendingWrites||0)+1;
      return {ok:true,state:'drawn',attempted:true,annotationId:a.id,message:'Çizim sayacı doğrulandı. Evren’de sınırları kontrol et ve Ctrl+S ile kaydet. Sunucu kaydı bu araç tarafından doğrulanmadı.'};
    }catch(error){return {ok:false,attempted,error:error.message};}
    finally{writing=false;}
  }
  async function saveLocal(message){
    if(writing)return {ok:false,attempted:false,error:'Başka aktarım sürüyor'};
    try{
      if(!snapshot||snapshot.sourceToken!==message.token||!snapshot.pendingWrites)throw new Error('Kaydedilecek doğrulanmış yerel çizim yok');
      if(!sameImage(snapshot,capture())||annotationCount()!==message.expectedCount)throw new Error('Görsel veya etiket sayısı değişti; otomatik kayıt durdu');
      if(saveState()==='unknown')throw new Error('Kayıt düğmesinin durumu okunamadı');
      writing=true;document.activeElement?.blur();
      document.dispatchEvent(new KeyboardEvent('keydown',{key:'s',code:'KeyS',ctrlKey:true,bubbles:true,cancelable:true}));
      let clean=0;
      for(let n=0;n<100;n++){
        await pause(100);const c=context();
        if(JSON.stringify(source())!==JSON.stringify(snapshot.source))throw new Error('Kayıt sırasında görsel değişti');
        if(!c.ready)continue;
        if(c.existingCount!==message.expectedCount)throw new Error('Kayıt sırasında etiketler değişti');
        clean=c.saveState==='clean'?clean+1:0;
        if(clean>=2){snapshot.pendingWrites=0;return {ok:true,state:'saved-ui',count:c.existingCount};}
      }
      throw new Error('Evren kayıt tamamlandı durumuna geçmedi; tekrar kayıt gönderilmedi');
    }catch(error){return {ok:false,attempted:true,error:error.message};}finally{writing=false;}
  }
  async function nextLocal(message){
    if(writing)return {ok:false,error:'Önce kayıt işleminin bitmesini bekle'};
    try{
      const c=context(),captured=!!snapshot&&!!message.token&&snapshot.sourceToken===message.token,identified=!!navigation&&!!message.navigationToken&&navigation.token===message.navigationToken;
      const expected=captured?snapshot.source:identified?message.source:null;
      if(!expected)throw new Error('Kaynak görsel değişti');
      if(!c.ready||JSON.stringify(c.source)!==JSON.stringify(expected)||snapshot?.pendingWrites||c.saveState!=='clean')throw new Error('Kaynak veya kayıt durumu doğrulanmadan sonraki görsele geçilmez');
      const [index,total]=c.source.position.split('/').map(Number);if(index>=total)return {ok:true,end:true};
      const next=[...document.querySelectorAll('header button')].find(b=>b.querySelector('svg.lucide-chevron-right'));if(!next||next.disabled)throw new Error('Sonraki görsel düğmesi bulunamadı');
      next.click();
      for(let n=0;n<150;n++){await pause(100);const now=context();if(now.ready&&JSON.stringify(now.source)!==JSON.stringify(c.source))return {ok:true,end:false,context:now};}
      throw new Error('Sonraki görsel yüklenmedi; tekrar gezinme yapılmadı');
    }catch(error){return {ok:false,error:error.message};}
  }
  async function captureLocal(message){
    if(writing)return {ok:false,error:'Aktarımın bitmesini bekle'};
    try{
      if(message.fit){document.activeElement?.blur();document.dispatchEvent(new KeyboardEvent('keydown',{key:'0',code:'Digit0',bubbles:true,cancelable:true}));await pause(200);}
      const first=capture();await pause(200);const second=capture();
      if(!sameImage(first,second))throw new Error('Görsel henüz kararlı değil; tekrar al');
      snapshot={...second,sourceToken:crypto.randomUUID(),pendingWrites:0};return {ok:true,image:snapshot};
    }catch(error){return {ok:false,error:error.name==='SecurityError'?'Tarayıcı görüntü piksellerini okumaya izin vermedi':error.message};}
  }
  chrome.runtime.onMessage.addListener((message,sender,reply)=>{
    if(sender.id!==chrome.runtime.id || !sender.url?.startsWith('chrome-extension://'+chrome.runtime.id+'/')){reply({ok:false,error:'İzin verilmeyen istek'});return;}
    if(message.type==='DRAW_LOCAL_ANNOTATION'){draw(message).then(reply);return true;}
    if(message.type==='GET_SITE_CONTEXT'){reply({ok:true,context:context()});return;}
    if(message.type==='SAVE_LOCAL_ANNOTATIONS'){saveLocal(message).then(reply);return true;}
    if(message.type==='NEXT_LOCAL_IMAGE'){nextLocal(message).then(reply);return true;}
    if(message.type!=='CAPTURE_LOCAL_IMAGE'){reply({ok:false,error:'İzin verilmeyen komut'});return;}
    captureLocal(message).then(reply);return true;
  });
})();
