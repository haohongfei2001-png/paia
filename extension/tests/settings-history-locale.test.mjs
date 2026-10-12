import test from 'node:test';
import assert from 'node:assert/strict';
import {OfficialExportProvider} from '../core/import/provider.js';
import {initHistoryCompletion,historyFileTimeRangeText} from '../ui/history-completion.js';
import {historyText} from '../ui/history-copy.js';
import {PresentationNode as Node} from './harness/presentation-dom.mjs';
function fixture({tasks=[],fail=false}={}){
 const nodes=new Map(),events=new Map(),calls=[];
 const node=id=>{if(!nodes.has(id)){const n=new Node();n.showModal=()=>n.open=true;nodes.set(id,n);}return nodes.get(id);};
 globalThis.document={documentElement:{lang:'en'},getElementById:node,createElement:t=>new Node(t),addEventListener:(n,f)=>events.set(n,f)};
 globalThis.window={addEventListener(){}};
 globalThis.chrome={runtime:{connect:()=>({disconnect(){}}),sendMessage:async r=>{calls.push(r.type);if(fail)throw Error('synthetic failure');return {ok:true,data:{tasks,nextCursor:null}};}}};
 node('history-dialog').querySelectorAll=selector=>{const all=new Set();function visit(n){all.add(n);for(const c of n.children)visit(c);}for(const n of nodes.values())visit(n);return [...all].filter(n=>selector==='[data-history-copy]'?n.dataset.historyCopy!==undefined:n.dataset.historyAria!==undefined);};
 return {owner:initHistoryCompletion(),node,events,calls,switch:lang=>{document.documentElement.lang=lang;events.get('paia:preferences-applied')();}};
}
test('actual import owner opens in the resolved English locale',async()=>{const f=fixture();await f.owner.open();assert.equal(f.node('history-status').textContent,'Choose the export file to read for this import.');});
test('actual resume task locale preserves controls, consent, focus, file and preview nodes without RPC',async()=>{
 const f=fixture({tasks:[{taskId:'synthetic-task',phase:'paused',counts:{added:4,review:2}}]});await f.owner.open();const group=f.node('history-tasks').firstElementChild,button=group.firstElementChild;
 assert.equal(button.textContent,'Resume unfinished import · 4 inputs added');await button.listeners.get('click')();assert.equal(f.node('history-status').textContent,'Confirm file access again and select the original file to resume.');
 const counts=[...f.node('history-counts').children],diagnostic=f.node('history-diagnostic').textContent,file={name:'用户选择的文件.json'};f.node('history-file').files=[file];f.node('history-file-consent').checked=true;button.focus();const calls=[...f.calls];
 f.switch('zh-CN');assert.equal(button.textContent,'继续未完成的补全 · 已新增 4 条');assert.equal(f.node('history-status').textContent,'请重新同意并选择原文件，继续上次进度。');f.switch('en');
 assert.equal(button.textContent,'Resume unfinished import · 4 inputs added');assert.deepEqual(f.calls,calls);assert.equal(document.activeElement,button);assert.equal(f.node('history-file').files[0],file);assert.equal(file.name,'用户选择的文件.json');assert.equal(f.node('history-file-consent').checked,true);assert.deepEqual(f.node('history-counts').children,counts);assert.equal(f.node('history-diagnostic').textContent,diagnostic);assert.equal(f.node('history-tasks').firstElementChild,group);
});
test('actual task read error switches in place without retrying',async()=>{const f=fixture({fail:true});await f.owner.open();const error=f.node('history-error'),calls=[...f.calls];assert.equal(error.textContent,'Could not read previous progress.');f.switch('zh-CN');assert.equal(error.textContent,'暂时无法读取上次进度。');f.switch('en');assert.equal(error.textContent,'Could not read previous progress.');assert.deepEqual(f.calls,calls);});
test('phase, error, partial format and progress product copy remain truthful in both locales',()=>{
 for(const [zh,en] of [
  ['已暂停。重新选择同一文件即可继续。','Paused. Select the same file again to continue.'],
  ['已补全可识别的内容，部分输入需要确认。','Recognized content was imported. Some inputs need review.'],
  ['本次处理未完成，已完成的部分仍保留。','This import did not finish. Completed work is retained.'],
  ['这不是上次选择的文件。请重新选择原文件，或另开一次补全。','This is not the previously selected file. Select the original file or start a separate import.'],
  ['正在补全历史输入… 已处理 4 / 10 条。','Importing past inputs… Processed 4 / 10 inputs.'],
  ['JSON · ChatGPT · 0.1 MB · 已识别可处理的部分内容 · 3 个窗口 · 6 条用户文字 · 2 条发送时间未知 · 跳过不支持的 1 个窗口 / 2 条内容 · 补全 3 条已有来源信息','JSON · ChatGPT · 0.1 MB · Recognized supported content · 3 conversations · 6 user inputs · 2 inputs with unknown send time · Skipped unsupported content: 1 conversations / 2 messages · Enriched 3 existing source records']
 ]){assert.equal(historyText(zh,true),en);assert.equal(historyText(zh,false),zh);}
 assert.equal(historyText('用户正文和文件名.json',true),'用户正文和文件名.json');
});

