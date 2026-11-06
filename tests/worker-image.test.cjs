const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');const {transformSync}=require('esbuild');
function fixture(){
  const replies=[];let fetches=0,closed=0,detected=false;
  const ort={env:{wasm:{}},InferenceSession:{create:async()=>({inputNames:['x'],outputNames:['y'],inputMetadata:[{type:'float32',shape:[1,3,32,32]}],outputMetadata:[{type:'float32',shape:[1,2]}],run:async()=>({y:{data:new Float32Array([.97,.03]),dispose(){}}}),release:async()=>{}})},Tensor:class{dispose(){}}};
  const transformers={env:{backends:{onnx:{wasm:{}}}},RawImage:{fromBlob:async blob=>{assert.ok(blob instanceof Blob);return {raw:true};}},pipeline:async()=>async input=>{assert.equal(input.raw,true);detected=true;return [];}};
  const context={module:{exports:{}},exports:{},require:id=>id==='@huggingface/transformers'?transformers:id==='onnxruntime-web/wasm'?ort:require(path.resolve(__dirname,'../src',id)),Blob,Uint8Array,Uint8ClampedArray,Float32Array,atob,URL,Request,location:{href:'chrome-extension://test/dist/worker.js',origin:'chrome-extension://test'},fetch:async()=>{fetches++;throw new Error('Failed to fetch');},self:{},postMessage:m=>replies.push(m),createImageBitmap:async()=>({width:32,height:32,close(){closed++;}}),OffscreenCanvas:class{getContext(){return {drawImage(){},getImageData:()=>({data:new Uint8ClampedArray(32*32*4)})};}}};
  const source=fs.readFileSync(path.resolve(__dirname,'../src/worker.js'),'utf8').replaceAll('import.meta.url',JSON.stringify(context.location.href));
  vm.runInNewContext(transformSync(source,{format:'cjs',target:'node20',logLevel:'silent'}).code,context);
  return {send:async message=>{await context.self.onmessage({data:message});return replies.at(-1);},get fetches(){return fetches;},get detected(){return detected;},get closed(){return closed;}};
}
test('Tespitçi görseli URL olarak indirmeden piksel girdisiyle çalışır',async()=>{
  const f=fixture(),result=await f.send({id:1,type:'DETECT',image:'data:image/png;base64,a3Vz',threshold:.5});
  assert.equal(result.type,'result',result.message);assert.equal(f.detected,true);assert.equal(f.fetches,0);
});
test('Uzman sınıflandırması fetch kapalıyken bellek görselini işler',async()=>{
  const f=fixture();await f.send({id:1,type:'LOAD_OWN_MODEL',modelId:'one',domain:'biodiversity',name:'model',size:32,buffer:new ArrayBuffer(8),labels:'["bird","other"]'});
  const result=await f.send({id:2,type:'CLASSIFY',modelIds:['one'],domain:'biodiversity',image:'data:image/png;base64,a3Vz'});
  assert.equal(result.type,'result',result.message);assert.equal(result.results[0].label,'bird');assert.equal(f.fetches,0);assert.equal(f.closed,1);
});
