import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicController} from '../ui/topic-workspace.js';
import {ContinuousRootReader} from '../ui/continuous-root-reader.js';
import {PresentationNode} from './harness/presentation-dom.mjs';

function fixture(t){
 const old=globalThis.document,nodes=new Map(['thought-search','thought-collection','thought-list','thought-empty'].map(id=>[id,new PresentationNode()]));nodes.get('thought-search').value='';
 globalThis.document={documentElement:{lang:'en'},getElementById:id=>nodes.get(id),createElement:()=>new PresentationNode()};t.after(()=>globalThis.document=old);
 const statuses=[],reader=new ContinuousRootReader({scope:'root',windowSize:Number.MAX_SAFE_INTEGER,load:async()=>({items:[{id:'one',revision:1,readRef:{id:'one',revision:1}}],authority:'A',complete:true,coverage:{complete:true}})});
 const owner=Object.assign(Object.create(TopicController.prototype),{id:null,serial:1,statusEpoch:1,openIntent:1,homeDesiredCount:1,homeCollection:reader,readRetry:{hidden:true},readKey:()=> 'root',thoughtRootVisible:()=>true,captureHomeAnchor:()=>null,rememberHomeAnchor(){},updateHomeContinuous(){},paintHome(){return true;},onStatus:(...args)=>statuses.push(args),readRefresh:async()=>{throw Error('SYNTHETIC_READ_FAILURE');}});
 return {owner,reader,statuses};
}
test('successful actual Root continuation retires earlier refresh error and retry feedback',async t=>{
 const {owner,reader,statuses}=fixture(t);await owner.refreshOnce();assert.equal(owner.readFailed,true);assert.equal(owner.readRetry.hidden,false);assert.equal(statuses.at(-1)[1],'read_error');
 await owner.loadHomeNext();assert.equal(reader.items.length,1);assert.equal(owner.homePage.page.items.length,1);
 assert.equal(owner.readFailed,false);assert.equal(owner.readRetry.hidden,true);assert.deepEqual(statuses.at(-1),['']);
});
for(const result of ['held-new-route','indexing','failed-hydration'])test('Root '+result+' cannot clear the current failure',async t=>{
 const {owner,reader,statuses}=fixture(t);await owner.refreshOnce();await reader.loadNext();
 if(result==='indexing')owner.paintHome=()=>false;
 if(result==='failed-hydration')reader.hydrateWindow=async()=>false;
 let finish;if(result==='held-new-route')reader.hydrateWindow=()=>new Promise(resolve=>finish=resolve);
 const pending=owner.renderHomeReader();if(finish){owner.serial++;finish(true);}assert.equal(await pending,false);
 assert.equal(owner.readFailed,true);assert.equal(owner.readRetry.hidden,false);assert.equal(statuses.at(-1)[1],'read_error');
});
