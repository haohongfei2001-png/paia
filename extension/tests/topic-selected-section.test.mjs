import test from 'node:test';
import assert from 'node:assert/strict';
import {ContinuousTopicReader} from '../ui/continuous-topic-reader.js';
const row=i=>({entry:{id:'entry-'+i,revision:1,body:'Synthetic '+i},placement:{id:'p-'+i,sectionId:'selected',topicId:'topic',revision:1}});
test('selected Section qualification follows paging and evicted-window hydration, and saved positions never cross Sections',async()=>{
 const calls=[],rows=Array.from({length:160},(_,i)=>row(i));
 const load=async options=>{calls.push(options);assert.equal(options.scopeSectionId,'selected');const start=options.anchorId?Number(options.anchorId.slice(6)):options.cursor||0;return {topic:{id:'topic'},kind:'section_reading',items:rows.slice(start,start+40),sections:[{sectionId:'selected',topicId:'topic'}],coverage:{activeGeneration:'g'},recoveryEpoch:'initial',nextCursor:start+40<160?start+40:null};};
 const reader=new ContinuousTopicReader({load});reader.reset({topicId:'topic',scopeSectionId:'selected'});await reader.initial();while(!reader.terminalNext)await reader.next();reader.moveWindowToStart();assert.equal(await reader.hydrateWindow(),true);assert.ok(calls.some(call=>call.anchorId==='entry-0'));
 const snapshot=reader.snapshot({id:'entry-1',top:100});assert.equal(snapshot.scopeSectionId,'selected');assert.doesNotMatch(JSON.stringify(snapshot),/Synthetic/);
 const other=new ContinuousTopicReader({load});other.reset({topicId:'topic',scopeSectionId:'sibling'});assert.equal(other.restore(snapshot),false);
 other.reset({topicId:'topic',scopeSectionId:'selected'});assert.equal(other.restore(snapshot),true);
 snapshot.extent[0].placement.sectionId='sibling';assert.equal(other.restore(snapshot),false);
});
