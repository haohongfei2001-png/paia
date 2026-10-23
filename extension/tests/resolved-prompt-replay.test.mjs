import test from 'node:test';import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {BrowserNativeSyncCore,sealOperation} from '../core/browser-native-sync/core.js';
import {prepareGroupCheckpointPlan} from '../core/browser-native-sync/group-checkpoint-plan.js';
import {requireResolvedPromptReplayConflict} from '../core/browser-native-sync/resolved-prompt-replay.js';
import {PROMPT_REUSE_ROW} from '../core/prompt-reuse-preferences.js';
import {PROMPT_CORRECTION_NORMALIZER_VERSION} from '../core/browser-native-sync/prompt-correction-binding.js';
const denied={code:'BNS_GROUP_CAUSAL_GAP'},id='manual:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const prefs=text=>({id:PROMPT_REUSE_ROW,version:1,pins:[],overrides:[{id,text,hidden:false}],splits:[]});
async function fixture(t,{paired=true,heads=2}={}){const f=await setup(OrganizerStore);t.after(()=>f.s.repository.close());const core=new BrowserNativeSyncCore(f.s.repository,{datasetId:'SYNTHETIC_replay',deviceId:'SYNTHETIC_C'}),operations=[],prompts=[],companions=[];
 const seal=(type,value,device,sequence,parents=[])=>sealOperation({protocol:1,datasetId:core.datasetId,deviceId:device,sequence,operationId:crypto.randomUUID(),type,entityId:PROMPT_REUSE_ROW,codecVersion:1,kind:'put',actor:'user',parents,value});
 const binding=prompt=>({id:PROMPT_REUSE_ROW,version:1,normalizerVersion:PROMPT_CORRECTION_NORMALIZER_VERSION,bindings:[{familyId:id,kind:'manual',inputIds:[]}],promptRevisionId:prompt.revisionId});
 for(let i=0;i<heads;i++){const p=await seal('promptPreferences',prefs('SYNTHETIC '+i),'SYNTHETIC_'+i,1);prompts.push(p);operations.push(p);if(paired){const b=await seal('promptBinding',binding(p),'SYNTHETIC_'+i,2);companions.push(b);operations.push(b);}}
 const resolved=await seal('promptPreferences',prefs('SYNTHETIC resolved'),'SYNTHETIC_resolution',1,prompts.map(p=>p.revisionId));operations.push(resolved);if(paired)operations.push(await seal('promptBinding',binding(resolved),'SYNTHETIC_resolution',2,companions.map(p=>p.revisionId)));
 const plan=await prepareGroupCheckpointPlan(core,operations),group=type=>plan.groups.find(g=>g.id===(type==='promptPreferences'?prompts:companions)[1].revisionId),result=type=>({state:'conflict',revisions:(type==='promptPreferences'?prompts:companions).map(p=>p.revisionId)});return {core,plan,group,result,operations};}
for(const type of ['promptPreferences','promptBinding'])test(type+' exact complete paired two-head resolution admits only intermediate conflict',async t=>{const f=await fixture(t);assert.doesNotThrow(()=>requireResolvedPromptReplayConflict(f.core,f.plan,f.group(type),f.result(type)));});
for(const change of ['duplicate','foreign','pending','purged','missing'])test('refuses '+change+' intermediate result',async t=>{const f=await fixture(t),r=f.result('promptPreferences');if(change==='duplicate')r.revisions[1]=r.revisions[0];if(change==='foreign')r.revisions[1]='0'.repeat(64);if(change==='missing')r.revisions.pop();if(['pending','purged'].includes(change))r.state=change;assert.throws(()=>requireResolvedPromptReplayConflict(f.core,f.plan,f.group('promptPreferences'),r),denied);});
test('unpaired legacy resolution does not borrow the new paired exception',async t=>{const f=await fixture(t,{paired:false});assert.throws(()=>requireResolvedPromptReplayConflict(f.core,f.plan,f.group('promptPreferences'),f.result('promptPreferences')),denied);});
test('three-way history does not borrow finite two-head resolution',async t=>{const f=await fixture(t,{heads:3});assert.throws(()=>requireResolvedPromptReplayConflict(f.core,f.plan,f.group('promptPreferences'),f.result('promptPreferences')),denied);});
test('cloned plan or group cannot replace the original compilation identity',async t=>{const f=await fixture(t);assert.throws(()=>requireResolvedPromptReplayConflict(f.core,structuredClone(f.plan),f.group('promptPreferences'),f.result('promptPreferences')),{code:'BNS_GROUP_SCOPE_PROOF_REQUIRED'});assert.throws(()=>requireResolvedPromptReplayConflict(f.core,f.plan,structuredClone(f.group('promptPreferences')),f.result('promptPreferences')),denied);});
test('unresolved paired history remains rejected by the original compiler',async t=>{const f=await fixture(t);await assert.rejects(prepareGroupCheckpointPlan(f.core,f.operations.slice(0,-2)),{code:'BNS_CONFLICT_REQUIRES_RESOLUTION'});});

for(const type of ['promptPreferences','promptBinding'])test(type+' resolves two advancing branches only by distinct full-parent ancestry',async t=>{
 const f=await fixture(t),roots=f.operations.slice(0,4),oldPrompt=f.operations.at(-2),oldBinding=f.operations.at(-1),branchP=roots[0],branchB=roots[1];
 const advancedP=await sealOperation({...branchP,sequence:3,operationId:crypto.randomUUID(),parents:[branchP.revisionId],value:{...branchP.value,overrides:[{...branchP.value.overrides[0],text:'SYNTHETIC advanced'}]}}),advancedB=await sealOperation({...branchB,sequence:4,operationId:crypto.randomUUID(),parents:[branchB.revisionId],value:{...branchB.value,promptRevisionId:advancedP.revisionId}}),p=await sealOperation({...oldPrompt,parents:[advancedP.revisionId,roots[2].revisionId].sort()}),b=await sealOperation({...oldBinding,parents:[advancedB.revisionId,roots[3].revisionId].sort(),value:{...oldBinding.value,promptRevisionId:p.revisionId}}),plan=await prepareGroupCheckpointPlan(f.core,[...roots,advancedP,advancedB,p,b]),group=plan.groups.find(g=>g.id===(type==='promptPreferences'?roots[2]:roots[3]).revisionId);
 assert.doesNotThrow(()=>requireResolvedPromptReplayConflict(f.core,plan,group,f.result(type)));
 // Same-valued and same-family IDs are not ancestry, and crossed family IDs
 // cannot borrow the final resolver's proof.
 for(const ref of ['0'.repeat(64),type==='promptPreferences'?branchB.revisionId:branchP.revisionId])assert.throws(()=>requireResolvedPromptReplayConflict(f.core,plan,group,{state:'conflict',revisions:[ref,group.id]}),denied);
 const foreign=await sealOperation({...branchP,operationId:crypto.randomUUID(),deviceId:'SYNTHETIC_same_value'});assert.throws(()=>requireResolvedPromptReplayConflict(f.core,plan,group,{state:'conflict',revisions:[foreign.revisionId,group.id]}),denied);
});
test('complete Prompt resolution without its companion resolver cannot qualify a replay cut',async t=>{const f=await fixture(t);await assert.rejects(prepareGroupCheckpointPlan(f.core,f.operations.slice(0,-1)),{code:'BNS_CONFLICT_REQUIRES_RESOLUTION'});});
