import test from 'node:test';
import assert from 'node:assert/strict';
import {BudgetPolicy} from '../core/organizer/budget.js';
import {DEEPSEEK_MODEL,DeepSeekOrganizerProvider,DeepSeekSessionCredentials,requestFromInputProjection,validateDeepSeekResponse} from '../core/organizer/deepseek.js';
import {productionProviders} from '../core/organizer/contracts.js';

const limits=new BudgetPolicy().limits;
const request={requestId:'request-1',taskProfile:'original_classification',inputs:[{ref:'i0',role:'primary',text:'Synthetic working input'}],context:[],topicCandidates:[{id:'t0',name:'Synthetic',sections:[{id:'s0',name:'Notes'}]}],budget:{maxOutputBytes:limits.maxOutputBytes}};
const item={inputRef:'i0',topic:{existingTopicId:'t0'},section:{existingSectionId:'s0'},type:'idea',relatedGroupingCandidate:'g1',spans:[{start:0,end:9}],uncertain:false};
const classified={items:[item]};
const response=(body,status=200)=>({status,ok:status>=200&&status<300,json:async()=>body});

test('DeepSeek typed classification accepts only metadata and exact local span coordinates',()=>{
 const out=validateDeepSeekResponse('original_classification',classified,request,limits);assert.equal(out.items[0].spans[0].start,0);assert.equal(out.invalidItems.length,0);
 for(const extra of [{body:'forbidden rewrite'},{summary:'forbidden summary'}]){const partial=validateDeepSeekResponse('original_classification',{items:[{...item,...extra}]},request,limits);assert.equal(partial.items.length,0);assert.deepEqual(partial.invalidItems,[{inputRef:'i0',code:'INVALID_PROVIDER_OUTPUT'}]);}
 const badSpan=validateDeepSeekResponse('original_classification',{items:[{...item,spans:[{start:0,end:999}]}]},request,limits);assert.equal(badSpan.items.length,0);assert.equal(badSpan.invalidItems[0].inputRef,'i0');
});

test('DeepSeek contract isolates a bad item while preserving valid batch items',()=>{
 const multi={...request,inputs:[...request.inputs,{ref:'i1',role:'primary',text:'Second synthetic input'}]},output={items:[item,{...item,inputRef:'i1',body:'not allowed'}]},out=validateDeepSeekResponse('original_classification',output,multi,limits);assert.deepEqual(out.items.map(x=>x.inputRef),['i0']);assert.deepEqual(out.invalidItems,[{inputRef:'i1',code:'INVALID_PROVIDER_OUTPUT'}]);
});

test('existing BudgetPolicy bounds DeepSeek batches, context, output, concurrency and retries',()=>{assert.equal(limits.maxInputs,20);assert.equal(limits.maxContentBytes,32768);assert.equal(limits.maxContext,2);assert.equal(limits.maxOutputBytes,32768);assert.equal(limits.maxConcurrentJobs,1);assert.equal(limits.maxRetries,3);assert.ok(limits.timeoutMs>0);});

test('DeepSeek request adapter accepts only the InputProjectionGateway DTO shape',()=>{const dto=requestFromInputProjection({request:{requestId:'request-1',inputs:[{ref:'i0',role:'primary',fields:{body:'Synthetic working input'}}],topicCandidates:request.topicCandidates,budget:{maxOutputBytes:1}}},'original_classification');assert.deepEqual(dto.inputs,[{ref:'i0',role:'primary',text:'Synthetic working input'}]);assert.equal(Object.hasOwn(dto.inputs[0],'sourceRecordId'),false);});

test('DeepSeek AI presentation contract rejects unrelated evidence and keeps the generic registry empty',()=>{const ai={...request,taskProfile:'ai_synthesis'},out={topicId:'t0',blockSummary:'Synthetic summary',currentView:'Synthetic understanding',keyInformation:[],preferences:[],decisions:[],judgments:[],openQuestions:[],possibleEvolution:[],evidenceEntryIds:['i0']};assert.equal(validateDeepSeekResponse('ai_synthesis',out,ai,limits).topicId,'t0');assert.throws(()=>validateDeepSeekResponse('ai_synthesis',{...out,evidenceEntryIds:['unrelated']},ai,limits),{code:'INVALID_OUTPUT'});assert.deepEqual(productionProviders,[]);});

