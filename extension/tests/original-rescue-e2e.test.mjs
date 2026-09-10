import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {DeepSeekOrganizerProvider,DeepSeekSessionCredentials} from '../core/organizer/deepseek.js';
import {SimpleOriginalOrganizerRunner} from '../core/organizer/original-simple.js';

test('synthetic full chain reaches DeepSeek adapter, validates spans, commits local originals and advances once',async()=>{
 const f=await setup(OrganizerStore),epoch=(await f.s.status()).epoch;
 await f.s.capture({epoch,adapterVersion:'0.3.0',chat:{id:'m1-synthetic-chat',url:'https://chatgpt.com/c/m1-synthetic-chat',title:'Synthetic rescue'},messages:Array.from({length:4},(_,i)=>({sourceMessageId:'rescue-'+i,pageOrder:i+2,originalText:'Synthetic rescue thought '+i}))});
 const data={},session={get:async key=>({[key]:data[key]}),set:async row=>Object.assign(data,structuredClone(row)),remove:async key=>{delete data[key];}},credentials=new DeepSeekSessionCredentials(session);await credentials.configure({apiKey:'synthetic-key'});let calls=0,sent;const bodies=[],provider=new DeepSeekOrganizerProvider({limits:f.s.organizerBudget.limits,fetchImpl:async(_url,init)=>{calls++;sent=JSON.parse(init.body);bodies.push(sent);const request=JSON.parse(sent.messages[1].content);return {status:200,ok:true,text:async()=>JSON.stringify({choices:[{message:{content:JSON.stringify({items:request.inputs.map(input=>({inputRef:input.ref,topic:{proposedName:'Rescue topic'},section:{proposedName:'Timeline'},type:'reflection',relatedGroupingCandidate:null,spans:[],uncertain:false}))})}}]})};}}),runner=new SimpleOriginalOrganizerRunner(f.s,{provider,credentials}),result=await runner.wake();
 assert.equal(calls,1);
 assert.equal(sent.model,'deepseek-v4-flash');assert.equal(result.result.processedInputCount,5);assert.equal((await f.s.originalOrganizerStatus()).bootstrap.processed,5);const entries=await f.s.entryPage();assert.equal(entries.items.length,5);assert.ok(entries.items.every(x=>x.provenanceType==='input_original'&&x.type==='reflection'));
 const topics=await f.s.libraryIndexPage();assert.equal(topics.items.length,1);const document=await f.s.topicDocumentPage({topicId:topics.items[0].id,view:'original'});assert.equal(document.items.length,5);assert.ok(document.items.every(x=>x.entry.body.startsWith('Synthetic')));const receipts=await f.s.repository.transaction(false,t=>t.all('operationReceipts'));assert.equal(receipts.filter(x=>x.namespace==='original-simple-input').length,5);assert.equal(receipts.filter(x=>x.namespace==='original-simple').length,1);
 const replay=await new SimpleOriginalOrganizerRunner(f.s,{provider,credentials}).wake();assert.equal(replay.pending,false);assert.equal(calls,1);
});
