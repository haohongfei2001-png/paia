import test from 'node:test';
import assert from 'node:assert/strict';
import {ImportLedger} from '../core/import/ledger.js';
import {blockIndex} from '../core/idb-repository.js';
import {TopicProcessingGuard} from '../core/topic-processing.js';
import {readFormationEvidence,validateFormationSources,sourceContributionSummary} from '../core/topic-formation-evidence.js';
import {formationFixture,assessment,citation,runFormation,rows,addInput,capture,inputEdit} from './harness/topic-03.mjs';

async function sourceSummary(f,cite){const guard=new TopicProcessingGuard(f.s,f.serviceOptions),p=await guard.prepare(f.scope),snapshot=await f.s.run(()=>f.s.repository.transaction(false,t=>readFormationEvidence(f.s,t,p)));await validateFormationSources(snapshot);return sourceContributionSummary(snapshot,cite?cite(snapshot):snapshot.inputs.map(x=>citation(x)));}
async function importRows(f,items){const ledger=new ImportLedger(f.s,{verifiedAdapters:['synthetic-topic-03']}),owner='synthetic-import-owner',g=await ledger.begin({fingerprint:'a'.repeat(64),adapterId:'synthetic-topic-03',consent:true},owner);await ledger.preflight({...g,sequence:0,rows:items},owner);await ledger.ready({...g,batches:1},owner);await ledger.commit({...g,sequence:0,rows:items},owner);await ledger.complete(g,owner);f.scope=(await rows(f.s,'inputStates')).map(row=>({inputId:row.id,role:'primary',selectedFields:['body']}));}
const imported=(text,messageId,chatId,time)=>({chatId,messageId,title:'Synthetic lineage source',text,role:'user',sent:true,contentType:'text',createTime:time,order:1,branch:'current',parentMessageId:null});

