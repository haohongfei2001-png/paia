import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {ThoughtLibraryReadModel} from '../core/thought-library-read-model.js';
import {ThoughtSectionReading} from '../core/thought-section-reading.js';
import {ContinuousTopicReader,topicReaderReference} from '../ui/continuous-topic-reader.js';
import {stageTopicYearWindow,stageTopicYearExtent} from '../ui/topic-year-requalification.js';
const op=()=>crypto.randomUUID();
async function actual(run){
 const f=await setup(OrganizerStore);await f.s.finishFoundation();
 try{
  const s=f.s,topic=await s.createTopic({name:'SYNTHETIC retained annual extent',operationId:op()}),ids=[];
  for(const [year,count]of [[2023,109],[2021,55]])for(let i=0;i<count;i++){
   s.clock=()=>new Date(Date.UTC(year,0,1,12)+i*1000).toISOString();
   ids.push((await s.continueThinking({topicId:topic.id,body:year===2023&&i===10?'SYNTHETIC_LARGE_BODY '+'长表达'.repeat(18000):'SYNTHETIC_BODY_'+year+'_'+i,operationId:op()})).id);
  }
  s.clock=()=> '2019-01-01T12:00:00.000Z';const unknown=await s.continueThinking({topicId:topic.id,body:'SYNTHETIC_UNDATED_BODY',operationId:op()});
  await s.foundationWrite(async t=>{for(const row of await t.all('operationReceipts'))if(row.ownerId===unknown.id){delete row.result.independentExpression;await t.put('operationReceipts',row);}});
  const sectionId=(await s.libraryPlacement(topic.id,ids[0])).sectionId,reading=new ThoughtSectionReading(new ThoughtLibraryReadModel(s)),calls=[];
  const reader=new ContinuousTopicReader({load:async options=>{calls.push(structuredClone(options));return reading.page(options);}});
  reader.reset({topicId:topic.id,scopeSectionId:sectionId,sort:'desc',chronology:'expression'});
  await reader.initial();for(let i=0;i<30&&(reader.indexing||!reader.terminalNext);i++)await reader.next();
  await reader.openNextYear();for(let i=0;i<30&&(reader.indexing||!reader.terminalNext);i++)await reader.next();
  assert.equal(reader.items.length,164);assert.equal(reader.nextYear,'unknown');assert.equal(reader.state().retainedBodies,120);
  await run({s,reader,calls,topicId:topic.id,sectionId,unknown:unknown.id,reading});
 }finally{await f.s.repository.close();}
}
async function qualify(f){
 const {reader}=f,mounted=reader.protectedWindow(new Set()).map(index=>reader.items[index]),options={topicId:f.topicId,sectionId:f.sectionId,sort:reader.sort,recoveryEpoch:reader.recoveryEpoch,openedYears:reader.openedYears,readPrepared:(opts,current)=>reader.readPrepared(opts,current)};
 const staged=await stageTopicYearWindow({...options,items:mounted});assert.equal(staged.ok,true,staged.reason);
 const proofPages=[],start=f.calls.length,result=await stageTopicYearExtent({...options,extent:reader.items,staged,maxReferences:reader.maxReferences,readPrepared:async(opts,current)=>{const page=await reader.readPrepared(opts,current);proofPages.push({previousCursor:structuredClone(page.previousCursor??null),nextCursor:structuredClone(page.nextCursor??null),year:page.year});return page;}});
 return {staged,result,calls:f.calls.slice(start),proofPages};
}
function install(reader,result){
 const {items,sections,...state}=result;Object.assign(reader,state,{items,index:new Map(items.map((item,index)=>[item.entry.id,index])),sections:new Map(sections.map(section=>[section.sectionId,section]))});reader.bodyRevision++;reader.windowRevision++;
}
test('actual164 known refs survive window qualification and explicit unknown append becomes165 with at most120 bodies',()=>actual(async f=>{
 const before=structuredClone(f.reader.items),ids=before.map(item=>item.entry.id),{staged,result,calls,proofPages}=await qualify(f);
 assert.equal(staged.items.length,120);assert.equal(result.ok,true,result.reason);assert.equal(result.items.length,164);assert.equal(result.windowStart,44);
 assert.deepEqual(result.items.map(item=>item.entry.id),ids);assert.equal(result.items.filter(item=>!item.unloaded).length,120);assert.ok(result.items.some(item=>item.entry.large&&!Object.hasOwn(item.entry,'body')),'actual large placeholder stays unexpanded during whole-reference qualification');
 assert.ok(result.items.slice(0,44).every(item=>item.unloaded&&!Object.hasOwn(item.entry,'body')&&!Object.hasOwn(item.entry,'note')&&!Object.hasOwn(item.entry,'title')));
 assert.deepEqual(f.reader.items,before,'staging cannot mutate the live extent');assert.deepEqual(result.openedYears,[2023,2021]);
 assert.ok(calls.every(call=>call.limit<=40&&call.expectedReadGeneration===staged.generation&&[2023,2021].includes(call.year)),'reads only the previously opened exact years, under the fresh generation and original page bound');
 assert.deepEqual(result.previousCursor,proofPages[0].previousCursor,'global beginning uses the fresh original anchor response, not a mounted-window or old-generation cursor');assert.equal(result.terminalPrevious,!proofPages[0].previousCursor);assert.equal(result.terminalNext,true);assert.equal(result.nextYear,'unknown');
 install(f.reader,result);await f.reader.openNextYear();assert.equal(f.reader.items.length,165);assert.deepEqual(f.reader.items.map(item=>item.entry.id),[...ids,f.unknown]);assert.ok(f.reader.state().retainedBodies<=120);
 const snapshot=f.reader.snapshot(null);assert.equal(snapshot.extent.length,165);assert.ok(snapshot.extent.every(item=>!Object.hasOwn(item.entry,'body')));assert.doesNotMatch(JSON.stringify(snapshot),/SYNTHETIC_(?:BODY|UNDATED_BODY)/);
}));
test('actual human edit outside the mounted120 requalifies all164 refs and every cursor without replaying its old body',()=>actual(async f=>{
 const {reader,s}=f,old=structuredClone(reader.items),generation=reader.coverage.activeGeneration,entry=await s.entry(old[0].entry.id),oldCursors=new Set(reader.frontiers.flatMap(point=>[point.before,point.after]).filter(Boolean).map(value=>JSON.stringify(value)));
 await s.editEntry({id:entry.id,expectedRevision:entry.revision,changes:{body:'SYNTHETIC_CURRENT_OFFWINDOW_EDIT'},operationId:op()});
 const {staged,result,calls}=await qualify(f);assert.notEqual(staged.generation,generation);assert.equal(result.ok,true,result.reason);assert.equal(result.items.length,164);assert.equal(result.items[0].entry.revision,entry.revision+1);assert.equal(result.items[0].unloaded,true);assert.equal(Object.hasOwn(result.items[0].entry,'body'),false);assert.deepEqual(reader.items,old);
 assert.ok(calls.every(call=>call.expectedReadGeneration===staged.generation));assert.ok(calls.filter(call=>call.cursor).every(call=>!oldCursors.has(JSON.stringify(call.cursor))),'old opaque frontier is never relabelled with the new generation');
 install(reader,result);reader.moveWindowToStart();assert.equal(await reader.hydrateWindow(),true);assert.equal(reader.items[0].entry.body,'SYNTHETIC_CURRENT_OFFWINDOW_EDIT');assert.ok(reader.state().retainedBodies<=120);
}));

