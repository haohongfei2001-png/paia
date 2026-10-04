import test from 'node:test';
import assert from 'node:assert/strict';
import {organizeScopeReview} from '../ui/organize-review.js';
import {renderAICandidateComparison} from '../ui/ai-candidate.js';
import {mountOrganizeScopeWorkspace,ORGANIZE_PREVIEW_STATES} from '../ui/organize-scope-workspace.js';

// Only presentation and ownership contracts belong in this DOM double. Pixel,
// reflow, focus and native disclosure behavior are verified in the page harness.
class Node {
 constructor(tag){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.className='';this.text='';this.attributes={};this.open=false;this.listeners={};}
 set textContent(value){this.text=String(value);this.replaceChildren();}
 get textContent(){return this.text+this.children.map(node=>node.textContent).join('');}
 set innerHTML(_value){throw Error('Scope labels must remain literal text');}
 get ownerDocument(){return document;}
 prepend(...nodes){for(const node of [...nodes].reverse()){node.remove();node.parentElement=this;this.children.unshift(node);}}
 addEventListener(type,run){(this.listeners[type]??=[]).push(run);}
 contains(node){return all(this).includes(node);}
 append(...nodes){for(const node of nodes){node.remove();node.parentElement=this;this.children.push(node);}}
 replaceChildren(...nodes){for(const node of this.children)node.parentElement=null;this.children=[];this.append(...nodes);}
 before(...nodes){const parent=this.parentElement;for(const node of nodes){node.remove();node.parentElement=parent;parent.children.splice(parent.children.indexOf(this),0,node);}}
 remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(node=>node!==this);this.parentElement=null;}
 setAttribute(name,value){this.attributes[name]=value;}
 getAttribute(name){return this.attributes[name]??null;}
 get isConnected(){return this===document.body||this.parentElement?.isConnected===true;}
 closest(){return this.tagName==='DIALOG'||this.getAttribute('role')==='dialog'||this.getAttribute('aria-modal')==='true'?this:this.parentElement?.closest()||null;}
 querySelectorAll(selector){return all(this).slice(1).filter(node=>selector.startsWith('.')?node.className.split(' ').includes(selector.slice(1)):selector.startsWith('[data-')?Object.hasOwn(node.dataset,selector.slice(6,-1).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())):node.tagName===selector.toUpperCase());}
 querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
}
const all=node=>[node,...node.children.flatMap(all)];
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const scope=changes=>freeze({scopeBinding:'synthetic-exact-binding',topicName:'SYNTHETIC 职业方向',provider:'DeepSeek',model:'deepseek-chat',intendedCount:160,eligibleCount:150,excludedCount:6,unavailableCount:4,batchCount:8,remainingCount:142,newCount:5,changedCount:2,removedCount:1,timeRange:{from:'2021-02-03T12:00:00Z',to:'2026-09-30T15:00:00Z',unknownCount:3},maxRequests:1,contentBytes:8192,requestBytes:9456,budget:{usedRequests:2,dailyLimit:10,remainingRequests:8},...changes});
const expected=[
 '“SYNTHETIC 职业方向” · DeepSeek / deepseek-chat',
 '主题共有 160 段材料：150 段可用，6 段已排除，4 段暂不可核对。',
 '本次发送 8 段；另有 142 段待后续明确确认。新材料 5 段，修改 2 段，移除 1 段。',
 '有可靠表达日期的范围：2021-02-03 至 2026-09-30；3 段日期未知。',
 '最多 1 次请求 · 材料 8192 字节 · 请求约 9456 字节。本次只处理一个有限批次，不代表整个主题已整理。',
 '今日已用 2 / 10 次；剩余 8 次。提供方可能计费，本页不估算金额。',
 '确认后才发送本次材料；已有整理作为上下文时也会交给该提供方。结果只形成候选，原话和当前稿不会自动改变。后续批次与付费重试都需要重新确认。'
];
function withDOM(run){
 const keys=['document','chrome','fetch'],prior=new Map(keys.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)])),created=[];
 const forbidden=()=>{throw Error('Scope presentation cannot send, persist or grant permission');};
 globalThis.document={body:new Node('body'),documentElement:{lang:'zh-CN'},createTextNode:text=>{const node=new Node('#text');node.textContent=text;return node;},createElement:tag=>{const node=new Node(tag);created.push(node);return node;}};
 globalThis.chrome={runtime:{sendMessage:forbidden},storage:{local:{set:forbidden}},permissions:{request:forbidden}};globalThis.fetch=forbidden;
 const host=document.createElement('section');document.body.append(host);
 try{return run({host,created});}finally{for(const [key,descriptor]of prior){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
}

test('O01 default scope renderer preserves the exact production modal disclosure',()=>withDOM(()=>{
 const panel=organizeScopeReview(scope());
 assert.equal(panel.dataset.organizeScope,'true');assert.equal(panel.dataset.scopeBinding,'synthetic-exact-binding');
 assert.deepEqual(panel.children.map(node=>node.textContent),expected);
 assert.equal(all(panel).some(node=>['DETAILS','BUTTON','FORM','DIALOG'].includes(node.tagName)),false);
}));

test('O01 workspace mounts one ordinary surface using the same seven disclosure nodes',()=>withDOM(({host,created})=>{
 const source=scope(),before=structuredClone(source),view=mountOrganizeScopeWorkspace({host,scope:source,previewOnly:true});
 assert.equal(view.root.parentElement,host);assert.equal(view.root.tagName,'ARTICLE');assert.equal(view.root.getAttribute('role'),null);assert.equal(view.root.getAttribute('aria-modal'),null);
 assert.equal(view.heading.textContent,'整理这些表达');assert.match(view.root.textContent,/AI 可以改变组织，不能替你改写立场/);assert.equal(view.root.querySelector('.organize-scope-topic').textContent,'SYNTHETIC 职业方向');
 assert.equal(view.root.getAttribute('aria-labelledby'),view.heading.id);
 assert.equal(view.review.dataset.scopeBinding,source.scopeBinding);assert.equal(view.details.tagName,'DETAILS');assert.equal(view.details.open,false);
 const paragraphs=view.details.children.filter(node=>node.tagName==='P');assert.deepEqual(paragraphs.map(node=>node.textContent),expected);
 for(const node of paragraphs){assert.equal(created.filter(candidate=>candidate.tagName==='P'&&candidate.textContent===node.textContent).length,1,'each fact has exactly one original node');assert.equal(created.find(candidate=>candidate.textContent===node.textContent),node);}
 assert.equal(all(view.root).filter(node=>node.dataset.organizeScope==='true').length,1);assert.deepEqual(source,before);
}));

test('O01 preview Start and unwired Cancel cannot send or create approval state',()=>withDOM(({host})=>{
 const view=mountOrganizeScopeWorkspace({host,scope:scope(),previewOnly:true});
 for(const button of [view.start,view.cancel]){assert.equal(button.disabled,true);assert.equal(button.type,'button');assert.ok(button.getAttribute('aria-describedby'));assert.equal(button.onclick,undefined);}
 assert.equal(all(view.root).some(node=>['FORM','INPUT','SELECT','DIALOG'].includes(node.tagName)),false);
 assert.match(view.root.textContent,/开始与返回尚未接通/);assert.match(view.root.textContent,/不会发送材料、保存结果或申请权限/);
 const children=view.review.children;assert.ok(children.indexOf(view.details)<children.indexOf(view.start.parentElement),'exact disclosure remains reachable before the held action row');
}));

test('O01 explicitly supplied safe return works and is inert after disposal',()=>withDOM(({host})=>{
 let returns=0;const sibling=document.createElement('p');host.append(sibling);
 const view=mountOrganizeScopeWorkspace({host,scope:scope(),previewOnly:true,onCancel:()=>returns++}),cancel=view.cancel.onclick;
 assert.equal(view.cancel.disabled,false);cancel();assert.equal(returns,1);assert.equal(view.start.disabled,true);
 view.dispose();view.dispose();cancel();assert.equal(returns,1);assert.equal(view.root.isConnected,false);assert.deepEqual(host.children,[sibling]);
}));

test('O01 workspace refuses absent opt-in and detached or modal hosts before changing them',()=>withDOM(({host})=>{
 for(const previewOnly of [undefined,false,'true'])assert.throws(()=>mountOrganizeScopeWorkspace({host,scope:scope(),previewOnly}),TypeError);
 const detached=document.createElement('section'),dialog=document.createElement('dialog'),dialogHost=document.createElement('div');document.body.append(dialog);dialog.append(dialogHost);
 const modal=document.createElement('section');modal.setAttribute('aria-modal','true');document.body.append(modal);
 for(const target of [null,detached,dialog,dialogHost,modal])assert.throws(()=>mountOrganizeScopeWorkspace({host:target,scope:scope(),previewOnly:true}),TypeError);
 assert.equal(host.children.length,0);assert.equal(dialogHost.children.length,0);assert.equal(modal.children.length,0);
}));

test('O01 blocked and unknown-date disclosure stays truthful and visible before Start',()=>withDOM(({host})=>{
 for(const [blockedReason,expectedReason]of [['NO_DELTA','目前没有待整理的新变化。'],['HOST_PERMISSION_NOT_GRANTED','本次尚不能开始：Chrome 尚未授予 DeepSeek 网络权限。没有发送请求。']]){
  const view=mountOrganizeScopeWorkspace({host,scope:scope({blockedReason,batchCount:0,timeRange:{from:null,to:null,unknownCount:150},budget:{usedRequests:10,dailyLimit:10,remainingRequests:0}}),previewOnly:true});
  const blocked=view.review.querySelector('.organize-scope-blocked'),children=view.review.children;
  assert.equal(blocked.textContent,expectedReason);assert.equal(blocked.getAttribute('role'),'status');assert.ok(children.indexOf(blocked)<children.indexOf(view.start.parentElement));
  assert.ok(view.start.getAttribute('aria-describedby').includes(blocked.id));assert.equal(view.start.disabled,true);
  assert.match(view.details.textContent,/表达日期未知：150 段，不使用收录时间代替。/);assert.match(view.details.textContent,/今日已用 10 \/ 10 次；剩余 0 次/);view.dispose();
 }
}));

test('O01 one remaining delta batch never implies that the complete topic is being sent',()=>withDOM(({host})=>{
 const view=mountOrganizeScopeWorkspace({host,scope:scope({remainingCount:0}),previewOnly:true});
 assert.equal(view.review.querySelector('.organize-scope-materials').textContent,'本批 8 段当前可用材料，不是完整主题。被禁止用于 AI 的内容不参与。');
 assert.equal(view.review.querySelector('.organize-scope-service').textContent,'处理服务：DeepSeek / deepseek-chat；本地预览不发起请求。');
}));

test('O01 renders hostile and long source labels only as text',()=>withDOM(({host})=>{
 const topicName='<img src=x onerror=alert(1)> '+'SYNTHETIC 长主题 '.repeat(80),provider='<script>synthetic</script>',model='model/<b>literal</b>';
 const view=mountOrganizeScopeWorkspace({host,scope:scope({topicName,provider,model}),previewOnly:true});
 assert.equal(view.root.querySelector('.organize-scope-topic').textContent,topicName);
 assert.equal(view.details.children[1].textContent,`“${topicName}” · ${provider} / ${model}`);
 assert.equal(all(view.root).some(node=>['IMG','SCRIPT','B'].includes(node.tagName)),false);
}));


const previewModel=()=>{
 const fields=['blockSummary','currentView','keyInformation','preferences','decisions','judgments','openQuestions','possibleEvolution'],proposal={evidenceEntryIds:['source-1']};
 for(const field of fields)proposal[field]=field==='blockSummary'||field==='currentView'?'SYNTHETIC AI candidate '+field:[{text:'SYNTHETIC AI candidate '+field,evidenceEntryIds:['source-1']}];
 const candidate={baseKind:'saved',changedFields:fields.slice(0,2),proposal};
 return freeze({candidate,current:{blockSummary:'SYNTHETIC saved summary',currentView:'SYNTHETIC saved view'},firstCandidate:{...candidate,baseKind:'none'},manyCandidate:{...candidate,changedFields:fields},choices:{blockSummary:'adopt',currentView:'keep'},materials:[{id:'source-1',meta:'表达时间未知',body:'SYNTHETIC exact source\n  whitespace stays.'}]});
};
for(const stage of Object.keys(ORGANIZE_PREVIEW_STATES))test(`O01–O09 ${stage} is explicit, inert and immutable`,()=>withDOM(({host})=>{
 const model=previewModel(),before=structuredClone(model),view=mountOrganizeScopeWorkspace({host,scope:scope(),previewOnly:true,stage,model});
 assert.equal(view.root.dataset.organizeState,stage);assert.equal(view.root.dataset.previewOnly,'true');assert.match(view.root.textContent,/外观预览/);
 for(const node of all(view.root).filter(node=>['BUTTON','INPUT'].includes(node.tagName)))assert.equal(node.disabled,true,node.textContent);
 assert.deepEqual(model,before);
 if(stage==='first'){assert.match(view.root.textContent,/还没有已保存的 AI 整理/);assert.match(view.root.textContent,/用户原话依据/);assert.match(view.root.textContent,/SYNTHETIC exact source\n  whitespace stays/);assert.doesNotMatch(view.root.textContent,/SYNTHETIC saved/);assert.match(view.root.textContent,/不采用/);}
 if(stage==='many'){assert.equal(all(view.root).filter(node=>node.dataset.aiCandidateField).length,8);assert.match(view.root.textContent,/0 \/ 8 已决定/);}
 if(stage==='decisions')assert.match(view.root.textContent,/2 \/ 2 已决定/);
 if(stage==='scope'){assert.match(view.root.textContent,/未核定为本次发送批次/);assert.match(view.root.textContent,/SYNTHETIC exact source/);}
 view.dispose();assert.equal(view.setStage('scope'),false);assert.equal(view.root.isConnected,false);
}));

test('later preview states never invent an absent candidate or saved Current',()=>withDOM(({host})=>{
 const view=mountOrganizeScopeWorkspace({host,scope:scope(),previewOnly:true});
 for(const stage of ['ready','compare','decisions','stale','many','first']){view.setStage(stage);assert.match(view.root.textContent,/尚无可展示的候选快照/);assert.equal(all(view.root).filter(node=>node.dataset.aiCandidate).length,0);}
 assert.throws(()=>view.setStage('unknown'),RangeError);
}));

test('preview-only candidate controls and IDs cannot affect the default real renderer',()=>withDOM(({host})=>{
 const model=previewModel(),real=document.createElement('section'),preview=document.createElement('section');host.append(real,preview);let writes=0;
 const args={candidate:model.candidate,current:model.current,choices:{blockSummary:'keep'},onChoice:()=>writes++,onSave:()=>writes++};
 const original=renderAICandidateComparison(real,args),originalText=original.textContent;
 const shown=renderAICandidateComparison(preview,{...args,choices:model.choices,presentationOnly:true,evidence:model.materials});
 assert.equal(original.textContent,originalText);assert.equal(writes,0);
 const realRadios=all(original).filter(node=>node.tagName==='INPUT'),previewRadios=all(shown).filter(node=>node.tagName==='INPUT');
 assert.equal(realRadios.every(node=>node.disabled===false),true);assert.equal(previewRadios.every(node=>node.disabled===true),true);
 for(const radio of previewRadios){assert.equal(realRadios.some(node=>node.name===radio.name),false);assert.equal(radio.listeners.change,undefined);}
 assert.equal(original.querySelector('.ai-candidate-field').getAttribute('aria-labelledby'),'ai-candidate-blockSummary');
 assert.notEqual(shown.querySelector('.ai-candidate-field').getAttribute('aria-labelledby'),'ai-candidate-blockSummary');
 assert.match(originalText,/AI整理更新/);assert.match(originalText,/采用这段/);assert.match(originalText,/更新候选/);
}));


test('forced preview control events remain inert after disposal',async()=>{
 let writes=0;
 await withDOM(async({host})=>{
  const model=previewModel(),panel=renderAICandidateComparison(host,{candidate:model.candidate,current:model.current,choices:model.choices,presentationOnly:true,onChoice:()=>writes++,onSave:()=>writes++,onRefresh:()=>writes++});
  for(const node of all(panel))for(const handler of [...(node.listeners.click||[]),...(node.listeners.change||[])])handler();
  panel.remove();await Promise.resolve();await Promise.resolve();assert.equal(writes,0);
 });
});
