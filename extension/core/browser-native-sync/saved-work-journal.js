import {HumanLibrarySyncJournal} from './human-library-journal.js';
import {prepareSavedWorkEdit,commitSavedWorkEdit} from './saved-work-bootstrap.js';
import {clone,fail} from './value.js';
// Explicit installation only. Normal Human and Source-human routes keep their
// original owner/codec; protected saved AI work uses its own authenticated type.
export class SavedWorkSyncJournal extends HumanLibrarySyncJournal {
 async execute(store,kind,request,options){
  if(kind!=='entry-edit')return super.execute(store,kind,request,options);
  if(store.humanLibraryJournal!==this||store.repository!==this.core.repository)fail('BNS_HUMAN_BINDING_REQUIRED');
  const row=await this.core.transaction(false,t=>t.get('thoughts',request.id),['thoughts']);
  if(row?.origin!=='ai')return super.execute(store,kind,request,options);
  const prepared=await prepareSavedWorkEdit(store,this.core,request);
  if(prepared.duplicate)return clone(prepared.result);if(prepared.conflict)return {conflict:true};
  return store.foundationWrite(async t=>{this.transactions.set(t,{store});try{return await commitSavedWorkEdit(t,prepared,store);}finally{this.transactions.delete(t);}},{});
 }
}
