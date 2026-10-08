import {readAIStyle,AI_STYLES} from '../ai-organize-style-preference.js';
import {canonical,exact,fail,equal} from './contracts.js';

export function validateOrganizeStyle(type,value){
 if(type!=='AI_ORGANIZE')fail();
 exact(value,['version','value','policyVersion','expectedRevision','expectedEpoch']);
 if(value.version!==1||!AI_STYLES.includes(value.value)||value.policyVersion!=='AIOS-1.0'||!Number.isSafeInteger(value.expectedRevision)||value.expectedRevision<0||typeof value.expectedEpoch!=='string'||!/^[a-zA-Z0-9:-]{1,128}$/.test(value.expectedEpoch))fail();
 return value;
}
export const styleSemantics=value=>({version:value.version,value:value.value,policyVersion:value.policyVersion});
// Same existing single-worker serialized control owner as aiStylePreference.
// This does not create cross-storage or cross-instance atomic preference writes.
export async function assertOrganizeStyle(store,t,job){
 if(!Object.hasOwn(job,'organizeStyle'))return;
 const binding=validateOrganizeStyle(job.type,job.organizeStyle);
 if(await t.get('meta','backup-recovery-settings'))fail('UNAVAILABLE');
 const current=readAIStyle((await store.control(t)).preferences,(await t.get('meta','recovery-restore-epoch'))?.value??'initial');
 if(!current.available)fail('UNAVAILABLE');
 if(!equal({value:current.value,revision:current.revision,epoch:current.epoch},{value:binding.value,revision:binding.expectedRevision,epoch:binding.expectedEpoch}))fail('STALE_BASE');
}
export function organizeCoverageId(unit,job=null){
 const key=[unit.key,unit.facet,unit.scope];
 // Legacy rows retain their exact original namespace and are never upgraded.
 return job?.organizeStyle?'aiu:style-coverage:'+canonical([job.organizeSemanticKey,...key]):'aiu:coverage:'+canonical(key);
}
