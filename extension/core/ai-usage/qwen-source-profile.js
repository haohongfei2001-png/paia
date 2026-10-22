// Static source -> exact current qualification -> original control/measurement
// owners. The installation list is the sole minting input. There is deliberately
// no public constructor accepting caller profiles, JSON receipts or callbacks.
import {QWEN_SOURCE_PROFILE_INSTALLATIONS} from './qwen-source-profile-installations.js';
import {createQwenBpeCounter,inspectQwenBpeCounter} from './qwen-bpe-counter.js';
import {createQwenWireCounter,inspectQwenWireMeasurement} from './qwen-wire-counter.js';
import {createQwenSourceProfileControls} from './qwen-request-profile.js';
import {snapshot,exact,integer,token,freeze,boundedSchema} from './qwen-request-data.js';
import {canonical} from './contracts.js';
import {ROUTE_FIELDS} from './ratebook.js';
import {ENVELOPES} from './admission-policy.js';
import {hashText} from '../dedupe.js';

const caps=new WeakMap(),manifests=new WeakMap(),sourceMeasurements=new WeakMap(),sourceControls=new WeakMap(),states=new Map();let lastNow=0,clockFailed=false;
const same=(a,b)=>canonical(a)===canonical(b),digest=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const unavailable=()=>Object.freeze({status:'UNAVAILABLE',reason:'SOURCE_PROFILE_UNAVAILABLE',qualification:'NOT_ESTABLISHED',financialAuthority:false,dispatchAllowed:false});
const roles=['MODEL_TOKENIZER','FULL_WIRE_BOUND','NORMALIZATION','USAGE_PROFILE','RESPONSE_QUALITY','RATEBOOK'];
// Deny-only lifecycle of the same privately installed source. Capture native
// methods so later public prototype/instance callbacks cannot suppress revoke.
const NativeAbortController=AbortController,nativeAbort=AbortController.prototype.abort,nativeControllerSignal=Object.getOwnPropertyDescriptor(AbortController.prototype,'signal').get,nativeDispatchEvent=EventTarget.prototype.dispatchEvent;
function now(){const n=Date.now();if(clockFailed||!integer(n)||n<lastNow){clockFailed=true;throw Error('CLOCK');}lastNow=n;return n;}
function retire(s){
 if(!s||s.retired)return;s.retired=true;
 // Mark retired before dispatching native listeners: reentrant reads fail and
 // retained prepared cells are cleared before any owned mechanism is disposed.
 nativeAbort.call(s.controller);
 s.counter?.dispose();for(const owner of s.wires.values())owner.dispose();s.wires.clear();s.compiler?.dispose();
}
function current(s){try{const n=now();if(!s||s.retired||!s.ready||n<s.verifiedAt||n>=s.expiresAt||inspectQwenBpeCounter(s.counter)!==s.counterInfo){if(s)retire(s);return false;}return true;}catch{if(s)retire(s);return false;}}
function sourceEntry(id){
 if(!Array.isArray(QWEN_SOURCE_PROFILE_INSTALLATIONS)||QWEN_SOURCE_PROFILE_INSTALLATIONS.length>16)return null;
 const ids=new Set();let found=null;
 for(const e of QWEN_SOURCE_PROFILE_INSTALLATIONS){
  if(!e||![Object.prototype,null].includes(Object.getPrototypeOf(e)))return null;
  const ds=Object.getOwnPropertyDescriptors(e),keys=Reflect.ownKeys(ds);
  if(keys.length!==5||keys.some(k=>typeof k!=='string'||!['version','id','manifest','counter','qualification'].includes(k)||!ds[k].enumerable||!Object.hasOwn(ds[k],'value'))||ds.version.value!==1||!token(ds.id.value)||ids.has(ds.id.value))return null;
  ids.add(ds.id.value);if(ds.id.value===id)found=Object.fromEntries(keys.map(k=>[k,ds[k].value]));
 }
 return found;
}
async function load(e,s){let counter=null;try{
 const m=freeze(snapshot(e.manifest,{maxBytes:65536,maxKeys:4096,maxDepth:16,maxString:8192})),q=freeze(snapshot(e.qualification,{maxBytes:131072,maxKeys:4096,maxDepth:16,maxString:16384}));
 if(!exact(m,['version','profile','known','route','wire','tokenizer'])||m.version!==1||m.profile?.id!==e.id||m.profile?.kind!=='source-request-profile-v1'||!exact(q,['version','id','manifestDigest','counter','boundMethod','receipts','verifiedAt','expiresAt','revocationVersion'])||q.version!==1||!token(q.id)||!digest(q.manifestDigest)||!token(q.revocationVersion)||q.boundMethod!=='whole-wire-bpe-plus-qualified-overhead-v1')throw Error('SOURCE');
 const p=m.profile,t=m.tokenizer,w=m.wire,r=m.route,v=p.validity;
 if(!exact(v,['verifiedAt','expiresAt','revoked'])||v.revoked!==false||!integer(v.verifiedAt)||!integer(v.expiresAt)||v.expiresAt<=v.verifiedAt||v.expiresAt-v.verifiedAt>86400000||q.verifiedAt!==v.verifiedAt||q.expiresAt!==v.expiresAt||now()<v.verifiedAt||now()>=v.expiresAt)throw Error('VALIDITY');
 if(!exact(r,ROUTE_FIELDS)||!ROUTE_FIELDS.every(k=>token(r[k]))||r.provider!=='qwen'||r.api!=='chat-completions'||r.model!==p.model?.requested||r.resolutionVersion!==p.model?.resolutionVersion||r.region!==p.endpoint?.region||r.deployment!==p.endpoint?.deployment||r.profile!==p.apiProfileId||r.tokenizer!==p.tokenizerProfileId)throw Error('ROUTE');
 if(!exact(w,['instructions','responseFormat','thinkingControls'])||typeof w.instructions!=='string'||!w.instructions.length||!exact(w.responseFormat,['type','json_schema'])||w.responseFormat.type!=='json_schema'||!exact(w.responseFormat.json_schema,['name','strict','schema'])||!token(w.responseFormat.json_schema.name)||w.responseFormat.json_schema.strict!==true)throw Error('WIRE');
 boundedSchema(w.responseFormat.json_schema.schema);
 if(!exact(t,['profileId','qualificationRef','protocolOverheadTokens','maxWireBytes'])||t.profileId!==p.tokenizerProfileId||t.qualificationRef!==q.id||!integer(t.protocolOverheadTokens)||t.protocolOverheadTokens<1||!integer(t.maxWireBytes)||t.maxWireBytes<1||t.maxWireBytes>262144)throw Error('TOKENIZER');
 if(p.thinking?.enabled?(p.jobType!=='AI_ORGANIZE'||!same(w.thinkingControls,{enable_thinking:true,thinking_budget:p.thinking.thinkingBudget})):!same(w.thinkingControls,{enable_thinking:false}))throw Error('THINKING');
 if(await hashText(canonical(m))!==q.manifestDigest||await hashText(canonical(w.responseFormat.json_schema.schema))!==p.responseSchemaDigest)throw Error('DIGEST');
 if(!Array.isArray(q.receipts)||q.receipts.length<roles.length||q.receipts.length>16)throw Error('RECEIPTS');
 const seen=new Set(),covered=new Set(),quality=[];
 for(const receipt of q.receipts){
  if(!exact(receipt,['id','role','digest','content'])||!token(receipt.id)||seen.has(receipt.id)||!roles.includes(receipt.role)||!digest(receipt.digest)||typeof receipt.content!=='string'||!receipt.content.length||await hashText(receipt.content)!==receipt.digest)throw Error('RECEIPT');
  const header=snapshot(JSON.parse(receipt.content),{maxBytes:16384,maxKeys:256,maxDepth:8,maxString:8192});
  if(!exact(header,['version','id','role','manifestDigest','counterDigest','verifiedAt','expiresAt','result','evidence'])||header.version!==1||header.id!==receipt.id||header.role!==receipt.role||header.manifestDigest!==q.manifestDigest||header.counterDigest!==await hashText(canonical(q.counter))||header.verifiedAt!==q.verifiedAt||header.expiresAt!==q.expiresAt||header.result!=='QUALIFIED'||!Array.isArray(header.evidence)||!header.evidence.length||header.evidence.length>16||header.evidence.some(x=>!digest(x)))throw Error('RECEIPT_BINDING');
  seen.add(receipt.id);covered.add(receipt.role);if(receipt.role==='RESPONSE_QUALITY')quality.push(receipt.id);
 }
 if(roles.some(role=>!covered.has(role))||!same([...quality].sort(),[...p.qualityReceiptRefs].sort()))throw Error('QUALITY');
 // These receipts are trusted only because this exact reviewed static source
 // installs them. Their JSON is not a public attestation or self-approval API.
 counter=await createQwenBpeCounter(e.counter);const info=inspectQwenBpeCounter(counter);
 if(!info||!same(info,q.counter)||info.maxWireBytes!==t.maxWireBytes)throw Error('ASSET');
 const compiler=createQwenSourceProfileControls({profile:p,known:m.known});
 const childIdentity={logicalJobId:'source-profile-check',childOperationId:'source-profile-check',type:p.jobType,contractVersion:p.contractVersion,routeVersion:p.routeVersion,automaticRetries:0};
 const probe=compiler.compile({childIdentity,inputTokens:0,outputCap:Math.min(p.qualifiedLimits.billableOutputCap,ENVELOPES[p.jobType]?.output??0),stream:false,now:now()});if(probe.status!=='COMPILED_PARTIAL')throw Error('CONTROLS');
 const instructionsDigest=await hashText(w.instructions),responseFormatDigest=await hashText(canonical(w.responseFormat));
 if(s.retired||now()>=q.expiresAt)throw Error('RETIRED');
 Object.assign(s,{manifest:m,qualification:q,counter,counterInfo:info,compiler,verifiedAt:q.verifiedAt,expiresAt:q.expiresAt,instructionsDigest,responseFormatDigest,ready:true});
 const cap=Object.freeze({});caps.set(cap,s);manifests.set(m,cap);s.cap=cap;return cap;
 }catch{counter?.dispose();retire(s);return null;}}
