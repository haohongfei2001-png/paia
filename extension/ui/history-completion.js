import {setProductState} from './product-state.js';
import {OfficialExportProvider} from '../core/import/provider.js';
import {ImportError,safeImportError} from '../core/import/errors.js';
const phases={idle:'选择本次要读取的导出文件。',selected:'文件已选择。',checking:'正在检查文件，尚未写入档案…',ready:'检查完成。确认后才会写入档案。',importing:'正在补全历史输入…',completed:'历史补全完成。',partial:'已补全可识别的内容，部分输入需要确认。',unsupported:'无法可靠识别这份聊天记录，未写入档案。',failed:'本次处理未完成，已完成的部分仍保留。',paused:'已暂停。重新选择同一文件即可继续。',cancelled:'本次补全已取消，已完成的部分仍保留。',awaiting_file:'请重新同意并选择原文件，继续上次进度。'};
const errors={SCHEMA_UNSUPPORTED:'暂不支持这份文件的聊天结构。请确认选择的是 ChatGPT 导出 ZIP 或聊天 JSON。',SCHEMA_UNVERIFIED:'这份格式尚未得到支持，未写入档案。',PAIA_BACKUP_FILE:'这是 PAIA 备份，请到 Settings 的“数据备份”中恢复。',IMPORT_FILE_MISMATCH:'这不是上次选择的文件。请重新选择原文件，或另开一次补全。',IMPORT_SESSION_EXPIRED:'读取授权已结束。重新选择原文件即可继续。',STORAGE_FULL:'本机空间不足。请释放空间后，重新选择原文件继续。',STORAGE_FAILED:'暂时无法保存到本机。已完成的部分保留，请稍后重试。',FILE_INVALID:'文件为空或超过 1 GB。请检查所选文件。',RESOURCE_LIMIT:'文件超过安全处理上限，未继续读取。',CANCELLED:''};
const $=id=>document.getElementById(id);
async function send(type,payload){const r=await chrome.runtime.sendMessage({type,payload});if(!r?.ok)throw new ImportError(r?.error);return r.data;}
const errorText=code=>errors[code]??(code?.startsWith('ZIP_')?'压缩包损坏、加密或包含不支持的内容。请检查文件或重新下载。':code?.startsWith('JSON_')||code==='UTF8_INVALID'?'文件内容不完整或格式无效。请重新下载后再试。':'暂时无法完成处理，请重新选择文件再试。');
export function initHistoryCompletion({beforeOpen=async()=>true,onChange=()=>{},onNavigate=()=>{}}={}){
 let resumeTaskId,processing=false,port=null;
 const controller=new OfficialExportProvider().createSession({transport:(method,q)=>send('IMPORT_'+method.toUpperCase(),q),onProgress:paint});
 function paint(s){setProductState($('history-dialog'),({selected:'ready',checking:'loading',importing:'updating',completed:'saved',unsupported:'failed',cancelled:'paused',awaiting_file:'paused'})[s.phase]||s.phase);
  const done=['completed','partial'].includes(s.phase),active=['checking','importing'].includes(s.phase);
  $('history-status').textContent=phases[s.phase]||'正在处理…';$('history-error').textContent=s.reason?errorText(s.reason):'';
  const c=s.phase==='ready'||s.phase==='checking'?s.preview:s.counts;
  $('history-counts').replaceChildren();
  if(c)for(const [value,label]of [[c.added,s.phase==='ready'?'预计新增原文':'新增原文'],[c.duplicates,'已存在'],[c.ignored,'永久忽略'],[c.removed,'保留人工移除'],[c.review,'待确认分支'],[c.timeEnriched??c.knownTime,s.phase==='ready'?'有可靠发送时间':'补全已有时间']]){
   const row=document.createElement('div'),n=document.createElement('strong'),name=document.createElement('span');n.textContent=String(value||0);name.textContent=label;row.append(n,name);$('history-counts').append(row);
  }
  const d=s.detection,inspection=s.inspection||d;$('history-format').textContent=d?(d.container==='zip'?'ZIP':'JSON')+' · '+(d.fileBytes/1048576).toFixed(1)+' MB · '+(d.support==='partial'?'已识别可处理的部分内容':'已识别聊天记录')+' · '+d.conversations+' 个窗口 · '+d.userMessages+' 条用户文字'+(c?.unknownTime?' · '+c.unknownTime+' 条发送时间未知':'')+(d.fileBytes>=100*1048576?' · 文件较大，检查和补全可能需要几分钟；可以暂停后重选继续。':''):'';
  if(inspection?.skippedMessages||inspection?.skippedConversations)$('history-format').textContent+=' · 跳过不支持的 '+(inspection.skippedConversations||0)+' 个窗口 / '+(inspection.skippedMessages||0)+' 条内容';
  if(c?.metadataEnriched)$('history-format').textContent+=' · 补全 '+c.metadataEnriched+' 条已有来源信息';
  $('history-progress').hidden=!active;if(s.phase==='importing'&&d?.userMessages){const processed=(c?.added||0)+(c?.duplicates||0)+(c?.ignored||0);$('history-progress').max=d.userMessages;$('history-progress').value=processed;$('history-status').textContent+=' 已处理 '+processed+' / '+d.userMessages+' 条。';}else $('history-progress').removeAttribute('value');
  $('history-commit').hidden=done;$('history-commit').disabled=!controller.adapter||!controller.hasFile||s.phase!=='ready'||processing;
  $('history-pause').disabled=!controller.hasFile;$('history-cancel').disabled=done||s.phase==='cancelled'||!controller.hasFile&&!s.taskId;
  $('history-file-consent').disabled=processing;$('history-choose').disabled=processing||!$('history-file-consent').checked;
  $('history-success').hidden=!done;$('history-review').hidden=!(s.counts?.review>0);
  $('history-diagnostic').textContent=JSON.stringify({state:s.phase,code:s.reason||null,profile:d?.profileId||s.adapterId||null,profileVersion:d?.profileVersion||s.profileVersion||null,realExportVerified:false,processedBytes:s.processedBytes||0,checkedBatches:s.checkedBatches||0,committedBatches:s.committedBatches||0,counts:c||null},null,2);
 }
 async function latest(){
  try{const {lastImport:r}=await send('IMPORT_LATEST');$('history-latest').textContent=r?'最近补全：'+new Date(r.completedAt).toLocaleDateString('zh-CN')+' · ChatGPT 官方导出 · 新增 '+r.counts.added+' · 已存在 '+r.counts.duplicates+' · 补全时间 '+(r.counts.timeEnriched||0)+' · 异常 '+r.counts.issues+(r.phase==='partial'?' · 部分输入待确认':''):'尚未补全历史输入。随时可以选择导出文件开始。';}catch{$('history-latest').textContent='上次补全记录未能载入。已保存的输入仍保留；重新打开此页可再试。';}
 }
 async function tasks(cursor){
  try{
   const page=await send('IMPORT_TASKS',cursor?{cursor}:undefined);if(!cursor)$('history-tasks').replaceChildren();
   for(const row of page.tasks){
    if(['completed','partial','cancelled'].includes(row.phase))continue;
    const group=document.createElement('div'),b=document.createElement('button'),cancel=document.createElement('button');b.type=cancel.type='button';
    b.textContent='继续未完成的补全 · 已新增 '+row.counts.added+' 条';
    b.addEventListener('click',async()=>{if(processing)return;await controller.pause();resumeTaskId=row.taskId;$('history-file-consent').checked=false;paint({...row,phase:'awaiting_file'});});
    cancel.textContent='取消';cancel.addEventListener('click',async()=>{if(processing)return;try{await send('IMPORT_CANCEL',{taskId:row.taskId});if(resumeTaskId===row.taskId)resumeTaskId=undefined;group.remove();}catch{$('history-error').textContent='暂时无法取消，请再试一次。';}});
    group.append(b,cancel);$('history-tasks').append(group);
   }
   if(page.nextCursor){const more=document.createElement('button');more.type='button';more.textContent='更多历史任务';more.addEventListener('click',()=>{more.remove();void tasks(page.nextCursor);});$('history-tasks').append(more);}
  }catch{$('history-error').textContent='暂时无法读取上次进度。';}
 }
 async function open(){
  if(!await beforeOpen())return;resumeTaskId=undefined;
  try{port?.disconnect();port=chrome.runtime.connect({name:'official-export-session'});}catch{}
  $('history-dialog').showModal();paint(controller.summary);await tasks();
 }
 async function close(){await controller.pause();port?.disconnect();port=null;$('history-file').value='';$('history-file-consent').checked=false;$('history-dialog').close();}
 for(const id of ['sync-history','empty-sync','settings-history'])$(id).addEventListener('click',()=>void open());
 $('history-close').addEventListener('click',()=>void close());$('history-dialog').addEventListener('cancel',e=>{e.preventDefault();void close();});
 $('history-file-consent').addEventListener('change',()=>paint(controller.summary));
 $('history-choose').addEventListener('click',e=>{if(e.isTrusted&&$('history-file-consent').checked&&!processing)$('history-file').click();});
 $('history-file').addEventListener('change',async e=>{
  const file=e.target.files?.[0],consent=$('history-file-consent').checked===true;e.target.value='';$('history-file-consent').checked=false;if(!file||!consent)return;
  processing=true;try{await controller.select(file,{consent,taskId:resumeTaskId});await controller.preflight();}catch(error){$('history-error').textContent=errorText(safeImportError(error));}finally{processing=false;paint(controller.summary);}
 });
 $('history-commit').addEventListener('click',async e=>{
  if(!e.isTrusted||processing)return;processing=true;paint({...controller.summary,phase:'importing'});
  try{await controller.commit();resumeTaskId=undefined;onChange();void latest();void tasks();}catch(error){$('history-error').textContent=errorText(safeImportError(error));}finally{processing=false;paint(controller.summary);}
 });
 $('history-pause').addEventListener('click',()=>void controller.pause().then(()=>{$('history-file-consent').checked=false;paint(controller.summary);void tasks();}).catch(()=>{$('history-error').textContent='暂停尚未完成。请保持页面打开后再试；已经补全的输入保留。';}));
 $('history-cancel').addEventListener('click',async()=>{try{await controller.cancel();resumeTaskId=undefined;paint(controller.summary);void tasks();onChange();}catch{$('history-error').textContent='暂时无法取消，请再试一次。';}});
 $('history-read').addEventListener('click',async()=>{await close();await onNavigate('library');});
 $('history-thoughts').addEventListener('click',async()=>{await close();await onNavigate('thoughts');});
 $('history-review').addEventListener('click',async()=>{await close();await onNavigate('excluded');});
 window.addEventListener('pagehide',()=>{void controller.pause().catch(()=>{});port?.disconnect();});
 return {open,latest};
}
