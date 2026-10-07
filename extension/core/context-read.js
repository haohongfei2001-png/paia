import {readableContextItems} from './context-item-lineage.js';
import {ContextCardsService,CONTEXT_ITEM_CARDS} from './context-cards.js';
import {ContextTopicAccessService} from './context-topic-access.js';
import {readContextTopicScope,CONTEXT_TOPIC_SCOPE_LIMITS} from './context-topic-scope.js';
import {evaluateContextTopicAccess} from './context-topic-access-policy.js';
import {rootReadAuthority} from './organizer/root-read.js';
import {bindingSource} from './thought-binding.js';
import {inputProjection} from './thought-evidence.js';
import {MemoryService} from './memory/service.js';
import {normalizeSearch,searchExcerpt} from './search-service.js';
import {idOK,revisionOK} from './thought-model.js';
import {ArchiveError} from './constants.js';

// Domain boundary only. No worker route, transport, credential, connection
// activation, persistent cache or default connection authority is installed.
export const CONTEXT_READ_LIMITS=Object.freeze({page:20,scan:20,chunk:8192,outputBytes:256*1024,materialBytes:8*1024*1024,cursors:64,cursorMs:300000,verificationMs:1000,requestMs:10000});
const plain=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const only=(x,keys)=>plain(x)&&Reflect.ownKeys(x).every(k=>keys.includes(k));
const exact=(x,keys)=>only(x,keys)&&keys.every(k=>Object.hasOwn(x,k));
const opaque=x=>typeof x==='string'&&x.length>0&&x.length<=200&&!x.includes('\0');
const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(x);
const refuse=reason=>{throw Object.assign(new ArchiveError('CONTEXT_INVALIDATED'),{readReason:reason});};
const need=(value,reason)=>{if(!value)refuse(reason);};
const unavailable=reason=>({available:false,reason,items:[],nextCursor:null,complete:false,externalAllowed:false});
const reasons=new Set(['invalid_request','not_ready','connection_unavailable','connection_changed','timeout','stale_cursor','stale_authority','global_off','inputs_off','topic_unavailable','full_input_unavailable','content_unavailable','scope_budget','incomplete_page','output_budget','storage_unavailable']);
const failure=e=>unavailable(reasons.has(e?.readReason)?e.readReason:'storage_unavailable');
const roles={info:'user_information',rules:'user_rule',now:'user_current_state'};
const identity=r=>JSON.stringify([r.connectionId,r.accountId,r.authorizationGeneration]);
const bytes=text=>new TextEncoder().encode(text).byteLength;

// The binding owner uses all() for dependency/provenance collections. Preserve
// its exact semantics through verified bounded pages, never a truncated getAll.
function boundedReader(transaction,compare){
 const t=Object.create(transaction);let reads=0;
 const tick=()=>need(++reads<=CONTEXT_TOPIC_SCOPE_LIMITS.reads,'scope_budget');
 t.get=async(...args)=>{tick();return transaction.get(...args);};
 t.has=async(...args)=>!!await t.get(...args);
 t.all=async(store,index,range)=>{
  tick();const count=await transaction.count(store,index,range);
  need(revisionOK(count)&&count<=CONTEXT_TOPIC_SCOPE_LIMITS.refs,'scope_budget');
  const rows=[],seen=new Set();let after=null;
  do{
   tick();const page=await transaction.rangePage(store,index,range,after,CONTEXT_TOPIC_SCOPE_LIMITS.page);
   need(exact(page,['rows','next'])&&Array.isArray(page.rows)&&page.rows.length<=CONTEXT_TOPIC_SCOPE_LIMITS.page&&(page.next===null||page.rows.length>0),'incomplete_page');
   let previous=after;
   for(const item of page.rows){
    tick();need(plain(item)&&item.value&&idOK(item.value.id)&&!seen.has(item.value.id)&&(previous===null||compare(previous,item.key)<0),'incomplete_page');
    previous=item.key;seen.add(item.value.id);rows.push(item.value);need(rows.length<=count,'incomplete_page');
   }
   need(page.next===null||compare(page.next,previous)===0&&(after===null||compare(after,page.next)<0),'incomplete_page');after=page.next;
  }while(after!==null);
  need(rows.length===count,'incomplete_page');return rows;
 };
 return t;
}

