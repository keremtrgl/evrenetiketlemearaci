const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(require('node:path').join(__dirname,'../site.js'),'utf8');

test('Yakalama isteği ücretli düğmelere basmaz ve siteye yazım komutu kabul etmez',async()=>{
  const dom=new JSDOM('<body><header>kus.jpg</header><button>AI Meta Oluştur</button><button>Otomatik Etiketle</button><button aria-label="Akıllı Seçim">S</button></body>',{url:'https://evren.ssyz.org.tr/annotate/id?item=x',runScripts:'outside-only'});
  let listener;let clicks=0;
  dom.window.document.querySelectorAll('button').forEach(b=>b.onclick=()=>clicks++);
  dom.window.chrome={runtime:{id:'test',onMessage:{addListener:fn=>listener=fn}}};
  dom.window.eval(source);
  const reply=await new Promise(resolve=>listener({type:'WRITE_ANNOTATIONS'},{id:'test',url:'chrome-extension://test/app.html'},resolve));
  assert.equal(reply.ok,false);
  assert.equal(clicks,0);
  const capture=await new Promise(resolve=>listener({type:'CAPTURE_LOCAL_IMAGE'},{id:'test',url:'chrome-extension://test/app.html'},resolve));
  assert.equal(capture.ok,false);
  assert.equal(clicks,0);
  dom.window.close();
});
