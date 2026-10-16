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
 const model=new ThoughtLibraryReadModel(s),reader=new ThoughtSectionReading(model),calls=[];let sender=(type,{options})=>{calls.push({type,options});if(type==='GET_LIBRARY_SECTION_PROJECTION')return model.sectionPage(options);assert.equal(type,'GET_LIBRARY_SECTION_READING');assert.equal(options.query,'');return reader.page(options);};
 const viewer=new ContextTopicViewer({host:root,topicId:topic.id,name:'Synthetic private topic',send:(...args)=>sender(...args)});
 try{await run({s,topic,entries,viewer,calls,events,messages,dispatch:async(...args)=>{const[type,{options,id}]=args;return type==='GET_LIBRARY_ENTRY'?{...await s.readingEntry(id),recoveryEpoch:'initial'}:type==='GET_LIBRARY_SECTION_PROJECTION'?model.sectionPage(options):reader.page(options);},setSender:fn=>{sender=fn;}});}finally{viewer.close();await s.repository.close();for(const[key,value]of old)if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}
}
test('explicit private Topic reading uses original read owner, exact prose and zero writes',()=>fixture(async({s,viewer,calls})=>{
 const original=s.repository.transaction.bind(s.repository),writes=[];s.repository.transaction=(write,...args)=>{if(write)writes.push(true);return original(write,...args);};
 assert.equal(viewer.body.textContent,'');assert.equal(await viewer.read(),true);assert.match(viewer.body.textContent,/精确原文\n\n  code <script>\n🙂 0/);assert.equal(viewer.body.querySelectorAll('script').length,0);assert.equal(viewer.status.textContent,'End of Section.');assert.deepEqual(writes,[]);assert.equal(calls.length,2);assert.ok(calls.filter(c=>c.type==='GET_LIBRARY_SECTION_READING').every(c=>c.options.view==='original'&&c.options.scopeSectionId));
}));
test('bounded continuous reader reaches true end, evicts prior bodies and reads back',()=>fixture(async({viewer})=>{
 assert.equal(await viewer.read(),true);assert.equal(viewer.reader.items.length,40);assert.equal(viewer.next.disabled,false);
 assert.equal(await viewer.read('next'),true);assert.equal(viewer.reader.state().retainedBodies,40);assert.equal(await viewer.read('next'),true);assert.equal(viewer.reader.state().retainedBodies,40);assert.equal(viewer.status.textContent,'End of Section.');assert.equal(viewer.next.disabled,true);assert.equal(viewer.previous.disabled,false);
 assert.equal(await viewer.read('previous'),true);assert.equal(viewer.status.textContent,'More content follows.');assert.equal(viewer.next.disabled,false);assert.match(viewer.body.querySelectorAll('.entry-prose').map(node=>node.textContent).join('\n'),/ 1\b/);assert.ok(viewer.reader.state().retainedBodies<=40);
},{count:81}));
test('in-flight close discards delayed bodies and removes listeners',()=>fixture(async({viewer,dispatch,setSender,messages,events})=>{
 let finish;setSender(async(...args)=>{const result=await dispatch(...args);await new Promise(resolve=>{finish=resolve;});return result;});const task=viewer.read();while(!finish)await new Promise(r=>setImmediate(r));viewer.close();finish();assert.equal(await task,false);assert.equal(viewer.body.textContent,'');assert.equal(messages.size,0);assert.equal(events.size,0);
}));
test('owner failure clears body and supports explicit retry without fake completion',()=>fixture(async({viewer,setSender,dispatch})=>{
 assert.equal(await viewer.read(),true);setSender(()=>{throw Error('offline');});assert.equal(await viewer.restart(),false);assert.equal(viewer.body.textContent,'');assert.equal(viewer.invalidated,true);assert.equal(viewer.retry.hidden,false);assert.doesNotMatch(viewer.status.textContent,/End of Section/);setSender(dispatch);assert.equal(await viewer.restart(),true);
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
 setSender(async(...args)=>{const page=await dispatch(...args);return args[0]==='GET_LIBRARY_SECTION_PROJECTION'?page:{...page,items:[...page.items,...Array(40).fill(page.items[0])]};});assert.equal(await viewer.read(),false);assert.equal(viewer.body.textContent,'');assert.equal(viewer.invalidated,true);
}));

