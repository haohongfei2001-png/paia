import test from 'node:test';
import assert from 'node:assert/strict';
import {ToolbarEntry,installToolbarEntry,installToolbarClient} from '../background/toolbar-entry.js';
const url='chrome-extension://synthetic-paia/ui/archive.html';
const app=(id,windowId=1,extra={})=>({id,windowId,url,index:id,active:false,incognito:false,...extra});
function fixture(tabs=[]){
 const events=[],rows=new Map(tabs.map(t=>[t.id,t]));let listener;
 const api={runtime:{getURL:path=>'chrome-extension://synthetic-paia/'+path,getContexts:async options=>{events.push(['contexts',options]);return [...rows.values()].map(t=>({contextType:'TAB',tabId:t.id,windowId:t.windowId,frameId:0,documentUrl:t.url,incognito:t.incognito}));}},tabs:{query:async options=>{events.push(['query',options]);return [...rows.values()].filter(t=>t.windowId===options.windowId).map(t=>({...t}));},get:async id=>{events.push(['get',id]);if(!rows.has(id))throw Error('closed');return {...rows.get(id)};},update:async(id,changes)=>{events.push(['update',id,changes]);return {...rows.get(id),...changes};},create:async options=>{events.push(['create',options]);const row=app(100,options.windowId,{...options});rows.set(row.id,row);return row;}},action:{onClicked:{addListener:value=>{listener=value;}},setTitle:async value=>events.push(['title',value])}};
 return {api,events,rows,click:tab=>listener(tab),owner:new ToolbarEntry(api)};
}
test('toolbar focuses existing own current-window app without navigation, reload, RPC or storage',async()=>{
 const f=fixture([app(2),app(3,2,{active:true})]);assert.deepEqual(await f.owner.open({windowId:1}),{status:'focused',tabId:2});assert.deepEqual(f.events.filter(e=>['update','create'].includes(e[0])),[['update',2,{active:true}]]);assert.deepEqual(f.events[0],['contexts',{contextTypes:['TAB'],windowIds:[1]}]);
});
test('toolbar preserves validated Topic route and prefers already active app',async()=>{
 const f=fixture([app(1),app(4,1,{url:url+'#paia-thought?topic=original&section=named',active:true})]);assert.equal((await f.owner.open({windowId:1})).tabId,4);assert.deepEqual(f.events.at(-1),['update',4,{active:true}]);
});
test('unsupported/no-composer source creates only neutral existing onboarding app',async()=>{
 const f=fixture([app(1,2),app(2,1,{url:'https://unsupported.invalid/'})]);assert.deepEqual(await f.owner.open({windowId:1,url:'chrome://newtab/'}),{status:'opened',tabId:100});assert.deepEqual(f.events.at(-1),['create',{windowId:1,url,active:true}]);
});
test('lookalike paths, arbitrary fragments/query, foreign extension and frame are not app identities',async()=>{
 for(const bad of [url+'?query=body',url+'#unknown',url+'#paia-thought?topic=x&body=secret',url.replace('synthetic-paia','foreign'),url+'.evil']){
  const f=fixture([app(1,1,{url:bad})]);assert.equal((await f.owner.open({windowId:1})).status,'opened');assert.equal(f.events.filter(e=>e[0]==='update').length,0);
 }
 const f=fixture([app(1,1,{url:'https://unsupported.invalid/'})]);f.api.runtime.getContexts=async()=>[{contextType:'TAB',windowId:1,tabId:1,frameId:5,documentUrl:url,incognito:false}];assert.equal((await f.owner.open({windowId:1})).status,'opened');
});
test('incognito/missing window refuses before lookup; unavailable lookup does not create duplicate',async()=>{
 for(const tab of [{windowId:1,incognito:true},{},{windowId:-1},null]){const f=fixture();await assert.rejects(f.owner.open(tab),{code:'FORBIDDEN'});assert.deepEqual(f.events,[]);}
 const f=fixture();f.api.runtime.getContexts=async()=>{throw Error('unavailable');};await assert.rejects(f.owner.open({windowId:1}),/unavailable/);assert.equal(f.events.length,0);
});
test('late moved or navigated target refuses instead of replacing URL',async()=>{
 for(const change of [{windowId:2},{url:'https://unsupported.invalid/'},{pendingUrl:'https://unsupported.invalid/'}]){
  const f=fixture([app(1)]);let reads=0;f.api.tabs.get=async()=>++reads===1?app(1):app(1,1,change);await assert.rejects(f.owner.open({windowId:1}),{code:'FORBIDDEN'});assert.equal(f.events.some(e=>e[0]==='update'||e[0]==='create'),false);
 }
});
test('unknown context shape and a failed existing-tab read never mean app absent',async()=>{
 for(const value of [null,{},[{}],[{contextType:'TAB',windowId:1,frameId:0}]]){const f=fixture();f.api.runtime.getContexts=async()=>value;await assert.rejects(f.owner.open({windowId:1}),{code:'UNAVAILABLE'});assert.equal(f.events.some(e=>e[0]==='create'),false);}
 const f=fixture([app(1)]);f.api.tabs.get=async()=>{throw Error('read failed');};await assert.rejects(f.owner.open({windowId:1}),{code:'UNAVAILABLE'});assert.equal(f.events.some(e=>e[0]==='create'),false);
 for(const tab of [{incognito:false},{...app(1),id:undefined},{...app(1),windowId:undefined},{...app(1),url:undefined}]){const f=fixture([app(1)]);f.api.tabs.get=async()=>tab;await assert.rejects(f.owner.open({windowId:1}),{code:'UNAVAILABLE'});assert.equal(f.events.some(e=>e[0]==='create'),false);}
 for(const context of [{contextType:'TAB',windowId:1,frameId:0,documentUrl:url,incognito:false},{contextType:'TAB',windowId:1,tabId:1,frameId:0,documentUrl:url}]){const f=fixture([app(1)]);f.api.runtime.getContexts=async()=>[context];await assert.rejects(f.owner.open({windowId:1}),{code:'UNAVAILABLE'});assert.equal(f.events.some(e=>e[0]==='create'),false);}
});
test('late activation result cannot claim focus for a moved/navigated/unknown app',async()=>{
 for(const change of [{windowId:2},{url:'https://unsupported.invalid/'},{active:false},{incognito:undefined},{pendingUrl:'https://unsupported.invalid/'}]){const f=fixture([app(1)]);f.api.tabs.update=async()=>app(1,1,{active:true,...change});await assert.rejects(f.owner.open({windowId:1}),{code:'FORBIDDEN'});assert.equal(f.events.some(e=>e[0]==='create'),false);}
});
test('simultaneous same-window action calls share one actual opening; independent windows remain independent',async()=>{
 const f=fixture();let release;f.api.runtime.getContexts=()=>new Promise(r=>{release=r;});const a=f.owner.open({windowId:1}),b=f.owner.open({windowId:1});assert.equal(a,b);release([]);await Promise.all([a,b]);assert.equal(f.events.filter(e=>e[0]==='create').length,1);f.api.runtime.getContexts=async()=>[];await f.owner.open({windowId:2});assert.equal(f.events.filter(e=>e[0]==='create').length,2);
});
test('failed create shows truthful action title and remains retryable without enabling capture',async()=>{
 const f=fixture();installToolbarEntry(f.api);f.api.tabs.create=async()=>{throw Error('failed');};f.click({windowId:1});await new Promise(r=>setImmediate(r));assert.deepEqual(f.events.at(-1),['title',{title:'PAIA could not open. Click again to retry.'}]);f.api.tabs.create=async options=>app(100,options.windowId);f.click({windowId:1});await new Promise(r=>setImmediate(r));assert.deepEqual(f.events.at(-1),['title',{title:'Personal AI Input Archive'}]);
});
test('completed create with delayed own context registration cannot create a second app',async()=>{
 const f=fixture();f.api.runtime.getContexts=async()=>[];
 assert.equal((await f.owner.open({windowId:1})).status,'opened');
 assert.equal((await f.owner.open({windowId:1})).status,'focused');
 assert.equal(f.events.filter(e=>e[0]==='create').length,1);
 assert.deepEqual(f.events.filter(e=>e[0]==='update'),[['update',100,{active:true}]]);
});

