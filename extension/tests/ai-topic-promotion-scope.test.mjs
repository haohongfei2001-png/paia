import test from 'node:test';
import assert from 'node:assert/strict';
import {promotionFixture,rows,op} from './harness/topic-04.mjs';
import {selectSectionPromotionScope,sectionPromotionScopeData,assertSectionPromotionScope,releaseSectionPromotionScope} from '../core/ai-usage/topic-promotion-scope.js';
import {readSectionPromotionServiceConfiguration} from '../core/ai-usage/topic-promotion-service-configuration.js';
const request=f=>({topicIds:[f.parent.id],entryIds:f.entryIds,inputs:f.scope.map(({inputId,selectedFields})=>({inputId,selectedFields}))});
const read=(f,fn)=>f.s.repository.transaction(false,fn),select=f=>read(f,t=>selectSectionPromotionScope(f.s,t,request(f)));

test('source selector captures only an exact complete bounded named Section without any writes',async()=>{
 const f=await promotionFixture({count:2}),before=await rows(f.s,'operationReceipts'),h=await select(f),data=sectionPromotionScopeData(h,f.s);
 assert.equal(data.candidates.length,1);assert.equal(data.candidates[0].count,2);assert.deepEqual(new Set(data.candidates[0].entryIds),new Set(f.entryIds));assert.deepEqual(await rows(f.s,'operationReceipts'),before);assert.equal(await read(f,t=>assertSectionPromotionScope(f.s,t,h)),true);
 assert.equal(sectionPromotionScopeData(h,{}),null);releaseSectionPromotionScope(h);assert.equal(sectionPromotionScopeData(h,f.s),null);
});
test('pre-grant selection never touches Input, Source, Entry body/title/note or Section labels',async()=>{
 const f=await promotionFixture(),h=await read(f,t=>{const get=t.get.bind(t);t.get=async(name,id)=>{assert.ok(!['blocks','records','inputStates'].includes(name));const row=await get(name,id);if(row&&['thoughts','topics','sections'].includes(name))for(const field of ['body','thoughtText','title','note','name'])Object.defineProperty(row,field,{get(){throw Error('UNGRANTED_TEXT_READ');},configurable:true});return row;};return selectSectionPromotionScope(f.s,t,request(f));});assert.equal(sectionPromotionScopeData(h,f.s).candidates.length,1);
});
test('a selected prefix never claims a larger whole Section',async()=>{
 const f=await promotionFixture({count:2}),r=request(f);r.entryIds=r.entryIds.slice(0,1);const h=await read(f,t=>selectSectionPromotionScope(f.s,t,r)),d=sectionPromotionScopeData(h,f.s);assert.equal(d.candidates.length,0);assert.equal(d.omitted[0].reason,'WHOLE_SECTION_NOT_SELECTED');
});
test('missing Input evidence, default Section and removed Entry stay explicit unavailable',async()=>{
 for(const kind of ['input','default','removed']){const f=await promotionFixture({defaultSection:kind==='default'}),r=request(f);if(kind==='input')r.inputs=[];if(kind==='removed')await f.s.repository.transaction(true,async t=>{const e=await t.get('thoughts',f.entryIds[0]);e.lifecycle='removed';await t.put('thoughts',e);});const h=await read(f,t=>selectSectionPromotionScope(f.s,t,r));assert.equal(sectionPromotionScopeData(h,f.s).candidates.length,0);assert.ok(sectionPromotionScopeData(h,f.s).omitted.length);}
});
for(const change of ['section','placement','dependency','entry','topic'])test('exact '+change+' metadata drift invalidates the original selection',async()=>{
 const f=await promotionFixture(),h=await select(f),d=sectionPromotionScopeData(h,f.s).candidates[0];await f.s.repository.transaction(true,async t=>{
  const [table,id]=change==='section'?['sections',d.section.id]:change==='placement'?['placements',d.placements[0].id]:change==='dependency'?['dependencies',d.dependencies[0].id]:change==='entry'?['thoughts',d.entryIds[0]]:['topics',d.topic.id];const row=await t.get(table,id);if(change==='dependency')row.status='invalid';else row.revision++;await t.put(table,row);
 });await assert.rejects(read(f,t=>assertSectionPromotionScope(f.s,t,h)),e=>e.code==='STALE_BASE');
});
test('unbounded caller sets and default-null source config never create proposal authority',async()=>{
 const f=await promotionFixture(),r=request(f);r.entryIds=Array.from({length:17},()=>op());await assert.rejects(read(f,t=>selectSectionPromotionScope(f.s,t,r)));assert.equal(readSectionPromotionServiceConfiguration({tier:'pro',assess:()=>true}),null);
});
