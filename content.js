(() => {
  'use strict';
  if (window.top !== window || document.getElementById('evren-label-helper')) return;
  const host = document.createElement('aside');
  host.id = 'evren-label-helper';
  const shadow = host.attachShadow({mode:'open'});
  shadow.innerHTML = `
    <style>
      :host{all:initial;position:fixed;right:18px;bottom:18px;z-index:2147483647;color:#edf5fa;font:13px/1.5 'Segoe UI',sans-serif;max-width:calc(100vw - 32px)}
      *{box-sizing:border-box}section{width:340px;max-width:100%;background:#14212d;border:1px solid #405464;border-radius:14px;box-shadow:0 12px 40px #0006;overflow:hidden;max-height:90vh;overflow-y:auto}
      header{display:flex;align-items:center;justify-content:space-between;padding:13px 16px;background:#1c3040;border-bottom:1px solid #405464}
      h2{font-size:16px;margin:0;letter-spacing:-.3px}header small{color:#a9c1d3}.body{padding:14px 16px}
      p{margin:6px 0 12px;color:#a9c1d3}.fields{display:grid;grid-template-columns:1fr 1fr;gap:12px}label{display:block;margin:0 0 12px}
      input[type=number]{display:block;width:100%;margin-top:6px;background:#0d1923;color:#edf5fa;border:1px solid #577187;padding:9px;border-radius:6px;font:inherit}
      input[type=checkbox]{accent-color:#59c8e8}button{border:0;border-radius:7px;padding:10px 13px;cursor:pointer;background:#59c8e8;color:#092332;font:600 13px 'Segoe UI',sans-serif}
      button:focus-visible,input:focus-visible,summary:focus-visible{outline:2px solid #b8eaff;outline-offset:3px}
      button:disabled{opacity:.4;cursor:default}.actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0}#stop{background:#3c3540;color:#ffc5c5;border:1px solid #9b6570}
      #reset{background:#2b4050;color:#edf5fa}#fold{background:transparent;color:#a9c1d3;padding:4px 8px}
      output{display:block;white-space:pre-wrap;overflow-wrap:anywhere;padding:12px;background:#0d1923;border-radius:7px;min-height:65px;margin-top:12px}
      .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}.stats strong{display:block;font-size:21px;font-weight:600;font-variant-numeric:tabular-nums}.stats span{font-size:11px;color:#a9c1d3}
      small{color:#a9c1d3;display:block;font-size:11px}progress{width:100%;height:6px;accent-color:#59c8e8}details{margin-top:12px;border-top:1px solid #405464;padding-top:10px}summary{cursor:pointer;color:#a9c1d3}
      #history{white-space:pre-wrap;overflow-wrap:anywhere;max-height:150px;overflow:auto;font-size:11px;color:#a9c1d3}.hidden{display:none}
    </style>
    <section>
      <header><div><h2>Etiketleme yardımcısı</h2><small>Evren · v0.2.0</small></div><button id="fold" aria-label="Paneli daralt">−</button></header>
      <div class="body" id="body">
      <p>AI Meta, otomatik etiketleme ve sonraki görsel.</p>
      <div class="fields">
      <label>Görsel / dakika<input id="rpm" type="number" min="0.1" max="60" step="0.1" value="1"></label>
      <label>Çalışma sınırı<input id="limit" type="number" min="1" max="1000" value="5"></label>
      </div>
      <label><input id="new" type="checkbox"> Yeni sınıf önerilerini de onayla</label>
      <small>Seçili önerileri siteye kaydeder. Tüm nesneler için yeni sınıf seçeneğini açın. Etiketlerin doğruluğunu ayrıca inceleyin.</small>
      <div class="actions"><button id="start">Başlat</button><button id="stop" disabled>Durdur</button></div>
      <progress id="progress" value="0" max="5" aria-label="Çalışma ilerlemesi"></progress>
      <div class="stats"><div><strong id="done">0</strong><span>Tamamlanan</span></div><div><strong id="skipped">0</strong><span>Etiketli, atlandı</span></div><div><strong id="speed">0</strong><span>Gerçek görsel/dk</span></div></div>
      <small id="time">Geçen süre 00:00 · Bekliyor</small>
      <output id="log" aria-live="polite">Hazır. Veri setini veya etiketleme ekranını aç.</output>
      <details><summary>İşlem günlüğü</summary><pre id="history"></pre></details>
      <details><summary>Yarım kalan işlem</summary><p>Hata sonrası mevcut görseli sitede kontrol edip gerekirse kaydedin. Sonra kilidi kaldırın.</p><button id="reset">Kontrol ettim, kilidi kaldır</button></details>
      </div>
    </section>`;
  document.documentElement.appendChild(host);
  const $ = id => shadow.getElementById(id);
  const norm = EvrenLabelFlow.normalize;
  const visible = el => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const buttons = () => [...document.querySelectorAll('button')].filter(visible);
  const buttonName = el => norm(el.innerText || el.getAttribute('aria-label') || el.getAttribute('title'));
  const text = () => document.body.innerText;
  const key = () => {
    if (!location.pathname.startsWith('/annotate/')) return '';
    const id = new URL(location.href).searchParams.get('item');
    const filename = text().match(/[\w.-]+\.(?:jpe?g|png|webp|tiff?|bmp|avif)/i)?.[0];
    return id ? location.pathname + ':' + id : filename ? location.pathname + ':' + filename : '';
  };
  const labelCount = () => {
    const match = text().match(/ET[İI]KETLER\s*\(\s*(\d+)\s*\)/i);
    return match ? Number(match[1]) : null;
  };
  const storageKey = 'evren-label-helper-v1';
  let persisted;
  try { persisted = JSON.parse(sessionStorage.getItem(storageKey) || '{}'); }
  catch { persisted = {}; }
  const saved = new Set(Array.isArray(persisted.saved) ? persisted.saved : []);
  let pending = persisted.pending || '';
  let controller = null;
  let completed = 0;
  let skipped = 0;
  let visited = 0;
  let startedAt = null;
  let lastStart = null;
  let history = [];
  let signals = [];
  const seenSignals = new WeakMap();
  const saveState = () => sessionStorage.setItem(storageKey, JSON.stringify({saved:[...saved],pending}));
  const log = message => {
    $('log').textContent = message;
    history.push(new Date().toLocaleTimeString('tr-TR')+'  '+message);
    history=history.slice(-100); $('history').textContent=history.join('\n');
  };
  function refreshStats() {
    const seconds=startedAt===null ? 0 : Math.floor((Date.now()-startedAt)/1000);
    $('done').textContent=String(completed); $('skipped').textContent=String(skipped);
    $('progress').value=visited;
    $('speed').textContent=seconds>0 ? (completed*60/seconds).toFixed(1) : '0';
    $('time').textContent='Geçen süre '+String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0')+' · '+(controller && !controller.signal.aborted ? 'Çalışıyor' : 'Durdu');
  }
  setInterval(()=>{
    refreshStats();
    host.style.display=/^\/(annotate|datasets)\//.test(location.pathname)?'block':'none';
  },1000);
  $('fold').onclick=()=>{
    const collapsed=$('body').classList.toggle('hidden');
    $('fold').textContent=collapsed?'+':'−';
    $('fold').setAttribute('aria-label',collapsed?'Paneli genişlet':'Paneli daralt');
  };
  function labelsReady() {
    return labelCount()!==null && !/etiketler yükleniyor|görsel yükleniyor/i.test(text());
  }
  const scanSignals = () => {
    for (const el of document.querySelectorAll('[role="status"],[role="alert"],[data-sonner-toast]')) {
      const value = norm(el.innerText);
      if (visible(el) && value && seenSignals.get(el) !== value) {
        seenSignals.set(el,value); signals.push(value);
      }
    }
    if (signals.length > 200) signals = signals.slice(-100);
  };
  new MutationObserver(scanSignals).observe(document.body,{subtree:true,childList:true,characterData:true});
  scanSignals();
  function check() {
    if (!controller || controller.signal.aborted) throw new Error('Durduruldu');
    if (!location.pathname.startsWith('/annotate/')) throw new Error('Etiketleme sayfasından çıkıldı');
    const problem = signals.find(s => /kota|rate.?limit|çok fazla istek|too many requests|bot olarak|erişim engel|captcha|yetkisiz|oturum.*sona|başarısız|hata oluştu/.test(s));
    if (problem) throw new Error('Site uyarısı: ' + problem.slice(0,180));
  }
  async function waitFor(predicate, message, timeout=120000) {
    const deadline = Date.now()+timeout;
    while(Date.now()<deadline) {
      check(); const result = predicate(); if(result) return result;
      await new Promise(resolve=>setTimeout(resolve,250));
    }
    throw new Error(message);
  }
  function findButton(pattern, root=document) {
    const matches = [...root.querySelectorAll('button')].filter(el=>visible(el) && pattern.test(buttonName(el)));
    if(matches.length > 1) throw new Error('Birden fazla eşleşen düğme var; elle kontrol gerekli');
    return matches[0];
  }
  function click(el) {
    check(); if(!el || el.disabled || el.getAttribute('aria-disabled')==='true')
      throw new Error('Gerekli düğme bulunamadı veya kullanılamıyor');
    el.click();
  }
  async function prepareMeta() {
    if (/nesneler\s*\(\s*[1-9]\d*\s*\)/.test(norm(text()))) {
      log('Mevcut AI Meta kullanılacak.'); return;
    }
    log('AI Meta hazırlanıyor…');
    const oldCount = signals.length;
    const el = findButton(/^ai meta oluştur$/);
    click(el);
    let busy = false;
    await waitFor(()=>{
      const current = findButton(/^ai meta oluştur$/);
      if(!current || current.disabled || buttons().some(b=>/meta.*oluşturuluyor|analiz ediliyor/.test(buttonName(b)))) busy=true;
      const success = signals.slice(oldCount).some(s=>/meta/.test(s) && /oluşturuldu|tamamlandı|başarı/.test(s));
      return success || (busy && current && !current.disabled);
    },'AI Meta tamamlanması doğrulanamadı; işlem durdu.');
  }
  let autoDialog = null;
  let countBefore = 0;
  async function openSuggestions() {
    log('Otomatik etiketleme önerileri açılıyor…');
    countBefore = labelCount();
    if(countBefore === null) throw new Error('Etiket sayısı okunamadı; arayüz kontrol edilmeli');
    click(findButton(/^otomatik etiketle$/));
    autoDialog = await waitFor(()=>[...document.querySelectorAll('[role="dialog"]')]
      .find(el=>visible(el) && /otomatik etiketle/.test(norm(el.innerText))), 'Öneri penceresi açılmadı',20000);
    const newCount = norm(autoDialog.innerText).match(/yeni sınıf önerisi\s*\(\s*(\d+)\s*\)/);
    if(!newCount && /yeni sınıf/.test(norm(autoDialog.innerText)))
      throw new Error('Yeni sınıf sayısı okunamadı');
    return {newClasses:newCount ? Number(newCount[1]) : 0};
  }
  async function confirmSuggestions() {
    log('Seçili öneriler onaylanıyor…');
    const confirm = findButton(/^onayla ve etiketle\s*\(\s*[1-9]\d*\s*\)$/,autoDialog);
    if(!confirm) throw new Error('Onaylanacak öneri yok veya düğme biçimi değişti');
    pending = key(); saveState();
    click(confirm);
  }
  async function waitForLabels() {
    log('Etiketleme sonucunu bekliyorum…');
    await waitFor(()=>{
      if(autoDialog && visible(autoDialog)) return false;
      return labelCount() !== null && labelCount() > countBefore;
    },'Yeni etiket oluştuğu doğrulanamadı; otomatik kayıt yapılmadı.');
  }
  async function saveAndNextVerified() {
    log('Sitenin Sonraki düğmesiyle kaydedilip ilerleniyor…');
    const current=key();
    await nextVerified();
    saved.add(current); pending=''; saveState(); completed++;
    log('Sonraki görsele geçiş doğrulandı. Tamamlanan: '+completed);
  }
  async function nextVerified() {
    const previous = key();
    log('Sonraki görsele geçiliyor…');
    const el = findButton(/^sonraki(?: görsel)?$/) || findButton(/^kaydet ve sonraki$/);
    if(!el || el.disabled) throw new Error('Sonraki görsel yok veya düğme kullanılamıyor');
    click(el);
    await waitFor(()=>key() && key()!==previous && labelsReady(),'Sonraki görsele geçiş doğrulanamadı',20000);
  }
  $('stop').onclick = ()=> { controller?.abort(); log('Durduruldu. Başlamış sunucu işlemi tamamlanabilir; yeni adım başlatılmaz.'); };
  $('reset').onclick = ()=> {
    if(controller && !controller.signal.aborted) return;
    pending=''; saveState(); log('Yarım kalan işlem kilidi kaldırıldı.');
  };
  $('start').onclick = async()=>{
    if(controller && !controller.signal.aborted) return;
    if(pending) { log('Yarım kalan görsel var. Önce sitede kontrol edin; sonra kilidi kaldırın.'); return; }
    const limit = Number($('limit').value);
    const rpm = Number($('rpm').value);
    if(!Number.isInteger(limit) || limit<1 || limit>1000) { log('1–1000 arası görsel sayısı girin.'); return; }
    try { EvrenLabelFlow.delayUntilNext(null,rpm,Date.now()); } catch(error) {log(error.message);return;}
    $('start').disabled=true; $('stop').disabled=false;
    $('limit').disabled=true; $('rpm').disabled=true; $('new').disabled=true; $('reset').disabled=true;
    controller = new AbortController(); completed=0; skipped=0; visited=0; signals=[];
    startedAt=Date.now();lastStart=null;history=[];$('progress').max=limit;
    log('Çalışma başladı. Hedef: '+rpm+' görsel/dakika; sınır: '+limit+'.');
    try {
      if(!location.pathname.startsWith('/annotate/')) {
        const entry = [...document.querySelectorAll('a[href]')].filter(a=>visible(a) && norm(a.innerText)==='etiketle' && a.getAttribute('href').startsWith('/annotate/'));
        if(entry.length!==1) throw new Error('Veri seti detayını veya etiketleme ekranını açın.');
        entry[0].click();
        const deadline=Date.now()+20000;
        while(!location.pathname.startsWith('/annotate/')) {
          if(controller.signal.aborted) throw new Error('Durduruldu');
          if(Date.now()>deadline) throw new Error('Etiketleme ekranına geçilemedi');
          await new Promise(r=>setTimeout(r,250));
        }
      }
      await waitFor(()=>key() && labelsReady(),'Etiketleme ekranı hazır değil',20000);
      for(let n=0;n<limit;n++) {
        check();
        const delay = EvrenLabelFlow.delayUntilNext(lastStart,rpm,Date.now());
        if(delay>0){
          const until=Date.now()+delay;
          await waitFor(()=>{
            const remaining=Math.max(0,Math.ceil((until-Date.now())/1000));
            $('log').textContent='Hedef hız için bekleniyor: '+remaining+' saniye.\nTamamlanan: '+completed+' · Atlanan: '+skipped;
            return remaining===0;
          },'Hedef hız beklemesi tamamlanamadı',delay+3000);
        }
        lastStart=Date.now();
        if(labelCount()>0 && !saved.has(key())) {
          log('Mevcut etiketli görsel korunuyor; sonraki görsele geçiliyor.');
          await nextVerified(); skipped++; visited++; refreshStats(); continue;
        }
        await EvrenLabelFlow.runOne({key,wasSaved:k=>saved.has(k),prepareMeta,openSuggestions,
          confirmSuggestions,waitForLabels,nextVerified,saveAndNextVerified},
          {signal:controller.signal,allowNewClasses:$('new').checked});
        visited++; refreshStats();
      }
      log('Çalışma tamamlandı. '+completed+' görsel işlendi; '+skipped+' etiketli görsel atlandı. Sonuçları kontrol edin.');
    } catch(error) {
      log('Durdu: '+error.message+'\nTamamlanan görsel: '+completed);
    } finally {
      controller?.abort(); $('start').disabled=false; $('stop').disabled=true;
      $('limit').disabled=false; $('rpm').disabled=false; $('new').disabled=false; $('reset').disabled=false;
    }
  };
  log(pending ? 'Önceki işlem yarım kaldı. Mevcut görseli kontrol edin.' : 'Hazır. İlk denemede 1–5 görsel seçin.');
})();
