import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicController} from '../ui/topic-workspace.js';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function fixture(){
 const held=deferred(),entered=deferred(),restored=[],painted=[];let live={id:'synthetic-entry',top:300};
 const reader={bodyRevision:1,windowRevision:1,items:[{unloaded:false}],previous:async()=>{reader.bodyRevision++;},hydrateWindow:async()=>{entered.resolve();await held.promise;return true;},measure(){},restoreAnchor(_root,anchor){restored.push(anchor);}};
 const page={topic:{id:'synthetic-topic'},items:[]};
 const owner=Object.assign(Object.create(TopicController.prototype),{serial:1,openIntent:1,rootCueEpoch:0,view:'original',topicReader:reader,originalPane:{dataset:{}},topicRestoring:()=>false,topicContinuousVisible:()=>true,topicAnchor:()=>live&&({...live}),checkAllTracked:async()=>true,updateTopicContinuous(){},observeTopicWindowSpacers(){},topicPageFromReader:()=>page,renderDocument(value){painted.push(value);}});
 return {owner,reader,entered,held,restored,painted,setLive:value=>live=value};
}
for(const [name,top]of [['deliberate scroll',140],['viewport resize',420],['unchanged viewport',300]])test('normal previous-page hydration preserves '+name+' at the actual paint boundary',async()=>{
 const f=fixture(),pending=f.owner.loadTopicContinuous('previous',{explicit:false});await f.entered.promise;f.setLive({id:'synthetic-entry',top});f.held.resolve();await pending;
 assert.equal(f.painted.length,1);assert.deepEqual(f.restored,[{id:'synthetic-entry',top}]);
});
test('normal continuation does not revive a removed live anchor through its earlier captured ID',async()=>{
 const f=fixture(),pending=f.owner.loadTopicContinuous('previous',{explicit:false});await f.entered.promise;f.setLive(null);f.held.resolve();await pending;
 assert.equal(f.painted.length,1);assert.deepEqual(f.restored,[]);
});
test('route replacement while continuation hydrates cannot paint or restore any old anchor',async()=>{
 const f=fixture(),pending=f.owner.loadTopicContinuous('previous',{explicit:false});await f.entered.promise;f.owner.openIntent++;f.setLive({id:'new-route-entry',top:140});f.held.resolve();await pending;
 assert.deepEqual(f.painted,[]);assert.deepEqual(f.restored,[]);
});
test('explicit snapshot anchor remains exact even if the current viewport has changed',async()=>{
 const f=fixture(),target={id:'synthetic-entry',top:125},pending=f.owner.renderTopicReader(target);await f.entered.promise;f.setLive({id:'synthetic-entry',top:420});f.held.resolve();await pending;
 assert.deepEqual(f.restored,[target]);
});