test('large item explicitly expands through original owner with post-read qualification and zero writes',()=>fixture(async({s,viewer,setSender,dispatch,calls})=>{
 setSender(async(type,payload)=>{calls.push({type,...payload});return dispatch(type,payload);});
 const original=s.repository.transaction.bind(s.repository),writes=[];s.repository.transaction=(write,...args)=>{if(write)writes.push(true);return original(write,...args);};
 assert.equal(await viewer.read(),true);const item=viewer.reader.items[0];assert.equal(item.entry.large,true);assert.equal(await viewer.expand(item),true);assert.equal(viewer.body.querySelector('.entry-prose').textContent,'界'.repeat(50000)+' 0');assert.equal(viewer.body.querySelector('.context-topic-expand'),null);assert.ok(viewer.body.querySelector('.context-topic-copy'));assert.equal(viewer.status.textContent,'End of Section.');assert.deepEqual(writes,[]);assert.deepEqual(calls.map(c=>c.type),['GET_LIBRARY_SECTION_PROJECTION','GET_LIBRARY_SECTION_READING','GET_LIBRARY_ENTRY','GET_LIBRARY_SECTION_READING']);
},{body:'界'.repeat(50000)}));
test('large body awaiting read cannot leak after invalidation and a new read',()=>fixture(async({viewer,setSender,dispatch})=>{
 let release;setSender(async(type,payload)=>{const result=await dispatch(type,payload);if(type==='GET_LIBRARY_ENTRY')await new Promise(resolve=>{release=resolve;});return result;});assert.equal(await viewer.read(),true);const task=viewer.expand(viewer.reader.items[0]);while(!release)await new Promise(r=>setImmediate(r));viewer.invalidate();assert.equal(await viewer.restart(),true);release();assert.equal(await task,false);assert.match(viewer.body.textContent,/full text has not been loaded/);
},{body:'界'.repeat(50000)}));
test('bounded reference eviction retains both directions across more than 400 entries',()=>fixture(async({viewer})=>{
 assert.equal(await viewer.read(),true);let reads=0;while(!viewer.next.disabled){assert.equal(await viewer.read('next'),true);assert.ok(viewer.reader.items.length<=440);assert.ok(viewer.reader.state().retainedBodies<=40);assert.ok(++reads<20);}
 assert.equal(viewer.status.textContent,'End of Section.');assert.match(viewer.body.querySelectorAll('.entry-prose').map(node=>node.textContent).join('\n'),/ 440\b/);reads=0;while(!viewer.previous.disabled){assert.equal(await viewer.read('previous'),true);assert.ok(viewer.reader.state().retainedBodies<=40);assert.ok(++reads<20);}
 assert.match(viewer.body.querySelectorAll('.entry-prose').map(node=>node.textContent).join('\n'),/ 0\b/);
},{count:441}));
test('empty Topic reaches actual end without inventing bodies',()=>fixture(async({viewer})=>{assert.equal(await viewer.read(),true);assert.equal(viewer.body.textContent,'');assert.equal(viewer.status.textContent,'End of Section.');assert.equal(viewer.next.disabled,true);},{count:0}));