test('temporary file time range remains truthful for known, mixed, missing and conflicting evidence',()=>{
 const r={from:'2024-01-02T00:00:00.000Z',to:'2025-12-31T23:59:59.000Z',known:4,unknown:0,conflicted:false};
 assert.equal(historyFileTimeRangeText(r),'2024.01.02–2025.12.31');assert.equal(historyText(historyFileTimeRangeText({...r,unknown:2}),true),'2024.01.02–2025.12.31 · 2 inputs with unknown send time');
 assert.equal(historyFileTimeRangeText({...r,conflicted:true,from:null,to:null}),'范围无法可靠确定');assert.equal(historyFileTimeRangeText({...r,known:0}),'发送时间未知');assert.equal(historyFileTimeRangeText(), '发送时间未知');assert.equal(historyFileTimeRangeText({...r,from:'not a date'}),'发送时间未知');
});
test('ready presentation uses real selected filename and counts; locale preserves original controls and failed preflight fences',async()=>{
 const original=OfficialExportProvider.prototype.createSession;let paint,summary={phase:'idle'},hasFile=false;const operations=[];
 OfficialExportProvider.prototype.createSession=function({onProgress}){paint=onProgress;return{get summary(){return summary;},get hasFile(){return hasFile;},async select(file,options){operations.push(['select',file.name,options.consent]);hasFile=true;},async preflight(){summary={phase:'ready',preview:{added:17,duplicates:4,review:2,ignored:3},fileTimeRange:{from:'2024-01-02T00:00:00Z',to:'2024-03-04T00:00:00Z',known:20,unknown:3,conflicted:false}};paint(summary);},async cancel(){operations.push(['cancel']);summary={phase:'cancelled'};hasFile=false;paint(summary);}};};
 try{const f=fixture();await f.owner.open();const file={name:'<real & selected>.zip'},input=f.node('history-file');input.files=[file];f.node('history-file-consent').checked=true;await input.listeners.get('change')({target:input});assert.equal(f.node('history-selected-name').textContent,file.name);assert.equal(f.node('history-dialog').dataset.importPhase,'ready');assert.equal(f.node('history-title').textContent,'Preview earlier inputs');assert.equal(f.node('history-commit').textContent,'Confirm import');assert.equal(f.node('history-commit').disabled,false);assert.equal(f.node('history-preview-added').textContent,'17');assert.equal(f.node('history-preview-existing').textContent,'4');assert.equal(f.node('history-preview-review').textContent,'2');assert.equal(f.node('history-ready-preview').hidden,false);const controls=['history-file','history-file-consent','history-choose','history-commit','history-cancel'].map(f.node),calls=[...f.calls];controls[3].focus();f.switch('zh-CN');assert.equal(f.node('history-title').textContent,'预览历史输入');assert.equal(f.node('history-commit').textContent,'确认导入');assert.deepEqual(controls,['history-file','history-file-consent','history-choose','history-commit','history-cancel'].map(f.node));assert.equal(document.activeElement,controls[3]);assert.equal(f.node('history-file').files[0],file);assert.deepEqual(f.calls,calls);assert.deepEqual(operations,[['select',file.name,true]]);summary={...summary,inspection:{skippedConversations:1,skippedMessages:2},storagePreflight:{state:'insufficient'}};paint(summary);assert.equal(f.node('history-commit').disabled,true);assert.match(f.node('history-error').textContent,/空间/);assert.equal(f.node('history-ready-issues').hidden,false);assert.match(f.node('history-ready-issues').textContent,/1 个窗口 \/ 2 条内容/);await f.node('history-cancel').listeners.get('click')();assert.equal(f.node('history-ready-preview').hidden,true);assert.equal(f.node('history-selected-name').textContent,'');assert.deepEqual(operations,[['select',file.name,true],['cancel']]);}
 finally{OfficialExportProvider.prototype.createSession=original;}
});

test('refused cancellation with released file returns to original picker without hiding the error or authorizing restore',async()=>{
 const original=OfficialExportProvider.prototype.createSession;let summary={phase:'idle'},hasFile=false,release;const held=new Promise(resolve=>release=resolve),operations=[];
 OfficialExportProvider.prototype.createSession=function({onProgress}){return{get summary(){return summary;},get hasFile(){return hasFile;},async select(){hasFile=true;},async preflight(){summary={phase:'ready',taskId:'same-task',preview:{added:3,duplicates:1,review:0},fileTimeRange:{from:'2024-01-01T00:00:00Z',to:'2024-01-01T00:00:00Z',known:4,unknown:0,conflicted:false}};onProgress(summary);},async cancel(){operations.push('cancel');hasFile=false;const {fileTimeRange,...retained}=summary;summary=retained;await held;throw Error('refused cancellation');}};};
 try{const f=fixture();await f.owner.open();const input=f.node('history-file');input.files=[{name:'selected.json'}];f.node('history-file-consent').checked=true;await input.listeners.get('change')({target:input});const cancelling=f.node('history-cancel').listeners.get('click')();assert.equal(f.node('history-ready-preview').hidden,true,'waiting for cancellation already retires the released file preview');assert.equal(f.node('history-selected-name').textContent,'');assert.equal(f.node('history-commit').disabled,true);release();await cancelling;assert.equal(f.node('history-dialog').open,true);assert.equal(f.node('history-dialog').dataset.importPhase,'awaiting_file');assert.equal(f.node('history-ready-preview').hidden,true);assert.equal(f.node('history-selected-name').textContent,'');assert.equal(f.node('history-commit').disabled,true);assert.equal(f.node('history-choose').disabled,true);assert.equal(f.node('history-file-consent').checked,false);assert.equal(summary.phase,'ready');assert.equal(summary.taskId,'same-task');assert.match(f.node('history-error').textContent,/Could not cancel/);assert.deepEqual(operations,['cancel']);}
 finally{OfficialExportProvider.prototype.createSession=original;}
});
