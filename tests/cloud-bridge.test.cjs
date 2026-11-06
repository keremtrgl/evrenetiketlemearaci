const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
function fixture(){
  const dom=new JSDOM('<header>1 / 400 kus.jpg</header><aside><input placeholder="Sınıf ara..."><button id="class"><span class="flex-1">karatavuk</span><kbd>1</kbd></button></aside><button aria-label="Kutu" aria-pressed="false"></button><button aria-label="Poligon" aria-pressed="false"></button><button id="paid">Otomatik Etiketle</button><canvas width="120" height="100"></canvas><canvas width="120" height="100"></canvas><aside id="labels">ETİKETLER (0)</aside>',{url:'https://evren.ssyz.org.tr/annotate/id?item=first',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,d=w.document;let listener,paid=0,draws=0;
  const pixels=new Uint8ClampedArray(120*100*4);for(let y=5;y<95;y++)for(let x=5;x<115;x++)pixels[(y*120+x)*4+3]=255;
  w.HTMLCanvasElement.prototype.getContext=()=>({getImageData:()=>({data:pixels}),drawImage(){}});
  w.HTMLCanvasElement.prototype.toDataURL=()=>'data:image/png;base64,cGhvdG8=';
  w.Element.prototype.getBoundingClientRect=()=>({left:0,top:0,width:120,height:100});
  d.querySelectorAll('[aria-pressed]').forEach(b=>b.onclick=()=>b.setAttribute('aria-pressed','true'));
  d.getElementById('paid').onclick=()=>paid++;
  d.querySelectorAll('canvas')[1].addEventListener('mouseup',()=>{draws++;if(d.getElementById('labels'))d.getElementById('labels').textContent='ETİKETLER ('+draws+')';});
  w.chrome={runtime:{id:'test',onMessage:{addListener:fn=>listener=fn}}};
  w.eval(fs.readFileSync(path.join(root,'core/annotations.js'),'utf8'));w.eval(fs.readFileSync(path.join(root,'site.js'),'utf8'));
  const send=m=>new Promise(resolve=>listener(m,{id:'test',url:'chrome-extension://test/app.html'},resolve));
  const annotation={id:'a',label:'bird',type:'box',geometry:[.1,.1,.6,.6],reviewed:true};
  return {w,d,send,annotation,get paid(){return paid;},get draws(){return draws;},close:()=>w.close()};
}
test('Tek incelenen kutu normal araca aktarılır; ücretli düğme çağrılmaz; tekrar reddedilir',async()=>{
  const f=fixture();try{
    const c=await f.send({type:'CAPTURE_LOCAL_IMAGE'});assert.equal(c.ok,true,c.error);assert.equal(c.image.siteClasses[0],'karatavuk');
    const command={type:'DRAW_LOCAL_ANNOTATION',token:c.image.sourceToken,annotation:f.annotation,className:'karatavuk'};
    const drawn=await f.send(command);assert.equal(drawn.ok,true);assert.equal(drawn.state,'drawn');assert.equal(f.draws,1);assert.equal(f.paid,0);
    const again=await f.send(command);assert.equal(again.ok,false);assert.equal(f.draws,1);
  }finally{f.close();}
});
test('Değişmiş fotoğrafa, bilinmeyen sınıfa ve incelenmemiş etikete çizilmez',async()=>{
  const f=fixture();try{
    const c=await f.send({type:'CAPTURE_LOCAL_IMAGE'});const command={type:'DRAW_LOCAL_ANNOTATION',token:c.image.sourceToken,annotation:f.annotation,className:'karatavuk'};
    assert.equal((await f.send({...command,className:'yeni'})).ok,false);
    assert.equal((await f.send({...command,annotation:{...f.annotation,reviewed:false}})).ok,false);
    f.d.querySelector('header').textContent='2 / 400 farkli.jpg';
    assert.equal((await f.send(command)).ok,false);assert.equal(f.draws,0);assert.equal(f.paid,0);
  }finally{f.close();}
});
test('Sonucu belirsiz çizim yeniden denenmez',async()=>{
  const f=fixture();try{
    const c=await f.send({type:'CAPTURE_LOCAL_IMAGE'});f.d.getElementById('labels').removeAttribute('id');f.d.querySelector('aside:last-of-type').textContent='ETİKETLER (2)';
    const command={type:'DRAW_LOCAL_ANNOTATION',token:c.image.sourceToken,annotation:f.annotation,className:'karatavuk',allowExisting:true};
    const result=await f.send(command);assert.equal(result.ok,false);assert.equal(result.attempted,true);
    assert.equal((await f.send(command)).ok,false);assert.equal(f.draws,1);
  }finally{f.close();}
});

test('Çizim katmanı fotoğraf katmanından kaymışsa hiçbir nokta gönderilmez',async()=>{
  const f=fixture();try{
    const c=await f.send({type:'CAPTURE_LOCAL_IMAGE'});
    f.d.querySelectorAll('canvas')[1].getBoundingClientRect=()=>({left:50,top:0,width:240,height:100});
    const result=await f.send({type:'DRAW_LOCAL_ANNOTATION',token:c.image.sourceToken,annotation:f.annotation,className:'karatavuk'});
    assert.equal(result.ok,false);assert.equal(result.attempted,false);assert.equal(f.draws,0);
  }finally{f.close();}
});
