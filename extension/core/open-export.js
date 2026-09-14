export const OPEN_EXPORT_VERSION=1;

const SECRET_KEY=/^(api.?key|credentials?|authorization|password|access.?token|private.?key|root.?key)$/i;
const ROLE_ORDER=['source','input','thought','ai','history','settings'];
const ROLE_BY_SECTION=Object.freeze({
 sources:'source',timeEvidence:'source',deletionFences:'source',
 inputDocuments:'input',inputs:'input',inputStates:'input',removals:'input',filterIntents:'input',filterStates:'input',
 entries:'thought',topics:'thought',sections:'thought',placements:'thought',evidence:'thought',dependencies:'thought',relations:'thought',completedLayouts:'thought',suppressions:'thought',
 revisions:'history',receipts:'history',
 settings:'settings',organizationState:'settings'
});
const ROLE_LABELS=Object.freeze({
 source:'Source Records · 当时事实与来源身份',
 input:'Input Archive · 工作正文与收录状态',
 thought:'Thought Library · 思想内容与组织关系',
 ai:'AI presentation · 派生整理与候选',
 history:'History · 版本、操作回执与删除边界',
 settings:'Settings · 可携带设置与本机策略'
});

function plain(value){return !!value&&typeof value==='object'&&!Array.isArray(value);}
function assertSecretFree(value,depth=0){
 if(depth>40)throw new TypeError('OPEN_EXPORT_INVALID');
 if(Array.isArray(value)){for(const item of value)assertSecretFree(item,depth+1);return;}
 if(!plain(value))return;
 for(const [key,item] of Object.entries(value)){
  if(SECRET_KEY.test(key))throw new TypeError('OPEN_EXPORT_SECRET_FIELD');
  assertSecretFree(item,depth+1);
 }
}
function roleFor(item){
 if(item.section==='organizationState'&&String(item.value?.id||'').startsWith('aiPresentation:'))return 'ai';
 return ROLE_BY_SECTION[item.section]||'history';
}
function normalizedItems(items){
 if(!Array.isArray(items))throw new TypeError('OPEN_EXPORT_INVALID');
 const result=items.filter(item=>item?.type==='item').map(item=>structuredClone(item));
 assertSecretFree(result);
 return result;
}
function roleBuckets(items){
 const roles=Object.fromEntries(ROLE_ORDER.map(role=>[role,{label:ROLE_LABELS[role],sections:{}}]));
 for(const item of items){const role=roleFor(item),section=item.section;(roles[role].sections[section]??=[]).push(item);}
 return roles;
}
export function buildOpenExport({header,items,exportedAt=new Date().toISOString()}={}){
 if(!plain(header)||header.format!=='PAIA Backup'||!Number.isFinite(Date.parse(exportedAt)))throw new TypeError('OPEN_EXPORT_INVALID');
 const normalized=normalizedItems(items),roles=roleBuckets(normalized);
 return {
  format:'PAIA Open Export',formatVersion:OPEN_EXPORT_VERSION,exportedAt,
  sourceBackup:{format:header.format,formatVersion:header.formatVersion,schemaVersion:header.schemaVersion,appVersion:header.appVersion,createdAt:header.createdAt},
  privacy:{localOnly:true,credentialsIncluded:false,encrypted:false,notice:'This export contains private user data. Store it securely. Files outside PAIA cannot be remotely revoked.'},
  roleOrder:ROLE_ORDER,roles,itemCount:normalized.length
 };
}
export function buildOpenExportJSON(options){return JSON.stringify(buildOpenExport(options),null,2)+'\n';}
function fence(value){const text=String(value??''),runs=text.match(/`+/g)||[],length=runs.reduce((n,run)=>Math.max(n,run.length),0),ticks='`'.repeat(Math.max(3,length+1));return `${ticks}json\n${text}${text.endsWith('\n')?'':'\n'}${ticks}`;}
export function buildOpenExportMarkdown(options){
 const data=buildOpenExport(options),parts=['# PAIA Open Export',`导出时间：${data.exportedAt}`,`来源备份：PAIA ${data.sourceBackup.appVersion} · format ${data.sourceBackup.formatVersion} · schema ${data.sourceBackup.schemaVersion}`,`总项目：${data.itemCount}`,'此文件包含私人内容，请妥善保管。开放导出未加密；文件离开 PAIA 后无法由 PAIA 撤回。'];
 for(const role of data.roleOrder){const bucket=data.roles[role],sections=Object.entries(bucket.sections);if(!sections.length)continue;parts.push(`## ${bucket.label}`);for(const [section,items] of sections){parts.push(`### ${section} · ${items.length}`);for(const item of items){const id=item.value?.id??'unknown';parts.push(`#### ${section} / ${id}`,fence(JSON.stringify(item,null,2)));}}}
 return parts.join('\n\n')+'\n';
}