test('Topic content and access use bounded independent roving keyboard stops',()=>fixture(async({viewer,topic,dispatch})=>{
 viewer.close();const inputs=new ContextTopicInputs({host:document.body,access:{global:{enabled:false},inputs:{enabled:false}},send:dispatch});
 inputs.receive([topic.id,'another'].map((topicId,index)=>({topicId,name:'Private '+index,enabled:false,revision:0,canEnable:false,canDisable:false,policyAllowed:false,externalAllowed:false})));
 assert.equal([...inputs.openNodes.values()].filter(node=>node.tabIndex===0).length,1);assert.equal([...inputs.nodes.values()].filter(node=>node.tabIndex===0).length,0);let prevented=false;
 inputs.move({target:inputs.openNodes.get(topic.id),key:'ArrowRight',preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.equal(document.activeElement,inputs.openNodes.get('another'));assert.equal(inputs.openNodes.get('another').tabIndex,0);assert.equal(inputs.openNodes.get(topic.id).tabIndex,-1);assert.ok([...inputs.rows.values()].every(row=>!row.enabled));inputs.close();
}));
test('explicit search Entry opens its exact current Section placement rather than Topic beginning',()=>fixture(async({s,viewer,topic,entries,calls})=>{
 const sectionId=(await s.repository.transaction(false,t=>t.get('topics',topic.id))).defaultSectionId;viewer.start={topicId:topic.id,sectionId,anchorId:entries[80].id};assert.equal(await viewer.restart(),true);assert.equal(calls.find(call=>call.type==='GET_LIBRARY_SECTION_READING').options.anchorId,entries[80].id);assert.equal(calls.find(call=>call.type==='GET_LIBRARY_SECTION_READING').options.sectionId,sectionId);assert.ok(viewer.reader.layout().some(x=>x.kind==='item'&&x.item.entry.id===entries[80].id));assert.equal(viewer.reader.layout().some(x=>x.kind==='item'&&x.item.entry.id===entries[0].id),false);
},{count:81}));

async function clipboard(run,{reject=false}={}){
 const previous=Object.getOwnPropertyDescriptor(globalThis,'navigator'),copied=[];
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{writeText:async text=>{if(reject)throw Error('NotAllowedError');copied.push(text);}}}});
 try{await run(copied);}finally{if(previous)Object.defineProperty(globalThis,'navigator',previous);else delete globalThis.navigator;}
}
for(const body of ['精确原文\n\n  code <script>\n🙂','界'.repeat(50000)])test('explicit copy requalifies complete original text '+body.length,()=>fixture(async({s,viewer,dispatch,setSender})=>clipboard(async copied=>{
 setSender(dispatch);assert.equal(await viewer.read(),true);const original=s.repository.transaction.bind(s.repository),writes=[];s.repository.transaction=(write,...args)=>{if(write)writes.push(true);return original(write,...args);};
 const item=viewer.reader.items[0];assert.ok(viewer.body.querySelector('.context-topic-copy'));assert.equal(await viewer.copyItem(item),true);assert.deepEqual(copied,[body+' 0']);assert.deepEqual(writes,[]);assert.equal(viewer.status.textContent,'Full original text copied.');
}),{body}));
for(const mode of ['back','native-close','hidden','changed-authority','removed-placement'])test('copy final qualification refuses '+mode,()=>fixture(async({viewer,dispatch,setSender,events,messages})=>clipboard(async copied=>{
 let release;setSender(async(type,payload)=>{const value=await dispatch(type,payload);if(type==='GET_LIBRARY_ENTRY')await new Promise(resolve=>{release=resolve;});else if(release&&mode==='changed-authority')value.authority='different';else if(release&&mode==='removed-placement')value.items=[];return value;});
 assert.equal(await viewer.read(),true);const task=viewer.copyItem(viewer.reader.items[0]);while(!release)await new Promise(resolve=>setImmediate(resolve));
 if(mode==='back'){let prevented=false;viewer.root.listeners.get('paia:request-close')({preventDefault(){prevented=true;}});assert.equal(prevented,true);}
 if(mode==='native-close'){viewer.root.close();viewer.root.listeners.get('close')();}
 if(mode==='hidden'){document.hidden=true;events.get('visibilitychange')();}
 release();assert.equal(await task,false);assert.deepEqual(copied,[]);assert.equal(viewer.body.textContent,'');
 if(mode==='back'||mode==='native-close'){assert.equal(viewer.active,false);assert.equal(messages.size,0);assert.equal(events.size,0);}
})));
test('clipboard rejection does not claim success or create a fallback text dialog',()=>fixture(async({viewer,dispatch,setSender})=>clipboard(async copied=>{
 setSender(dispatch);assert.equal(await viewer.read(),true);const children=document.body.children.length;assert.equal(await viewer.copyItem(viewer.reader.items[0]),false);assert.deepEqual(copied,[]);assert.equal(document.body.children.length,children);assert.match(viewer.status.textContent,/did not allow/);assert.equal(viewer.busy,false);
},{reject:true})));
test('native close cleanup is idempotent and permits parent to reopen viewer',()=>fixture(async({viewer,messages,events})=>{
 let closes=0;viewer.onClose=()=>closes++;viewer.root.close();viewer.root.listeners.get('close')();viewer.close();viewer.root.listeners.get('close')();assert.equal(closes,1);assert.equal(messages.size,0);assert.equal(events.size,0);assert.equal(viewer.body.textContent,'');
}));

