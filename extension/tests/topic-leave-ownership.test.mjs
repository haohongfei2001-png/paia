import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicController} from '../ui/topic-workspace.js';

for(const view of ['original','ai'])test(`retired leave flush cannot alter the newer ${view} route or its native editing admission`,async()=>{
 const priorDocument=globalThis.document;
 const body={inert:false},heading={inert:false},dialog={open:false};
 globalThis.document={getElementById:id=>({'topic-body':body,'topic-heading':heading,'library-dialog':dialog}[id])};
 let release,arrived;
 const held=new Promise(resolve=>release=resolve),entered=new Promise(resolve=>arrived=resolve);
 let newDisposed=0,presentationDisposed=0;
 const oldEditor={collect(){},async flush(){arrived();await held;return true;},dirty:()=>false,dispose(){}};
 const owner=Object.assign(Object.create(TopicController.prototype),{
  id:'old-topic',view:'original',openIntent:1,serial:1,statusEpoch:1,statusReadSerial:1,
  editor:oldEditor,readRetry:{hidden:false},cancelTopicRestore(){},
 });
 const pane=label=>({children:[label],clears:0,replaceChildren(){this.children=[];this.clears++;}});
 let pending;
 try{
  pending=owner.leaveEditors();await entered;
  // A later route has already published its own editor, panes, and admission.
  // The original flush may finish, but it no longer owns any of these nodes.
  const newEditor={dispose(){newDisposed++;}},originalPane=pane('new canonical body'),aiPane=pane('new saved fields');
  Object.assign(owner,{id:'new-topic',view,openIntent:2,serial:3,statusEpoch:2,editor:newEditor,
   originalPane,aiPane,desktopPresentation:{dispose(){presentationDisposed++;}}});
  body.inert=false;heading.inert=false;
  release();await pending;
  assert.equal(owner.editor,newEditor,'the late flush must retain the new canonical editor owner');
  assert.equal(newDisposed,0,'the late flush must not dispose the new editor');
  assert.deepEqual(originalPane.children,['new canonical body'],'the new canonical pane must remain intact');
  assert.deepEqual(aiPane.children,['new saved fields'],'the new saved-field pane must remain intact');
  assert.equal(originalPane.clears,0);assert.equal(aiPane.clears,0);
  assert.equal(body.inert,false,'a completed newer reading must retain its native edit admission');
  assert.equal(heading.inert,false,'the newer heading must remain admitted');
  assert.equal(presentationDisposed,0,'the late flush must not dismantle the new route presentation');
 }finally{
  release?.();await pending?.catch(()=>{});
  if(priorDocument===undefined)delete globalThis.document;else globalThis.document=priorDocument;
 }
});

test('an inline writer that becomes current during an editor flush retains its live draft and admission',async()=>{
 const priorDocument=globalThis.document,body={inert:false},heading={inert:false};
 globalThis.document={getElementById:id=>({'topic-body':body,'topic-heading':heading,'library-dialog':{open:false}}[id])};
 let release,arrived,disposed=0,cleared=0;
 const held=new Promise(resolve=>release=resolve),entered=new Promise(resolve=>arrived=resolve);
 const editor={collect(){},async flush(){arrived();await held;return true;},dirty:()=>false,dispose(){disposed++;}};
 const owner=Object.assign(Object.create(TopicController.prototype),{
  id:'topic',activeSectionId:'section',view:'original',openIntent:1,serial:1,statusEpoch:1,statusReadSerial:1,
  editor,readRetry:{hidden:false},cancelTopicRestore(){},rememberView(){},topicAnchor:()=>null,
  aiPane:{replaceChildren(){cleared++;}},
 });
 let pending;
 try{
  pending=owner.leaveEditors();await entered;
  // mountSectionEndWriter may finish its already-started original-owner read
  // while this flush is held. Its new native draft is a later editing owner.
  const writer={hasDraft:()=>true,leave(){assert.fail('a late flush cannot consume a newly mounted writer');}};
  owner.sectionEndWriter=writer;
  release();assert.equal(await pending,false,'new editing ownership requires the original leave to refuse');
  assert.equal(owner.sectionEndWriter,writer);assert.equal(owner.editor,editor);
  assert.equal(disposed,0);assert.equal(cleared,0);
  assert.equal(body.inert,false);assert.equal(heading.inert,false);
 }finally{
  release?.();await pending?.catch(()=>{});
  if(priorDocument===undefined)delete globalThis.document;else globalThis.document=priorDocument;
 }
});
