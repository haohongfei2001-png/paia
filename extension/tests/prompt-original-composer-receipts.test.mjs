import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
const contractURL=new URL(process.env.PAIA_INSERTION_RECEIPT_MODULE||'../background/prompt-insertion-receipts.js',import.meta.url);
const {PromptInsertionReceipts,PROMPT_INSERTION_RUNTIME,promptInsertionDigest,validPromptInsertionEnvelope}=await import(contractURL);

const source=await readFile(new URL('../adapter/chatgpt-composer.js',import.meta.url),'utf8');
const flush=async()=>{for(let i=0;i<8;i++)await new Promise(setImmediate);};
function events(){const listeners=new Map();return {addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);},removeEventListener(type,fn){listeners.get(type)?.delete(fn);},emit(type,event){for(const fn of [...listeners.get(type)||[]])fn(event);}};}
function fixture({adapterSource=source,draft='SYNTHETIC draft',offset=4,accepted=true,trusted=true,caret=true,mutate=true}={}){
 let originalActionCount=0,registrationDomain='5'.repeat(64),retirementSummary={domainDigest:'5'.repeat(64),retiredEpochFloor:0,retiredRanges:[]},now=0,remainingMs=30000,qualified=true,acceptAck=true,retiredAck=false,rpcHandler=null,protocolHandler=null,ownerToken=webcrypto.randomUUID(),recoveryToken=webcrypto.randomUUID();
 let registrationHandler=null;const settledOperations=new Set();
 const domainDigest='5'.repeat(64),receiver={tabId:7,windowId:1,documentId:'synthetic-real-top-document'},receiptEpoch=webcrypto.randomUUID();
 const timers=[],commands=[],messages=[],listeners=new Set(),location={origin:'https://chatgpt.com',href:'https://chatgpt.com/c/synthetic-original'};
 let hold=false,commandResolve;const commandEntered=new Promise(resolve=>commandResolve=resolve);
 const document={...events(),activeElement:null};
 const root={nodeType:1,tagName:'HTML',parentElement:null};
 const node={...events(),nodeType:1,tagName:'DIV',isConnected:true,isContentEditable:true,parentElement:root,querySelector:()=>null,closest:()=>null,getClientRects:()=>[{}],getBoundingClientRect:()=>({width:500,height:100}),contains(value){return value===this||value===text;},focus(){document.activeElement=this;},classList:{contains:()=>false}};
 const text={nodeType:3,data:draft,parentNode:node,parentElement:node};node.childNodes=[text];
 let range;
 const logical=(container,n)=>container===text?n:n?text.data.length:0;
 function makeRange(){return {startContainer:text,endContainer:text,startOffset:0,endOffset:0,setStart(container,n){this.startContainer=container;this.startOffset=n;},collapse(){this.endContainer=this.startContainer;this.endOffset=this.startOffset;},compareBoundaryPoints(_,other){return Math.sign(logical(this.startContainer,this.startOffset)-logical(other.startContainer,other.startOffset));}};}
 range=makeRange();range.setStart(text,offset);range.collapse();
 const selection={rangeCount:1,getRangeAt:()=>range,removeAllRanges(){this.rangeCount=0;},addRange(value){range=value;this.rangeCount=1;}};
 Object.assign(document,{documentElement:root,defaultView:{...events(),getComputedStyle:()=>({display:'block',visibility:'visible',contentVisibility:'visible',opacity:'1'})},querySelectorAll:()=>[node],createRange:makeRange,getSelection:()=>selection,execCommand(command,_,insertion){commands.push({command,insertion});commandResolve();const at=logical(range.startContainer,range.startOffset);if(mutate){text.data=text.data.slice(0,at)+insertion+text.data.slice(at);if(caret){range=makeRange();range.setStart(text,at+insertion.length);range.collapse();}}const event={isTrusted:trusted,inputType:'insertText',isComposing:false,target:node};node.emit('input',event);document.emit('input',event);return accepted;}});
 const context=vm.createContext({document,location,crypto:webcrypto,TextEncoder,queueMicrotask,performance:{now:()=>now},setTimeout(fn){if(hold)timers.push(fn);else queueMicrotask(fn);},chrome:{runtime:{id:'synthetic-extension',onMessage:{addListener:fn=>listeners.add(fn),removeListener:fn=>listeners.delete(fn)},sendMessage:async message=>{messages.push(structuredClone(message));if(protocolHandler&&message.type.startsWith('PAIA_PROMPT_INSERTION_'))return protocolHandler(structuredClone(message));if(message.type==='PAIA_PROMPT_INSERTION_RECEIVER_REGISTER'){const response={ok:true,data:{registered:true,version:1,ownerToken,recoveryToken:message.recoveryToken??ownerToken,domainDigest:registrationDomain,receiver:{...receiver,nonce:message.nonce}}};return registrationHandler?registrationHandler(message,response):response;}if(message.type==='PAIA_PROMPT_INSERTION_QUALIFY')return {ok:true,data:{qualified:(typeof qualified==='function'?await qualified(message):qualified)&&!settledOperations.has(message.envelope.operationId),remainingMs}};if(message.type==='PAIA_PROMPT_INSERTION_RECONCILE')return {ok:true,data:{ownerToken,recoveryToken,retirementSummary,results:await Promise.all(message.acks.map(async ack=>{const settled=!retiredAck&&(typeof acceptAck==='function'?await acceptAck({ack}):acceptAck);if(settled)settledOperations.add(ack.envelope.operationId);return {claimId:ack.envelope.claimId,...(retiredAck?{settled:false,retired:true}:{settled})};}))}};
 if(message.type==='PAIA_PROMPT_INSERTION_ACK'){const settled=!retiredAck&&(typeof acceptAck==='function'?await acceptAck(message):acceptAck);if(settled)settledOperations.add(message.ack.envelope.operationId);return {ok:true,data:retiredAck?{settled:false,retired:true}:{settled}};}if(rpcHandler)return rpcHandler(message);return {ok:false};}}}});
 const reload=()=>vm.runInContext(adapterSource,context);reload();
 const adapter=()=>new context.PAIAChatGPTComposerAdapter({document,location});
 const dispatch=(message,sender={id:'synthetic-extension'})=>new Promise(resolve=>{let answered=false,async=false;for(const listener of [...listeners]){if(listener(message,sender,value=>{answered=true;resolve(value);})===true)async=true;}if(!answered&&!async)resolve(undefined);});
 const admitted=async({lane='manual',epoch=1,receiptEpoch:token=receiptEpoch,domainDigest:domain=domainDigest,operationId=webcrypto.randomUUID(),text='SYNTHETIC receipt insertion',fields={}}={})=>{
  const actionId=webcrypto.randomUUID();recoveryToken=actionId;if(originalActionCount>=500){ownerToken=webcrypto.randomUUID();originalActionCount=0;}originalActionCount++;
  if(domain!==registrationDomain){registrationDomain=domain;ownerToken=webcrypto.randomUUID();originalActionCount=1;retirementSummary={domainDigest:domain,retiredEpochFloor:0,retiredRanges:[]};}
  const {nonce}=await dispatch({type:'PAIA_PROMPT_INSERTION_RECEIVER_PROBE',version:1,recoveryToken});
  const message={type:{manual:'PAIA_PROMPT_INSERT_SELECTED',assist:'PAIA_PROMPT_ASSIST_INSERT',next:'PAIA_PROMPT_NEXT_INSERT'}[lane],operationId,text,url:location.href,...fields};
  const envelope={version:1,claimId:webcrypto.randomUUID(),actionId,operationId,receiptEpoch:token,domainDigest:domain,epoch,lane,receiver:{...receiver,nonce},sourceDigest:'1'.repeat(64),authorizationDigest:'2'.repeat(64),initiatorDigest:'3'.repeat(64)};
  envelope.digest=await promptInsertionDigest({domain:'paia-prompt-insertion-v1',envelope,message});
  assert.equal(validPromptInsertionEnvelope(envelope),true);
  return {...message,insertionReceipt:envelope};
 };
 return {document,node,text,context,adapter,reload,commands,commandEntered,messages,location,selection,dispatch,probe:()=>dispatch({type:'PAIA_PROMPT_INSERTION_RECEIVER_PROBE',version:1,recoveryToken}),admitted,receiptEpoch,domainDigest,setRegistration(fn){registrationHandler=fn;},setRpc(fn){rpcHandler=fn;},setProtocol(fn){protocolHandler=fn;},setSummary(value){retirementSummary=value;},qualification(value){qualified=value;},advance(ms){now+=ms;},budget(ms){remainingMs=ms;},acceptAck(value){acceptAck=value;},retiredAck(value){retiredAck=value;},changeOwnerToken(){ownerToken=webcrypto.randomUUID();originalActionCount=0;recoveryToken=webcrypto.randomUUID();return ownerToken;},setNativeTrusted(value){trusted=value;},insert(adapter,message,extra={}){return adapter.insert({text:message.text,operationId:message.operationId,url:message.url,lane:message.insertionReceipt.lane,insertionMessage:message,...extra});},hold(){hold=true;},async release(){hold=false;for(const fn of timers.splice(0))fn();await flush();},request(fields={}){return {text:'SYNTHETIC insertion',operationId:webcrypto.randomUUID(),url:location.href,...fields};}};
}

