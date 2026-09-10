import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture,rows} from './harness/original-complete.mjs';
import {organizerControls,setOrganizerControls} from '../core/organizer/controls.js';
import {sourceFaithfulSummary} from '../core/organizer/source-summary.js';
const op=()=>crypto.randomUUID();
test('time projection sorts within Sections, paginates and never rewrites human placements',async()=>{
 const f=await completeFixture({texts:['虚构九月完整判断','虚构八月最初判断','修正：虚构七月疑问','虚构十月后续判断']});await f.runner.wake({userActionId:op()});
 await f.s.foundationWrite(async t=>{for(const r of await t.all('records')){r.value.sourceSentAt='2026-'+(r.value.originalText.includes('九月')?'09':r.value.originalText.includes('八月')?'08':r.value.originalText.includes('七月')?'07':'10')+'-01T00:00:00Z';await t.put('records',r);}for(const p of await t.all('placements'))await t.put('placements',{...p,orderProtection:true});});
 const topic=(await rows(f.s,'topics'))[0],before=await rows(f.s,'placements'),all=[];let cursor=null;
 do{const page=await f.s.topicDocumentPage({topicId:topic.id,sort:'asc',limit:1,cursor});all.push(...page.items);cursor=page.nextCursor;}while(cursor);
 for(const section of new Set(all.map(x=>x.placement.sectionId))){const group=all.filter(x=>x.placement.sectionId===section);assert.deepEqual(group.map(x=>x.entry.sourceSentAt),group.map(x=>x.entry.sourceSentAt).sort());}
 const asc=await f.s.topicDocumentPage({topicId:topic.id,sort:'asc'}),desc=await f.s.topicDocumentPage({topicId:topic.id,sort:'desc'});
 for(const section of asc.sections)assert.deepEqual(desc.items.filter(x=>x.placement.sectionId===section.sectionId).map(x=>x.entry.id),asc.items.filter(x=>x.placement.sectionId===section.sectionId).map(x=>x.entry.id).reverse());
 assert.deepEqual(await rows(f.s,'placements'),before);assert.equal(f.requests.length,1);
 const found=await f.s.topicDocumentPage({topicId:topic.id,sort:'asc',query:'九月'});assert.equal(found.items.length,1);assert.match(found.items[0].entry.body,/九月/);
 const sections=await f.s.topicDocumentPage({topicId:topic.id,sort:'asc',query:'思考过程'});assert.equal(sections.items.length,3);
 const e=found.items[0].entry;await f.s.editLibraryFields({id:e.id,expectedRevision:e.revision,expectedFieldRevisions:e.fieldRevisions,changes:{note:'检索备注合成'},operationId:op()});assert.equal((await f.s.topicDocumentPage({topicId:topic.id,sort:'desc',query:'检索备注'})).items.length,1);
});
test('reading preferences persist locally, backwards-compatible with old controls',async()=>{const f=await completeFixture();assert.equal((await organizerControls(f.s)).readingSort,'asc');await setOrganizerControls(f.s,{readingSort:'desc',libraryView:'ai'});assert.equal((await organizerControls(f.s)).readingSort,'desc');assert.equal((await organizerControls(f.s)).libraryView,'ai');assert.equal(f.requests.length,0);await assert.rejects(()=>setOrganizerControls(f.s,{readingSort:'random'}));});
test('representative summary is extractive, prefers user work and meaningful recent text',()=>{const old={id:'a',body:'旧的第一句话',createdAt:'2026-01-01'},recent={id:'b',body:'这是一条新的完整想法，保留来源并验证每个决定。',createdAt:'2026-09-01'},edited={id:'c',body:'我确认先把阅读体验做好，再扩展复杂功能。',userEdited:true};assert.equal(sourceFaithfulSummary([old,recent]),recent.body);assert.equal(sourceFaithfulSummary([old,recent,edited]),edited.body);assert.equal(sourceFaithfulSummary([{body:'短句'}]),'短句');});

test('300 Entry Topic is bounded to 40 bodies, page complete, directory jump and changed-time cursor fence',async()=>{
 const f=await completeFixture({texts:[]}),topic=await f.s.createTopic({name:'虚构的长篇阅读',operationId:op()});let revision=0;const sections=[];
 for(const title of ['最初问题','逐步验证','后续思考']){const section=await f.s.createSection({topicId:topic.id,expectedTopicRevision:revision,title,operationId:op()});revision=section.topicRevision;sections.push(section.sectionId);}
 for(let i=0;i<300;i++){const e=await f.s.createEntry({actor:'user',formation:'explicit',evidence:[],operationId:op(),body:`第 ${i} 条合成长期思考，记录当时的疑问与后来的证据。`,title:'',note:'',type:'idea'});const t=await f.s.topic(topic.id);await f.s.placeEntry({entryId:e.id,topicId:t.id,sectionId:sections[Math.floor(i/100)],expectedEntryRevision:e.revision,expectedTopicRevision:t.organizationRevision,operationId:op()});}
 const start=performance.now(),first=await f.s.topicDocumentPage({topicId:topic.id,sort:'asc'});assert.equal(first.items.length,40);assert.equal(first.matchCount,300);assert.ok(JSON.stringify(first).length<256*1024);const ids=[],pages=[];let cursor=null;
 do{const page=await f.s.topicDocumentPage({topicId:topic.id,sort:'asc',cursor});assert.equal(page.cursorInvalid,undefined);assert.ok(page.items.length<=40);ids.push(...page.items.map(x=>x.entry.id));pages.push(page);cursor=page.nextCursor;}while(cursor);
 assert.equal(ids.length,300);assert.equal(new Set(ids).size,300);assert.equal(pages.length,8);const jump=await f.s.topicDocumentPage({topicId:topic.id,sort:'asc',cursor:first.sectionStarts[sections[2]]});assert.equal(jump.items[0].placement.sectionId,sections[2]);
 await f.s.foundationWrite(async t=>{const e=await t.get('thoughts',ids[0]);await t.put('thoughts',{...e,createdAt:'2099-01-01T00:00:00Z'});});assert.equal((await f.s.topicDocumentPage({topicId:topic.id,sort:'asc',cursor:first.nextCursor})).cursorInvalid,true);assert.equal(f.requests.length,0);assert.ok(performance.now()-start<10000);
});
