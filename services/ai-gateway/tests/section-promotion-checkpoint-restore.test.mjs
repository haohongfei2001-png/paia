import test from 'node:test';
import assert from 'node:assert/strict';
import {maintenanceSectionPromotionSourceFixture} from './maintenance-section-promotion-source-fixture.mjs';
import {getMaintenanceSectionPromotion} from '../../../extension/core/ai-usage/local-maintenance-session.js';
import {releaseMaintenanceSectionPromotionOffer} from '../../../extension/core/ai-usage/maintenance-section-promotion-session.js';
import {SectionPromotionCheckpoints,readSectionPromotionRecoveryLocator,assertSectionPromotionRecoveryLocatorSnapshot} from '../../../extension/core/ai-usage/section-promotion-checkpoint.js';
import {BackupService} from '../../../extension/core/backup-service.js';
import {BackupService as HistoricalFileFixture} from '../../../extension/tests/harness/historical-backup.mjs';
import {exported,prepared} from '../../../extension/tests/harness/backup-v081.mjs';
import {OrganizerStore} from '../../../extension/core/organizer/store.js';
import {local} from '../../../extension/tests/harness/thought-m1.mjs';
import {IDBFactory} from '../../../extension/tests/vendor/fake-indexeddb/build/esm/index.js';

const KEY='section-promotion-recovery-locators:v1';
const sender={tab:{id:4,windowId:2}};
const current=()=>true;
const meta=(store,key)=>store.repository.transaction(false,t=>t.get('meta',key),['meta']);
const snapshot=(store,cap)=>store.run(()=>store.repository.transaction(false,t=>assertSectionPromotionRecoveryLocatorSnapshot(cap,store,t),['meta']));

async function accepted(t){
 const f=await maintenanceSectionPromotionSourceFixture(t);await f.run();
 const selected={topicId:f.topic.id,sectionId:f.section.sectionId},offer=getMaintenanceSectionPromotion(f.session,f.s,selected);assert.ok(offer);
 const owner=new SectionPromotionCheckpoints(f.s),cap=await owner.accept(offer.owner,offer.handle,sender,current);
 releaseMaintenanceSectionPromotionOffer(offer.owner,f.s,offer.handle);
 const index=await meta(f.s,KEY),locator=readSectionPromotionRecoveryLocator(cap,f.s);
 assert.equal(index.rows.length,1);assert.equal(index.rows[0].operationId,locator.operationId);
 assert.match(locator.paidRequestHash,/^[a-f0-9]{64}$/);assert.match(index.rows[0].signature,/^[a-f0-9]{64}$/);
 assert.equal(await snapshot(f.s,cap),true);assert.equal(f.physical(),1);
 return {...f,owner,cap,index,selected,locator};
}

async function stagedRestore(store,items,mode){
 const service=new BackupService(store),stage=await prepared(service,items),preview=await service.previewRestore({sessionId:stage.sessionId,mode});
 assert.equal(preview.canRestore,true,preview.reason);
 return {service,request:{sessionId:stage.sessionId,mode,confirmation:preview.integrity,targetGeneration:preview.targetGeneration,...(mode==='replace'?{confirmReplace:true}:{confirmMerge:true})}};
}

