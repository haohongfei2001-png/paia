import {GROUP_PAGE_LIMITS} from './group-page-reader.js';
import {validateCoverage} from './codecs.js';
import {exact,fail,hash} from './value.js';
const profileName='bounded-admitted-local-owners',own=(x,keys)=>exact(x,keys)&&Object.keys(x).length===keys.length;
// Original grouped restore manifest checks. This assertion conveys no Scope,
// native snapshot, transport or commit authority. Decode/identity remain owners.
export function assertGroupedCheckpointManifest(v,{core,supported}={}){
 const paged=v?.ownerScope?.version===2&&v?.ownerScope?.profile==='paged-admitted-local-owners';
 if(!own(v,['magic','protocol','kind','datasetId','clientEncryption','root','level','itemCount','chain','coverage','parents','ownerScope'])||v.magic!=='PAIA-BNS'||v.protocol!==1||v.kind!=='checkpoint-manifest'||v.datasetId!==core.datasetId||v.clientEncryption!=='none'||!Number.isSafeInteger(v.level)||v.level<0||v.level>8||!Number.isSafeInteger(v.itemCount)||v.itemCount<0||v.itemCount>(paged?GROUP_PAGE_LIMITS.refs:384)||(!hash(v.chain)&&v.itemCount!==0)||!Array.isArray(v.parents)||v.parents.length>128||v.parents.some(x=>!hash(x))||new Set(v.parents).size!==v.parents.length)fail('BNS_CHECKPOINT_INVALID');
 const scope=v.ownerScope;if(!own(scope,['version','profile','families'])||(paged?scope.version!==2:scope.version!==1||scope.profile!==profileName)||!Array.isArray(scope.families)||scope.families.length>16||scope.families.some(row=>!own(row,['type','count','digest'])||typeof row.type!=='string'||!Number.isSafeInteger(row.count)||row.count<0||row.count>(paged?GROUP_PAGE_LIMITS.refs:128)||!hash(row.digest))||new Set(scope.families.map(x=>x.type)).size!==scope.families.length)fail('BNS_GROUP_SCOPE_INVALID');
 validateCoverage(v.coverage,supported);
}
