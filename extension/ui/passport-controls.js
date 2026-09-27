import {element,request} from './common.js';
const c=(zh,en)=>document.documentElement.lang.startsWith('en')?en:zh;
const consumers={chatgpt:['ChatGPT','ChatGPT'],claude:['Claude','Claude'],gemini:['Gemini','Gemini'],coding_agent:['编程助手','Coding assistant'],other_ai:['其他 AI','Other AI']};
const purposes={general:['一般任务','General task'],research:['研究','Research'],coding:['编程','Coding'],career:['职业任务','Career task'],writing:['写作','Writing']};
const durations={once:['一次受控使用','One controlled use'],'7d':['7 天','7 days'],'30d':['30 天','30 days']};
const states={active:['有效','Active'],revoked:['已撤销','Revoked'],consumed:['已使用一次','Used once'],expired:['已到期','Expired'],invalid:['无效','Invalid']};
const label=(map,key)=>map[key]?c(...map[key]):c('未知／不可用','Unknown / unavailable');
const time=value=>{const at=typeof value==='string'?Date.parse(value):NaN;return Number.isFinite(at)?new Intl.DateTimeFormat(document.documentElement.lang||'zh-CN',{dateStyle:'medium',timeStyle:'short'}).format(at):c('尚无受控使用','No controlled use recorded');};
const button=(text,fn)=>{const b=element('button','',text);b.type='button';b.addEventListener('click',()=>void fn());return b;};
const chooser=(name,text,values)=>{const field=element('label','passport-field',text),select=element('select');select.name=name;select.required=true;select.setAttribute('aria-label',text);field.append(select);setOptions(select,values);return {field,select};};
function setOptions(select,values){
 const selected=select.value;select.replaceChildren();
 const blank=element('option','',c('请选择','Choose explicitly'));blank.value='';select.append(blank);
 for(const [value,text]of values){const option=element('option','',text);option.value=value;select.append(option);}
 select.value=values.some(([value])=>value===selected)?selected:'';
}

