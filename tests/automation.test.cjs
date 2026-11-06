const {test}=require('node:test');const assert=require('node:assert/strict');
const {Runner,approve}=require('../core/automation.js');
const vote=label=>({results:[{label,score:.97},{label:'other',score:.02}]});
test('Otomatik onay iki güçlü uzman ve açık sınıf eşlemesi gerektirir',()=>{
  const a={id:'a',type:'box',geometry:[.1,.1,.7,.8],label:'bird',ensemble:{votes:[vote('Turdus_merula'),vote('Turdus_merula')]}};
  const p={mappings:{Turdus_merula:'karatavuk'},classes:['karatavuk']};
  const result=approve([a],p);assert.equal(result.ok,true);assert.equal(result.annotations[0].reviewed,true);assert.equal(result.annotations[0].reviewMethod,'automatic-policy');assert.equal(result.annotations[0].siteClass,'karatavuk');
  assert.equal(approve([a],{...p,mappings:{}}).ok,false);
  assert.equal(approve([{...a,ensemble:{votes:[vote('Turdus_merula')]}}],p).ok,false);
  assert.equal(approve([{...a,ensemble:{votes:[vote('Turdus_merula'),vote('Pica_pica')]}}],p).ok,false);
});
test('Tek belirsiz nesne varsa görsel kısmen onaylanmaz',()=>{
  const good={id:'a',type:'box',geometry:[.1,.1,.4,.5],ensemble:{votes:[vote('sincap'),vote('sincap')]}};
  assert.equal(approve([good,{...good,id:'b',ensemble:{votes:[vote('sincap'),{results:[{label:'sincap',score:.55}]}]}}],{mappings:{sincap:'sincap'},classes:['sincap']}).ok,false);
});
test('Farklı yazılmış tür adları yalnız açık eşlemeyle aynı sınıfta uzlaşır',()=>{
  const a={id:'a',type:'box',geometry:[.1,.1,.4,.5],ensemble:{votes:[vote('Turdus_merula'),vote('turdus_merula')]}};
  const policy={mappings:{Turdus_merula:'karatavuk',turdus_merula:'karatavuk'},classes:['karatavuk']};
  assert.equal(approve([a],policy).ok,true);assert.equal(approve([a],{...policy,mappings:{Turdus_merula:'karatavuk'}}).ok,false);
});
test('Geçersiz olasılık ve yinelenen uzman oyları otomatik onaylanmaz',()=>{
  const a={id:'a',type:'box',geometry:[.1,.1,.4,.5],ensemble:{votes:[{modelId:'one',results:[{label:'sincap',score:.97},{label:'other',score:NaN}]},{modelId:'two',...vote('sincap')}]}};
  const policy={mappings:{},classes:['sincap']};assert.equal(approve([a],policy).ok,false);
  a.ensemble.votes[0].results[1].score=.01;a.ensemble.votes[0].results[0].score=1.2;assert.equal(approve([a],policy).ok,false);
  a.ensemble.votes[0].results[0].score=.97;a.ensemble.votes[1].modelId='one';assert.equal(approve([a],policy).ok,false);
});
test('Çalışma sınırı atlananları da sayar; son görselden sonra ileri gitmez',async()=>{
  let processed=0,next=0;
  const r=new Runner({context:async()=>({id:processed}),process:async()=>({state:++processed===1?'completed':'skipped'}),next:async()=>{next++;return {end:false};},wait:async()=>{},now:()=>0});
  const result=await r.start({limit:3,perMinute:5});assert.equal(result.visited,3);assert.equal(result.completed,1);assert.equal(result.skipped,2);assert.equal(next,2);assert.equal(result.phase,'finished');
});
test('Durdur bekleyen işlemin ardından yeni görsele geçmez',async()=>{
  let release,next=0;
  const r=new Runner({context:async()=>({}),process:async()=>new Promise(resolve=>release=resolve),next:async()=>{next++;return {};},wait:async()=>{},now:()=>0});
  const running=r.start({limit:10,perMinute:5});while(!release)await new Promise(resolve=>setImmediate(resolve));r.stop();release({state:'completed'});
  const result=await running;assert.equal(next,0);assert.equal(result.phase,'stopped');assert.equal(result.completed,1);
});
test('Kayıt belirsizliğinde otomatik tekrar veya sonraki görsel yok',async()=>{
  let next=0,calls=0;
  const r=new Runner({context:async()=>({}),process:async()=>{calls++;throw new Error('Kayıt sonucu belirsiz');},next:async()=>next++,wait:async()=>{},now:()=>0});
  const result=await r.start({limit:5,perMinute:5});assert.equal(result.phase,'error');assert.equal(calls,1);assert.equal(next,0);assert.match(result.error,/belirsiz/);
});
test('Hız bir üst sınırdır; kalan süre kadar bekler',async()=>{
  let time=0;const waits=[];
  const r=new Runner({context:async()=>({}),process:async()=>{time+=2000;return {state:'review'};},next:async()=>({end:false}),wait:async ms=>{waits.push(ms);time+=ms;},now:()=>time});
  const result=await r.start({limit:2,perMinute:5});assert.deepEqual(waits,[10000]);assert.equal(result.review,2);
});
