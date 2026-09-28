import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture,rows,meta} from './harness/original-complete.mjs';
import {inputEdit} from './harness/thought-m1.mjs';
import {exported,prepared} from './harness/backup-v081.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {ArchiveError,safeErrorCode} from '../core/constants.js';
import {BackupService} from '../core/backup-service.js';
import {validateBackupItem,backupHash} from '../core/backup-format.js';
import {ReaderStateService} from '../core/reader-state.js';
import {readPromptCandidates} from '../core/prompt-archive-reader.js';
import {createPromptTemplate} from '../core/prompt-reuse.js';
import {PromptTemplateStore} from '../core/prompt-template-store.js';
import {PromptService} from '../core/prompt-service.js';
import {PROMPT_TEMPLATE_PREFIX,PROMPT_TEMPLATE_LIMITS,promptTemplateKey,
 validatePromptTemplateRow,validatePromptTemplateCollection} from '../core/prompt-template-data.js';
const refused=(promise,code)=>assert.rejects(promise,error=>error.code===code
 &&error.message===code&&!error.message.includes('PRIVATE'));
async function fixture(texts=[]){
 const f=await completeFixture({texts});await f.s.finishFoundation();
 return {...f,templates:new PromptTemplateStore(f.s)};
}
async function generation(s){return (await meta(s,'backup-data-generation'))?.value??0;}
async function canonical(s){
 return Object.fromEntries(await Promise.all(['records','blocks','inputStates','tombstones']
  .map(async name=>[name,await rows(s,name)])));
}
async function templates(s){return (await rows(s,'meta')).filter(row=>row.id.startsWith(PROMPT_TEMPLATE_PREFIX));}
async function candidate(f){return (await readPromptCandidates(f.s)).items[0];}
async function saveCandidate(f,id='saved'){
 const value=await candidate(f);return f.templates.create({id,text:value.text,sourceRefs:value.sourceRefs});
}
async function reseal(items){
 let hash=await backupHash('',items[0]);const counts={...items.at(-1).sectionCounts};
 for(const key of Object.keys(counts))counts[key]=0;
 for(const item of items.slice(1,-1)){hash=await backupHash(hash,item);counts[item.section]++;}
 items[items.length-1]={type:'footer',itemCount:items.length-2,sectionCounts:counts,
  integrity:{algorithm:'SHA-256-chain',root:hash}};return items;
}
test('P1 explicit complete templates persist across actual IndexedDB restart without Source mutation',async()=>{
 const full='Human full prompt '+ '🧠'.repeat(90000)+'\nDo not drop the final negation.';
 const f=await fixture([full]),before=await canonical(f.s),first=await saveCandidate(f,'模版\uffff');
 assert.equal(first.text,full);assert.equal(first.sourceRefs[0].revision,0);
 const fixed=await f.templates.create({id:'short-control',text:'继续',pinned:false});
 assert.equal(fixed.pinned,false);
 f.s.repository.db.close();
 const reopened=new OrganizerStore(f.storage,{indexedDB:f.indexedDB});
 await reopened.finishFoundation();const service=new PromptTemplateStore(reopened);
 const page=await service.page({query:'final negation'});
 assert.equal(page.total,1);assert.equal(page.items[0].text,full);
 assert.deepEqual(page.items[0].sourceRefs,first.sourceRefs);
 const edited=await service.edit(first.id,{expectedRevision:1,text:full+'\nExplicit human change.',pinned:false});
 assert.equal(edited.revision,2);assert.equal(edited.pinned,false);
 const removed=await service.remove(first.id,{expectedRevision:2});
 assert.deepEqual(removed,{kind:'template',id:first.id,revision:3,lifecycle:'removed'});
 assert.equal((await service.page()).total,1);
 assert.deepEqual(await meta(reopened,promptTemplateKey(first.id)),{id:promptTemplateKey(first.id),
  version:1,template:removed});
 assert.doesNotMatch(JSON.stringify(await meta(reopened,promptTemplateKey(first.id))),/negation|sourceRefs|🧠/);
 assert.deepEqual(await canonical(reopened),before);assert.equal(f.requests.length,0);
});
test('P1 CAS rejects stale writers and ID reuse; no-op pin/edit leaves Backup generation unchanged',async()=>{
 const f=await fixture(),value=await f.templates.create({id:'cas',text:'Explicit fixed prompt'});
 const before=await generation(f.s);
 assert.deepEqual(await f.templates.edit(value.id,{expectedRevision:1,text:value.text,pinned:true}),value);
 assert.equal(await generation(f.s),before);
 const results=await Promise.allSettled([
  f.templates.edit(value.id,{expectedRevision:1,pinned:false}),
  f.templates.edit(value.id,{expectedRevision:1,text:'Second concurrent human revision'}),
 ]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(results.find(r=>r.status==='rejected').reason.code,'PROMPT_STALE');
 assert.equal((await f.templates.page()).items[0].revision,2);
 await refused(f.templates.create({id:value.id,text:'Duplicate cannot overwrite'}),'PROMPT_STALE');
 await refused(f.templates.remove(value.id,{expectedRevision:1}),'PROMPT_STALE');
 await f.templates.remove(value.id,{expectedRevision:2});
 await refused(f.templates.create({id:value.id,text:'Removed ID cannot revive'}),'PROMPT_STALE');
 await refused(f.templates.edit(value.id,{expectedRevision:3,text:'Removed ID cannot edit'}),'PROMPT_UNAVAILABLE');
 assert.equal((await f.templates.page()).total,0);assert.equal(f.requests.length,0);
});
test('P1 creation binds only the complete current eligible Input revision and all merged Source refs',async()=>{
 const f=await fixture(['First complete source','Second complete source']);
 const bs=(await rows(f.s,'blocks')).map(r=>r.value);
 await f.s.foundationWrite(async t=>{
  const owner=(await t.get('blocks',bs[0].id)).value,state=await t.get('inputStates',owner.id);
  owner.libraryText='Full merged human prompt';owner.provenance=bs.flatMap(b=>b.provenance);
  state.sourceRecordIds=owner.provenance.map(p=>p.sourceRecordId);state.contentRevision++;
  await t.put('blocks',{id:owner.id,value:owner});await t.put('inputStates',state);
  const other=await t.get('inputStates',bs[1].id);other.removalState='removed';await t.put('inputStates',other);
 });
 const c=await candidate(f),before=await canonical(f.s);
 assert.equal(c.sourceRefs.length,2);
 await refused(f.templates.create({id:'partial',text:c.text,sourceRefs:c.sourceRefs.slice(0,1)}),'PROMPT_INVALID');
 await refused(f.templates.create({id:'forged-source',text:c.text,
  sourceRefs:c.sourceRefs.map((r,i)=>i?{...r,sourceId:'PRIVATE_FORGED_SOURCE'}:r)}),'PROMPT_INVALID');
 await refused(f.templates.create({id:'forged-revision',text:c.text,
  sourceRefs:c.sourceRefs.map(r=>({...r,revision:r.revision+1}))}),'PROMPT_STALE');
 await refused(f.templates.create({id:'rewritten-on-create',text:'Different body',
  sourceRefs:c.sourceRefs}),'PROMPT_STALE');
 const saved=await f.templates.create({id:'merged',text:c.text,sourceRefs:c.sourceRefs});
 assert.deepEqual(saved.sourceRefs,c.sourceRefs);assert.deepEqual(await canonical(f.s),before);
 await f.s.excludeLibrary(bs[0].id,true);
 await refused(f.templates.create({id:'excluded',text:c.text,sourceRefs:c.sourceRefs}),'PROMPT_UNAVAILABLE');
 assert.equal((await f.templates.page()).total,1);assert.equal(f.requests.length,0);
});
test('P1 source trace reports changed/unavailable authority without rewriting human template or leaking bodies',async()=>{
 const f=await fixture(['Original complete prompt']),saved=await saveCandidate(f),ref=saved.sourceRefs[0];
 let trace=await f.templates.trace(saved.id);
 assert.equal(trace.sourceRefs[0].status,'CURRENT');assert.equal(trace.sourceRefs[0].currentRevision,0);
 await inputEdit(f.s,ref.id,{libraryText:'Changed canonical Input PRIVATE_CURRENT_BODY'});
 trace=await f.templates.trace(saved.id);
 assert.equal(trace.sourceRefs[0].status,'VERSION_CHANGED');assert.equal(trace.sourceRefs[0].revision,0);
 assert.equal(trace.sourceRefs[0].currentRevision,1);assert.doesNotMatch(JSON.stringify(trace),/PRIVATE_|Original complete/);
 assert.equal((await f.templates.page()).items[0].text,saved.text);
 await new ReaderStateService(f.s).configure({kind:'input',id:ref.id,excluded:true});
 trace=await f.templates.trace(saved.id);assert.equal(trace.sourceRefs[0].status,'UNAVAILABLE');
 assert.equal(trace.sourceRefs[0].currentRevision,null);
 assert.equal((await f.templates.page()).items[0].text,saved.text);
 await f.templates.remove(saved.id,{expectedRevision:1});
 await refused(f.templates.trace(saved.id),'PROMPT_UNAVAILABLE');assert.equal(f.requests.length,0);
});
test('P1 getter/malformed/version/foreign-role refusals remain finite and perform zero external I/O',async()=>{
 const f=await fixture(['Visible human prompt']),saved=await saveCandidate(f);
 let getters=0;
 const change={get expectedRevision(){getters++;throw Error('PRIVATE_GETTER');},pinned:false};
 await refused(f.templates.edit(saved.id,change),'PROMPT_INVALID');
 await refused(f.templates.remove(saved.id,change),'PROMPT_INVALID');
 await refused(f.templates.page({get query(){getters++;throw Error('PRIVATE_QUERY');}}),'PROMPT_INVALID');
 assert.equal(getters,0);
 const sourceId=saved.sourceRefs[0].sourceId;
 await f.s.foundationWrite(async t=>{const row=await t.get('records',sourceId);
  row.value.role='assistant';await t.put('records',row);});
 await refused(f.templates.create({id:'foreign',text:saved.text,sourceRefs:saved.sourceRefs}),'PROMPT_UNAVAILABLE');
 assert.equal((await f.templates.trace(saved.id)).sourceRefs[0].status,'UNAVAILABLE');
 const original=await meta(f.s,promptTemplateKey(saved.id));
 await f.s.foundationWrite(t=>t.put('meta',{...original,version:99}));
 await refused(f.templates.page(),'PROMPT_VERSION_UNSUPPORTED');
 assert.equal(safeErrorCode(new ArchiveError('PROMPT_VERSION_UNSUPPORTED')),'PROMPT_VERSION_UNSUPPORTED');
 await f.s.foundationWrite(t=>t.put('meta',{...original,template:{...original.template,text:'PRIVATE_BAD',sourceRefs:[{...saved.sourceRefs[0],revision:-1}]}}));
 await refused(f.templates.page(),'PROMPT_INVALID');
 assert.equal(f.requests.length,0);
});
test('P1 create/edit/remove fault after actual put rolls back body, tombstone and Backup generation atomically',async()=>{
 for(const kind of ['create','edit','remove']){
  const f=await fixture();
  if(kind!=='create')await f.templates.create({id:'atomic',text:'Full original human template'});
  const before=await templates(f.s),beforeGeneration=await generation(f.s),tx=f.s.repository.transaction.bind(f.s.repository);
  let fired=false;
  f.s.repository.transaction=(write,fn,stores)=>tx(write,async t=>{
   const put=t.put.bind(t);t.put=async(name,row,...rest)=>{
    const result=await put(name,row,...rest);
    if(write&&name==='meta'&&row.id===promptTemplateKey('atomic')){
     fired=true;throw new ArchiveError('STORAGE_FAILED');
    }return result;
   };return fn(t);
  },stores);
  const operation=kind==='create'?f.templates.create({id:'atomic',text:'Full new human template'}):
   kind==='edit'?f.templates.edit('atomic',{expectedRevision:1,text:'PRIVATE_ATOMIC_NEW_BODY'}):
    f.templates.remove('atomic',{expectedRevision:1});
  await refused(operation,'STORAGE_FAILED');assert.equal(fired,true);
  f.s.repository.transaction=tx;
  assert.deepEqual(await templates(f.s),before);assert.equal(await generation(f.s),beforeGeneration);
  assert.equal(f.requests.length,0);
 }
});
test('P1 B-02 fences only Source permanent purge with active human templates; unrelated purge and explicit template removal work',async()=>{
 const f=await fixture(['First source for human template','Independent source']);
 const c=(await readPromptCandidates(f.s)).items.find(c=>c.text.startsWith('First source'));
 const saved=await f.templates.create({id:'human-edited',text:c.text,sourceRefs:c.sourceRefs});
 await f.templates.edit(saved.id,{expectedRevision:1,text:'PRIVATE_HUMAN_EDITED_DERIVATIVE'});
 const sourceId=c.sourceRefs[0].sourceId,before=await canonical(f.s),beforeTemplates=await templates(f.s),
  beforeGeneration=await generation(f.s);
 await refused(f.s.purge(sourceId,true),'PROMPT_SOURCE_PURGE_REVIEW_REQUIRED');
 assert.deepEqual(await canonical(f.s),before);assert.deepEqual(await templates(f.s),beforeTemplates);
 assert.equal(await generation(f.s),beforeGeneration);
 const unrelated=(await rows(f.s,'records')).find(row=>row.id!==sourceId).id;
 await f.s.purge(unrelated,true);assert.ok(await meta(f.s,promptTemplateKey(saved.id)));
 assert.equal((await rows(f.s,'records')).length,1);
 await f.templates.remove(saved.id,{expectedRevision:2});
 await f.s.purge(sourceId,true);await f.s.drainPurgeCleanup();
 assert.equal((await rows(f.s,'records')).length,0);assert.equal((await f.templates.page()).total,0);
 assert.doesNotMatch(JSON.stringify(await templates(f.s)),/PRIVATE_|sourceRefs/);
 assert.equal(f.requests.length,0);
});
test('P1 portable Backup round trip preserves full human body, historical refs, pin and body-free tombstones',async()=>{
 const full='Complete backup prompt '+ '🧠'.repeat(90000)+'\nDo not drop the last condition.';
 const f=await fixture([full]),saved=await saveCandidate(f,'portable');
 await f.templates.edit(saved.id,{expectedRevision:1,pinned:false});
 await f.templates.create({id:'deleted',text:'PRIVATE_REMOVED_TEMPLATE'});
 await f.templates.remove('deleted',{expectedRevision:1});
 const items=await exported(new BackupService(f.s)),portable=items.filter(item=>item.section==='organizationState'
  &&item.value.id.startsWith(PROMPT_TEMPLATE_PREFIX));
 assert.equal(portable.length,2);assert.equal(portable.find(item=>item.value.data.template.id==='portable').value.data.template.text,full);
 assert.doesNotMatch(JSON.stringify(items),/PRIVATE_REMOVED_TEMPLATE|synthetic-test-key|apiKey|clipboard/);
 const target=await fixture(),service=new BackupService(target.s),stage=await prepared(service,items);
 assert.equal(stage.preview.canRestore,true);
 await service.restore({sessionId:stage.sessionId,confirmation:stage.preview.integrity});
 assert.deepEqual(await templates(target.s),await templates(f.s));
 assert.equal((await target.templates.page()).items[0].text,full);
 assert.equal((await target.templates.page()).items[0].pinned,false);
 assert.deepEqual((await target.templates.page()).items[0].sourceRefs,saved.sourceRefs);
 assert.equal((await target.templates.page()).total,1);
 await refused(target.s.purge(saved.sourceRefs[0].sourceId,true),'PROMPT_SOURCE_PURGE_REVIEW_REQUIRED');
 assert.equal(f.requests.length,0);assert.equal(target.requests.length,0);
});
test('P1 Backup protects source-less templates in empty restore and rejects same-ID merge; explicit replace/merge retain confirmed work',async()=>{
 const incoming=await fixture();await incoming.templates.create({id:'incoming',text:'Incoming complete human template'});
 const items=await exported(new BackupService(incoming.s));
 const target=await fixture();await target.templates.create({id:'local',text:'Local user-authored fixed template'});
 const service=new BackupService(target.s),stage=await prepared(service,items);
 assert.equal(stage.preview.canRestore,false);assert.equal(stage.preview.reason,'BACKUP_TARGET_NOT_EMPTY');
 await refused(service.restore({sessionId:stage.sessionId,confirmation:stage.preview.integrity}),'BACKUP_TARGET_NOT_EMPTY');
 const merge=await service.previewRestore({sessionId:stage.sessionId,mode:'merge'});
 assert.equal(merge.canRestore,true);
 await service.restore({sessionId:stage.sessionId,mode:'merge',confirmation:merge.integrity,
  targetGeneration:merge.targetGeneration,confirmMerge:true});
 assert.deepEqual((await target.templates.page()).items.map(x=>x.id),['incoming','local']);
 const incoming2=await fixture();await incoming2.templates.create({id:'incoming',text:'Conflicting private different body'});
 const conflict=await prepared(service,await exported(new BackupService(incoming2.s)));
 const conflictPreview=await service.previewRestore({sessionId:conflict.sessionId,mode:'merge'});
 assert.equal(conflictPreview.canRestore,false);assert.equal(conflictPreview.reason,'BACKUP_MERGE_CONFLICT');
 const before=await templates(target.s);
 await refused(service.restore({sessionId:conflict.sessionId,mode:'merge',confirmation:conflictPreview.integrity,
  targetGeneration:conflictPreview.targetGeneration,confirmMerge:true}),'BACKUP_MERGE_CONFLICT');
 assert.deepEqual(await templates(target.s),before);
 const replace=await service.previewRestore({sessionId:conflict.sessionId,mode:'replace'});
 await refused(service.restore({sessionId:conflict.sessionId,mode:'replace',confirmation:replace.integrity,
  targetGeneration:replace.targetGeneration}),'BACKUP_CONFIRMATION_REQUIRED');
 await service.restore({sessionId:conflict.sessionId,mode:'replace',confirmation:replace.integrity,
  targetGeneration:replace.targetGeneration,confirmReplace:true});
 assert.equal((await target.templates.page()).total,1);
 assert.equal((await target.templates.page()).items[0].text,'Conflicting private different body');
 assert.equal(target.requests.length,0);
});
test('P1 Backup invalidates exports on template mutation and rejects malformed/unknown-version refs before restore',async()=>{
 const f=await fixture();await f.templates.create({id:'backup-fence',text:'Explicit human prompt'});
 const service=new BackupService(f.s),exp=await service.beginExport();
 await f.templates.edit('backup-fence',{expectedRevision:1,pinned:false});
 await refused(service.exportPage({sessionId:exp.sessionId,sequence:0}),'BACKUP_CHANGED');
 const items=await exported(service),item=items.find(row=>row.section==='organizationState'
  &&row.value.id.startsWith(PROMPT_TEMPLATE_PREFIX));
 for(const kind of ['version','prefix','ref','body','secret','surplus']){
  const bad=structuredClone(items),row=bad.find(row=>row.section==='organizationState'
   &&row.value.id===item.value.id);
  let code='BACKUP_INVALID';
  if(kind==='version'){row.value.data.version=2;code='BACKUP_VERSION_UNSUPPORTED';}
  if(kind==='prefix'){row.value.id=row.value.id.replace(':v1:',':v2:');row.value.data.id=row.value.id;code='BACKUP_VERSION_UNSUPPORTED';}
  if(kind==='ref')row.value.data.template.sourceRefs=[{kind:'input',id:'fake',revision:-1,sourceId:'fake'}];
  if(kind==='body')row.value.data.template.text='';
  if(kind==='secret')row.value.data.apiKey='PRIVATE_FORBIDDEN_CREDENTIAL';
  if(kind==='surplus')row.value.data.authority='PRIVATE_INVENTED_PERMISSION';
  const target=await fixture(),restore=new BackupService(target.s);
  await refused(prepared(restore,await reseal(bad)),code);
  assert.deepEqual(await templates(target.s),[]);assert.equal(target.requests.length,0);
 }
 assert.equal(f.requests.length,0);
});
test('P1 actual 1025-template canonical paging preserves full long Unicode and refuses corruption/declared limits',async()=>{
 const f=await fixture(),full='Complete long Unicode '+ '🧠'.repeat(90000)+'\nDo not drop the final negation.';
 for(let start=0;start<1025;start+=100)await f.s.foundationWrite(async t=>{
  for(let i=start;i<Math.min(start+100,1025);i++){
   const id='template-'+String(i).padStart(6,'0'),template=createPromptTemplate({id,
    text:i===1024?full:'Fixed complete user template '+i,pinned:i===1024});
   await t.put('meta',validatePromptTemplateRow({id:promptTemplateKey(id),version:1,template}));
  }
 });
 const tx=f.s.repository.transaction.bind(f.s.repository);let pageReads=0,maxPage=0;
 f.s.repository.transaction=(write,fn,stores)=>tx(write,async t=>{
  const page=t.primaryRangePage.bind(t);t.primaryRangePage=async(name,settings)=>{
   if(name==='meta'&&settings.prefix===PROMPT_TEMPLATE_PREFIX){pageReads++;maxPage=Math.max(maxPage,settings.limit);}
   return page(name,settings);
  };return fn(t);
 },stores);
 const result=await f.templates.page({query:'final negation'});
 assert.equal(result.total,1);assert.equal(result.items[0].text,full);
 assert.equal(pageReads,11);assert.equal(maxPage,100);
 assert.equal((await f.templates.page({limit:100})).total,1025);
 assert.equal((await f.templates.page({offset:1000,limit:100})).items.length,25);
 assert.throws(()=>validatePromptTemplateCollection(Array(PROMPT_TEMPLATE_LIMITS.count+1).fill(null)),
  error=>error.code==='PROMPT_LIMIT');
 await f.s.foundationWrite(t=>t.put('meta',{id:promptTemplateKey('corrupt'),version:1,
  template:{kind:'template',id:'different',revision:1,lifecycle:'active',text:'PRIVATE_CORRUPT',pinned:true,sourceRefs:[]}}));
 await refused(f.templates.page(),'PROMPT_INVALID');
 assert.equal(f.requests.length,0);
});
test('P1 refuses a non-portable complete ref set instead of clipping refs or creating a partial durable template',async()=>{
 const f=await fixture(),refs=Array.from({length:30000},(_,i)=>({kind:'input',
  id:'i'.repeat(194)+String(i).padStart(6,'0'),revision:0,
  sourceId:'s'.repeat(194)+String(i).padStart(6,'0')}));
 await refused(f.templates.create({id:'full-reference-limit',text:'Full unchanged prompt body',
  sourceRefs:refs}),'PROMPT_LIMIT');
 assert.deepEqual(await templates(f.s),[]);assert.equal(f.requests.length,0);
 assert.throws(()=>validatePromptTemplateCollection([
  {id:promptTemplateKey('duplicate'),version:1,template:createPromptTemplate({id:'duplicate',text:'First'})},
  {id:promptTemplateKey('duplicate'),version:1,template:createPromptTemplate({id:'duplicate',text:'Second'})},
 ]),error=>error.code==='PROMPT_INVALID');
});

test('P1 trusted command service rejects surplus/accessors and exposes finite model errors',async()=>{
 const f=await fixture(),service=new PromptService(f.s);let getters=0;
 for(const request of [null,{}, {type:'PAIA_PROMPT_UNKNOWN'},{type:123},
  {type:'PAIA_PROMPT_PAGE',grantId:'PRIVATE_FORGED_GRANT'},
  {type:'PAIA_PROMPT_EDIT',id:'none'},
  {type:'PAIA_PROMPT_CANDIDATES',options:{limit:101}},
  {type:'PAIA_PROMPT_CREATE',template:{id:'none',text:'Explicit',actor:'ai'}}])
  await refused(service.handle(request),'PROMPT_INVALID');
 const root={type:'PAIA_PROMPT_PAGE'};
 Object.defineProperty(root,'options',{enumerable:true,get(){getters++;return {};}});
 await refused(service.handle(root),'PROMPT_INVALID');
 const options={};Object.defineProperty(options,'query',{enumerable:true,
  get(){getters++;return 'PRIVATE_BODY';}});
 await refused(service.handle({type:'PAIA_PROMPT_CANDIDATES',options}),'PROMPT_INVALID');
 assert.equal(getters,0);assert.equal((await f.templates.page()).total,0);
 assert.equal(f.requests.length,0);
});
test('P1 current template read fences full body against actual edits/removal before manual copy',async()=>{
 const f=await fixture(),service=new PromptService(f.s),body='Manual full '+ '🧠'.repeat(90000)+' do not truncate.';
 const saved=await service.handle({type:'PAIA_PROMPT_CREATE',template:{id:'read-current',text:body}});
 assert.equal((await service.handle({type:'PAIA_PROMPT_READ',id:saved.id,expectedRevision:1})).text,body);
 await service.handle({type:'PAIA_PROMPT_EDIT',id:saved.id,change:{expectedRevision:1,text:body+' Human edit.'}});
 await refused(service.handle({type:'PAIA_PROMPT_READ',id:saved.id,expectedRevision:1}),'PROMPT_STALE');
 assert.equal((await service.handle({type:'PAIA_PROMPT_READ',id:saved.id,expectedRevision:2})).text,body+' Human edit.');
 await service.handle({type:'PAIA_PROMPT_REMOVE',id:saved.id,change:{expectedRevision:2}});
 await refused(service.handle({type:'PAIA_PROMPT_READ',id:saved.id,expectedRevision:3}),'PROMPT_UNAVAILABLE');
 await refused(service.handle({type:'PAIA_PROMPT_READ',id:saved.id,expectedRevision:0}),'PROMPT_INVALID');
 assert.equal(f.requests.length,0);
});
test('P1 Source purge refuses a protected template before recovery cleanup callback',async()=>{
 const f=await fixture(['Protected human prompt']),saved=await saveCandidate(f),
  before=await canonical(f.s),gen=await generation(f.s);let effects=0;
 await refused(f.s.permanentDelete(saved.sourceRefs[0].sourceId,async()=>{effects++;}),
  'PROMPT_SOURCE_PURGE_REVIEW_REQUIRED');
 assert.equal(effects,0);assert.deepEqual(await canonical(f.s),before);
 assert.equal(await generation(f.s),gen);assert.equal((await f.templates.page()).items[0].text,saved.text);
});
test('P1 Source purge holds existing writer queue across admitted recovery cleanup',async()=>{
 const f=await fixture(['Human prompt at cleanup boundary']),c=await candidate(f);
 let admit,release,effects=0;
 const entered=new Promise(resolve=>{admit=resolve;}),blocked=new Promise(resolve=>{release=resolve;});
 const purging=f.s.permanentDelete(c.sourceRefs[0].sourceId,async ids=>{
  effects++;assert.deepEqual(ids,[c.sourceRefs[0].sourceId]);assert.equal(Object.isFrozen(ids),true);
  admit();await blocked;
 });
 await entered;
 const creating=f.templates.create({id:'cannot-race-purge',text:c.text,sourceRefs:c.sourceRefs});
 // Observe the refusal from the start, avoiding an unhandled rejected promise.
 const result=creating.then(value=>({value}),error=>({code:error.code}));
 release();await purging;
 assert.equal(effects,1);assert.equal((await result).code,'PROMPT_UNAVAILABLE');
 assert.equal((await rows(f.s,'records')).length,0);assert.equal((await f.templates.page()).total,0);
});
test('P1 failed recovery cleanup retains canonical Source and refuses before purge commit',async()=>{
 const f=await fixture(['Original Source for failed cleanup']),c=await candidate(f),
  before=await canonical(f.s),gen=await generation(f.s);let effects=0;
 await assert.rejects(f.s.permanentDelete(c.sourceRefs[0].sourceId,async()=>{
  effects++;throw new Error('Synthetic recovery cleanup failure');
 }),/Synthetic recovery cleanup failure/);
 assert.equal(effects,1);assert.deepEqual(await canonical(f.s),before);
 assert.equal(await generation(f.s),gen);
 const ids=[];await f.s.permanentDelete(c.sourceRefs[0].sourceId,async all=>{ids.push(...all);});
 assert.deepEqual(ids,[c.sourceRefs[0].sourceId]);assert.equal((await rows(f.s,'records')).length,0);
 assert.equal(f.requests.length,0);
});