// Existing metadata authority only. Mount never reads source bodies, builds
// or releases Context, toggles eligibility, sends content or creates a grant.
export function mountPassportControls({dialog,container,status,memory,passport,onMetadata}){
 let data={memory,passport},busy=false,uncertain=false;
 const list=element('div','passport-grant-list'),form=element('form','passport-grant-form');
 const consumer=chooser('consumer',c('使用方','Consumer'),passport.consumers.map(value=>[value,label(consumers,value)]));
 const purpose=chooser('purpose',c('用途','Purpose'),passport.purposes.map(value=>[value,label(purposes,value)]));
 const scope=chooser('profileId',c('已保存的允许范围','Saved eligibility scope'),memory.profiles.map(profile=>[profile.profileId,profile.name]));
 const duration=chooser('duration',c('有效期','Duration'),passport.durations.map(value=>[value,label(durations,value)]));
 const confirm=element('label','passport-confirm'),check=element('input');check.type='checkbox';check.name='confirm_read';
 check.setAttribute('aria-label',c('确认只允许读取／导出','Confirm read / export only'));
 confirm.append(check,document.createTextNode(c('我确认这项权限只允许导出当前范围内可提供的内容，不允许修改或整理。','I confirm that this permission only exports currently eligible content in this scope; it cannot modify or organize content.')));
 const submit=element('button','passport-create',c('创建这项读取／导出权限','Create this read / export permission'));submit.type='submit';submit.disabled=true;
 const refresh=button(c('重新读取权限记录','Refresh permission records'),()=>load());
 form.append(consumer.field,purpose.field,scope.field,duration.field,element('p','',c('操作：读取已允许内容（导出）；不含写入、修改或整理。创建权限不等于已连接，也不会发送本次材料。','Operation: read eligible content for export, without write, edit or organization. Creating permission does not connect or send these materials.')),confirm,submit);
 container.append(element('h3','',c('受控外部使用权限','Controlled external-use permissions')),element('p','',c('权限只约束后续受控使用，不能收回已复制或导出的文字。备份恢复不会重新激活旧权限。','Permissions govern future controlled use and cannot recall copied or exported text. Restoring a backup does not reactivate old permissions.')),list,form,refresh);
 const fields=[consumer.select,purpose.select,scope.select,duration.select,check];
 const update=()=>{submit.disabled=busy||uncertain||!check.checked||fields.slice(0,4).some(field=>!field.value);for(const field of fields)field.disabled=busy;refresh.disabled=busy;for(const control of list.querySelectorAll('button'))control.disabled=busy||uncertain;};
 form.addEventListener('change',update);
 function render(){
  setOptions(scope.select,data.memory.profiles.map(profile=>[profile.profileId,profile.name]));
  list.replaceChildren();
  if(!data.passport.grants.length)list.append(element('p','passport-empty',c('尚无权限记录；手动复制或导出本次材料无需创建连接权限。','No permission records. Manual copy or export of this task does not require connection permission.')));
  for(const grant of data.passport.grants){
   const profile=data.memory.profiles.find(row=>row.profileId===grant.profileId);
   const row=element('section','passport-grant'),facts=element('dl');row.dataset.grant=grant.grantId;
   for(const [text,value]of [
    [c('使用方','Consumer'),label(consumers,grant.consumer)],
    [c('用途','Purpose'),label(purposes,grant.purpose)],
    [c('范围','Scope'),profile?.name||c('范围已删除，无法提供内容','Scope deleted; content is unavailable')],
    [c('操作','Operation'),c('读取已允许内容（导出）；不含写入','Read eligible content for export; no write')],
    [c('有效期','Duration'),label(durations,grant.duration)],
    [c('状态','State'),label(states,grant.state)],
    [c('上次受控使用','Last controlled use'),time(grant.lastUsedAt)]
   ])facts.append(element('dt','',text),element('dd','',value));
   row.append(facts);
   if(grant.state==='active')row.append(button(c('撤销这项权限','Revoke this permission'),()=>mutate('PAIA_PASSPORT_REVOKE',{grantId:grant.grantId},c('已撤销；后续受控使用将被拒绝。已复制或导出的文字不能收回。','Revoked; future controlled use is denied. Copied or exported text cannot be recalled.'))));
   list.append(row);
  }
  onMetadata?.(data.memory,data.passport);update();
 }
 async function readMetadata(){
  const [nextMemory,nextPassport]=await Promise.all([request('PAIA_MEMORY_STATUS',{options:{profileId:'default'}}),request('PAIA_PASSPORT_STATUS')]);
  return {memory:nextMemory,passport:nextPassport};
 }
 async function load(){
  if(busy||!dialog.open)return;busy=true;update();
  try{
   const next=await readMetadata();if(!dialog.open)return;
   data=next;uncertain=false;check.checked=false;render();
   status.textContent=c('已重新读取本机权限记录；没有创建或使用权限。','Permission records refreshed on this device; no permission was created or used.');
  }catch{
   uncertain=true;
   if(dialog.open)status.textContent=c('记录暂不可用。没有自动重试；请重新读取后核对操作结果。','Records are unavailable. No automatic retry; refresh and verify the result.');
  }finally{busy=false;if(dialog.open)update();}
 }
 async function mutate(type,fields,success){
  if(busy||uncertain||!dialog.open)return;busy=true;update();
  try{
   const acknowledged=await request(type,fields),next=await readMetadata();
   if(!dialog.open)return;
   const row=next.passport.grants.find(grant=>grant.grantId===acknowledged?.grantId);
   if(!row||['grantId','consumer','purpose','profileId','duration','resourceScope','permission','createdAt','expiresAt'].some(key=>row[key]!==acknowledged[key]))throw Error('permission_readback_unconfirmed');
   if(type==='PAIA_PASSPORT_CREATE'){
    const wanted=fields.grant;
    if(row.state!=='active'||row.permission!=='context_export'||row.resourceScope!=='profile'||!next.memory.profiles.some(profile=>profile.profileId===wanted.profileId)||['consumer','purpose','profileId','duration'].some(key=>row[key]!==wanted[key]))throw Error('permission_readback_unconfirmed');
   }else if(row.grantId!==fields.grantId||row.state!=='revoked'||!row.revokedAt||row.revokedAt!==acknowledged.revokedAt)throw Error('permission_readback_unconfirmed');
   data=next;check.checked=false;render();status.textContent=success;
  }catch{
   uncertain=true;
   if(dialog.open)status.textContent=c('操作结果尚未确认。没有自动重试；请重新读取权限记录后核对，避免重复创建。','The result is unconfirmed. No automatic retry; refresh records and verify before creating another permission.');
  }finally{busy=false;if(dialog.open)update();}
 }
 form.addEventListener('submit',event=>{
  event.preventDefault();if(submit.disabled||!check.checked)return;
  const grant={consumer:consumer.select.value,purpose:purpose.select.value,profileId:scope.select.value,duration:duration.select.value};
  if(!data.passport.consumers.includes(grant.consumer)||!data.passport.purposes.includes(grant.purpose)||!data.memory.profiles.some(profile=>profile.profileId===grant.profileId)||!data.passport.durations.includes(grant.duration))return;
  void mutate('PAIA_PASSPORT_CREATE',{grant},c('本机权限记录已创建；尚未连接或发送，本次任务材料没有被修改。','Permission created on this device; nothing connected or sent, and this task was not changed.'));
 });
 render();
}