export async function loadInstalledQwenSourceProfile(id){
 if(!token(id))return null;const existing=states.get(id);if(existing){if(existing.promise)return existing.promise;return current(existing)?existing.cap:null;}
 const entry=sourceEntry(id);if(!entry||states.size>=16)return null;
 const controller=new NativeAbortController(),retirementSignal=nativeControllerSignal.call(controller);
 // Some native implementations dispatch abort through this public method.
 // Keep that native path immutable without freezing the signal's internal state.
 Object.defineProperty(retirementSignal,'dispatchEvent',{value:nativeDispatchEvent});
 const s={id,retired:false,ready:false,wires:new Map(),promise:null,controller,retirementSignal};states.set(id,s);s.promise=load(entry,s);const cap=await s.promise;s.promise=null;return cap;
}
export function inspectInstalledQwenSourceProfile(cap){const s=caps.get(cap);return current(s)?Object.freeze({id:s.id,manifestDigest:s.qualification.manifestDigest,qualificationRef:s.qualification.id,revocationVersion:s.qualification.revocationVersion,expiresAt:s.expiresAt}):null;}
// This signal only withdraws availability. It does not mint a source, admit body
// reads or qualify any request. The prepared owner retains its original expiry
// timer; every source currentness check also retires/aborts on expiry or rollback.
export function installedQwenSourceRetirementSignal(cap){const s=caps.get(cap);return current(s)?s.retirementSignal:null;}
export function installedQwenSourceManifest(cap){const s=caps.get(cap);return current(s)?s.manifest:null;}
export function installedQwenManifestCapability(manifest){const cap=manifests.get(manifest);return inspectInstalledQwenSourceProfile(cap)?cap:null;}
export function isInstalledQwenMeasurement(value,cap){return sourceMeasurements.get(value)===cap&&inspectInstalledQwenSourceProfile(cap)!==null;}
export function retireInstalledQwenSourceProfile(id){const s=typeof id==='string'&&states.get(id);if(!s)return false;retire(s);return true;}
export function compileInstalledQwenRequest(cap,options){try{const s=caps.get(cap);if(!current(s))return unavailable();const o=snapshot(options);if(!exact(o,['childIdentity','inputTokens','outputCap','stream']))return unavailable();
 const out=s.compiler.compile({...o,now:now()});return current(s)&&out.status==='COMPILED_PARTIAL'?freeze({...out,sourceKind:'SOURCE_QUALIFIED_PROFILE',qualification:'SOURCE_RECEIPTS_CURRENT',profileSourceCurrent:true}):unavailable();}catch{return unavailable();}}
