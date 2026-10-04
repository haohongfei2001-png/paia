import {element} from './common.js';
import {organizeScopeReview} from './organize-review.js';
import {renderAICandidateComparison} from './ai-candidate.js';

let instance=0;
export const ORGANIZE_PREVIEW_STATES=Object.freeze({scope:'整理范围',running:'正在整理',ready:'候选待核对',compare:'逐项比较',decisions:'已选择',stale:'材料已变化',many:'多处变化',first:'首次候选',failed:'请求未完成'});
const button=(label,className='')=>{const node=element('button',className,label);node.type='button';node.disabled=true;return node;};

// One ordinary, read-only presentation. It never owns a request, authorization,
// review decision or saved result. The unchanged Topic/ReviewSession owns those.
// Later states require an explicitly supplied snapshot; absent output stays absent.
export function mountOrganizeScopeWorkspace({host,scope,previewOnly=false,onCancel,stage='scope',model={}}={}){
 if(previewOnly!==true||!host?.isConnected||typeof host.append!=='function'||host.closest('dialog,[role="dialog"],[aria-modal="true"]'))throw new TypeError('An attached ordinary workspace and explicit previewOnly are required');
 const root=element('article','organize-scope-workspace');root.dataset.organizeScopeWorkspace='true';root.dataset.previewOnly='true';
 const prefix=`organize-scope-workspace-${++instance}`,heading=element('h1','organize-scope-title');heading.id=prefix+'-title';heading.tabIndex=-1;root.setAttribute('aria-labelledby',heading.id);
 const subtitle=element('p','organize-scope-subtitle','AI 可以改变组织，不能替你改写立场。'),content=element('div','organize-state-content'),notice=element('p','organize-scope-preview-note');notice.id=prefix+'-notice';
 root.append(heading,subtitle,notice,content);host.append(root);
 const snapshot=structuredClone(model),view={root,heading,review:null,start:null,cancel:null,details:null,setStage,dispose(){active=false;root.remove();}};let active=true;
 function originals(title){
  const section=element('section','organize-originals');section.append(element('h2','',title));
  const materials=Array.isArray(snapshot.materials)?snapshot.materials:[];
  if(!materials.length)section.append(element('p','organize-empty','尚未载入可展示的原话；这不表示主题为空。'));
  for(const item of materials){const row=element('section','organize-original');row.append(element('p','organize-original-date',typeof item.meta==='string'?item.meta:'表达时间未知'),element('p','entry-prose',typeof item.body==='string'?item.body:''));section.append(row);}
  return section;
 }
 function status(title,detail,action,warning=false){const panel=element('section','organize-state-notice');panel.dataset.tone=warning?'warning':'quiet';panel.setAttribute('role','status');panel.append(element('p','',title),element('p','',detail));if(action)panel.append(button(action));content.append(panel);}
 function setStage(value){
  if(!active)return false;if(!Object.hasOwn(ORGANIZE_PREVIEW_STATES,value))throw new RangeError('Unknown Organize preview state');
  root.dataset.organizeState=value;content.replaceChildren();view.review=view.start=view.cancel=view.details=null;
  const comparison=['ready','compare','decisions','stale','many','first'].includes(value);heading.textContent=comparison?'这还是你的意思吗？':'整理这些表达';
  notice.textContent=value==='scope'?'外观预览：开始与返回尚未接通。此页不会发送材料、保存结果或申请权限。':'状态外观预览：下面仅展示界面，不代表请求已运行、候选已生成或选择已保存。所有操作均未接通。';
  if(value==='scope'){
   const review=organizeScopeReview(scope,{workspace:true,previewOnly:true}),details=review.querySelector('.organize-scope-details'),facts=element('dl','organize-scope-facts');
   for(const [label,text]of [['当前主题',scope.topicName],['本次处理',`${scope.batchCount} 段表达 · 当前一批`],['另待确认',`${scope.remainingCount} 段 · 没有被当作已完成`],['处理服务',`${scope.provider} / ${scope.model} · 预览不会请求`]]){facts.append(element('dt','',label),element('dd',label==='当前主题'?'organize-scope-topic':'',text));}
   review.prepend(element('h2','organize-scope-section-title','先核对本次范围'),facts);
   const materials=originals('当前已载入的原话');materials.append(element('p','organize-material-boundary','这里只展示当前阅读窗口，未核定为本次发送批次。完整范围以上方明细为准。'));
   const actions=element('div','organize-scope-actions'),start=button('开始整理','organize-scope-start'),cancel=button('取消','organize-scope-cancel');cancel.disabled=typeof onCancel!=='function';
   if(!cancel.disabled)cancel.onclick=()=>{if(active&&root.isConnected)onCancel();};
   start.setAttribute('aria-describedby',notice.id);if(cancel.disabled)cancel.setAttribute('aria-describedby',notice.id);
   actions.append(element('span','organize-footer-note','不修改档案或人类思想原文'),cancel,start);review.append(materials,actions);content.append(review);
   const blocked=review.querySelector('.organize-scope-blocked');if(blocked){blocked.id=prefix+'-blocked';blocked.setAttribute('role','status');actions.before(blocked);start.setAttribute('aria-describedby',`${blocked.id} ${notice.id}`);}
   Object.assign(view,{review,details,start,cancel});
  }else if(value==='running'){
   status('正在整理这一批表达','原话和已保存的整理保持可读。结果返回后，将先进入核对。','停止本次整理');content.append(originals('原话仍在这里'));
  }else if(value==='failed'){
   const failure=element('section','organize-failure');failure.append(element('h2','','本次整理未完成'),element('p','','之前的原话和已保存的整理没有改变。不会自动重新请求。'),button('重新核对范围'));content.append(failure);
  }else{
   const candidate=value==='first'?snapshot.firstCandidate:value==='many'?snapshot.manyCandidate:snapshot.candidate,current=value==='first'?null:snapshot.current;
   if(!candidate){content.append(element('p','organize-empty','尚无可展示的候选快照。这里不会虚构 AI 输出或已保存的当前稿。'));return value;}
   if(value==='first'&&candidate.baseKind!=='none')throw new TypeError('First-generation preview requires an explicit no-Current candidate');
   if(candidate.baseKind==='none')status('还没有已保存的 AI 整理','这是首次候选。全部不采用，将不会创建 AI 当前稿。');
   else if(value==='ready')status('候选已准备好，当前稿未改变','逐处核对后再保存。未决定的变化不会自动采用。');
   else if(value==='stale')status('材料变化了，这份候选需要重新核对','旧选择仅供参考，不能提交到新的材料版本。','返回原话',true);
   else content.append(element('p','organize-comparison-caption',`当前稿尚未改变 · ${candidate.changedFields?.length||0} 个字段待核对`));
   const host=element('div','organize-comparison');content.append(host);
   renderAICandidateComparison(host,{candidate:{...candidate,stale:value==='stale'||!!candidate.stale},current,choices:['decisions','stale'].includes(value)?snapshot.choices||{}:value==='many'?snapshot.manyChoices||{}:{},presentationOnly:true,evidence:snapshot.materials||[]});
  }
  return value;
 }
 setStage(stage);return view;
}
