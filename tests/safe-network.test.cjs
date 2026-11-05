const {test}=require('node:test');
const assert=require('node:assert/strict');
const N=require('../core/network.js');
test('Evren LLM, otomatik etiketleme ve başka çıkarım sunucuları engellenir',()=>{
  for(const url of ['https://evren-llmapi.ssyz.org.tr/v1/chat/completions','https://api.ssyz.org.tr/api/v1/annotations/bulk','https://evren.ssyz.org.tr/inference','https://api-inference.huggingface.co/models/test']){
    assert.equal(N.allowed(url,'POST','chrome-extension://abc'),false);
  }
});
test('Yerel dosya ve model indirme GET istekleri kabul edilir',()=>{
  assert.equal(N.allowed('https://huggingface.co/Xenova/yolos-tiny/resolve/main/config.json','GET','chrome-extension://abc'),true);
  assert.equal(N.allowed('data:image/png;base64,abc','GET','chrome-extension://abc'),true);
  assert.equal(N.allowed('chrome-extension://abc/vendor/a.wasm','GET','chrome-extension://abc'),true);
});
test('Başka sitelere GET ile görsel aktarmak da engellenir',()=>{
  assert.equal(N.allowed('https://example.com/image?data=abc','GET','chrome-extension://abc'),false);
});
