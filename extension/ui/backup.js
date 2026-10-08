import {setProductState} from './product-state.js';
import {verifyBackupSegments} from '../core/backup-segments.js';
import {request,element} from './common.js';
import {ArchiveError} from '../core/constants.js';
import {BACKUP_LIMITS,BackupValidator,backupError} from '../core/backup-format.js';
import {installR6Settings,refreshR6Settings} from './r6-settings.js';
import {setIconLabel} from './icons.js';
const $=id=>document.getElementById(id);
const INSPECTION_REJECTIONS=new Set(['BACKUP_INVALID','BACKUP_VERSION_UNSUPPORTED','BACKUP_INTEGRITY_FAILED','BACKUP_INCOMPLETE','BACKUP_TOO_LARGE']);
export const backupMessage=code=>({BACKUP_BUSY:'请等待当前资料修改完成，再恢复备份。',BACKUP_CHANGED:'操作期间本机内容发生变化。请重新校验备份并确认当前库，原有内容保持不变。',BACKUP_INVALID:'这不是有效的 PAIA 备份，未修改任何内容。',BACKUP_VERSION_UNSUPPORTED:'此备份版本暂不支持，未修改任何内容。',BACKUP_INTEGRITY_FAILED:'完整性校验未通过，文件可能已损坏。',BACKUP_INCOMPLETE:'备份文件不完整，请重新选择完整文件。',BACKUP_TOO_LARGE:'本版单次恢复支持最多 512 MB / 500000 项；文件超出范围，原有内容保持不变。',BACKUP_SESSION_EXPIRED:'本次备份会话已中断，请重新开始。',BACKUP_TARGET_NOT_EMPTY:'当前已有用户数据。请选择合并互不冲突的数据，或明确选择替换当前库。',BACKUP_MERGE_CONFLICT:'备份与当前库存在同一来源、项目或状态冲突；未合并任何内容。请检查备份或明确选择替换。',BACKUP_PURGE_CONFLICT:'此备份包含本机已永久删除的来源，不能恢复。永久删除标记优先。',BACKUP_CONFIRMATION_REQUIRED:'请先查看预览并明确确认恢复。',STORAGE_FULL:'本机存储空间不足，原有内容保持不变。',STORAGE_FAILED:'本机保存未完成，请重新打开 Settings 检查。'}[code]||'操作未完成，未自动重试。请重新选择备份文件。');
export function downloadParts(){throw new ArchiveError('FEATURE_UNAVAILABLE');}
export async function* backupFileRows(file){if(file.size>BACKUP_LIMITS.restoreBytes)backupError('BACKUP_TOO_LARGE');const reader=file.stream().getReader(),decoder=new TextDecoder('utf-8',{fatal:true});let buffer='';try{for(;;){const {done,value}=await reader.read();buffer+=decoder.decode(value,{stream:!done});let end;while((end=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,end);buffer=buffer.slice(end+1);if(line.length>BACKUP_LIMITS.lineBytes)backupError('BACKUP_TOO_LARGE');if(line.trim()){try{yield JSON.parse(line);}catch{backupError('BACKUP_INVALID');}}}if(buffer.length>BACKUP_LIMITS.lineBytes)backupError('BACKUP_TOO_LARGE');if(done)break;}if(buffer.trim()){try{yield JSON.parse(buffer);}catch{backupError('BACKUP_INVALID');}}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}}
export async function* backupSegmentRows(files){
 const list=Array.from(files||[]),manifests=list.filter(file=>file.name.endsWith('.manifest.paia-backup'));
 if(manifests.length!==1||list.length<2)backupError('BACKUP_INCOMPLETE');
 const manifestFile=manifests[0],prefix=manifestFile.name.slice(0,-'.manifest.paia-backup'.length);
 if(manifestFile.size>2*1024*1024)backupError('BACKUP_TOO_LARGE');
 let manifest;
 try{manifest=JSON.parse(await manifestFile.text());}catch{backupError('BACKUP_INVALID');}
 if(!Array.isArray(manifest.parts)||manifest.parts.some(part=>
   typeof part?.name!=='string'||!part.name.startsWith(prefix+'.part-')))
  backupError('BACKUP_INVALID');
 const ordered=await verifyBackupSegments(manifest,list.filter(file=>file!==manifestFile),
  {maxBytes:BACKUP_LIMITS.restoreBytes});
 for(const file of ordered)yield* backupFileRows(file);
}
export class BackupPanel {
 constructor(){this.busy=false;this.sessionId=null;this.mode='empty';$('backup-choose').addEventListener('click',()=>$('backup-file').click());$('backup-file').addEventListener('change',()=>void this.inspect(Array.from($('backup-file').files||[])));$('backup-restore').addEventListener('click',()=>void this.restore());$('backup-cancel').addEventListener('click',()=>void this.cancel());$('backup-mode').addEventListener('change',()=>void this.selectMode());$('backup-confirm-replace').addEventListener('change',()=>this.renderPreview());installR6Settings({isBusy:()=>this.busy,lock:value=>this.lock(value),status:(text,state)=>this.status(text,state)});this.installInspectionPresentation();}
 installInspectionPresentation(){
  const host=$('backup-settings'),heading=[];
  this.pickerDescription=$('backup-choose').getAttribute('aria-describedby');
  for(const [tag,id,zh,en]of [
   ['h1','backup-failure-page-title','数据与恢复','Data & recovery'],
   ['button','backup-failure-return','返回','Back'],
   ['small','backup-failure-note','当前状态不会自动触发外部请求。','This state does not automatically make external requests.'],
  ]){const node=element(tag);node.id=id;const value=document.documentElement.lang==='en'?en:zh,label=tag==='button'?setIconLabel(node,'back',value):node;label.dataset.r6Zh=zh;label.dataset.r6En=en;label.textContent=value;if(tag==='button'){node.type='button';node.addEventListener('click',()=>void this.cancel());}if(tag==='small')host.append(node);else heading.push(node);}host.prepend(...heading);
 }
 presentInspectionFailure(failed){
  const host=$('backup-settings'),choose=$('backup-choose');
  if(failed)host.dataset.inspectionFailure='true';else delete host.dataset.inspectionFailure;
  host.setAttribute('aria-labelledby',failed?'backup-failure-page-title':'r6-backup-heading');
  choose.dataset.r6Zh=failed?'重新选择文件':'从备份恢复';choose.dataset.r6En=failed?'Choose another file':'Restore from backup';
  choose.textContent=document.documentElement.lang==='en'?choose.dataset.r6En:choose.dataset.r6Zh;
  // Keep the original picker in place and announce the real reason at its
  // keyboard entry point. No async rejection moves a focused control.
  if(failed)choose.setAttribute('aria-describedby',[this.pickerDescription,'ux-backup-failure-title','backup-status'].filter(Boolean).join(' '));
  else if(this.pickerDescription)choose.setAttribute('aria-describedby',this.pickerDescription);else choose.removeAttribute('aria-describedby');
 }
 status(text,state){$('backup-status').textContent=text;this.currentState=state||(text.startsWith('正在')?'loading':text.includes('已完成')||text.includes('已生成')?'saved':text?'ready':'idle');setProductState($('backup-settings'),this.currentState);}
 lock(value){if(value)this.presentInspectionFailure(false);this.busy=value;setProductState($('backup-settings'),value?'loading':this.currentState||'idle');for(const id of ['backup-choose','backup-failure-return','backup-restore','backup-mode','backup-confirm-replace'])if($(id))$(id).disabled=value;}
 async cancel(){if(this.busy)return;const returnFocus=document.activeElement===$('backup-failure-return')&&$('settings-panel')?.hidden===false&&$('ux-settings-data-group')?.hidden===false;this.lock(true);try{await this.clearSession();}finally{this.lock(false);$('backup-restore').disabled=!this.preview?.canRestore||this.mode==='replace'&&!$('backup-confirm-replace').checked;if(returnFocus&&$('settings-panel')?.hidden===false&&$('ux-settings-data-group')?.hidden===false)$('backup-choose').focus();}}
 async clearSession(){this.presentInspectionFailure(false);const sessionId=this.sessionId;if(sessionId)await request('PAIA_BACKUP_CANCEL',{options:{sessionId}}).catch(()=>{});if(this.sessionId!==sessionId)return;this.sessionId=null;this.preview=null;$('backup-restore').disabled=true;this.mode='empty';$('backup-mode').value='empty';$('backup-confirm-replace').checked=false;$('backup-preview').hidden=true;$('backup-file').value='';this.status('');}
 async create(){throw new ArchiveError('FEATURE_UNAVAILABLE');}
 async createSegmented(){throw new ArchiveError('FEATURE_UNAVAILABLE');}
 async inspect(input){const files=Array.isArray(input)?input:[input];if(!files.length||!files[0]||this.busy)return;this.lock(true);try{await this.clearSession();this.status('正在本机校验备份…');const begin=await request('PAIA_BACKUP_BEGIN_RESTORE');this.sessionId=begin.sessionId;const validator=new BackupValidator();let batch=[];for await(const row of files.length===1&&!files[0].name.endsWith('.manifest.paia-backup')?backupFileRows(files[0]):backupSegmentRows(files)){await validator.add(row);batch.push(row);if(batch.length===30){await request('PAIA_BACKUP_STAGE',{options:{sessionId:this.sessionId,items:batch}});batch=[];this.status(`正在校验 · ${validator.count} 项`);}}validator.preview();if(batch.length)await request('PAIA_BACKUP_STAGE',{options:{sessionId:this.sessionId,items:batch}});this.preview=await request('PAIA_BACKUP_PREVIEW',{options:{sessionId:this.sessionId,mode:this.mode}});this.renderPreview();}catch(e){if(INSPECTION_REJECTIONS.has(e.code))this.presentInspectionFailure(true);this.status(backupMessage(e.code),'failed');if(this.sessionId)await request('PAIA_BACKUP_CANCEL',{options:{sessionId:this.sessionId}}).catch(()=>{});this.sessionId=null;this.preview=null;}finally{this.lock(false);this.renderPreview();}}
 renderPreview(){
  const p=this.preview;if(!p){$('backup-restore').disabled=true;return;}
  const replacing=this.mode==='replace',merging=this.mode==='merge';
  $('backup-confirm-replace-label').hidden=!replacing;
  $('backup-restore').textContent=replacing?'确认替换当前库':merging?'确认合并到当前库':'确认恢复到空库';
  $('backup-preview-content').replaceChildren(
   element('p','',`备份日期：${new Date(p.createdAt).toLocaleString()}`),
   element('p','',`PAIA ${p.appVersion} · 备份格式 ${p.formatVersion}`),
   element('p','',`${p.counts.inputs} 条 Input · ${p.counts.topics} 个 Topic · ${p.counts.entries} 条思想内容 · ${p.counts.revisions} 个版本`),
   element('p','muted',p.canRestore
    ?replacing?'完整性校验通过。替换会清除当前库内容；本机永久删除标记和捕获授权保留。请勾选确认。'
     :merging?'完整性校验通过。只合并无冲突的数据，当前设置与现有内容保留。'
      :'完整性校验通过。确认后将在本机恢复，捕获授权保持当前设置。'
    :backupMessage(p.reason)));
  $('backup-preview').hidden=false;
  $('backup-restore').disabled=this.busy||!p.canRestore||(replacing&&!$('backup-confirm-replace').checked);
  this.status(p.canRestore?'请核对备份信息并确认所选恢复方式。':'校验通过，当前库不满足所选恢复方式的安全条件。');
 }
 async selectMode(){
  if(this.busy||!this.sessionId)return;
  this.mode=$('backup-mode').value;
  $('backup-confirm-replace').checked=false;
  this.preview=null;$('backup-restore').disabled=true;
  this.lock(true);
  try{this.preview=await request('PAIA_BACKUP_PREVIEW',{options:{sessionId:this.sessionId,mode:this.mode}});}
  catch(e){this.status(backupMessage(e.code),'failed');}
  finally{this.lock(false);this.renderPreview();}
 }
 async restore(){if(this.busy||!this.preview?.canRestore||this.mode==='replace'&&!$('backup-confirm-replace').checked)return;this.lock(true);try{this.status('正在恢复，请保持本页打开…');await request('PAIA_BACKUP_RESTORE',{options:{sessionId:this.sessionId,confirmation:this.preview.integrity,mode:this.mode,targetGeneration:this.preview.targetGeneration,confirmReplace:this.mode==='replace'&&$('backup-confirm-replace').checked,confirmMerge:this.mode==='merge'}});await refreshR6Settings();this.sessionId=null;this.preview=null;$('backup-preview').hidden=true;this.status('恢复已完成。内容与版本已保存到本机；本地搜索索引正在更新。');}catch(e){this.status(backupMessage(e.code),'failed');}finally{this.lock(false);$('backup-restore').disabled=!this.preview?.canRestore||this.mode==='replace'&&!$('backup-confirm-replace').checked;}}
}
