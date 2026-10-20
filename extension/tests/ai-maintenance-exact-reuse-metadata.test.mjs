import test from 'node:test';
import assert from 'node:assert/strict';
import {localMaintenanceFixture} from '../../services/ai-gateway/tests/maintenance-local-fixture.mjs';
import {capture} from './harness/thought-m1.mjs';
import {captureTopicExactReuseMetadata} from '../core/topic-exact-reuse-metadata.js';
import {createContextScopeWorkBudget,contextScopeTransactionReader} from '../core/context-topic-scope.js';
const all=(s,table)=>s.repository.transaction(false,t=>t.all(table));
test('original Repository metadata selection counts the complete sent plus old union, 20 accepted and 21 refused',async t=>{
 const f=await localMaintenanceFixture();t.after(()=>f.session.dispose());assert.equal((await f.session.run(await f.session.prepare({scope:'synthetic-maintenance',contractVersion:'synthetic-aiu-1',routeVersion:'synthetic-maintenance-1'}))).state,'COMMITTED');const entry=(await all(f.s,'thoughts')).find(x=>x.provenanceType==='input_original');
 const added=[];for(let i=0;i<20;i++){const c=capture((await f.s.status()).epoch,'SYNTHETIC-union-'+i,entry.thoughtText);c.chat={id:'SYNTHETIC-union-source-'+i,url:'https://chatgpt.com/c/SYNTHETIC-union-source-'+i,title:'Synthetic union Source'};await f.s.capture(c);const rows=await all(f.s,'inputStates');added.push(rows.find(x=>x.id!==entry.workingInputId&&!added.includes(x.id)).id);}
 await f.s.finishFoundation();const evidence=await f.s.evidenceFor([{inputId:added[0],role:'primary',selectedFields:['body']}]),p={maps:{i0:evidence[0]},entryMap:{},topicMap:{},sectionMap:{},provider:{providerId:'synthetic-union',adapterVersion:'1',modelVersion:'1'},request:{entries:[]}};
 const [item]=await f.s.libraryCommit.prepare([{action:'create',localOriginal:true,body:entry.thoughtText,type:entry.type,formation:'explicit',evidence:[{ref:'i0',field:'body',start:0,end:entry.thoughtText.length}]}],p);
 await f.s.foundationWrite(t=>f.s.libraryCommit.apply(t,item,p,null,'ai','SYNTHETIC-complete-old-dependencies'));
 const budget=createContextScopeWorkBudget({database:f.s.repository.db}),select=sentInputIds=>f.s.repository.transaction(false,t=>captureTopicExactReuseMetadata(contextScopeTransactionReader(f.s,t,budget),{matches:[{entryId:entry.id,exactKey:entry.exactKey}],sentInputIds,maxInputs:20}));
 const accepted=await select(added.slice(1,19));assert.equal(accepted.inputs.length,2);assert.equal(new Set([...accepted.inputs.map(x=>x.id),...added.slice(1,19)]).size,20);
 await assert.rejects(select(added.slice(1,20)),{code:'BUDGET_EXCEEDED'});assert.ok(budget.reads>0);const unchanged=await select(added.slice(1,19));assert.deepEqual(unchanged,accepted);
});

// These are the original Repository's rows at the metadata admission seam.
// Unknown semantic descriptors are rejected without calling their accessors.
for(const target of ['body','unknown-field','nested-metadata','array-member'])test('exact metadata refuses '+target+' accessor before acquiring a field',async t=>{
 const f=await localMaintenanceFixture();t.after(()=>f.session.dispose());assert.equal((await f.session.run(await f.session.prepare({scope:'synthetic-maintenance',contractVersion:'synthetic-aiu-1',routeVersion:'synthetic-maintenance-1'}))).state,'COMMITTED');const entry=(await all(f.s,'thoughts')).find(x=>x.provenanceType==='input_original');let touches=0,hit=false;
 await assert.rejects(f.s.repository.transaction(false,async tx=>{const get=tx.get.bind(tx);tx.get=async(table,id)=>{const row=await get(table,id);if(table==='thoughts'&&id===entry.id){hit=true;const object=target==='nested-metadata'?row.authorship.body:target==='array-member'?row.sourceRecordIds:row,key=target==='body'?'thoughtText':target==='array-member'?'0':'futureSemanticField';Object.defineProperty(object,key,{configurable:true,enumerable:true,get(){touches++;return 'SYNTHETIC forbidden semantic';}});}return row;};return captureTopicExactReuseMetadata(tx,{matches:[{entryId:entry.id,exactKey:entry.exactKey}],sentInputIds:[entry.workingInputId]});}));assert.equal(hit,true);assert.equal(touches,0);
});
