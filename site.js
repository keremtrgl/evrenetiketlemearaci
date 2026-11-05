(()=>{
  if(window.top!==window || window.__evrenLocalBridge) return;
  window.__evrenLocalBridge=true;
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
    const filename=document.querySelector('header')?.innerText.match(/[\w.-]+\.(?:jpe?g|png|webp|bmp|avif)/i)?.[0]||'evren-goruntu.png';
    return {name:filename,dataUrl:cropped.toDataURL('image/png'),width,height,coordinateSpace:'rendered-image',source:{path:location.pathname,item:new URL(location.href).searchParams.get('item'),filename},requiresDimensionCheck:true};
  }
  chrome.runtime.onMessage.addListener((message,sender,reply)=>{
    if(sender.id!==chrome.runtime.id || !sender.url?.startsWith('chrome-extension://'+chrome.runtime.id+'/')){reply({ok:false,error:'İzin verilmeyen istek'});return;}
    if(message.type!=='CAPTURE_LOCAL_IMAGE'){reply({ok:false,error:'Bu sürüm siteye etiket yazmaz ve ücretli işlem başlatmaz'});return;}
    try{reply({ok:true,image:capture()});}catch(error){reply({ok:false,error:error.name==='SecurityError'?'Tarayıcı görüntü piksellerini okumaya izin vermedi; dosyadan açın':error.message});}
  });
})();
