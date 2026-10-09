import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {ContinuousTopicReader} from '../ui/continuous-topic-reader.js';import {TopicAIViewSession} from '../core/topic-ai-view-session.js';
const anchor={id:'synthetic-entry',top:-16,text:{revision:2,offset:4,top:140}};
test('optional text anchor remains body-free, independently cloned in snapshot and AI session; old shape remains intact',()=>{
 const reader=new ContinuousTopicReader({load:async()=>({})});reader.reset({topicId:'synthetic-topic'});const input={...anchor,text:{...anchor.text,body:'SYNTHETIC must not persist'}};
 const saved=reader.snapshot(input);assert.deepEqual(saved.anchor,anchor);input.text.offset=99;assert.equal(saved.anchor.text.offset,4);
 const session=new TopicAIViewSession();session.remember('synthetic-topic','original',{anchor});const copy=session.position('synthetic-topic','original');assert.deepEqual(copy.anchor,anchor);copy.anchor.text.offset=98;assert.equal(session.position('synthetic-topic','original').anchor.text.offset,4);
 assert.deepEqual(reader.snapshot({id:'old',top:3}).anchor,{id:'old',top:3});session.remember('synthetic-old','original',{anchor:{id:'old',top:3}});assert.deepEqual(session.position('synthetic-old','original').anchor,{id:'old',top:3});
 for(const text of [{revision:-1,offset:4,top:140},{revision:2,offset:-1,top:140},{revision:2,offset:4,top:Infinity}])assert.deepEqual(reader.snapshot({id:'old',top:3,text}).anchor,{id:'old',top:3});
});
test('text restoration requires fresh matching ACK revision/body and measurable Range; otherwise original row geometry wins',()=>{
 const reader=new ContinuousTopicReader({load:async()=>({})}),body={textContent:'abcdSYNTHETIC',},node={dataset:{entryId:anchor.id},getBoundingClientRect:()=>({top:-16}),querySelector:()=>body},root={querySelectorAll:()=>[node]};
 const old={document:globalThis.document,NodeFilter:globalThis.NodeFilter,scrollBy:globalThis.scrollBy},calls=[];let height=29;
 globalThis.NodeFilter={SHOW_TEXT:4};globalThis.document={createTreeWalker:()=>{let n=0;return {nextNode:()=>n++?null:{length:body.textContent.length}};},createRange:()=>({setStart(){},collapse(){},getBoundingClientRect:()=>({top:170,height})})};globalThis.scrollBy=(x,y)=>calls.push(y);
 try{reader.items=[{entry:{id:anchor.id,revision:2}}];reader.index.set(anchor.id,0);
  assert.equal(reader.restoreAnchor(root,anchor,{revision:2,saved:{body:body.textContent}}),true);assert.deepEqual(calls,[30]);calls.length=0;
  for(const row of [undefined,{revision:1,saved:{body:body.textContent}},{revision:2,saved:{body:'different canonical body'}}]){reader.restoreAnchor(root,anchor,row);assert.deepEqual(calls,[],'old items never authenticate a text anchor');}
  height=0;reader.restoreAnchor(root,anchor,{revision:2,saved:{body:body.textContent}});assert.deepEqual(calls,[]);reader.restoreAnchor(root,null);assert.deepEqual(calls,[]);
 }finally{for(const [k,v]of Object.entries(old)){if(v===undefined)delete globalThis[k];else globalThis[k]=v;}}
});
test('actual capture uses current clean ACK row; dirty/saving/IME or different DOM text keeps legacy fallback',async()=>{
 const source=await readFile(new URL('../ui/topic-workspace.js',import.meta.url),'utf8'),start=source.indexOf(' topicAnchor(){'),end=source.indexOf('\n topicSectionAnchor',start);assert.ok(start>0&&end>start);const method=source.slice(start,end).trim();
 const capture=Function('document','$',`return {${method}}.topicAnchor;`)({caretRangeFromPoint:()=>({startContainer:{},startOffset:4,cloneRange:()=>({selectNodeContents(){},setEnd(){},toString:()=> 'abcd'}),getBoundingClientRect:()=>({top:140,height:29})})},()=>null);
 const body={textContent:'abcdSYNTHETIC',contains:()=>true,getBoundingClientRect:()=>({left:30,top:50})},node={dataset:{entryId:anchor.id},querySelector:()=>body},root={querySelectorAll:()=>[node]},owner={dirty:()=>false,saving:false,surface:{composing:false},entries:new Map([[anchor.id,{revision:2,saved:{body:body.textContent}}]])},context={topicReader:{captureAnchor:()=>({id:anchor.id,top:-16})},originalPane:root,view:'original',editor:{entry:owner}};
 assert.deepEqual(capture.call(context),anchor);for(const state of ['dirty','saving','ime','different-dom','ai']){owner.dirty=()=>state==='dirty';owner.saving=state==='saving';owner.surface.composing=state==='ime';body.textContent=state==='different-dom'?'different':owner.entries.get(anchor.id).saved.body;context.view=state==='ai'?'ai':'original';assert.deepEqual(capture.call(context),{id:anchor.id,top:-16});}
});
test('actual leave recaptures acknowledged position before disposal; failed flush never records a saved text anchor',async()=>{
 const source=await readFile(new URL('../ui/topic-workspace.js',import.meta.url),'utf8'),start=source.indexOf(' async leaveEditors(){'),end=source.indexOf('\n',start);assert.ok(start>0&&end>start);const method=source.slice(start,end).trim();
 const leave=Function('isComposing','stopMemoryRecomposition','$',`return {${method}}.leaveEditors;`)(value=>value?.composing===true,()=>{},()=>({inert:false}));
 for(const succeeds of [true,false]){const events=[],editor={dirty:()=>!succeeds,collect:()=>events.push('collect'),flush:async()=>{events.push('ack');return succeeds;},dispose:()=>events.push('dispose')},positions=new Map(),owner={editor,id:'synthetic-topic',view:'original',readRetry:{hidden:false},cancelTopicRestore(){},rememberView(){events.push('remember-current-ACK');},topicAnchor(){return {id:'synthetic-entry',top:0,text:{revision:2,offset:4,top:140}};},homePositions:positions,saveHomePosition(id,value){positions.set(id,value);}};
  assert.equal(await leave.call(owner),succeeds);if(succeeds){assert.deepEqual(events,['collect','ack','remember-current-ACK','dispose']);assert.equal(positions.get(owner.id).anchor.text.revision,2);}else{assert.deepEqual(events,['collect','ack']);assert.equal(positions.size,0);assert.equal(owner.editor,editor);}
 }
});
