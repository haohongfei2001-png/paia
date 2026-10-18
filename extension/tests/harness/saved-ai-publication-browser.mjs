// Synthetic native control: hold the real reader immediately before its normal
// initial read/publication. No second Store, artificial ACK or production hook.
import assert from 'node:assert/strict';
import {rpc,savedRow,setAIView,openSavedAI,quiet} from './consumer-ai-browser.mjs';
import {eventually} from './fake-chatgpt.mjs';
import {installSavedAIDiagnostic,savedAIEvidence,persistSavedAIEvidence,releaseSavedAI} from './saved-ai-evidence.mjs';
export async function proveLateSavedAIPublication(f,variant){
 const {p,topic}=f;
 try{
  const setup=await savedRow(p,topic.id);await rpc(p,'EDIT_AI_PRESENTATION',{edit:{topicId:topic.id,field:'blockSummary',value:'SYNTHETIC late publication baseline',expectedRevision:setup.revision,operationId:crypto.randomUUID()}});
  await p.evaluate(async()=>{
   const {TopicController}=await import('../ui/topic-workspace.js'),switchView=TopicController.prototype.switchView,reset=TopicController.prototype.resetTopicReader;
   const gate=globalThis.__savedAIPublication={armed:false,held:false,done:false,paintRefused:null};let release;const wait=new Promise(r=>release=r);gate.release=()=>{gate.held=false;release();};
   TopicController.prototype.switchView=function(...args){gate.owner=this;return switchView.apply(this,args);};
   TopicController.prototype.resetTopicReader=async function(...args){
    if(!gate.armed||this!==gate.owner||this.view!=='ai')return reset.apply(this,args);
    gate.armed=false;gate.held=true;gate.editor=this.aiEditor;gate.field=this.aiEditor?.nodes.get('blockSummary')?.[0];gate.scope=this.aiScopeKey;
    try{await wait;const result=await reset.apply(this,args);gate.paintRefused=result.paintRefused===true;gate.nextScope=this.aiScopeKey;return result;}finally{gate.done=true;}
   };
   gate.restore=()=>{gate.release();TopicController.prototype.switchView=switchView;TopicController.prototype.resetTopicReader=reset;};
  });
  await setAIView(p,false);await setAIView(p,true);await openSavedAI(p);
  await eventually(()=>p.evaluate(()=>{const gate=globalThis.__savedAIPublication,o=gate?.owner;return o?.view==='ai'&&o.aiEditor?.nodes.has('blockSummary')&&!o.refreshRun&&!o.viewSwitchPromise&&!o.aiEditor.saving&&!o.aiEditor.dirty();}),'the original owner settles the synthetic baseline');
  await p.evaluate(()=>globalThis.__savedAITrace?.restore());await p.evaluate(installSavedAIDiagnostic,{holdRecovery:true});const before=await savedRow(p,topic.id);
  await p.evaluate(()=>{__savedAIPublication.armed=true;});
  const topicBefore=await rpc(p,'GET_LIBRARY_TOPIC',{id:topic.id});await rpc(p,'EDIT_LIBRARY_TOPIC',{edit:{id:topic.id,expectedRevision:topicBefore.revision,changes:{pinned:topicBefore.pinKey!==0},operationId:crypto.randomUUID()}});
  await eventually(()=>p.evaluate(()=>__savedAIPublication.held),'real changed-generation reader reaches its held publication');
  const field=p.locator('[data-ai-field="blockSummary"]').first();await field.fill('');await field.press('Tab');await eventually(()=>p.evaluate(()=>__savedAITrace.held),'late empty draft recovery is held');
  assert.deepEqual(await savedRow(p,topic.id),before);await p.evaluate(()=>__savedAIPublication.release());await eventually(()=>p.evaluate(()=>__savedAIPublication.done),'original reader publishes exact fresh scope without retiring the draft');
  const held=await p.evaluate(()=>{const g=__savedAIPublication;return {generationChanged:JSON.parse(g.scope)[4]!==JSON.parse(g.nextScope)[4],paintRefused:g.paintRefused,sameEditor:g.owner.aiEditor===g.editor,sameField:g.editor.nodes.get('blockSummary')?.[0]===g.field,connected:g.field?.isConnected,disposed:g.editor.disposed,dirty:g.editor.dirty(),saving:g.editor.saving,editRequests:__savedAITrace.events.filter(e=>e.event==='edit-request').length};});
  assert.deepEqual(held,{generationChanged:true,paintRefused:false,sameEditor:true,sameField:true,connected:true,disposed:false,dirty:true,saving:true,editRequests:0});
  await p.evaluate(()=>__savedAITrace.release());await eventually(async()=>(await savedRow(p,topic.id)).blockSummary==='','one late empty draft commits through its retained owner');
  await eventually(()=>p.evaluate(()=>{const g=__savedAIPublication,o=g.owner;return !o.refreshRun&&o.view==='ai'&&o.aiEditor&&!o.aiEditor.disposed&&o.aiEditor.nodes.get('currentView')?.[0]?.isConnected&&JSON.parse(o.aiScopeKey)[2]===true&&JSON.parse(o.aiScopeKey)[4]!==JSON.parse(g.scope)[4];}),'the qualified AI reading surface remains published after the actual save ACK');
  const after=await savedRow(p,topic.id),evidence=await savedAIEvidence(f,variant);assert.equal(after.revision,before.revision+1);assert.equal(evidence.events.filter(e=>e.event==='edit-request').length,1);assert.equal(evidence.events.filter(e=>e.event==='edit-ack'&&e.ok).length,1);
  for(const key of ['currentView','keyInformation','preferences','decisions','judgments','openQuestions','possibleEvolution'])assert.deepEqual(after[key],before[key]);
  const changes=evidence.journal.filter(r=>r.revision>before.revision);assert.equal(changes.length,1);assert.equal(changes[0].actor,'user');assert.deepEqual(Object.keys(changes[0].changes),['blockSummary']);
  evidence.baselineRevision=before.revision;evidence.heldPublication=held;await persistSavedAIEvidence(evidence,'saved-ai-late-publication');await quiet(f.h);
 }finally{await releaseSavedAI(p);let timer;try{await Promise.race([p.evaluate(()=>globalThis.__savedAIPublication?.restore()).catch(()=>{}),new Promise(resolve=>{timer=setTimeout(resolve,1000);})]);}finally{clearTimeout(timer);}}
}
