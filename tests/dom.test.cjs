const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const extension = process.env.EVREN_TEST_EXTENSION || path.resolve(__dirname,'..');

function fixture() {
  const dom=new JSDOM(`<!doctype html><body>
    <header><span id="filename">kus.jpg</span><button id="next">Sonraki</button></header>
    <button id="meta">AI Meta Oluştur</button><button id="auto">Otomatik Etiketle</button>
    <div id="metadata"></div><aside id="labels">ETİKETLER ( 0 )</aside>
    <div id="notifications" role="status"></div>
  </body>`,{url:'https://evren.ssyz.org.tr/annotate/dataset',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,d=w.document,events=[];
  Object.defineProperty(w.HTMLElement.prototype,'innerText',{
    get(){return this.textContent;},set(value){this.textContent=value;}
  });
  const observers=[]; const NativeObserver=w.MutationObserver;
  w.MutationObserver=class extends NativeObserver {constructor(callback){super(callback);observers.push(this);}};
  const close=()=>{observers.forEach(o=>o.disconnect());dom.window.close();};
  w.HTMLElement.prototype.getClientRects=function(){return !this.isConnected || this.style.display==='none'?[]:[{width:20,height:20}];};
  d.getElementById('meta').onclick=()=>{
    events.push('meta');const b=d.getElementById('meta');b.disabled=true;b.textContent='Analiz ediliyor...';
    w.setTimeout(()=>{b.disabled=false;b.textContent='AI Meta Oluştur';d.getElementById('metadata').textContent='NESNELER ( 2 ) kuş, sandalye';},10);
  };
  d.getElementById('auto').onclick=()=>{
    events.push('auto');const dialog=d.createElement('div');dialog.setAttribute('role','dialog');
    dialog.innerHTML='<h2>Otomatik Etiketle</h2><p>YENİ SINIF ÖNERİSİ ( 1 )</p><label><input type="checkbox" checked>Sandalye</label><button>Onayla ve Etiketle (2)</button>';
    dialog.querySelector('button').onclick=()=>{
      events.push('confirm');dialog.remove();d.getElementById('labels').textContent='ETİKETLER ( 2 ) kuş, sandalye';
    };
    d.body.appendChild(dialog);
  };
  d.getElementById('next').onclick=()=>{
    events.push('next');d.getElementById('filename').textContent='ikinci.jpg';d.getElementById('labels').textContent='ETİKETLER ( 0 )';
  };
  w.eval(fs.readFileSync(path.join(extension,'flow.js'),'utf8'));
  w.eval(fs.readFileSync(path.join(extension,'content.js'),'utf8'));
  const panel=d.getElementById('evren-label-helper').shadowRoot;
  panel.getElementById('limit').value=1;panel.getElementById('new').checked=true;
  return {dom,w,d,panel,events,close};
}
async function until(predicate, timeout=3500){const end=Date.now()+timeout;while(Date.now()<end){if(predicate())return;await new Promise(r=>setTimeout(r,20));}throw new Error('Koşul zamanında gerçekleşmedi');}

test('Gerçek düğme metinleriyle meta -> otomatik -> onay -> Sonraki akışı çalışır',async()=>{
  const f=fixture();
  try{
    f.panel.getElementById('start').click();
    await until(()=>!f.panel.getElementById('start').disabled);
    assert.deepEqual(f.events,['meta','auto','confirm','next']);
    assert.match(f.panel.getElementById('log').textContent,/tamamlandı/);
    assert.equal(f.panel.getElementById('done').textContent,'1');
  }finally{f.close();}
});
test('Mevcut meta varsa tekrar üretmeden canlı olmayan sınıfı da onay akışına alır',async()=>{
  const f=fixture();
  try{
    f.d.getElementById('metadata').textContent='NESNELER ( 2 ) kuş, sandalye';
    f.panel.getElementById('start').click();
    await until(()=>!f.panel.getElementById('start').disabled);
    assert.deepEqual(f.events,['auto','confirm','next']);
  }finally{f.close();}
});
test('Yeni sınıf izni kapalıysa sandalyeyi sessizce atlamaz; açıklayarak durur',async()=>{
  const f=fixture();
  try{
    f.panel.getElementById('new').checked=false;
    f.panel.getElementById('start').click();
    await until(()=>!f.panel.getElementById('start').disabled);
    assert.deepEqual(f.events,['meta','auto']);
    assert.match(f.panel.getElementById('log').textContent,/Yeni sınıf/);
  }finally{f.close();}
});
test('Durdur, devam eden meta sonrasında onay ve sonraki işlemlerini engeller',async()=>{
  const f=fixture();
  try{
    f.panel.getElementById('start').click();
    await until(()=>f.events.includes('meta'));
    f.panel.getElementById('stop').click();
    await until(()=>!f.panel.getElementById('start').disabled);
    assert.deepEqual(f.events,['meta']);
  }finally{f.close();}
});