function clientFixture(tabs=[app(1)]){
 const f=fixture(tabs);delete f.api.runtime.getContexts;const calls=[];
 const rows=tabs.map(t=>({id:'client-'+t.id,type:'window',frameType:'top-level',url:t.url,postMessage(request,[port]){calls.push(request);port.postMessage({type:request.type,nonce:request.nonce,tabId:t.id,windowId:t.windowId,incognito:t.incognito});port.close();}}));
 const clients={matchAll:async options=>{calls.push(options);return rows;},get:async id=>rows.find(c=>c.id===id)};
 return {...f,calls,clients,clientRows:rows,owner:new ToolbarEntry(f.api,{clients})};
}
test('missing getContexts consumes only own top-level clients and current-window Chrome tab identity',async()=>{
 const f=clientFixture([app(2),app(3,2),app(4,1,{url:'https://unsupported.invalid/'})]);
 for(const row of f.rows.values())delete row.url; // Real permission-scrubbed Tab URL is not an absence proof.
 assert.deepEqual(await f.owner.open({windowId:1}),{status:'focused',tabId:2});
 assert.deepEqual(f.calls[0],{type:'window',includeUncontrolled:true});assert.equal(f.calls.filter(x=>x.type==='PAIA_TOOLBAR_IDENTITY').length,2);
 assert.deepEqual(f.events.filter(e=>e[0]==='update'||e[0]==='create'),[['update',2,{active:true}]]);
});
test('available getContexts failure never falls back to clients or creates',async()=>{
 const f=clientFixture();f.api.runtime.getContexts=async()=>{throw Error('actual lookup failure');};await assert.rejects(f.owner.open({windowId:1}),/actual lookup failure/);assert.deepEqual(f.calls,[]);assert.equal(f.events.some(e=>e[0]==='create'),false);
});
test('unknown fallback client/reply or failed client delivery never means app absent',async()=>{
 for(const kind of ['malformed','iframe','reply','nonce','throw','changed','moved']){
  const f=clientFixture();const client=f.clientRows[0];
  if(kind==='malformed')f.clients.matchAll=async()=>[{}];
  if(kind==='iframe')client.frameType='nested';
  if(kind==='reply')client.postMessage=(r,[p])=>{p.postMessage({type:r.type,nonce:r.nonce,tabId:1,windowId:1,incognito:false,body:'forged'});p.close();};
  if(kind==='nonce')client.postMessage=(r,[p])=>{p.postMessage({type:r.type,nonce:crypto.randomUUID(),tabId:1,windowId:1,incognito:false});p.close();};
  if(kind==='throw')client.postMessage=()=>{throw Error('unavailable');};
  if(kind==='changed')f.clients.get=async()=>({...client,url:'https://unsupported.invalid/'});
  if(kind==='moved')f.api.tabs.get=async()=>app(1,2);
  await assert.rejects(f.owner.open({windowId:1}),e=>e.code==='UNAVAILABLE'||e.code==='FORBIDDEN');assert.equal(f.events.some(e=>e[0]==='create'||e[0]==='update'),false,kind);
 }
});
test('fallback silence times out and releases both private message ports without creating',async t=>{
 const f=clientFixture();let transferred;f.clientRows[0].postMessage=(r,[p])=>{transferred=p;};
 t.mock.timers.enable({apis:['setTimeout']});const pending=f.owner.open({windowId:1});await Promise.resolve();await Promise.resolve();t.mock.timers.tick(30000);
 await assert.rejects(pending,{code:'UNAVAILABLE'});assert.equal(f.events.some(e=>e[0]==='create'),false);transferred.close();
});
test('known empty own clients creates neutral app; moved/removed pending creation is never reused',async()=>{
 const f=clientFixture([]);assert.equal((await f.owner.open({windowId:1})).status,'opened');f.api.tabs.get=async()=>app(100,2);await assert.rejects(f.owner.open({windowId:1}),{code:'FORBIDDEN'});assert.equal(f.events.filter(e=>e[0]==='create').length,1);
 f.owner.removeTab(100);f.rows.delete(100);assert.equal((await f.owner.open({windowId:1})).status,'opened');assert.equal(f.events.filter(e=>e[0]==='create').length,2);
});
test('real page listener answers only strict original worker message with body-free getCurrent identity',async()=>{
 const f=fixture();let listener,removed,reads=0;const scope={location:{href:url},navigator:{serviceWorker:{addEventListener:(type,fn)=>{assert.equal(type,'message');listener=fn;},removeEventListener:(type,fn)=>{removed=fn;}}}};scope.self=scope;scope.top=scope;
 f.api.tabs.getCurrent=async()=>{reads++;return app(2);};const dispose=installToolbarClient(f.api,scope);
 const source={scriptURL:f.api.runtime.getURL('background/service-worker.js')},data={type:'PAIA_TOOLBAR_IDENTITY',version:1,nonce:crypto.randomUUID()};
 for(const event of [{isTrusted:false},{source:{scriptURL:'https://forged.invalid/'}},{data:{...data,body:'forged'}},{data:{...data,nonce:'bad'}},{ports:[]}])listener({isTrusted:true,source,data,ports:[{postMessage(){throw Error('unexpected');},close(){}}],...event});assert.equal(reads,0);
 let unrelatedClosed=0;listener({isTrusted:true,source,data:{type:'OTHER_OWNER'},ports:[{close:()=>unrelatedClosed++}]});assert.equal(unrelatedClosed,0);assert.equal(reads,0);
 const replies=[];let closed=0;listener({isTrusted:true,source,data,ports:[{postMessage:r=>replies.push(r),close:()=>closed++}]});await new Promise(r=>setImmediate(r));assert.deepEqual(replies,[{type:data.type,nonce:data.nonce,tabId:2,windowId:1,incognito:false}]);assert.equal(closed,1);assert.equal(reads,1);dispose();assert.equal(removed,listener);
});