test('real replace restore frees the accepted paid locator in its restore transaction and rejects its old allocation',async t=>{
 const f=await accepted(t),sentinel={id:'synthetic-unrelated-local-recovery',value:'keep this unrelated nonportable metadata'};
 await f.s.repository.transaction(true,t=>t.put('meta',sentinel),['meta']);
 // Only this existing synthetic-file encoder can export. The restore below is
 // the unchanged production BackupService entry, not its historical subclass.
 const exporter=new HistoricalFileFixture(f.s);assert.equal(await f.s.repository.transaction(false,tx=>exporter.project(tx,'organizationState',f.index)),null);
 // The paid fixture has intentionally synthetic nonportable Source rows. Use a
 // separate genuine empty library as the valid replacement file; the target
 // still holds the real paid HMAC locator being exercised.
 const incoming=new OrganizerStore(local(),{indexedDB:new IDBFactory()});t.after(()=>incoming.repository.close());await incoming.consent(true);await incoming.finishFoundation();
 const items=await exported(new HistoricalFileFixture(incoming));
 const {service,request}=await stagedRestore(f.s,items,'replace'),beforeEpoch=await meta(f.s,'recovery-restore-epoch');
 const transaction=f.s.repository.transaction.bind(f.s.repository);let deletedIn=null,epochIn=null,deletes=0;
 f.s.repository.transaction=(write,fn,...args)=>transaction(write,async scope=>{
  if(write){const remove=scope.delete.bind(scope),put=scope.put.bind(scope);
   scope.delete=async(table,key)=>{if(table==='meta'&&key===KEY){deletedIn=scope;deletes++;}return remove(table,key);};
   scope.put=async(table,row)=>{if(table==='meta'&&row.id==='recovery-restore-epoch')epochIn=scope;return put(table,row);};
  }
  return fn(scope);
 },...args);
 try{await service.restore(request);}finally{f.s.repository.transaction=transaction;}
 assert.notDeepEqual(await meta(f.s,'recovery-restore-epoch'),beforeEpoch);
 // Snapshot validation must observe the real restore before any lookup can
 // retire the shared in-memory allocation. A pure facts reader is not enough.
 await assert.rejects(snapshot(f.s,f.cap),e=>e.code==='STALE_BASE');
 assert.equal(await meta(f.s,KEY),undefined);assert.equal(deletes,1);assert.ok(deletedIn);assert.equal(deletedIn,epochIn);
 assert.deepEqual(await meta(f.s,sentinel.id),sentinel);
 let authorityCalls=0;const reopened=new SectionPromotionCheckpoints(f.s);
 assert.equal(await reopened.lookup(f.selected,sender,async()=>{authorityCalls++;},current),null);assert.equal(authorityCalls,0);
 assert.throws(()=>readSectionPromotionRecoveryLocator(f.cap,f.s),e=>e.code==='STALE_BASE');
 await assert.rejects(reopened.operation(f.locator.operationId,sender,async()=>{authorityCalls++;},current),e=>e.code==='UNAVAILABLE');
 assert.equal(authorityCalls,0);assert.equal(f.physical(),1);
});

test('real disjoint merge preserves the accepted paid locator and its original snapshot',async t=>{
 const f=await accepted(t),incoming=new OrganizerStore(local(),{indexedDB:new IDBFactory()});t.after(()=>incoming.repository.close());
 await incoming.consent(true);await incoming.finishFoundation();
 const entry=await incoming.createEntry({actor:'user',operationId:crypto.randomUUID(),body:'Synthetic disjoint merge entry',note:'',type:'idea',formation:'explicit',evidence:[]});
 const items=await exported(new HistoricalFileFixture(incoming)),{service,request}=await stagedRestore(f.s,items,'merge'),beforeEpoch=await meta(f.s,'recovery-restore-epoch');
 await service.restore(request);
 assert.ok(await f.s.repository.transaction(false,t=>t.get('thoughts',entry.id)));
 assert.deepEqual(await meta(f.s,KEY),f.index);assert.deepEqual(await meta(f.s,'recovery-restore-epoch'),beforeEpoch);
 assert.equal(await snapshot(f.s,f.cap),true);assert.equal(readSectionPromotionRecoveryLocator(f.cap,f.s).allocationId,f.locator.allocationId);assert.equal(f.physical(),1);
});

test('lookup never clears an unresolved or unverified original locator to reclaim capacity',async t=>{
 const f=await accepted(t);let authorityCalls=0;
 await assert.rejects(f.owner.lookup(f.selected,sender,async()=>{authorityCalls++;throw Object.assign(Error('current signed principal capability is unavailable'),{code:'UNAVAILABLE'});},current),e=>e.code==='UNAVAILABLE');
 assert.equal(authorityCalls,1);assert.deepEqual(await meta(f.s,KEY),f.index);
 const unverified=structuredClone(f.index);unverified.rows[0].signature='0'.repeat(64);
 await f.s.repository.transaction(true,t=>t.put('meta',unverified),['meta']);
 await assert.rejects(new SectionPromotionCheckpoints(f.s).lookup(f.selected,sender,async()=>{authorityCalls++;},current),e=>e.code==='STALE_BASE');
 assert.equal(authorityCalls,1);assert.deepEqual(await meta(f.s,KEY),unverified);assert.equal(f.physical(),1);
});

test('a late original acknowledgment cannot clear its old locator after the same database restore epoch changed',async t=>{
 const f=await accepted(t);await f.s.repository.transaction(true,tx=>tx.put('meta',{id:'recovery-restore-epoch',value:crypto.randomUUID()}),['meta']);
 await assert.rejects(f.owner.clear(f.cap,current),e=>e.code==='STALE_BASE');assert.deepEqual(await meta(f.s,KEY),f.index);assert.equal(f.physical(),1);
});
