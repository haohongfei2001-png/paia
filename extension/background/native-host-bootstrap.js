// ZERO imports. This is the production worker's FIRST static dependency.
// Contract: the browser-created realm's INITIAL globals are trusted. JavaScript
// does not detect a pre-import fake/Proxy realm. Injected test owners never gain
// production origin from this capture. Only the INITIAL Root.performance and
// Root.indexedDB native getters may run, once each, for their lazy carriers.
// No other getter, SDK operation, listener or await runs here.
const Root=globalThis,Apply=Reflect.apply,Descriptor=Object.getOwnPropertyDescriptor,Prototype=Object.getPrototypeOf,HasOwn=Object.hasOwn,Freeze=Object.freeze,Create=Object.create,NativeError=Error;
const InitialMap=Map,InitialMapGet=Map.prototype.get,InitialMapSet=Map.prototype.set,InitialMapHas=Map.prototype.has,InitialSet=Set,InitialSetAdd=Set.prototype.add,InitialSetDelete=Set.prototype.delete,InitialSetHas=Set.prototype.has,InitialSetSize=Object.getOwnPropertyDescriptor(Set.prototype,'size').get;
const InitialNames=Object.getOwnPropertyNames,InitialSymbols=Object.getOwnPropertySymbols,InitialArrayIs=Array.isArray,InitialNumberFinite=Number.isFinite,InitialNumberSafe=Number.isSafeInteger,InitialObjectIs=Object.is,InitialString=String,InitialCharCode=String.prototype.charCodeAt,InitialObjectPrototype=Object.prototype,InitialArrayPrototype=Array.prototype;
const InitialWeakMap=WeakMap,InitialWeakGet=WeakMap.prototype.get,InitialWeakSet=WeakMap.prototype.set,InitialWeakHas=WeakMap.prototype.has,InitialWeakDelete=WeakMap.prototype.delete,InitialSymbol=Symbol;
const facts=[],localFactIndices=[];let supported=true,performanceGetterUsed=false,indexedDBGetterUsed=false;
function remember(owner,key,required=false,type=null){
 if(owner===null||(typeof owner!=='object'&&typeof owner!=='function')){if(required)supported=false;return undefined;}
 let node=owner,depth=0;
 while(node!==null){
  if(++depth>16){supported=false;return undefined;}
  const parent=Prototype(node),d=Descriptor(node,key);
  facts[facts.length]={node,parent,key,descriptor:d};
  if(d){
   if(!HasOwn(d,'value')){
    // Chromium worker globals expose these two native carriers as getters.
    // The authentic INITIAL realm is the premise, not a JS native detector.
    // Preserve this descriptor and every resolution hop already recorded;
    // invoke only its captured getter, with the ORIGINAL Root receiver.
    // A previously unsupported browser profile never triggers lazy allocation.
    const performanceSlot=owner===Root&&key==='performance',indexedDBSlot=owner===Root&&key==='indexedDB';
    if(!supported||!performanceSlot&&!indexedDBSlot||typeof d.get!=='function'||performanceSlot&&performanceGetterUsed||indexedDBSlot&&indexedDBGetterUsed){supported=false;return undefined;}
    if(performanceSlot)performanceGetterUsed=true;else indexedDBGetterUsed=true;
    let value;try{value=Apply(d.get,Root,[]);}catch{supported=false;return undefined;}
    if(value===null||typeof value!=='object'){supported=false;return undefined;}
    return value;
   }
   const value=d.value;if(required&&(value===undefined||value===null)||type!==null&&value!==undefined&&typeof value!==type)supported=false;return value;
  }
  node=parent;
 }
 if(required)supported=false;return undefined;
}
// Fixed local-use dependencies are recorded at their ORIGINAL resolution.
// No caller-selected keys, later host walk, or reusable readiness is accepted.
function rememberLocal(owner,key,required=false,type=null){const start=facts.length,value=remember(owner,key,required,type);for(let i=start;i<facts.length;i++)localFactIndices[localFactIndices.length]=i;return value;}
function fields(owner,names,required=false,type=null){for(let i=0;i<names.length;i++)remember(owner,names[i],required,type);}
function event(owner,key,required=false){const value=remember(owner,key,required);if(value!==undefined)fields(value,['addListener','removeListener','hasListener','hasListeners'],true,'function');}
const host=rememberLocal(Root,'chrome',true),runtime=remember(host,'runtime',true),tabs=remember(host,'tabs',true),scripting=remember(host,'scripting',true),storage=rememberLocal(host,'storage',true),local=rememberLocal(storage,'local',true),session=remember(storage,'session'),permissions=remember(host,'permissions'),action=remember(host,'action'),windows=remember(host,'windows');
fields(runtime,['connectNative'],false,'function');if(windows!==undefined)fields(windows,['get'],true,'function');
fields(runtime,['id'],true,'string');fields(runtime,['getURL','getManifest','getContexts','sendMessage'],true,'function');
for(const key of ['onMessage','onConnect','onStartup','onInstalled','onSuspend','onSuspendCanceled','onUpdateAvailable'])event(runtime,key,true);
fields(tabs,['get','query','sendMessage','create','update'],true,'function');for(const key of ['onRemoved','onUpdated','onCreated','onReplaced','onActivated'])event(tabs,key,true);
fields(scripting,['executeScript'],true,'function');const localGet=rememberLocal(local,'get',true,'function'),localSet=rememberLocal(local,'set',true,'function');fields(local,['remove','setAccessLevel'],true,'function');if(session!==undefined)fields(session,['get','set','remove','setAccessLevel'],true,'function');event(storage,'onChanged');
if(permissions!==undefined){fields(permissions,['contains','request','remove']);event(permissions,'onAdded');event(permissions,'onRemoved');}if(action!==undefined)event(action,'onClicked');
const clockOwner=rememberLocal(Root,'performance',true),clockMethod=rememberLocal(clockOwner,'now',true,'function');
const indexedDB=remember(Root,'indexedDB',true),keyRange=remember(Root,'IDBKeyRange',true);fields(indexedDB,['open','deleteDatabase','databases','cmp'],true,'function');fields(keyRange,['bound','only','lowerBound','upperBound'],true,'function');
// Capture the native methods that subsequent original modules rely on. Later
// replacement is refused; never adopt a new function/prototype on first use.
const objects=remember(Root,'Object',true),reflect=remember(Root,'Reflect',true),arrays=remember(Root,'Array',true),strings=remember(Root,'String',true),promises=remember(Root,'Promise',true),weakmaps=remember(Root,'WeakMap',true),maps=remember(Root,'Map',true),sets=remember(Root,'Set',true),json=remember(Root,'JSON',true);
fields(objects,['getOwnPropertyDescriptor','getOwnPropertyDescriptors','getOwnPropertyNames','getOwnPropertySymbols','getPrototypeOf','hasOwn','freeze','create','keys','values','entries','fromEntries','setPrototypeOf'],true,'function');fields(reflect,['apply','ownKeys'],true,'function');fields(arrays,['isArray','from'],true,'function');fields(json,['parse','stringify'],true,'function');fields(promises,['resolve','all','race','allSettled'],true,'function');
const ap=remember(arrays,'prototype',true),sp=remember(strings,'prototype',true),pp=remember(promises,'prototype',true),wp=remember(weakmaps,'prototype',true),mp=remember(maps,'prototype',true),stp=remember(sets,'prototype',true);
fields(ap,['some','every','map','filter','forEach','includes','find','flatMap','push','sort','at'],true,'function');fields(sp,['charCodeAt'],true,'function');fields(pp,['then','catch','finally'],true,'function');fields(wp,['get','set','has','delete'],true,'function');fields(mp,['get','set','has','delete','values','entries'],true,'function');fields(stp,['add','has','delete','forEach','values'],true,'function');
// Size accessors are not evaluated or treated as host data edges. Their exact
// original descriptors can still be compared on these trusted native nodes.
for(const pair of [[mp,'size'],[stp,'size']]){const node=pair[0];if(node)facts[facts.length]={node,parent:Prototype(node),key:pair[1],descriptor:Descriptor(node,pair[1])};}
const iterator=Symbol.iterator;for(const node of [ap,mp,stp])if(node)remember(node,iterator,true,'function');
// Immutable original inspection operands only. Native carriers are not
// frozen or recursively copied; no caller-supplied expected facts are accepted.
const inspectionFacts=[];
for(let i=0;i<facts.length;i++){
 const f=facts[i];let expected;
 if(f.descriptor!==undefined){expected=Create(null);const keys=InitialNames(f.descriptor);for(let j=0;j<keys.length;j++)expected[keys[j]]=f.descriptor[keys[j]];Freeze(expected);}
 inspectionFacts[i]=Freeze({node:f.node,key:f.key,parent:f.parent,descriptor:expected});
}
Freeze(inspectionFacts);
const localInspectionFacts=[];for(let i=0;i<localFactIndices.length;i++)localInspectionFacts[i]=inspectionFacts[localFactIndices[i]];Freeze(localInspectionFacts);Freeze(localFactIndices);
let invalidated=false;
const initialSupported=supported&&!!host;for(let i=0;i<facts.length;i++)Freeze(facts[i]);Freeze(facts);
function refuse(){const error=new NativeError('GENERATION_NATIVE_HOST_REQUIRED');error.code='GENERATION_NATIVE_HOST_REQUIRED';throw error;}
function sameDescriptor(a,b){
 if(a===undefined||b===undefined)return a===b;
 if(a.enumerable!==b.enumerable||a.configurable!==b.configurable||HasOwn(a,'value')!==HasOwn(b,'value'))return false;
 return HasOwn(a,'value')?a.value===b.value&&a.writable===b.writable:a.get===b.get&&a.set===b.set;
}
function current(){
 if(!initialSupported||invalidated)refuse();
 // Every node here came from the trusted INITIAL graph; replacements are
 // compared by descriptor identity, never traversed or invoked. Captured
 // native intrinsics + indexed private arrays execute no replacement hooks.
 // Only this synchronous run shares the prototype result for adjacent facts
 // of the SAME initial native node. No callback/await occurs in this loop;
 // every descriptor and every expected parent still receives its own check.
 // This is local work elimination, never a retained readiness/profile cache.
 let previousNode=null,parent=null;
 for(let i=0;i<facts.length;i++){const f=facts[i];if(f.node!==previousNode){parent=Prototype(f.node);previousNode=f.node;}if(parent!==f.parent||!sameDescriptor(Descriptor(f.node,f.key),f.descriptor)){invalidated=true;refuse();}}
 return true;
}
// Availability is descriptive, not readiness. Unsupported shape stays
// unsupported for this incarnation and ordinary startup remains unqualified.
export function originalBootstrapHostSupported(){if(arguments.length)refuse();return initialSupported;}
export function readOriginalBootstrapHost(){if(arguments.length)refuse();current();return host;}
export function requireOriginalBootstrapHost(api){if(arguments.length!==1||api!==host)refuse();return current();}
export function readOriginalBootstrapRuntime(){if(arguments.length)refuse();current();return runtime;}
export function readOriginalBootstrapLocal(){if(arguments.length)refuse();current();return local;}
export function readOriginalBootstrapIndexedDB(){if(arguments.length)refuse();current();return indexedDB;}
export function requireOriginalBootstrapRuntime(value){if(arguments.length!==1||value!==runtime)refuse();return current();}
export function requireOriginalBootstrapLocal(value){if(arguments.length!==1||value!==local)refuse();return current();}