/**
 * Trusted host dependency, never a request field:
 * verify(caller, store) -> {version:1, store, connectionId, accountId,
 *   authorizationGeneration, readable:true, online:true, expiresAt: epoch-ms}.
 * isCurrent(caller, receipt, store) -> synchronous true only while that exact
 * authenticated caller, local account/store binding and generation remain live.
 * The host must own authentication, current account membership and revocation.
 * A JSON caller's claimed IDs/permissions are not proof. No such live host is
 * provided here; tests inject explicitly synthetic authority into actual stores.
 *
 * Results are data, never executable instructions. Complete readTopic pages
 * cover whole-bound user Inputs only, not AI Thought prose or Archive tails.
 */
export class ContextReadService {
 #s;#cards;#access;#verifier;#cursors=new Map();
 constructor(store,{connectionVerifier=null}={}){
  this.#s=store;this.#cards=new ContextCardsService(store);this.#access=new ContextTopicAccessService(store);this.#verifier=connectionVerifier;
 }
 shallow(caller,options={}){return this.#run('shallow',caller,options);}
 topics(caller,options={}){return this.#run('topics',caller,options);}
 searchTopic(caller,options={}){return this.#run('searchTopic',caller,options);}
 readTopic(caller,options={}){return this.#run('readTopic',caller,options);}
 async #verify(caller){
  const verifier=this.#verifier;
  need(plain(caller)&&typeof verifier?.verify==='function'&&typeof verifier?.isCurrent==='function','connection_unavailable');
  let timer;
  try{
   const receipt=await Promise.race([Promise.resolve().then(()=>verifier.verify(caller,this.#s)),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Object.assign(new Error('Context verification timed out'),{readReason:'timeout'})),CONTEXT_READ_LIMITS.verificationMs);})]);
   need(exact(receipt,['version','store','connectionId','accountId','authorizationGeneration','readable','online','expiresAt'])&&receipt.version===1&&receipt.store===this.#s&&opaque(receipt.connectionId)&&opaque(receipt.accountId)&&revisionOK(receipt.authorizationGeneration)&&receipt.readable===true&&receipt.online===true&&Number.isSafeInteger(receipt.expiresAt)&&receipt.expiresAt>Date.now(),'connection_unavailable');
   return Object.freeze({...receipt});
  }catch(error){if(error?.readReason==='timeout')throw error;refuse('connection_unavailable');}
  finally{clearTimeout(timer);}
 }
 #current(caller,receipt){
  try{
   need(receipt.expiresAt>Date.now(),'connection_changed');
   const current=this.#verifier.isCurrent(caller,receipt,this.#s);
   // This fence is strictly synchronous. A malformed async verifier must not
   // authorize through a truthy Promise or crash the host through rejection.
   if(current!==true){Promise.resolve(current).catch(()=>{});refuse('connection_changed');}
  }
  catch{refuse('connection_changed');}
 }
 #read(fn,stores){
  // Repository.transaction calls open() before invoking its callback. Check
  // before entering it, after every preceding await, so a closed/versionchanged
  // database cannot be reopened or initialized by this read-only service.
  need(this.#access.ready(),'not_ready');
  return this.#s.repository.transaction(false,fn,stores);
 }
 async #snapshot(deep,t){
  need(this.#access.ready(),'not_ready');
  const admission=await this.#access.admission(t,undefined,{scope:deep}),cards=await this.#cards.row(t),choices=deep?await this.#access.row(t):null;
  const authority=deep?admission.authority:await rootReadAuthority(t);
  // Only body-free canonical revisions are retained by cursors. Every ordinary
  // content/source/legacy write also advances rootReadAuthority's generation.
  const fence=JSON.stringify([this.#s.databaseId,authority,admission.epoch,admission.gate,cards.sequence,cards.access,cards.items.map(x=>[x.id,x.card,x.revision,x.lifecycle]),choices?.revision??null]);
  return {...admission,authority,cards,choices,fence};
 }
 #options(kind,input){
  const keys=['cursor','limit',...(kind==='topics'||kind==='searchTopic'?['query']:[]),...(kind==='searchTopic'||kind==='readTopic'?['topicId']:[]),...(kind==='readTopic'?['chunkSize']:[])];
  need(only(input,keys),'invalid_request');
  const o={cursor:null,limit:20,query:'',topicId:null,chunkSize:4096,...input};
  need(o.cursor===null||uuid(o.cursor),'invalid_request');
  need(Number.isInteger(o.limit)&&o.limit>=1&&o.limit<=CONTEXT_READ_LIMITS.page,'invalid_request');
  need(typeof o.query==='string'&&o.query.length<=300&&!o.query.includes('\0'),'invalid_request');
  if(kind==='searchTopic')need(normalizeSearch(o.query).length>0,'invalid_request');
  if(kind==='searchTopic'||kind==='readTopic')need(idOK(o.topicId),'invalid_request');
  need(Number.isInteger(o.chunkSize)&&o.chunkSize>=2&&o.chunkSize<=CONTEXT_READ_LIMITS.chunk,'invalid_request');
  return o;
 }
 async #scope(topicId,captured){
  const choice=captured.choices.choices.find(x=>x.topicId===topicId&&x.enabled);
  need(choice,'topic_unavailable');
  const scope=await readContextTopicScope(this.#s,{topicId,expectedAuthority:captured.authority});
  if(!scope.available){if(scope.reason==='hash_budget')refuse('scope_budget');if(['not_ready','stale_authority','scope_budget','incomplete_page','topic_unavailable'].includes(scope.reason))refuse(scope.reason);refuse('storage_unavailable');}
  const decision=evaluateContextTopicAccess({...scope.snapshot,selection:{...choice.binding,enabled:true}});
  if(!decision.policyAllowed)refuse(['legacy_restricted','content_unavailable','selection_stale','topic_unavailable'].includes(decision.reason)?'topic_unavailable':'storage_unavailable');return scope;
 }
 async #inputs(scope,captured){
  return this.#read(async transaction=>{
   const t=boundedReader(transaction,(a,b)=>this.#s.repository.factory.cmp(a,b));
   need((await this.#snapshot(true,t)).fence===captured.fence,'stale_authority');
   const whole=new Set(),inputs=new Map(),memory=new MemoryService(this.#s);let materialBytes=0;
   for(const entryId of scope.scope.entryIds){
    const entry=await this.#s.readableEntry(t,entryId);
    if(entry.bodyBinding!=='input')continue;
    const bound=await bindingSource(this.#s,t,entry);
    need(bound&&entry.workingInputId===bound.inputId&&entry.bindingRevision===bound.contentRevision&&entry.bindingLength===bound.body.length&&entry.thoughtText===bound.body,'full_input_unavailable');
    whole.add(bound.inputId);
   }
   // Dependency IDs include negative witnesses and excerpt/AI origins. They
   // cannot silently authorize the unseen remainder of an Archive Input.
   need(scope.scope.inputIds.every(id=>whole.has(id)),'full_input_unavailable');
   for(const inputId of [...whole].sort()){
    need(scope.scope.inputIds.includes(inputId),'full_input_unavailable');
    const p=await inputProjection(this.#s,t,inputId);
    need(p&&typeof p.body==='string'&&typeof p.note==='string'&&revisionOK(p.contentRevision)&&!await this.#s.isFiltered(t,p.block,await t.get('meta','smart-filter'))&&await memory.safeSources(t,p.sourceRecordIds),'content_unavailable');
    materialBytes+=bytes(p.body)+bytes(p.note);need(materialBytes<=CONTEXT_READ_LIMITS.materialBytes,'scope_budget');
    const ix=await t.get('recordIndex',p.block.originalTextReference);
    // Null means unknown, never an invented timestamp or an endorsement.
    const sourceSentAt=typeof ix?.sourceSentAt==='string'&&Number.isFinite(Date.parse(ix.sourceSentAt))?ix.sourceSentAt:null;
    inputs.set(inputId,{inputId,revision:p.contentRevision,sourceSentAt,body:p.body,note:p.note});
   }
   return [...inputs.values()];
  });
 }
 async #run(kind,caller,input){
  let timer;const attempt={expired:false};
  try{return await Promise.race([this.#execute(kind,caller,input,attempt),new Promise(resolve=>{timer=setTimeout(()=>{attempt.expired=true;resolve(unavailable('timeout'));},CONTEXT_READ_LIMITS.requestMs);})]);}
  catch(error){return failure(error);}
  finally{clearTimeout(timer);}
 }
 async #execute(kind,caller,input,attempt){
  const o=this.#options(kind,input),deep=kind!=='shallow',signature=JSON.stringify([kind,o.topicId,o.query,o.chunkSize]);
  const now=Date.now();for(const [key,value]of this.#cursors)if(value.expiresAt<=now)this.#cursors.delete(key);
  const previous=o.cursor?this.#cursors.get(o.cursor):null;
  if(o.cursor)need(previous&&previous.caller===caller&&previous.signature===signature,'stale_cursor');
  const receipt=await this.#verify(caller);this.#current(caller,receipt);
  if(previous)need(previous.connection===identity(receipt),'stale_cursor');
  need(this.#access.ready(),'not_ready');
  const captured=await this.#read(t=>this.#snapshot(deep,t),['meta']);
  if(previous)need(previous.fence===captured.fence,'stale_cursor');
  need(captured.cards.access.global.enabled,'global_off');
  if(deep)need(captured.cards.access.inputs.enabled,'inputs_off');
  let position=previous?.position??{index:0,field:0,offset:0},items=[],complete=false,outputBytes=2;
  const append=item=>{
   const size=bytes(JSON.stringify(item))+(items.length?1:0);
   if(outputBytes+size>CONTEXT_READ_LIMITS.outputBytes){need(items.length>0,'output_budget');return false;}
   items.push(item);outputBytes+=size;return true;
  };
  if(kind==='shallow'){
   const effective=await readableContextItems(this.#s,captured.cards.items.filter(x=>x.lifecycle==='active'&&CONTEXT_ITEM_CARDS.includes(x.card)&&captured.cards.access[x.card].enabled),{epoch:captured.epoch,expectedAuthority:captured.authority,rowSerialized:JSON.stringify(captured.cards)});
   need(!effective.automaticEvaluation,'content_unavailable');
   const open=effective.items.filter(x=>x.lifecycle==='active'&&CONTEXT_ITEM_CARDS.includes(x.card)&&captured.cards.access[x.card].enabled).sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id));
   for(const x of open.slice(position.index,position.index+o.limit))if(!append({itemId:x.id,card:x.card,role:roles[x.card],authority:'data',origin:x.origin,revision:x.revision,section:x.section,text:x.body}))break;
   position={index:position.index+items.length,field:0,offset:0};complete=position.index===open.length;
  }else if(kind==='topics'){
   const choices=captured.choices.choices.filter(x=>x.enabled).sort((a,b)=>this.#s.repository.factory.cmp(JSON.stringify([a.binding.createdAt,a.topicId]),JSON.stringify([b.binding.createdAt,b.topicId])));
   let index=position.index,scanned=0;
   while(index<choices.length&&items.length<o.limit&&scanned++<CONTEXT_READ_LIMITS.scan){
    const choice=choices[index++];
    try{await this.#scope(choice.topicId,captured);}catch(error){if(error?.readReason==='topic_unavailable')continue;throw error;}
    const item=await this.#read(async t=>{
     need((await this.#snapshot(true,t)).fence===captured.fence,'stale_authority');
     const topic=await t.get('topics',choice.topicId),memory=new MemoryService(this.#s);
     need(topic&&typeof topic.name==='string'&&topic.name.length<=300,'topic_unavailable');
     return {topicId:topic.id,name:await memory.safeLabel(t,topic,'name'),revision:topic.revision,role:'topic_directory',authority:'data'};
    });
    if(!o.query||normalizeSearch(item.name).includes(normalizeSearch(o.query)))items.push(item);
   }
   position={index,field:0,offset:0};complete=index===choices.length;
  }else{
   const scope=await this.#scope(o.topicId,captured),inputs=await this.#inputs(scope,captured);
   if(kind==='searchTopic'){
    const q=normalizeSearch(o.query),hits=inputs.filter(x=>normalizeSearch(x.body).includes(q)||normalizeSearch(x.note).includes(q));
    items=hits.slice(position.index,position.index+o.limit).map(x=>{
     const field=normalizeSearch(x.body).includes(q)?'body':'note';
     return {topicId:o.topicId,inputId:x.inputId,revision:x.revision,sourceSentAt:x.sourceSentAt,field,role:field==='body'?'user_input':'user_note',authority:'data',contentOwner:'working_input',snippet:searchExcerpt(x[field],o.query,240)};
    });
    position={index:position.index+items.length,field:0,offset:0};complete=position.index===hits.length;
   }else{
    let {index,field,offset}=position;
    while(index<inputs.length&&items.length<o.limit){
     const value=inputs[index],name=field===0?'body':'note',text=value[name];
     let end=Math.min(text.length,offset+o.chunkSize);
     // Preserve original UTF-16 code units without splitting surrogate pairs.
     if(end<text.length&&end>offset&&/[\uD800-\uDBFF]/.test(text[end-1])&&/[\uDC00-\uDFFF]/.test(text[end]))end--;
     if(!append({topicId:o.topicId,inputId:value.inputId,revision:value.revision,sourceSentAt:value.sourceSentAt,field:name,role:field===0?'user_input':'user_note',authority:'data',contentOwner:'working_input',offset,end,totalLength:text.length,text:text.slice(offset,end),fieldComplete:end===text.length}))break;
     if(end===text.length){offset=0;if(field===0)field=1;else{index++;field=0;}}else offset=end;
    }
    position={index,field,offset};complete=index===inputs.length;
   }
  }
  need(bytes(JSON.stringify(items))<=CONTEXT_READ_LIMITS.outputBytes,'output_budget');
  // Reverify connection after all async material work; then read local state
  // after that await, and perform the synchronous host fence immediately before
  // return. Late verifier callbacks cannot release a timed-out attempt.
  const current=await this.#verify(caller);need(identity(current)===identity(receipt),'connection_changed');
  const latest=await this.#read(t=>this.#snapshot(deep,t),['meta']);
  need(latest.fence===captured.fence,'stale_authority');need(!attempt.expired,'timeout');this.#current(caller,current);
  let nextCursor=null;
  if(!complete){
   while(this.#cursors.size>=CONTEXT_READ_LIMITS.cursors)this.#cursors.delete(this.#cursors.keys().next().value);
   nextCursor=crypto.randomUUID();this.#cursors.set(nextCursor,{caller,signature,connection:identity(current),fence:captured.fence,position,expiresAt:Math.min(Date.now()+CONTEXT_READ_LIMITS.cursorMs,current.expiresAt)});
  }
  return {available:true,reason:'read_ready',items,nextCursor,complete,coverage:kind==='readTopic'?'whole_bound_user_inputs':kind==='searchTopic'?'whole_bound_user_input_matches':kind==='topics'?'permitted_topics':'open_context_items',externalAllowed:true};
 }
}
