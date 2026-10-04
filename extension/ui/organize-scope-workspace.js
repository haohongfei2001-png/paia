import {element} from './common.js';
import {organizeScopeReview} from './organize-review.js';

let instance=0;

// An ordinary workspace presentation of the existing scope disclosure. Its
// owner supplies a read-only scope and an optional safe return action. The
// production modal remains the only request/approval owner in this preview.
export function mountOrganizeScopeWorkspace({host,scope,previewOnly=false,onCancel}={}){
 if(previewOnly!==true||!host?.isConnected||typeof host.append!=='function'||host.closest('dialog,[role="dialog"],[aria-modal="true"]'))throw new TypeError('An attached ordinary workspace and explicit previewOnly are required');
 const root=element('article','organize-scope-workspace');root.dataset.organizeScopeWorkspace='true';root.dataset.previewOnly='true';
 const prefix=`organize-scope-workspace-${++instance}`,heading=element('h1','organize-scope-title','本次整理哪些材料？');heading.id=prefix+'-title';heading.tabIndex=-1;root.setAttribute('aria-labelledby',heading.id);
 const eyebrow=element('p','organize-scope-eyebrow','AI 整理 · 当前稿未改变'),subtitle=element('p','organize-scope-subtitle','AI 可以改变组织，但不能替你改变原意。'),topic=element('h2','organize-scope-topic',scope.topicName);
 const review=organizeScopeReview(scope,{workspace:true,previewOnly:true}),details=review.querySelector('.organize-scope-details'),actions=element('div','organize-scope-actions');
 const start=element('button','organize-scope-start','确认本次外部整理');start.type='button';start.disabled=true;
 const cancel=element('button','organize-scope-cancel','取消');cancel.type='button';cancel.disabled=typeof onCancel!=='function';
 const notice=element('p','organize-scope-preview-note',cancel.disabled?'外观预览：开始与返回尚未接通。此页不会发送材料、保存结果或申请权限。':'外观预览：开始整理尚未接通。此页不会发送材料、保存结果或申请权限。');notice.id=prefix+'-notice';start.setAttribute('aria-describedby',notice.id);if(cancel.disabled)cancel.setAttribute('aria-describedby',notice.id);
 actions.append(start,cancel);details.before(actions,notice);
 const blocked=review.querySelector('.organize-scope-blocked');if(blocked){blocked.id=prefix+'-blocked';blocked.setAttribute('role','status');actions.before(blocked);start.setAttribute('aria-describedby',`${blocked.id} ${notice.id}`);}
 root.append(eyebrow,heading,subtitle,topic,review);host.append(root);
 let active=true;
 if(!cancel.disabled)cancel.onclick=()=>{if(active&&root.isConnected)onCancel();};
 return {root,review,heading,start,cancel,details,dispose(){active=false;cancel.onclick=null;root.remove();}};
}
