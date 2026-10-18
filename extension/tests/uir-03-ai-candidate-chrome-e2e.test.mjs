import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,rpc,authority,savedRow,editSaved,refusedAI,setAIView,openTopic,noApproval,quiet,screenshotMatrix} from './harness/consumer-ai-browser.mjs';
import {eventually} from './harness/fake-chatgpt.mjs';
import {proveLateSavedAIPublication} from './harness/saved-ai-publication-browser.mjs';
import {installSavedAIDiagnostic,savedAIEvidence,persistSavedAIEvidence,failSavedAI,releaseSavedAI} from './harness/saved-ai-evidence.mjs';

async function reviewCandidate(p){assert.equal(await p.locator('#ai-reading-body [data-ai-candidate]').count(),0,'full-Topic candidate is outside selected Section prose');await p.locator('[data-topic-candidate-review]').click();const panel=p.locator('#library-dialog[open] [data-ai-candidate]');await panel.waitFor();assert.equal(await p.locator('#library-dialog-title').textContent(),'主题级已保存候选');return panel;}

async function proveHeldSavedAIOwner(f,variant){
 try{
  const {p,topic}=f;await setAIView(p,true);const details=p.locator('[data-ai-saved-fields]');if(!await details.evaluate(n=>n.open))await details.locator(':scope > summary').click();
  await p.evaluate(()=>globalThis.__savedAITrace?.restore());await p.evaluate(installSavedAIDiagnostic,{holdRecovery:true});const before=await savedRow(p,topic.id),field=p.locator('[data-ai-field="currentView"]').first(),text='SYNTHETIC one native owner\n<literal> 👩‍💻 é';
  await field.fill(text);await eventually(()=>p.evaluate(()=>__savedAITrace.held),'original recovery request is held');
  await field.press('Tab');await field.focus();await field.press('Tab');
  assert.equal(await p.evaluate(()=>__savedAITrace.events.filter(e=>e.event==='edit-request').length),0,'blur cannot write before the held recovery preflight');
  assert.deepEqual(await savedRow(p,topic.id),before);await p.evaluate(()=>__savedAITrace.release());
  await eventually(async()=>(await savedRow(p,topic.id)).currentView===text,'one native authored field commits after the hold');
  // Toggle performs the normal pending-owner join; it cannot manufacture a second edit.
  await setAIView(p,false);await setAIView(p,true);
  const after=await savedRow(p,topic.id),evidence=await savedAIEvidence(f,variant);
  assert.equal(after.revision,before.revision+1);assert.equal(evidence.events.filter(e=>e.event==='edit-request').length,1);const committed=evidence.journal.filter(row=>row.revision>before.revision);assert.equal(committed.length,1);assert.equal(committed[0].actor,'user');assert.deepEqual(Object.keys(committed[0].changes),['currentView']);evidence.baselineRevision=before.revision;
  await persistSavedAIEvidence(evidence,'saved-ai-held-owner');await quiet(f.h);
 }finally{await releaseSavedAI(f.p);}
}

