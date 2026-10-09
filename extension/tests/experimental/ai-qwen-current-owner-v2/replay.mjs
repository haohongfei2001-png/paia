// Reuse approved algorithm, never its historical owner admission or optional fallback.
import assert from 'node:assert/strict';
import {loadTopic,addPhase,replayPhase,protectedRefusal,unknownAttemptNoReplay,saved,rows} from '../ai-qwen-offline/replay.mjs';
import {readCurrentArtifacts,requireFrozenOwners} from './artifacts.mjs';
const suites=new WeakMap();const ids=Object.freeze(['SYN-T01','SYN-T02','SYN-T03']);
export async function openCurrentSuite(){const data=await readCurrentArtifacts();const cap=Object.freeze({});suites.set(cap,data);return cap;}
async function sameOwners(data){assert.deepEqual(await requireFrozenOwners(),data.currentOwners,'OWNER_CONTRACT_CHANGED_DURING_REPLAY');}
function dataFor(cap){const data=suites.get(cap);assert.ok(data,'CURRENT_SUITE_REQUIRED');return data;}
export function closeCurrentSuite(cap){suites.delete(cap);}
export async function replayShort(cap,id,style){
 const data=dataFor(cap);assert.ok(ids.includes(id)&&data.corpus.modes.includes(style));await sameOwners(data);
 const f=await loadTopic(data,id,style);try{const phase=f.definition.phases[0];assert.equal(f.definition.phases.length,1);await addPhase(f,phase);const result=await replayPhase(f,phase);
  const current=await saved(f);assert.ok(current);assert.equal(current.projection.currentView,f.definition.entries.filter(e=>e.lifecycle==='active').map(e=>e.body).join('\n'));
  const entryReadback=[];for(const [corpusId,item]of f.entries){const entry=await f.store.entry(item.id);assert.equal(entry.body,item.definition.body);entryReadback.push({corpusId,revision:entry.revision});}
  assert.equal(result.state,'COMMITTED');assert.equal(result.quality,'NOT_RUN');assert.equal(f.calls,1);assert.equal(result.children.length,1);assert.equal(result.sourceRecords,0);assert.equal(result.workingBlocks,0);await sameOwners(data);
  return {result,evidenceDigest:f.receipts[0].evidenceDigest,entryReadback,compatibility:'ACTUAL_NAMED_FIXTURE_READBACK_ONLY',quality:'NOT_RUN'};
 }finally{f.store.repository.close();}
}
export async function protectedControl(cap){const data=dataFor(cap);await sameOwners(data);const f=await loadTopic(data,'SYN-T02','original');try{await addPhase(f,f.definition.phases[0]);await replayPhase(f,f.definition.phases[0]);const result=await protectedRefusal(f);assert.equal(result.newAttempts,0);assert.equal(result.newProviderCalls,0);await sameOwners(data);return result;}finally{f.store.repository.close();}}
export async function unknownControl(cap){const data=dataFor(cap);await sameOwners(data);const f=await loadTopic(data,'SYN-T01','original');try{const phase=f.definition.phases[0];await addPhase(f,phase);const result=await unknownAttemptNoReplay(f,phase);assert.equal(result.attemptCount,1);assert.equal(result.providerCalls,1);assert.equal(result.acknowledged,0);assert.equal(result.candidate,false);await sameOwners(data);return result;}finally{f.store.repository.close();}}
