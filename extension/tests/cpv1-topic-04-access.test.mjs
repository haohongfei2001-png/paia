import test from 'node:test';
import assert from 'node:assert/strict';
import {MemoryService} from '../core/memory/service.js';
import {key,policy,validateMemoryRow} from '../core/memory/model.js';
import {ManualSectionPromotionService} from '../core/topic-promotion-manual.js';
import {restoreSectionPromotion} from '../core/topic-promotion-history.js';
import {promotionFixture,request,confirmed,promote,rows,op,topic,snapshot} from './harness/topic-04.mjs';
async function share(f){const b=await topic(f.s,'Previously allowed other object'),e=await f.s.entry(f.entryIds[0]);await f.s.placeEntry({entryId:e.id,topicId:b.id,expectedEntryRevision:e.revision,expectedTopicRevision:0,operationId:op()});await f.s.foundationWrite(t=>t.put('meta',{id:key('topic','default',b.id),kind:'topic',version:1,profileId:'default',topicId:b.id,decision:'allowed',layoutGeneration:1}));return b;}
async function restrict(f,topicId,sectionId,kind,profileId='default'){await f.s.foundationWrite(t=>t.put('meta',kind==='section'?{id:key('section',topicId,sectionId),kind:'section',version:1,topicId,sectionId,excluded:true}:{id:key('topic',profileId,topicId),kind:'topic',version:1,profileId,topicId,decision:kind,layoutGeneration:1}));}
const grants=f=>rows(f.s,'meta').then(rows=>rows.filter(r=>r.id.startsWith('memory:')));
async function paths(f,profileId='default'){const memory=new MemoryService(f.s);return f.s.repository.transaction(false,async t=>{const topics=new Map((await t.all('topics')).map(row=>[row.id,row])),p=policy((await t.all('meta')).filter(r=>r.id.startsWith('memory:')),profileId,{},topics);return memory.permittedPaths(t,f.entryIds[0],topics,p);});}

for(const mode of ['ai','manual'])for(const kind of ['denied','never','section'])test('TOPIC-04 '+mode+' activation preserves restrictive '+kind+' path despite another allowed membership',async()=>{
 const f=await promotionFixture();await share(f);await restrict(f,f.parent.id,f.section.sectionId,kind);assert.equal((await paths(f)).length,0);const before=await snapshot(f.s),access=await grants(f);let work;
 if(mode==='ai'){work=await confirmed(f);await f.service.stage(work.workId);await assert.rejects(f.service.activate(work.workId));}
 else{const m=new ManualSectionPromotionService(f.s),h=await m.prepare({topicId:f.parent.id,sectionId:f.section.sectionId,selection:'whole_section',name:'User name',operationId:op()});work=await m.confirm(h,{confirmed:true});await m.stage(work.workId);await assert.rejects(m.activate(work.workId));}
 assert.equal((await paths(f)).length,0);assert.deepEqual(await snapshot(f.s),before);assert.deepEqual(await grants(f),access);
});

for(const side of ['before','after'])for(const kind of ['denied','never','section'])test('TOPIC-04 history '+side+' preserves a subsequently added restrictive '+kind+' edge',async()=>{
 const f=await promotionFixture();await share(f);let {result}=await promote(f);if(side==='after')result=await restoreSectionPromotion(f.s,{historyOperationId:result.historyOperationId,side:'before',operationId:op()});const id=side==='before'?result.id:f.parent.id,section=side==='before'?result.defaultSectionId:f.section.sectionId;await restrict(f,id,section,kind);assert.equal((await paths(f)).length,0);const before=await snapshot(f.s),access=await grants(f);await assert.rejects(restoreSectionPromotion(f.s,{historyOperationId:result.historyOperationId,side,operationId:op()}));assert.equal((await paths(f)).length,0);assert.deepEqual(await snapshot(f.s),before);assert.deepEqual(await grants(f),access);
});

test('TOPIC-04 inactive/nondefault profile restrictions remain authoritative; ordinary default-off remains movable',async()=>{
 const f=await promotionFixture();await share(f);await restrict(f,f.parent.id,f.section.sectionId,'denied','inactive-profile');const work=await confirmed(f);await f.service.stage(work.workId);const before=await snapshot(f.s);await assert.rejects(f.service.activate(work.workId));assert.deepEqual(await snapshot(f.s),before);assert.equal((await paths(f,'inactive-profile')).length,0);
 const g=await promotionFixture();await share(g);const access=await grants(g);assert.equal((await paths(g)).length,1);const {result}=await promote(g);assert.equal((await paths(g)).length,1);assert.deepEqual(await grants(g),access);assert.equal(policy(access,'default').decision(result.id),'default');
});

for(const kind of ['topic','section'])test('TOPIC-04 restrictive '+kind+' fence beyond the first metadata page cannot be skipped',async()=>{
 const f=await promotionFixture();await share(f);await f.s.foundationWrite(async t=>{for(let i=0;i<125;i++)await t.put('meta',kind==='topic'?{id:key('topic','000-prefix-'+String(i).padStart(3,'0'),'unrelated'),kind:'topic',version:1,profileId:'000-prefix-'+String(i).padStart(3,'0'),topicId:'unrelated',decision:'allowed',layoutGeneration:1}:{id:key('section','000-prefix-'+String(i).padStart(3,'0'),'unrelated'),kind:'section',version:1,topicId:'000-prefix-'+String(i).padStart(3,'0'),sectionId:'unrelated',excluded:true});});await restrict(f,f.parent.id,f.section.sectionId,kind==='topic'?'never':'section');assert.ok((await grants(f)).every(validateMemoryRow));const work=await confirmed(f);await f.service.stage(work.workId);const before=await snapshot(f.s),access=await grants(f),write=f.s.foundationWrite.bind(f.s);let pages=0,visited=0;f.s.foundationWrite=fn=>write(async t=>{const page=t.primaryRangePage.bind(t);t.primaryRangePage=async(name,options)=>{const result=await page(name,options);if(name==='meta'&&options.prefix==='memory:'+kind+':'){pages++;visited+=result.rows.length;}return result;};return fn(t);});await assert.rejects(f.service.activate(work.workId));f.s.foundationWrite=write;assert.ok(pages>=2);assert.ok(visited>=126);assert.deepEqual(await snapshot(f.s),before);assert.deepEqual(await grants(f),access);assert.equal((await paths(f)).length,0);
});