test('known created app still loading retains private hint and refuses duplicate until truthful registration',async()=>{
 const f=fixture();f.api.runtime.getContexts=async()=>[];await f.owner.open({windowId:1});f.rows.set(100,app(100,1,{url:'about:blank',pendingUrl:url}));
 await assert.rejects(f.owner.open({windowId:1}),{code:'UNAVAILABLE'});await assert.rejects(f.owner.open({windowId:1}),{code:'UNAVAILABLE'});assert.equal(f.events.filter(e=>e[0]==='create').length,1);
 f.rows.set(100,app(100));assert.equal((await f.owner.open({windowId:1})).status,'focused');assert.equal(f.events.filter(e=>e[0]==='create').length,1);
});


test('discarded/frozen own app remains an existing tab when active documents are empty',async()=>{
 for(const state of [{discarded:true},{frozen:true}])for(const fallback of [false,true]){
  const f=fallback?clientFixture([app(7,1,state)]):fixture([app(7,1,state)]);
  if(fallback)f.clients.matchAll=async()=>[];else f.api.runtime.getContexts=async()=>[];
  assert.deepEqual(await f.owner.open({windowId:1}),{status:'focused',tabId:7});
  assert.deepEqual(f.events.filter(e=>e[0]==='query'),[['query',{windowId:1}]]);
  assert.deepEqual(f.events.filter(e=>e[0]==='update'||e[0]==='create'),[['update',7,{active:true}]]);
 }
});
test('failed or malformed current-window tab enumeration never proves app absence',async()=>{
 for(const result of [null,{},[{}],[app(2,2)],[{...app(2),id:undefined}],[{...app(2),incognito:undefined}],[{...app(2),url:null}]]){
  const f=fixture();f.api.tabs.query=async()=>result;await assert.rejects(f.owner.open({windowId:1}),{code:'UNAVAILABLE'});assert.equal(f.events.some(e=>e[0]==='create'||e[0]==='update'),false);
 }
 const f=fixture();f.api.tabs.query=async()=>{throw Error('actual query failure');};await assert.rejects(f.owner.open({windowId:1}),/actual query failure/);assert.equal(f.events.some(e=>e[0]==='create'),false);
});
test('enumerated discarded app late move/navigation/read failure refuses without creating',async()=>{
 for(const change of [{windowId:2},{url:'https://unsupported.invalid/'},{pendingUrl:'https://unsupported.invalid/'}]){
  const f=fixture([app(7,1,{discarded:true})]);f.api.runtime.getContexts=async()=>[];let reads=0;f.api.tabs.get=async()=>++reads===1?app(7,1,{discarded:true}):app(7,1,change);
  await assert.rejects(f.owner.open({windowId:1}),{code:'FORBIDDEN'});assert.equal(f.events.some(e=>e[0]==='create'||e[0]==='update'),false);
 }
 const f=fixture([app(7,1,{discarded:true})]);f.api.runtime.getContexts=async()=>[];f.api.tabs.get=async()=>{throw Error('discarded read failed');};await assert.rejects(f.owner.open({windowId:1}),{code:'UNAVAILABLE'});assert.equal(f.events.some(e=>e[0]==='create'),false);
});
