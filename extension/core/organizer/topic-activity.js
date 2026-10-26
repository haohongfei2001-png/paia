import {prefix} from '../thought-model.js';
import {expressionInstant} from './expression-time.js';

const expressionActivity=expression=>['source','independent_creation'].includes(expression?.basis)?expressionInstant(expression.at):null;
function humanRevisionActivity(row,revision){
 const authored=row?.authorship?.body,protection=row?.protections?.body;
 if(authored?.actor!=='user'||authored.everHumanConfirmed!==true||!authored.operationId||!['user_edit','shared_input_edit','shared_entry_edit'].includes(protection?.reason)||protection.operationId!==authored.operationId)return null;
 if(revision?.kind!=='library_entry'||revision.entityId!==row.id||revision.actor!=='user'||revision.operationId!==authored.operationId||!revision.fieldMask?.includes('body')||!['edit','continue','shared_input_edit','shared_entry_edit'].includes(revision.reason))return null;
 const at=expressionInstant(authored.at),after=revision.after?.bodyAuthorship;
 if(!at||expressionInstant(after?.at)!==at||after.actor!=='user'||after.operationId!==authored.operationId||!Number.isInteger(revision.afterRevision)||revision.afterRevision>row.revision||typeof revision.before?.body!=='string'||typeof revision.after?.body!=='string'||revision.before.body===revision.after.body)return null;
 return at;
}
export function qualifiedTopicActivity(row,expression,revisions=[]){
 let at=expressionActivity(expression);
 for(const revision of revisions){const human=humanRevisionActivity(row,revision);if(human&&(!at||human>at))at=human;}
 return at;
}
export async function readTopicActivity(t,row,expression,{cursor=null,budget={remaining:100}}={}){
 const at=expressionActivity(expression),authored=row?.authorship?.body;
 if(authored?.actor!=='user'||!['user_edit','shared_input_edit','shared_entry_edit'].includes(row?.protections?.body?.reason))return {at};
 // The entire existing build call shares one finite revision budget. A large
 // retained journal resumes from metadata-only cursor; it is never clipped
 // into false unknown/completeness or copied into another body store.
 if(!budget.remaining)return {pending:true,cursor};
 const page=await t.rangePage('revisions','byList',prefix(['library_entry:'+row.id]),cursor,Math.min(100,budget.remaining),'prev');budget.remaining-=page.rows.length;
 for(const {value:revision}of page.rows){const human=humanRevisionActivity(row,revision);if(human)return {at:!at||human>at?human:at};}
 return page.next?{pending:true,cursor:page.next}:{at};
}
