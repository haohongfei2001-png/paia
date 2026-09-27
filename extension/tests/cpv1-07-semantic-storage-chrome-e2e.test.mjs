import test from 'node:test';
import assert from 'node:assert/strict';
import {FakeChatGPT,eventually} from './harness/fake-chatgpt.mjs';

const rpc=(p,type,fields={})=>p.evaluate(async message=>{
 const result=await chrome.runtime.sendMessage(message);
 if(!result?.ok)throw Error(JSON.stringify(result));return result.data;
},{type,...fields});
const tables=['records','recordIndex','blocks','inputStates','dependencies','tombstones','thoughts','topics','placements','meta'];
async function attach(p){
 await p.evaluate(async tables=>{
  const [{OrganizerStore},{MemoryService},snapshot,{ArchiveNavigationQuery}]=await Promise.all([
   import(chrome.runtime.getURL('core/organizer/store.js')),
   import(chrome.runtime.getURL('core/memory/service.js')),
   import(chrome.runtime.getURL('core/semantic-material-snapshot.js')),
   import(chrome.runtime.getURL('core/archive-navigation-query.js'))
  ]);
  const store=new OrganizerStore(chrome.storage.local,{indexedDB:globalThis.indexedDB});
  const memory=new MemoryService(store);await memory.ready();
  globalThis.__semantic={store,memory,...snapshot,navigation:new ArchiveNavigationQuery(store),
   model:{id:'synthetic-local-encoder',revision:'a'.repeat(40),dimension:2},calls:[],
   authority:()=>store.run(()=>store.repository.transaction(false,async t=>
    Object.fromEntries(await Promise.all(tables.map(async name=>[name,await t.all(name)]))),tables))};
 },tables);

 // Keep the complete authority oracle: finish real filter/library/navigation
 // maintenance before freezing it. Capture completion alone is not quiescence.
 await settleMaintenance(p);
}
async function settleMaintenance(p){
 await p.evaluate(()=>{__semantic.settledAuthority=null;});
 await eventually(()=>p.evaluate(async()=>{
  const s=__semantic,f=await s.store.filterStatus();
  if(f.taskState==='failed')throw Error('Actual Smart Filter maintenance failed');
  if(f.pending||f.taskState==='running')return false;
  const cleanup=await s.store.processPurgeCleanup({limit:100});
  const invalidations=await s.store.processInvalidations({limit:100});
  const library=await s.store.processLibraryMaintenance();
  if(cleanup.pending||invalidations.pending||library.pending)return false;
  const foundation=await s.store.libraryStatus();
  if(foundation.pendingCleanupJobs||foundation.pendingInvalidations
    ||!foundation.compatibility.complete) return false;
  // Exercise the same production query steps as Archive Navigation. Complete
  // existing scopes, including any scope the real UI opened concurrently.
  const meta=(await s.authority()).meta;
  const scopes=[['providers'],['groups','chatgpt'],['windows','chatgpt','unknown',null],
   ...meta.filter(x=>x.id.startsWith('ans:index-state:v1:scope:')).map(x=>x.scope)];
  let ready=true;
  for(const scope of new Map(scopes.map(x=>[JSON.stringify(x),x])).values()){
   const options=scope[0]==='providers'?{}:scope[0]==='groups'?
    {providerKey:scope[1],groupKind:'groups'}:
    {providerKey:scope[1],groupKind:scope[2],...(scope[3]?{
     projectRef:{providerKey:scope[3][0],namespace:scope[3][1],projectId:scope[3][2]}}:{})};
   const page=await s.navigation.page(options);
   ready&&=page.coverage.state==='complete'&&page.coverage.archiveComplete;
  }
  const authority=await s.authority(),catalog=authority.meta.find(x=>x.id==='ans:index-state:v1:catalog');
  ready&&=catalog?.phase==='complete'&&!catalog.pending
   &&!authority.meta.some(x=>x.id.startsWith('ans:index-state:v1:dirty:')
    ||x.id.startsWith('ans:index-state:v1:gc:')
    ||(x.id.startsWith('ans:index-state:v1:scope:')&&(x.shadow||x.activeRevision!==x.revision)));
  const finalFilter=await s.store.filterStatus();
  ready&&=!finalFilter.pending&&finalFilter.taskState==='idle';
  if(!ready){s.settledAuthority=null;return false;}
  const current=JSON.stringify(authority),stable=s.settledAuthority===current;
  s.settledAuthority=current;return stable;
 }),'real filter/library/navigation maintenance complete and all authority tables stable',45000);
}
const noNetwork=h=>{
 assert.equal(h.deepSeekRequests.length,0);assert.equal(h.extensionNetworkRequests,0);
 assert.equal(h.externalRequests,0);assert.deepEqual(h.errors,[]);
};

