import {pipeline,env,RawImage} from '@huggingface/transformers';
import * as ort from 'onnxruntime-web/wasm';
import classifier from '../core/classifier.js';
import network from '../core/network.js';
import bank from '../core/model-bank.js';
import image from '../core/image.js';

const nativeFetch=globalThis.fetch.bind(globalThis);
globalThis.fetch=(input,options={})=>{
  const url=new URL(typeof input==='string'?input:input.url,globalThis.location.href);
  const method=String(options.method||(input instanceof Request?input.method:'GET')).toUpperCase();
  if(!network.allowed(url.href,method,globalThis.location.origin)) throw new Error('Yerel motor bu ağ isteğine izin vermiyor');
  return nativeFetch(input,options);
};
env.allowLocalModels=false;
env.useWasmCache=false;
env.backends.onnx.wasm.wasmPaths=new URL('../vendor/',import.meta.url).href;
env.backends.onnx.wasm.numThreads=1;
env.backends.onnx.wasm.proxy=false;
ort.env.wasm.wasmPaths=new URL('../vendor/',import.meta.url).href;
ort.env.wasm.numThreads=1;
ort.env.wasm.proxy=false;
let detector=null;
const sessions=new Map();
async function classify(entry,bitmap){
  const {session,labels,size}=entry;
  const canvas=new OffscreenCanvas(size,size),ctx=canvas.getContext('2d');
  const side=Math.min(bitmap.width,bitmap.height);
  ctx.drawImage(bitmap,(bitmap.width-side)/2,(bitmap.height-side)/2,side,side,0,0,size,size);
  const data=classifier.rgbToCHW(ctx.getImageData(0,0,size,size).data,size,size);
  const tensor=new ort.Tensor('float32',data,[1,3,size,size]);let output;
  try{output=await session.run({[session.inputNames[0]]:tensor});return classifier.topK(output[session.outputNames[0]].data,labels,5);}
  finally{tensor.dispose();if(output)Object.values(output).forEach(v=>v.dispose());}
}
const tell=(id,type,data={})=>postMessage({id,type,...data});
let busy=false;
self.onmessage=async({data:m})=>{
  if(busy){tell(m.id,'error',{message:'Yerel motor başka bir işlem yapıyor'});return;}
  busy=true;
  try{
    if(m.type==='DETECT'){
      const input=await RawImage.fromBlob(image.toBlob(m.image));
      if(!detector) detector=await pipeline('object-detection','Xenova/yolos-tiny',{dtype:'q8',device:'wasm',progress_callback:p=>tell(m.id,'progress',{progress:{status:p.status,file:p.file||'',progress:p.progress||0}})});
      const results=await detector(input,{threshold:m.threshold});
      tell(m.id,'result',{results,model:'Xenova/yolos-tiny'});
    }else if(m.type==='LOAD_OWN_MODEL'){
      if(typeof m.modelId!=='string'||!m.modelId||!bank.domains.includes(m.domain))throw new Error('Model kimliği ve alanı gerekli');
      if(sessions.has(m.modelId))throw new Error('Bu model zaten yüklü');
      if(sessions.size>=3||[...sessions.values()].reduce((n,s)=>n+s.bytes,0)+m.buffer.byteLength>300000000)throw new Error('En fazla 3 model ve toplam 300 MB ağırlık yüklenebilir');
      const labels=classifier.parseLabels(m.labels);
      if(!Number.isInteger(m.size)||m.size<32||m.size>1024) throw new Error('Giriş boyutu 32–1024 arasında olmalı');
      const session=await ort.InferenceSession.create(m.buffer,{executionProviders:['wasm']});
      const shape=session.inputMetadata[0]?.shape;
      if(session.inputNames.length!==1||!shape||shape.length!==4||session.inputMetadata[0]?.type!=='float32'||((typeof shape[0]==='number')&&shape[0]!==1)||shape[1]!==3||((typeof shape[2]==='number')&&shape[2]!==m.size)||((typeof shape[3]==='number')&&shape[3]!==m.size)){
        await session.release();throw new Error('Model NCHW RGB girişine ve seçilen boyuta uygun değil');
      }
      const out=session.outputMetadata[0]?.shape;
      if(session.outputNames.length!==1||session.outputMetadata[0]?.type!=='float32'||!out||out.length!==2||((typeof out[0]==='number')&&out[0]!==1)||((typeof out[1]==='number')&&out[1]!==labels.length)){
        await session.release();throw new Error('Model sınıflandırma çıktısına veya sınıf listesine uygun değil');
      }
      sessions.set(m.modelId,{session,labels,size:m.size,bytes:m.buffer.byteLength,domain:m.domain,name:m.name});
      tell(m.id,'result',{loaded:true,modelId:m.modelId,classes:labels.length});
    }else if(m.type==='UNLOAD_MODEL'){
      const entry=sessions.get(m.modelId);if(entry){await entry.session.release();sessions.delete(m.modelId);}tell(m.id,'result',{removed:true});
    }else if(m.type==='CLASSIFY'){
      if(!Array.isArray(m.modelIds)||!m.modelIds.length||m.modelIds.length>3||new Set(m.modelIds).size!==m.modelIds.length)throw new Error('En az bir, en fazla üç uzman seç');
      const entries=m.modelIds.map(id=>{const e=sessions.get(id);if(!e||e.domain!==m.domain)throw new Error('Uzman modeli veya alanı uygun değil');return [id,e];});
      if(typeof m.image!=='string'||!m.image.startsWith('data:image/'))throw new Error('Yalnız bellek içi görüntü kabul edilir');
      const bitmap=await createImageBitmap(image.toBlob(m.image));
      const votes=[];
      try{for(const [modelId,entry]of entries)votes.push({modelId,name:entry.name,results:await classify(entry,bitmap)});}
      finally{bitmap.close();}
      tell(m.id,'result',{results:votes[0].results,ensemble:bank.summarize(votes),model:'Yerel ONNX uzmanları'});
    }else throw new Error('İzin verilmeyen motor komutu');
  }catch(error){tell(m.id,'error',{message:error.message||'Yerel model işlemi başarısız'});}
  finally{busy=false;}
};
