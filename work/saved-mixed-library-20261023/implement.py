from pathlib import Path
base=Path('extension/core/browser-native-sync')
def edit(file,a,b):
 p=base/file;s=p.read_text();assert a in s,(file,a[:60]);p.write_text(s.replace(a,b,1))
edit('group-checkpoint-plan.js',"if(currentSourceWorking||groups.length!==1+saved.length+successors.length||groups.filter(group=>group.type==='sourceBootstrapCommit').length!==1)","const humanSaved=groups.filter(g=>g.type==='humanLibraryCommit');\n  if(humanSaved.some(g=>!['entry','entry-edit'].includes(g.prepared.descriptor.value.kind)||g.prepared.members.some(op=>!['entry','history'].includes(op.value.entityType))))fail('BNS_SAVED_WORK_UNSUPPORTED');\n  if(currentSourceWorking||groups.length!==1+saved.length+successors.length+humanSaved.length||groups.filter(group=>group.type==='sourceBootstrapCommit').length!==1)")
edit('group-checkpoint-plan.js',"const sourceOwner=Symbol('source');claim('history',sourceBaseline.id,sourceOwner);claim('operation',sourceBaseline.operationId,sourceOwner);", "const sourceOwner=Symbol('source');claim('history',sourceBaseline.id,sourceOwner);claim('operation',sourceBaseline.operationId,sourceOwner);\n  for(const g of humanSaved)for(const op of g.prepared.members){const row=op.value.after,entity='human:'+row.id;if(op.value.entityType==='entry'){claim('entry',row.id,entity);claim('allocation',row.createdSequence,entity);}else{claim('history',row.id,'human:'+row.entityId);claim('operation',row.operationId,'human:'+row.entityId);}}")
edit('group-checkpoint-plan.js',"const entity=op.entityId;claim('provenance'", "const entity=op.entityId;claim('entry',entity,entity);claim('provenance'")
edit('human-library-group.js',"applications.set(cap,{store,core,inventory,steps", "applications.set(cap,{store,core,plan,inventory,steps")
p=base/'human-library-group.js';s=p.read_text();s+='''
// Only the original cold application can supply the Human partition to Saved.
// The inventory and mapping values are derived before any canonical write.
export function originalHumanSavedApplicationWitness(store,core,plan,cap){
 const a=applications.get(cap);if(!a||a.store!==store||a.core!==core||a.plan!==plan||a.incremental)fail('BNS_PREPARATION_REQUIRED');requireOriginalGroupCheckpointPlan(core,plan);
 if(a.steps.some(step=>!['entry','entry-edit'].includes(step.protocol.descriptor.value.kind)))fail('BNS_SAVED_WORK_UNSUPPORTED');
 const state=humanGraphReadSetProjection(a.inventory),mappings=new Map();for(const step of a.steps)for(const row of step.mappings)mappings.set(row.id,{...row.after,id:core.prefix+'generation:'+core.fixedNamespace+':humanMapping:'+encodeURIComponent(row.id)});
 // Physical IDs use the original Core-generated key captured by preparation.
 for(const row of mappings.values()){const original=a.steps.flatMap(s=>s.mappings).filter(x=>x.id===row.id);}
 return {state,mappings:a.steps.flatMap(step=>step.mappings).map(row=>({id:row.id,after:clone(row.after)}))};
}
''';# remove unnecessary computed map
s=s.replace("const state=humanGraphReadSetProjection(a.inventory),mappings=new Map();for(const step of a.steps)for(const row of step.mappings)mappings.set(row.id,{...row.after,id:core.prefix+'generation:'+core.fixedNamespace+':humanMapping:'+encodeURIComponent(row.id)});\n // Physical IDs use the original Core-generated key captured by preparation.\n for(const row of mappings.values()){const original=a.steps.flatMap(s=>s.mappings).filter(x=>x.id===row.id);}","const state=humanGraphReadSetProjection(a.inventory);")
p.write_text(s)
edit('saved-work-bootstrap.js',"import {bindHumanReplayEntry}","import {originalHumanSavedApplicationWitness} from './human-library-group.js';\nimport {originalHumanSavedScopePartition} from './human-library-scope.js';\nimport {bindHumanReplayEntry}")
edit('saved-work-bootstrap.js','prepareSavedWorkGroupApplication(store,core,plan,stage,state){','prepareSavedWorkGroupApplication(store,core,plan,stage,state,humanApplication=null){')
edit('saved-work-bootstrap.js',"const startedAt=Date.now();state=clone(state);", "const startedAt=Date.now();state=clone(state);const human=plan.groups.some(g=>g.type==='humanLibraryCommit')?originalHumanSavedApplicationWitness(store,core,plan,humanApplication):null;")
edit('saved-work-bootstrap.js',"!['sourceBootstrapCommit','savedWorkBootstrap','savedWorkSuccessor'].includes(g.type)","!['sourceBootstrapCommit','savedWorkBootstrap','savedWorkSuccessor','humanLibraryCommit'].includes(g.type)")
edit('saved-work-bootstrap.js',"sequence=p.before.authority.sequence;revision=p.before.authority.revision;", "sequence=human?human.state.base.sequence:p.before.authority.sequence;revision=human?{id:'revision-sequence',value:(human.state.base.revision?.value||0)+1}:p.before.authority.revision;")
edit('saved-work-bootstrap.js',"p.before.destination.thoughts=members.size", "p.before.destination.thoughts=members.size+(human?.state.thoughts.length||0)")
edit('saved-work-bootstrap.js',"const protocol=[...savedGroupProtocolIntent(core,plan),...stageRows.map(row=>[row.id,row])]", "const mappingRows=new Map();for(const row of human?.mappings||[]){const id=protocolPhysicalId(core.prefix,core.fixedNamespace,'humanMapping',[row.id]);mappingRows.set(id,{...row.after,id});}\n const protocol=[...savedGroupProtocolIntent(core,plan),...mappingRows.entries(),...stageRows.map(row=>[row.id,row])]")
edit('saved-work-bootstrap.js',"entryCount:members.size,finalSequence", "entryCount:members.size+(human?.state.thoughts.length||0),finalSequence")
edit('saved-work-bootstrap.js',"groups.set(cap,{store,core,plan,stage,state,active,terminal,protocol,members", "groups.set(cap,{store,core,plan,stage,state,active,terminal,protocol,human,members")
# final exact Human rows, original receipts/history, aggregate counts precomputed
edit('saved-work-bootstrap.js',"plan:function*(){if((yield {method:'count',table:'meta',key:stageRange})", "plan:function*(){if(g.human){for(const table of ['thoughts','revisions','operationReceipts','topics','sections','placements','thoughtSuppressions','provenance','dependencies']){const rows=g.human.state[table];for(const row of rows)if(!equal((yield {method:'get',table,key:row.id})??null,row))fail('BNS_SAVED_WORK_CHANGED');const extra=table==='thoughts'||table==='provenance'||table==='dependencies'?g.members.size:table==='revisions'?1+[...g.members.values()].reduce((n,cap)=>n+plans.get(cap).expected.history.length,0):0;if((yield {method:'count',table})!==rows.length+extra)fail('BNS_SAVED_WORK_CHANGED');}}if((yield {method:'count',table:'meta',key:stageRange})")
# scope partition reciprocal authentic scope maps, no arbitrary exceptions
edit('saved-work-bootstrap.js',"const sequence=(await t.get('meta','thought-sequence'))?.value;if", "const human=originalHumanSavedScopePartition(scope,store),humanIds=new Set(human?.entries.map(r=>r.id)||[]);\n const sequence=(await t.get('meta','thought-sequence'))?.value;if")
edit('saved-work-bootstrap.js',"await t.count('thoughts')!==p.members.length", "await t.count('thoughts')!==p.members.length+humanIds.size")
edit('saved-work-bootstrap.js',"for(const row of await readGroupRows(t,'libraryMigrationItems')){const e=p.members", "for(const row of await readGroupRows(t,'libraryMigrationItems')){if(humanIds.has(row.ownerId))continue;const e=p.members")
p=base/'saved-work-bootstrap.js';s=p.read_text();s+='''
// Readonly partition IDs bound to this exact original Scope and Saved plan.
// The consuming Saved proof still checks every selected row and total counts.
export function originalSavedHumanScopePartition(scope,store){
 const p=savedScopes.get(scope);if(!p)return null;if(p.store!==store)fail('BNS_SAVED_WORK_CAPABILITY');requireOriginalGroupCheckpointPlan(p.core,p.plan);
 return {entries:p.members.map(m=>m.expected.entry.id),provenance:p.members.map(m=>m.expected.provenance.id),dependencies:p.members.map(m=>m.expected.dependency.id)};
}
''';p.write_text(s)
edit('human-library-scope.js',"import {readGroupRows", "import {originalSavedHumanScopePartition} from './saved-work-bootstrap.js';\nimport {readGroupRows")
edit('human-library-scope.js',"const rows=sort(await readGroupRows(t,name));for(const row of rows)","const saved=originalSavedHumanScopePartition(scope,store),savedIds=new Set(saved?.entries||[]),rows=sort((await readGroupRows(t,name)).filter(row=>type!=='entry'||!savedIds.has(row.id)));for(const row of rows)")
edit('human-library-scope.js',"if(!equal(sort(await readGroupRows(t,name)),expected))", "const saved=originalSavedHumanScopePartition(scope,store),ids=new Set(saved?.[name]||[]);if(!equal(sort((await readGroupRows(t,name)).filter(row=>!ids.has(row.id))),expected))")
edit('human-library-scope.js',"for(const row of await readGroupRows(t,'libraryMigrationItems')){const owner=", "for(const row of await readGroupRows(t,'libraryMigrationItems')){const saved=originalSavedHumanScopePartition(scope,store);if(saved?.entries.includes(row.ownerId))continue;const owner=")
p=base/'human-library-scope.js';s=p.read_text();s+='''
// Saved may count this partition only after the original Human scope has
// independently compiled its exact source-free Entry/history owner projection.
export function originalHumanSavedScopePartition(scope,store){
 const p=proofs.get(scope);if(!p)return null;if(p.store!==store||p.projection||p.projectionOpening||preparations.has(scope)||p.rows.topic.length||p.rows.section.length||p.rows.placement.length||p.rows.suppression.length||p.provenance.length||p.dependencies.length)fail('BNS_SAVED_WORK_UNSUPPORTED');
 return {entries:p.rows.entry.map(row=>({id:row.id}))};
}
''';p.write_text(s)
edit('group-checkpoint.js','prepareSavedWorkGroupApplication(this.store,replay,plan,this.stage,state)','prepareSavedWorkGroupApplication(this.store,replay,plan,this.stage,state,humanApplication)')
