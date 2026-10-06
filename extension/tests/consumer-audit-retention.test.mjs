import test from 'node:test';
import assert from 'node:assert/strict';
import {retainedContextFixture,durableRows} from './harness/retired-context.mjs';
import {PassportService,passportAuditId,PASSPORT_AUDIT_RETENTION_DAYS,PASSPORT_AUDIT_LIMIT} from '../core/passport.js';
const now=Date.parse('2026-10-07T00:00:00Z');
const audit=(id,at)=>({id:passportAuditId(at,id),kind:'audit',version:1,auditId:id,grantId:null,consumer:'manual',purpose:'current_task',resourceScope:'profile',profileId:'default',permission:'context_export',action:'manual_copy',createdAt:at});
test('Retiring Context retains the existing audit expiry without collecting new events or clearing user records',async()=>{
 const f=await retainedContextFixture(),passport=new PassportService(f.s,{clock:()=>now});
 const expired=audit('historical-expired',new Date(now-(PASSPORT_AUDIT_RETENTION_DAYS+1)*86400000).toISOString()),recent=audit('historical-recent',new Date(now-86400000).toISOString());
 await f.s.repository.transaction(true,async t=>{await t.put('meta',expired);await t.put('meta',recent);});
 const before=await durableRows(f.s),result=await passport.status(),after=await durableRows(f.s);
 assert.deepEqual(result.audits,[recent]);assert.deepEqual(after,{...before,meta:before.meta.filter(row=>row.id!==expired.id)});assert.equal(result.grants.length,1);assert.equal(result.grants[0].state,'active');
});
test('Audit expiry keeps the existing bounded cap and does not trim Product Signals history',async()=>{
 const f=await retainedContextFixture(),passport=new PassportService(f.s,{clock:()=>now});
 const rows=Array.from({length:PASSPORT_AUDIT_LIMIT+3},(_,i)=>audit('old-'+i,new Date(now-100000+i).toISOString()));
 await f.s.repository.transaction(true,async t=>{for(const row of rows)await t.put('meta',row);});
 const before=await durableRows(f.s);await passport.status();const after=await durableRows(f.s),removed=new Set(rows.slice(0,3).map(row=>row.id));
 assert.deepEqual(after,{...before,meta:before.meta.filter(row=>!removed.has(row.id))});
});