test('independently re-evaluated original adapter shares one physical inventory across three lanes and disposal',async()=>{
 const f=fixture(),first=f.adapter(),constructor=f.context.PAIAChatGPTComposerAdapter;f.acceptAck(false);const request=await f.admitted();
 f.hold();const pending=f.insert(first,request);await f.commandEntered;f.reload();assert.equal(f.context.PAIAChatGPTComposerAdapter,constructor);
 const second=f.adapter(),third=f.adapter();first.dispose();const duplicate=f.insert(second,request);await f.release();
 assert.equal((await pending).status,'inserted');assert.equal((await duplicate).replayed,true);assert.equal(f.commands.length,1);
 second.dispose();f.reload();assert.equal((await f.insert(third,request)).replayed,true);assert.equal(f.commands.length,1);
 assert.equal(Object.hasOwn(first,'attempts'),false);assert.equal(Object.hasOwn(first,'state'),false);
});

test('different original lanes serialize the native transaction rather than three independent busy flags',async()=>{
 const f=fixture(),first=f.adapter(),second=f.adapter(),one=await f.admitted(),two=await f.admitted({lane:'assist'});f.hold();const pending=f.insert(first,one);await f.commandEntered;
 assert.equal((await f.insert(second,two)).reason,'busy');assert.equal(f.commands.length,1);await f.release();assert.equal((await pending).status,'inserted');
});

for(const [name,options] of [['accepted',{accepted:false}],['trusted input',{trusted:false}],['caret',{caret:false}],['exact readback',{mutate:false}]])test('original native verification still refuses unproved '+name,async()=>{
 const f=fixture(options),adapter=f.adapter(),message=await f.admitted(),result=await f.insert(adapter,message);assert.notEqual(result.status,'inserted');assert.equal(f.commands.length,1);
});

test('the original model preserves selected draft, exact Unicode and line breaks without a send command',async()=>{
 const f=fixture({draft:'prefix suffix',offset:7}),adapter=f.adapter(),request=await f.admitted({text:'你好\n🙂'}),result=await f.insert(adapter,request);
 assert.equal(result.status,'inserted');assert.equal(result.verified,true);assert.equal(f.text.data,'prefix 你好\n🙂suffix');assert.deepEqual(f.commands,[{command:'insertText',insertion:'你好\n🙂'}]);
});

test('shared IME fence and lane disposal cannot authorize a new native edit',async()=>{
 const f=fixture(),first=f.adapter(),second=f.adapter(),message=await f.admitted();f.document.emit('compositionstart',{target:f.node});first.dispose();
 assert.equal((await f.insert(second,message)).reason,'composition_active');assert.equal(f.commands.length,0);
});

for(const lane of ['manual','assist','next'])test('original '+lane+' attempt returns and publishes an exact body-free native receipt',async()=>{
 const f=fixture(),adapter=f.adapter();f.acceptAck(false);const message=await f.admitted({lane}),result=await f.insert(adapter,message);await flush();
 assert.equal(result.status,'inserted');assert.equal(result.insertionAck.outcome,'inserted');assert.deepEqual(JSON.parse(JSON.stringify(result.insertionAck.envelope)),message.insertionReceipt);
 const published=f.messages.filter(r=>r.type==='PAIA_PROMPT_INSERTION_ACK');assert.equal(published.length,1);assert.equal(JSON.stringify(published).includes(message.text),false);assert.equal(JSON.stringify(published).includes(f.location.href),false);
 assert.equal((await f.dispatch({type:'PAIA_PROMPT_INSERTION_RECEIPT_READ',version:1,envelope:message.insertionReceipt})).outcome,'inserted');assert.equal(f.commands.length,1);
});

test('duplicate and read-only receipt retrieval preserve the original attempt after draft changes and independent re-evaluation',async()=>{
 const f=fixture(),first=f.adapter();f.acceptAck(false);const message=await f.admitted();const initial=await f.insert(first,message);f.text.data='SYNTHETIC unrelated replacement';first.dispose();f.reload();const second=f.adapter();
 const duplicate=await f.insert(second,message);assert.equal(duplicate.replayed,true);assert.deepEqual(JSON.parse(JSON.stringify(duplicate.insertionAck)),JSON.parse(JSON.stringify(initial.insertionAck)));assert.equal(f.commands.length,1);
 assert.equal((await f.dispatch({type:'PAIA_PROMPT_INSERTION_RECEIPT_READ',version:1,envelope:message.insertionReceipt})).outcome,'inserted');assert.equal(f.text.data,'SYNTHETIC unrelated replacement');
});

for(const field of ['text','lane','operationId','epoch','receiptEpoch','receiver','domainDigest','sourceDigest','authorizationDigest','initiatorDigest','extra'])test('original receiver rejects altered '+field+' before any new physical attempt',async()=>{
 const f=fixture(),adapter=f.adapter(),message=await f.admitted();await f.insert(adapter,message);const altered=structuredClone(message);
 if(field==='text')altered.text+=' changed';else if(field==='extra')altered.extra='not signed';else if(field==='receiver')altered.insertionReceipt.receiver.documentId='private-iframe-is-not-top';else if(field==='lane')altered.insertionReceipt.lane='assist';else if(field==='epoch')altered.insertionReceipt.epoch++;else if(['receiptEpoch','operationId'].includes(field))altered.insertionReceipt[field]=webcrypto.randomUUID();else altered.insertionReceipt[field]='4'.repeat(64);
 const result=await f.insert(adapter,altered);assert.equal(result.status,'failed');assert.equal(result.insertionAck,undefined);assert.equal(f.commands.length,1);
});

test('retired original authority refuses a valid old envelope without reclassifying current DOM equality',async()=>{
 const f=fixture(),adapter=f.adapter(),message=await f.admitted();f.text.data=message.text;f.qualification(false);const result=await f.insert(adapter,message);
 assert.equal(result.status,'failed');assert.equal(result.insertionAck,undefined);assert.equal(f.commands.length,0);assert.equal(await f.dispatch({type:'PAIA_PROMPT_INSERTION_RECEIPT_READ',version:1,envelope:message.insertionReceipt}),null);
});

test('original final lane qualification follows durable admission and refusal proves no physical entry',async()=>{
 const f=fixture(),adapter=f.adapter(),message=await f.admitted({lane:'assist'});let finalChecked=false;
 const result=await f.insert(adapter,message,{qualify:async()=>{assert.ok(f.messages.some(r=>r.type==='PAIA_PROMPT_INSERTION_QUALIFY'));finalChecked=true;return false;}});
 assert.equal(finalChecked,true);assert.equal(result.insertionAck.outcome,'not_inserted');assert.equal(f.commands.length,0);
});

for(const options of [{accepted:false},{trusted:false},{caret:false},{mutate:false}])test('post-command unproved outcome remains UNKNOWN rather than an inserted/no-write receipt '+JSON.stringify(options),async()=>{
 const f=fixture(options),adapter=f.adapter(),message=await f.admitted(),result=await f.insert(adapter,message);assert.equal(result.insertionAck.outcome,'unknown');assert.equal(f.commands.length,1);
});

test('public status DTOs cannot mint original receipts or substitute an old privately verified result',async()=>{
 const f=fixture(),adapter=f.adapter(),first=await f.admitted(),result=await f.insert(adapter,first);adapter.once=()=>result;adapter.attempts=new Map();adapter.state={};
 const next=await f.admitted({epoch:2});f.document.emit('compositionstart',{target:f.node});const refused=await f.insert(adapter,next);
 assert.equal(refused.insertionAck.outcome,'not_inserted');assert.equal(f.commands.length,1);
});

