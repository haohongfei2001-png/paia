import test from 'node:test';
import assert from 'node:assert/strict';
import {SettingsRemovedComposite} from '../ui/settings-removed-composite.js';
const held=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const input=(id='same')=>({id,documentId:'doc',revision:1,excluded:true,libraryText:'SYNTHETIC original body',note:'SYNTHETIC original note'});
function fixture(custom=()=>undefined){
 const calls=[],state={generation:0,epoch:'initial',input:input()};
 const send=async(type,data)=>{calls.push({type,data:structuredClone(data)});const override=custom(type,data,state,calls);if(override!==undefined)return override;
 if(type==='GET_PAGE'){if(data.page.expectedGeneration!==undefined&&data.page.expectedGeneration!==null&&data.page.expectedGeneration!==state.generation)throw Object.assign(Error('changed'),{code:'BACKUP_CHANGED'});const common={dataGeneration:state.generation,recoveryEpoch:state.epoch,nextCursor:null};return data.page.view==='settings'?common:data.page.documentId?{...common,library:{blocks:state.input.excluded?[state.input]:[]},records:[]}:{...common,documents:state.input.excluded?[{id:'doc'}]:[]};}
 if(type==='GET_INPUT')return {...state.input,recoveryEpoch:state.epoch};
 if(type==='GET_LIBRARY_REMOVED_TOPICS')return {items:[{id:'same',revision:3,name:'SYNTHETIC Topic'}],nextCursor:null};
 if(type==='GET_LIBRARY_REMOVED')return {items:[],nextCursor:null};
 if(type==='GET_LIBRARY_REMOVED_PLACEMENTS')return {items:[],nextCursor:null};
 if(type==='EDIT_DOCUMENT'){state.input={...state.input,excluded:false,revision:2};state.generation++;return {ok:true};}
 if(type==='PAIA_ARCHIVE_OPERATION_OUTCOME')return {state:'not_committed'};
 return {id:data.edit.id,restored:true};};
 return {owner:new SettingsRemovedComposite(send),calls,state};
}
test('bounded independent typed pages distinguish same IDs and exclude pending branches',async()=>{
 const f=fixture((type,data,state)=>type==='GET_PAGE'&&data.page.documentId?{dataGeneration:0,recoveryEpoch:'initial',library:{blocks:[state.input,{...input('pending'),branchStatus:'review'}]},records:[],nextCursor:null}:undefined);
 await f.owner.open();await Promise.all(['input','topic','entry','placement'].map(k=>f.owner.load(k)));assert.equal(f.owner.rows.size,2);assert.equal(f.owner.pages.get('input').items.length,1);assert.equal(f.calls.filter(c=>c.type==='GET_PAGE'&&c.data.page.view==='excluded').length,2);assert.ok(f.calls.filter(c=>c.type==='GET_PAGE').every(c=>!c.data.page.limit||c.data.page.limit<=40));
});
test('same-cursor concurrent calls share one read; duplicate IDs do not append',async()=>{
 const gate=held();let reads=0;const f=fixture(type=>{if(type==='GET_LIBRARY_REMOVED'){reads++;return gate.promise;}});await f.owner.open();const one=f.owner.load('entry'),two=f.owner.load('entry');await new Promise(r=>setTimeout(r,0));assert.equal(reads,1);gate.resolve({items:[{id:'e',revision:1},{id:'e',revision:1}],nextCursor:'next'});await Promise.all([one,two]);assert.equal(f.owner.pages.get('entry').items.length,1);assert.equal(f.owner.pages.get('entry').cursor,'next');
});
test('empty intermediate document and Input pages keep their independent continuations',async()=>{
 const f=fixture((type,data)=>type==='GET_PAGE'&&data.page.view==='excluded'?data.page.documentId?{dataGeneration:0,recoveryEpoch:'initial',library:{blocks:[]},records:[],nextCursor:'block-next'}:{dataGeneration:0,recoveryEpoch:'initial',documents:data.page.cursor?[{id:'doc'}]:[],nextCursor:data.page.cursor?null:'doc-next'}:undefined);
 await f.owner.open();await f.owner.load('input');assert.equal(f.owner.pages.get('input').done,false);await f.owner.load('input');assert.equal(f.owner.pages.get('input').cursor,'block-next');assert.equal(f.owner.pages.get('input').done,false);const reads=f.calls.filter(c=>c.type==='GET_PAGE'&&c.data.page.view==='excluded');assert.equal(reads.length,3);assert.equal(reads[1].data.page.cursor,'doc-next');
});
test('a late read cannot publish into a closed and reopened detail',async()=>{
 const gate=held();let first=true;const f=fixture(type=>type==='GET_LIBRARY_REMOVED'&&first?(first=false,gate.promise):undefined);await f.owner.open();const read=f.owner.load('entry');await new Promise(r=>setTimeout(r,0));f.owner.close();await f.owner.open();gate.resolve({items:[{id:'late',revision:1}],nextCursor:null});await assert.rejects(read,{code:'BACKUP_CHANGED'});assert.equal(f.owner.rows.size,0);assert.equal(f.owner.pages.get('entry').error,null);
});
test('generation/epoch change and invalid typed cursor preserve displayed rows for explicit reload',async()=>{
 let invalid=false;const f=fixture(type=>type==='GET_LIBRARY_REMOVED_TOPICS'?invalid?{items:[],cursorInvalid:true,nextCursor:null}:{items:[{id:'same',revision:3}],nextCursor:'more'}:undefined);await f.owner.open();await f.owner.load('topic');invalid=true;await assert.rejects(f.owner.load('topic'),{code:'BACKUP_CHANGED'});assert.equal(f.owner.rows.size,1);f.state.epoch='replacement';await assert.rejects(f.owner.load('input'),{code:'BACKUP_CHANGED'});assert.equal(f.owner.rows.size,1);
});
test('Input recovery sends original body/note with displayed CAS through original save owner',async()=>{
 const f=fixture();await f.owner.open();await f.owner.load('input');await f.owner.restore('input','same');const write=f.calls.find(c=>c.type==='EDIT_DOCUMENT').data.edit;assert.equal(write.blocks[0].expectedRevision,1);assert.equal(write.blocks[0].libraryText,'SYNTHETIC original body');assert.equal(write.blocks[0].note,'SYNTHETIC original note');assert.equal(write.blocks[0].excluded,false);assert.equal(write.documentId,'doc');assert.equal('revisionReason' in write,false);assert.equal(f.owner.rows.size,0);assert.equal(f.calls.filter(c=>c.type==='EDIT_DOCUMENT').length,1);
});
test('new revision, pending status or replacement epoch refuses before Input write',async()=>{
 for(const change of [{revision:2},{branchStatus:'pending'},{recoveryEpoch:'replacement'}]){const f=fixture((type,data,state)=>type==='GET_INPUT'?{...state.input,recoveryEpoch:state.epoch,...change}:undefined);await f.owner.open();await f.owner.load('input');await assert.rejects(f.owner.restore('input','same'));assert.equal(f.calls.some(c=>c.type==='EDIT_DOCUMENT'),false);assert.equal(f.owner.attempts.size,0);}
});
test('unknown Input commit survives close/reopen and reconciles without a second write',async()=>{
 let outcome='unknown';const f=fixture((type,data,state)=>{if(type==='EDIT_DOCUMENT'){state.input.excluded=false;state.generation++;throw Error('lost acknowledgement');}if(type==='PAIA_ARCHIVE_OPERATION_OUTCOME')return outcome==='unknown'?{state:'unknown'}:{state:'committed',result:{ok:true}};});await f.owner.open();await f.owner.load('input');await assert.rejects(f.owner.restore('input','same'),{code:'SAVE_OUTCOME_UNKNOWN'});const query=structuredClone(f.owner.attempts.values().next().value.session.pending.query);f.owner.close();await f.owner.open();await f.owner.load('input');assert.equal(f.owner.rows.size,0);outcome='committed';await f.owner.restore('input','same');assert.equal(f.calls.filter(c=>c.type==='EDIT_DOCUMENT').length,1);assert.equal(f.owner.attempts.size,0);assert.deepEqual(f.calls.filter(c=>c.type==='PAIA_ARCHIVE_OPERATION_OUTCOME').at(-1).data.query,query);
});
test('unknown outcome cannot write again and explicit not-committed retry preserves operation/digest',async()=>{
 let outcome='unknown',writes=0;const f=fixture(type=>{if(type==='EDIT_DOCUMENT'&&++writes===1)throw Error('lost before write');if(type==='PAIA_ARCHIVE_OPERATION_OUTCOME')return {state:outcome};});await f.owner.open();await f.owner.load('input');await assert.rejects(f.owner.restore('input','same'),{code:'SAVE_OUTCOME_UNKNOWN'});const attempt=f.owner.attempts.values().next().value,edit=structuredClone(attempt.edit),query=structuredClone(attempt.session.pending.query);await assert.rejects(f.owner.restore('input','same'),{code:'SAVE_OUTCOME_UNKNOWN'});assert.equal(writes,1);outcome='not_committed';await f.owner.restore('input','same');assert.equal(writes,2);assert.deepEqual(f.calls.filter(c=>c.type==='EDIT_DOCUMENT').map(c=>c.data.edit),[edit,edit]);assert.deepEqual(f.calls.filter(c=>c.type==='PAIA_ARCHIVE_OPERATION_OUTCOME').at(-1).data.query,query);
});
test('an old committed operation never removes a newer independently removed row',async()=>{
 let outcome='unknown';const f=fixture((type,data)=>{if(type==='EDIT_DOCUMENT')throw Error('unknown');if(type==='PAIA_ARCHIVE_OPERATION_OUTCOME')return outcome==='unknown'?{state:'unknown'}:{state:'committed',result:{ok:true}};});await f.owner.open();await f.owner.load('input');await assert.rejects(f.owner.restore('input','same'));f.owner.close();f.state.input.revision=3;f.state.generation=2;await f.owner.open();await f.owner.load('input');outcome='committed';await f.owner.restore('input','same');assert.equal(f.owner.rows.size,1);assert.equal(f.owner.pages.get('input').items[0].revision,3);assert.equal(f.calls.filter(c=>c.type==='EDIT_DOCUMENT').length,1);
});
test('typed relationship recovery keeps history/epoch/all CAS and same uncertain operation',async()=>{
 const item={id:'edge',revision:4,entryRevision:8,topicRevision:9,historyId:'history',recoveryEpoch:'initial'};const f=fixture(type=>{if(type==='GET_LIBRARY_REMOVED_PLACEMENTS')return {items:[item],nextCursor:null};if(type==='RESTORE_LIBRARY_PLACEMENT')throw Error('uncertain');});await f.owner.open();await f.owner.load('placement');await assert.rejects(f.owner.restore('placement','edge'));f.owner.close();await f.owner.open();await f.owner.load('placement');await assert.rejects(f.owner.restore('placement','edge'));const writes=f.calls.filter(c=>c.type==='RESTORE_LIBRARY_PLACEMENT');assert.equal(writes.length,2);assert.deepEqual(writes[0],writes[1]);assert.deepEqual({...writes[0].data.edit,operationId:null},{id:'edge',expectedRevision:4,operationId:null,historyId:'history',recoveryEpoch:'initial',expectedEntryRevision:8,expectedTopicRevision:9});
});

