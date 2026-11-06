const {test}=require('node:test');
const assert=require('node:assert/strict');
const manifest=require('../manifest.json');

test('MV3 worker yalnız paket içindeki kaynaklardan başlatılabilir',()=>{
  const directives=new Map(manifest.content_security_policy.extension_pages.split(';').map(s=>s.trim().split(/\s+/)).filter(s=>s[0]).map(([name,...values])=>[name,values]));
  assert.deepEqual(directives.get('worker-src'),["'self'"],"Chrome MV3 worker-src blob: kabul etmez");
  assert.deepEqual(directives.get('script-src'),["'self'","'wasm-unsafe-eval'"]);
  assert.deepEqual(directives.get('object-src'),["'none'"]);
});