function synthetic(){
 const make=(n,year)=>({entry:{id:'entry-'+n,revision:1,lifecycle:'active',contentRevision:0,fieldRevisions:{body:0},bodyBinding:'thought',body:'SYNTHETIC body '+n},placement:{id:'placement-'+n,topicId:'topic',sectionId:'section',layoutGeneration:1,revision:1,rank:String(n).padStart(12,'0')},readingYear:year});
 const rows=Array.from({length:165},(_,i)=>make(i,i<109?2023:i<164?2021:'unknown')),extent=rows.map((row,i)=>i<45?topicReaderReference(row):structuredClone(row)),mounted=rows.slice(45).map(row=>structuredClone(row)),calls=[];
 const page=(items,year,fields={})=>({kind:'section_reading',topic:{id:'topic'},sections:[{sectionId:'section',topicId:'topic'}],items,year,recoveryEpoch:'epoch',authority:'authority',coverage:{activeGeneration:'fresh'},yearMetadata:{complete:true,pending:false},previousCursor:null,nextCursor:null,nextYear:year===2023?2021:year===2021?'unknown':null,...fields});
 let transform=(_page)=>_page,current=true;
 const read=async options=>{calls.push(structuredClone(options));const group=rows.filter(row=>row.readingYear===options.year),offset=options.cursor?Number(options.cursor.offset):options.anchorId?group.findIndex(row=>row.entry.id===options.anchorId):0,items=group.slice(offset,offset+options.limit),result=page(items,options.year,{previousCursor:offset?{year:options.year,offset:Math.max(0,offset-40)}:null,nextCursor:offset+options.limit<group.length?{year:options.year,offset:offset+options.limit}:null});return transform(result,options);};
 const staged={ok:true,items:mounted,generation:'fresh',coverage:{activeGeneration:'fresh'},recoveryEpoch:'epoch',pageMeta:{authority:'authority'}};
 const options={extent,staged,openedYears:[2023,2021,'unknown'],topicId:'topic',sectionId:'section',sort:'desc',recoveryEpoch:'epoch',readPrepared:read,isCurrent:()=>current,maxReferences:10000};
 return {rows,extent,staged,calls,page,options,transform(fn){transform=fn;},retire(){current=false;}};
}
for(const mutation of ['generation','restore','authority','membership','removed','inactive','duplicate','route','provider-error'])test('retained extent refuses '+mutation+' atomically instead of publishing a shortened old extent',async()=>{
 const f=synthetic(),before=structuredClone({extent:f.extent,staged:f.staged});let count=0;
 f.transform((page,options)=>{if(++count!==2)return page;if(mutation==='generation')return {...page,coverage:{activeGeneration:'later'}};if(mutation==='restore')return {...page,recoveryEpoch:'restored'};if(mutation==='authority')return {...page,authority:'other'};if(mutation==='membership')return {...page,items:page.items.map((item,i)=>i?item:{...item,placement:{...item.placement,sectionId:'sibling'}})};if(mutation==='removed')return {...page,items:page.items.slice(1)};if(mutation==='inactive')return {...page,items:page.items.map((item,i)=>i?item:{...item,entry:{...item.entry,lifecycle:'removed'}})};if(mutation==='duplicate')return {...page,items:[page.items[0],page.items[0]]};if(mutation==='route'){f.retire();return page;}throw Error('UNAVAILABLE');});
 const result=await stageTopicYearExtent(f.options);assert.equal(result.ok,false);assert.deepEqual(f.extent,before.extent);assert.deepEqual(f.staged,before.staged);
});
test('retained streaming refuses a newly populated unopened intermediate year',async()=>{
 const f=synthetic(),before=structuredClone(f.extent);f.transform(page=>page.year===2023?{...page,nextYear:2022}:page);const result=await stageTopicYearExtent(f.options);assert.equal(result.ok,false);assert.equal(result.reason,'window_year_gap_changed');assert.ok(f.calls.every(call=>call.year===2023));assert.deepEqual(f.extent,before);
});
test('fresh retained stream refuses a changed mounted body identity or inserted gap instead of mixing staged bodies',async()=>{
 for(const mutation of ['revision','gap']){const f=synthetic(),before=structuredClone(f.extent);f.transform(page=>{if(page.year!==2021)return page;if(mutation==='revision')return {...page,items:page.items.map((item,i)=>i?item:{...item,entry:{...item.entry,revision:2}})};return {...page,items:page.items.flatMap((item,i)=>i?[item]:[{...item,entry:{...item.entry,id:'new-gap'},placement:{...item.placement,id:'new-gap'}},item]).slice(0,40)};});const result=await stageTopicYearExtent(f.options);assert.equal(result.ok,false);assert.deepEqual(f.extent,before);}
});
test('final exact requalification cannot publish after a late restore or IME/navigation retirement',async()=>{
 for(const mutation of ['restore','route']){const f=synthetic();f.transform((page,options)=>{if(options.limit!==1)return page;if(mutation==='restore')return {...page,recoveryEpoch:'late-restore'};f.retire();return page;});assert.equal((await stageTopicYearExtent(f.options)).ok,false);}
});
test('retained metadata and native-body limits are independent and neither clips the preceding extent',async()=>{
 const f=synthetic(),before=structuredClone(f.extent);assert.equal((await stageTopicYearExtent({...f.options,maxReferences:120})).reason,'extent_limit');assert.deepEqual(f.extent,before);assert.equal(f.calls.length,0);
 const valid=synthetic(),result=await stageTopicYearExtent(valid.options);assert.equal(result.ok,true,result.reason);assert.equal(result.items.length,165);assert.equal(result.items.filter(item=>!item.unloaded).length,120);assert.equal(result.windowStart,45);assert.ok(valid.calls.every(call=>call.limit<=40));
});


