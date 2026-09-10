import {ArchiveError} from '../constants.js';
export const MEMORY_VERSION=1, DEFAULT_PROFILE='default', SESSION_KEY='paia-memory-session-v1';
export const MEMORY_PREFIX='memory:';
export const BUDGETS=Object.freeze({short:{label:'简洁',characters:2400,tokens:1800,items:6,itemCharacters:450},standard:{label:'标准',characters:6000,tokens:4500,items:16,itemCharacters:900},detailed:{label:'详细',characters:12000,tokens:9000,items:32,itemCharacters:1600}});
export const isBudget=value=>typeof value==='string'&&Object.hasOwn(BUDGETS,value);
export const reject=(code='MEMORY_INVALID')=>{throw new ArchiveError(code);};
export const idOK=x=>typeof x==='string'&&x.length>0&&x.length<=200;
export const key=(kind,...ids)=>MEMORY_PREFIX+kind+':'+JSON.stringify(ids);
export const configDefault=()=>({id:'memory:config',kind:'config',version:1,revision:0,defaultPolicy:'denied',budget:'standard',retentionDays:30,onboarded:false,userTouched:false,externalAccess:true});
export const profileDefault=()=>({id:key('profile',DEFAULT_PROFILE),kind:'profile',version:1,profileId:DEFAULT_PROFILE,name:'默认',budget:'standard',instruction:'',revision:0});
const fields={config:['id','kind','version','revision','defaultPolicy','budget','retentionDays','onboarded','userTouched','externalAccess'],profile:['id','kind','version','profileId','name','budget','instruction','revision'],topic:['id','kind','version','profileId','topicId','decision','layoutGeneration'],entry:['id','kind','version','entryId','excluded'],section:['id','kind','version','topicId','sectionId','excluded'],activity:['id','kind','version','createdAt','profileId','queryDigest','topicIds','entryIds','action']};
export function validateMemoryRow(r){if(!r||typeof r!=='object'||Array.isArray(r)||r.version!==1||!Object.hasOwn(fields,r.kind)||Object.keys(r).some(k=>!fields[r.kind].includes(k))||typeof r.id!=='string'||!r.id.startsWith(MEMORY_PREFIX))return false;
 if(r.kind==='config')return r.id==='memory:config'&&r.defaultPolicy==='denied'&&isBudget(r.budget)&&[0,7,30,90].includes(r.retentionDays)&&Number.isSafeInteger(r.revision)&&r.revision>=0&&typeof r.onboarded==='boolean'&&typeof r.userTouched==='boolean'&&(r.externalAccess===undefined||typeof r.externalAccess==='boolean');
 if(r.kind==='profile')return idOK(r.profileId)&&r.id===key('profile',r.profileId)&&typeof r.name==='string'&&r.name.trim().length>0&&r.name.length<=80&&isBudget(r.budget)&&typeof r.instruction==='string'&&r.instruction.length<=500&&Number.isSafeInteger(r.revision)&&r.revision>=0;
 if(r.kind==='topic')return idOK(r.profileId)&&idOK(r.topicId)&&r.id===key('topic',r.profileId,r.topicId)&&['allowed','denied','never'].includes(r.decision)&&Number.isSafeInteger(r.layoutGeneration)&&r.layoutGeneration>0;
 if(r.kind==='entry')return idOK(r.entryId)&&r.id===key('entry',r.entryId)&&r.excluded===true;
 if(r.kind==='section')return idOK(r.topicId)&&idOK(r.sectionId)&&r.id===key('section',r.topicId,r.sectionId)&&r.excluded===true;
 return r.id.startsWith('memory:activity:')&&Number.isFinite(Date.parse(r.createdAt))&&idOK(r.profileId)&&/^[a-f0-9]{64}$/.test(r.queryDigest)&&Array.isArray(r.topicIds)&&r.topicIds.length<=1000&&r.topicIds.every(idOK)&&Array.isArray(r.entryIds)&&r.entryIds.length<=200&&r.entryIds.every(idOK)&&['build','copy','markdown','permission','profile','settings'].includes(r.action);
}
export const memoryMetaAllowed=id=>typeof id==='string'&&(id==='memory:config'||['profile','topic','entry','section','activity'].some(k=>id.startsWith('memory:'+k+':')));
export const memoryRange=()=>IDBKeyRange.bound('memory:','memory:\uffff');
export const topicActive=t=>!!t&&t.lifecycle==='active'&&!t.redirectTo&&!t.layoutJobId;
export function policy(rows,profileId,temporary={},topics=null){
 const never=new Set(rows.filter(r=>r.kind==='topic'&&r.decision==='never').map(r=>r.topicId));
 const topicRows=new Map(rows.filter(r=>r.kind==='topic'&&r.profileId===profileId).map(r=>[r.topicId,r]));
 const matching=(id,generation)=>!topics||generation===topics.get(id)?.activeLayoutGeneration;
 // The UI and retrieval use the same effective permanent scope. An old allow
 // must be explicitly renewed after a structural scope change.
 const rules=new Map([...topicRows].map(([id,r])=>[id,r.decision==='allowed'&&!matching(id,r.layoutGeneration)?'default':r.decision]));
 const excluded=new Set(rows.filter(r=>r.kind==='entry').map(r=>r.entryId)),sections=new Set(rows.filter(r=>r.kind==='section').map(r=>JSON.stringify([r.topicId,r.sectionId])));
 const sessionAllowed=id=>!never.has(id)&&!['allowed','denied','never'].includes(rules.get(id))&&!!temporary[key('topic',profileId,id)]&&matching(id,temporary[key('topic',profileId,id)]);
 return {rules,excluded,sections,decision:id=>{if(never.has(id))return 'never';const d=rules.get(id);if(d==='denied'||d==='never')return d;return d==='allowed'||sessionAllowed(id)?'allowed':'default';},temporary:sessionAllowed};
}
