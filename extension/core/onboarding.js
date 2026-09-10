import {ArchiveError,CONSENT_VERSION} from './constants.js';
const ID='first-run-onboarding';
const dto=row=>({version:1,step:row.step,historyState:row.historyState,existingUser:row.existingUser});
export class OnboardingService {
 constructor(store){this.store=store;}
 async row(t){
  let row=await t.get('meta',ID);const c=await this.store.control(t),consented=c.settings.consentVersion===CONSENT_VERSION;
  if(!row){
   const existing=consented||await t.count('records')>0||await t.count('blocks')>0||await t.count('thoughts')>0;
   row={id:ID,version:1,step:existing?'done':'welcome',historyState:'not_started',existingUser:!!existing,updatedAt:this.store.clock()};
   await t.put('meta',row);
  }else if(consented&&['welcome','consent'].includes(row.step)){
   row.step='history';row.updatedAt=this.store.clock();await t.put('meta',row);
  }
  return {row,consented};
 }
 status(){return this.store.write(async t=>dto((await this.row(t)).row));}
 action(action){
  if(!['start','skip_history','start_history'].includes(action))throw new ArchiveError('INVALID_REQUEST');
  return this.store.write(async t=>{
   const {row,consented}=await this.row(t);
   if(action==='start'){if(row.step==='welcome')row.step='consent';}
   else{
    if(!consented)throw new ArchiveError('CONSENT_REQUIRED');row.step='done';
    if(!['completed','partial'].includes(row.historyState))row.historyState=action==='skip_history'?'skipped':'started';
   }
   row.updatedAt=this.store.clock();await t.put('meta',row);return dto(row);
  });
 }
}