test('TOPIC-03 repeated spans, Source revisions, official reimports and edited summaries do not inflate one contribution',async()=>{
 const f=await formationFixture();await f.s.capture(capture((await f.s.status()).epoch));
 await f.s.capture(capture((await f.s.status()).epoch,'m1-synthetic-message-001','A revised version of the same synthetic work.'));f.scope=(await rows(f.s,'inputStates')).map(row=>({inputId:row.id,role:'primary',selectedFields:['body']}));
 await importRows(f,[imported('Synthetic explicit working input','m1-synthetic-message-001','m1-synthetic-chat','2020-01-01T00:00:00.000Z')]);
 const before=(await rows(f.s,'records')).length;await importRows(f,[imported('Synthetic explicit working input','m1-synthetic-message-001','m1-synthetic-chat','2020-01-01T00:00:00.000Z')]);assert.equal((await rows(f.s,'records')).length,before);
 assert.equal((await sourceSummary(f,snapshot=>snapshot.inputs.flatMap(input=>[citation(input),citation(input,'body',0,Math.min(10,input.fields.body.length))]))).contributions,1);
 await inputEdit(f.s,f.scope[0].inputId,{libraryText:'A synthetic summary of exactly the same underlying contribution.'});assert.equal((await sourceSummary(f)).contributions,1);
});
test('TOPIC-03 nonadjacent Source revisions A and C remain one contribution while B is outside scope',async()=>{
 const f=await formationFixture();await f.s.capture(capture((await f.s.status()).epoch,'m1-synthetic-message-001','Intermediate source revision B.'));await f.s.capture(capture((await f.s.status()).epoch,'m1-synthetic-message-001','Final source revision C.'));
 const records=await rows(f.s,'records'),middle=records.find(r=>r.value.originalText==='Intermediate source revision B.');assert.equal(records.length,3);f.scope=(await rows(f.s,'blocks')).filter(row=>!row.value.provenance.some(p=>p.sourceRecordId===middle.id)).map(row=>({inputId:row.id,role:'primary',selectedFields:['body']}));assert.equal(f.scope.length,2);assert.equal((await sourceSummary(f)).contributions,1);
});
test('TOPIC-03 copied Source content across different message IDs and contexts has one contribution and no fake diversity',async()=>{
 const f=await formationFixture();await addInput(f,{text:'Synthetic explicit working input',chat:'copied-conversation'});await addInput(f,{text:'Synthetic explicit working input',chat:'another-copy'});const result=await sourceSummary(f);assert.equal(result.contributions,1);assert.equal(result.contexts,0);assert.equal(result.dates,0);
});
test('TOPIC-03 merged A+B and separate A/B count two sources rather than three Inputs or repeated fragments',async()=>{
 const f=await formationFixture();await addInput(f,{text:'A different source discussing synthetic pricing terms.'});const [a,b]=await rows(f.s,'blocks'),id='synthetic-merged-input';
 // Hydrate supported legacy multi-Source provenance; the service itself has
 // neither a merge operation nor permission to invent a Source record.
 await f.s.foundationWrite(async t=>{const value={...a.value,id,originalTextReference:null,libraryText:'Synthetic explicit working input\nA different source discussing synthetic pricing terms.',provenance:[...a.value.provenance,...b.value.provenance],mergedSourceIds:[...a.value.provenance,...b.value.provenance].map(x=>x.sourceRecordId),provenanceSignature:JSON.stringify([...a.value.provenance,...b.value.provenance])},sourceRows=await Promise.all(value.provenance.map(async p=>(await t.get('records',p.sourceRecordId)).value));await t.put('blocks',{id,value});await t.put('blockIndex',blockIndex(value,100,sourceRows));await t.put('inputStates',{...(await t.get('inputStates',a.id)),id});});f.scope.push({inputId:id,role:'primary',selectedFields:['body']});
 assert.equal((await sourceSummary(f)).contributions,2);
 const mergedOnly={...f,scope:[f.scope.at(-1)]},partial=await sourceSummary(mergedOnly);assert.equal(partial.contributions,0);assert.equal(partial.unattributed,1);
 const exact=await sourceSummary(mergedOnly,s=>{const input=s.inputs[0],split=input.fields.body.indexOf('\n');return [citation(input,'body',0,split),citation(input,'body',split+1,input.fields.body.length)];});assert.equal(exact.contributions,2);
});
test('TOPIC-03 date diversity uses reliable Source sent time, never capture/import dates',async()=>{
 const f=await formationFixture();await importRows(f,[imported('Independent first dated contribution.','dated-synthetic-message-01','m1-synthetic-chat','2020-01-01T00:00:00.000Z'),imported('Independent second dated contribution.','dated-synthetic-message-02','m1-synthetic-chat','2020-02-01T00:00:00.000Z')]);const summary=await sourceSummary(f);assert.equal(summary.conversations,1);assert.equal(summary.dates,2);assert.equal(summary.contexts,2);
});
test('TOPIC-03 excluded, branch-review, malformed or missing Source lineage cannot become recurrence evidence',async()=>{
 for(const change of ['excluded','branch','hash','source']){
  const f=await formationFixture();if(change==='excluded')await f.s.excludeLibrary(f.scope[0].inputId,true);else await f.s.foundationWrite(async t=>{if(change==='branch'){const row=await t.get('blocks',f.scope[0].inputId);row.value.branchStatus='ambiguous';await t.put('blocks',row);}else{const [row]=await t.all('records');if(change==='hash'){row.value.contentHash='a'.repeat(64);await t.put('records',row);}else await t.delete('records',row.id);}});await assert.rejects(sourceSummary(f));assert.equal((await rows(f.s,'topics')).length,0);
 }
});
test('TOPIC-03 one Source with many Entries cannot satisfy repeated-subject admission',async()=>{
 const f=await formationFixture({decide:view=>{const value=assessment(view,{kind:'subject'});value.boundary.reason='sustained_subject';value.continuity.reason='recurring_subject';value.evidence=Array(6).fill(citation(view.inputs[0]));value.entries=[{span:citation(view.inputs[0],'body',0,9),type:'idea',additional:[]},{span:citation(view.inputs[0],'body',10,view.inputs[0].fields.body.length),type:'decision',additional:[]}];return value;}});const {result}=await runFormation(f);assert.equal(result.outcome,'candidate');assert.equal(result.lineage.contributions,1);assert.equal(result.entryIds.length,2);assert.equal((await rows(f.s,'topics')).length,0);assert.equal((await rows(f.s,'records')).length,1);
});