test('UIR-03 saved candidate stays distinct and read-only; current edits make it stale without adoption in source and release',{timeout:300000},async()=>{
 for(const variant of ['source','release']){const f=await fixture(variant,{candidate:true,diagnoseOpenTopic:true});try{const {p,topic}=f;await setAIView(p,true);const panel=await reviewCandidate(p);const before=await savedRow(p,topic.id);await noApproval(p);assert.match(await panel.textContent(),/候选仅供阅读/);await refusedAI(p,topic.id);await p.locator('#library-dialog-close').click();await editSaved(f);assert.deepEqual((await savedRow(p,topic.id)).candidate,before.candidate,'editing Current preserves the stored candidate');await openTopic(p,topic);await setAIView(p,true);await reviewCandidate(p);await eventually(async()=>await panel.getAttribute('data-candidate-state')==='stale');await noApproval(p);await quiet(f.h);}finally{await f.h.close();}}
});
test('VS-05 saved candidate and source evidence survive refused generation and human edits in source and release',{timeout:300000},async()=>{
 for(const variant of ['source','release']){const f=await fixture(variant,{candidate:true});try{const {p,topic}=f;const before=await authority(p);await setAIView(p,true);const panel=await reviewCandidate(p);await panel.locator('.ai-candidate-evidence').first().locator('summary').click();await panel.getByRole('button',{name:'阅读原话 1',exact:true}).first().click();const original=await savedRow(p,topic.id),evidenceId=original.candidate.proposal.evidenceEntryIds[0],entry=await rpc(p,'GET_LIBRARY_ENTRY',{id:evidenceId}),body=p.locator('#original-reading-body [data-entry-id="'+evidenceId+'"] [data-entry-field="body"]');await eventually(async()=>await p.locator('#library-dialog').evaluate(n=>!n.open)&&await body.isVisible()&&await body.evaluate(n=>document.activeElement===n),'actual evidence action closes candidate review and focuses the original qualified Entry');assert.equal(await body.textContent(),entry.body);assert.match(entry.body,/SYNTHETIC 原始思想/);assert.equal(await p.locator('#original-reading-body .topic-section').count(),1);await refusedAI(p,topic.id);assert.deepEqual(await authority(p),before);await quiet(f.h);}finally{await f.h.close();}}
});
test('VS-05 all six authored AI lists and deliberately empty overview survive hidden panes in source and release',{timeout:300000},async()=>{
 for(const variant of ['source','release']){
  const f=await fixture(variant);
  try{
   const {p,topic}=f;await p.evaluate(installSavedAIDiagnostic);const initial=await savedRow(p,topic.id);await setAIView(p,true);
   for(const details of await p.locator('#ai-reading-body details').all())if(!await details.evaluate(n=>n.open))await details.locator('summary').click();
   const fields=['keyInformation','preferences','decisions','judgments','openQuestions','possibleEvolution'];
   for(const key of fields){
    const field=p.locator(`#ai-reading-body [data-ai-field="${key}"]`).first(),disclosure=field.locator("xpath=ancestor::details[1]");
    if(await disclosure.count()&&!await disclosure.evaluate(n=>n.open))await disclosure.locator(":scope>summary").click();
    await field.fill('SYNTHETIC 人工 '+key+'\n<literal> 👩‍💻 é');await field.press('Tab');
    await eventually(async()=>(await savedRow(p,topic.id))[key][0].text.includes('人工'));
   }
   await editSaved(f,'');const before=await savedRow(p,topic.id);
   assert.equal(before.revision,initial.revision+7,'six authored lists and one empty overview each commit exactly once');
   for(const key of fields)assert.equal(before[key][0].text,'SYNTHETIC 人工 '+key+'\n<literal> 👩‍💻 é');
   for(let i=0;i<2;i++){await setAIView(p,false);await setAIView(p,true);}
   await openTopic(p,topic);await setAIView(p,true);
   assert.deepEqual(await savedRow(p,topic.id),before,'collapsed and reopened fields retain all text/newlines and deliberate empty string without new revisions');
   const evidence=await savedAIEvidence(f,variant);assert.equal(evidence.journal.length,7);assert.equal(new Set(evidence.journal.map(row=>row.operationId)).size,7);await persistSavedAIEvidence(evidence);await proveHeldSavedAIOwner(f,variant);await proveLateSavedAIPublication(f,variant);await quiet(f.h);
  }catch(error){await failSavedAI(error,f,variant);}finally{await f.h.close();}
 }
});

for(const variant of ['source','release'])test(`D7 saved candidate preserves literal text and reading preferences without approval controls (${variant})`,{timeout:180000},async()=>{
 const f=await fixture(variant,{candidate:true});try{const {p,topic}=f;await setAIView(p,true);const panel=await reviewCandidate(p);const texts=await panel.locator('.entry-prose').allTextContents(),before=await savedRow(p,topic.id);assert.equal(texts.length,16);assert.ok(texts.every(text=>text.includes('<literal> 👩‍💻 é')));await screenshotMatrix(p,'candidate-readonly',variant);for(const fontSize of ['small','standard','large','xlarge']){await rpc(p,'UPDATE_PREFERENCES',{changes:{fontSize}});await noApproval(p);assert.deepEqual(await panel.locator('.entry-prose').allTextContents(),texts);}assert.deepEqual(await savedRow(p,topic.id),before);await quiet(f.h);}finally{await f.h.close();}
});
