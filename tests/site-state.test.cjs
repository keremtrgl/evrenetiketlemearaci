const {test}=require('node:test');
const assert=require('node:assert/strict');
const S=require('../core/site-state.js');
const source={path:'/annotate/dataset',item:null,filename:'kus.jpg',position:'51 / 400'};
const item={source,sourceToken:'token',sourceTab:17,width:800,height:400,siteClasses:['karatavuk'],storageHealthy:true,existingCount:0};
const annotation={id:'a',type:'box',label:'Turdus_merula',reviewed:true};
const context={ready:true,source,tabId:17,siteClasses:['karatavuk'],existingCount:0};

test('Kaynak anahtarı nesne sırasından ve önizleme boyutundan bağımsızdır',()=>{
  assert.equal(S.sourceKey(source),S.sourceKey({filename:'kus.jpg',position:'51/400',item:null,path:'/annotate/dataset'}));
  assert.notEqual(S.sourceKey(source),S.sourceKey({...source,path:'/annotate/other'}));
  assert.notEqual(S.sourceKey(source),S.sourceKey({...source,filename:'other.jpg'}));
});
test('Aynı kaynağın orantılı yeni önizlemesi normalize taslağı geri yükleyebilir',()=>{
  assert.equal(S.canRestore({...item,width:400,height:200},item),true);
  assert.equal(S.canRestore({...item,width:400,height:400},item),false);
  assert.equal(S.canRestore({...item,source:{...source,filename:'b.jpg'}},item),false);
});
test('Aktarım yalnız hazır doğru sekme, kaynak ve tekil mevcut sınıfla açılır',()=>{
  assert.equal(S.transferReason(item,annotation,context,'karatavuk',false),'');
  assert.match(S.transferReason(item,annotation,{...context,tabId:18},'karatavuk',false),/sekme/);
  assert.match(S.transferReason(item,annotation,{...context,ready:false},'karatavuk',false),/hazır/);
  assert.match(S.transferReason(item,annotation,{...context,source:{...source,position:'52/400'}},'karatavuk',false),/değişti/);
  assert.match(S.transferReason(item,annotation,{...context,siteClasses:['karatavuk','karatavuk']},'karatavuk',false),/tekil/);
});
test('Mevcut etiketler ve önceki aktarım girişimi açıkça engellenir',()=>{
  assert.match(S.transferReason(item,annotation,{...context,existingCount:2},'karatavuk',false),/Mevcut/);
  assert.equal(S.transferReason(item,annotation,{...context,existingCount:2},'karatavuk',true),'');
  assert.match(S.transferReason({...item,transfers:{a:{state:'uncertain'}}},annotation,context,'karatavuk',false),/denendi/);
});
test('Eşleme yalnız kullanıcının kaydettiği mevcut tek sınıfa uygulanır',()=>{
  assert.equal(S.mappedClass('bird',{},['karatavuk']),'');
  assert.equal(S.mappedClass('Turdus_merula',{'Turdus_merula':'karatavuk'},['karatavuk']),'karatavuk');
  assert.equal(S.mappedClass('Turdus_merula',{'Turdus_merula':'karatavuk'},['saksagan']),'');
  assert.equal(S.mappedClass('karatavuk',{},['karatavuk']),'karatavuk');
});
test('Tanı raporu yalnız izinli sayımları içerir; fotoğraf veya kimlik bilgisi taşımaz',()=>{
  const report=S.diagnostic({version:'0.5.0',context:{...context,dataUrl:'private',apiKey:'secret',source},item:{...item,dataUrl:'private'},experts:[{name:'private.onnx',classes:1000,bytes:45}],busy:false});
  const json=JSON.stringify(report);assert.doesNotMatch(json,/private|secret|kus.jpg|dataset|token/);assert.equal(report.modelCount,1);
});
