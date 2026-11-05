const {test}=require('node:test');
const assert=require('node:assert/strict');
const A=require('../core/annotations.js');

test('Piksel kutularını boyuta göre normalize eder, bozuk sonuçları bildirir',()=>{
  const result=A.fromDetections([{label:'bird',score:.9,box:{xmin:10,ymin:20,xmax:50,ymax:80}},{label:'bird',score:.9,box:{xmin:40,ymin:0,xmax:10,ymax:5}}],100,100,.5);
  assert.deepEqual(result.annotations[0].geometry,[.1,.2,.5,.8]);
  assert.equal(result.rejected,1);
});
test('Sınır dışı, sıfır alan ve sonlu olmayan koordinatlar dışa aktarılamaz',()=>{
  for(const geometry of [[-1,0,1,1],[0,0,0,1],[0,0,Infinity,1],[.8,0,.2,1]]){
    assert.throws(()=>A.validate({type:'box',label:'bird',geometry}));
  }
});
test('Poligonun en az üç köşesi ve sıfırdan büyük alanı olmalı',()=>{
  assert.throws(()=>A.validate({type:'polygon',label:'bird',geometry:[[0,0],[1,1]]}));
  assert.throws(()=>A.validate({type:'polygon',label:'bird',geometry:[[0,0],[.5,.5],[1,1]]}));
  assert.equal(A.validate({type:'polygon',label:'bird',geometry:[[0,0],[1,0],[0,1]]}).type,'polygon');
});
test('YOLO kutu ve segmentasyon etiketlerini karıştırmadan üretir',()=>{
  const box={type:'box',label:'bird',geometry:[.1,.2,.5,.8]};
  assert.equal(A.toYolo([box],['bird'],'detection'),'0 0.300000 0.500000 0.400000 0.600000');
  assert.throws(()=>A.toYolo([box],['bird'],'segmentation'));
});
test('COCO gerçek boyutla piksel kutusu üretir',()=>{
  const result=A.toCoco([{name:'kus.jpg',width:1000,height:500,annotations:[{id:'a',type:'box',label:'bird',geometry:[.1,.2,.5,.8]}]}]);
  assert.deepEqual(result.annotations[0].bbox,[100,100,400,300]);
  assert.equal(result.annotations[0].area,120000);
});
test('Model bird tahminini tür adına otomatik dönüştürmez',()=>{
  const result=A.fromDetections([{label:'bird',score:.9,box:{xmin:1,ymin:1,xmax:9,ymax:9}}],10,10,.5);
  assert.equal(result.annotations[0].label,'bird');
  assert.equal(result.annotations[0].reviewed,false);
});
test('Düşük puanlı tahminleri filtreler; puanı doğruluk garantisi saymaz',()=>{
  const result=A.fromDetections([{label:'bird',score:.2,box:{xmin:1,ymin:1,xmax:9,ymax:9}}],10,10,.5);
  assert.equal(result.annotations.length,0);
});