test('saving a session key is local, opaque and survives a worker restart',async()=>{const data={},session={get:async key=>({[key]:data[key]}),set:async row=>Object.assign(data,row),remove:async key=>{delete data[key];}},c=new DeepSeekSessionCredentials(session);assert.equal((await c.status()).hasCredential,false);const saved=await c.configure({apiKey:'synthetic-key-123'});assert.equal(saved.hasCredential,true);assert.equal(JSON.stringify(saved).includes('synthetic-key-123'),false);const restarted=new DeepSeekSessionCredentials(session);assert.deepEqual(await restarted.status(),saved);assert.equal((await restarted.acquire()).status,'ready');});

test('invalid key is not persisted and clear makes the provider unavailable',async()=>{const data={},session={get:async key=>({[key]:data[key]}),set:async row=>Object.assign(data,row),remove:async key=>{delete data[key];}},c=new DeepSeekSessionCredentials(session);await assert.rejects(c.configure({apiKey:'short'}),{code:'CREDENTIAL_FAILURE'});assert.deepEqual(data,{});await c.configure({apiKey:'synthetic-key-123'});await c.disable();assert.equal((await c.acquire()).status,'missing');assert.deepEqual(data,{});});

test('DeepSeek sends the approved v4 JSON-mode request and no source records',async()=>{let requestBody;const p=new DeepSeekOrganizerProvider({limits,fetchImpl:async(url,init)=>{assert.equal(url,'https://api.deepseek.com/chat/completions');requestBody=JSON.parse(init.body);return response({choices:[{message:{content:JSON.stringify(classified)}}]});}}),out=await p.execute(request,{credential:'synthetic-key'});assert.equal(DEEPSEEK_MODEL,'deepseek-v4-flash');assert.equal(requestBody.model,'deepseek-v4-flash');assert.deepEqual(requestBody.thinking,{type:'disabled'});assert.deepEqual(requestBody.response_format,{type:'json_object'});assert.equal(requestBody.max_tokens,2048);assert.match(requestBody.messages[0].content,/JSON/);assert.match(requestBody.messages[0].content,/"items"/);assert.equal(JSON.stringify(requestBody).includes('Source Record'),false);assert.equal(out.items[0].type,'idea');});

test('DeepSeek maps transport/status/output failures without retaining response details',async()=>{
 for(const [status,code] of [[400,'PROVIDER_BAD_REQUEST'],[401,'INVALID_CREDENTIAL'],[403,'INVALID_CREDENTIAL'],[404,'MODEL_NOT_AVAILABLE'],[429,'RATE_LIMITED'],[500,'PROVIDER_UNAVAILABLE'],[503,'PROVIDER_UNAVAILABLE']])await assert.rejects(new DeepSeekOrganizerProvider({limits,fetchImpl:async()=>response({},status)}).execute(request,{credential:'synthetic-key'}),{code});
 await assert.rejects(new DeepSeekOrganizerProvider({limits,fetchImpl:async()=>response({choices:[{message:{content:'not json'}}]})}).execute(request,{credential:'synthetic-key'}),{code:'INVALID_JSON'});
 await assert.rejects(new DeepSeekOrganizerProvider({limits:{...limits,maxOutputBytes:10},fetchImpl:async()=>response({choices:[{message:{content:JSON.stringify(classified)}}]})}).execute(request,{credential:'synthetic-key'}),{code:'INVALID_PROVIDER_OUTPUT'});
 await assert.rejects(new DeepSeekOrganizerProvider({limits,fetchImpl:async()=>{throw new Error('private network detail');}}).execute(request,{credential:'synthetic-key'}),{code:'NETWORK_ERROR'});
 await assert.rejects(new DeepSeekOrganizerProvider({limits,timeoutMs:5,fetchImpl:async()=>await new Promise(()=>{})}).execute(request,{credential:'synthetic-key'}),{code:'PROVIDER_TIMEOUT'});
 await assert.rejects(new DeepSeekOrganizerProvider({limits,timeoutMs:5,fetchImpl:async()=>({status:200,ok:true,headers:{get:()=>null},text:async()=>await new Promise(()=>{})})}).execute(request,{credential:'synthetic-key'}),{code:'PROVIDER_TIMEOUT'});
});
