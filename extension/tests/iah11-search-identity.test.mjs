import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture,meta,rows} from './harness/original-complete.mjs';
import {inputEdit} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {SourceStructureStore} from '../core/source-structure-store.js';
const generation=async s=>(await meta(s,'backup-data-generation'))?.value??0;
const options={query:'needle',ranked:false,qualified:true,limit:1};
const evidence=n=>({id:'iah-search-'+n,contractId:'iah-search-contract',contractVersion:1,channel:'synthetic',scope:'conversation',originClass:'fixture',requestGeneration:n,evidenceKind:'relationship',digest:n.toString(16).padStart(64,'0')});
const project={providerKey:'chatgpt',namespace:'account-main',projectId:'iah-project'};

test('IAH qualified search returns body-free generation identity and actual Input revisions',async()=>{
 const {s}=await completeFixture({texts:['needle first','needle second']});
 await s.finishFoundation();const page=await s.searchInputs(options);
 assert.equal(page.searchSnapshot.version,1);assert.equal(page.searchSnapshot.generation,await generation(s));assert.match(page.searchSnapshot.signature,/^[a-f0-9]{64}$/);
 assert.deepEqual(Object.keys(page.searchSnapshot).sort(),['generation','signature','version']);
 const state=(await rows(s,'inputStates')).find(x=>x.id===page.items[0].id);assert.equal(page.items[0].contentRevision,state.contentRevision);
 assert.equal(page.changed,false);assert.equal(page.complete,false);
 const next=await s.searchInputs({...options,cursor:page.nextCursor,searchSnapshot:page.searchSnapshot});assert.notEqual(next.items[0].id,page.items[0].id);assert.deepEqual(next.searchSnapshot,page.searchSnapshot);
});

test('IAH existing generation covers source membership, project rename, filter, explicit removal and purge',async()=>{
 const {s}=await completeFixture({texts:['needle first','needle second']});await s.finishFoundation();const state=await s.snapshot(),conv={platform:state.conversations[0].platform,sourceConversationId:state.conversations[0].sourceConversationId},structure=new SourceStructureStore(s);
 const advance=async(action,label)=>{const before=await generation(s);await action();assert.ok(await generation(s)>before,label);};
 await advance(()=>structure.observeConversation({conversationRef:conv,expectedRevision:0,observedAt:'2026-10-08T00:00:00.000Z',evidence:evidence(1),membership:{state:'project',projectRef:project},projectName:'Original'}),'membership');
 await advance(()=>structure.observeProject({projectRef:project,witnessConversationRef:conv,expectedRevision:0,observedAt:'2026-10-08T00:00:01.000Z',evidence:evidence(2),currentName:'Renamed'}),'project metadata');
 await advance(()=>s.setFilterMode('off'),'filter policy');
 await advance(()=>inputEdit(s,state.library.blocks[0].id,{excluded:true}),'explicit removal');
 await advance(()=>s.permanentDelete(state.records[1].id),'purge');
});

test('IAH stale generation returns no neighbor or stale bytes and requires restart',async()=>{
 const {s}=await completeFixture({texts:['needle first','needle second']});await s.finishFoundation();const first=await s.searchInputs(options);await s.setFilterMode('off');
 const next=await s.searchInputs({...options,cursor:first.nextCursor,searchSnapshot:first.searchSnapshot});
 assert.deepEqual(next.items,[]);assert.equal(next.changed,true);assert.equal(next.restartRequired,true);assert.equal(next.nextCursor,null);assert.equal(next.complete,false);
});

test('IAH qualified scope identity rejects cross-query/filter/date/provider/project and forged metadata',async()=>{
 const {s}=await completeFixture({texts:['needle first','needle second']});await s.finishFoundation();const first=await s.searchInputs(options);
 for(const change of [{query:'other'},{includeFiltered:false},{dateFrom:'2026-01-01'},{providerKey:'claude'},{projectRef:project},{ranked:true}])await assert.rejects(()=>s.searchInputs({...options,...change,cursor:first.nextCursor,searchSnapshot:first.searchSnapshot}),e=>e.code==='INVALID_REQUEST');
 for(const searchSnapshot of [{...first.searchSnapshot,body:'private'},{...first.searchSnapshot,generation:-1},{...first.searchSnapshot,signature:'x'.repeat(65)}])await assert.rejects(()=>s.searchInputs({...options,searchSnapshot}),e=>e.code==='INVALID_REQUEST');
 await assert.rejects(()=>s.searchInputs({...options,cursor:first.nextCursor}),e=>e.code==='INVALID_REQUEST');
});