test('retirement preserves unacknowledged evidence across lane disposal and refuses old replay after pruning acknowledged records',async()=>{
 const f=fixture(),adapter=f.adapter();f.acceptAck(false);const pending=await f.admitted();await f.insert(adapter,pending);await flush();adapter.dispose();f.reload();const next=f.adapter();
 assert.equal((await f.dispatch({type:'PAIA_PROMPT_INSERTION_EPOCH_RETIRE',version:1,retiredEpochFloor:0,domainDigest:f.domainDigest,settledClaimIds:[],receiptEpoch:f.receiptEpoch,epoch:1})).retired,true);
 assert.equal((await f.dispatch({type:'PAIA_PROMPT_INSERTION_RECEIPT_READ',version:1,envelope:pending.insertionReceipt})).outcome,'inserted');assert.equal((await f.insert(next,pending)).status,'failed');
 f.acceptAck(true);const settled=await f.admitted({epoch:2});await f.insert(next,settled);await flush();await f.dispatch({type:'PAIA_PROMPT_INSERTION_EPOCH_RETIRE',version:1,retiredEpochFloor:0,domainDigest:f.domainDigest,settledClaimIds:[],receiptEpoch:f.receiptEpoch,epoch:2});
 assert.equal(await f.dispatch({type:'PAIA_PROMPT_INSERTION_RECEIPT_READ',version:1,envelope:settled.insertionReceipt}),null);assert.equal((await f.insert(next,settled)).status,'failed');assert.equal(f.commands.length,2);
});

test('sparse retirement does not invent retirement for lower gaps, and contiguous new epochs have no lifetime 500-attempt cap',async()=>{
 const f=fixture({draft:'',offset:0}),adapter=f.adapter();await f.dispatch({type:'PAIA_PROMPT_INSERTION_EPOCH_RETIRE',version:1,retiredEpochFloor:0,domainDigest:f.domainDigest,settledClaimIds:[],receiptEpoch:f.receiptEpoch,epoch:2});
 const gap=await f.admitted({epoch:1,text:'x'});assert.equal((await f.insert(adapter,gap)).status,'inserted');await flush();await f.dispatch({type:'PAIA_PROMPT_INSERTION_EPOCH_RETIRE',version:1,retiredEpochFloor:0,domainDigest:f.domainDigest,settledClaimIds:[],receiptEpoch:f.receiptEpoch,epoch:1});
 for(let epoch=3;epoch<=505;epoch++){const message=await f.admitted({epoch,receiptEpoch:webcrypto.randomUUID(),text:'x'});assert.equal((await f.insert(adapter,message)).status,'inserted');await flush();await f.dispatch({type:'PAIA_PROMPT_INSERTION_EPOCH_RETIRE',version:1,retiredEpochFloor:0,domainDigest:f.domainDigest,settledClaimIds:[],receiptEpoch:message.insertionReceipt.receiptEpoch,epoch});}
 assert.equal(f.commands.length,504);assert.equal((await f.insert(adapter,gap)).status,'failed');
});

test('receipt control messages reject page/foreign senders and cannot clear the physical inventory',async()=>{
 const f=fixture(),adapter=f.adapter();f.acceptAck(false);const message=await f.admitted();await f.insert(adapter,message);
 for(const sender of [{id:'other-extension'},{id:'synthetic-extension',tab:{id:7}}])assert.equal(await f.dispatch({type:'PAIA_PROMPT_INSERTION_EPOCH_RETIRE',version:1,retiredEpochFloor:0,domainDigest:f.domainDigest,settledClaimIds:[],receiptEpoch:f.receiptEpoch,epoch:1},sender),undefined);
 assert.equal((await f.insert(adapter,message)).replayed,true);assert.equal(f.commands.length,1);
});

test('retired receipt cannot downgrade to a legacy physical request after acknowledged cache reclamation',async()=>{
 const f=fixture(),adapter=f.adapter(),message=await f.admitted();await f.insert(adapter,message);await flush();
 await f.dispatch({type:'PAIA_PROMPT_INSERTION_EPOCH_RETIRE',version:1,retiredEpochFloor:0,domainDigest:f.domainDigest,receiptEpoch:f.receiptEpoch,epoch:1,settledClaimIds:[]});
 const {insertionReceipt,...legacy}=message;assert.equal((await adapter.insert(legacy)).status,'failed');assert.equal(f.commands.length,1);
});

test('durable exact terminal retirement confirmation recovers a lost separate ACK response without deleting UNKNOWN',async()=>{
 const f=fixture(),adapter=f.adapter();f.acceptAck(false);const message=await f.admitted();await f.insert(adapter,message);
 await f.dispatch({type:'PAIA_PROMPT_INSERTION_EPOCH_RETIRE',version:1,retiredEpochFloor:0,domainDigest:f.domainDigest,receiptEpoch:f.receiptEpoch,epoch:1,settledClaimIds:[message.insertionReceipt.claimId]});
 assert.equal(await f.dispatch({type:'PAIA_PROMPT_INSERTION_RECEIPT_READ',version:1,envelope:message.insertionReceipt}),null);
 const uncertain=fixture({trusted:false}),other=uncertain.adapter(),unknown=await uncertain.admitted();await uncertain.insert(other,unknown);await uncertain.dispatch({type:'PAIA_PROMPT_INSERTION_EPOCH_RETIRE',version:1,retiredEpochFloor:0,domainDigest:uncertain.domainDigest,receiptEpoch:uncertain.receiptEpoch,epoch:1,settledClaimIds:[unknown.insertionReceipt.claimId]});
 assert.equal((await uncertain.dispatch({type:'PAIA_PROMPT_INSERTION_RECEIPT_READ',version:1,envelope:unknown.insertionReceipt})).outcome,'unknown');
});

test('v1 pending evidence survives lane disposal, repeated source evaluation and read-only retrieval',async()=>{
 const f=fixture(),adapter=f.adapter();f.acceptAck(false);const message=await f.admitted();f.hold();const pending=f.insert(adapter,message);await f.commandEntered;assert.equal(f.commands.length,1);adapter.dispose();f.reload();const next=f.adapter();
 assert.equal(await f.dispatch({type:'PAIA_PROMPT_INSERTION_RECEIPT_READ',version:1,envelope:message.insertionReceipt}),null);const duplicate=f.insert(next,message);await f.release();assert.equal((await pending).insertionAck.outcome,'inserted');assert.equal((await duplicate).replayed,true);assert.equal(f.commands.length,1);
});

test('retirement during a pending original final qualifier rejects native entry but retains actual no-write receipt',async()=>{
 const f=fixture(),adapter=f.adapter(),message=await f.admitted();let finish,entered;const ready=new Promise(resolve=>entered=resolve);
 const pending=f.insert(adapter,message,{qualify:()=>{entered();return new Promise(resolve=>finish=resolve);}});await ready;
 await f.dispatch({type:'PAIA_PROMPT_INSERTION_EPOCH_RETIRE',version:1,retiredEpochFloor:0,domainDigest:f.domainDigest,receiptEpoch:f.receiptEpoch,epoch:1,settledClaimIds:[]});finish(true);
 assert.equal((await pending).insertionAck.outcome,'not_inserted');assert.equal(f.commands.length,0);
});

test('new constructors refuse all bare legacy operations without accumulating native attempts',async()=>{
 const f=fixture({draft:'',offset:0}),adapter=f.adapter(),first=f.request({text:'x'});
 for(let n=0;n<501;n++)assert.equal((await adapter.insert(n?f.request({text:'x'}):first)).reason,'page_refresh_required');adapter.dispose();f.reload();
 assert.equal((await f.adapter().insert(first)).reason,'page_refresh_required');assert.equal(f.commands.length,0);assert.equal(f.text.data,'');
});

