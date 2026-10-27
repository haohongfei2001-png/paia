import {ArchiveError,STORAGE_KEY} from '../constants.js';
import {CONTROL_PUBLICATION_REVISION,CONTROL_PUBLICATION_RESERVATION} from '../local-control-publication-keys.js';

// A logical-work envelope for the ORIGINAL successful held tail, not a native
// allocation/latency bound, a writer capability, or a cold recovery receipt.
// The portal supplies its private committed full-CAS profile; a copy of this input
// never grants admission. Unknown profiles fail before the SDK is dispatched.
const PROFILE='unprotected-source-active-target-v1';
const SELECTION='application-generation-selection:v1';
const PROTECTION='canonical-generation:repository-protection:v1';
const GATE='canonical-generation:gate:v1';
const QUALIFICATION='canonical-generation:qualified-graph:v1';
const REGISTRY='canonical-generation:registry:v1';
const PREFIX='canonical-generation:';
const fail=()=>{throw new ArchiveError('BNS_GROUP_RESOURCE_LIMIT');};
const cost=value=>{
 if(!value||!Number.isSafeInteger(value.references)||value.references<0||!Number.isSafeInteger(value.bytes)||value.bytes<0)fail();
 return value;
};

/**
 * price(value,references,origin) must pay for planning this complete operand and
 * its original debit wrapper on the SAME live action, then return the original
 * future debit's {references,bytes}. One private planning batch may share its
 * bookkeeping wrapper, but both trees keep their independent original physical
 * meter roots/limits. No history multiplier, cached input or new clock is used.
 *
 * currentCost / heldCost / normalLocalBoundaryCost are prices for one complete
 * original successful current / allHeld / native-local sweep. They are usable
 * only while the original holds preserve the complete equal operands. The
 * coordinator must check every subsequent actual sweep against that price;
 * changed/oversize/late results invalidate the action, not enlarge this plan.
 * The native price uses this action's already-paid private INITIAL compiler.
 * For the inspected direct-own fixture profile, expected input/output cost22
 * once; each actual boundary pays dynamic requests/bindings q18 + raw results
 * q15 + two wrappers (N35), retaining all seven parent/eight descriptor reads.
 * Other INITIAL graphs are priced from their actual facts, not these constants.
 * Both complete pricing roots, fresh bootstrap validity, every live observation
 * and every comparison remain at all six future local boundaries.
 *
 * This minimal profile deliberately refuses an active/protected source: its
 * independent publication registry is not in the selection portal's prepared
 * record. The ordinary original source and bound active target need no new
 * schema, metadata cache, backend, or writer authority.
 * The six original staged phase callbacks have the closed source three-fence /
 * target five-fence producer sets. IDB refuses an unknown, extra or compatibility
 * fence in that genuine staged profile; it cannot execute a more expensive
 * generic terminal after this quote. Ordinary/recovery/no-phase callers keep
 * their generic terminal path. Typed string-get fallback remains covered below.
 * Primary pages also retain the paired upper bound: the actual original scope
 * may observe keyPath === 'id' and read only full values, but other key paths
 * still need both arrays. No prepared-schema guess or reusable eligibility
 * promise reduces this quote; each future scope observes its actual keyPath.
 *
 * New escrow/receipt metadata is NOT included here: its original coordinator
 * must price and reserve it before dispatch. Successful retirement's existing
 * closed private invalidation/close path has no storage request/debit. Any new
 * current/allHeld call or asynchronous retirement work must also be reserved.
 */
