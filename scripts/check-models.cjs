const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const ort=require('onnxruntime-web/wasm');
const C=require('../core/classifier.js');
const B=require('../core/model-bank.js');
const folder=process.argv[2],reportPath=process.argv[3];
if(!folder||!reportPath)throw new Error('Model klasörü ve rapor yolu gerekli');
ort.env.wasm.numThreads=1;
(async()=>{
  const sessions=[],votes=[],models=[];
  try{
    for(const file of fs.readdirSync(folder).filter(f=>f.endsWith('.info.json'))){
      const base=file.slice(0,-10),info=JSON.parse(fs.readFileSync(path.join(folder,file),'utf8'));
      const bytes=fs.readFileSync(path.join(folder,base+'.onnx'));
      if(crypto.createHash('sha256').update(bytes).digest('hex')!==info.sha256)throw new Error('Model özeti uyuşmuyor');
      const labels=C.parseLabels(fs.readFileSync(path.join(folder,base+'.labels.json'),'utf8'));
      const session=await ort.InferenceSession.create(bytes,{executionProviders:['wasm']});sessions.push(session);
      const input=session.inputMetadata[0],output=session.outputMetadata[0];
      if(input.type!=='float32'||input.shape[1]!==3||output.type!=='float32'||output.shape[1]!==labels.length)throw new Error('Model biçimi uyumsuz');
      models.push({name:base,classes:labels.length,input,output,sha256:info.sha256});
    }
    for(const [index,session]of sessions.entries()){
      const info=JSON.parse(fs.readFileSync(path.join(folder,models[index].name+'.info.json'),'utf8')),size=info.imgsz[0];
      const labels=C.parseLabels(fs.readFileSync(path.join(folder,models[index].name+'.labels.json'),'utf8'));
      const rgba=new Uint8ClampedArray(size*size*4);
      for(let y=0;y<size;y++)for(let x=0;x<size;x++){const n=(y*size+x)*4;rgba[n]=Math.round(x/(size-1)*255);rgba[n+1]=Math.round(y/(size-1)*255);rgba[n+2]=128;rgba[n+3]=255;}
      const tensor=new ort.Tensor('float32',C.rgbToCHW(rgba,size,size),[1,3,size,size]);let output;
      try{output=await session.run({[session.inputNames[0]]:tensor});votes.push({modelId:models[index].name,name:models[index].name,results:C.topK(output[session.outputNames[0]].data,labels,5)});}
      finally{tensor.dispose();if(output)Object.values(output).forEach(t=>t.dispose());}
    }
    const report={runtime:'onnxruntime-web/wasm (Node.js)',syntheticInput:true,accuracyBenchmark:false,models,ensemble:B.summarize(votes)};
    fs.writeFileSync(reportPath,JSON.stringify(report,null,2));console.log(JSON.stringify({models:models.map(m=>({name:m.name,classes:m.classes})),ensemble:report.ensemble.state,report:reportPath}));
  }finally{for(const session of sessions)await session.release();}
})().catch(error=>{console.error(error);process.exitCode=1;});
