import {textBlock} from './export.js';

export const OPEN_EXPORT_FORMAT='PAIA Open Export';
export const OPEN_EXPORT_VERSION=1;
const OMITTED=new Set(['receipts','completedLayouts']);
const clone=value=>structuredClone(value);
const ROLE_LABELS={
 immutable_source_record:'Source Record · 不可变来源',input_document:'Input document · 文档元数据',input_working_copy:'Input Archive · 工作副本',
 independent_thought:'Thought Library · 独立思想',input_bound_thought:'Thought Library · Input 绑定思想',thought:'Thought Library · 思想内容',
 ai_presentation:'AI presentation · AI 整理',revision:'Version history · 版本历史',portable_settings:'Portable settings · 可迁移设置'
};
const EXPLANATION=Object.freeze({
 sourceRecords:'Immutable source snapshots captured or imported by PAIA.',
 inputs:'Editable Input Archive working copies, separate from immutable Source Records.',
 thoughts:'Thought Library content. Each row retains its original origin/binding fields.',
 aiPresentations:'Saved AI-organized presentation state, separate from human-authored Thought text.',
 revisions:'Version history with actor/reason fields preserved.',
 omittedOperationalState:'Runtime receipts, completed organizer jobs, provider ledgers, transient sessions, credentials, grants and runnable jobs are not open-export content roles.'
});
function thoughtRole(value){if(value.origin==='user_created'||value.formation==='user_created')return 'independent_thought';if(value.bodyBinding==='input')return 'input_bound_thought';return 'thought';}
export function openExportRecord(row){
 if(row?.type!=='item'||!row.value||typeof row.value!=='object'||OMITTED.has(row.section))return null;
 const value=clone(row.value);
 if(row.section==='organizationState'){
  if(!value.id?.startsWith('aiPresentation:'))return null;
  return {role:'ai_presentation',section:row.section,...clone(value.data||value)};
 }
 const role=row.section==='sources'?'immutable_source_record':row.section==='inputDocuments'?'input_document':row.section==='inputs'?'input_working_copy':row.section==='entries'?thoughtRole(value):row.section==='revisions'?'revision':row.section==='settings'?'portable_settings':row.section;
 if(row.section==='inputDocuments'&&row.working)return {role,section:row.section,source:value,working:clone(row.working)};
 return {role,section:row.section,...value};
}
function meta(header,exportedAt){
 if(!header||header.type!=='header'||header.format!=='PAIA Backup')throw new TypeError('backup header required');
 return {format:OPEN_EXPORT_FORMAT,formatVersion:OPEN_EXPORT_VERSION,exportedAt,sourceBackup:{createdAt:header.createdAt,appVersion:header.appVersion,schemaVersion:header.schemaVersion},explanation:EXPLANATION};
}
export class OpenExportWriter{
 constructor(kind,header,{exportedAt=new Date().toISOString()}={}){
  if(!['json','markdown'].includes(kind))throw new TypeError('unsupported open export kind');this.kind=kind;this.header=header;this.exportedAt=exportedAt;this.count=0;this.parts=[];this.first=true;this.lastLabel=null;
  const m=meta(header,exportedAt);
  if(kind==='json')this.parts.push(JSON.stringify({...m,records:[]}).replace(/\[\]\}$/,'['));
  else this.parts.push(`# PAIA Complete Open Export\n\n导出时间：${exportedAt}\n\n这是可读开放导出，不是 PAIA Backup。Source、Input、Thought、AI 整理和版本历史保持不同角色；文件离开扩展后由你自行保管。\n`);
 }
 add(rows){
  for(const row of rows||[]){const record=openExportRecord(row);if(!record)continue;this.count++;
   if(this.kind==='json'){this.parts.push((this.first?'':',')+JSON.stringify(record));this.first=false;continue;}
   const label=ROLE_LABELS[record.role]||record.section;if(label!==this.lastLabel){this.parts.push(`\n## ${label}\n`);this.lastLabel=label;}this.parts.push(textBlock(JSON.stringify(record,null,2))+'\n');
  }
  return this;
 }
 finish(){
  const m=meta(this.header,this.exportedAt);
  if(this.kind==='json')this.parts.push(`],"recordCount":${this.count}}`);
  else this.parts.push(`\n---\nOpen-export records: ${this.count}. Runtime receipts, provider/session state and credentials are intentionally omitted.\n`);
  return this.parts;
 }
}
export function buildOpenExport(rows,{exportedAt=new Date().toISOString()}={}){
 if(!Array.isArray(rows))throw new TypeError('rows must be an array');const header=rows.find(row=>row?.type==='header'&&row.format==='PAIA Backup'),m=meta(header,exportedAt),records=rows.map(openExportRecord).filter(Boolean);return {...m,recordCount:records.length,records};
}
export function exportOpenJSON(rows,options){const header=rows.find(row=>row?.type==='header'&&row.format==='PAIA Backup'),writer=new OpenExportWriter('json',header,options);writer.add(rows);return writer.finish().join('');}
export function exportOpenMarkdown(rows,options){const header=rows.find(row=>row?.type==='header'&&row.format==='PAIA Backup'),writer=new OpenExportWriter('markdown',header,options);writer.add(rows);return writer.finish().join('');}
