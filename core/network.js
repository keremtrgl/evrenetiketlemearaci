(function(root){
  function allowed(input,method,origin){
    if(String(method).toUpperCase()!=='GET')return false;
    let url;try{url=new URL(input,origin);}catch{return false;}
    if(['data:','blob:'].includes(url.protocol))return true;
    if(url.origin===origin || (origin.startsWith('chrome-extension://') && url.href.startsWith(origin+'/')))return true;
    return url.protocol==='https:' && (url.hostname==='huggingface.co'||url.hostname.endsWith('.huggingface.co')||url.hostname.endsWith('.hf.co'));
  }
  const api={allowed};if(typeof module!=='undefined')module.exports=api;else root.EvrenLocalNetwork=api;
})(globalThis);
