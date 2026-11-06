const {test}=require('node:test');const assert=require('node:assert/strict');
const {create}=require('../core/site-client.js');
test('Yan panel geçici activeTab izni olmadan Evren adresini okuyup tuvali alabilir',async()=>{
  const manifest=require('../manifest.json');let captures=0;
  const chrome={tabs:{get:async()=>manifest.host_permissions.includes('https://evren.ssyz.org.tr/*')?{id:5,url:'https://evren.ssyz.org.tr/annotate/id'}:{id:5},sendMessage:async(id,message)=>{assert.equal(id,5);assert.equal(message.type,'CAPTURE_LOCAL_IMAGE');captures++;return {ok:true,image:{sourceToken:'test'}};}}};
  const result=await create(chrome).request(5,{type:'CAPTURE_LOCAL_IMAGE'});assert.equal(result.ok,true);assert.equal(captures,1);
});
test('Chrome adresi gizliyorsa sekme kapalı demek yerine site erişimi hatası verir',async()=>{
  let sends=0;const chrome={tabs:{get:async()=>({id:5}),sendMessage:async()=>sends++}};
  await assert.rejects(create(chrome).request(5,{type:'CAPTURE_LOCAL_IMAGE'}),/site erişimi/i);assert.equal(sends,0);
});
test('Eksik alıcıda yalnız okuma için paketli köprü bir kez kurulur',async()=>{
  let sends=0,injections=0;
  const chrome={tabs:{get:async()=>({url:'https://evren.ssyz.org.tr/annotate/id'}),sendMessage:async()=>{if(++sends===1)throw new Error('Could not establish connection. Receiving end does not exist.');return {ok:true};}},scripting:{executeScript:async options=>{injections++;assert.deepEqual(options.files,['core/annotations.js','site.js']);}}};
  assert.equal((await create(chrome).request(5,{type:'CAPTURE_LOCAL_IMAGE'})).ok,true);assert.equal(sends,2);assert.equal(injections,1);
});
test('Yazım isteği bağlantı hatasında asla tekrar gönderilmez',async()=>{
  let sends=0;const chrome={tabs:{get:async()=>({url:'https://evren.ssyz.org.tr/annotate/id'}),sendMessage:async()=>{sends++;throw new Error('Receiving end does not exist.');}},scripting:{executeScript:async()=>assert.fail('Yazımda köprü kurulmaz')}};
  await assert.rejects(create(chrome).request(5,{type:'DRAW_LOCAL_ANNOTATION'}));assert.equal(sends,1);
});
test('Yanlış siteye betik kurulmaz ve sıradan hata tekrar denenmez',async()=>{
  let sends=0;const chrome={tabs:{get:async()=>({url:'https://evren.ssyz.org.tr.evil.test/annotate/id'}),sendMessage:async()=>sends++},scripting:{executeScript:async()=>assert.fail()}};
  await assert.rejects(create(chrome).request(5,{type:'GET_SITE_CONTEXT'}),/Evren/);assert.equal(sends,0);
});

test('Durdur sekme okunurken geldiyse sonrasında yazım gönderilmez',async()=>{
  let finish,sends=0;const controller=new AbortController();
  const chrome={tabs:{get:async()=>new Promise(resolve=>finish=resolve),sendMessage:async()=>sends++}};
  const request=create(chrome).request(5,{type:'DRAW_LOCAL_ANNOTATION'},{signal:controller.signal});
  while(!finish)await new Promise(resolve=>setImmediate(resolve));controller.abort();finish({url:'https://evren.ssyz.org.tr/annotate/id'});
  await assert.rejects(request,/Durdur/);assert.equal(sends,0);
});
