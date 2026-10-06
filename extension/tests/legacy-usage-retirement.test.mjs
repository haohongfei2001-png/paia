import test from 'node:test';
import assert from 'node:assert/strict';
import {LegacyUsageRecords} from '../core/legacy-usage-records.js';

const fixture = initial => {
  const rows=new Map(initial),writes=[];
  const store={run:fn=>fn(),repository:{transaction:async(write,fn)=>fn({
    get:async(_,id)=>structuredClone(rows.get(id)),
    put:async(_,row)=>{assert.equal(write,true);writes.push(['put',row.id]);rows.set(row.id,structuredClone(row));},
    delete:async(_,id)=>{assert.equal(write,true);writes.push(['delete',id]);rows.delete(id);},
  })}};
  return {owner:new LegacyUsageRecords(store),rows,writes};
};
test('legacy statistics status never collects, prunes, creates or exposes counters',async()=>{
  const data={id:'product-signals:v1',enabled:true,daily:{'2020-01-01':{input_search:37}}};
  const {owner,rows,writes}=fixture([[data.id,data],['unrelated',{id:'unrelated',body:'SYNTHETIC retained body'}]]);
  assert.deepEqual(await owner.status(),{enabled:false,retired:true,hasHistory:true,legacyEnabled:true});
  assert.deepEqual(rows.get(data.id),data);assert.deepEqual(writes,[]);
  await assert.rejects(owner.settings({enabled:true}),{code:'FEATURE_UNAVAILABLE'});assert.deepEqual(writes,[]);
  await owner.settings({enabled:false});assert.deepEqual(rows.get(data.id),{...data,enabled:false});
  await owner.clear();assert.equal(rows.has(data.id),false);assert.equal(rows.get('unrelated').body,'SYNTHETIC retained body');
});
test('fresh archive privacy controls do not bootstrap a statistics product',async()=>{
  const {owner,rows,writes}=fixture([]);
  assert.deepEqual(await owner.status(),{enabled:false,retired:true,hasHistory:false,legacyEnabled:false});
  await owner.settings({enabled:false});assert.equal(rows.size,0);assert.deepEqual(writes,[]);
});
