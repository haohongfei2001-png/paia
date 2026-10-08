import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture,rows} from './harness/original-complete.mjs';
import {PresentationNode} from './harness/presentation-dom.mjs';
import {mountReverseEditOptOut} from '../ui/thought-reverse-edit-optout.js';
const op=()=>crypto.randomUUID();
test('existing true reverse-edit preference remains restrictively controllable without any Input/body write',async()=>{
 const f=await completeFixture({texts:['SYNTHETIC protected original']}),b=(await rows(f.s,'blocks'))[0].value,topic=await f.s.createTopic({name:'SYNTHETIC opt-out',operationId:op()}),added=await f.s.addToTopics({operationId:op(),kind:'input',id:b.id,expectedRevision:b.revision,topicIds:[topic.id]});await f.s.reverseEditSetting(true);const entry=await f.s.entry(added.id),beforeInput=await f.s.input(b.id),beforeBody=entry.body,previous=globalThis.document,nodes=[],host=new PresentationNode();let pauses=0;
 globalThis.document={documentElement:{lang:'en'},createElement:tag=>{const node=new PresentationNode(tag);nodes.push(node);return node;},querySelectorAll:()=>nodes.filter(node=>node.dataset.reverseEditDisable)};
 try{const control=mountReverseEditOptOut(host,entry,{pauseDrafts:()=>pauses++,send:async(type,payload)=>{assert.equal(type,'SET_THOUGHT_REVERSE_EDIT');assert.deepEqual(payload,{enabled:false});return f.s.reverseEditSetting(false);}});assert.ok(control);let prevented=false;control.listeners.get('pointerdown')({preventDefault(){prevented=true;}});assert.equal(prevented,true);let intercepted=false;host.listeners.get('focusout')({relatedTarget:control,stopPropagation(){intercepted=true;}});assert.equal(intercepted,true);await control.listeners.get('click')();assert.ok(pauses>=2);assert.equal((await f.s.reverseEditSetting()).enabled,false);assert.deepEqual(await f.s.input(b.id),beforeInput);assert.equal((await f.s.entry(added.id)).body,beforeBody);assert.equal(control.disabled,true);
 const current=await f.s.entry(added.id);await f.s.editLibraryFields({id:added.id,operationId:op(),expectedRevision:current.revision,expectedFieldRevisions:current.fieldRevisions,expectedInputRevision:current.currentInputRevision,changes:{body:'SYNTHETIC independent future Thought'}});assert.deepEqual(await f.s.input(b.id),beforeInput);assert.equal((await f.s.entry(added.id)).bodyBinding,'thought');assert.equal((await rows(f.s,'records'))[0].value.originalText,'SYNTHETIC protected original');
 }finally{globalThis.document=previous;}
});
test('opt-out has no enable affordance and unconfirmed acknowledgement is retryable',async()=>{
 const previous=globalThis.document,nodes=[];globalThis.document={documentElement:{lang:'en'},createElement:tag=>{const n=new PresentationNode(tag);nodes.push(n);return n;},querySelectorAll:()=>nodes.filter(n=>n.dataset.reverseEditDisable)};
 try{assert.equal(mountReverseEditOptOut(new PresentationNode(),{reverseEditEnabled:false}),null);const entry={reverseEditEnabled:true},control=mountReverseEditOptOut(new PresentationNode(),entry,{send:async()=>({})});await control.listeners.get('click')();assert.equal(control.disabled,false);assert.equal(entry.reverseEditEnabled,true);assert.match(nodes.at(-1).textContent,/not confirmed/);}finally{globalThis.document=previous;}
});
