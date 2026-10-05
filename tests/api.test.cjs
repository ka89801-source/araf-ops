const {test}=require('node:test');const assert=require('node:assert/strict');
const ops=require('../api/ops/[route].js');const legal=require('../api/legal-check.js');
function res(){return {headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(data){this.data=data;return this;}};}
test('proxy only forwards approved routes and never unauthenticated calls',async()=>{
 const old=global.fetch;let called=false;global.fetch=async()=>{called=true;};
 try{let r=res();await ops({method:'GET',query:{route:'https://evil.example'},headers:{}},r);assert.equal(r.code,404);
 r=res();await ops({method:'GET',query:{route:'ops-business-session'},headers:{}},r);assert.equal(r.code,401);assert.equal(called,false);}finally{global.fetch=old;}
});
test('operations proxy retains bearer, method, body, and upstream error',async()=>{
 const old=global.fetch;const calls=[];global.fetch=async(url,options)=>{calls.push({url,options});return{status:409,json:async()=>({error:'concurrent update'})};};
 try{const r=res();await ops({method:'POST',query:{route:'ops-update-activation-request'},headers:{authorization:'Bearer test-token'},body:{id:'activation',action:'contacted'}},r);
 assert.equal(r.code,409);assert.equal(calls[0].url,'https://araf.company/api/ops-update-activation-request');assert.equal(calls[0].options.headers.Authorization,'Bearer test-token');assert.equal(JSON.parse(calls[0].options.body).action,'contacted');assert.equal(calls[0].options.headers.Origin,undefined);}finally{global.fetch=old;}
});
test('assistant verifies operations access before forwarding any case',async()=>{
 const old=global.fetch;let calls=0;global.fetch=async()=>{calls++;return{ok:false,status:403};};
 try{const r=res();await legal({method:'POST',headers:{authorization:'Bearer test-token'},body:{query:'hypothetical test question'}},r);assert.equal(r.code,403);assert.equal(calls,1);}finally{global.fetch=old;}
});
test('assistant receives only the edited summary, without operations token',async()=>{
 const old=global.fetch;const calls=[];global.fetch=async(url,options)=>{calls.push({url,options});return calls.length===1?{ok:true,json:async()=>({ok:true,admin:{active:true}})}:{ok:true,json:async()=>({content:'<p>answer</p>',sources:[{url:'https://example.com'}],confidenceLevel:'review'})};};
 try{const r=res();await legal({method:'POST',headers:{authorization:'Bearer test-token'},body:{query:'hypothetical question',secret:'ignored'}},r);assert.equal(r.code,200);assert.equal(calls[1].url,'https://araf.online/api/free-ask');assert.deepEqual(JSON.parse(calls[1].options.body),{query:'hypothetical question'});assert.equal(calls[1].options.headers.Authorization,undefined);assert.equal(r.data.content,'<p>answer</p>');}finally{global.fetch=old;}
});
test('assistant enforces original input limit without truncating a submitted question',async()=>{
 const old=global.fetch;let called=false;global.fetch=async()=>{called=true;};
 try{const r=res();await legal({method:'POST',headers:{authorization:'Bearer test-token'},body:{query:'x'.repeat(1001)}},r);assert.equal(r.code,400);assert.equal(called,false);}finally{global.fetch=old;}
});
test('public activation endpoint cannot bypass operations administrator verification',async()=>{
 const old=global.fetch;let calls=0;global.fetch=async()=>{calls++;return{ok:true,json:async()=>({ok:true,admin:{active:true,role:'employee'}})};};
 try{const r=res();await ops({method:'POST',query:{route:'create-business-lead'},headers:{authorization:'Bearer test-token'},body:{entity_name:'test'}},r);assert.equal(r.code,403);assert.equal(calls,1);}finally{global.fetch=old;}
});
