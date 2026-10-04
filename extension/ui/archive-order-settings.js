import {request,element} from './common.js';

const copy=(zh,en)=>document.documentElement.lang==='en'?en:zh;
export class ArchiveOrderSettings{
 constructor({send=request}={}){
  this.send=send;this.mode='paia';this.busy=false;this.failed=false;this.consented=false;this.readEpoch=0;this.loading=0;this.pendingLoad=false;this.root=element('div','setting ux-preference-setting archive-order-setting');
  this.label=element('label','',copy('档案窗口顺序','Archive window order'));this.label.htmlFor='archive-order-mode';
  this.select=element('select');this.select.id='archive-order-mode';
  for(const [value,zh,en] of [['paia','PAIA 顺序','PAIA order'],['source','来源顺序','Source order']]){const option=element('option','',copy(zh,en));option.value=value;this.select.append(option);}
  this.status=element('p','muted',copy('默认使用 PAIA 顺序。','PAIA order is the default.'));this.status.id='archive-order-status';this.status.setAttribute('role','status');
  this.root.append(this.label,this.select,this.status);this.select.addEventListener('change',()=>void this.save(this.select.value));
  this.select.addEventListener('blur',()=>{if(this.pendingLoad)void this.load();});
  document.addEventListener('paia:archive-order-status',event=>this.navigatorStatus(event.detail));
 }
 element(){return this.root;}
 emit(){document.dispatchEvent(new CustomEvent('paia:archive-order-mode',{detail:{mode:this.mode}}));}
 setConsented(consented){
  if(this.consented===consented)return;this.consented=consented;this.readEpoch++;this.loading=0;this.pendingLoad=false;
  if(consented)void this.load();
 }
 async load(){
  if(this.busy||this.loading)return;
  if(document.activeElement===this.select){this.pendingLoad=true;return;}
  const epoch=++this.readEpoch;this.loading=epoch;this.pendingLoad=false;
  try{
   const value=await this.send('PAIA_ARCHIVE_ORDER_PREFERENCE');if(epoch!==this.readEpoch)return;
   if(document.activeElement===this.select){this.pendingLoad=true;return;}
   this.failed=false;this.mode=value.mode==='source'?'source':'paia';this.select.value=this.mode;this.providerStatus=value.providers;this.describe();this.emit();
  }catch{
   if(epoch!==this.readEpoch)return;
   this.failed=true;this.status.textContent=this.mode==='paia'?copy('顺序设置暂时不可读；使用 PAIA 顺序。','Order setting is unavailable; using PAIA order.'):copy('顺序设置暂时不可读；保留上次确认的顺序。','Order setting is unavailable; keeping the last confirmed order.');
  }finally{if(this.loading===epoch)this.loading=0;}
 }
 async save(mode){
  if(this.busy||!['paia','source'].includes(mode))return;this.readEpoch++;this.loading=0;this.pendingLoad=false;const before=this.mode;this.busy=true;this.select.disabled=true;
  try{const value=await this.send('PAIA_ARCHIVE_ORDER_PREFERENCE',{mode});this.failed=false;this.mode=value.mode;this.providerStatus=value.providers;this.select.value=this.mode;this.describe();this.emit();}
  catch{this.failed=true;this.mode=before;this.select.value=before;this.status.textContent=copy('设置尚未保存，已恢复原来的顺序。','Setting was not saved; the previous order was restored.');}
  finally{this.busy=false;this.select.disabled=false;}
 }
 describe(){
  if(this.mode==='paia'){this.status.textContent=copy('使用 PAIA 稳定顺序。','Using stable PAIA order.');return;}
  if(this.providerStatus?.chatgpt?.availability==='unavailable')this.status.textContent=copy('来源顺序仅在已认证范围生效；ChatGPT 当前自动回退 PAIA。','Source order applies only to certified scopes; ChatGPT currently falls back to PAIA.');
  else this.status.textContent=copy('按可验证的来源顺序排列；不可用范围自动回退 PAIA。','Using verified source order; unavailable scopes fall back to PAIA.');
 }
 navigatorStatus(detail){
  if(this.failed||this.mode!=='source'||!detail)return;
  if(detail.pending){this.status.textContent=copy('来源位置有更新；Navigator 会在安全时机一次性应用。','Source positions changed; Navigator will apply them atomically at a safe point.');return;}
  if(detail.fallback)this.status.textContent=copy('部分来源顺序不可用，相关范围正使用 PAIA 顺序。','Some source ordering is unavailable; those scopes are using PAIA order.');
  else if(detail.effective==='source')this.status.textContent=copy('已按可验证的来源顺序排列。','Using verified source order.');
 }
}