test('the real owner predicate denies a held read/write before the close event runs',async()=>{
 for(const kind of ['input','topic']){const gate=held();let intercept=false,visible=true;const f=fixture((type,data)=>intercept&&type==='GET_PAGE'&&data.page.view==='settings'?gate.promise:undefined);f.owner.isActive=()=>visible;await f.owner.open();await f.owner.load(kind);intercept=true;const restore=f.owner.restore(kind,'same');await new Promise(r=>setTimeout(r,0));visible=false;gate.resolve({dataGeneration:0,recoveryEpoch:'initial'});await assert.rejects(restore,{code:'BACKUP_CHANGED'});assert.equal(f.calls.some(c=>c.type==='EDIT_DOCUMENT'||c.type.startsWith('RESTORE_')),false);assert.equal(f.owner.attempts.size,0);}
});
test('a formed but unsent Input edit is not retained as an unknown commit',async()=>{
 const f=fixture((type,data,state)=>{if(type==='GET_INPUT'){state.generation++;return {...state.input,recoveryEpoch:state.epoch};}});await f.owner.open();await f.owner.load('input');await assert.rejects(f.owner.restore('input','same'),{code:'BACKUP_CHANGED'});assert.equal(f.owner.attempts.size,0);assert.equal(f.calls.some(c=>c.type==='EDIT_DOCUMENT'),false);
});

test('an in-place typed retry reconciles its own generation change without changing the original request',async()=>{
 let writes=0;const f=fixture((type,data,state)=>{if(type==='RESTORE_LIBRARY_TOPIC'){if(++writes===1){state.generation++;throw Error('lost committed ACK');}return {restored:true};}});await f.owner.open();await f.owner.load('topic');await assert.rejects(f.owner.restore('topic','same'));await f.owner.restore('topic','same');const sent=f.calls.filter(call=>call.type==='RESTORE_LIBRARY_TOPIC');assert.equal(sent.length,2);assert.deepEqual(sent[0],sent[1]);assert.equal(f.owner.attempts.size,0);
});
test('a replacement epoch denies an original typed retry before another write',async()=>{
 const f=fixture(type=>type==='RESTORE_LIBRARY_TOPIC'?Promise.reject(Error('unknown')):undefined);await f.owner.open();await f.owner.load('topic');await assert.rejects(f.owner.restore('topic','same'));f.state.epoch='replacement';await assert.rejects(f.owner.restore('topic','same'),{code:'BACKUP_CHANGED'});assert.equal(f.calls.filter(call=>call.type==='RESTORE_LIBRARY_TOPIC').length,1);
});
