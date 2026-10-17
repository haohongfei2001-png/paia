import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicController} from '../ui/topic-workspace.js';
const page={authority:'a',recoveryEpoch:'e'};
function fixture(response){const editor={},field={isConnected:true},handoff={id:'entry',owner:editor,field,topicId:'topic',sectionId:'selected',authority:'old',recoveryEpoch:'e'},owner=Object.assign(Object.create(TopicController.prototype),{id:'topic',activeSectionId:'selected',editor,document:page,sectionEndHandoff:handoff});globalThis.chrome={runtime:{sendMessage:async message=>{assert.equal(message.type,'GET_LIBRARY_SECTION_READING');assert.deepEqual(message.options,{topicId:'topic',scopeSectionId:'selected',...(message.options.anchorId?{anchorId:'entry'}:{}),sort:'asc',query:'',limit:1});return {ok:true,data:typeof response==='function'?await response(message.options):response};}}};return {owner,handoff};}
for(const checked of [{cursorInvalid:true},{cursorInvalid:true,anchorUnavailable:true,authority:'new',recoveryEpoch:'e'},{anchorUnavailable:true,authority:'a',recoveryEpoch:'restored'},{unavailable:true,authority:'a',recoveryEpoch:'e'}])test('handoff final await refuses stale page '+JSON.stringify(checked),async()=>{const f=fixture(checked);await assert.rejects(f.owner.qualifySectionHandoff(page,()=>true),/HANDOFF_CHANGED/);assert.equal(f.owner.sectionEndHandoff,f.handoff);});
test('an exactly current missing placement releases its pin while current same-Section placement renews qualification',async()=>{let f=fixture(options=>options.anchorId?{authority:'a',cursorInvalid:true,anchorUnavailable:true}:page);assert.equal(await f.owner.qualifySectionHandoff(page,()=>true),true);assert.equal(f.owner.sectionEndHandoff,null);f=fixture({...page,items:[{entry:{id:'entry'},placement:{sectionId:'selected'}}]});assert.equal(await f.owner.qualifySectionHandoff(page,()=>true),true);assert.equal(f.handoff.authority,'a');assert.equal(f.handoff.recoveryEpoch,'e');});
test('a newer route during final handoff qualification cannot change a pin or paint',async()=>{const f=fixture({...page,items:[]});assert.equal(await f.owner.qualifySectionHandoff(page,()=>false),false);assert.equal(f.owner.sectionEndHandoff,f.handoff);});

// Deliberate navigation consumes only the qualified temporary ACK pin. Native
// human protections, editor rows, recovery and Undo remain their original owners.
async function navigationFixture(run){
 const previous=Object.getOwnPropertyDescriptor(globalThis,'chrome'),calls=[],pins=new Set();
 const canonical={id:'entry',body:'SYNTHETIC acknowledged text',note:'SYNTHETIC note',type:'idea',revision:2,lifecycle:'active',recoveryEpoch:'e',staleReasons:[]};
 const tracked={saved:{body:canonical.body,note:canonical.note,type:canonical.type},local:{body:canonical.body,note:canonical.note,type:canonical.type},revision:canonical.revision};
 const row={dataset:{entryId:'entry',sectionId:'selected'}},field={isConnected:true,dataset:{entryField:'body'},closest:()=>row};
 const entry={entries:new Map([['entry',tracked]]),surface:{composing:false},journal:{undo:[[{id:'entry',field:'body',before:'',after:canonical.body}]],redo:[]},protectedIds:()=>new Set(pins)};
 const editor={entry},handoff={id:'entry',field,owner:editor,topicId:'topic',sectionId:'selected',authority:'a',recoveryEpoch:'e'};
 const owner=Object.assign(Object.create(TopicController.prototype),{id:'topic',activeSectionId:'selected',view:'original',editor,document:{authority:'a',recoveryEpoch:'e'},sectionEndHandoff:handoff});
 const checked={authority:'a',recoveryEpoch:'e',items:[{entry:{...canonical},placement:{entryId:'entry',topicId:'topic',sectionId:'selected',lifecycle:'active'}}]};let current=true,afterRead=()=>{};
 globalThis.chrome={runtime:{sendMessage:async message=>{calls.push(structuredClone(message));let data;if(message.type==='GET_LIBRARY_ENTRY'){assert.equal(message.id,'entry');data=canonical;}else{assert.equal(message.type,'GET_LIBRARY_SECTION_READING');assert.equal(message.options.topicId,'topic');assert.equal(message.options.scopeSectionId,'selected');assert.equal(message.options.anchorId,'entry');data=checked;}await afterRead(message);return {ok:true,data};}}};
 try{await run({owner,entry,editor,tracked,handoff,field,canonical,checked,pins,calls,current:()=>current,retire:()=>current=false,afterRead:fn=>afterRead=fn});}
 finally{if(previous)Object.defineProperty(globalThis,'chrome',previous);else delete globalThis.chrome;}
}

