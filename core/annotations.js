(function(root){
  const finite=n=>typeof n==='number' && Number.isFinite(n);
  const coord=n=>finite(n) && n>=0 && n<=1;
  function validate(a){
    if(!a || typeof a.label!=='string' || !a.label.trim() || a.label.length>160 || /[\x00-\x1f]/.test(a.label)) throw new Error('Geçerli bir sınıf adı gerekli');
    if(a.type==='box'){
      if(!Array.isArray(a.geometry) || a.geometry.length!==4 || !a.geometry.every(coord) || a.geometry[0]>=a.geometry[2] || a.geometry[1]>=a.geometry[3]) throw new Error('Kutu koordinatları geçersiz');
    }else if(a.type==='polygon'){
      if(!Array.isArray(a.geometry) || a.geometry.length<3 || a.geometry.length>5000 || !a.geometry.every(p=>Array.isArray(p) && p.length===2 && p.every(coord)) || area(a)===0) throw new Error('Poligon koordinatları geçersiz');
    }else throw new Error('Desteklenmeyen etiket türü');
    return a;
  }
  function area(a){
    if(a.type==='box') return (a.geometry[2]-a.geometry[0])*(a.geometry[3]-a.geometry[1]);
    let sum=0;for(let i=0;i<a.geometry.length;i++){const p=a.geometry[i],q=a.geometry[(i+1)%a.geometry.length];sum+=p[0]*q[1]-q[0]*p[1];}return Math.abs(sum)/2;
  }
  function bounds(a){
    if(a.type==='box') return a.geometry;
    const xs=a.geometry.map(p=>p[0]),ys=a.geometry.map(p=>p[1]);return [Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];
  }
  function fromDetections(results,width,height,threshold){
    if(!finite(width)||!finite(height)||width<=0||height<=0||!coord(threshold)||!Array.isArray(results)) throw new Error('Model sonuçları veya boyut geçersiz');
    const annotations=[];let rejected=0;
    for(const [i,r] of results.entries()){
      if(!r || !coord(r.score)){rejected++;continue;}
      if(r.score<threshold) continue;
      const b=r.box||{};
      const a={id:'model-'+i+'-'+Date.now(),type:'box',label:r.label,score:r.score,reviewed:false,source:'Xenova/yolos-tiny',geometry:[b.xmin/width,b.ymin/height,b.xmax/width,b.ymax/height]};
      try{validate(a);annotations.push(a);}catch{rejected++;}
    }
    return {annotations,rejected};
  }
  function toYolo(annotations,classes,task){
    if(!['detection','segmentation'].includes(task)) throw new Error('Görev türü seçin');
    return annotations.map(a=>{
      validate(a);const index=classes.indexOf(a.label);if(index<0) throw new Error('Sınıf listesinde olmayan etiket');
      if(task==='segmentation'){
        if(a.type!=='polygon') throw new Error('Segmentasyon çıktısı için gerçek poligon gerekli');
        return index+' '+a.geometry.flat().map(n=>n.toFixed(6)).join(' ');
      }
      const [x1,y1,x2,y2]=bounds(a);return index+' '+[(x1+x2)/2,(y1+y2)/2,x2-x1,y2-y1].map(n=>n.toFixed(6)).join(' ');
    }).join('\n');
  }
  function toCoco(items){
    const labels=[...new Set(items.flatMap(item=>item.annotations.map(a=>a.label)))];
    const images=[],annotations=[];let id=1;
    for(const [i,item] of items.entries()){
      if(!finite(item.width)||!finite(item.height)||item.width<=0||item.height<=0) throw new Error('Görsel boyutu geçersiz');
      images.push({id:i+1,file_name:item.name,width:item.width,height:item.height});
      for(const a of item.annotations){
        validate(a);const [x1,y1,x2,y2]=bounds(a);
        const round=n=>Math.round(n*1e6)/1e6;
        annotations.push({id:id++,image_id:i+1,category_id:labels.indexOf(a.label)+1,bbox:[x1*item.width,y1*item.height,(x2-x1)*item.width,(y2-y1)*item.height].map(round),area:round(area(a)*item.width*item.height),iscrowd:0,segmentation:a.type==='polygon'?[a.geometry.flatMap(([x,y])=>[round(x*item.width),round(y*item.height)])]:[],attributes:{reviewed:!!a.reviewed,source:a.source||'manual',score:a.score??null}});
      }
    }
    return {images,annotations,categories:labels.map((name,i)=>({id:i+1,name})),info:{description:'Kerem — yerel etiketleme'}};
  }
  const api={validate,area,bounds,fromDetections,toYolo,toCoco};
  if(typeof module!=='undefined') module.exports=api;else root.EvrenAnnotations=api;
})(globalThis);
