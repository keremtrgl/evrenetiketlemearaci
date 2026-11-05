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
    const cancel=d.createElement('button');cancel.textContent='Vazgeç';cancel.onclick=()=>dialog.remove();dialog.appendChild(cancel);
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
test('Yeni sınıf izni kapalıysa onaylamadan ilerler ve hata nedenini saklar',async()=>{
  const f=fixture();
  try{
    f.panel.getElementById('new').checked=false;
    f.panel.getElementById('start').click();
    await until(()=>!f.panel.getElementById('start').disabled);
    assert.deepEqual(f.events,['meta','auto','next']);
    const queue=JSON.parse(f.w.sessionStorage.getItem('evren-label-helper-v1')).deferred;
    assert.equal(queue.length,1);
    assert.match(queue[0].reason,/Yeni sınıf/);
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

test('Geç etkinleşen onay düğmesini bekler ve yalnız bir kez onaylar',async()=>{
  const f=fixture();
  try{
    const open=f.d.getElementById('auto').onclick;
    f.d.getElementById('auto').onclick=()=>{
      open();const b=f.d.querySelector('[role="dialog"] button');b.disabled=true;
      f.w.setTimeout(()=>{b.disabled=false;},600);
    };
    f.panel.getElementById('start').click();
    await until(()=>!f.panel.getElementById('start').disabled);
    assert.deepEqual(f.events,['meta','auto','confirm','next']);
    assert.equal(f.panel.getElementById('done').textContent,'1');
  }finally{f.close();}
});

test('Onay beklerken durdurulursa istek göndermez ve yarım işlem bırakmaz',async()=>{
  const f=fixture();
  try{
    const open=f.d.getElementById('auto').onclick;
    f.d.getElementById('auto').onclick=()=>{
      open();f.d.querySelector('[role="dialog"] button').disabled=true;
    };
    f.panel.getElementById('start').click();
    await until(()=>f.events.includes('auto'));
    assert.equal(f.panel.getElementById('start').disabled,true);
    f.panel.getElementById('stop').click();
    await until(()=>!f.panel.getElementById('start').disabled);
    assert.equal(f.events.includes('confirm'),false);
    assert.equal(JSON.parse(f.w.sessionStorage.getItem('evren-label-helper-v1')||'{}').pending||'','');
  }finally{f.close();}
});

test('Yarım kalan eski kayıt Başlat düğmesini kilitlemez ve anotasyonu tekrarlamaz',async()=>{
  const f=fixture();
  try{
    f.w.sessionStorage.setItem('evren-label-helper-v1',JSON.stringify({pending:'/annotate/dataset:kus.jpg',saved:[]}));
    f.d.getElementById('evren-label-helper').remove();
    f.w.eval(fs.readFileSync(path.join(extension,'content.js'),'utf8'));
    const panel=f.d.getElementById('evren-label-helper').shadowRoot;
    panel.getElementById('limit').value=1;
    f.d.getElementById('labels').textContent='ETİKETLER ( 2 )';
    panel.getElementById('start').click();
    await until(()=>!panel.getElementById('start').disabled);
    assert.deepEqual(f.events,['next']);
    assert.doesNotMatch(panel.getElementById('log').textContent,/Önce sitede kontrol/);
  }finally{f.close();}
});

test('Hatalı görseli not edip ilerler, tur sonunda geri dönüp bir kez yeniden dener',async()=>{
  const f=fixture();
  try{
    let index=1;let first=true;
    const head=f.d.querySelector('header');
    const counter=f.d.createElement('span');head.appendChild(counter);
    const prev=f.d.createElement('button');prev.innerHTML='<svg class="lucide-chevron-left"></svg>';head.appendChild(prev);
    const render=()=>{counter.textContent=index+' / 3';f.d.getElementById('filename').textContent=index===1?'kus.jpg':'gorsel'+index+'.jpg';f.d.getElementById('labels').textContent='ETİKETLER ( 0 )';};
    render();
    f.d.getElementById('next').onclick=()=>{f.events.push('next');index++;render();};
    prev.onclick=()=>{f.events.push('previous');index--;render();};
    const open=f.d.getElementById('auto').onclick;
    f.d.getElementById('auto').onclick=()=>{
      open();const dialog=f.d.querySelector('[role="dialog"]');
      if(first){first=false;const match=dialog.querySelector('p');match.textContent='YENİ SINIF ÖNERİSİ ( 1 )';}
      else dialog.querySelector('p').textContent='MEVCUT SINIFLARLA EŞLEŞEN ( 2 )';
    };
    f.panel.getElementById('new').checked=false;
    f.panel.getElementById('rpm').value=60;
    f.panel.getElementById('start').click();
    await until(()=>!f.panel.getElementById('start').disabled);
    assert.equal(f.events.filter(e=>e==='confirm').length,1);
    assert.equal(f.events.includes('previous'),true);
    assert.equal(f.panel.getElementById('done').textContent,'1');
    assert.equal(JSON.parse(f.w.sessionStorage.getItem('evren-label-helper-v1')).deferred.length,0);
  }finally{f.close();}
});

test('Önceden onay gönderilmiş ama sonuç görünmüyorsa yeniden etiketleme yapmaz',async()=>{
  const f=fixture();
  try{
    f.w.sessionStorage.setItem('evren-label-helper-v1',JSON.stringify({pending:'/annotate/dataset:kus.jpg',saved:[]}));
    f.d.getElementById('evren-label-helper').remove();
    f.w.eval(fs.readFileSync(path.join(extension,'content.js'),'utf8'));
    const panel=f.d.getElementById('evren-label-helper').shadowRoot;
    panel.getElementById('limit').value=1;
    panel.getElementById('start').click();
    await until(()=>!panel.getElementById('start').disabled);
    assert.deepEqual(f.events,['next']);
    const state=JSON.parse(f.w.sessionStorage.getItem('evren-label-helper-v1'));
    assert.equal(state.pending,'');
    assert.equal(state.deferred[0].submitted,true);
    assert.equal(state.deferred[0].status,'inceleme gerekli');
  }finally{f.close();}
});

test('Kota uyarısı geldiğinde erteleme bahanesiyle sıradaki görsele geçmez',async()=>{
  const f=fixture();
  try{
    const open=f.d.getElementById('auto').onclick;
    f.d.getElementById('auto').onclick=()=>{
      open();f.d.querySelector('[role="dialog"] button').disabled=true;
      f.d.getElementById('notifications').textContent='Günlük kota doldu';
    };
    f.panel.getElementById('start').click();
    await until(()=>!f.panel.getElementById('start').disabled);
    assert.deepEqual(f.events,['meta','auto']);
    assert.match(f.panel.getElementById('log').textContent,/Site uyarısı/);
  }finally{f.close();}
});
