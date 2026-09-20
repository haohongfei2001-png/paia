import {request,element} from './common.js';

const copy=(zh,en)=>document.documentElement.lang==='en'?en:zh;
export class ArchiveOrderSettings{
 constructor({send=request}={}){
  this.send=send;this.mode='paia';this.busy=false;this.root=element('div','setting ux-preference-setting archive-order-setting');
  this.label=element('label','',copy('档案窗口顺序','Archive window order'));this.label.htmlFor='archive-order-mode';
  this.select=element('select');this.select.id='archive-order-mode';
  for(const [value,zh,en] of [['paia','PAIA 顺序','PAIA order'],['source','来源顺序','Source order']]){const option=element('option','',copy(zh,en));option.value=value;this.select.append(option);}
  this.status=element('p','muted',copy('默认使用 PAIA 顺序。','PAIA order is the default.'));this.status.id='archive-order-status';this.status.setAttribute('role','status');
  this.root.append(this.label,this.select,this.status);this.select.addEventListener('change',()=>void this.save(this.select.value));
  document.addEventListener('paia:archive-order-status',event=>this.navigatorStatus(event.detail));
 }
 element(){return this.root;}
 emit(){document.dispatchEvent(new CustomEvent('paia:archive-order-mode',{detail:{mode:this.mode}}));}
 async load(){
  try{const value=await this.send('PAIA_ARCHIVE_ORDER_PREFERENCE');this.mode=value.mode==='source'?'source':'paia';this.select.value=this.mode;this.providerStatus=value.providers;this.describe();this.emit();}
  catch{this.mode='paia';this.select.value='paia';this.status.textContent=copy('顺序设置暂时不可读；使用 PAIA 顺序。','Order setting is unavailable; using PAIA order.');this.emit();}
 }
 async save(mode){
  if(this.busy||!['paia','source'].includes(mode))return;const before=this.mode;this.busy=true;this.select.disabled=true;
  try{const value=await this.send('PAIA_ARCHIVE_ORDER_PREFERENCE',{mode});this.mode=value.mode;this.providerStatus=value.providers;this.select.value=this.mode;this.describe();this.emit();}
  catch{this.mode=before;this.select.value=before;this.status.textContent=copy('设置尚未保存，已恢复原来的顺序。','Setting was not saved; the previous order was restored.');}
  finally{this.busy=false;this.select.disabled=false;}
 }
 describe(){
  if(this.mode==='paia'){this.status.textContent=copy('使用 PAIA 稳定顺序。','Using stable PAIA order.');return;}
  if(this.providerStatus?.chatgpt?.availability==='unavailable')this.status.textContent=copy('来源顺序仅在已认证范围生效；ChatGPT 当前自动回退 PAIA。','Source order applies only to certified scopes; ChatGPT currently falls back to PAIA.');
  else this.status.textContent=copy('按可验证的来源顺序排列；不可用范围自动回退 PAIA。','Using verified source order; unavailable scopes fall back to PAIA.');
 }
 navigatorStatus(detail){
  if(this.mode!=='source'||!detail)return;
  if(detail.pending){this.status.textContent=copy('来源位置有更新；Navigator 会在安全时机一次性应用。','Source positions changed; Navigator will apply them atomically at a safe point.');return;}
  if(detail.fallback)this.status.textContent=copy('部分来源顺序不可用，相关范围正使用 PAIA 顺序。','Some source ordering is unavailable; those scopes are using PAIA order.');
  else if(detail.effective==='source')this.status.textContent=copy('已按可验证的来源顺序排列。','Using verified source order.');
 }
}