test('IAH Project cross-transaction mutation invalidates the whole qualified page',async()=>{
 const {s,storage,indexedDB}=await completeFixture({texts:['needle first']});await s.finishFoundation();const state=await s.snapshot(),conv={platform:state.conversations[0].platform,sourceConversationId:state.conversations[0].sourceConversationId},other=new OrganizerStore(storage,{indexedDB}),structure=new SourceStructureStore(other);await other.finishFoundation();
 await structure.observeConversation({conversationRef:conv,expectedRevision:0,observedAt:'2026-10-08T00:00:00.000Z',evidence:evidence(1),membership:{state:'project',projectRef:project}});
 const original=s.scopeSearchToProject.bind(s);s.scopeSearchToProject=async(...args)=>{const result=await original(...args);await structure.observeConversation({conversationRef:conv,expectedRevision:1,observedAt:'2026-10-08T00:00:01.000Z',evidence:evidence(2),membership:{state:'unassigned',projectRef:null}});return result;};
 const result=await s.searchInputs({...options,projectRef:project});assert.deepEqual(result.items,[]);assert.equal(result.changed,true);assert.equal(result.restartRequired,true);
});

test('IAH canonical edit, removal and purge invalidate held pages without substituting neighbors',async()=>{
 for(const action of ['edit','remove','purge']){
  const {s}=await completeFixture({texts:['needle first','needle second']});await s.finishFoundation();const first=await s.searchInputs(options),id=first.items[0].id;
  if(action==='purge')await s.permanentDelete((await s.input(id)).originalTextReference);
  else await inputEdit(s,id,action==='edit'?{libraryText:'changed body'}:{excluded:true});
  const stale=await s.searchInputs({...options,cursor:first.nextCursor,searchSnapshot:first.searchSnapshot});assert.deepEqual(stale.items,[],action);assert.equal(stale.restartRequired,true,action);
  const fresh=await s.searchInputs({...options,limit:50});assert.equal(fresh.items.some(row=>row.id===id),false,action);
 }
});

test('IAH qualified cache preserves legacy ranking and binds normalized query with exact revisions',async()=>{
 const {seedScale}=await import('./fixtures/scale-v092.mjs');const {s}=await completeFixture({texts:['seed']});await seedScale(s,1001);
 const request={query:'Synthetic scale body 1000',ranked:true,qualified:true};let page=await s.searchInputs(request),pages=0;
 while(!page.items.length&&page.nextCursor!==null){assert.ok(++pages<=3);page=await s.searchInputs({...request,cursor:page.nextCursor,searchSnapshot:page.searchSnapshot});}
 assert.ok(s.inputSearchCache);assert.deepEqual(page.items.map(x=>x.id),['block:scale-record-00001000']);assert.equal(page.items[0].contentRevision,(await rows(s,'inputStates')).find(x=>x.id===page.items[0].id).contentRevision);
 const same=await s.searchInputs({...request,query:'  Ｓｙｎｔｈｅｔｉｃ SCALE BODY 1000 ',searchSnapshot:page.searchSnapshot});assert.equal(same.changed,false);
 const legacy=await s.searchInputs({query:'Synthetic scale body 1000',ranked:true,cursor:{phase:2,offset:null}});assert.deepEqual(page.items.map(({contentRevision,...row})=>row),legacy.items);assert.deepEqual(Object.keys(legacy).sort(),['items','nextCursor']);
});

