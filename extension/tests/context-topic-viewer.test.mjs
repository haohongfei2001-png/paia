import test from 'node:test';
import assert from 'node:assert/strict';
import {PresentationNode} from './harness/presentation-dom.mjs';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {ThoughtLibraryReadModel} from '../core/thought-library-read-model.js';
import {ThoughtSectionReading} from '../core/thought-section-reading.js';
import {ContextTopicInputs} from '../ui/context-topics.js';
import {ContextTopicViewer} from '../ui/context-topic-viewer.js';
const op=()=>crypto.randomUUID();
class Node extends PresentationNode{
 querySelectorAll(selector){const descendants=this.children.flatMap(child=>[child,...(child.querySelectorAll?.('*')||[])]);return selector==='*'?descendants:descendants.filter(node=>selector.startsWith('.')?node.classList.contains(selector.slice(1)):selector==='[data-entry-id]'?!!node.dataset.entryId:node.tagName.toLowerCase()===selector);}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
 closest(selector){return selector==='[data-topic-id]'&&this.dataset.topicId?this:this.parentElement?.closest?.(selector)||null;}
 scrollIntoView(){}
 showModal(){this.open=true;}close(){this.open=false;}
}
async function fixture(run,{count=1,body='精确原文\n\n  code <script>\n🙂'}={}){
 const old=new Map(['document','chrome'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 const storage=await setup(OrganizerStore),s=storage.s;await s.finishFoundation();await s.setFilterMode('off');
 const topic=await s.createTopic({name:'Synthetic private topic',operationId:op()});
 const entries=[];
 for(let i=0;i<count;i++){const entry=await s.createEntry({operationId:op(),actor:'user',body:body+` ${i}`,note:'',type:'idea',formation:'explicit',evidence:[]});await s.placeEntry({entryId:entry.id,topicId:topic.id,operationId:op(),expectedEntryRevision:entry.revision,expectedTopicRevision:(await s.repository.transaction(false,t=>t.get('topics',topic.id))).organizationRevision});entries.push(entry);}
 const root=new Node('body'),events=new Map(),messages=new Set();globalThis.document={body:root,documentElement:{lang:'en'},hidden:false,activeElement:null,createElement:tag=>new Node(tag),addEventListener:(key,fn)=>events.set(key,fn),removeEventListener:(key,fn)=>{if(events.get(key)===fn)events.delete(key);}};
 globalThis.chrome={runtime:{onMessage:{addListener:fn=>messages.add(fn),removeListener:fn=>messages.delete(fn)}}};
 const reader=new ThoughtSectionReading(new ThoughtLibraryReadModel(s)),calls=[];let sender=(type,{options})=>{calls.push({type,options});assert.equal(type,'GET_LIBRARY_SECTION_READING');assert.equal(options.query,'');return reader.page(options);};
 const viewer=new ContextTopicViewer({host:root,topicId:topic.id,name:'Synthetic private topic',send:(...args)=>sender(...args)});
 try{await run({s,topic,entries,viewer,calls,events,messages,dispatch:async(...args)=>{const[type,{options,id}]=args;return type==='GET_LIBRARY_ENTRY'?{...await s.readingEntry(id),recoveryEpoch:'initial'}:reader.page(options);},setSender:fn=>{sender=fn;}});}finally{viewer.close();await s.repository.close();for(const[key,value]of old)if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}
}
test('explicit private Topic reading uses original read owner, exact prose and zero writes',()=>fixture(async({s,viewer,calls})=>{
 const original=s.repository.transaction.bind(s.repository),writes=[];s.repository.transaction=(write,...args)=>{if(write)writes.push(true);return original(write,...args);};
 assert.equal(viewer.body.textContent,'');assert.equal(await viewer.read(),true);assert.match(viewer.body.textContent,/精确原文\n\n  code <script>\n🙂 0/);assert.equal(viewer.body.querySelectorAll('script').length,0);assert.equal(viewer.status.textContent,'End of Topic.');assert.deepEqual(writes,[]);assert.equal(calls.length,1);assert.ok(calls.every(c=>c.options.view==='original'));
}));
test('bounded continuous reader reaches true end, evicts prior bodies and reads back',()=>fixture(async({viewer})=>{
 assert.equal(await viewer.read(),true);assert.equal(viewer.reader.items.length,40);assert.equal(viewer.next.disabled,false);
 assert.equal(await viewer.read('next'),true);assert.equal(viewer.reader.state().retainedBodies,40);assert.equal(await viewer.read('next'),true);assert.equal(viewer.reader.state().retainedBodies,40);assert.equal(viewer.status.textContent,'End of Topic.');assert.equal(viewer.next.disabled,true);assert.equal(viewer.previous.disabled,false);
 assert.equal(await viewer.read('previous'),true);assert.equal(viewer.status.textContent,'More content follows.');assert.equal(viewer.next.disabled,false);assert.match(viewer.body.textContent,/ 1\b/);assert.ok(viewer.reader.state().retainedBodies<=40);
},{count:81}));
test('in-flight close discards delayed bodies and removes listeners',()=>fixture(async({viewer,dispatch,setSender,messages,events})=>{
 let finish;setSender(async(...args)=>{const result=await dispatch(...args);await new Promise(resolve=>{finish=resolve;});return result;});const task=viewer.read();while(!finish)await new Promise(r=>setImmediate(r));viewer.close();finish();assert.equal(await task,false);assert.equal(viewer.body.textContent,'');assert.equal(messages.size,0);assert.equal(events.size,0);
}));
test('owner failure clears body and supports explicit retry without fake completion',()=>fixture(async({viewer,setSender,dispatch})=>{
 assert.equal(await viewer.read(),true);setSender(()=>{throw Error('offline');});assert.equal(await viewer.restart(),false);assert.equal(viewer.body.textContent,'');assert.equal(viewer.invalidated,true);assert.equal(viewer.retry.hidden,false);assert.doesNotMatch(viewer.status.textContent,/End of Topic/);setSender(dispatch);assert.equal(await viewer.restart(),true);
}));
test('archive invalidation and backgrounding synchronously remove sensitive body',()=>fixture(async({viewer,messages,events})=>{
 assert.equal(await viewer.read(),true);for(const fn of messages)fn({type:'ARCHIVE_CHANGED'});assert.equal(viewer.body.textContent,'');assert.equal(viewer.next.disabled,true);assert.equal(await viewer.read('next'),false);assert.equal(await viewer.restart(),true);document.hidden=true;events.get('visibilitychange')();assert.equal(viewer.body.textContent,'');
}));
test('changed generation refuses old cursor and clears previously rendered text',()=>fixture(async({viewer,setSender})=>{
 assert.equal(await viewer.read(),true);setSender(async()=>({cursorInvalid:true}));assert.equal(await viewer.read('next'),false);assert.equal(viewer.body.textContent,'');assert.equal(viewer.invalidated,true);
},{count:41}));
test('oversized entry remains honest placeholder, never complete-text claim',()=>fixture(async({viewer})=>{
 assert.equal(await viewer.read(),true);assert.match(viewer.body.textContent,/full text has not been loaded/);assert.match(viewer.status.textContent,/not been fully loaded/);
},{body:'界'.repeat(50000)}));

test('Topic content entry is independent of disabled access selection and restores focus',()=>fixture(async({viewer,topic,dispatch,calls})=>{
 viewer.close();const host=document.body,inputs=new ContextTopicInputs({host,access:{global:{enabled:false},inputs:{enabled:false}},send:dispatch});
 inputs.receive([{topicId:topic.id,name:'Synthetic private topic',enabled:false,revision:0,canEnable:false,canDisable:false,policyAllowed:false,externalAllowed:false}]);
 const target=inputs.openNodes.get(topic.id);assert.equal(inputs.nodes.get(topic.id).disabled,true);assert.equal(target.disabled,false);assert.equal(inputs.root.textContent.includes('精确原文'),false);
 assert.equal(await inputs.openTopic(topic.id),true);assert.match(inputs.viewer.body.textContent,/精确原文/);assert.equal(inputs.rows.get(topic.id).enabled,false);inputs.viewer.close();assert.equal(document.activeElement,target);assert.equal(inputs.viewer,null);inputs.close();
}));
test('oversized or malformed owner response is refused without rendering',()=>fixture(async({viewer,setSender,dispatch})=>{
 setSender(async(...args)=>{const page=await dispatch(...args);return {...page,items:[...page.items,...Array(40).fill(page.items[0])]};});assert.equal(await viewer.read(),false);assert.equal(viewer.body.textContent,'');assert.equal(viewer.invalidated,true);
}));

test('large item explicitly expands through original owner with post-read qualification and zero writes',()=>fixture(async({s,viewer,setSender,dispatch,calls})=>{
 setSender(async(type,payload)=>{calls.push({type,...payload});return dispatch(type,payload);});
 const original=s.repository.transaction.bind(s.repository),writes=[];s.repository.transaction=(write,...args)=>{if(write)writes.push(true);return original(write,...args);};
 assert.equal(await viewer.read(),true);const item=viewer.reader.items[0];assert.equal(item.entry.large,true);assert.equal(await viewer.expand(item),true);assert.equal(viewer.body.querySelector('.entry-prose').textContent,'界'.repeat(50000)+' 0');assert.equal(viewer.body.querySelector('button'),null);assert.equal(viewer.status.textContent,'End of Topic.');assert.deepEqual(writes,[]);assert.deepEqual(calls.map(c=>c.type),['GET_LIBRARY_SECTION_READING','GET_LIBRARY_ENTRY','GET_LIBRARY_SECTION_READING']);
},{body:'界'.repeat(50000)}));
test('large body awaiting read cannot leak after invalidation and a new read',()=>fixture(async({viewer,setSender,dispatch})=>{
 let release;setSender(async(type,payload)=>{const result=await dispatch(type,payload);if(type==='GET_LIBRARY_ENTRY')await new Promise(resolve=>{release=resolve;});return result;});assert.equal(await viewer.read(),true);const task=viewer.expand(viewer.reader.items[0]);while(!release)await new Promise(r=>setImmediate(r));viewer.invalidate();assert.equal(await viewer.restart(),true);release();assert.equal(await task,false);assert.match(viewer.body.textContent,/full text has not been loaded/);
},{body:'界'.repeat(50000)}));
test('bounded reference eviction retains both directions across more than 400 entries',()=>fixture(async({viewer})=>{
 assert.equal(await viewer.read(),true);let reads=0;while(!viewer.next.disabled){assert.equal(await viewer.read('next'),true);assert.ok(viewer.reader.items.length<=440);assert.ok(viewer.reader.state().retainedBodies<=40);assert.ok(++reads<20);}
 assert.equal(viewer.status.textContent,'End of Topic.');assert.match(viewer.body.textContent,/ 440\b/);reads=0;while(!viewer.previous.disabled){assert.equal(await viewer.read('previous'),true);assert.ok(viewer.reader.state().retainedBodies<=40);assert.ok(++reads<20);}
 assert.match(viewer.body.textContent,/ 0\b/);
},{count:441}));
test('empty Topic reaches actual end without inventing bodies',()=>fixture(async({viewer})=>{assert.equal(await viewer.read(),true);assert.equal(viewer.body.textContent,'');assert.equal(viewer.status.textContent,'End of Topic.');assert.equal(viewer.next.disabled,true);},{count:0}));

test('Topic content and access use bounded independent roving keyboard stops',()=>fixture(async({viewer,topic,dispatch})=>{
 viewer.close();const inputs=new ContextTopicInputs({host:document.body,access:{global:{enabled:false},inputs:{enabled:false}},send:dispatch});
 inputs.receive([topic.id,'another'].map((topicId,index)=>({topicId,name:'Private '+index,enabled:false,revision:0,canEnable:false,canDisable:false,policyAllowed:false,externalAllowed:false})));
 assert.equal([...inputs.openNodes.values()].filter(node=>node.tabIndex===0).length,1);assert.equal([...inputs.nodes.values()].filter(node=>node.tabIndex===0).length,0);let prevented=false;
 inputs.move({target:inputs.openNodes.get(topic.id),key:'ArrowRight',preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.equal(document.activeElement,inputs.openNodes.get('another'));assert.equal(inputs.openNodes.get('another').tabIndex,0);assert.equal(inputs.openNodes.get(topic.id).tabIndex,-1);assert.ok([...inputs.rows.values()].every(row=>!row.enabled));inputs.close();
}));
test('explicit search Entry opens its exact current Section placement rather than Topic beginning',()=>fixture(async({s,viewer,topic,entries,calls})=>{
 const sectionId=(await s.repository.transaction(false,t=>t.get('topics',topic.id))).defaultSectionId;viewer.start={topicId:topic.id,sectionId,anchorId:entries[80].id};assert.equal(await viewer.restart(),true);assert.equal(calls[0].options.anchorId,entries[80].id);assert.equal(calls[0].options.sectionId,sectionId);assert.ok(viewer.reader.layout().some(x=>x.kind==='item'&&x.item.entry.id===entries[80].id));assert.equal(viewer.reader.layout().some(x=>x.kind==='item'&&x.item.entry.id===entries[0].id),false);
},{count:81}));