test('navigation with no temporary handoff succeeds without any read or editor mutation',()=>navigationFixture(async f=>{
 f.owner.sectionEndHandoff=null;assert.equal(await f.owner.settleSectionHandoffForNavigation(f.current),true);assert.equal(f.calls.length,0);assert.equal(f.entry.entries.get('entry'),f.tracked);
}));

test('fresh exact navigation qualification removes only the temporary pin and retains field, row and Undo identity',()=>navigationFixture(async f=>{
 const journal=f.entry.journal;assert.equal(await f.owner.settleSectionHandoffForNavigation(f.current),true);
 assert.equal(f.owner.sectionEndHandoff,null);assert.equal(f.owner.editor,f.editor);assert.equal(f.entry.entries.get('entry'),f.tracked);assert.equal(f.field.isConnected,true);assert.equal(f.entry.journal,journal);assert.equal(journal.undo.length,1);
 assert.deepEqual(f.calls.map(message=>message.type),['GET_LIBRARY_ENTRY','GET_LIBRARY_SECTION_READING']);
}));

for(const [name,change]of [
 ['untracked acknowledged Entry',f=>f.entry.entries.clear()],['disconnected field',f=>f.field.isConnected=false],
 ['different editor',f=>f.handoff.owner={}],['different Topic',f=>f.handoff.topicId='other'],['different Section',f=>f.handoff.sectionId='other'],
 ['different authority',f=>f.handoff.authority='old'],['different epoch',f=>f.handoff.recoveryEpoch='old'],
 ['dirty native body',f=>{f.tracked.local.body='SYNTHETIC unsaved draft';f.pins.add('entry');}],
 ['selection',f=>f.pins.add('entry')],['pending recovery',f=>f.pins.add('entry')],['focused native field',f=>f.pins.add('entry')],
 ...['failed','conflicted','saving','disposed'].map(key=>[key,f=>f.entry[key]=true]),
 ['IME',f=>f.entry.surface.composing=true],
])test('navigation keeps the ACK pin for '+name,()=>navigationFixture(async f=>{
 change(f);assert.equal(await f.owner.settleSectionHandoffForNavigation(f.current),false);assert.equal(f.owner.sectionEndHandoff,f.handoff);assert.equal(f.field.isConnected,!name.includes('disconnected'));assert.equal(f.calls.length,0,'preexisting human or authority protection must refuse before new reads');
}));

for(const [name,change]of [
 ['revision',f=>f.canonical.revision++],['body',f=>f.canonical.body+=' changed'],['note',f=>f.canonical.note+=' changed'],['type',f=>f.canonical.type='judgment'],
 ['lifecycle',f=>f.canonical.lifecycle='removed'],['Entry epoch',f=>f.canonical.recoveryEpoch='new'],
 ['scope authority',f=>f.checked.authority='new'],['scope epoch',f=>f.checked.recoveryEpoch='new'],
 ['missing placement',f=>f.checked.items=[]],['moved placement',f=>f.checked.items[0].placement.sectionId='other'],
 ['refused cursor',f=>f.checked.cursorInvalid=true],['unavailable scope',f=>f.checked.unavailable=true],
])test('fresh '+name+' cannot retire an old ACK pin',()=>navigationFixture(async f=>{
 change(f);assert.equal(await f.owner.settleSectionHandoffForNavigation(f.current),false);assert.equal(f.owner.sectionEndHandoff,f.handoff);assert.equal(f.entry.entries.get('entry'),f.tracked);assert.equal(f.entry.journal.undo.length,1);
}));

for(const boundary of ['GET_LIBRARY_ENTRY','GET_LIBRARY_SECTION_READING'])for(const protection of ['route','IME','native draft'])test('navigation rechecks '+protection+' after actual '+boundary+' awaits',()=>navigationFixture(async f=>{
 f.afterRead(message=>{if(message.type!==boundary)return;if(protection==='route')f.retire();else if(protection==='IME')f.entry.surface.composing=true;else{f.tracked.local.body='SYNTHETIC late native draft';f.pins.add('entry');}});
 assert.equal(await f.owner.settleSectionHandoffForNavigation(f.current),false);assert.equal(f.owner.sectionEndHandoff,f.handoff);assert.equal(f.entry.entries.get('entry'),f.tracked);assert.equal(f.entry.journal.undo.length,1);
 if(boundary==='GET_LIBRARY_ENTRY')assert.equal(f.calls.length,1,'a retired first read must not start a second qualification');
}));
