const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../core/classifier.js');
test('Sınıf sırası korunur ve eksik indeksli liste reddedilir',()=>{
  assert.deepEqual(C.parseLabels('{"0":"Turdus_merula","1":"Erithacus_rubecula"}'),['Turdus_merula','Erithacus_rubecula']);
  assert.throws(()=>C.parseLabels('{"0":"a","2":"b"}'));
});
test('Tür önerisi kutu üretmez ve model puanını korur',()=>{
  const result=C.topK(new Float32Array([.2,.8]),['a','b'],5);
  assert.equal(result[0].label,'b');assert.ok(Math.abs(result[0].score-.8)<.0001);
  assert.equal(result[0].box,undefined);
});
test('Sınıf sayısı model çıktısıyla uyuşmazsa sessizce yanlış ad atamaz',()=>{
  assert.throws(()=>C.topK([.1,.2,.7],['a','b'],5));
});
test('RGB tensörü 0-1 aralığında CHW düzenindedir',()=>{
  const tensor=C.rgbToCHW(new Uint8ClampedArray([255,0,128,255,0,255,64,255]),2,1);
  assert.deepEqual([...tensor].map(x=>Math.round(x*255)),[255,0,0,255,128,64]);
});
