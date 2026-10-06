import {assertRetiredContext} from './harness/retired-context.mjs';
import {reviewManualSelection} from './harness/manual-reviewed-selection.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture,rows,append} from './harness/original-complete.mjs';
import {MemoryService} from '../core/memory/service.js';
import {PassportService} from '../core/passport.js';
import {ContextPackageService} from '../core/context-package-service.js';
import {AI_FIELDS} from '../core/organizer/ai-contract.js';
import {hashText} from '../core/dedupe.js';
const op=()=>crypto.randomUUID();
async function setup(texts=['CONTAINER_INPUT_CANARY']){
 const f=await completeFixture({texts}),memory=new MemoryService(f.s),service=new ContextPackageService(memory,new PassportService(f.s));await memory.ready();
 let state=await service.manual({action:'create'},'container-tab');
 return {...f,memory,service,get state(){return state;},async call(action,options={}){const next=await service.manual({action,selectionId:state.selectionId,generation:state.generation,...options},'container-tab');state=next;return next;}};
}
async function topic(f,name){return f.s.createTopic({name,operationId:op()});}
async function entry(f,text){return f.s.createEntry({operationId:op(),actor:'user',body:text,type:'idea',formation:'explicit',evidence:[]});}
async function place(f,group,id){
 const e=await f.s.entry(id),t=await f.s.topic(group.id),result=await f.s.placeEntry({operationId:op(),entryId:id,topicId:group.id,expectedEntryRevision:e.revision,expectedTopicRevision:t.organizationRevision});
 assert.equal(result.conflict,undefined);return result;
}
async function sourceGroups(f){return (await rows(f.s,'libraryDocuments')).map(r=>({kind:'conversation',id:r.id}));}
test("Current retirement / historical scenario: VS06 whole Conversation crosses member pages, fixes every version and releases exact full text",async()=>{
 await assertRetiredContext({"owner": "package", "method": "manual", "action": "addContainers", "variant": "allowed", "long": true});
});
test("Current retirement / historical scenario: VS06 multiple Topics retain all paged Thoughts, authored note and cached AI fields without duplicating shared members",async()=>{
 await assertRetiredContext({"owner": "package", "method": "manual", "action": "addContainers", "variant": "allowed"});
});
test("Current retirement / historical scenario: VS06 whole-container over-200 refusal is atomic and never admits a prefix",async()=>{
 await assertRetiredContext({"owner": "package", "method": "manual", "action": "addContainers", "variant": "excluded", "long": true});
});
test("Current retirement / historical scenario: VS06 explicit member removal is declared in group coverage and membership removal invalidates it",async()=>{
 await assertRetiredContext({"owner": "package", "method": "manual", "action": "remove", "variant": "removed"});
});
test("Current retirement / historical scenario: VS06 one denied whole-group member blocks release and purges its transient bytes",async()=>{
 await assertRetiredContext({"owner": "package", "method": "manual", "action": "share", "variant": "denied"});
});
test("Current retirement / historical scenario: VS06 group chooser paginates metadata only and rejects malformed or cross-kind cursors",async()=>{
 await assertRetiredContext({"owner": "package", "method": "manual", "action": "containers", "variant": "allowed"});
});
test("Current retirement / historical scenario: VS06 Topic note provenance and revision are checked without inventing historical authorship",async()=>{
 await assertRetiredContext({"owner": "package", "method": "manual", "action": "addContainers", "variant": "edited"});
});