test('bounded unresolved v1 evidence refuses more work without evicting UNKNOWN on retirement',async()=>{
 const f=fixture({draft:'',offset:0,trusted:false}),adapter=f.adapter();let first,capacity;
 for(let n=0;n<501;n++){const message=await f.admitted({text:'x'});if(!first)first=message;const result=await f.insert(adapter,message);if(result.reason==='insertion_receipt_capacity'){capacity=result;break;}assert.equal(result.insertionAck.outcome,'unknown');}
 assert.ok(capacity);const count=f.commands.length;assert.ok(count<=500);assert.ok(count>0);
 await f.dispatch({type:'PAIA_PROMPT_INSERTION_EPOCH_RETIRE',version:1,retiredEpochFloor:0,domainDigest:f.domainDigest,receiptEpoch:f.receiptEpoch,epoch:1,settledClaimIds:[first.insertionReceipt.claimId]});
 assert.equal((await f.dispatch({type:'PAIA_PROMPT_INSERTION_RECEIPT_READ',version:1,envelope:first.insertionReceipt})).outcome,'unknown');
 assert.equal((await f.insert(adapter,await f.admitted({epoch:2,text:'x'}))).reason,'insertion_receipt_capacity');assert.equal(f.commands.length,count);
});

test('a different original physical library domain does not inherit another domain retirement floor',async()=>{
 const f=fixture(),adapter=f.adapter();await f.dispatch({type:'PAIA_PROMPT_INSERTION_EPOCH_RETIRE',version:1,retiredEpochFloor:0,domainDigest:f.domainDigest,receiptEpoch:f.receiptEpoch,epoch:1,settledClaimIds:[]});
 const message=await f.admitted({domainDigest:'6'.repeat(64),receiptEpoch:webcrypto.randomUUID()});assert.equal((await f.insert(adapter,message)).insertionAck.outcome,'inserted');assert.equal(f.commands.length,1);
});

test('all three actual content entrypoints forward the signed original message into the one original document boundary',async()=>{
 const f=fixture(),generation=webcrypto.randomUUID(),id=webcrypto.randomUUID(),binding={url:f.location.href,conversation:'/c/synthetic-original',cycle:1,replyId:'synthetic-current-reply',revision:1};
 Object.assign(f.context,{window:f.document.defaultView,performance:{now:()=>10000},clearTimeout(){},MutationObserver:class{observe(){}disconnect(){}takeRecords(){return [];}},PAIAPromptSurface:{offerSuggestion:()=>true,nextPlacement:()=>({dark:false}),retireSuggestion(){}},PAIAChatGPTCurrentReplyAdapter:class{reset(){}invalidate(){}observe(){return {ready:true,binding};}snapshot(){return {completed:true,text:'SYNTHETIC reply',blocks:1,excluded:false};}}});
 f.context.chrome.storage={onChanged:{addListener(){},removeListener(){}}};
 f.setRpc(message=>({ok:true,data:message.type==='PAIA_PROMPT_NEXT_STATUS'?{enabled:true,generation}:message.type==='PAIA_PROMPT_NEXT_OFFER'?{available:true,id}:message.type==='PAIA_PROMPT_NEXT_PRESENT'?{safe:true}:message.type==='PAIA_PROMPT_ASSIST_STATUS'?{replyAccess:true,remoteProcessing:true,generation}:message.type==='PAIA_PROMPT_ASSIST_QUALIFY'?{qualified:true,generation}:{}}));
 for(const path of ['content/prompt-reuse.js','content/assist-result-runtime.js','content/prompt-assist.js','content/prompt-next.js'])vm.runInContext(await readFile(new URL('../'+path,import.meta.url),'utf8'),f.context);
 await flush();f.acceptAck(false);const originals=[];
 for(const lane of ['manual','assist','next']){
  const message=await f.admitted({lane,fields:lane==='manual'?{}:{binding,id,...(lane==='assist'?{generation,condition:'',conditionPresented:false}:{authorization:generation})}});
  originals.push(message);const before=f.commands.length,result=await f.dispatch(message);assert.equal(result.status,'inserted');assert.equal(result.insertionAck.outcome,'inserted');assert.equal(f.commands.length,before+1);assert.equal(result.insertionAck.envelope.lane,lane);
 }
 assert.equal(f.commands.length,3);assert.ok(f.commands.every(command=>command.command==='insertText'));
 f.reload();for(const path of ['content/prompt-reuse.js','content/assist-result-runtime.js','content/prompt-assist.js','content/prompt-next.js'])vm.runInContext(await readFile(new URL('../'+path,import.meta.url),'utf8'),f.context);await flush();
 assert.equal((await f.dispatch(originals[0])).replayed,true);assert.equal(f.commands.length,3);
 f.context.PAIAPromptReuseController.dispose();f.context.PAIAAssistPromptController.dispose();f.context.PAIANextPromptController.dispose();
});

test('mutating a returned public DTO cannot rewrite cached native UNKNOWN evidence',async()=>{
 const f=fixture({trusted:false}),adapter=f.adapter(),message=await f.admitted(),result=await f.insert(adapter,message);assert.equal(result.insertionAck.outcome,'unknown');result.status='inserted';result.verified=true;result.insertionAck.outcome='inserted';result.insertionAck.envelope.digest='0'.repeat(64);
 const duplicate=await f.insert(adapter,message);assert.equal(duplicate.status,'uncertain');assert.equal(duplicate.insertionAck.outcome,'unknown');assert.equal(duplicate.insertionAck.envelope.digest,message.insertionReceipt.digest);
 assert.equal((await f.dispatch({type:'PAIA_PROMPT_INSERTION_RECEIPT_READ',version:1,envelope:message.insertionReceipt})).outcome,'unknown');assert.equal(f.commands.length,1);
});

test('a newly opened receiver consumes certified historical retirement floors rather than accumulating false local gaps',async()=>{
 const f=fixture({draft:'',offset:0}),adapter=f.adapter();
 for(let epoch=100;epoch<=240;epoch++){
  const message=await f.admitted({epoch,receiptEpoch:webcrypto.randomUUID(),text:'x'});assert.equal((await f.insert(adapter,message)).status,'inserted');await flush();
  assert.equal((await f.dispatch({type:'PAIA_PROMPT_INSERTION_EPOCH_RETIRE',version:1,domainDigest:f.domainDigest,receiptEpoch:message.insertionReceipt.receiptEpoch,epoch,settledClaimIds:[],retiredEpochFloor:epoch})).retired,true);
 }
 assert.equal(f.commands.length,141);
});

test('certified cumulative retirement reclaims previously acknowledged terminal rows but not missing-ACK or UNKNOWN evidence',async()=>{
 const f=fixture(),adapter=f.adapter(),first=await f.admitted({epoch:1});await f.insert(adapter,first);await flush();f.acceptAck(false);const second=await f.admitted({epoch:2,receiptEpoch:webcrypto.randomUUID()});await f.insert(adapter,second);await flush();
 await f.dispatch({type:'PAIA_PROMPT_INSERTION_EPOCH_RETIRE',version:1,domainDigest:f.domainDigest,receiptEpoch:webcrypto.randomUUID(),epoch:3,settledClaimIds:[],retiredEpochFloor:3});
 assert.equal(await f.dispatch({type:'PAIA_PROMPT_INSERTION_RECEIPT_READ',version:1,envelope:first.insertionReceipt}),null);
 assert.equal((await f.dispatch({type:'PAIA_PROMPT_INSERTION_RECEIPT_READ',version:1,envelope:second.insertionReceipt})).outcome,'inserted');
 await f.dispatch({type:'PAIA_PROMPT_INSERTION_EPOCH_RETIRE',version:1,domainDigest:f.domainDigest,receiptEpoch:second.insertionReceipt.receiptEpoch,epoch:2,settledClaimIds:[second.insertionReceipt.claimId],retiredEpochFloor:3});
 assert.equal(await f.dispatch({type:'PAIA_PROMPT_INSERTION_RECEIPT_READ',version:1,envelope:second.insertionReceipt}),null);
});

test('a stale held shared QUALIFY response cannot escape authenticated epoch retirement',async()=>{
 const f=fixture(),adapter=f.adapter(),message=await f.admitted();let entered,release;const ready=new Promise(resolve=>entered=resolve);f.qualification(()=>{entered();return new Promise(resolve=>release=resolve);});
 const pending=f.insert(adapter,message);await ready;await f.dispatch({type:'PAIA_PROMPT_INSERTION_EPOCH_RETIRE',version:1,domainDigest:f.domainDigest,receiptEpoch:f.receiptEpoch,epoch:1,settledClaimIds:[],retiredEpochFloor:1});release(true);
 const result=await pending;assert.equal(result.status,'failed');assert.equal(result.insertionAck,undefined);assert.equal(f.commands.length,0);
});

