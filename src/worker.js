import {pipeline,env} from '@huggingface/transformers';
import * as ort from 'onnxruntime-web/wasm';
import classifier from '../core/classifier.js';
import network from '../core/network.js';

const nativeFetch=globalThis.fetch.bind(globalThis);
globalThis.fetch=(input,options={})=>{
  const url=new URL(typeof input==='string'?input:input.url,globalThis.location.href);
  const method=String(options.method||(input instanceof Request?input.method:'GET')).toUpperCase();
  if(!network.allowed(url.href,method,globalThis.location.origin)) throw new Error('Yerel motor bu ağ isteğine izin vermiyor');
  return nativeFetch(input,options);
};
env.allowLocalModels=false;
env.backends.onnx.wasm.wasmPaths=new URL('../vendor/',import.meta.url).href;
env.backends.onnx.wasm.numThreads=1;
env.backends.onnx.wasm.proxy=false;
ort.env.wasm.wasmPaths=new URL('../vendor/',import.meta.url).href;
ort.env.wasm.numThreads=1;
ort.env.wasm.proxy=false;
let detector=null,ownSession=null,ownLabels=[],ownSize=384;
const tell=(id,type,data={})=>postMessage({id,type,...data});
let busy=false;
self.onmessage=async({data:m})=>{
  if(busy){tell(m.id,'error',{message:'Yerel motor başka bir işlem yapıyor'});return;}
  busy=true;
  try{
    if(m.type==='DETECT'){
      if(!detector) detector=await pipeline('object-detection','Xenova/yolos-tiny',{dtype:'q8',device:'wasm',progress_callback:p=>tell(m.id,'progress',{progress:{status:p.status,file:p.file||'',progress:p.progress||0}})});
      const results=await detector(m.image,{threshold:m.threshold});
      tell(m.id,'result',{results,model:'Xenova/yolos-tiny'});
    }else if(m.type==='LOAD_OWN_MODEL'){
      const labels=classifier.parseLabels(m.labels);
      if(!Number.isInteger(m.size)||m.size<32||m.size>1024) throw new Error('Giriş boyutu 32–1024 arasında olmalı');
      const session=await ort.InferenceSession.create(m.buffer,{executionProviders:['wasm']});
      const shape=session.inputMetadata[0]?.shape;
      if(session.inputNames.length!==1||!shape||shape.length!==4||shape[1]!==3||((typeof shape[2]==='number')&&shape[2]!==m.size)||((typeof shape[3]==='number')&&shape[3]!==m.size)){
        await session.release();throw new Error('Model NCHW RGB girişine ve seçilen boyuta uygun değil');
      }
      const out=session.outputMetadata[0]?.shape;
      if(session.outputNames.length!==1||!out||out.length!==2||((typeof out[1]==='number')&&out[1]!==labels.length)){
        await session.release();throw new Error('Model sınıflandırma çıktısına veya sınıf listesine uygun değil');
      }
      if(ownSession) await ownSession.release();ownSession=session;ownLabels=labels;ownSize=m.size;
      tell(m.id,'result',{loaded:true,classes:labels.length});
    }else if(m.type==='CLASSIFY'){
      if(!ownSession) throw new Error('Önce ONNX modelini ve sıralı sınıf listesini yükleyin');
      const blob=await (await nativeFetch(m.image)).blob();const bitmap=await createImageBitmap(blob);
      const canvas=new OffscreenCanvas(ownSize,ownSize),ctx=canvas.getContext('2d');
      const side=Math.min(bitmap.width,bitmap.height);
      ctx.drawImage(bitmap,(bitmap.width-side)/2,(bitmap.height-side)/2,side,side,0,0,ownSize,ownSize);bitmap.close();
      const data=classifier.rgbToCHW(ctx.getImageData(0,0,ownSize,ownSize).data,ownSize,ownSize);
      const tensor=new ort.Tensor('float32',data,[1,3,ownSize,ownSize]);
      const output=await ownSession.run({[ownSession.inputNames[0]]:tensor});
      const result=output[ownSession.outputNames[0]];
      const results=classifier.topK(result.data,ownLabels,5);
      tensor.dispose();Object.values(output).forEach(v=>v.dispose());
      tell(m.id,'result',{results,model:'Yerel ONNX sınıflandırıcı'});
    }else throw new Error('İzin verilmeyen motor komutu');
  }catch(error){tell(m.id,'error',{message:error.message||'Yerel model işlemi başarısız'});}
  finally{busy=false;}
};
