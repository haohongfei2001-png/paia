import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture,rows,append} from './harness/original-complete.mjs';
import {MemoryService} from '../core/memory/service.js';
import {PassportService} from '../core/passport.js';
import {ContextPackageService} from '../core/context-package-service.js';
import {AI_FIELDS} from '../core/organizer/ai-contract.js';
import {hashText} from '../core/dedupe.js';
const op=()=>crypto.randomUUID();
async function setup(texts=['CONTAINER_INPUT_CANARY']){
 const f=await completeFixture({texts}),memory=new MemoryService(f.s),service=new ContextPackageService(memory,new PassportService(f.s));await memory.ready();
 let state=await service.manual({action:'create'},'container-tab');
 return {...f,memory,service,get state(){return state;},async call(action,options={}){const next=await service.manual({action,selectionId:state.selectionId,generation:state.generation,...options},'container-tab');state=next;return next;}};
}
async function topic(f,name){return f.s.createTopic({name,operationId:op()});}
async function entry(f,text){return f.s.createEntry({operationId:op(),actor:'user',body:text,type:'idea',formation:'explicit',evidence:[]});}
async function place(f,group,id){
 const e=await f.s.entry(id),t=await f.s.topic(group.id),result=await f.s.placeEntry({operationId:op(),entryId:id,topicId:group.id,expectedEntryRevision:e.revision,expectedTopicRevision:t.organizationRevision});
 assert.equal(result.conflict,undefined);return result;
}
async function sourceGroups(f){return (await rows(f.s,'libraryDocuments')).map(r=>({kind:'conversation',id:r.id}));}
test('VS06 whole Conversation crosses member pages, fixes every version and releases exact full text',async()=>{
 const texts=Array.from({length:105},(_,i)=>'WHOLE_CONVERSATION_'+i+' 中英👩🏽‍💻\n'+'完整文字 '.repeat(30)),f=await setup(texts);
 const [ref]=await sourceGroups(f);await f.call('addContainers',{containers:[ref]});assert.equal(f.state.items.length,105);assert.equal(f.state.containers[0].memberCount,105);
 const bodies=new Set(f.state.items.map(i=>i.body));assert.deepEqual(bodies,new Set(texts));assert.equal(f.state.manifest.containers[0].members.length,105);
 await f.call('preview');const reviewed=f.state;assert.equal(reviewed.manifest.complete,true);assert.equal(reviewed.manifest.partial,false);
 for(const text of texts)assert.ok(reviewed.text.includes(text));
 assert.equal(reviewed.manifest.previewSha256,await hashText(reviewed.text));assert.equal((await f.call('share',{format:'markdown'})).text,reviewed.text);
 await append(f.s,'NEW_MEMBER_MUST_NOT_AUTO_JOIN','new-member');const stale=await f.call('read');
 assert.equal(stale.state,'stale');assert.equal(stale.containers[0].state,'stale');assert.equal(stale.items.length,105);assert.equal(stale.manifest.complete,false);assert.equal(stale.text,'');assert.equal(stale.manifest.previewSha256,null);
 await assert.rejects(f.call('share',{format:'copy'}),{code:'MEMORY_STALE'});assert.equal(f.requests.length,0);
});
test('VS06 multiple Topics retain all paged Thoughts, authored note and cached AI fields without duplicating shared members',async()=>{
 const f=await setup(),a=await topic(f,'TOPIC_A'),b=await topic(f,'TOPIC_B'),ids=[];
 for(let i=0;i<105;i++){const e=await entry(f,'TOPIC_A_MEMBER_'+i+'\n完整中文👩🏽‍💻');ids.push(e.id);await place(f,a,e.id);}
 await place(f,b,ids[0]);for(let i=0;i<35;i++){const e=await entry(f,'TOPIC_B_MEMBER_'+i);await place(f,b,e.id);}
 const current=await f.s.topic(a.id);await f.s.editTopic({id:a.id,expectedRevision:current.revision,changes:{summary:'AUTHORED_TOPIC_NOTE_CANARY'},operationId:op()});
 const fields=Object.fromEntries(AI_FIELDS.map(field=>[field,['blockSummary','currentView'].includes(field)?'':[]]));
 await f.s.foundationWrite(t=>t.put('meta',{id:'aiPresentation:'+a.id,topicId:a.id,revision:0,updatedAt:'2026-09-26T00:00:00Z',...fields,currentView:'CACHED_AI_FIELD_CANARY',evidenceEntryIds:[ids[0]]}));
 await f.call('addContainers',{containers:[{kind:'topic',id:a.id},{kind:'topic',id:b.id}]});
 assert.equal(f.state.items.length,142);assert.deepEqual(f.state.containers.map(g=>g.memberCount),[107,36]);
 assert.equal(f.state.items.filter(i=>i.ref.kind==='thought'&&i.ref.id===ids[0]).length,1);
 const note=f.state.items.find(i=>i.ref.kind==='topic_note');assert.equal(note.body,'AUTHORED_TOPIC_NOTE_CANARY');assert.equal(note.role,'human');assert.ok(f.state.items.some(i=>i.role==='ai'&&i.body==='CACHED_AI_FIELD_CANARY'));
 await f.call('preview');assert.equal(f.state.manifest.complete,true);assert.equal(f.state.manifest.containers.length,2);assert.ok(f.state.text.includes('AUTHORED_TOPIC_NOTE_CANARY'));assert.ok(f.state.text.includes('TOPIC_A_MEMBER_104'));
 const fixed=f.state.manifest.containers;const extra=await entry(f,'NEW_TOPIC_MEMBER');await place(f,b,extra.id);
 await f.call('read');assert.equal(f.state.state,'stale');assert.equal(f.state.items.length,142);assert.deepEqual(f.state.manifest.containers.map(g=>g.members),fixed.map(g=>g.members));await assert.rejects(f.call('share',{format:'copy'}),{code:'MEMORY_STALE'});assert.equal(f.requests.length,0);
});
test('VS06 whole-container over-200 refusal is atomic and never admits a prefix',async()=>{
 const f=await setup(Array.from({length:201},(_,i)=>'LIMIT_FULL_MEMBER_'+i)),e=await entry(f,'EXISTING_SELECTED_CANARY');
 await f.call('add',{refs:[{kind:'thought',id:e.id,revision:e.revision}]});await f.call('preview');const before=f.state;
 await assert.rejects(f.call('addContainers',{containers:await sourceGroups(f)}),{code:'MEMORY_LIMIT'});
 const retained=await f.call('read');assert.equal(retained.generation,before.generation);assert.deepEqual(retained.items,before.items);assert.deepEqual(retained.containers,[]);assert.equal(retained.text,before.text);assert.deepEqual(retained.manifest,before.manifest);assert.equal(f.requests.length,0);
});
test('VS06 explicit member removal is declared in group coverage and membership removal invalidates it',async()=>{
 const f=await setup(),a=await topic(f,'REMOVE_GROUP'),first=await entry(f,'EXCLUDE_ONE_CANARY'),second=await entry(f,'KEEP_ONE_CANARY');
 await place(f,a,first.id);await place(f,a,second.id);await f.call('addContainers',{containers:[{kind:'topic',id:a.id}]});
 const removed=f.state.items.find(i=>i.ref.id===first.id);await f.call('remove',{itemId:removed.itemId});await f.call('preview');
 assert.equal(f.state.containers[0].memberCount,2);assert.equal(f.state.containers[0].selectedMemberCount,1);assert.equal(f.state.manifest.containers[0].selectedMemberCount,1);assert.equal(f.state.manifest.exclusions.length,1);assert.equal(f.state.text.includes('EXCLUDE_ONE_CANARY'),false);assert.ok(f.state.text.includes('KEEP_ONE_CANARY'));
 await f.call('addContainers',{containers:[{kind:'topic',id:a.id}]});assert.equal(f.state.items.length,2);assert.equal(f.state.manifest.exclusions.length,0);assert.equal(f.state.containers[0].selectedMemberCount,2);await f.call('preview');
 const e=await f.s.entry(second.id),t=await f.s.topic(a.id),p=await f.s.libraryPlacement(a.id,second.id);
 await f.s.placeEntry({operationId:op(),entryId:second.id,topicId:a.id,expectedEntryRevision:e.revision,expectedTopicRevision:t.organizationRevision,expectedPlacementRevision:p.revision,remove:true});
 await f.call('read');assert.equal(f.state.state,'stale');assert.equal(f.state.text,'');await assert.rejects(f.call('share',{format:'markdown'}),{code:'MEMORY_STALE'});
});
test('VS06 one denied whole-group member blocks release and purges its transient bytes',async()=>{
 const f=await setup(['DENIED_GROUP_CANARY','OTHER_GROUP_CANARY']);await f.call('addContainers',{containers:await sourceGroups(f)});await f.call('preview');
 const denied=f.state.items[0];await f.memory.exclude({inputId:denied.ref.id,excluded:true});await f.call('read');
 assert.equal(f.state.state,'blocked');assert.equal(f.state.items.find(i=>i.itemId===denied.itemId).body,'');assert.equal(f.state.manifest.complete,false);assert.equal(f.state.text,'');await assert.rejects(f.call('share',{format:'copy'}),{code:'MEMORY_DENIED'});
 assert.equal((await rows(f.s,'meta')).some(r=>r.id.includes(f.state.selectionId)),false);assert.equal(f.requests.length,0);
});
test('VS06 group chooser paginates metadata only and rejects malformed or cross-kind cursors',async()=>{
 const f=await setup();for(let i=0;i<42;i++)await topic(f,'CHOOSER_'+i);
 const first=(await f.call('containers',{kind:'topic',limit:40})).containerPage;assert.equal(first.items.length,40);assert.ok(first.nextCursor);assert.ok(first.items.every(i=>Object.keys(i).sort().join(',')==='id,kind,title'));
 const second=(await f.call('containers',{kind:'topic',cursor:first.nextCursor,limit:40})).containerPage;assert.equal(second.items.length,2);assert.equal(second.nextCursor,null);assert.equal(new Set([...first.items,...second.items].map(i=>i.id)).size,42);
 for(const cursor of [0,false,'bad',[],{kind:'topic'}, {kind:'conversation',key:'bad'}, {kind:'topic',key:[1,1,'rank',0,'id']}])await assert.rejects(f.call('containers',{kind:'topic',cursor}),{code:'MEMORY_INVALID'});
 assert.equal(f.state.items.length,0);assert.equal(f.requests.length,0);
});
test('VS06 Topic note provenance and revision are checked without inventing historical authorship',async()=>{
 const f=await setup(),a=await topic(f,'NOTE_GROUP'),row=await f.s.topic(a.id);await f.s.editTopic({id:a.id,expectedRevision:row.revision,changes:{summary:'NOTE_FIXED_CANARY'},operationId:op()});
 await f.call('addContainers',{containers:[{kind:'topic',id:a.id}]});assert.equal(f.state.items.length,1);await f.call('preview');
 const current=await f.s.topic(a.id);await f.s.editTopic({id:a.id,expectedRevision:current.revision,changes:{summary:'NOTE_CHANGED_CANARY'},operationId:op()});await f.call('read');assert.equal(f.state.state,'stale');assert.equal(f.state.items[0].body,'NOTE_FIXED_CANARY');await assert.rejects(f.call('share',{format:'copy'}),{code:'MEMORY_STALE'});
 await f.call('clear');await f.s.foundationWrite(async t=>{const topic=await t.get('topics',a.id);delete topic.authorship.summary;await t.put('topics',topic);});
 await f.call('addContainers',{containers:[{kind:'topic',id:a.id}]});assert.equal(f.state.state,'blocked');assert.equal(f.state.items[0].body,'');assert.equal(f.state.manifest.complete,false);assert.equal(f.requests.length,0);
});