test('a retained original UNKNOWN gap does not impose a lifetime cap on later contiguous retired epochs',async()=>{
 const f=fixture({draft:'',offset:0,trusted:false}),adapter=f.adapter(),unknown=await f.admitted({text:'x'});assert.equal((await f.insert(adapter,unknown)).insertionAck.outcome,'unknown');f.setNativeTrusted(true);
 for(let epoch=2;epoch<=180;epoch++){
  const message=await f.admitted({epoch,receiptEpoch:webcrypto.randomUUID(),text:'x'});assert.equal((await f.insert(adapter,message)).status,'inserted');await flush();
  await f.dispatch({type:'PAIA_PROMPT_INSERTION_EPOCH_RETIRE',version:1,domainDigest:f.domainDigest,receiptEpoch:message.insertionReceipt.receiptEpoch,epoch,settledClaimIds:[],retiredEpochFloor:0});
 }
 assert.equal(f.commands.length,180);assert.equal((await f.dispatch({type:'PAIA_PROMPT_INSERTION_RECEIPT_READ',version:1,envelope:unknown.insertionReceipt})).outcome,'unknown');
});

test('re-registering after a missed ACK republishes original cached terminal evidence only, without a DOM recheck or edit',async()=>{
 const f=fixture(),adapter=f.adapter();f.acceptAck(false);const message=await f.admitted();await f.insert(adapter,message);await flush();const before=f.messages.filter(r=>r.type==='PAIA_PROMPT_INSERTION_ACK').length;
 f.text.data='SYNTHETIC replacement after original native success';f.acceptAck(true);f.changeOwnerToken();await f.probe();await flush();
 assert.equal(f.messages.filter(r=>r.type==='PAIA_PROMPT_INSERTION_ACK').length,before);assert.equal(f.messages.filter(r=>r.type==='PAIA_PROMPT_INSERTION_RECONCILE').length,1);assert.equal(f.commands.length,1);assert.equal(f.text.data,'SYNTHETIC replacement after original native success');
 await f.dispatch({type:'PAIA_PROMPT_INSERTION_EPOCH_RETIRE',version:1,domainDigest:f.domainDigest,receiptEpoch:f.receiptEpoch,epoch:1,settledClaimIds:[],retiredEpochFloor:1});assert.equal(await f.dispatch({type:'PAIA_PROMPT_INSERTION_RECEIPT_READ',version:1,envelope:message.insertionReceipt}),null);
});

test('more than sixteen clean restored domains remain usable while an evicted old envelope still requires current original owner admission',async()=>{
 const f=fixture({draft:'',offset:0}),adapter=f.adapter();let currentDomain,first;
 f.qualification(message=>message.envelope.domainDigest===currentDomain);
 for(let n=1;n<=25;n++){
  currentDomain=n.toString(16).padStart(64,'0');const message=await f.admitted({domainDigest:currentDomain,receiptEpoch:webcrypto.randomUUID(),text:'x'});if(!first)first=message;
  assert.equal((await f.insert(adapter,message)).status,'inserted');await flush();await f.dispatch({type:'PAIA_PROMPT_INSERTION_EPOCH_RETIRE',version:1,domainDigest:currentDomain,receiptEpoch:message.insertionReceipt.receiptEpoch,epoch:1,settledClaimIds:[],retiredEpochFloor:1});
 }
 assert.equal(f.commands.length,25);assert.equal((await f.insert(adapter,first)).status,'failed');assert.equal(f.commands.length,25);const {insertionReceipt,...legacy}=first;assert.equal((await adapter.insert(legacy)).status,'failed');assert.equal(f.commands.length,25);
});

test('a held shared qualifier cannot cross clean-domain-summary eviction, and its unresolved domain stays retained',async()=>{
 const f=fixture(),adapter=f.adapter(),message=await f.admitted();let entered,release;const ready=new Promise(resolve=>entered=resolve);f.qualification(()=>{entered();return new Promise(resolve=>release=resolve);});const pending=f.insert(adapter,message);await ready;
 for(let n=1;n<=16;n++)await f.dispatch({type:'PAIA_PROMPT_INSERTION_EPOCH_RETIRE',version:1,domainDigest:n.toString(16).padStart(64,'0'),receiptEpoch:webcrypto.randomUUID(),epoch:1,settledClaimIds:[],retiredEpochFloor:1});
 release(true);assert.equal((await pending).status,'failed');assert.equal(f.commands.length,0);assert.equal(await f.dispatch({type:'PAIA_PROMPT_INSERTION_RECEIPT_READ',version:1,envelope:message.insertionReceipt}),null);
});

test('durable retirement does not erase a terminal proof underneath its held ACK continuation',async()=>{
 const f=fixture(),adapter=f.adapter();let entered,release;const ready=new Promise(resolve=>entered=resolve);f.acceptAck(()=>{entered();return new Promise(resolve=>release=resolve);});
 const message=await f.admitted(),result=await f.insert(adapter,message);await ready;assert.equal(result.insertionAck.outcome,'inserted');
 await f.dispatch({type:'PAIA_PROMPT_INSERTION_EPOCH_RETIRE',version:1,domainDigest:f.domainDigest,receiptEpoch:f.receiptEpoch,epoch:1,settledClaimIds:[message.insertionReceipt.claimId],retiredEpochFloor:1});
 assert.equal((await f.dispatch({type:'PAIA_PROMPT_INSERTION_RECEIPT_READ',version:1,envelope:message.insertionReceipt})).outcome,'inserted');release(true);await flush();
 assert.equal(await f.dispatch({type:'PAIA_PROMPT_INSERTION_RECEIPT_READ',version:1,envelope:message.insertionReceipt}),null);assert.equal(f.commands.length,1);
});

test('genuine retained UNKNOWN domains are never discarded merely to admit a seventeenth domain',async()=>{
 const f=fixture({draft:'',offset:0,trusted:false}),adapter=f.adapter();let first;
 for(let n=1;n<=16;n++){const message=await f.admitted({domainDigest:n.toString(16).padStart(64,'0'),receiptEpoch:webcrypto.randomUUID(),text:'x'});if(!first)first=message;assert.equal((await f.insert(adapter,message)).insertionAck.outcome,'unknown');}
 assert.equal((await f.insert(adapter,await f.admitted({domainDigest:'7'.repeat(64),text:'x'}))).status,'failed');assert.equal(f.commands.length,16);assert.equal((await f.dispatch({type:'PAIA_PROMPT_INSERTION_RECEIPT_READ',version:1,envelope:first.insertionReceipt})).outcome,'unknown');
});

test('a changed original owner token reconciles a previously unacknowledged terminal once, without per-probe duplicate ACKs',async()=>{
 const f=fixture(),adapter=f.adapter();f.acceptAck(false);const message=await f.admitted();await f.insert(adapter,message);await flush();
 const count=()=>f.messages.filter(r=>['PAIA_PROMPT_INSERTION_ACK','PAIA_PROMPT_INSERTION_RECONCILE'].includes(r.type)).length;assert.equal(count(),1);
 for(let n=0;n<3;n++)await f.probe();await flush();assert.equal(count(),1);
 f.changeOwnerToken();await f.probe();await flush();assert.equal(count(),2);
 for(let n=0;n<3;n++)await f.probe();await flush();assert.equal(count(),2);assert.equal(f.commands.length,1);
});

test('lost-retirement recovery may reclaim only its own native terminal cache and old replay still needs original owner qualification',async()=>{
 const f=fixture(),adapter=f.adapter();f.acceptAck(false);const message=await f.admitted();await f.insert(adapter,message);await flush();f.text.data='SYNTHETIC newer unrelated draft';
 f.changeOwnerToken();f.retiredAck(true);await f.probe();await flush();assert.equal(await f.dispatch({type:'PAIA_PROMPT_INSERTION_RECEIPT_READ',version:1,envelope:message.insertionReceipt}),null);
 f.qualification(false);const replay=await f.insert(adapter,message);assert.equal(replay.status,'failed');assert.equal(replay.insertionAck,undefined);assert.equal(f.commands.length,1);assert.equal(f.text.data,'SYNTHETIC newer unrelated draft');
});

