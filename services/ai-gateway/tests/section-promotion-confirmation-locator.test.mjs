import test from 'node:test';
import assert from 'node:assert/strict';
import {maintenanceSectionPromotionSourceFixture} from './maintenance-section-promotion-source-fixture.mjs';
import {getMaintenanceSectionPromotion} from '../../../extension/core/ai-usage/local-maintenance-session.js';
import {confirmMaintenanceSectionPromotionOffer} from '../../../extension/core/ai-usage/maintenance-section-promotion-session.js';
import {SectionPromotionCheckpoints} from '../../../extension/core/ai-usage/section-promotion-checkpoint.js';

test('original confirmation must reject its original accepted locator after that exact allocation is retired',async t=>{
 const f=await maintenanceSectionPromotionSourceFixture(t);await f.run();const offer=getMaintenanceSectionPromotion(f.session,f.s,{topicId:f.topic.id,sectionId:f.section.sectionId}),checkpoints=new SectionPromotionCheckpoints(f.s),locator=await checkpoints.accept(offer.owner,offer.handle,{tab:{id:4,windowId:2}},()=>true);
 const before=await f.s.repository.transaction(false,async tx=>({topics:await tx.all('topics'),receipts:await tx.all('operationReceipts'),work:await tx.all('organizerWorkItems')}));
 await checkpoints.clear(locator,()=>true);const ledger=structuredClone(f.server.saved());
 await assert.rejects(confirmMaintenanceSectionPromotionOffer(offer.owner,f.s,offer.handle,{confirmationLocator:locator}));
 assert.deepEqual(await f.s.repository.transaction(false,async tx=>({topics:await tx.all('topics'),receipts:await tx.all('operationReceipts'),work:await tx.all('organizerWorkItems')})),before);
 assert.equal(f.physical(),1);assert.deepEqual(f.server.saved(),ledger);
});
