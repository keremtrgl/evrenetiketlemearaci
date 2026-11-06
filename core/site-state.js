(function(root){
  function sourceKey(source){
    if(!source||typeof source.path!=='string'||!source.path.startsWith('/annotate/')||typeof source.filename!=='string'||!source.filename)throw new Error('Görsel kimliği eksik');
    const position=String(source.position||'').replace(/\s/g,'');
    if(!source.item&&!/^\d+\/\d+$/.test(position))throw new Error('Görsel sıra bilgisi eksik');
    return JSON.stringify([source.path,source.item||null,source.filename,source.item?null:position]);
  }
  function canRestore(stored,item){
    if(!stored||![stored.width,stored.height,item.width,item.height].every(n=>Number.isFinite(n)&&n>0))return false;
    if(item.source){try{return sourceKey(stored.source)===sourceKey(item.source)&&Math.abs(stored.width/stored.height-item.width/item.height)/(item.width/item.height)<.01;}catch{return false;}}
    return stored.width===item.width&&stored.height===item.height;
  }
  function transferReason(item,a,context,className,allowExisting){
    if(!item?.sourceToken||!a)return 'Evren’den görsel al ve bir kutu seç.';
    if(!item.storageHealthy)return 'Aktarım geçmişi okunamadı; yeniden görsel al.';
    if(!context?.ready)return context?.reason||'Evren ekranı henüz hazır değil.';
    if(context.tabId!==item.sourceTab)return 'Kaynak Evren sekmesine geri dön.';
    try{if(sourceKey(item.source)!==sourceKey(context.source))return 'Evren’deki görsel değişti; yeniden al.';}catch{return 'Görsel kimliği doğrulanamadı.';}
    if(a.type!=='box')return 'Bu sürüm yalnız kutu aktarır.';
    if(!a.reviewed)return 'Önce kutuyu inceleyip onayla.';
    if(Object.hasOwn(item.transfers||{},a.id))return 'Bu etiketin aktarımı zaten denendi; Evren tarafını kontrol et.';
    if(!className||context.siteClasses?.filter(c=>c===className).length!==1)return 'Mevcut ve tekil bir Evren sınıfı seç.';
    if(context.existingCount&&!allowExisting)return 'Mevcut etiketleri kontrol ettiğini onayla.';
    return '';
  }
  function mappedClass(label,mappings,names){const value=Object.hasOwn(mappings||{},label)?mappings[label]:label;return names?.filter(n=>n===value).length===1?value:'';}
  function diagnostic({version,context,item,experts,busy}){return {version,generatedAt:new Date().toISOString(),siteReady:context?.ready===true,sourceLoaded:!!item?.sourceToken,sourceIdentity:item?.source?.item?'item-and-filename':item?.source?'filename-and-position':'none',siteClassCount:context?.siteClasses?.length||0,siteAnnotationCount:context?.existingCount??null,localAnnotationCount:item?.annotations?.length||0,transferCount:Object.keys(item?.transfers||{}).length,modelCount:experts?.length||0,modelClasses:(experts||[]).map(e=>e.classes),busy:!!busy};}
  const api={sourceKey,canRestore,transferReason,mappedClass,diagnostic};if(typeof module!=='undefined')module.exports=api;else root.EvrenSiteState=api;
})(globalThis);