test('retired-only ACK replies and forged public DTOs cannot discard private original UNKNOWN evidence',async()=>{
 const f=fixture({trusted:false}),adapter=f.adapter();f.retiredAck(true);const message=await f.admitted(),result=await f.insert(adapter,message);await flush();result.status='inserted';result.insertionAck.outcome='inserted';adapter.nativeTerminal=true;adapter.state={ack:result.insertionAck};
 const before=f.messages.filter(r=>r.type==='PAIA_PROMPT_INSERTION_ACK').length;f.changeOwnerToken();await f.probe();await flush();
 assert.equal(f.messages.filter(r=>r.type==='PAIA_PROMPT_INSERTION_ACK').length,before);assert.equal((await f.dispatch({type:'PAIA_PROMPT_INSERTION_RECEIPT_READ',version:1,envelope:message.insertionReceipt})).outcome,'unknown');assert.equal(f.commands.length,1);
});

test('more than five hundred clean original owner restarts with missed RETIRE notices do not create a receiver insertion lifetime cap',async()=>{
 const f=fixture({draft:'',offset:0}),adapter=f.adapter();let first;
 for(let epoch=1;epoch<=505;epoch++){
  f.changeOwnerToken();f.retiredAck(true);const message=await f.admitted({epoch,receiptEpoch:webcrypto.randomUUID(),text:'x'});await flush();f.retiredAck(false);if(!first)first=message;
  assert.equal((await f.insert(adapter,message)).status,'inserted');await flush();
 }
 assert.equal(f.commands.length,505);f.qualification(false);assert.equal((await f.insert(adapter,first)).status,'failed');assert.equal(f.commands.length,505);
});

async function pairedOwnerReceiver(t,{trusted=true}={}){
 const [{setup},{OrganizerStore},{PromptReuseService},{PromptReuseCommands}]=await Promise.all([import('./harness/thought-m1.mjs'),import(new URL('../core/organizer/store.js',contractURL)),import(new URL('../core/prompt-reuse-service.js',contractURL)),import(new URL('./prompt-reuse-commands.js',contractURL))]);
 const {s,storage}=await setup(OrganizerStore);await s.finishFoundation();const f=fixture({trusted}),sender={id:'synthetic-extension',tab:{id:7,windowId:1},frameId:0,documentId:'synthetic-real-top-document',documentLifecycle:'active',url:f.location.href};let dropRetire=false,dropAckResponse=false,registrationHold=null,owner,cap,retiredResolve;
 const retiredReply=new Promise(resolve=>retiredResolve=resolve),sent=[],read=()=>s.repository.transaction(false,t=>t.get('meta',PROMPT_INSERTION_RUNTIME),['meta']);
 f.context.chrome.runtime.getURL=path=>'chrome-extension://synthetic-extension/'+path;
 const api={runtime:f.context.chrome.runtime,storage:{local:storage,onChanged:{addListener(){},removeListener(){}}},tabs:{get:async()=>({id:7,windowId:1,url:f.location.href,active:true}),update:async()=>({id:7}),sendMessage:async(tabId,message,options)=>{
  assert.equal(tabId,7);if(options.documentId)assert.equal(options.documentId,sender.documentId);
  if(message.type==='PAIA_PROMPT_INSERTION_EPOCH_RETIRE'&&dropRetire)throw Error('SYNTHETIC dropped retirement notice');
  if(message.type==='PAIA_PROMPT_INSERT_SELECTED'){sent.push(structuredClone(message));assert.equal((await read()).claims.find(c=>c.envelope.claimId===message.insertionReceipt.claimId).state,'pending');}
  return structuredClone(await f.dispatch(structuredClone(message)));
 }}};
 owner=new PromptInsertionReceipts(s,api);const register=owner.registerProducer;owner.registerProducer=function(...args){cap=register.apply(this,args);return cap;};const service=new PromptReuseService(s),producer=new PromptReuseCommands(service,api,{insertionReceipts:owner});delete owner.registerProducer;
 f.setProtocol(async message=>{try{let result;if(message.type==='PAIA_PROMPT_INSERTION_RECEIVER_REGISTER'){result=await owner.registerReceiver(message,sender);if(registrationHold?.token===message.recoveryToken){const held=registrationHold;held.enter();await held.promise;if(registrationHold===held)registrationHold=null;}}else if(message.type==='PAIA_PROMPT_INSERTION_QUALIFY')result=await owner.handleQualify(message,sender);else if(message.type==='PAIA_PROMPT_INSERTION_ACK'){result=await owner.handleAck(message,sender);if(result.retired===true)retiredResolve();if(dropAckResponse)return {ok:false};}else if(message.type==='PAIA_PROMPT_INSERTION_RECONCILE'){result=await owner.handleReconcile(message,sender);if(result.results?.some(value=>value.retired===true))retiredResolve();}else throw Error('Unexpected original protocol');return {ok:true,data:result};}catch(error){return {ok:false,error:{code:error.code??'SYNTHETIC_ERROR'}};}});
 f.context.window=f.document.defaultView;vm.runInContext(await readFile(new URL('../content/prompt-reuse.js',import.meta.url),'utf8'),f.context);
 const prepare=async()=>{const receiver=await owner.resolveReceiver(7,f.location.href),descriptor={receiptEpoch:owner.admissionEpoch(cap),receiver,sourceDigest:await owner.digest(['manual','SYNTHETIC paired insertion']),authorizationDigest:await owner.digest(['consent',true]),initiatorDigest:await owner.digest(['extension-private-frame','synthetic-distinct-initiator'])};return {descriptor,action:await owner.issueAction(cap,descriptor)};};
 const dispatch=async()=>{const {descriptor,action}=await prepare();return owner.dispatch(cap,{action,sourceDigest:descriptor.sourceDigest,authorizationDigest:descriptor.authorizationDigest,initiatorDigest:descriptor.initiatorDigest,receiver:descriptor.receiver,message:{type:'PAIA_PROMPT_INSERT_SELECTED',text:'SYNTHETIC paired insertion',url:f.location.href,operationId:action.operationId}},async()=>{});};
 t.after(()=>{f.context.PAIAPromptReuseController.dispose();owner.dispose();producer.dispose();});return {f,s,owner,cap,service,producer,api,sender,sent,read,prepare,dispatch,retiredReply,holdRegistration(token){let enter,release;const entered=new Promise(resolve=>enter=resolve),promise=new Promise(resolve=>release=resolve);registrationHold={token,enter,promise};return {entered,release};},dropRetire(){dropRetire=true;},dropAck(){dropAckResponse=true;}};
}

test('paired original durable owner and actual manual content recover a lost retirement notice without replay or ledger settlement fabrication',async t=>{
 const p=await pairedOwnerReceiver(t);p.dropAck();assert.deepEqual(await p.dispatch(),{status:'inserted',verified:true});await flush();const original=p.sent[0];assert.equal(p.f.commands.length,1);assert.equal((await p.read()).claims[0].state,'inserted');
 p.dropRetire();await p.owner.rotateEpoch(p.cap);const before=await p.read();assert.equal(before.claims.length,0);assert.equal((await p.f.dispatch({type:'PAIA_PROMPT_INSERTION_RECEIPT_READ',version:1,envelope:original.insertionReceipt})).outcome,'inserted');
 await p.owner.resolveReceiver(7,p.f.location.href);await p.retiredReply;await flush();assert.equal(await p.f.dispatch({type:'PAIA_PROMPT_INSERTION_RECEIPT_READ',version:1,envelope:original.insertionReceipt}),null);assert.deepEqual(await p.read(),before);
 const replay=await p.f.dispatch(original);assert.equal(replay.status,'uncertain');assert.equal(replay.insertionAck,undefined);assert.equal(p.f.commands.length,1);assert.deepEqual(await p.read(),before);
});

test('paired owner cache-only response to a forged absent ACK cannot manufacture private receiver proof or erase original UNKNOWN',async t=>{
 const p=await pairedOwnerReceiver(t,{trusted:false});assert.equal((await p.dispatch()).status,'uncertain');await flush();const original=p.sent[0];await p.owner.rotateEpoch(p.cap);const before=await p.read();assert.equal(before.claims[0].state,'pending');
 const envelope={...original.insertionReceipt,claimId:webcrypto.randomUUID(),actionId:webcrypto.randomUUID(),operationId:webcrypto.randomUUID(),digest:'f'.repeat(64)},ack={version:1,envelope,outcome:'inserted'};
 assert.deepEqual(await p.owner.handleAck({type:'PAIA_PROMPT_INSERTION_ACK',ack},p.sender),{settled:false,retired:true});assert.deepEqual(await p.read(),before);assert.equal(await p.f.dispatch({type:'PAIA_PROMPT_INSERTION_RECEIPT_READ',version:1,envelope}),null);
 await p.owner.resolveReceiver(7,p.f.location.href);await flush();assert.equal((await p.f.dispatch({type:'PAIA_PROMPT_INSERTION_RECEIPT_READ',version:1,envelope:original.insertionReceipt})).outcome,'unknown');assert.deepEqual(await p.read(),before);assert.equal(p.f.commands.length,1);
});