// Initial native bookkeeping intrinsics only: no owner registration, origin
// token, readiness bit or recapture. Every consuming map remains module-private.
export function originalBootstrapWeakMap(){return new InitialWeakMap();}
export function originalBootstrapWeakGet(map,key){return Apply(InitialWeakGet,map,[key]);}
export function originalBootstrapWeakSet(map,key,value){return Apply(InitialWeakSet,map,[key,value]);}
export function originalBootstrapWeakHas(map,key){return Apply(InitialWeakHas,map,[key]);}
export function originalBootstrapWeakDelete(map,key){return Apply(InitialWeakDelete,map,[key]);}
export function originalBootstrapSymbol(){return InitialSymbol();}

export function originalBootstrapFreeze(value){return Freeze(value);}
export function originalBootstrapCreate(prototype){return Create(prototype);}

// Fixed native-inspection operands/intrinsics, never a validation receipt or
// action issuer. The original driver controls and pays the whole iteration.
export function readOriginalBootstrapInspectionFacts(){if(arguments.length||!initialSupported||invalidated)refuse();return inspectionFacts;}
// Immutable operands for the two actual staged core local-use sites only.
// Exposing captured functions does not qualify an owner or mint an action.
export {Apply as originalBootstrapApply,local as originalBootstrapInitialLocal,localGet as originalBootstrapInitialLocalGet,localSet as originalBootstrapInitialLocalSet};
export function readOriginalBootstrapLocalInspectionFacts(){if(arguments.length||!initialSupported||invalidated)refuse();return localInspectionFacts;}
export function rejectOriginalBootstrapInspection(){invalidated=true;refuse();}
export function invalidateOriginalBootstrapInspection(){invalidated=true;}
export function originalBootstrapPrototype(value){return Prototype(value);}
export function originalBootstrapDescriptor(value,key){return Descriptor(value,key);}
export function originalBootstrapHasOwn(value,key){return HasOwn(value,key);}
export function originalBootstrapNames(value){return InitialNames(value);}
export function originalBootstrapSymbols(value){return InitialSymbols(value);}
export function originalBootstrapArrayIs(value){return InitialArrayIs(value);}
export function originalBootstrapFinite(value){return InitialNumberFinite(value);}
export function originalBootstrapSafeInteger(value){return InitialNumberSafe(value);}
export function originalBootstrapSameValue(a,b){return InitialObjectIs(a,b);}
export function originalBootstrapNumberString(value){if(typeof value!=='number')refuse();return InitialString(value);}
export function originalBootstrapCharCode(value,index){return Apply(InitialCharCode,value,[index]);}
export function originalBootstrapPlainPrototype(value){return value===InitialObjectPrototype||value===null;}
export function originalBootstrapArrayPrototype(value){return value===InitialArrayPrototype;}
export function originalBootstrapIteratorKey(value){return value===iterator;}
export function originalBootstrapCompareDescriptor(a,b){return sameDescriptor(a,b);}
export function originalBootstrapNow(){if(!initialSupported||typeof clockMethod!=='function')refuse();return Apply(clockMethod,clockOwner,[]);}
export function originalBootstrapMap(){return new InitialMap();}
export function originalBootstrapMapGet(map,key){return Apply(InitialMapGet,map,[key]);}
export function originalBootstrapMapSet(map,key,value){return Apply(InitialMapSet,map,[key,value]);}
export function originalBootstrapMapHas(map,key){return Apply(InitialMapHas,map,[key]);}
export function originalBootstrapSet(){return new InitialSet();}
export function originalBootstrapSetAdd(set,value){return Apply(InitialSetAdd,set,[value]);}
export function originalBootstrapSetDelete(set,value){return Apply(InitialSetDelete,set,[value]);}
export function originalBootstrapSetHas(set,value){return Apply(InitialSetHas,set,[value]);}
export function originalBootstrapSetSize(set){return Apply(InitialSetSize,set,[]);}
// These fixed initial carriers confer no readiness. Only the original paid
// driver validation path uses them to return a requested binding after checks.
export function originalBootstrapHostCarrier(){return host;}
export function originalBootstrapRuntimeCarrier(){return runtime;}
export function originalBootstrapLocalCarrier(){return local;}
export function originalBootstrapIndexedDBCarrier(){return indexedDB;}
