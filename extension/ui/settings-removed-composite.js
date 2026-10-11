import {request} from './common.js';
import {WorkingInputSaveSession} from './working-input-save.js';

export const REMOVED_KINDS = Object.freeze(['input','topic','entry','placement']);
const commands = {topic:'GET_LIBRARY_REMOVED_TOPICS',entry:'GET_LIBRARY_REMOVED',placement:'GET_LIBRARY_REMOVED_PLACEMENTS'};
const stale = () => Object.assign(new Error('Removed list changed'), {code:'BACKUP_CHANGED'});
const conflict = () => Object.assign(new Error('Removed object changed'), {code:'CONFLICT'});
const key = (kind,id) => JSON.stringify([kind,id]);
const cursorState = () => ({started:false,cursor:null,documents:[],documentCursor:null,documentStarted:false});

// A tab-local presenter over the existing typed owners. Cursors, excerpts and
// pending original operation receipts never become another recovery store.
export class SettingsRemovedComposite {
  constructor(send=request,isActive=()=>true) { this.send=send; this.isActive=isActive; this.serial=0; this.active=false; this.attempts=new Map(); }
  async open() {
    // Only acknowledgements already known when this explicit read starts may
    // be retired by it. A late ACK cannot turn an in-flight reopen into review.
    this.settledAtOpen=new Map([...this.attempts].filter(([,attempt])=>attempt.settled&&!attempt.busy));
    const serial=++this.serial; this.active=true; this.fence=null;
    this.rows=new Map(); this.pages=new Map(REMOVED_KINDS.map(kind=>[kind,{...cursorState(),items:[],done:false,pending:null,error:null}]));
    const snapshot=await this.send('GET_PAGE',{page:{view:'settings'}});
    if(!this.current(serial))return false;
    if(!Number.isSafeInteger(snapshot.dataGeneration)||typeof snapshot.recoveryEpoch!=='string')throw stale();
    this.fence={generation:snapshot.dataGeneration,epoch:snapshot.recoveryEpoch};
    return true;
  }
  close() { this.active=false; ++this.serial; }
  current(serial) { return this.active&&serial===this.serial&&this.isActive(); }
  get busy() { return [...this.attempts.values()].some(attempt=>attempt.busy); }
  async check(serial,fence=this.fence) {
    if(!this.current(serial)||!fence)throw stale();
    const snapshot=await this.send('GET_PAGE',{page:{view:'settings',expectedGeneration:fence.generation}});
    if(!this.current(serial)||snapshot.dataGeneration!==fence.generation||snapshot.recoveryEpoch!==fence.epoch)throw stale();
  }
  async inputPage(state,fence) {
    // At most one bounded document page and one bounded Input page per call.
    // Empty filtered pages keep their continuation, without a full-library walk.
    if(!state.documents.length&&!state.documentStarted||!state.documents.length&&state.documentCursor!==null) {
      const page=await this.send('GET_PAGE',{page:{view:'excluded',limit:20,cursor:state.documentCursor,expectedGeneration:fence.generation}});
      if(page.recoveryEpoch!==fence.epoch||page.dataGeneration!==fence.generation)throw stale();
      state.documentStarted=true; state.documents=page.documents; state.documentCursor=page.nextCursor??null;
    }
    if(!state.documents.length)return {items:[],next:state.documentCursor!==null};
    const document=state.documents[0],page=await this.send('GET_PAGE',{page:{view:'excluded',documentId:document.id,limit:40,cursor:state.cursor,expectedGeneration:fence.generation}});
    if(page.recoveryEpoch!==fence.epoch||page.dataGeneration!==fence.generation)throw stale();
    const items=page.library.blocks.filter(row=>row.excluded===true&&!row.branchStatus).map(row=>({
      id:row.id,documentId:row.documentId,revision:row.revision,
      label:(row.libraryText??page.records.find(record=>record.id===row.originalTextReference)?.originalText??'').slice(0,80)
    }));
    state.cursor=page.nextCursor??null;
    if(state.cursor===null)state.documents.shift();
    return {items,next:state.cursor!==null||state.documents.length>0||state.documentCursor!==null};
  }
  async load(kind) {
    const page=this.pages?.get(kind); if(!page||!this.active||!this.fence||page.done)return;
    if(page.pending)return page.pending;
    const serial=this.serial,fence=this.fence,state={...page,documents:[...page.documents]};
    page.pending=(async()=>{
      await this.check(serial,fence);
      const result=kind==='input'?await this.inputPage(state,fence):await this.send(commands[kind],{options:{cursor:page.cursor,limit:40}});
      await this.check(serial,fence); if(result.cursorInvalid)throw stale();
      const items=[];
      for(const item of result.items)if(!this.rows.has(key(kind,item.id))) { items.push(item); this.rows.set(key(kind,item.id),{kind,item,fence}); }
      page.items.push(...items); page.started=true; page.error=null;
      if(kind==='input')Object.assign(page,{cursor:state.cursor,documents:state.documents,documentCursor:state.documentCursor,documentStarted:state.documentStarted,done:!result.next});
      else { page.cursor=result.nextCursor??null; page.done=page.cursor===null; }
      // A Settings snapshot alone does not qualify a removed-kind read. Retire
      // only receipts already known before this open, after its actual typed
      // page has completed under the current generation and recovery epoch.
      for(const [k,attempt]of this.settledAtOpen)if(attempt.row.kind===kind&&this.attempts.get(k)===attempt&&attempt.fence.epoch===fence.epoch&&!attempt.busy)this.attempts.delete(k);
      return items;
    })();
    try { return await page.pending; }
    catch(error) { if(this.current(serial))page.error=error; throw error; }
    finally { page.pending=null; }
  }
  async restore(kind,id) {
    const k=key(kind,id); let attempt=this.attempts.get(k);
    const row=this.rows?.get(k)??attempt?.row; if(!row||!this.current(this.serial))return;
    const serial=this.serial;
    if(attempt?.busy)return;
    if(attempt?.settled) {
      if(this.fence?.epoch!==attempt.fence.epoch)throw stale();
      await this.check(serial);
      if(this.attempts.get(k)!==attempt)throw stale();
      this.attempts.delete(k);
      if(attempt.settled.conflict===true)throw conflict();
      // This is the original receipt, not a new mutation or proof that the
      // currently displayed (possibly newer) removal has been restored.
      return attempt.settled;
    }
    if(!attempt) {
      attempt={busy:false,dispatched:false,row,fence:row.fence,revision:row.item.revision,edit:null,session:null};
      if(kind==='input')attempt.session=new WorkingInputSaveSession(async(type,data)=>{
        if(type==='EDIT_DOCUMENT') {
          const owner=this.serial; if(this.fence?.epoch!==attempt.fence.epoch)throw stale();
          await this.check(owner,this.fence);
          const current=await this.send('GET_INPUT',{id});
          const expected=attempt.edit.blocks[0];
          if(!this.current(owner)||!current||current.recoveryEpoch!==attempt.fence.epoch||current.id!==id||current.documentId!==attempt.edit.documentId||current.revision!==expected.expectedRevision||current.excluded!==true||current.branchStatus)throw conflict();
        }
        if(type==='EDIT_DOCUMENT')attempt.dispatched=true;
        return this.send(type,data);
      });
      this.attempts.set(k,attempt);
    }
    attempt.busy=true;
    try {
      // Reconcile an unknown original Input operation before requiring a new
      // list snapshot. Its commit may itself have advanced dataGeneration.
      // The original save owner checks outcome first; its write forwarding
      // still checks the new view, epoch and original revision below.
      if(!attempt.session?.unresolved) {
        // An explicit retry keeps the original typed request. Its own commit
        // may have advanced generation; re-read only the current epoch/fence,
        // never substitute a newer revision or operation identifier.
        if(attempt.edit&&attempt.dispatched&&!attempt.session) {
          const snapshot=await this.send('GET_PAGE',{page:{view:'settings'}});
          if(!this.current(serial)||snapshot.recoveryEpoch!==attempt.fence.epoch||!Number.isSafeInteger(snapshot.dataGeneration))throw stale();
          this.fence={generation:snapshot.dataGeneration,epoch:snapshot.recoveryEpoch};
        }
        if(this.fence.epoch!==attempt.fence.epoch)throw stale();
        await this.check(serial,attempt.edit?this.fence:row.fence);
      }
      if(!attempt.edit) {
        const item=row.item;
        if(kind==='input') {
          const current=await this.send('GET_INPUT',{id});
          if(!this.current(serial)||!current||current.recoveryEpoch!==attempt.fence.epoch||current.id!==id||current.documentId!==item.documentId||current.revision!==item.revision||current.excluded!==true||current.branchStatus)throw conflict();
          attempt.edit={operationId:crypto.randomUUID(),documentId:item.documentId,blocks:[{id,expectedRevision:item.revision,libraryText:current.libraryText,note:current.note,excluded:false}]};
        } else attempt.edit={id,expectedRevision:item.revision,operationId:crypto.randomUUID(),...(kind==='placement'?{historyId:item.historyId,recoveryEpoch:item.recoveryEpoch,expectedEntryRevision:item.entryRevision,expectedTopicRevision:item.topicRevision}:{})};
        await this.check(serial,row.fence);
      }
      let result;
      if(kind==='input')result=(await attempt.session.save(attempt.edit,attempt.fence.epoch)).result;
      else {if(!this.current(serial))throw stale();attempt.dispatched=true;result=await this.send(kind==='topic'?'RESTORE_LIBRARY_TOPIC':kind==='placement'?'RESTORE_LIBRARY_PLACEMENT':'RESTORE_LIBRARY_ENTRY',{edit:attempt.edit});}
      if(!result||typeof result!=='object')throw Object.assign(new Error('Restore outcome remains unknown'),{code:'SAVE_OUTCOME_UNKNOWN'});
      if(!this.current(serial)) {
        if(this.attempts.get(k)===attempt)attempt.settled=result;
        if(result.conflict===true)throw conflict();
        return result;
      }
      if(this.attempts.get(k)===attempt)this.attempts.delete(k);
      if(result.conflict===true)throw conflict();
      if(this.current(serial)&&this.rows.get(k)===row&&row.item.revision===attempt.revision&&row.fence.epoch===attempt.fence.epoch)this.rows.delete(k);
      return result;
    } catch(error) {
      // Before a write was staged there is no unknown outcome to preserve.
      // Once staged, reopening or reloading never mints a different operation.
      if((!attempt.dispatched||error.code==='CONFLICT'&&attempt.session?.pending?.state==='not_committed')&&this.attempts.get(k)===attempt)this.attempts.delete(k);
      throw error;
    } finally { attempt.busy=false; }
  }
}
