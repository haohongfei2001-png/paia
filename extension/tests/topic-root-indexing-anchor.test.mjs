import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicController} from '../ui/topic-workspace.js';
function fixture(){
 const previous=globalThis.document,nodes=new Map();
 for(const id of ['thought-search','library-search-status','thought-collection','thought-empty','thought-empty-settings'])nodes.set(id,{value:'',dataset:{},setAttribute(){}});
 globalThis.document={documentElement:{lang:'en'},getElementById:id=>nodes.get(id)};
 let page={indexing:true,items:[],complete:false};const restored=[],painted=[];
 const collection={windowRevision:1,hydrateWindow:async()=>true,state:()=>({})};
 const owner=Object.assign(Object.create(TopicController.prototype),{id:null,serial:1,openIntent:1,homeCollection:collection,homePageState:()=>page,readKey:()=>'',updateHomeContinuous(){},personalRoot:{render:items=>painted.push(items),clear(){}},restoreHomeAnchor:a=>restored.push(a),rememberHomeAnchor(){}});
 return {owner,collection,restored,painted,ready(){page={items:[{id:'qualified'}],complete:true};},dispose(){globalThis.document=previous;}};
}
test('Root Back anchor survives ordering preparation and restores once after an actual qualified paint',async()=>{
 const f=fixture();try{const anchor={key:'item:qualified',top:84};assert.equal(await f.owner.renderHomeReader(anchor),false);assert.equal(f.restored.length,0);assert.equal(f.painted.length,0);await f.owner.renderHomeReader();f.ready();assert.equal(await f.owner.renderHomeReader(),true);assert.deepEqual(f.restored,[anchor]);await f.owner.renderHomeReader();assert.equal(f.restored.length,1);}finally{f.dispose();}
});
for(const change of ['leave','collection','navigation','user scroll'])test('Root pending indexing anchor is retired by '+change,async()=>{
 const f=fixture();try{await f.owner.renderHomeReader({key:'item:qualified',top:84});if(change==='leave')f.owner.clearHomeRows();if(change==='collection')f.owner.homeCollection={...f.collection};if(change==='navigation')f.owner.openIntent++;if(change==='user scroll')f.owner.topicRestoreInputEpoch=1;f.ready();await f.owner.renderHomeReader();assert.equal(f.restored.length,0);}finally{f.dispose();}
});
for(const change of ['collection','navigation','user scroll'])test('Root does not reauthorize an old explicit anchor during held hydration: '+change,async()=>{
 const f=fixture();try{let finish;f.collection.hydrateWindow=()=>new Promise(resolve=>finish=resolve);const old={key:'item:qualified',top:84};f.owner.homeWindowReveal={collection:f.collection,revision:1,anchor:old};const read=f.owner.renderHomeReader(old);if(change==='collection')f.owner.homeCollection={...f.collection,hydrateWindow:async()=>true};if(change==='navigation')f.owner.openIntent++;if(change==='user scroll')f.owner.topicRestoreInputEpoch=1;finish(true);await read;f.collection.hydrateWindow=async()=>true;f.owner.homeWindowReveal=null;f.ready();await f.owner.renderHomeReader();assert.equal(f.restored.length,0);}finally{f.dispose();}
});
test('Root stale hydration cannot hand a pre-scroll anchor to a fresh read',async()=>{
 const f=fixture();try{let finish;f.collection.hydrateWindow=()=>new Promise(resolve=>finish=resolve);f.owner.refresh=()=>{};const read=f.owner.renderHomeReader({key:'item:qualified',top:84});f.owner.topicRestoreInputEpoch=1;f.collection.stale=true;finish(true);await read;assert.equal(f.owner.rootInvalidationAnchor,null);}finally{f.dispose();}
});
