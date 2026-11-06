const {test}=require('node:test');
const assert=require('node:assert/strict');
const B=require('../core/model-bank.js');

test('Alan ve kullanıcı seçimi ilgili uzmanları belirler',()=>{
  const models=[{id:'a',domain:'biodiversity',enabled:true},{id:'b',domain:'blood',enabled:true},{id:'c',domain:'biodiversity',enabled:false}];
  assert.deepEqual(B.route(models,'biodiversity').map(m=>m.id),['a']);
  assert.throws(()=>B.route(models,'plants'),/model/);
});
test('Aynı indeks farklı isimse uzlaşma sayılmaz; puanlar toplanmaz',()=>{
  const result=B.summarize([{modelId:'a',results:[{label:'kus',index:0,score:.98},{label:'kedi',score:.02}]},{modelId:'b',results:[{label:'kedi',index:0,score:.99},{label:'kus',score:.01}]}]);
  assert.equal(result.state,'disagreement');assert.equal(result.label,null);
});
test('Zayıf veya birbirine yakın tahmin otomatik kabul önermez',()=>{
  assert.equal(B.summarize([{modelId:'a',results:[{label:'kus',score:.6},{label:'kedi',score:.4}]}]).state,'uncertain');
  assert.equal(B.summarize([{modelId:'a',results:[{label:'kus',score:.8},{label:'kedi',score:.75}]}]).state,'uncertain');
});
test('Farklı indekslerde aynı güçlü sınıf uzlaşmadır',()=>{
  const result=B.summarize([{modelId:'a',results:[{label:'Turdus_merula',index:0,score:.9},{label:'b',score:.1}]},{modelId:'b',results:[{label:'Turdus_merula',index:84,score:.92},{label:'c',score:.08}]}]);
  assert.equal(result.state,'agreement');assert.equal(result.label,'Turdus_merula');
});
test('Boş veya bozuk tahmin kabul edilmez',()=>{
  assert.throws(()=>B.summarize([]));assert.throws(()=>B.summarize([{results:[{label:'kus',score:NaN}]}]));
});