test('Context Section selector excludes siblings and never changes access or canonical placements',()=>fixture(async({s,viewer,topic,entries,calls})=>{
 const sibling=await s.createSection({topicId:topic.id,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,title:'SYNTHETIC sibling',operationId:op()});
 const other=await s.createEntry({operationId:op(),actor:'user',body:'SYNTHETIC sibling-only text',note:'',type:'idea',formation:'explicit',evidence:[]});
 await s.placeEntry({entryId:other.id,topicId:topic.id,sectionId:sibling.sectionId,operationId:op(),expectedEntryRevision:other.revision,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision});
 const original=s.repository.transaction.bind(s.repository),writes=[];s.repository.transaction=(write,...args)=>{if(write)writes.push(true);return original(write,...args);};
 assert.equal(await viewer.read(),true);const first=viewer.start.sectionId;assert.doesNotMatch(viewer.body.textContent,/sibling-only/);assert.equal(viewer.sectionSelect.children.length,2);
 assert.equal(await viewer.selectSection(sibling.sectionId),true);assert.match(viewer.body.textContent,/sibling-only/);assert.doesNotMatch(viewer.body.textContent,/精确原文/);assert.equal(viewer.next.disabled,true);
 assert.equal(await viewer.selectSection(first),true);assert.match(viewer.body.textContent,/精确原文/);assert.doesNotMatch(viewer.body.textContent,/sibling-only/);
 assert.ok(calls.filter(call=>call.type==='GET_LIBRARY_SECTION_READING').every(call=>call.options.scopeSectionId));assert.deepEqual(writes,[]);
}));

test('Context explicit missing Section never falls back to a sibling',()=>fixture(async({viewer})=>{
 viewer.start={...viewer.start,sectionId:crypto.randomUUID()};assert.equal(await viewer.restart(),false);assert.equal(viewer.invalidated,true);assert.equal(viewer.body.textContent,'');assert.equal(viewer.next.disabled,true);
}));

test('Context rejects a sibling Entry returned beneath the selected Section identity',()=>fixture(async({viewer,setSender,dispatch})=>{
 setSender(async(...args)=>{const page=await dispatch(...args);if(args[0]==='GET_LIBRARY_SECTION_READING')page.items[0].placement.sectionId=crypto.randomUUID();return page;});
 assert.equal(await viewer.read(),false);assert.equal(viewer.body.textContent,'');assert.equal(viewer.invalidated,true);
}));

test('Context Inputs retires legacy query while All and Selected retain complete real identities',()=>fixture(async({viewer,topic,dispatch})=>{
 viewer.close();const inputs=new ContextTopicInputs({host:document.body,access:{global:{enabled:false},inputs:{enabled:false}},send:dispatch});
 inputs.receive([topic.id,'another'].map((topicId,index)=>({topicId,name:'Private '+index,enabled:index===1,revision:0,canEnable:true,canDisable:true,policyAllowed:false,externalAllowed:false})));
 assert.equal(inputs.root.querySelectorAll('input').length,0);assert.equal(inputs.searchField,undefined);
 assert.equal(inputs.filter(false,'NO MATCH LEGACY'),true);assert.deepEqual(inputs.visibleIds(),[topic.id,'another']);assert.equal(inputs.query,'');
 assert.equal(await inputs.searchContent('legacy body search'),false);assert.equal(inputs.search,null);assert.equal(inputs.field.hidden,false);
 assert.equal(inputs.filter(true,'NO MATCH'),true);assert.deepEqual(inputs.visibleIds(),['another']);assert.equal(inputs.rows.get('another').enabled,true);assert.equal(inputs.rows.get(topic.id).enabled,false);inputs.close();
}));

