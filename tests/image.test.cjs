const {test}=require('node:test');const assert=require('node:assert/strict');
const image=require('../core/image.js');
test('Bellekteki fotoğraf ağ okumadan özgün baytlarına açılır',async()=>{
  const bytes=Buffer.from([137,80,78,71,0,255]);const blob=image.toBlob('data:image/png;base64,'+bytes.toString('base64'));
  assert.equal(blob.type,'image/png');assert.deepEqual(Buffer.from(await blob.arrayBuffer()),bytes);
});
test('Görsel çözücü uzak adres, SVG ve bozuk base64 kabul etmez',()=>{
  for(const value of ['https://evren.ssyz.org.tr/photo.jpg','data:text/html;base64,WA==','data:image/svg+xml;base64,WA==','data:image/png;base64,***','data:image/png;base64,','data:image/png;base64,x'])assert.throws(()=>image.toBlob(value));
});