// Public controls remain metadata only. Their original compiler handle and exact
// installed source/counter authority are private, not reconstructible from DTOs.
export function prepareInstalledQwenControls(cap,options){try{
 const s=caps.get(cap);if(!current(s))return unavailable();
 const o=snapshot(options);if(!exact(o,['childIdentity','outputCap','stream']))return unavailable();
 const original=s.compiler.prepareControls({...o,now:now()});if(!current(s)||original.status!=='CONTROLS_PREPARED')return unavailable();
 const handle=freeze({...original,sourceKind:'SOURCE_QUALIFIED_PROFILE',qualification:'SOURCE_RECEIPTS_CURRENT',profileSourceCurrent:true});
 sourceControls.set(handle,{cap,original});return handle;
 }catch{return unavailable();}}
export function finishInstalledQwenInputBound(cap,handle,options){try{
 const s=caps.get(cap),record=sourceControls.get(handle);if(!current(s)||!record||record.cap!==cap)return unavailable();
 sourceControls.delete(handle);
 const o=snapshot(options);if(!exact(o,['inputTokens']))return unavailable();
 const out=s.compiler.finishInputBound(record.original,{inputTokens:o.inputTokens,now:now()});
 return current(s)&&out.status==='COMPILED_PARTIAL'?freeze({...out,sourceKind:'SOURCE_QUALIFIED_PROFILE',qualification:'SOURCE_RECEIPTS_CURRENT',profileSourceCurrent:true}):unavailable();
 }catch{return unavailable();}}