test('expired original operation budget blocks native entry after an otherwise valid final lane qualifier',async()=>{
 const f=fixture(),adapter=f.adapter(),message=await f.admitted();f.budget(40);
 const result=await f.insert(adapter,message,{qualify:async()=>{f.advance(40);return true;}});assert.equal(result.insertionAck.outcome,'not_inserted');assert.equal(f.commands.length,0);
});

test('shared qualification transit consumes the original remaining budget rather than starting a fresh deadline',async()=>{
 const f=fixture(),adapter=f.adapter(),message=await f.admitted();f.budget(40);f.qualification(async()=>{f.advance(40);return true;});
 const result=await f.insert(adapter,message);assert.equal(result.status,'failed');assert.equal(result.insertionAck,undefined);assert.equal(f.commands.length,0);
});

for(const budget of [0,-1,30001,Infinity,NaN])test('malformed original remaining budget refuses native entry: '+String(budget),async()=>{
 const f=fixture(),adapter=f.adapter(),message=await f.admitted();f.budget(budget);assert.equal((await f.insert(adapter,message)).status,'failed');assert.equal(f.commands.length,0);
});

test('one changed owner event reconciles at most sixteen unacknowledged native terminals and leaves the remainder retained',async()=>{
 const f=fixture({draft:'',offset:0}),adapter=f.adapter(),messages=[];f.acceptAck(false);
 for(let n=0;n<40;n++){const message=await f.admitted({text:'x'});messages.push(message);await f.insert(adapter,message);await flush();}
 const before=f.messages.filter(r=>r.type==='PAIA_PROMPT_INSERTION_ACK').length,batchesBefore=f.messages.filter(r=>r.type==='PAIA_PROMPT_INSERTION_RECONCILE').length;f.changeOwnerToken();f.retiredAck(true);f.setSummary({domainDigest:f.domainDigest,retiredEpochFloor:1,retiredRanges:[]});await f.probe();await flush();
 assert.equal(f.messages.filter(r=>r.type==='PAIA_PROMPT_INSERTION_ACK').length,before);const batches=f.messages.filter(r=>r.type==='PAIA_PROMPT_INSERTION_RECONCILE');assert.equal(batches.length,batchesBefore+1);assert.equal(batches.at(-1).acks.length,16);
 assert.equal(await f.dispatch({type:'PAIA_PROMPT_INSERTION_RECEIPT_READ',version:1,envelope:messages[0].insertionReceipt}),null);assert.equal((await f.dispatch({type:'PAIA_PROMPT_INSERTION_RECEIPT_READ',version:1,envelope:messages.at(-1).insertionReceipt})).outcome,'inserted');
 for(let n=0;n<3;n++)await f.probe();await flush();assert.equal(f.messages.filter(r=>r.type==='PAIA_PROMPT_INSERTION_RECONCILE').length,batchesBefore+1);assert.equal(f.commands.length,40);
});

test('five hundred acknowledged private terminal operations leave no backlog or reconciliation storm before new insertions',async()=>{
 const f=fixture({draft:'',offset:0}),adapter=f.adapter();let first,last;
 for(let n=0;n<500;n++){const message=await f.admitted({text:'x'});if(!first)first=message;last=message;assert.equal((await f.insert(adapter,message)).status,'inserted');await flush();}
 f.changeOwnerToken();f.retiredAck(true);f.setSummary({domainDigest:f.domainDigest,retiredEpochFloor:1,retiredRanges:[]});await f.probe();await flush();
 const batches=f.messages.filter(r=>r.type==='PAIA_PROMPT_INSERTION_RECONCILE');assert.equal(batches.length,0);
 for(const message of [first,last])assert.equal(await f.dispatch({type:'PAIA_PROMPT_INSERTION_RECEIPT_READ',version:1,envelope:message.insertionReceipt}),null);
 f.retiredAck(false);for(let n=0;n<20;n++)assert.equal((await f.insert(adapter,await f.admitted({epoch:2,text:'x'}))).status,'inserted');assert.equal(f.commands.length,520);assert.equal(f.messages.filter(r=>r.type==='PAIA_PROMPT_INSERTION_RECONCILE').length,0);
});

for(const summary of [{domainDigest:'6'.repeat(64),retiredEpochFloor:1,retiredRanges:[]},{domainDigest:'5'.repeat(64),retiredEpochFloor:0,retiredRanges:[{start:0,end:1}]}])test('foreign or malformed retirement summary cannot clear other private unacknowledged evidence '+JSON.stringify(summary),async()=>{
 const f=fixture(),adapter=f.adapter();f.acceptAck(false);const message=await f.admitted();await f.insert(adapter,message);await flush();f.changeOwnerToken();f.setSummary(summary);await f.probe();await flush();
 assert.equal((await f.dispatch({type:'PAIA_PROMPT_INSERTION_RECEIPT_READ',version:1,envelope:message.insertionReceipt})).outcome,'inserted');assert.equal(f.commands.length,1);
});

test('a held old-owner QUALIFY cannot cross an authenticated ownerToken replacement',async()=>{
 const f=fixture(),adapter=f.adapter(),message=await f.admitted();let entered,release;const ready=new Promise(resolve=>entered=resolve);f.qualification(()=>{entered();return new Promise(resolve=>release=resolve);});
 const pending=f.insert(adapter,message);await ready;f.changeOwnerToken();await f.probe();release(true);
 const result=await pending;assert.equal(result.status,'failed');assert.equal(result.insertionAck,undefined);assert.equal(f.commands.length,0);
});

test('retained foreign-domain terminal evidence cannot consume or poison the current-domain recovery batch',async()=>{
 const f=fixture({draft:'',offset:0}),adapter=f.adapter(),foreign=[];f.acceptAck(false);
 for(let n=0;n<20;n++){const message=await f.admitted({text:'x'});foreign.push(message);await f.insert(adapter,message);await flush();}
 const current=await f.admitted({domainDigest:'6'.repeat(64),text:'x'});await f.insert(adapter,current);await flush();const before=f.messages.filter(r=>r.type==='PAIA_PROMPT_INSERTION_RECONCILE').length;
 f.acceptAck(true);await f.admitted({domainDigest:'6'.repeat(64),text:'x'});await flush();const batches=f.messages.filter(r=>r.type==='PAIA_PROMPT_INSERTION_RECONCILE');assert.equal(batches.length,before+1);assert.equal(batches.at(-1).acks.length,1);assert.equal(batches.at(-1).acks[0].envelope.claimId,current.insertionReceipt.claimId);
 assert.equal(await f.dispatch({type:'PAIA_PROMPT_INSERTION_RECEIPT_READ',version:1,envelope:current.insertionReceipt}),null);for(const message of foreign)assert.equal((await f.dispatch({type:'PAIA_PROMPT_INSERTION_RECEIPT_READ',version:1,envelope:message.insertionReceipt})).outcome,'inserted');assert.equal(f.commands.length,21);
});

test('later genuine recovery events advance another bounded prefix without dual-probe refresh or automatic continuation',async()=>{
 const f=fixture({draft:'',offset:0}),adapter=f.adapter(),messages=[];f.acceptAck(false);
 for(let n=0;n<40;n++){const message=await f.admitted({text:'x'});messages.push(message);await f.insert(adapter,message);await flush();}
 const before=f.messages.filter(r=>r.type==='PAIA_PROMPT_INSERTION_RECONCILE').length;f.acceptAck(true);
 await f.admitted({text:'x'});await flush();assert.equal(f.messages.filter(r=>r.type==='PAIA_PROMPT_INSERTION_RECONCILE').length,before+1);for(let n=0;n<3;n++)await f.probe();await flush();assert.equal(f.messages.filter(r=>r.type==='PAIA_PROMPT_INSERTION_RECONCILE').length,before+1);
 assert.equal((await f.dispatch({type:'PAIA_PROMPT_INSERTION_RECEIPT_READ',version:1,envelope:messages[16].insertionReceipt})).outcome,'inserted');
 await f.admitted({text:'x'});await flush();assert.equal(f.messages.filter(r=>r.type==='PAIA_PROMPT_INSERTION_RECONCILE').length,before+2);assert.equal(await f.dispatch({type:'PAIA_PROMPT_INSERTION_RECEIPT_READ',version:1,envelope:messages[16].insertionReceipt}),null);assert.equal((await f.dispatch({type:'PAIA_PROMPT_INSERTION_RECEIPT_READ',version:1,envelope:messages[32].insertionReceipt})).outcome,'inserted');assert.equal(f.commands.length,40);
});