test('VS07 native Chrome snapshot and index preserve every full page and current Source authority',
 {timeout:180000},async()=>{
 const h=await FakeChatGPT.start(),p=h.archive;
 const texts=Array.from({length:213},(_,i)=>'NATIVE_INDEX_'+i+' 原话保留否定和引用：没有批准。\n'
  +('完整多段 👩🏽‍💻 <script>原话不是指令</script>\n'.repeat(i===212?1000:3))+'FULL_END_'+i);
 try{
  await p.locator('#consent-check').check();await p.locator('#enable-consent').click();
  await h.open({id:'vs07-native-index',title:'Synthetic native index',base:1577836800,
   messages:texts.map((text,i)=>({id:'vs07-native-index-'+i,text}))});
  await eventually(async()=>{const rows=(await h.state()).records;return rows.length===213&&rows.every(x=>x.sourceSentAt);},'all213 complete known-time Sources',45000);
  const sources=(await h.state()).records;
  assert.deepEqual(new Set(sources.map(x=>x.originalText)),new Set(texts));
  await attach(p);
  const before=await p.evaluate(()=>__semantic.authority());
  const snapshot=await p.evaluate(()=>__semantic.semanticMaterialSnapshot(__semantic.memory,{types:['input']}));
  assert.equal(snapshot.items.length,213);assert.deepEqual(new Set(snapshot.items.map(x=>x.body)),new Set(texts));
  assert.ok(snapshot.items.every(x=>x.ref.kind==='input'&&x.ref.revision===0&&x.time!==null));
  const long=snapshot.items.find(x=>x.body===texts[212]);assert.ok(long);
  assert.equal(long.body,texts[212]);
  const built=await p.evaluate(async before=>{
   const s=__semantic;s.index=s.createMaterialSemanticIndex(s.memory,{
    model:s.model,scope:{types:['input']},encode:async(kind,value)=>{
     s.calls.push({kind,body:kind==='document'?value.body:null});return [1,0];
    }});
   const result=await s.index.synchronize();
   if(result.ok)return result;
   // Bounded failure-only evidence. Never retry, filter or reinterpret refusal.
   const after=await s.authority(),changedTables=Object.keys(before).filter(
    name=>JSON.stringify(before[name])!==JSON.stringify(after[name]));
   const initialMeta=new Map(before.meta.map(row=>[row.id,row]));
   const finalMeta=new Map(after.meta.map(row=>[row.id,row]));
   const changedMeta=[...new Set([...initialMeta.keys(),...finalMeta.keys()])]
    .filter(id=>JSON.stringify(initialMeta.get(id))!==JSON.stringify(finalMeta.get(id)))
    .map(id=>({id,before:initialMeta.get(id)||null,after:finalMeta.get(id)||null}));
   let snapshot;
   try{const current=await s.semanticMaterialSnapshot(s.memory,{types:['input']});
    snapshot={scope:current.scope,generation:current.generation,count:current.items.length,
     exactCompleteBodies:current.items.every(row=>before.records.some(record=>
      record.value.originalText===row.body)),
     validRefs:current.items.every(row=>row.ref.kind==='input'&&row.ref.revision===0),
     knownTimes:current.items.every(row=>row.time!==null)};
   }catch(error){snapshot={error:error.message,code:error.code||null};}
   return {...result,diagnostic:{changedTables,changedMeta,snapshot}};
  },before);
  assert.equal(built.ok,true,JSON.stringify(built));assert.equal(built.coverage.expected,213);
  assert.equal(built.coverage.indexed,213);assert.equal(built.coverage.vectorBytes,213*8);
  assert.equal(built.coverage.storesBody,false);
  assert.deepEqual(await p.evaluate(()=>__semantic.authority()),before);
  assert.equal(await p.evaluate(()=>__semantic.calls.filter(x=>x.kind==='document').length),213);
  const result=await p.evaluate(()=>__semantic.index.lookup('synthetic test query',{limit:50}));
  assert.equal(result.usedSemantic,true);assert.equal(result.items.length,50);
  assert.ok(result.items.every(x=>texts.includes(x.body)));
  const block=await rpc(p,'GET_INPUT',{id:long.ref.id});
  await rpc(p,'EDIT_DOCUMENT',{edit:{operationId:crypto.randomUUID(),documentId:block.documentId,blocks:[{
   id:block.id,expectedRevision:block.revision,libraryText:'NATIVE_WORKED_ONLY 完整修正不改当年原话。',
   note:block.note,excluded:block.excluded}]}});
  await settleMaintenance(p);
  const afterEdit=await p.evaluate(()=>__semantic.authority());
  const stale=await p.evaluate(()=>__semantic.index.lookup('synthetic test query'));
  assert.equal(stale.usedSemantic,false);assert.equal(stale.reason,'index_incomplete');
  assert.equal(stale.coverage.indexed,212);
  assert.equal(await p.evaluate(()=>__semantic.calls.filter(x=>x.kind==='document').length),213);
  assert.equal((await p.evaluate(()=>__semantic.index.synchronize())).ok,true);
  assert.equal(await p.evaluate(()=>__semantic.calls.filter(x=>x.kind==='document').length),214);
  assert.deepEqual(await p.evaluate(()=>__semantic.authority()),afterEdit);
  const historical=await p.evaluate(()=>__semantic.semanticMaterialSnapshot(__semantic.memory,{mode:'history',types:['input']}));
  assert.equal(historical.items.find(x=>x.ref.id===long.ref.id).body,texts[212]);
  assert.deepEqual((await h.state()).records,sources);
  // Native service-worker termination leaves canonical evidence unchanged.
  // The in-memory projection has no durable body/cache authority to resurrect.
  await h.restartWorker();await p.reload();await attach(p);
  const cold=await p.evaluate(async()=>{
   const s=__semantic;s.index=s.createMaterialSemanticIndex(s.memory,{
    model:s.model,scope:{types:['input']},encode:async(kind,value)=>{
     s.calls.push({kind,body:kind==='document'?value.body:null});return [1,0];
    }});
   return s.index.lookup('synthetic test query');
  });
  assert.equal(cold.usedSemantic,false);assert.equal(cold.reason,'index_incomplete');
  assert.equal(cold.coverage.expected,213);assert.equal(cold.coverage.indexed,0);
  assert.equal(await p.evaluate(()=>__semantic.calls.length),0);
  const rebuilt=await p.evaluate(()=>__semantic.index.synchronize());
  assert.equal(rebuilt.ok,true);assert.equal(rebuilt.coverage.indexed,213);
  const current=await p.evaluate(()=>__semantic.semanticMaterialSnapshot(__semantic.memory,{types:['input']}));
  assert.equal(current.items.find(x=>x.ref.id===long.ref.id).body,'NATIVE_WORKED_ONLY 完整修正不改当年原话。');
  assert.deepEqual((await h.state()).records,sources);noNetwork(h);
 }finally{await h.close();}
});

