import test from 'node:test';import assert from 'node:assert/strict';
import {IDBFactory,IDBKeyRange} from '../vendor/fake-indexeddb/build/esm/index.js';
import {LibraryDocumentsStore} from '../../core/library-documents-store.js';
import {local} from '../harness/thought-m1.mjs';
import {BrowserNativeSyncCore} from '../../core/browser-native-sync/core.js';
import {buildCheckpoint} from '../../core/browser-native-sync/checkpoints.js';
globalThis.IDBKeyRange=IDBKeyRange;
test('actual independent human graph writes canonical history and negative intent but has no portable Sync family',async()=>{
 const s=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory()});await s.consent(true);await s.finishFoundation();
 const entry=await s.createEntry({actor:'user',operationId:crypto.randomUUID(),body:'SYNTHETIC independent body',note:'SYNTHETIC note',type:'idea',formation:'explicit',evidence:[]});
 const topic=await s.createTopic({name:'SYNTHETIC Topic',operationId:crypto.randomUUID()});const named=await s.createSection({topicId:topic.id,expectedTopicRevision:(await s.topic(topic.id)).organizationRevision,title:'SYNTHETIC chapter',operationId:crypto.randomUUID()});
 let e=await s.entry(entry.id),t=await s.topic(topic.id);const placed=await s.placeEntry({entryId:e.id,topicId:t.id,sectionId:named.sectionId,expectedEntryRevision:e.revision,expectedTopicRevision:t.organizationRevision,operationId:crypto.randomUUID()});
 await s.placeEntry({entryId:e.id,topicId:t.id,remove:true,expectedEntryRevision:placed.revision,expectedTopicRevision:placed.topicRevision,expectedPlacementRevision:placed.placementRevision,operationId:crypto.randomUUID()});
 const data=await s.repository.transaction(false,async tx=>({entry:await tx.get('thoughts',entry.id),sections:await tx.all('sections'),placements:await tx.all('placements'),history:await tx.all('revisions'),receipts:await tx.all('operationReceipts')}));
 assert.ok(data.entry.organizationIntents.excluded.includes(topic.id));assert.equal(data.placements[0].lifecycle,'removed');assert.equal(data.sections.length,2);assert.equal(data.sections.filter(x=>x.isDefault).length,1);assert.ok(data.history.some(x=>x.kind==='placement'&&x.reason==='remove'));assert.ok(data.receipts.length>=5);
 const core=new BrowserNativeSyncCore(s.repository,{datasetId:'synthetic-human-audit',deviceId:'synthetic-audit'});const out=[];for await(const op of core.outbox())out.push(op);assert.deepEqual(out,[]);
 await assert.rejects(buildCheckpoint(core,{putImmutable(){throw Error('should not publish');},get(){throw Error('should not download');}},{grouped:{store:s}}),{code:'BNS_GROUP_CANONICAL_UNREPRESENTED'});
});
