from pathlib import Path
base=Path('extension/core/browser-native-sync');p=base/'mixed-nonempty-merge.js';s=p.read_text()
s=s.replace("import {prepareMixedRestoredAllocationProof,originalMixedRestoredReplay}","import {prepareMixedRestoredAllocationProof,assertMixedRestoredPhysicalAllocations}")
s=s.replace("const refuse=()=>", "import {assertMixedInitialPhysicalAllocations,assertMixedInitialHumanPhysicalAllocations} from './mixed-initial-allocation.js';\nimport {assertMixedCurrentSourceDerivedRows} from './mixed-current-source-derived.js';\nimport {syncArchiveYearIndex} from '../archive-year-index.js';\nimport {FILTER_VERSIONS} from '../smart-filter.js';\nimport {exact,count,opaque} from './value.js';\nconst resultProofs=new WeakMap();\nconst refuse=()=>")
s=s.replace("const proof=await prepareMixedRestoredAllocationProof(core,plan,snapshot.meta),scope=await prepareGroupScope(beforePlan,{store});", "const proof=await prepareMixedRestoredAllocationProof(core,plan,snapshot.meta);")
s=s.replace(" // Original single-owner receivers are used for this first composition. A\n // multi-step Human graph is separately prepared by its original graph owner.\n if(incoming.some(g=>!['sourceBootstrapCommit','sourceAppendCommit','inputWorkingCommit','promptPreferences','contextItem','contextRulesItem','contextNowItem'].includes(g.type)))", " // This atomic transition receives existing Input edits while preserving every\n // independent Human/manual owner. Other owner families need their own actual\n // predecessor preparation and cannot be silently adopted from portable rows.\n if(incoming.some(g=>g.type!=='inputWorkingCommit'))")
# add fixed physical preflight after protocol before union
needle=" const operations=new Map(localOperations.map"
s=s.replace(needle," const fixedScope=await prepareGroupScope(plan);if(active||snapshot.meta.some(r=>r.id===mixedTimelineKey(core,namespace))){const proof=await prepareMixedRestoredAllocationProof(core,plan,snapshot.meta);assertMixedRestoredPhysicalAllocations(core,fixedScope,plan,snapshot,snapshot.meta,proof,snapshot);}else{assertMixedInitialPhysicalAllocations(core,fixedScope,plan,snapshot,{active:null,input:snapshot.meta.find(r=>r.id==='input-delta-sequence'),history:snapshot.meta.find(r=>r.id==='revision-sequence')});assertMixedInitialHumanPhysicalAllocations(core,fixedScope,plan,snapshot,snapshot.meta);}\n"+needle)
# result preparation independent of output, before tx
idx=s.index('export async function sealMixedNonemptyResult')
s=s[:idx]+'''export async function prepareMixedNonemptyResult(core,p,receipt){
 const meta=p.snapshot.meta.filter(r=>r.id!==p.timeline.id);meta.push(p.timeline,receipt);
 const scope=await prepareGroupScope(p.merged),allocation=await prepareMixedRestoredAllocationProof(core,p.merged,meta),token=Object.freeze({});
 resultProofs.set(token,{core,p,receipt,scope,allocation});return token;
}
function sorted(rows){return [...rows].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);}
function same(a,b){if(!equalSourceWorkingPhysicalTree(sorted(a),sorted(b)))refuse();}
function qualifyWorkingDerivatives(p,now){
 const working=p.transactions.flat().filter(g=>g.type==='inputWorkingCommit'),changed=new Set(p.incoming.map(g=>g.prepared.descriptor.value.inputId));
 if(now.filterInputs.length!==p.snapshot.filterInputs.length||now.invalidations.length!==p.snapshot.invalidations.length+p.incoming.length)refuse();
 for(const row of p.snapshot.invalidations)if(!equalSourceWorkingPhysicalTree(now.invalidations.find(r=>r.id===row.id),row))refuse();
 for(const row of p.snapshot.filterInputs)if(!changed.has(row.id)&&!equalSourceWorkingPhysicalTree(now.filterInputs.find(r=>r.id===row.id),row))refuse();
 const newRows=now.invalidations.filter(r=>!p.snapshot.invalidations.some(o=>o.id===r.id)),seen=new Set();
 for(const row of newRows){const group=p.incoming.find(g=>g.prepared.descriptor.value.inputId===row.inputId&&g.prepared.members.some(m=>m.value.entityType==='inputState'&&m.value.entity.contentRevision===row.contentRevision));if(!group||seen.has(group)||!exact(row,['id','eventSchema','inputId','reason','contentRevision','sequence','at','stateKey','state','cursor','dependencyAck','organizerAck'])||!opaque(row.id)||row.eventSchema!==2||row.reason!=='source_updated'||row.sequence!==working.indexOf(group)+1||!Number.isFinite(Date.parse(row.at))||row.stateKey!==0||row.state!=='pending'||row.cursor!==null||row.dependencyAck!==false||row.organizerAck!==false)refuse();seen.add(group);}
 for(const id of changed){const row=now.filterInputs.find(r=>r.id===id),input=p.afterScope.expected.blocks.find(b=>b.id===id),edits=working.filter(g=>g.prepared.descriptor.value.inputId===id);if(!row||!input||!Number.isFinite(Date.parse(row.overrideAt))||!equalSourceWorkingPhysicalTree(row,{id,documentId:input.documentId,authorship:'untouched',userEdited:true,filterOverride:'keep',presence:null,evaluationRevision:edits.length,pendingKey:1,decision:'keep',reasonCode:'user_protected',...FILTER_VERSIONS,basedOnContentRevision:0,overrideReason:'user_edit',overrideAt:row.overrideAt,failed:false}))refuse();}
}
''' + s[idx:]
s=s.replace('sealMixedNonemptyResult(store,core,stage,t,p,started)', 'sealMixedNonemptyResult(store,core,stage,t,p,started,token)')
start=s.index(' // Preserve all original local queued work');end=s.index(' const current=()=>',start)
s=s[:start]+''' const proof=resultProofs.get(token);if(!proof||proof.core!==core||proof.p!==p)refuse();resultProofs.delete(token);
 assertMixedRestoredPhysicalAllocations(core,proof.scope,p.merged,now,now.meta,proof.allocation,now);
 assertMixedCurrentSourceDerivedRows(core,proof.scope,p.merged,now);
 qualifyWorkingDerivatives(p,now);
 const active=now.meta.find(r=>r.id===core.prefix+'active'),protocol=checkCurrentGroupProtocolRows(core,p.merged,now,{namespace:p.namespace,epoch:null,restored:!!active,merged:true,activeId:active?.id});
 const consumed=new Set([...protocol.used].filter(Boolean));
 // Physical allocation above independently checked these exact mappings. All
 // other protocol/control/default rows retain the pre-owner cut, including any
 // future or unknown metadata: prefixes are never a metadata exemption.
 for(const head of p.merged.heads){if(head.type==='inputWorkingMember'&&head.entityId.startsWith('input:'))consumed.add(protocol.key('workingOwner',head.entityId.slice(6)));else if(head.type==='inputWorkingMember'&&head.entityId.startsWith('revision:'))consumed.add(protocol.key('workingHistory',head.entityId.slice(9)));}
 const counters=new Map([['sequence',{id:'sequence',records:p.afterScope.expected.records.length,blocks:p.afterScope.expected.blocks.length,documents:p.afterScope.expected.documents.length}],['thought-epoch',{id:'thought-epoch',value:p.transactions.flat().filter(g=>g.type==='inputWorkingCommit').length}]]);
 for(const[id,row]of counters){if(!equal(now.meta.find(r=>r.id===id),row))refuse();consumed.add(id);}for(const id of ['input-delta-sequence','revision-sequence'])consumed.add(id);
 const expected=new Map(p.snapshot.meta.map(r=>[r.id,r]));expected.set(p.timeline.id,p.timeline);expected.set(proof.receipt.id,proof.receipt);
 const priorIndex=new Map(p.snapshot.blockIndex.map(r=>[r.id,r])),annual={get:async(table,id)=>{if(table!=='meta')refuse();return expected.get(id);},put:async(table,row)=>{if(table!=='meta')refuse();expected.set(row.id,row);},delete:async(table,id)=>{if(table!=='meta')refuse();expected.delete(id);},count:async()=>refuse()};
 for(const row of now.blockIndex)await syncArchiveYearIndex(annual,priorIndex.get(row.id)??null,row);
 // Semantic changes are queued by the original repository and flush only at
 // the transaction boundary. Preserve the exact pre-flush rows here; the final
 // native read fence below checks the independently replayed post-flush rows.
 same(now.meta.filter(r=>!consumed.has(r.id)),[...expected.values()].filter(r=>!consumed.has(r.id)));
 const oldOutbox=p.snapshot.meta.filter(r=>r.id.startsWith(core.prefix+'generation:'+p.namespace+':outbox:'));same(now.meta.filter(r=>r.id.startsWith(core.prefix+'generation:'+p.namespace+':outbox:')),oldOutbox);
 const changedTables=new Set(['meta','blocks','blockIndex','documents','inputStates','revisions','filterInputs','filterIntents','invalidations']);for(const table of core.repository.stores)if(!changedTables.has(table))same(now[table],p.snapshot[table]);
''' + s[end:]
p.write_text(s)
p=base/'group-checkpoint.js';s=p.read_text();s=s.replace('prepareMixedNonemptyMerge,requireMixedNonemptyBase,sealMixedNonemptyResult','prepareMixedNonemptyMerge,prepareMixedNonemptyResult,requireMixedNonemptyBase,sealMixedNonemptyResult');start=s.index(' async mergeMixed');end=s.index(' // Incremental saved recovery',start);m=s[start:end]
needle='  return this.store.foundationWrite(async t=>{'
m=m.replace(needle,"  const mergeReceipt={id:this.live.prefix+'generation:'+p.namespace+':mergeCommit:'+encodeURIComponent(this.restoreId),version:1,restoreId:this.restoreId,namespace:p.namespace,epoch:state.base.fence.epoch,manifestId:state.manifestId,graphDigest:state.graphDigest,mergeDigest:p.merged.digest,receipts},resultProof=await prepareMixedNonemptyResult(this.live,p,mergeReceipt);\n"+needle)
m=m.replace('sealMixedNonemptyResult(this.store,this.live,this.stage,t,p,started)', 'sealMixedNonemptyResult(this.store,this.live,this.stage,t,p,started,resultProof)');s=s[:start]+m+s[end:];p.write_text(s)
