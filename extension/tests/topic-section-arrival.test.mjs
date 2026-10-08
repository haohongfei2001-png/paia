import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicController} from '../ui/topic-workspace.js';
function fixture(){
 const calls=[],heading={focus:()=>calls.push('focus')},section={dataset:{sectionId:'deep'},scrollIntoView:()=>calls.push('scroll'),querySelector:()=>heading};
 const owner=Object.assign(Object.create(TopicController.prototype),{id:'topic',view:'original',serial:4,openIntent:2,rootCueEpoch:1,originalPane:{querySelectorAll:()=>[section]},flushEditors:async()=>{calls.push('flush');return true;},checkAllTracked:async serial=>{calls.push(['tracked',serial]);return true;},resetTopicReader:async options=>{calls.push(['reset',options]);return {};}});
 return {owner,calls,section};
}
test('existing named heading never substitutes for qualified Section arrival, including empty Sections',async()=>{
 const {owner,calls}=fixture();assert.equal(await owner.focusSection('deep'),true);
 assert.deepEqual(calls,['flush',['tracked',4],['reset',{sectionId:'deep',expectedSerial:4}],'scroll','focus']);
});
test('IME and refused flush retain the current editor without resetting or moving focus',async()=>{
 for(const composing of [true,false]){const {owner,calls}=fixture();if(composing)owner.editor={entry:{surface:{composing:true}}};else owner.flushEditors=async()=>false;
 assert.equal(await owner.focusSection('deep'),false);assert.deepEqual(calls,[]);}
});
test('every asynchronous boundary retains route intent and tracked-entry safety',async()=>{
 for(const stage of ['flushEditors','checkAllTracked','resetTopicReader'])for(const invalidate of [o=>o.serial++,o=>o.openIntent++,o=>o.rootCueEpoch++,o=>o.id='other',o=>o.view='ai']){
  const {owner,calls}=fixture();owner[stage]=async()=>{invalidate(owner);return stage==='resetTopicReader'?{}:true;};
  assert.equal(await owner.focusSection('deep'),false);assert.equal(calls.includes('focus'),false);
 }
 const {owner,calls}=fixture();owner.checkAllTracked=async()=>false;assert.equal(await owner.focusSection('deep'),false);assert.deepEqual(calls,['flush']);
});
test('caller invalidation, refused reads and missing target never focus an unrelated fallback',async()=>{
 for(const state of [{stale:true},{unavailable:true},{anchorUnavailable:true}]){const {owner,calls}=fixture();owner.resetTopicReader=async()=>state;assert.equal(await owner.focusSection('deep'),false);assert.equal(calls.includes('focus'),false);}
 const {owner,calls}=fixture();assert.equal(await owner.focusSection('missing'),false);assert.equal(calls.includes('focus'),false);
 assert.equal(await owner.focusSection('deep',{isCurrent:()=>false}),false);
});
