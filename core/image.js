(function(root){
  function toBlob(value){
    if(typeof value!=='string'||value.length>96000000)throw new Error('Bellek görseli geçersiz veya 72 MB sınırını aşıyor');
    const header=value.match(/^data:(image\/(?:png|jpeg|webp|bmp));base64,/);
    if(!header)throw new Error('Yalnız bellek içi PNG, JPEG, WebP veya BMP görseli kabul edilir');
    const encoded=value.slice(header[0].length);
    if(!encoded||!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded))throw new Error('Görselin base64 verisi bozuk');
    let decoded;try{decoded=atob(encoded);}catch{throw new Error('Görselin base64 verisi bozuk');}
    const bytes=new Uint8Array(decoded.length);for(let i=0;i<decoded.length;i++)bytes[i]=decoded.charCodeAt(i);
    return new Blob([bytes],{type:header[1]});
  }
  const api={toBlob};if(typeof module!=='undefined')module.exports=api;else root.EvrenImage=api;
})(globalThis);