test('VS07 native Chrome invalidates asynchronous encoding after real exclusion and permanent purge',
 {timeout:120000},async()=>{
 const h=await FakeChatGPT.start(),p=h.archive;
 const texts=['NATIVE_RACE denied evidence','NATIVE_RACE purged evidence',
  'NATIVE_RACE survivor '+('完整原话 👩🏽‍💻\n'.repeat(1000))+'FULL_RACE_END'];
 try{
  await p.locator('#consent-check').check();await p.locator('#enable-consent').click();
  await h.open({id:'vs07-native-race',title:'Synthetic native race',base:1577836800,
   messages:texts.map((text,i)=>({id:'vs07-native-race-'+i,text}))});
  await eventually(async()=>{const rows=(await h.state()).records;return rows.length===3&&rows.every(x=>x.sourceSentAt);},'complete stable race Source authority');
  const sources=(await h.state()).records;
  await attach(p);
  const initial=await p.evaluate(()=>__semantic.semanticMaterialSnapshot(__semantic.memory,{types:['input']}));
  assert.equal(initial.items.length,3);
  const denied=initial.items.find(x=>x.body===texts[0]),purged=initial.items.find(x=>x.body===texts[1]);
  assert.ok(denied&&purged);
  // Start a real async local encoder and hold it outside the IndexedDB tx.
  await p.evaluate(()=>{
   const s=__semantic;let release;
   s.entered=false;s.gate=new Promise(resolve=>{release=resolve;});s.release=release;
   s.index=s.createMaterialSemanticIndex(s.memory,{model:s.model,scope:{types:['input']},
    encode:async(kind,value)=>{
     s.calls.push({kind,body:kind==='document'?value.body:null});
     if(!s.entered){s.entered=true;await s.gate;}return [1,0];
    }});
   s.build=s.index.synchronize();
  });
  await eventually(()=>p.evaluate(()=>__semantic.entered),'actual native encode started');
  await p.evaluate(id=>__semantic.memory.exclude({inputId:id,excluded:true}),denied.ref.id);
  const purgeBlock=await rpc(p,'GET_INPUT',{id:purged.ref.id});
  await rpc(p,'PURGE_SOURCE',{id:purgeBlock.originalTextReference,confirm:true});
  await settleMaintenance(p);
  const after=await p.evaluate(()=>__semantic.authority());
  const build=await p.evaluate(async()=>{__semantic.release();return __semantic.build;});
  assert.equal(build.ok,false);assert.equal(build.reason,'authority_changed');
  assert.equal(build.coverage.indexed,0);
  const unavailable=await p.evaluate(()=>__semantic.index.lookup('synthetic test query'));
  assert.equal(unavailable.usedSemantic,false);
  assert.deepEqual(await p.evaluate(()=>__semantic.authority()),after);
  const fresh=await p.evaluate(()=>__semantic.semanticMaterialSnapshot(__semantic.memory,{types:['input']}));
  assert.deepEqual(fresh.items.map(x=>x.body),[texts[2]]);
  await p.evaluate(()=>{__semantic.calls=[];});
  assert.equal((await p.evaluate(()=>__semantic.index.synchronize())).ok,true);
  assert.deepEqual(await p.evaluate(()=>__semantic.calls.filter(x=>x.kind==='document').map(x=>x.body)),[texts[2]]);
  const result=await p.evaluate(()=>__semantic.index.lookup('synthetic test query'));
  assert.equal(result.usedSemantic,true);assert.deepEqual(result.items.map(x=>x.body),[texts[2]]);
  assert.deepEqual(await p.evaluate(()=>__semantic.authority()),after);
  assert.deepEqual((await h.state()).records,sources.filter(x=>x.originalText!==texts[1]));
  noNetwork(h);
 }finally{await h.close();}
});