// The selector resolves real Section identity through the existing projection
// before the shared prose renderer receives its selected presentation scope.
test('Context named and empty selected Sections use shared scoped prose without duplicated headings or grants',()=>fixture(async({s,viewer,topic,entries,setSender,dispatch})=>{
 const named=await s.createSection({topicId:topic.id,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,title:'SYNTHETIC selected named',operationId:op()});
 const empty=await s.createSection({topicId:topic.id,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,title:'SYNTHETIC selected empty',operationId:op()});
 const entry=await s.createEntry({operationId:op(),actor:'user',body:'SYNTHETIC named exact 👩🏽‍💻\n\n  const x = 1;\n诗。',note:'',type:'idea',formation:'explicit',evidence:[]});
 await s.placeEntry({entryId:entry.id,topicId:topic.id,sectionId:named.sectionId,operationId:op(),expectedEntryRevision:entry.revision,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision});
 const stores=['records','blocks','inputStates','thoughts','placements','sections','topics','meta'],readRows=()=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(stores.map(async name=>[name,await t.all(name)])))),before=await readRows(),original=s.repository.transaction.bind(s.repository),writes=[],reads=[];
 s.repository.transaction=(write,...args)=>{if(write)writes.push(true);return original(write,...args);};setSender(async(type,payload)=>{reads.push({type,...payload});return dispatch(type,payload);});
 viewer.start={topicId:topic.id,sectionId:named.sectionId,anchorId:null};assert.equal(await viewer.restart(),true);assert.equal(viewer.start.sectionId,named.sectionId);assert.equal(viewer.sectionSelect.value,named.sectionId);assert.equal(viewer.sectionSelect.children.length,3);assert.equal(viewer.title.textContent,(await s.topic(topic.id)).name);
 const host=viewer.body.firstElementChild,node=viewer.body.querySelector('[data-entry-id]'),prose=node.querySelector('.entry-prose');assert.equal(host.dataset.sectionId,named.sectionId);assert.equal(node.dataset.entryId,entry.id);assert.equal(prose.textContent,'SYNTHETIC named exact 👩🏽‍💻\n\n  const x = 1;\n诗。');assert.equal(viewer.reader.sections.get(named.sectionId).title,'SYNTHETIC selected named');assert.equal(viewer.body.querySelectorAll('h2').length,0);assert.equal(viewer.body.querySelectorAll('.section-heading').length,0);assert.doesNotMatch(viewer.body.textContent,/精确原文/);
 prose.focus();viewer.paintPage();assert.equal(viewer.body.firstElementChild,host);assert.equal(viewer.body.querySelector('[data-entry-id]'),node);assert.equal(node.querySelector('.entry-prose'),prose);assert.equal(document.activeElement,prose);assert.equal(prose.textContent,'SYNTHETIC named exact 👩🏽‍💻\n\n  const x = 1;\n诗。');
 assert.equal(await viewer.selectSection(empty.sectionId),true);assert.equal(viewer.start.sectionId,empty.sectionId);assert.equal(viewer.sectionSelect.value,empty.sectionId);assert.equal(viewer.body.children.length,1);assert.equal(viewer.body.firstElementChild.dataset.sectionId,empty.sectionId);assert.equal(viewer.body.firstElementChild.children.length,0);assert.equal(viewer.body.textContent,'');assert.equal(viewer.reader.sections.get(empty.sectionId).title,'SYNTHETIC selected empty');assert.equal(viewer.next.disabled,true);
 assert.equal(await viewer.selectSection(named.sectionId),true);assert.equal(viewer.body.querySelector('[data-entry-id]').dataset.entryId,entry.id);assert.equal(viewer.body.querySelectorAll('h2').length,0);assert.ok(reads.filter(row=>row.type==='GET_LIBRARY_SECTION_READING').every(row=>[named.sectionId,empty.sectionId].includes(row.options.scopeSectionId)));assert.deepEqual(writes,[],'reading and presentation never write a canonical body, placement or access choice');assert.deepEqual(await readRows(),before,'source, Working, organization and access owners keep exactly the same stored rows');assert.equal((await s.entry(entries[0].id)).body.startsWith('精确原文'),true);
}));

test('Context missing initial Section resolves only the original first qualified directory identity before scoped paint',()=>fixture(async({viewer,calls})=>{
 assert.equal(viewer.start.sectionId,null);assert.equal(await viewer.read(),true);const selected=viewer.sectionRows[0].id;assert.equal(viewer.start.sectionId,selected);assert.equal(viewer.sectionSelect.value,selected);assert.equal(viewer.body.firstElementChild.dataset.sectionId,selected);assert.equal(viewer.body.querySelectorAll('h2').length,0);assert.equal(viewer.body.querySelectorAll('.section-heading').length,0);assert.equal(calls[0].type,'GET_LIBRARY_SECTION_PROJECTION');assert.ok(calls.filter(row=>row.type==='GET_LIBRARY_SECTION_READING').every(row=>row.options.scopeSectionId===selected),'no guessed default or unqualified target becomes presentation scope');
}));