test('original manual producer presentation and use reach the real durable owner and original content boundary once',async t=>{
 const p=await pairedOwnerReceiver(t),text='SYNTHETIC public producer insertion',created=await p.service.change({action:'create',revision:0,text}),sender={id:'synthetic-extension',url:p.api.runtime.getURL('ui/popup.html'),documentId:'synthetic-private-popup-document',documentLifecycle:'active'};
 const prepared=await p.producer.handle({type:'PAIA_PROMPT_INSERT_PREPARE',id:created.id,text,tabId:7,url:p.f.location.href},sender);assert.equal(p.f.commands.length,0);assert.equal(await p.read(),undefined);
 const request={type:'PAIA_PROMPT_INSERT',id:created.id,text,tabId:7,url:p.f.location.href,operationId:prepared.insertionAction.operationId,insertionAction:prepared.insertionAction};
 assert.deepEqual(await p.producer.handle(request,sender),{status:'inserted',verified:true});await flush();assert.equal(p.f.commands.length,1);const row=await p.read();assert.equal(row.claims.length,1);assert.equal(row.claims[0].state,'inserted');assert.equal(row.claims[0].envelope.receiver.documentId,'synthetic-real-top-document');assert.notEqual(row.claims[0].envelope.receiver.documentId,sender.documentId);
 const before=await p.service.snapshot();assert.equal(before.preferences.overrides.find(value=>value.id===created.id).reuseCount,1);
 assert.equal((await p.producer.handle(request,sender)).status,'uncertain');await flush();assert.equal((await p.service.snapshot()).preferences.overrides.find(value=>value.id===created.id).reuseCount,1);assert.equal(p.f.commands.length,1);assert.equal(await p.f.dispatch({type:'PAIA_PROMPT_INSERTION_RECEIPT_READ',version:1,envelope:row.claims[0].envelope}),null);
});

test('an actually held final lane callback cannot authorize native entry after the original deadline',async()=>{
 const f=fixture(),adapter=f.adapter(),message=await f.admitted();let entered,release;const ready=new Promise(resolve=>entered=resolve);f.budget(30);
 const pending=f.insert(adapter,message,{qualify:()=>{entered();return new Promise(resolve=>release=resolve);}});await ready;f.advance(31);release(true);
 assert.equal((await pending).insertionAck.outcome,'not_inserted');assert.equal(f.commands.length,0);
});

test('a different concurrent original probe challenge cannot borrow the held registration promise',async()=>{
 const f=fixture(),adapter=f.adapter(),a=await f.admitted(),b=await f.admitted();let entered,release;const ready=new Promise(resolve=>entered=resolve);
 f.setRegistration((message,response)=>{assert.equal(message.recoveryToken,a.insertionReceipt.actionId);entered();return new Promise(resolve=>release=()=>resolve(response));});
 const first=f.dispatch({type:'PAIA_PROMPT_INSERTION_RECEIVER_PROBE',version:1,recoveryToken:a.insertionReceipt.actionId});await ready;
 assert.equal(await f.dispatch({type:'PAIA_PROMPT_INSERTION_RECEIVER_PROBE',version:1,recoveryToken:b.insertionReceipt.actionId}),null);release();assert.equal((await first).version,1);assert.equal(f.commands.length,0);
});

test('a mismatched registration recovery challenge is refused before reconciliation or physical entry',async()=>{
 const f=fixture(),adapter=f.adapter(),message=await f.admitted();f.setRegistration((request,response)=>({...response,data:{...response.data,recoveryToken:webcrypto.randomUUID()}}));
 assert.equal(await f.dispatch({type:'PAIA_PROMPT_INSERTION_RECEIVER_PROBE',version:1,recoveryToken:message.insertionReceipt.actionId}),null);
 assert.equal((await f.insert(adapter,message)).status,'uncertain');assert.equal(f.messages.filter(value=>value.type==='PAIA_PROMPT_INSERTION_RECONCILE').length,0);assert.equal(f.commands.length,0);
});

test('interleaved A B A challenges do not spend a second recovery batch for the same original event',async()=>{
 const f=fixture(),adapter=f.adapter();f.acceptAck(false);const original=await f.admitted();await f.insert(adapter,original);await flush();
 const a=await f.admitted(),b=await f.admitted();const before=f.messages.filter(value=>value.type==='PAIA_PROMPT_INSERTION_RECONCILE').length;assert.equal(before,2);
 assert.equal((await f.dispatch({type:'PAIA_PROMPT_INSERTION_RECEIVER_PROBE',version:1,recoveryToken:a.insertionReceipt.actionId})).version,1);assert.equal((await f.dispatch({type:'PAIA_PROMPT_INSERTION_RECEIVER_PROBE',version:1,recoveryToken:b.insertionReceipt.actionId})).version,1);
 assert.equal(f.messages.filter(value=>value.type==='PAIA_PROMPT_INSERTION_RECONCILE').length,before);assert.equal(f.commands.length,1);
});

test('unchallenged or malformed probe messages cannot create a recovery event',async()=>{
 const f=fixture();f.adapter();for(const message of [{type:'PAIA_PROMPT_INSERTION_RECEIVER_PROBE',version:1},{type:'PAIA_PROMPT_INSERTION_RECEIVER_PROBE',version:1,recoveryToken:'not-an-original-uuid'}])assert.equal(await f.dispatch(message),null);assert.equal(f.messages.length,0);
});

test('paired original owner action B cannot borrow action A held actual receiver registration event',async t=>{
 const p=await pairedOwnerReceiver(t),a=await p.prepare(),b=await p.prepare(),eventA=p.owner.beginInsertion(p.cap,a.action),eventB=p.owner.beginInsertion(p.cap,b.action),held=p.holdRegistration(a.action.actionId);
 const first=p.owner.resolveReceiver(7,p.f.location.href,null,eventA);await held.entered;
 await assert.rejects(p.owner.resolveReceiver(7,p.f.location.href,null,eventB));held.release();assert.equal((await first).documentId,'synthetic-real-top-document');assert.equal(p.f.commands.length,0);assert.equal(await p.read(),undefined);
 const registrations=p.f.messages.filter(message=>message.type==='PAIA_PROMPT_INSERTION_RECEIVER_REGISTER');assert.equal(registrations.filter(message=>message.recoveryToken===b.action.actionId).length,0);assert.equal(registrations.filter(message=>message.recoveryToken===a.action.actionId).length,2);
});

for(const lane of ['manual','assist','next'])test('receipt-only birth denies unregistered bare '+lane+' native edit',async()=>{
 const f=fixture(),a=f.adapter();assert.equal((await a.insert(f.request({lane}))).reason,'page_refresh_required');assert.equal(f.commands.length,0);assert.equal(f.messages.length,0);
 const reply=await f.probe();assert.equal(reply.profile,'receipt-only-v1');assert.equal((await a.insert(f.request({lane}))).reason,'page_refresh_required');assert.equal(f.commands.length,0);
});
test('new script preserves a loaded old constructor and cannot retroactively qualify it',async()=>{
 const legacy=await readFile(new URL('../../work/receipt-only-host-20261025/before/extension/adapter/chatgpt-composer.js',import.meta.url),'utf8');
 const f=fixture({adapterSource:legacy}),a=f.adapter(),constructor=f.context.PAIAChatGPTComposerAdapter;
 vm.runInContext(source,f.context);assert.equal(f.context.PAIAChatGPTComposerAdapter,constructor);
 // This is the retained old owner, not a public switch in the new constructor.
 assert.equal((await a.insert(f.request())).status,'inserted');assert.equal(f.commands.length,1);
 assert.equal((await f.probe()).profile,undefined);
});