test('IAH qualified arrival reads the exact canonical revision and never substitutes a removed or purged target',async t=>{
 for(const action of ['edit','remove','purge'])await t.test(action,async()=>{
  const {s}=await completeFixture({texts:['needle target','needle neighbor']});await s.finishFoundation();const target=(await s.searchInputs({...options,limit:50})).items[0];
  if(action==='purge')await s.permanentDelete((await s.input(target.id)).originalTextReference);
  else await inputEdit(s,target.id,action==='edit'?{libraryText:'changed target'}:{excluded:true});
  const page=await s.page({view:'library',documentId:target.documentId,contextInputId:target.id,qualifyContext:true});
  if(action==='edit'){assert.equal(page.contextUnavailable,false);assert.ok(page.pageItemIds.includes(target.id));assert.equal(page.contextInputRevision,(await rows(s,'inputStates')).find(x=>x.id===target.id).contentRevision);assert.ok(page.contextInputRevision>target.contentRevision);}
  else{assert.equal(page.contextUnavailable,true);assert.deepEqual(page.pageItemIds,[],action);assert.equal(page.nextCursor,null);}
 });
});

test('IAH activation rechecks original Project membership after another real owner moves the Input',async()=>{
 const {s,storage,indexedDB}=await completeFixture({texts:['needle target']});await s.finishFoundation();const other=new OrganizerStore(storage,{indexedDB});await other.finishFoundation();const structure=new SourceStructureStore(other),state=await s.snapshot(),conv={platform:state.conversations[0].platform,sourceConversationId:state.conversations[0].sourceConversationId};
 await structure.observeConversation({conversationRef:conv,expectedRevision:0,observedAt:'2026-10-08T01:00:00.000Z',evidence:evidence(1),membership:{state:'project',projectRef:project}});
 const found=await s.searchInputs({...options,projectRef:project}),target=found.items[0],searchContext={query:options.query,knownRevision:target.contentRevision,searchSnapshot:found.searchSnapshot,scope:{ranked:false,providerKey:null,projectRef:project,includeFiltered:true,dateFrom:'',dateTo:''}};
 await inputEdit(s,target.id,{libraryText:'changed but eligible'});
 const current=await s.page({view:'library',documentId:target.documentId,contextInputId:target.id,qualifyContext:true,searchContext});assert.equal(current.contextUnavailable,false,'unrelated generation/content revision change is not a blanket rejection');assert.ok(current.pageItemIds.includes(target.id));
 await structure.observeConversation({conversationRef:conv,expectedRevision:1,observedAt:'2026-10-08T01:00:01.000Z',evidence:evidence(2),membership:{state:'unassigned',projectRef:null}});
 const stale=await s.page({view:'library',documentId:target.documentId,contextInputId:target.id,qualifyContext:true,searchContext});assert.equal(stale.contextUnavailable,true);assert.deepEqual(stale.pageItemIds,[]);assert.equal(stale.nextCursor,null);
});

test('IAH activation applies current filter policy and rejects scope or revision metadata forgery',async()=>{
 const {s}=await completeFixture({texts:['继续']});await s.finishFoundation();await s.evaluateFilters();await s.setFilterMode('off');
 const found=await s.searchInputs({...options,query:'虚构验收',includeFiltered:false}),target=found.items[0],context={query:'虚构验收',knownRevision:target.contentRevision,searchSnapshot:found.searchSnapshot,scope:found.searchScope};
 const page=searchContext=>s.page({view:'library',documentId:target.documentId,contextInputId:target.id,qualifyContext:true,searchContext});
 assert.equal((await page(context)).contextUnavailable,false);await s.setFilterMode('light');assert.equal((await page(context)).contextUnavailable,true);
 for(const patch of [{providerKey:'claude'},{dateFrom:'2026-01-01'},{includeFiltered:true},{projectRef:project}])await assert.rejects(()=>page({...context,scope:{...context.scope,...patch}}),e=>e.code==='INVALID_REQUEST');
 for(const patch of [{knownRevision:-1},{body:'secret'},{searchSnapshot:{...context.searchSnapshot,body:'secret'}}])await assert.rejects(()=>page({...context,...patch}),e=>e.code==='INVALID_REQUEST');
});
