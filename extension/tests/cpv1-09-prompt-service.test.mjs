import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture,append,rows,meta} from './harness/original-complete.mjs';
import {PromptReuseService} from '../core/prompt-reuse-service.js';
import {PROMPT_REUSE_ROW,validPromptPreferences} from '../core/prompt-reuse-preferences.js';
import {BackupService} from '../core/backup-service.js';
import {validateBackupItem} from '../core/backup-format.js';
import {key} from '../core/memory/model.js';
const text='解释这个算法，保留限制和反例。';
async function fixture(){const f=await completeFixture({texts:[text,text,'总结这篇文章。','总结这篇文章。']});f.service=new PromptReuseService(f.s);await f.s.finishFoundation();return f;}
async function change(f,action,id,extra={}){const q=await f.service.query({includeHidden:true});return f.service.change({action,id,revision:q.revision,...extra});}
const authority=async s=>Object.fromEntries(await Promise.all(['records','blocks','inputStates','revisions','documents','tombstones'].map(async n=>[n,await rows(s,n)])));
test('editing reuse text never changes Source, Working Input, history or other archive authority',async()=>{
 const f=await fixture(),q=await f.service.query(),before=await authority(f.s),id=q.items[0].id;
 await change(f,'edit',id,{text:'独立模板\nkeep all Unicode 👩🏽‍💻'});
 assert.equal((await f.service.query()).items.find(x=>x.id===id).text,'独立模板\nkeep all Unicode 👩🏽‍💻');assert.deepEqual(await authority(f.s),before);assert.equal(f.requests.length,0);
});
test('pin/reorder/unpin and reversible hide preserve manual order through new capture',async()=>{
 const f=await fixture(),q=await f.service.query(),[a,b]=q.items.map(x=>x.id);
 await change(f,'pin',b);await change(f,'pin',a,{order:[b,a]});
 await append(f.s,text,'extra-prompt','different-conversation');
 assert.deepEqual((await f.service.query()).items.map(x=>x.id),[b,a]);
 await change(f,'hide',b);assert.deepEqual((await f.service.query()).items.map(x=>x.id),[a]);
 await change(f,'show',b);assert.deepEqual((await f.service.query()).items.map(x=>x.id),[b,a]);
 await change(f,'unpin',b);assert.equal((await f.service.query()).items[0].id,a);
 assert.equal((await meta(f.s,PROMPT_REUSE_ROW)).pins.includes(b),false);
});
test('split correction survives service restart and never immediately remerges identical inputs',async()=>{
 const f=await fixture(),q=await f.service.query(),family=q.items.find(x=>x.text===text),inputId=family.members[0];
 await change(f,'split',family.id,{inputIds:[inputId]});
 const snapshot=await new PromptReuseService(f.s).snapshot();
 const split=snapshot.families.find(x=>x.members.includes(inputId));assert.equal(split.members.length,1);assert.notEqual(split.id,family.id);
 await append(f.s,text,'later-duplicate','other-conversation');const later=await f.service.snapshot();assert.equal(later.families.find(x=>x.id===split.id).members.length,1);
});
test('current Working Input, removal, explicit AI exclusion and tombstones govern every release',async()=>{
 const f=await fixture(),q=await f.service.query(),family=q.items.find(x=>x.text===text);
 const blocks=(await rows(f.s,'blocks')).map(x=>x.value).filter(x=>family.members.includes(x.id));
 for(const b of blocks)await f.s.editDocument({operationId:crypto.randomUUID(),documentId:b.documentId,blocks:[{id:b.id,expectedRevision:b.revision,libraryText:'不同的当前用户改写 '+b.id,note:'',excluded:false}]});
 await assert.rejects(()=>f.service.resolve(family));assert.ok(!(await f.service.query()).items.some(x=>x.id===family.id));
 const other=(await f.service.query()).items[0];for(const inputId of other.members)await f.s.repository.transaction(true,t=>t.put('meta',{id:key('input',inputId),kind:'input',version:1,inputId,excluded:true}));
 assert.equal((await f.service.query()).items.length,0);await assert.rejects(()=>f.service.resolve(other));
});
test('purge removes automatic evidence, while explicit independent template survives by contract',async()=>{
 const f=await fixture(),q=await f.service.query(),family=q.items.find(x=>x.text===text),other=q.items.find(x=>x.id!==family.id);
 await change(f,'edit',family.id,{text:'明确独立保存的模板'});
 for(const row of await rows(f.s,'records'))await f.s.permanentDelete(row.id);
 const result=await f.service.query();assert.equal(result.items.length,1);assert.equal(result.items[0].text,'明确独立保存的模板');assert.equal(result.items[0].members.length,0);
 await assert.rejects(()=>f.service.resolve(other));assert.deepEqual(await rows(f.s,'records'),[]);
});
test('assistant role, removed and filtered inputs never seed an automatic family',async()=>{
 const f=await fixture();await f.s.repository.transaction(true,async t=>{
  const records=await t.all('records');for(const row of records){row.value.role='assistant';await t.put('records',row);}
 });assert.equal((await f.service.query()).items.length,0);
});
test('stale preference writes and invalid manual orders fail without dropping saved work',async()=>{
 const f=await fixture(),q=await f.service.query(),id=q.items[0].id;
 await change(f,'edit',id,{text:'先保存的内容'});const saved=await meta(f.s,PROMPT_REUSE_ROW);
 await assert.rejects(()=>f.service.change({action:'hide',id,revision:q.revision}));
 await assert.rejects(()=>change(f,'pin',id,{order:[]}));assert.deepEqual(await meta(f.s,PROMPT_REUSE_ROW),saved);
});
async function exported(s){const b=new BackupService(s),{sessionId,header}=await b.beginExport(),items=[header];for(let sequence=0;;sequence++){const page=await b.exportPage({sessionId,sequence});items.push(...page.items);if(page.done)return items;}}
async function stage(b,items){const {sessionId}=await b.beginRestore();for(let i=0;i<items.length;i+=30)await b.stageRestore({sessionId,items:items.slice(i,i+30)});return {sessionId,preview:await b.previewRestore({sessionId})};}
test('strict Backup round trip retains edited template, pins/hide/split without a new store or grants',async()=>{
 const f=await fixture(),q=await f.service.query(),id=q.items[0].id;await change(f,'edit',id,{text:'Backup 用户模板'});await change(f,'pin',id);await change(f,'hide',id);await change(f,'split',id,{inputIds:[q.items[0].members[0]]});
 const expected=await meta(f.s,PROMPT_REUSE_ROW),items=await exported(f.s);assert.equal(items.filter(x=>x.value?.id===PROMPT_REUSE_ROW).length,1);
 const target=await completeFixture({texts:[]}),b=new BackupService(target.s),r=await stage(b,items);assert.equal(r.preview.canRestore,true);await b.restore({sessionId:r.sessionId,confirmation:r.preview.integrity});
 assert.deepEqual(await meta(target.s,PROMPT_REUSE_ROW),expected);assert.equal(target.s.repository.db.version,5);assert.equal(target.requests.length,0);
 const tampered=structuredClone(items.find(x=>x.value?.id===PROMPT_REUSE_ROW));tampered.value.data.overrides[0].secret='bad';assert.throws(()=>validateBackupItem(tampered));assert.equal(validPromptPreferences(tampered.value.data),false);
});
test('backup empty/merge cannot silently overwrite independent template work',async()=>{
 const f=await completeFixture({texts:[]}),service=new PromptReuseService(f.s);await service.change({action:'create',revision:0,text:'独立模板甲'});const items=await exported(f.s);
 const target=await completeFixture({texts:[]}),other=new PromptReuseService(target.s);await other.change({action:'create',revision:0,text:'独立模板乙'});
 const b=new BackupService(target.s),r=await stage(b,items);assert.equal(r.preview.canRestore,false);assert.equal((await b.previewRestore({sessionId:r.sessionId,mode:'merge'})).reason,'BACKUP_MERGE_CONFLICT');assert.equal((await other.query()).items[0].text,'独立模板乙');
});
test('removed input and purge fences veto old automatic read-back, without resurrecting through rebuild',async()=>{
 const f=await fixture(),family=(await f.service.query()).items.find(x=>x.text===text);
 for(const id of family.members){const b=(await rows(f.s,'blocks')).find(x=>x.id===id).value;await f.s.editDocument({operationId:crypto.randomUUID(),documentId:b.documentId,blocks:[{id:b.id,expectedRevision:b.revision,libraryText:b.libraryText,note:'',excluded:true}]});}
 assert.ok(!(await f.service.query()).items.some(x=>x.id===family.id));await assert.rejects(()=>f.service.resolve(family));
 const other=(await f.service.query()).items[0];for(const id of other.members){const b=(await rows(f.s,'blocks')).find(x=>x.id===id).value,source=(await rows(f.s,'recordIndex')).find(x=>x.id===b.originalTextReference);await f.s.repository.transaction(true,t=>t.put('tombstones',{id:'source:'+source.sourceKey,sequence:1,value:{sourceIdentityHash:source.sourceKey}}));}
 assert.equal((await f.service.query()).items.length,0);
});
test('storage abort preserves overrides and archive; a changed release generation is rejected',async()=>{
 const f=await fixture(),family=(await f.service.query()).items[0];await change(f,'edit',family.id,{text:'saved before failure'});const saved=await meta(f.s,PROMPT_REUSE_ROW),before=await authority(f.s);
 const transaction=f.s.repository.transaction.bind(f.s.repository);
 f.s.repository.transaction=(write,fn,...args)=>transaction(write,async t=>{const put=t.put.bind(t);t.put=async(name,value,...rest)=>{if(name==='meta'&&value.id===PROMPT_REUSE_ROW)throw Error('synthetic write failure');return put(name,value,...rest);};return fn(t);},...args);
 await assert.rejects(()=>change(f,'hide',family.id));f.s.repository.transaction=transaction;
 assert.deepEqual(await meta(f.s,PROMPT_REUSE_ROW),saved);assert.deepEqual(await authority(f.s),before);
 const selection=await f.service.resolve({id:family.id,text:'saved before failure'});await change(f,'hide',family.id);await assert.rejects(()=>f.service.assertCurrent(selection.generation));
});
test('explicit independent-template delete removes hidden/pinned work, stale release and new Backup without touching history',async()=>{
 const f=await fixture(),block=(await rows(f.s,'blocks'))[0].value,topic=await f.s.createTopic({name:'Synthetic preserved Thought',operationId:crypto.randomUUID()});
 await f.s.addToTopics({kind:'input',id:block.id,expectedRevision:block.revision,topicIds:[topic.id],operationId:crypto.randomUUID()});
 const {id}=await change(f,'create',undefined,{text:'DELETE_ONLY_THIS_TEMPLATE'});await change(f,'pin',id);
 const selected=await f.service.resolve((await f.service.query()).items.find(x=>x.id===id));await change(f,'hide',id);
 const before=await authority(f.s),thoughts=await rows(f.s,'thoughts'),topics=await rows(f.s,'topics');
 const oldBackup=await exported(f.s);assert.match(JSON.stringify(oldBackup),/DELETE_ONLY_THIS_TEMPLATE/);
 await change(f,'delete',id);
 for(const includeHidden of [false,true])assert.ok(!(await new PromptReuseService(f.s).query({includeHidden})).items.some(x=>x.id===id));
 const prefs=await meta(f.s,PROMPT_REUSE_ROW);assert.ok(!prefs.overrides.some(x=>x.id===id));assert.ok(!prefs.pins.includes(id));
 await assert.rejects(()=>f.service.resolve(selected));await assert.rejects(()=>f.service.assertCurrent(selected.generation));
 // A delayed successful insertion acknowledgement must not recreate a deleted override.
 await f.service.noteVerifiedReuse(id);assert.deepEqual(await meta(f.s,PROMPT_REUSE_ROW),prefs);
 const items=await exported(f.s);assert.doesNotMatch(JSON.stringify(items),/DELETE_ONLY_THIS_TEMPLATE/);
 const target=await completeFixture({texts:[]}),backup=new BackupService(target.s),r=await stage(backup,items);
 assert.equal(r.preview.canRestore,true);await backup.restore({sessionId:r.sessionId,confirmation:r.preview.integrity});
 assert.ok(!(await new PromptReuseService(target.s).query({includeHidden:true})).items.some(x=>x.id===id));
 assert.deepEqual(await authority(f.s),before);assert.deepEqual(await rows(f.s,'thoughts'),thoughts);assert.deepEqual(await rows(f.s,'topics'),topics);assert.equal(f.requests.length,0);
});
test('delete refuses any family with current members, but permits its independent edited template after support loss',async()=>{
 const f=await fixture(),family=(await f.service.query()).items[0];
 await assert.rejects(()=>change(f,'delete',family.id),e=>e.code==='INVALID_REQUEST');
 await change(f,'edit',family.id,{text:'INDEPENDENT_AFTER_PURGE'});await change(f,'pin',family.id);const prefs=await meta(f.s,PROMPT_REUSE_ROW),before=await authority(f.s);
 await assert.rejects(()=>change(f,'delete',family.id),e=>e.code==='INVALID_REQUEST');assert.deepEqual(await meta(f.s,PROMPT_REUSE_ROW),prefs);assert.deepEqual(await authority(f.s),before);
 for(const row of await rows(f.s,'records'))await f.s.permanentDelete(row.id);
 assert.equal((await f.service.query()).items[0].members.length,0);const afterPurge=await authority(f.s);
 await change(f,'delete',family.id);await f.service.noteVerifiedReuse(family.id);
 assert.deepEqual((await f.service.query({includeHidden:true})).items,[]);assert.equal((await meta(f.s,PROMPT_REUSE_ROW)).overrides.some(x=>x.id===family.id),false);
 assert.deepEqual(await authority(f.s),afterPurge);assert.doesNotMatch(JSON.stringify(await exported(f.s)),/INDEPENDENT_AFTER_PURGE/);
});
test('delete frees a full bounded override slot; hide does not; unrelated manual order survives',async()=>{
 const f=await fixture(),q=await f.service.query();await change(f,'pin',q.items[0].id);await change(f,'pin',q.items[1].id);
 const prefs=await meta(f.s,PROMPT_REUSE_ROW),originalPins=[...prefs.pins];
 for(let i=prefs.overrides.length;i<500;i++)prefs.overrides.push({id:'manual:'+crypto.randomUUID(),text:'synthetic template '+i,hidden:false,reuseCount:0});
 const id=prefs.overrides[2].id;prefs.pins.splice(1,0,id);assert.equal(validPromptPreferences(prefs),true);await f.s.repository.transaction(true,t=>t.put('meta',prefs));
 await assert.rejects(()=>change(f,'create',undefined,{text:'no room'}));await change(f,'hide',id);await assert.rejects(()=>change(f,'create',undefined,{text:'still no room'}));
 await change(f,'delete',id);assert.equal((await meta(f.s,PROMPT_REUSE_ROW)).overrides.length,499);assert.deepEqual((await meta(f.s,PROMPT_REUSE_ROW)).pins,originalPins);
 await change(f,'create',undefined,{text:'new template uses freed capacity'});assert.equal((await meta(f.s,PROMPT_REUSE_ROW)).overrides.length,500);
});
test('stale or aborted delete preserves the template, pin and archive atomically',async()=>{
 const f=await fixture(),{id}=await change(f,'create',undefined,{text:'preserve on delete failure'}),q=await f.service.query();await change(f,'pin',id);
 await assert.rejects(()=>f.service.change({action:'delete',id,revision:q.revision}),e=>e.code==='MEMORY_STALE');
 const saved=await meta(f.s,PROMPT_REUSE_ROW),before=await authority(f.s),transaction=f.s.repository.transaction.bind(f.s.repository);let aborted=false;
 f.s.repository.transaction=(write,fn,...args)=>transaction(write,async t=>{const put=t.put.bind(t);t.put=async(name,value,...rest)=>{if(name==='meta'&&value.id===PROMPT_REUSE_ROW){aborted=true;throw Error('synthetic delete abort');}return put(name,value,...rest);};return fn(t);},...args);
 try{await assert.rejects(()=>change(f,'delete',id),e=>e.code==='STORAGE_FAILED');assert.equal(aborted,true);}finally{f.s.repository.transaction=transaction;}
 assert.deepEqual(await meta(f.s,PROMPT_REUSE_ROW),saved);assert.deepEqual(await authority(f.s),before);
});

test('surface reorder retains the complete manual order including hidden pins',async()=>{
 const f=await fixture(),q=await f.service.query(),[a,b]=q.items;
 await change(f,'pin',a.id);await change(f,'pin',b.id);await change(f,'hide',a.id);
 const visible=await f.service.query();assert.deepEqual(visible.manualOrder,[a.id,b.id]);assert.ok(!visible.items.some(x=>x.id===a.id));
 await change(f,'pin',b.id,{order:[b.id,a.id]});await change(f,'show',a.id);
 assert.deepEqual((await f.service.query()).items.slice(0,2).map(x=>x.id),[b.id,a.id]);
});
