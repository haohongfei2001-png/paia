import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicRootSlots,readTopicRootSlots,saveTopicRootSlots,canRetainRootMetadata} from '../ui/topic-root-slots.js';
const ids=count=>Array.from({length:count},(_,i)=>`synthetic-topic-${i}`);
const addresses=list=>Object.fromEntries(list.map(({id,slot,column,row})=>[id,{slot,column,row}]));
test('TOPIC-05.2 all144 identities retain addresses through batches, label-independent updates and deletion',()=>{
 const slots=new TopicRootSlots(),all=ids(144),first=slots.reconcile(all.slice(0,40));slots.reconcile(all.slice(0,80));const full=slots.reconcile(all,{complete:true});assert.equal(full.length,144);
 assert.deepEqual(Object.fromEntries(first.map(x=>[x.id,addresses(full)[x.id]])),addresses(first));
 const reverse=slots.reconcile([...all].reverse(),{complete:true});assert.deepEqual(reverse,full,'refresh enumeration is not a sorting authority');
 const removed=slots.reconcile(all.filter(id=>id!==all[5]),{complete:true});for(const item of removed)assert.deepEqual(addresses(removed)[item.id],addresses(full)[item.id]);assert.ok(!removed.some(x=>x.slot===5));
 const added=slots.reconcile([...all.filter(id=>id!==all[5]),'synthetic-new'],{complete:true});assert.equal(added.find(x=>x.id==='synthetic-new').slot,5);for(const item of removed)assert.deepEqual(addresses(added)[item.id],addresses(full)[item.id]);
});
test('TOPIC-05.2 partial read and failure cannot release unseen slots; restore never displaces another Topic',()=>{
 const slots=new TopicRootSlots(),all=ids(50),before=slots.reconcile(all,{complete:true});slots.reconcile(all.slice(0,10));const partial=slots.reconcile([...all.slice(0,10),'synthetic-new']);assert.equal(partial.at(-1).slot,50);
 slots.reconcile(all.filter(id=>id!==all[2]),{complete:true});assert.equal(slots.reconcile(all,{complete:true}).find(x=>x.id===all[2]).slot,2);
 slots.reconcile(all.filter(id=>id!==all[2]),{complete:true});slots.reconcile([...all.filter(id=>id!==all[2]),'synthetic-reuse'],{complete:true});const restored=slots.reconcile([...all,'synthetic-reuse'],{complete:true});assert.equal(restored.find(x=>x.id==='synthetic-reuse').slot,2);assert.notEqual(restored.find(x=>x.id===all[2]).slot,2);for(const item of before.filter(x=>x.slot!==2))assert.deepEqual(addresses(restored)[item.id],addresses(before)[item.id]);
});
test('TOPIC-05.2 responsive addresses and Unicode identities restore from body-free history without changing navigation',()=>{
 const slots=new TopicRootSlots(),all=[...ids(30),'主题 👩🏽‍💻 é'],wide=slots.reconcile(all,{columns:4,complete:true});for(const columns of [3,2,1])assert.equal(slots.reconcile(all,{columns,complete:true}).length,all.length);assert.deepEqual(slots.reconcile(all,{columns:4,complete:true}),wide);
 const history={state:{paiaReader:{view:'thoughts',topicId:null}},replaceState(value){this.state=structuredClone(value);}};assert.equal(saveTopicRootSlots(slots,history),true);assert.deepEqual(history.state.paiaReader,{view:'thoughts',topicId:null});assert.deepEqual(readTopicRootSlots(history).reconcile(all,{columns:4,complete:true}),wide);assert.deepEqual(Object.keys(history.state.paiaTopicRootSlots).sort(),['removed','version','views']);
 assert.equal(saveTopicRootSlots(slots,{state:{},replaceState(){throw Error('quota');}}),false);assert.deepEqual(slots.reconcile(all,{columns:4,complete:true}),wide);
});
test('TOPIC-05.2 corrupt presentation snapshots are discarded and invalid current identity sets refuse',()=>{
 for(const saved of [{version:2},{version:1,views:[null],removed:[]},{version:1,views:[[4,['a','a']]],removed:[]},{version:1,views:[[4,[{body:'private'}]]],removed:[]}])assert.deepEqual(new TopicRootSlots(saved).reconcile(['safe'],{complete:true}),[{id:'safe',slot:0,column:1,row:1}]);
 const slots=new TopicRootSlots();assert.throws(()=>slots.reconcile(['a','a']));assert.throws(()=>slots.reconcile(['a'],{columns:0}));
});
test('TOPIC-05.2 missing, ambiguous, restore, purge and exclusion causes always clear transient Root metadata',()=>{
 for(const cause of [undefined,null,'','PURGE_SOURCE','PAIA_BACKUP_RESTORE','EDIT_DOCUMENT','REMOVE_LIBRARY_TOPIC','EXCLUDE_LIBRARY','UNKNOWN','EDIT_LIBRARY_TOPIC,PURGE_SOURCE',['EDIT_LIBRARY_TOPIC','PURGE_SOURCE'],{cause:'EDIT_LIBRARY_TOPIC'}])assert.equal(canRetainRootMetadata(cause),false);
 for(const cause of ['EDIT_LIBRARY_TOPIC','CREATE_LIBRARY_SECTION','EDIT_LIBRARY_FIELDS'])assert.equal(canRetainRootMetadata(cause),true);
});
