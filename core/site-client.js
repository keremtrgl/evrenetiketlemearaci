(function(root){
  function create(chrome){
    const repairing=new Map(),attempted=new Set();
    function checkpoint(signal){if(signal?.aborted){const error=new Error('Durduruldu; yeni istek gönderilmedi');error.attempted=false;throw error;}}
    async function request(tabId,message,options={}){
      checkpoint(options.signal);
      const tab=await chrome.tabs.get(tabId);let url;try{url=new URL(tab.url);}catch{throw new Error('Evren etiketleme sekmesini aç');}
      checkpoint(options.signal);
      if(url.origin!=='https://evren.ssyz.org.tr'||!url.pathname.startsWith('/annotate/'))throw new Error('Evren etiketleme sekmesini aç');
      try{return await chrome.tabs.sendMessage(tabId,message);}
      catch(error){
        const read=['GET_SITE_CONTEXT','CAPTURE_LOCAL_IMAGE'].includes(message.type);
        if(!read||!/receiving end does not exist|could not establish connection/i.test(error.message||''))throw error;
        if(!chrome.scripting?.executeScript)throw new Error('Evren sayfasını yenile ve tekrar dene. Bağlantı kodu henüz yüklenmemiş.');
        checkpoint(options.signal);
        if(!repairing.has(tabId)){if(attempted.has(tabId))throw new Error('Evren sayfasını yenile; bağlantı kurulamadı');attempted.add(tabId);repairing.set(tabId,chrome.scripting.executeScript({target:{tabId},files:['core/annotations.js','site.js']}).finally(()=>repairing.delete(tabId)));}
        try{await repairing.get(tabId);checkpoint(options.signal);return await chrome.tabs.sendMessage(tabId,message);}catch(error){if(error.attempted===false)throw error;throw new Error('Evren bağlantısı kurulamadı. Kaydetmediğin çizimleri kaydedip sayfayı yenile.');}
      }
    }
    return {request};
  }
  const api={create};if(typeof module!=='undefined')module.exports=api;else root.EvrenSiteClient=api;
})(globalThis);