export function buildOriginalApplicationSelectionTailPlan(input,price){
 if(!input||typeof price!=='function')fail();
 const {profile,record,next,after}=input;
 const C=cost(input.currentCost),A=cost(input.heldCost),N=cost(input.normalLocalBoundaryCost);
 if(!profile?.source||!profile?.target||!Array.isArray(profile.target.canonical)||!record||!next||!after)fail();
 const canonical=profile.target.canonical;
 const K=canonical.length;
 if(K<3||K>4096)fail();
 // The original paged append already visited EVERY meta row and the original
 // complete all-table CAS/native commit published this owned immutable profile.
 // Do not enumerate unrelated S/T metadata a second time. This compiler still
 // pays its COMPLETE compact input, including every canonical row, before use.
 price({operation:'selection-tail-plan-profile',profile:PROFILE,prepared:profile},K,'driver');
 const sourceMeta=profile.source.metaCount,targetMeta=profile.target.metaCount;
 if(!Number.isSafeInteger(sourceMeta)||sourceMeta<0||sourceMeta>4096||!Number.isSafeInteger(targetMeta)||targetMeta<K||targetMeta>4096||profile.source.hasProtection!==false||profile.source.hasSelection!==false||profile.target.hasSelection!==false)fail();
 let protection,qualification,hasGate=false,previous=null;
 for(const row of canonical){
  const key=row?.id;if(typeof key!=='string'||key<PREFIX||key>=PREFIX+'\uffff'||previous!==null&&key<=previous)fail();previous=key;
  if(key===PROTECTION)protection=row;else if(key===QUALIFICATION)qualification=row;else if(key===GATE)hasGate=true;
 }
 const baseGate=record.targetGate,root=record.registryRoot;
 if(!protection||!qualification||!baseGate||!hasGate||!root?.active?.receipt||root.pending!==null||baseGate.phase!=='active'||!Number.isSafeInteger(baseGate.writeRevision)||baseGate.writeRevision<0||baseGate.writeRevision>Number.MAX_SAFE_INTEGER-3||next.phase!=='dispatched'||next.role!=='source'||!next.reservation||!next.fences||typeof next.afterDigest!=='string'||next.afterDigest.length!==64||next.operationId!==record.operationId||after.databaseId!==record.targetDatabaseId)fail();
 // Only the original profile's deep-immutable row copies may share a price.
 // This full validation is part of the complete profile operand paid above.
 // A mutable/caller-shaped row retains ordinary repeated pricing; no expected
 // record, next marker, gate copy or future SDK argument is silently cached.
 const immutableRows=new Set(),seen=new WeakSet();
 const immutable=value=>{
  if(value===null||typeof value!=='object')return true;
  if(seen.has(value))return true;if(!Object.isFrozen(value))return false;
  for(const key of Reflect.ownKeys(value)){const d=Object.getOwnPropertyDescriptor(value,key);if(!d||!Object.hasOwn(d,'value')||!immutable(d.value))return false;}
  seen.add(value);return true;
 };
 for(const row of canonical)if(immutable(row))immutableRows.add(row);

 let references=0,bytes=0;
 const sum=(value,multiple=1)=>{
  const p=cost(value);if(!Number.isSafeInteger(multiple)||multiple<0)fail();
  references+=multiple*p.references;bytes+=multiple*p.bytes;
  if(!Number.isSafeInteger(references)||!Number.isSafeInteger(bytes))fail();
 };
 const debit=(value,refs=0,origin='driver',multiple=1)=>sum(price(value,refs,origin),multiple);
 const requests=new Map(),results=new Map(),pairs=new Map(),negativeZero=Object.freeze({});
 const keyOf=value=>typeof value==='number'&&Object.is(value,-0)?negativeZero:value;
 const reusable=value=>value===null||value===undefined||['string','number','boolean'].includes(typeof value)||immutableRows.has(value);
 const cacheFor=(cache,key)=>{let value=cache.get(key);if(!value){value=new Map();cache.set(key,value);}return value;};
 const quoted=(cache,key,create)=>{
  if(cache.has(key))return cache.get(key);
  const p=cost(create()),owned=Object.freeze({references:p.references,bytes:p.bytes});cache.set(key,owned);return owned;
 };
 const request=(origin,key,multiple=1)=>{
  if(typeof key!=='string'){debit(['meta',key],1,origin,multiple);return;}
  sum(quoted(cacheFor(requests,origin),key,()=>price(Object.freeze(['meta',key]),1,origin)),multiple);
 };
 const result=(origin,value,multiple=1)=>{
  if(!reusable(value)){debit(value,0,origin,multiple);return;}
  sum(quoted(cacheFor(results,origin),keyOf(value),()=>price(value,0,origin)),multiple);
 };
 const compare=(a,b,origin='driver',multiple=1)=>{
  if(!reusable(a)||!reusable(b)){debit([a,b],0,origin,multiple);return;}
  sum(quoted(cacheFor(cacheFor(pairs,origin),keyOf(a)),keyOf(b),()=>price(Object.freeze([a,b]),0,origin)),multiple);
 };
 // Original get/put/delete: ONE complete table/key-or-value request tuple and
 // its complete actual result. Both actual debit wrappers remain accounted;
 // do not rebuild the removed table-only request as extra planning work.
 const get=(origin,key,value,multiple=1)=>{
  request(origin,key,multiple);result(origin,value,multiple);
 };
 const put=(origin,value)=>{debit(['meta',value],1,origin);result(origin,value.id);};
 const remove=(origin,key)=>{request(origin,key);result(origin,undefined);};
 const phase=phase=>debit({operation:'original-phase-settled',phase,native:{references:4096,bytes:2*1024*1024}},1);
 // The native summary has the existing scope cap's maximum decimal widths;
 // this is an upper bound for that fixed wrapper, not a larger scope budget.
 const source='repository:source',targetOrigin='repository:target',registry='repository:registry';
 const selected={...next,phase:'selected'},targetMarker={...next,role:'target'};
 const gate2={...baseGate,writeRevision:baseGate.writeRevision+2};
 const gate3={...baseGate,writeRevision:baseGate.writeRevision+3};
 const identity=baseGate.identity;
 const authority={kind:'active-library',identity,gate:gate2,marker:protection,qualification};
 const pages=Math.ceil(K/64),probes=Math.floor(K/64),pageGuards=6*pages+2*probes;
 const range={lower:PREFIX,upper:PREFIX+'\uffff',lowerOpen:false,upperOpen:true};
 const pairedCanonical=gate=>{
  for(let offset=0;offset<K;offset+=64){
   const values=canonical.slice(offset,offset+64).map(row=>row.id===GATE?gate:row),keys=values.map(row=>row.id);
   const after=offset===0?null:canonical[offset-1].id;
   const query={lower:after===null?PREFIX:after,upper:range.upper,lowerOpen:after!==null,upperOpen:true};
   // Price the paired fallback's COMPLETE query and both full raw arrays.
   // An actual id-keyed page instead uses ['getAll'] with q=1 and only the full
   // values result. Every removed key/result/wrapper has nonnegative physical
   // bytes, so this bound covers either branch in BOTH accounting dimensions.
   // The native full-page probe remains identical in either branch.
   debit(['meta',PREFIX,after,64,query,['getAllKeys','getAll']],2,targetOrigin);
   debit(keys,keys.length,targetOrigin);debit(values,values.length,targetOrigin);
   if(values.length===64){
    const end=keys[keys.length-1],probe={lower:end,upper:range.upper,lowerOpen:true,upperOpen:true};
    debit(['meta',end,range.upper,true,true,probe],1,targetOrigin);
    // Exactly-full final pages pay their real undefined result too. No
    // unbounded getAll, projected row, or omitted limit+1 key is assumed.
    debit(canonical[offset+64]?.id,0,targetOrigin);
   }
  }
 };

 // source-selected: original selection/shadow admission, original callback,
 // both finishers, and both original terminal reads in the fixed producer set.
 get(source,SELECTION,next,2);
 get(source,PROTECTION,undefined,3);
 compare(next,next);
 put(source,selected);
 get(source,SELECTION,selected,2);
 compare(selected,selected,source);
 phase('source-selected');

 // Active target prelude runs before the write transaction (:595), through
 // canonical-generation-publication :235-245. rootRead reads its receipt too.
 get(registry,REGISTRY,root,2);
 get(registry,root.active.receipt.id,root.active.receipt,2);
 get(targetOrigin,GATE,gate2);get(targetOrigin,PROTECTION,protection);get(targetOrigin,QUALIFICATION,qualification);
 // The original prelude's three group-budget encodings are also attributed
 // to this action (the retained group budget is not a second encoding).
 debit(root,1,'driver',2);
 debit({gate:gate2,marker:protection,qualification},1);
 compare(root.active.identity,identity);
 debit([gate2,identity,protection]);
 compare(gate2.seal,root.active.receipt.seal);
 compare(qualification.identity,identity);compare(qualification.seal,gate2.seal);compare(root,root);

 // Target beginSelectionWrite / beginShadowWrite. The latter explicitly
 // repeats protection request/result accounting after its first get (:236).
 get(targetOrigin,SELECTION,targetMarker);
 get(targetOrigin,PROTECTION,protection);
 debit(PROTECTION,1,targetOrigin);debit(protection,0,targetOrigin);
 get(targetOrigin,GATE,gate2);debit([protection,gate2,authority],0,targetOrigin);
 get(targetOrigin,QUALIFICATION,qualification);compare(qualification,qualification,targetOrigin);
 pairedCanonical(gate2);

 // target-cleaned callback: complete marker/gate checks, all FIVE original
 // publication fence reads and comparison, then the two original deletes.
 get(targetOrigin,SELECTION,targetMarker);compare(targetMarker,targetMarker);
 get(targetOrigin,GATE,gate2);compare(gate2,gate2);
 const revision={id:CONTROL_PUBLICATION_REVISION,version:1,revision:next.reservation.revision};
 get(targetOrigin,CONTROL_PUBLICATION_REVISION,revision);
 get(targetOrigin,CONTROL_PUBLICATION_RESERVATION,next.reservation);
 get(targetOrigin,'migration',next.fences.migration);
 get(targetOrigin,'gate',next.fences.gate);
 get(targetOrigin,'recovery-restore-epoch',next.fences.epoch);
 debit([next.reservation,next.reservation,{migration:next.fences.migration,gate:next.fences.gate,epoch:next.fences.epoch},next.fences],0,targetOrigin);
 remove(targetOrigin,CONTROL_PUBLICATION_RESERVATION);remove(targetOrigin,SELECTION);

 // Both original write finishers. Only canonical writeRevision advances;
 // these meta keys trigger no navigation, semantic, or backup-data writes.
 get(targetOrigin,SELECTION,undefined);
 get(targetOrigin,PROTECTION,protection);compare(protection,protection,targetOrigin);
 get(targetOrigin,GATE,gate2);compare(gate2,gate2,targetOrigin);put(targetOrigin,gate3);
 debit([authority,protection,gate2,gate3],0,targetOrigin);

 // Fixed ORIGINAL producer set: phase(empty), canonical, selection marker,
 // qualification, protection/gate. Count remains a real native request; fresh
 // paired rows do not substitute a preceding phase's observation or its length.
 debit(['meta',undefined,range],1,targetOrigin);debit(K,0,targetOrigin);
 pairedCanonical(gate3);
 for(const row of canonical){const expected=row.id===GATE?gate3:row;compare(expected,expected,targetOrigin);}
 get(targetOrigin,SELECTION,undefined);compare(undefined,undefined,targetOrigin);
 compare(qualification,qualification,targetOrigin);compare(protection,protection,targetOrigin);compare(gate3,gate3,targetOrigin);
 phase('target-cleaned');

 // SDK set plus its two original settlement branches. A rejected ACK can still
 // be confirmed by the following complete original readback; do not erase that
 // existing contract. Unexpected successful ACK/result shapes fail rather
 // than acquire more budget. Both branches' pricing work is actually paid.
 const localResult={[STORAGE_KEY]:after};
 debit(localResult,1);
 const acknowledged=cost(price(undefined,0,'driver'));
 const rejected=cost(price({operation:'local-set-result',rejected:true},0,'driver'));
 sum({references:Math.max(acknowledged.references,rejected.references),bytes:Math.max(acknowledged.bytes,rejected.bytes)});
 debit([STORAGE_KEY],1,'driver',2);debit(localResult,0,'driver',2);
 debit(after,0,'driver',2);debit(next.afterDigest,0,'driver',2);
 get(registry,REGISTRY,root);compare(root,root);
 get(targetOrigin,GATE,gate3);compare(gate3,gate3);
 debit({state:'selected',operationId:record.operationId,priorLibraryRetained:true,reloadRequired:true,rollbackAllowed:false,rollbackReason:'reverse-inheritance-required',wholeArchiveComplete:false,productionActivation:false},1);

 // Keep the GENERIC get=3A upper bound: typed-string eligibility may legally
 // fall back, so its one-A saving is not subtracted from the tail reservation.
 // Paired inventory: L=2n+5p+3q debited refs, H=6p+2q primitive guards.
 // Observed id-keyed inventory: L=n+3p+3q, H=4p+2q; the full raw values,
 // own-data id/order/range validation, probes and p after-page checks remain.
 // Keep paired H below: a legal non-id fallback must not outrun reservation.
 // Fixed source terminal has six predicate sweeps and two complete gets=12A.
 // Fixed target terminal has H+p+6 predicate sweeps, count3A and marker3A:
 // H+p+12A. All K canonical and three extra Q/P/G comparisons remain above.
 // Source-selected totals 2C+41A; target-cleaned (including its unchanged
 // readonly prelude) totals 38C+(87+2H+2p)A. Its fixed 2-key and 3-key control
 // groups each add an entry and joined-result guard: four MORE A in total.
 // Keep all five older point-debit quotes above as a conservative allowance;
 // the actual two grouped wrappers save six refs, but cannot cover the extra
 // guards' bytes. No grouped pricing protocol or lower byte tariff is assumed.
 // Outside phases: two finish readonly TXs=16C; session.sdk is one lifecycle
 // check S, whose full binding debit is bounded by C without pretending its
 // outer identity calls execute. Dispatch/final/terminal add 3A; SDK sites 6N.
 sum(C,57); // 2 + 38 + 16 + one conservative C price for S
 sum(A,131+2*pageGuards+2*pages); // 41 + 87 + 2H + 2p + 3
 sum(N,6);
 return Object.freeze({references,bytes,profile:PROFILE,canonicalKeys:K});
}
