const fs=require('node:fs');
const path=require('node:path');
const {build}=require('esbuild');
const root=path.resolve(__dirname,'..');
(async()=>{
  const config={bundle:true,minify:true,legalComments:'none',platform:'browser',target:'chrome120',logLevel:'warning'};
  await build({...config,entryPoints:[path.join(root,'src/app.js')],outfile:path.join(root,'dist/app.js'),format:'iife'});
  await build({...config,entryPoints:[path.join(root,'src/worker.js')],outfile:path.join(root,'dist/worker.js'),format:'esm'});
  fs.mkdirSync(path.join(root,'vendor'),{recursive:true});
  for(const file of fs.readdirSync(path.join(root,'node_modules/onnxruntime-web/dist')).filter(file=>/^ort-wasm-simd-threaded.*\.(mjs|wasm)$/.test(file))){
    fs.copyFileSync(path.join(root,'node_modules/onnxruntime-web/dist',file),path.join(root,'vendor',file));
  }
  let notices='Bu paket açık kaynak bağımlılıklar içerir.\n\n';
  for(const [name,file] of [['Transformers.js','node_modules/@huggingface/transformers/LICENSE'],['ONNX Runtime','third-party/ONNXRUNTIME-LICENSE.txt'],['Hugging Face Jinja','node_modules/@huggingface/jinja/LICENSE'],['Hugging Face Tokenizers','node_modules/@huggingface/tokenizers/LICENSE']]){
    if(fs.existsSync(path.join(root,file)))notices+=name+'\n'+fs.readFileSync(path.join(root,file),'utf8')+'\n\n';
  }
  fs.writeFileSync(path.join(root,'THIRD_PARTY_NOTICES.txt'),notices.trimEnd()+'\n');
  const destination=path.join(root,'release');
  if(fs.existsSync(destination)){
    const resolved=fs.realpathSync(destination),expected=path.join(fs.realpathSync(root),'release');
    if(resolved!==expected||fs.lstatSync(destination).isSymbolicLink())throw new Error('Kurulum çıktısı proje klasörü dışında');
    fs.rmSync(resolved,{recursive:true,force:true});
  }
  fs.mkdirSync(destination,{recursive:true});
  for(const file of ['manifest.json','app.html','app.css','background.js','site.js','README.md','THIRD_PARTY_NOTICES.txt'])fs.copyFileSync(path.join(root,file),path.join(destination,file));
  for(const directory of ['core','dist','vendor'])fs.cpSync(path.join(root,directory),path.join(destination,directory),{recursive:true});
  fs.mkdirSync(path.join(destination,'docs'),{recursive:true});
  for(const file of ['validation-v040.md','validation-v050.md','model-toplulugu.md'])fs.copyFileSync(path.join(root,'docs',file),path.join(destination,'docs',file));
  console.log('Kurulum paketi hazır: '+destination);
})().catch(error=>{console.error(error);process.exitCode=1;});
