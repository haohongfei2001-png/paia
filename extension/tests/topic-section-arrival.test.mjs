import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicController} from '../ui/topic-workspace.js';
function fixture(){
 const calls=[],heading={focus:()=>calls.push('focus')},section={dataset:{sectionId:'deep'},scrollIntoView:()=>calls.push('scroll'),querySelector:()=>heading};
 const owner=Object.assign(Object.create(TopicController.prototype),{id:'topic',view:'original',serial:4,openIntent:2,rootCueEpoch:1,originalPane:{querySelectorAll:()=>[section]},topicSectionRows:async()=>[{sectionId:'deep',title:'Deep'}],rememberContent(){},restoreContent(){},renderSectionNav(){},flushEditors:async()=>{calls.push('flush');return true;},checkAllTracked:async serial=>{calls.push(['tracked',serial]);return true;},resetTopicReader:async options=>{calls.push(['reset',options]);return {};}});
 return {owner,calls,section};
}
test('existing named heading never substitutes for qualified Section arrival, including empty Sections',async()=>{
 const {owner,calls}=fixture();assert.equal(await owner.focusSection('deep'),true);
 const reset=calls[2][1],{prepareInitial,isCurrent,beforePaint,...original}=reset;
 assert.equal(prepareInitial,true);assert.equal(isCurrent(),true);assert.equal(beforePaint({scopeSectionId:'deep',items:[],sections:[{sectionId:'deep'}]}),true);assert.equal(beforePaint({scopeSectionId:'sibling',items:[],sections:[]}),false);
 assert.deepEqual(calls.map(call=>Array.isArray(call)&&call[0]==='reset'?['reset',original]:call),['flush',['tracked',4],['reset',{sectionId:'deep',saved:undefined,expectedSerial:4}],'scroll','focus']);
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

test('a late failed Section transition cannot roll back the newer selected reader',async()=>{
 const {owner}=fixture();owner.activeSectionId='old';owner.topicReader={identity:'old'};owner.topicSectionRows=async()=>[{sectionId:'deep'},{sectionId:'new'}];
 let release,started;const held=new Promise(r=>release=r),entered=new Promise(r=>started=r);
 owner.resetTopicReader=async({sectionId})=>{if(sectionId==='deep'){started();await held;return {stale:true};}owner.topicReader={identity:'new'};return {};};
 const first=owner.navigateTopicSection('deep');await entered;
 owner.originalPane.querySelectorAll=()=>[{dataset:{sectionId:'new'},scrollIntoView(){},querySelector:()=>({focus(){}})}];
 assert.equal(await owner.navigateTopicSection('new'),true);release();assert.equal(await first,false);
 assert.equal(owner.activeSectionId,'new');assert.equal(owner.topicReader.identity,'new');
});
test('a refused Section read retains the previous scope, document and reader',async()=>{
 const {owner}=fixture(),reader={identity:'old'},document={identity:'old'};owner.activeSectionId='old';owner.topicReader=reader;owner.document=document;owner.resetTopicReader=async()=>({anchorUnavailable:true});
 assert.equal(await owner.navigateTopicSection('deep'),false);assert.equal(owner.activeSectionId,'old');assert.equal(owner.topicReader,reader);assert.equal(owner.document,document);
});

test('composition beginning during Section flush or directory read retains the original scope and native field',async()=>{
 for(const view of ['original','ai'])for(const stage of ['flushEditors','topicSectionRows']){
  const {owner,calls}=fixture(),field={composing:false};owner.view=view;owner.editor=field;owner.activeSectionId='old';owner.refresh=async()=>calls.push('refresh');
  const original=owner[stage].bind(owner);owner[stage]=async(...args)=>{field.composing=true;return original(...args);};
  const accepted=await (view==='ai'?owner.navigateAISection('deep'):owner.navigateTopicSection('deep'));
  assert.equal(accepted,false,view+'/'+stage);assert.equal(owner.activeSectionId,'old');assert.equal(owner.editor,field);assert.equal(calls.includes('refresh'),false);assert.equal(calls.some(call=>Array.isArray(call)&&call[0]==='reset'),false);
 }
});

test('late AI qualification refusal cannot put an old composing editor under a new Section directory',async()=>{
 const {owner}=fixture(),reader={id:'old-reader'},model={id:'old-document'},field={composing:false};owner.view='ai';owner.editor=null;owner.aiEditor=field;owner.activeSectionId='old';owner.aiScopeKey=JSON.stringify(['topic','old',true]);owner.topicReader=reader;owner.document=model;owner.contentResume={old:true};
 owner.refresh=async()=>{field.composing=true;return false;};
 assert.equal(await owner.navigateAISection('deep'),false);assert.equal(owner.activeSectionId,'old');assert.equal(owner.aiEditor,field);assert.equal(owner.topicReader,reader);assert.equal(owner.document,model);assert.deepEqual(owner.contentResume,{old:true});
});
test('only an actually painted matching AI scope admits navigation, including a newly composing destination editor',async()=>{
 for(const painted of [false,true]){const {owner}=fixture();owner.view='ai';owner.activeSectionId='old';owner.aiScopeKey=JSON.stringify(['topic','old',true]);owner.refresh=async()=>{if(painted){owner.aiScopeKey=JSON.stringify(['topic','deep',true]);owner.aiEditor={composing:true};}return true;};
 assert.equal(await owner.navigateAISection('deep'),painted);assert.equal(owner.activeSectionId,painted?'deep':'old');}
});
