import {assertRetiredContext} from './harness/retired-context.mjs';
import {reviewManualSelection} from './harness/manual-reviewed-selection.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture,rows} from './harness/original-complete.mjs';
import {MemoryService} from '../core/memory/service.js';
import {PassportService} from '../core/passport.js';
import {ContextPackageService} from '../core/context-package-service.js';
import {hashText} from '../core/dedupe.js';
const op=()=>crypto.randomUUID();
async function setup(texts=['EXPLICIT_FIXED_CANARY','SUPPLEMENT_QUERY_NEEDLE']){
 const f=await completeFixture({texts}),memory=new MemoryService(f.s),service=new ContextPackageService(memory,new PassportService(f.s));await memory.ready();
 const records=await rows(f.s,'records'),blocks=(await rows(f.s,'blocks')).map(r=>r.value).sort((a,b)=>texts.indexOf(records.find(r=>r.id===a.originalTextReference).value.originalText)-texts.indexOf(records.find(r=>r.id===b.originalTextReference).value.originalText)),refs=blocks.map(b=>({kind:'input',id:b.id,revision:b.revision}));
 let state=await service.manual({action:'create'},'retrieval-tab');
 return {...f,memory,service,blocks,refs,get state(){return state;},async call(action,options={}){const next=await service.manual({action,selectionId:state.selectionId,generation:state.generation,...options},'retrieval-tab');state=next;return next;}};
}
async function topicEntry(f,name,body){
 const topic=await f.s.createTopic({name,operationId:op()}),entry=await f.s.createEntry({actor:'user',body,type:'idea',formation:'explicit',evidence:[],operationId:op()});
 const current=await f.s.topic(topic.id);await f.s.placeEntry({topicId:topic.id,entryId:entry.id,expectedEntryRevision:entry.revision,expectedTopicRevision:current.organizationRevision,operationId:op()});
 return {topic,entry};
}
test("Current retirement / historical scenario: VS06 task retrieval retains irrelevant explicit material and records only explicitly admitted optional supplements",async()=>{
 await assertRetiredContext({"owner": "package", "method": "manual", "action": "suggest", "variant": "allowed"});
});
test("Current retirement / historical scenario: VS06 supplement admission refuses forged or superseded suggestions atomically",async()=>{
 await assertRetiredContext({"owner": "package", "method": "manual", "action": "admit", "variant": "allowed"});
});
test("Current retirement / historical scenario: VS06 reusable retrieval Profile constrains scope and never-use survives other Profile allowance",async()=>{
 await assertRetiredContext({"owner": "memory", "method": "profile", "action": "create", "variant": "never"});
});
test("Current retirement / historical scenario: VS06 temporary scope revocation removes supplement bytes and invalidates exact reviewed output",async()=>{
 await assertRetiredContext({"owner": "package", "method": "manual", "action": "share", "variant": "revoked"});
});
test("Current retirement / historical scenario: VS06 Profile revision never silently rebinds admitted supplement provenance",async()=>{
 await assertRetiredContext({"owner": "memory", "method": "profile", "action": "update", "variant": "edited"});
});
test("Current retirement / historical scenario: VS06 explicit whole-group selection promotes a former supplement without duplicating or dropping its full text",async()=>{
 await assertRetiredContext({"owner": "package", "method": "manual", "action": "addContainers", "variant": "allowed"});
});

test("Current retirement / historical scenario: VS06 unrelated portable writes cannot stale a fixed authorized suggestion",async()=>{
 await assertRetiredContext({"owner": "package", "method": "manual", "action": "suggest", "variant": "edited"});
});
test("Current retirement / historical scenario: VS06 current policy revocation still invalidates the old offer without admitting a prefix",async()=>{
 await assertRetiredContext({"owner": "package", "method": "manual", "action": "admit", "variant": "revoked"});
});
test("Current retirement / historical scenario: VS06 editing selection after search invalidates that offer even with unchanged archive bytes",async()=>{
 await assertRetiredContext({"owner": "package", "method": "manual", "action": "add", "variant": "edited"});
});
