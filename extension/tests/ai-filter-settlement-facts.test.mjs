import test from 'node:test';
import assert from 'node:assert/strict';
import {filterMaintenanceFixture} from '../../services/ai-gateway/tests/maintenance-filter-fixture.mjs';
const options={scope:'synthetic-maintenance',contractVersion:'synthetic-aiu-1',routeVersion:'synthetic-maintenance-1'};
const snapshot=(s,transaction=s.repository.transaction.bind(s.repository))=>transaction(false,async t=>Object.fromEntries(await Promise.all(s.repository.stores.map(async n=>[n,await t.all(n)]))));
for(const decision of ['FILTER','KEEP','INSUFFICIENT'])for(const stage of (decision==='FILTER'?['ack','usage','job']:['ack','usage','job','counter']))for(const drift of ['candidate-source','candidate-working','candidate-keep','neighbor-source'])test('original Filter '+decision+' final '+stage+' fences '+drift,async()=>{
 const f=await filterMaintenanceFixture({decision}),handle=await f.session.prepare(options),transaction=f.s.repository.transaction.bind(f.s.repository);let reached=false,before;
 f.s.repository.transaction=async(write,fn,stores)=>{
  if(write&&f.filterState.decoded&&!reached)before=await snapshot(f.s,transaction);
  return transaction(write,async t=>{
   if(write&&f.filterState.decoded&&!reached){const put=t.put.bind(t);t.put=async(name,row,...rest)=>{
    const result=await put(name,row,...rest),selected=stage==='ack'?name==='organizerWorkItems'&&row.unit?.facet==='filter'&&row.state==='ACKNOWLEDGED':stage==='usage'?name==='organizerUsage'&&row.state==='COMMITTED':stage==='job'?name==='organizerJobs'&&row.state==='COMMITTED':name==='meta'&&row.id==='aiu:counters:v1';
    if(selected&&!reached){reached=true;
     if(drift==='candidate-keep'){const r=await t.get('filterInputs',f.candidate.id);r.filterOverride='keep';await put('filterInputs',r);}
     else if(drift==='candidate-working'){const r=await t.get('blocks',f.candidate.id);r.value.libraryText='SYNTHETIC final Working drift';await put('blocks',r);}
     else {const input=drift==='candidate-source'?f.candidate:f.neighbor,r=await t.get('records',input.originalTextReference);r.value.originalText='SYNTHETIC final Source drift';await put('records',r);}
    }return result;
   };}return fn(t);
  },stores);
 };
 try{const result=await f.session.run(handle);assert.equal(reached,true);assert.equal(result.state,'PARTIAL','final fact drift cannot claim committed exact Filter coverage');assert.deepEqual(await snapshot(f.s,transaction),before,'the entire original joined transaction must roll back');assert.equal(f.calls.length,1);assert.equal(f.filterState.decoded,1);}
 finally{f.s.repository.transaction=transaction;f.session.dispose();await f.s.repository.close();}
});
