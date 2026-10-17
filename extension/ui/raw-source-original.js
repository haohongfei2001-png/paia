import {element} from './common.js';
import {readerCopy as copy} from './reader-experience.js';

const unavailable=()=>{throw Error('RAW_SOURCE_INPUT_UNAVAILABLE');};
const refers=(row,documentId,sourceId)=>row?.documentId===documentId&&Array.isArray(row.provenance)&&row.provenance.some(ref=>ref.sourceRecordId===sourceId);
function qualify(page,{documentId,generation,epoch}){
 if(page?.dataGeneration!==generation||page.recoveryEpoch!==epoch||documentId&&!page.conversations?.some(row=>row.id===documentId))unavailable();
}
function originalQualification({request,generation,epoch,isCurrent}){
 return {expectedGeneration:generation,isCurrent,qualifyRead:async original=>{
  if(!isCurrent()||original?.generation!==generation)return false;
  const page=await request('GET_PAGE',{page:{view:'settings',limit:1,expectedGeneration:generation}});
  if(!isCurrent())return false;qualify(page,{generation,epoch});return true;
 }};
}
// Resolve existing canonical Input identities only. Raw archive pages contain
// Source records, not Input rows; names such as `block:<source>` are not IDs.
// Bodies returned by the existing bounded page owner never leave this stack.
export async function rawSourceInputs({request,documentId,sourceId,generation,epoch,isCurrent}){
 if(!Number.isSafeInteger(generation)||generation<0||typeof epoch!=='string'||!epoch)unavailable();
 const candidates=new Map();let remaining=1000;
 for(const view of ['library','excluded']){
  let cursor=null;const seen=new Set();
  do{
   if(!isCurrent()||remaining--<=0)unavailable();
   const page=await request('GET_PAGE',{page:{view,documentId,limit:100,cursor,expectedGeneration:generation}});
   if(!isCurrent())unavailable();qualify(page,{documentId,generation,epoch});
   for(const row of page.library?.blocks||[])if(refers(row,documentId,sourceId))candidates.set(row.id,{id:row.id,excluded:row.excluded===true,revision:row.revision});
   cursor=page.nextCursor;
   if(cursor!==null){const key=JSON.stringify(cursor);if(seen.has(key))unavailable();seen.add(key);}
  }while(cursor!==null);
 }
 return [...candidates.values()];
}

// A transient deliberate raw-data action. The existing modal and Original
// owners retain closing, nonce, full-copy, generation and purge authority.
export class RawSourceOriginal {
 constructor({dialog,content,host,originals,request}){Object.assign(this,{dialog,content,host,originals,request});}
 openConversation({documentId,generation,epoch,trigger,isCurrent}){
  if(!isCurrent()||!Number.isSafeInteger(generation)||generation<0||typeof epoch!=='string'||!epoch)return false;
  return this.originals.open({kind:'conversation',ref:documentId},trigger,originalQualification({request:this.request,generation,epoch,isCurrent}));
 }
 async open({documentId,sourceId,generation,epoch,trigger,isCurrent}){
  if(!isCurrent())return false;
  const {dialog,content,host,originals,request}=this,currentModal=host.open(dialog,{trigger}),current=()=>currentModal()&&isCurrent();
  dialog.dataset.readingSurface='source-input-choice';dialog.querySelector('h2').textContent=copy('关联 Input 的原始内容','Original content of a linked Input');
  const status=element('p','',copy('正在核对关联 Input…','Checking linked Inputs…'));status.setAttribute('role','status');content.replaceChildren(status);let busy=false;
  const refuse=()=>{if(current()){content.replaceChildren(status);status.textContent=copy('关联 Input 已变化或暂时无法完整核对。没有打开其他 Input；请关闭后重新核对。','Linked Inputs changed or could not be fully checked. No other Input was opened. Close and check again.');}};
  const choose=async candidate=>{
   if(!current()||busy)return false;busy=true;
   try{
    const input=await request('GET_INPUT',{id:candidate.id});if(!current())return false;
    if(input?.id!==candidate.id||!refers(input,documentId,sourceId))unavailable();
    // GET_INPUT returns a canonical row without epoch metadata. Reconfirm the
    // same existing page authority before transferring to OriginalSurface.
    const page=await request('GET_PAGE',{page:{view:'settings',limit:1,expectedGeneration:generation}});
    if(!current())return false;qualify(page,{generation,epoch});
    await originals.open({kind:'input',ref:input.id},trigger,originalQualification({request,generation,epoch,isCurrent}));return true;
   }catch{refuse();return false;}finally{busy=false;}
  };
  try{
   const candidates=await rawSourceInputs({request,documentId,sourceId,generation,epoch,isCurrent:current});if(!current())return false;
   if(!candidates.length){status.textContent=copy('这条原始来源没有可核对的关联 Input。原始来源仍可在来源记录中只读查看。','No linked Input could be checked for this Source. The original Source remains read-only in Source records.');return false;}
   if(candidates.length===1)return await choose(candidates[0]);
   status.textContent=copy('这条来源关联多个 Input。请选择要核对的实际 Input；每项保留其完整原始来源范围。','This Source is linked to several Inputs. Choose an Input to check its complete original Source scope.');
   for(const [index,candidate]of candidates.entries()){
    const version=Number.isSafeInteger(candidate.revision)?copy(` · 版本 ${candidate.revision}`,` · Version ${candidate.revision}`):'',button=element('button','',`Input ${index+1}${version}${candidate.excluded?copy(' · 已移除',' · Removed'):''}`);button.type='button';button.dataset.originalInputId=candidate.id;button.onclick=()=>choose(candidate);content.append(button);
   }
   return true;
  }catch{refuse();return false;}
 }
}
