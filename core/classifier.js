(function(root){
  function parseLabels(text){
    let value;
    try{value=JSON.parse(text);}catch{value=text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);}
    value=value.names||value.id2label||value;
    if(!Array.isArray(value) && value && typeof value==='object'){
      const keys=Object.keys(value).sort((a,b)=>Number(a)-Number(b));
      if(!keys.every((key,i)=>key===String(i))) throw new Error('Sınıf indeksleri 0’dan başlayıp kesintisiz olmalı');
      value=keys.map(key=>value[key]);
    }
    if(!Array.isArray(value)||!value.length||value.length>20000||!value.every(s=>typeof s==='string' && s.trim() && s.length<=160)||new Set(value).size!==value.length) throw new Error('Geçerli ve sıralı sınıf listesi gerekli');
    return value;
  }
  function topK(values,labels,k=5){
    if(values.length!==labels.length || !values.length || !Array.from(values).every(Number.isFinite)) throw new Error('Model çıktısı ile sınıf sayısı uyuşmuyor');
    let numbers=Array.from(values);const sum=numbers.reduce((a,b)=>a+b,0);
    if(numbers.some(n=>n<0||n>1)||Math.abs(sum-1)>.01){const max=Math.max(...numbers);numbers=numbers.map(n=>Math.exp(n-max));const total=numbers.reduce((a,b)=>a+b,0);numbers=numbers.map(n=>n/total);}
    return numbers.map((score,i)=>({label:labels[i],index:i,score})).sort((a,b)=>b.score-a.score).slice(0,k);
  }
  function rgbToCHW(rgba,w,h){
    if(rgba.length!==w*h*4) throw new Error('Görsel piksel boyutu uyuşmuyor');
    const data=new Float32Array(w*h*3);
    for(let i=0;i<w*h;i++) for(let c=0;c<3;c++) data[c*w*h+i]=rgba[i*4+c]/255;
    return data;
  }
  const api={parseLabels,topK,rgbToCHW};if(typeof module!=='undefined')module.exports=api;else root.EvrenClassifier=api;
})(globalThis);
