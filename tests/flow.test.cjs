const {test} = require('node:test');
const assert = require('node:assert/strict');
const {runOne,normalize,delayUntilNext} = require('../flow.js');

test('Türkçe arayüzde AI düğmesi dotless ı nedeniyle kaybolmaz', () => {
  assert.equal(normalize('AI Meta Oluştur'), 'ai meta oluştur');
  assert.equal(normalize('  YENİ SINIF ÖNERİSİ (10) '), 'yeni sınıf önerisi (10)');
  assert.match(normalize('AI Meta Oluştur'), /^ai meta oluştur$/);
});

function fixture() {
  const actions = [];
  const saved = new Set();
  let key = 'gorsel-a';
  const adapter = {
    key: () => key,
    prepareMeta: async () => actions.push('meta'),
    openSuggestions: async () => { actions.push('oneriler'); return {newClasses: 2}; },
    confirmSuggestions: async () => actions.push('onay'),
    waitForLabels: async () => actions.push('etiketler'),
    saveVerified: async () => { actions.push('kayit'); saved.add(key); },
    nextVerified: async () => { actions.push('sonraki'); key = 'gorsel-b'; },
    wasSaved: k => saved.has(k)
  };
  return {adapter, actions, saved, changeKey: value => key = value};
}

test('Kayıt doğrulanmadan sonraki görsele geçmez', async () => {
  const f = fixture();
  await runOne(f.adapter, {allowNewClasses:true});
  assert.deepEqual(f.actions, ['meta','oneriler','onay','etiketler','kayit','sonraki']);
});
test('Kayıt hatasında sonraki ve yeniden etiketleme çalışmaz', async () => {
  const f = fixture();
  f.adapter.saveVerified = async () => { throw new Error('Kayıt onaylanmadı'); };
  await assert.rejects(runOne(f.adapter, {allowNewClasses:true}), /Kayıt onaylanmadı/);
  assert.equal(f.actions.includes('sonraki'), false);
});
test('Yeni sınıf izni yoksa önerileri onaylamaz', async () => {
  const f = fixture();
  await assert.rejects(runOne(f.adapter, {allowNewClasses:false}), /Yeni sınıf/);
  assert.deepEqual(f.actions,['meta','oneriler']);
});
test('İptal edilen iş yeni işlem başlatmaz', async () => {
  const f = fixture(); const controller = new AbortController(); controller.abort();
  await assert.rejects(runOne(f.adapter,{signal:controller.signal}), /Durduruldu/);
  assert.deepEqual(f.actions,[]);
});
test('İşlem sırasında kullanıcı görsel değiştirirse kayıt yapmaz', async () => {
  const f = fixture();
  f.adapter.waitForLabels = async () => { f.actions.push('etiketler'); f.changeKey('baska'); };
  await assert.rejects(runOne(f.adapter,{allowNewClasses:true}), /Görsel değişti/);
  assert.equal(f.actions.includes('kayit'),false);
});
test('Bu oturumda kaydedilen görsel yeniden etiketlenmez', async () => {
  const f = fixture(); f.saved.add('gorsel-a');
  await runOne(f.adapter,{allowNewClasses:true});
  assert.deepEqual(f.actions,['sonraki']);
});
test('Nesne üretmeyen işlem boş etiket kaydetmez', async () => {
  const f = fixture();
  f.adapter.waitForLabels = async () => { throw new Error('Etiket oluşmadı'); };
  await assert.rejects(runOne(f.adapter,{allowNewClasses:true}),/Etiket oluşmadı/);
  assert.equal(f.actions.includes('kayit'),false);
});

test('Site kaydet ve sonraki yapıyorsa ikinci kez ilerlemez', async () => {
  const f=fixture();
  f.adapter.saveAndNextVerified=async()=>{f.actions.push('kaydet-sonraki');f.changeKey('gorsel-b');};
  await runOne(f.adapter,{allowNewClasses:true});
  assert.deepEqual(f.actions,['meta','oneriler','onay','etiketler','kaydet-sonraki']);
});
test('Dakikada 2 hedefinde başlangıçlar en az 30 saniye ayrılır',()=>{
  assert.equal(delayUntilNext(1000,2,11000),20000);
  assert.equal(delayUntilNext(1000,2,41000),0);
  assert.equal(delayUntilNext(null,2,0),0);
});
test('Geçersiz hedef hız sıfır bekleme ile sınırsız döngü açmaz',()=>{
  for(const rpm of [0,-1,NaN,Infinity,61]) assert.throws(()=>delayUntilNext(0,rpm,1),/Hız/);
});
test('Yavaş model gecikmiş işleri yetiştirmek için arka arkaya istek oluşturmaz',()=>{
  assert.equal(delayUntilNext(70000,1,75000),55000);
});