export async function measureInstalledQwenRequest(cap,value){const s=caps.get(cap);if(!current(s))return null;try{
 const o=snapshot(value,{maxBytes:300000,maxKeys:4096,maxDepth:16,maxString:262144});
 if(!exact(o,['profileId','tokenizerProfileId','qualificationRef','requestDigest','envelope'])||o.profileId!==s.id||o.tokenizerProfileId!==s.manifest.tokenizer.profileId||o.qualificationRef!==s.qualification.id||typeof o.envelope?.body!=='string'||o.envelope.body.length>s.counterInfo.maxWireBytes)return null;
 const stream=JSON.parse(o.envelope.body).stream;if(typeof stream!=='boolean')return null;
 let wire=s.wires.get(stream);if(!wire){const p=s.manifest.profile;
  wire=createQwenWireCounter(s.counter,{profileId:s.id,tokenizerProfileId:p.tokenizerProfileId,qualificationRef:s.qualification.id,endpoint:{scheme:'https',host:p.endpoint.host,path:p.endpoint.path},model:p.model.requested,instructionsDigest:s.instructionsDigest,responseFormatDigest:s.responseFormatDigest,thinkingControls:s.manifest.wire.thinkingControls,requestControls:{stream,max_completion_tokens:p.thinking.requestedMaxCompletionTokens,...(stream?{stream_options:{include_usage:true}}:{})},protocolOverheadTokens:s.manifest.tokenizer.protocolOverheadTokens,maxInputTokens:Math.min(p.qualifiedLimits.inputTokens,ENVELOPES[p.jobType]?.input??0),expiresAt:s.expiresAt});if(!wire)return null;s.wires.set(stream,wire);}
 const measured=await wire.measure({envelope:o.envelope,requestDigest:o.requestDigest,now:now()}),metadata=current(s)?inspectQwenWireMeasurement(measured,wire):null;if(metadata)sourceMeasurements.set(metadata,cap);return metadata;
 }catch{return null;}}
