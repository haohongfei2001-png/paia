import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture,rows} from './harness/original-complete.mjs';
import {SourceStructureStore} from '../core/source-structure-store.js';
const ref={providerKey:'chatgpt',namespace:'account-a',projectId:'synthetic-project'};
const evidence=n=>({id:'path-'+n,contractId:'path-contract',contractVersion:1,channel:'synthetic',scope:'conversation',originClass:'fixture',requestGeneration:n,evidenceKind:'relationship',digest:n.toString(16).padStart(64,'0')});
async function fixture(){const {s}=await completeFixture({texts:['needle first','needle second']});await s.finishFoundation();const state=await s.snapshot(),doc=state.conversations[0],conversationRef={platform:doc.platform,sourceConversationId:doc.sourceConversationId},owner=new SourceStructureStore(s);return {s,owner,conversationRef};}
const search=s=>s.searchInputs({query:'needle',qualified:true,limit:50});
const observe=(owner,conversationRef,n,extra)=>owner.observeConversation({conversationRef,expectedRevision:n-1,observedAt:`2026-10-08T00:00:0${n}.000Z`,evidence:evidence(n),...extra});
test('actual search projects real provider and unknown membership without guessing from title',async()=>{
 const {s}=await fixture(),before=await rows(s,'meta'),result=await search(s);
 assert.equal(result.items.length,2);for(const hit of result.items){assert.equal(hit.sourcePath.providerKey,'chatgpt');assert.equal(hit.sourcePath.membership,'unknown');assert.equal(hit.sourcePath.project,null);assert.equal(hit.sourcePath.lastKnownProject,null);}
 assert.deepEqual(await rows(s,'meta'),before);
});
test('actual source relationships distinguish unassigned, current renamed Project and deleted last-known attribution',async()=>{
 const {s,owner,conversationRef}=await fixture();await observe(owner,conversationRef,1,{membership:{state:'project',projectRef:ref},projectName:'Old name'});
 await owner.observeProject({projectRef:ref,witnessConversationRef:conversationRef,expectedRevision:0,observedAt:'2026-10-08T00:00:02.000Z',evidence:evidence(20),currentName:'Current name'});
 let path=(await search(s)).items[0].sourcePath;assert.deepEqual(path.project.ref,ref);assert.equal(path.project.name,'Current name');
 await observe(owner,conversationRef,2,{membership:{state:'unassigned',projectRef:null}});path=(await search(s)).items[0].sourcePath;assert.equal(path.membership,'unassigned');assert.equal(path.project,null);assert.deepEqual(path.lastKnownProject.ref,ref);assert.equal(path.lastKnownProject.name,'Old name');
 await observe(owner,conversationRef,3,{sourceStatus:'confirmed_deleted'});path=(await search(s)).items[0].sourcePath;assert.equal(path.sourceStatus,'confirmed_deleted');assert.equal(path.membership,'unassigned');assert.deepEqual(path.lastKnownProject.ref,ref);
});
test('metadata projection preserves full page order/text and bounds document batches to fifty',async()=>{
 const {s}=await fixture(),transaction=s.repository.transaction.bind(s.repository);let reads=0,maxReads=0;
 s.repository.transaction=(write,fn,stores)=>transaction(write,async t=>{let count=0;const get=t.get.bind(t);t.get=(store,id)=>{if(store==='documents'){count++;reads++;}return get(store,id);};const result=await fn(t);maxReads=Math.max(maxReads,count);return result;},stores);
 const items=Array.from({length:100},(_,i)=>({id:'input-'+i,documentId:'missing-'+i,text:'body-'+i,title:'not a project',rank:i}));
 const projected=await s.searchSourcePaths({items,nextCursor:100});assert.equal(reads,100);assert.equal(maxReads,50);assert.equal(projected.nextCursor,100);
 assert.deepEqual(projected.items.map(({sourcePath,...item})=>item),items);assert.ok(projected.items.every(item=>item.sourcePath.project===null));
});
test('relationship change while search metadata is read invalidates qualified result instead of publishing mixed facts',async()=>{
 const {s,owner,conversationRef}=await fixture(),original=s.searchSourcePaths.bind(s);
 s.searchSourcePaths=async result=>{const projected=await original(result);await observe(owner,conversationRef,1,{membership:{state:'unassigned',projectRef:null}});return projected;};
 const result=await search(s);assert.deepEqual(result.items,[]);assert.equal(result.restartRequired,true);
});
test('actual provider and namespace qualified relationships never borrow same-ID Project names',async()=>{
 const {s,owner,conversationRef}=await fixture();
 const {ImportLedger}=await import('../core/import/ledger.js'),{ImportCoordinator}=await import('../core/import/coordinator.js'),{getOfficialExportAdapter}=await import('../core/import/registry.js');
 const ledger=new ImportLedger(s),coordinator=new ImportCoordinator({transport:(method,q)=>ledger[method](q,'iah-source-test'),resolveAdapter:getOfficialExportAdapter});
 const data=[{uuid:conversationRef.sourceConversationId,name:'Same title',current_leaf_message_uuid:'claude-assistant-001',chat_messages:[{uuid:'claude-human-001',sender:'human',created_at:'2026-01-02T03:04:05.000Z',parent_message_uuid:null,content:[{type:'text',text:'needle Claude'}]},{uuid:'claude-assistant-001',sender:'assistant',created_at:'2026-01-02T03:04:06.000Z',parent_message_uuid:'claude-human-001',content:[{type:'text',text:'ignored'}]}]}];
 await coordinator.select(new Blob([JSON.stringify(data)]),{consent:true});await coordinator.preflight();assert.ok(['completed','partial'].includes((await coordinator.commit()).phase));
 await observe(owner,conversationRef,1,{membership:{state:'project',projectRef:ref},projectName:'ChatGPT A'});
 const claudeRef={...conversationRef,platform:'claude'},claudeProject={...ref,providerKey:'claude'};
 await observe(owner,claudeRef,1,{membership:{state:'project',projectRef:claudeProject},projectName:'Claude A'});
 for(const [projectRef,currentName] of [[ref,'ChatGPT A'],[claudeProject,'Claude A']])await owner.observeProject({projectRef,expectedRevision:0,observedAt:'2026-10-08T00:00:03.000Z',evidence:evidence(30),currentName});
 let result=await search(s);assert.equal(result.items.find(x=>x.text==='needle Claude').sourcePath.project.name,'Claude A');assert.equal(result.items.find(x=>x.text==='needle first').sourcePath.project.name,'ChatGPT A');
 const other={...ref,namespace:'account-b'};await observe(owner,conversationRef,2,{membership:{state:'project',projectRef:other},projectName:'ChatGPT B'});
 await owner.observeProject({projectRef:other,expectedRevision:0,observedAt:'2026-10-08T00:00:04.000Z',evidence:evidence(40),currentName:'ChatGPT B',sourceStatus:'confirmed_deleted'});
 result=await search(s);const path=result.items.find(x=>x.text==='needle first').sourcePath;assert.deepEqual(path.project.ref,other);assert.equal(path.project.name,'ChatGPT B');assert.equal(path.project.sourceStatus,'confirmed_deleted');assert.equal(result.items.find(x=>x.text==='needle Claude').sourcePath.project.name,'Claude A');
});
