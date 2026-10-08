import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture,rows} from './harness/original-complete.mjs';
import {hashText} from '../core/dedupe.js';
import {BackupService} from './harness/historical-backup.mjs';
import {exported,prepared} from './harness/backup-v081.mjs';
import {projectBackupEntity,validateBackupItem} from '../core/backup-format.js';
const op=()=>crypto.randomUUID();
async function setup(){const f=await completeFixture({texts:['SYNTHETIC source expression']});const input=(await rows(f.s,'blocks'))[0].value,topic=await f.s.createTopic({name:'SYNTHETIC Topic',operationId:op()});const target=await f.s.addToTopics({operationId:op(),kind:'input',id:input.id,expectedRevision:input.revision,topicIds:[topic.id]});return {...f,input,topic,target:await f.s.entry(target.id)};}
test('independent Thought remains idempotent, has its own time and optional Topic, and creates no relationship',async()=>{
 const f=await setup(),before=await f.s.entry(f.target.id),request={operationId:op(),body:'SYNTHETIC independent human expression'},start=Date.now();const created=await f.s.continueThinking(request);assert.deepEqual(await f.s.continueThinking(request),created);const row=await f.s.entry(created.id);assert.equal(row.body,request.body);assert.equal(row.provenanceType,'user_created');assert.deepEqual(row.sourceRecordIds,[]);assert.ok(Date.parse(row.createdAt)>=start);assert.deepEqual(await rows(f.s,'entryRelations'),[]);assert.deepEqual(await f.s.entryPaths(row.id),[]);assert.deepEqual(await f.s.entry(f.target.id),before);
 const placed=await f.s.continueThinking({operationId:op(),body:'SYNTHETIC Topic expression',topicId:f.topic.id});assert.equal((await f.s.entryPaths(placed.id))[0].topicId,f.topic.id);
});
test('retired relation creation refuses own properties before storage, receipts and source reads',async()=>{
 const f=await setup(),before=await rows(f.s,'thoughts'),receipts=await rows(f.s,'operationReceipts');for(const value of [undefined,null,{id:f.target.id},new Proxy({},{get(){throw Error('SYNTHETIC target must not be read');}})])await assert.rejects(f.s.continueThinking({operationId:op(),body:'SYNTHETIC unsaved',relation:value}),{code:'INVALID_REQUEST'});assert.deepEqual(await rows(f.s,'thoughts'),before);assert.deepEqual(await rows(f.s,'operationReceipts'),receipts);assert.deepEqual(await rows(f.s,'entryRelations'),[]);
});
test('legacy relationships survive restore while comparison never traverses or returns their targets',async()=>{
 const f=await setup(),created=await f.s.continueThinking({operationId:op(),body:'SYNTHETIC old response body'}),relation={id:op(),fromEntryId:created.id,toEntryId:f.target.id,toRevision:f.target.revision,toBodySha256:await hashText(f.target.body),kind:'user_response',relationKey:await hashText(created.id+f.target.id),sourceRecordIds:[f.input.sourceRecordId],createdAt:new Date().toISOString(),actor:'user',operationId:op()};await f.s.foundationWrite(t=>t.put('entryRelations',relation));validateBackupItem({type:'item',section:'relations',value:projectBackupEntity('relations',relation)});
 const items=await exported(new BackupService(f.s)),target=await completeFixture({texts:[]}),service=new BackupService(target.s),stage=await prepared(service,items);assert.equal(stage.preview.canRestore,true);await service.restore({sessionId:stage.sessionId,confirmation:stage.preview.integrity});assert.deepEqual(await rows(target.s,'entryRelations'),[relation]);
 const transaction=target.s.repository.transaction.bind(target.s.repository);target.s.repository.transaction=(write,fn,stores)=>transaction(write,t=>fn(new Proxy(t,{get(o,key){if(key==='all')return(store,...rest)=>{assert.notEqual(store,'entryRelations','retired relation traversal is absent');return o.all(store,...rest);};const v=o[key];return typeof v==='function'?v.bind(o):v;}})),stores);
 const compared=await target.s.compareThought(created.id);assert.deepEqual(compared.relations,[]);assert.equal(compared.entry.thoughtText,'SYNTHETIC old response body');assert.equal((await target.s.entry(f.target.id)).body,f.target.body);
});