test('legal smaller reader chunks keep their original metadata and native-window budgets',async()=>{
 const f=synthetic(),extent=f.rows.map((row,index)=>index<135?topicReaderReference(row):structuredClone(row)),staged={...f.staged,items:f.rows.slice(-30).map(row=>structuredClone(row))};
 const result=await stageTopicYearExtent({...f.options,extent,staged,chunk:10,maxItems:30,maxReferences:165});
 assert.equal(result.ok,true,result.reason);assert.equal(result.items.length,165);assert.equal(result.windowStart,135);assert.equal(result.items.filter(item=>!item.unloaded).length,30);assert.ok(f.calls.every(call=>call.limit<=10));
 for(const chunk of [0,41])assert.equal((await stageTopicYearExtent({...f.options,chunk})).ok,false);
 const bounded=synthetic();assert.equal((await stageTopicYearExtent({...bounded.options,chunk:1,maxReferences:120})).reason,'extent_limit');assert.equal(bounded.calls.length,0);
});

test('real new Entry arriving during retained streaming invalidates the captured generation without mutating the old reader',()=>actual(async f=>{
 const {reader}=f,options={topicId:f.topicId,sectionId:f.sectionId,sort:reader.sort,recoveryEpoch:reader.recoveryEpoch,openedYears:reader.openedYears},before=structuredClone(reader.items);
 const staged=await stageTopicYearWindow({...options,items:reader.protectedWindow().map(index=>reader.items[index]),readPrepared:(opts,current)=>reader.readPrepared(opts,current)});assert.equal(staged.ok,true,staged.reason);
 let first=true;const result=await stageTopicYearExtent({...options,extent:reader.items,staged,readPrepared:async(opts,current)=>{const page=await reader.readPrepared(opts,current);if(first){first=false;f.s.clock=()=> '2023-02-01T12:00:00.000Z';await f.s.continueThinking({topicId:f.topicId,sectionId:f.sectionId,body:'SYNTHETIC newly arriving current Entry',operationId:op()});}return page;}});
 assert.equal(result.ok,false);assert.deepEqual(reader.items,before);assert.equal(reader.coverage.activeGeneration,staged.generation);assert.deepEqual(reader.openedYears,[2023,2021]);
}));

for(const cycle of [false,true])test('empty retained pages obey the original bounded continuation owner'+(cycle?' and reject cycles':''),async()=>{
 const f=synthetic(),before=structuredClone(f.extent);let count=0;
 f.transform(page=>({...page,items:[],nextCursor:{empty:cycle?1:++count}}));
 // Keep the initial exact target proof, then exercise empty continuation only.
 let first=true;const original=f.options.readPrepared;f.options.readPrepared=async options=>{if(first){first=false;const result=await original(options);return {...result,items:f.rows.slice(0,40),nextCursor:{empty:1}};}return original({...options,cursor:null,anchorId:null});};
 const result=await stageTopicYearExtent(f.options);assert.equal(result.ok,false);assert.ok(f.calls.length<=22);assert.deepEqual(f.extent,before);
});
