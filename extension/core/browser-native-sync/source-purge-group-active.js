import {prepareOriginalActiveSourceWorkingRows,originalActiveSourceWorkingTerminalRows} from './canonical-generation-publication.js';
import {assertCompletedGroupedRestoreControl} from './completed-group-restore-control.js';
import {digest,fail} from './value.js';
const cuts=new WeakMap(),deny=()=>fail('BNS_SOURCE_PURGE_GROUP_UNSUPPORTED');
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
// Only the original publication's privately bound, fully retired original-group
// selection may classify its controls. Raw controls are never erased or copied
// into an ordinary-library grant; terminal closure retains their exact bytes.
export async function prepareSourcePurgeActiveCut(store,core,raw){
 if(store.repository!==core.repository)deny();freeze(raw);
 const active=raw.meta.find(row=>row.id===core.prefix+'active'),controls=raw.meta.filter(row=>row.id.startsWith('canonical-generation:'));
 if(!active&&!controls.length){const cap=Object.freeze({view:raw,protocol:Object.freeze([]),active:false});cuts.set(cap,{store,core,repository:store.repository,raw,view:raw});return cap;}
 if(!active||!controls.length)deny();
 const view=await prepareOriginalActiveSourceWorkingRows(store.repository,raw);if(view===raw)deny();
 const completed=view.meta.filter(row=>row.id.startsWith(core.prefix+'generation:')&&row.id.endsWith(':restore:'));
 if(completed.length!==1)deny();
 const epoch=raw.meta.find(row=>row.id==='recovery-restore-epoch')?.value??null;
 await assertCompletedGroupedRestoreControl(completed[0],{prefix:core.prefix,datasetId:core.datasetId,active,namespace:active.namespace,epoch});
 const original=raw.meta.find(row=>row.id===completed[0].id);if(!original)deny();
 const cap=Object.freeze({view,protocol:Object.freeze([active,original]),active:true});cuts.set(cap,{store,core,repository:store.repository,raw,view,completed:completed[0]});return cap;
}
export function sourcePurgeActiveTerminal(store,core,cut,rows){
 const p=cuts.get(cut);if(!p||p.store!==store||p.core!==core||p.repository!==store.repository||core.repository!==p.repository)deny();
 return originalActiveSourceWorkingTerminalRows(p.repository,p.view,rows);
}

// The immutable original graph must still be represented after legitimate
// redaction. This finite profile admits a single original Source producer;
// independent successors may use other producers. No body is reconstructed.
export async function requireSourcePurgeActiveGraph(cut,plan,negative){
 const p=cuts.get(cut);if(!p)deny();if(!cut.active)return;
 const groups=plan.groups.map(g=>({id:g.id,type:g.type,operations:g.operations}));
 for(const item of negative){const operations=item.intent.targets.map(t=>t.before).sort((a,b)=>a.sequence-b.sequence),commit=operations.filter(op=>op.type==='sourceBootstrapCommit');if(commit.length!==1||operations.at(-1)!==commit[0])deny();groups.push({id:commit[0].revisionId,type:'sourceBootstrapCommit',operations});}
 const devices=new Set();for(const g of groups){if(g.type!=='sourceBootstrapCommit'||g.operations.length!==7||g.operations.some(op=>op.deviceId!==g.operations[0].deviceId))deny();devices.add(g.operations[0].deviceId);}
 let matched=0;
 for(const device of devices){const initial=groups.filter(g=>g.operations[0].deviceId===device).sort((a,b)=>a.id.localeCompare(b.id));const graph=initial.map(g=>({id:g.id,type:g.type,revisions:g.operations.map(op=>op.revisionId),dependencies:[]}));if(await digest(graph)===p.completed.graphDigest)matched++;}
 if(matched!==1)deny();
}
