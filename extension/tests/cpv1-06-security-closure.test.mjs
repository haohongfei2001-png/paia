import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture,rows} from './harness/original-complete.mjs';
import {MemoryService} from '../core/memory/service.js';
import {PassportService} from '../core/passport.js';
import {ContextPackageService} from '../core/context-package-service.js';
import {BackupService} from '../core/backup-service.js';
import {exported,prepared} from './harness/backup-v081.mjs';

async function fixture(){
 const f=await completeFixture({texts:['EXPIRY_MATCH current authorized synthetic text']});
 let now=Date.parse('2026-09-20T00:00:00Z');
 const memory=new MemoryService(f.s,{clock:()=>now}),passport=new PassportService(f.s,{clock:()=>now}),service=new ContextPackageService(memory,passport,{clock:()=>now});
 await memory.ready();await memory.settings({externalAccess:true});
 const block=(await rows(f.s,'blocks'))[0].value,topic=await f.s.createTopic({name:'Expiry proof scope',operationId:crypto.randomUUID()});
 await f.s.addToTopics({kind:'input',id:block.id,expectedRevision:block.revision,topicIds:[topic.id],operationId:crypto.randomUUID()});
 await memory.authorize({topicIds:[topic.id],decision:'allowed'});
 return {...f,memory,passport,service,advance:ms=>{now+=ms;}};
}

for(const boundary of ['before reconstruction','after reconstruction'])test('VS06 expired grant refuses controlled release '+boundary+' without consumption or audit',async()=>{
 const f=await fixture(),grant=await f.passport.create({consumer:'chatgpt',purpose:'research',profileId:'default',duration:'7d'});
 f.advance(7*86400000-1000);
 const preview=await f.service.build({query:'EXPIRY_MATCH',profileId:'default',budget:'standard'});
 assert.ok(preview.items.length>0);
 await f.service.bind(preview.previewId,grant.grantId);
 const before=await rows(f.s,'records'),share=f.memory.share.bind(f.memory);let reconstructed=0;
 f.memory.share=async options=>{reconstructed++;const output=await share(options);assert.ok(output.text.includes('EXPIRY_MATCH'));f.advance(1000);return output;};
 if(boundary==='before reconstruction')f.advance(1000);
 for(const format of ['copy','markdown'])await assert.rejects(f.service.share({previewId:preview.previewId,grantId:grant.grantId,format}),{code:'MEMORY_DENIED'});
 assert.equal(reconstructed,boundary==='before reconstruction'?0:1);
 const status=await f.passport.status(),expired=status.grants.find(row=>row.grantId===grant.grantId);
 assert.equal(expired.state,'expired');assert.equal(expired.useCount,0);assert.equal(expired.lastUsedAt,null);assert.equal(expired.consumedAt,null);
 assert.equal(status.audits.length,0);assert.deepEqual(await rows(f.s,'records'),before);assert.equal(f.requests.length,0);
});

test('VS06 actual streamed Backup restore retains material and restrictions without reactivating source grants',async()=>{
 const f=await fixture();
 const active=await f.passport.create({consumer:'claude',purpose:'writing',profileId:'default',duration:'30d'});
 const revoked=await f.passport.create({consumer:'chatgpt',purpose:'research',profileId:'default',duration:'7d'});await f.passport.revoke(revoked.grantId);
 await f.memory.settings({externalAccess:false,localOnly:true});
 const before=await rows(f.s,'records'),sourceGrants=(await f.passport.status()).grants,items=await exported(new BackupService(f.s));
 assert.ok(items.length>1);assert.equal(JSON.stringify(items).includes(active.grantId),false);assert.equal(JSON.stringify(items).includes(revoked.grantId),false);
 const target=await completeFixture({texts:[]}),backup=new BackupService(target.s),staged=await prepared(backup,items);
 await backup.restore({sessionId:staged.sessionId,confirmation:staged.preview.integrity});
 const memory=new MemoryService(target.s);await memory.ready();const passport=new PassportService(target.s);
 assert.deepEqual((await passport.status()).grants,[]);
 for(const grant of sourceGrants)await assert.rejects(passport.resolve(grant.grantId,{profileId:'default'}),{code:'MEMORY_DENIED'});
 assert.deepEqual(await rows(f.s,'records'),before);assert.deepEqual((await f.passport.status()).grants,sourceGrants);
 const restored=await memory.status();assert.equal(restored.config.localOnly,true);assert.equal(restored.config.externalAccess,false);
 const originalBodies=before.map(row=>row.value.originalText).sort(),restoredBodies=(await rows(target.s,'records')).map(row=>row.value.originalText).sort();
 assert.deepEqual(restoredBodies,originalBodies);assert.equal(f.requests.length,0);assert.equal(target.requests.length,0);
});
