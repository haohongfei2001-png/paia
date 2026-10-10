import test from 'node:test';
import assert from 'node:assert/strict';
import {assertContextManualOperationTransition as manual} from '../core/browser-native-sync/context-journal.js';
import {assertContextDesiredOperationTransition as desired} from '../core/browser-native-sync/context-desired-journal.js';

const id='00000000-0000-0000-0000-000000000001',deletion='00000000-0000-0000-0000-000000000002';
const item=()=>({id,card:'info',body:'SYNTHETIC exact body',section:'SYNTHETIC',revision:1,order:0,origin:'manual',protected:true,userEdited:true,lifecycle:'active',createdAt:'2026-10-10T00:00:00.000Z',updatedAt:'2026-10-10T00:00:00.000Z',deletedBy:null});
const operation=value=>({type:'contextItem',kind:'put',actor:'user',operationId:deletion,entityId:id,value});
const access=(revision,actor='user',enabled=true)=>({type:'contextDesired',kind:'put',actor,entityId:'info',value:{id:'info',revision,enabled}});
const invalid=run=>assert.throws(run,{code:'BNS_CONTEXT_TRANSITION_INVALID'});

test('original manual create, edit, soft-delete and exact restore rules are shared without mutation',()=>{
 const create=operation(item()),edit=operation({...item(),body:'SYNTHETIC changed 中文',revision:2}),removed=operation({...edit.value,revision:3,lifecycle:'removed',deletedBy:deletion}),restored=operation({...removed.value,revision:4,lifecycle:'active',deletedBy:null});
 const before=structuredClone([create,edit,removed,restored]);assert.doesNotThrow(()=>manual(create));assert.doesNotThrow(()=>manual(edit,create));assert.doesNotThrow(()=>manual(removed,edit));assert.doesNotThrow(()=>manual(restored,removed));assert.deepEqual([create,edit,removed,restored],before);
});
test('manual history retains revision, immutable field and delete/restore protections',()=>{
 const parent=operation(item());for(const mutate of [v=>v.revision=3,v=>v.order=1,v=>v.createdAt='SYNTHETIC changed',v=>v.deletedBy=deletion]){const next=operation({...item(),revision:2});mutate(next.value);invalid(()=>manual(next,parent));}
 const removed=operation({...item(),revision:2,lifecycle:'removed',deletedBy:deletion});invalid(()=>manual(operation({...item(),revision:3,body:'SYNTHETIC forged restore'}),removed));
 invalid(()=>manual(operation({...item(),revision:2,lifecycle:'removed',deletedBy:'00000000-0000-0000-0000-000000000003'}),parent));
});
test('existing explicit bootstrap permits a valid removed baseline without inventing ancestry',()=>{
 const bootstrap={...operation({...item(),revision:8,lifecycle:'removed',deletedBy:deletion}),actor:'bootstrap'};assert.doesNotThrow(()=>manual(bootstrap));
 invalid(()=>manual({...bootstrap,actor:'user'}));
});
test('manual card-specific domain checks and original parent type refusal remain',()=>{
 const op=operation(item());assert.throws(()=>manual({...op,type:'contextNowItem'}),{code:'BNS_CODEC_UNSUPPORTED'});
 assert.throws(()=>manual(op,{...op,type:'contextRulesItem'}),{code:'BNS_CONTEXT_SCOPE_UNAVAILABLE'});
 assert.throws(()=>manual({...op,value:{...item(),origin:'automatic'}}),{code:'BNS_CODEC_UNSUPPORTED'});
});
test('original desired user and bootstrap starts keep their exact revision policy',()=>{
 assert.doesNotThrow(()=>desired(access(1),[]));assert.doesNotThrow(()=>desired(access(7,'bootstrap'),[]));invalid(()=>desired(access(0),[]));invalid(()=>desired(access(2),[]));
});
test('desired continuation retains exact single-parent increment and user actor rule',()=>{
 const parent=access(7,'bootstrap',false),next=access(8);const before=structuredClone([parent,next]);assert.doesNotThrow(()=>desired(next,[parent]));assert.deepEqual([parent,next],before);
 invalid(()=>desired(access(9),[parent]));invalid(()=>desired(access(8,'bootstrap'),[parent]));
});
test('original multi-parent desired resolution must exceed every parent revision',()=>{
 const parents=[access(3),access(7)];assert.doesNotThrow(()=>desired(access(9),parents));invalid(()=>desired(access(7),parents));invalid(()=>desired(access(6),parents));
});
test('desired interface rejects missing, foreign and over-bound parent input without a proof grant',()=>{
 for(const parent of [null,{...access(1),entityId:'rules'},{...access(1),type:'contextItem'},{...access(1),kind:'purge'}])assert.throws(()=>desired(access(2),[parent]),{code:'BNS_REVISION_MISSING'});
 assert.throws(()=>desired(access(2),Array.from({length:129},()=>access(1))),{code:'BNS_CONTEXT_ANCESTRY_LIMIT'});
 assert.throws(()=>desired({...access(1),type:'promptPreferences'},[]),{code:'BNS_CONTEXT_SCOPE_UNAVAILABLE'});
 assert.throws(()=>desired(access(1),null),{code:'BNS_CONTEXT_ANCESTRY_LIMIT'});
});
