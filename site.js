(()=>{
  if(window.top!==window || window.__evrenLocalBridge) return;
  window.__evrenLocalBridge=true;
  let snapshot=null,writing=false;
  const attempts=new Set();
  const text=node=>node?.innerText||node?.textContent||'';
  function classes(){return [...document.querySelector('input[placeholder="Sınıf ara..."]')?.closest('aside')?.querySelectorAll('button')||[]].map(button=>({button,name:text(button.querySelector('span.flex-1')).trim()})).filter(c=>c.name);}
  function annotationCount(){const sidebar=[...document.querySelectorAll('aside')].at(-1);const match=text(sidebar).match(/ETİKETLER\s*\((\d+)\)/iu);if(!match)throw new Error('Etiket sayacı doğrulanamadı');return Number(match[1]);}
  function capture(){
    if(location.origin!=='https://evren.ssyz.org.tr' || !location.pathname.startsWith('/annotate/')) throw new Error('Evren etiketleme ekranını açın');
    const candidates=[...document.querySelectorAll('canvas')].filter(c=>c.width>=100 && c.height>=100);
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
    const header=text(document.querySelector('header'));
    const filename=header.match(/[\w.-]+\.(?:jpe?g|png|webp|bmp|avif)/i)?.[0];
    if(!filename)throw new Error('Görsel kimliği okunamadı');
    const position=header.match(/\d+\s*\/\s*\d+/)?.[0];
    if(!position)throw new Error('Görsel sıra bilgisi okunamadı');
    const rect=canvas.getBoundingClientRect();
    return {name:filename,dataUrl:cropped.toDataURL('image/png'),width,height,coordinateSpace:'rendered-image',source:{path:location.pathname,item:new URL(location.href).searchParams.get('item'),filename,position},frame:{x:x1,y:y1,width,height,canvasWidth:w,canvasHeight:h,left:rect.left,top:rect.top,cssWidth:rect.width,cssHeight:rect.height},siteClasses:classes().map(c=>c.name),existingCount:annotationCount(),requiresDimensionCheck:true};
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
      if(a.type==='polygon'&&a.geometry.length>250)throw new Error('Aktarım için en fazla 250 poligon köşesi desteklenir');
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
      writing=true;document.activeElement?.blur();document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true,cancelable:true}));matches[0].button.click();button.click();await pause(50);
      if(button.getAttribute('aria-pressed')!=='true')throw new Error('Çizim aracı etkinleşmedi');
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
      return {ok:true,state:'drawn',attempted:true,annotationId:a.id,message:'Çizim sayacı doğrulandı. Evren’de sınırları kontrol et ve Ctrl+S ile kaydet. Sunucu kaydı bu araç tarafından doğrulanmadı.'};
    }catch(error){return {ok:false,attempted,error:error.message};}
    finally{writing=false;}
  }
  chrome.runtime.onMessage.addListener((message,sender,reply)=>{
    if(sender.id!==chrome.runtime.id || !sender.url?.startsWith('chrome-extension://'+chrome.runtime.id+'/')){reply({ok:false,error:'İzin verilmeyen istek'});return;}
    if(message.type==='DRAW_LOCAL_ANNOTATION'){draw(message).then(reply);return true;}
    if(message.type!=='CAPTURE_LOCAL_IMAGE'){reply({ok:false,error:'İzin verilmeyen komut'});return;}
    try{if(writing)throw new Error('Aktarımın bitmesini bekle');snapshot={...capture(),sourceToken:crypto.randomUUID()};reply({ok:true,image:snapshot});}catch(error){reply({ok:false,error:error.name==='SecurityError'?'Tarayıcı görüntü piksellerini okumaya izin vermedi':error.message});}
  });
})();
