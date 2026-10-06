import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {BackupPanel} from '../ui/backup.js';
import {PresentationNode} from './harness/presentation-dom.mjs';

class Node extends PresentationNode {
 constructor(registry,tag='div',namespaceURI){super(tag,namespaceURI);this.registry=registry;this.checked=false;this.disabled=false;}
 append(...nodes){super.append(...nodes);for(const node of nodes)if(node.id)this.registry?.set(node.id,node);}
 prepend(...nodes){super.prepend(...nodes);for(const node of nodes)if(node.id)this.registry?.set(node.id,node);}
 getAttribute(name){return this.attributes.get(name);}
}
async function withDOM(run){
 const names=['document','navigator','chrome'],prior=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)])),nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,new Node(nodes));return nodes.get(id);};
 Object.defineProperty(globalThis,'document',{configurable:true,writable:true,value:{documentElement:{lang:'zh-CN'},createElement:tag=>new Node(nodes,tag),createElementNS:(namespace,tag)=>new Node(nodes,tag,namespace),addEventListener(){},getElementById:get}});
 Object.defineProperty(globalThis,'navigator',{configurable:true,writable:true,value:{language:'zh-CN'}});
 Object.defineProperty(globalThis,'chrome',{configurable:true,writable:true,value:new Proxy({}, {get(){throw Error('Read-only presentation cannot access extension services');}})});
 try{await run({get,nodes});}finally{for(const [name,descriptor]of prior)if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}
}

test('S03 keeps successful metadata quiet, shows genuine errors and makes no completeness claim',()=>withDOM(async({get})=>{
 const {presentSettingsStatus}=await import('../ui/settings-preferences.js');
 const empty={settings:{consentVersion:1,enabled:true},diagnostics:{lastSuccessAt:null,lastScanAt:null}};
 const before=structuredClone(empty);presentSettingsStatus(empty);assert.equal(get('ux-capture-last').textContent,'');assert.equal(get('ux-capture-last').hidden,true);assert.equal(get('ux-capture-health').hidden,true);assert.deepEqual(empty,before);
 const paused={settings:{consentVersion:1,enabled:false},diagnostics:{lastSuccessAt:'2026-01-02T03:04:05.000Z',lastScanAt:'2026-01-02T03:04:05.000Z',status:'CAPTURING',added:0}};
 presentSettingsStatus(paused);assert.equal(get('ux-capture-last').textContent,'最近检查：'+new Date(paused.diagnostics.lastSuccessAt).toLocaleString('zh-CN'));assert.equal(get('ux-capture-health').hidden,true);assert.doesNotMatch(get('ux-capture-last').textContent,/新增|完整历史|成功扫描/);
 paused.settings.enabled=true;presentSettingsStatus(paused);assert.equal(get('ux-capture-health').hidden,true,'old successful scans are not fabricated failures');paused.diagnostics.lastSuccessAt='invalid';presentSettingsStatus(paused);assert.equal(get('ux-capture-last').hidden,true);
 for(const [status,message]of [['STORAGE_FAILED',/保存失败/],['STORAGE_FULL',/空间不足/],['ADAPTER_MISMATCH',/页面结构不匹配/]]){
  paused.diagnostics.status=status;presentSettingsStatus(paused);assert.equal(get('ux-capture-health').hidden,false);assert.match(get('ux-capture-health').textContent,message);
 }
}));

test('S05 is driven only by rejected backup inspection; cancellation clears it and no restore is attempted',()=>withDOM(async({get})=>{
 const calls=[];globalThis.chrome={runtime:{async sendMessage(message){calls.push(message);return {ok:true,data:message.type==='PAIA_BACKUP_BEGIN_RESTORE'?{sessionId:'synthetic-inspection'}:{}};}}};
 const panel=Object.assign(Object.create(BackupPanel.prototype),{busy:false,mode:'empty',sessionId:null});
 const file=new Blob(['{"not":"a PAIA backup"}\n']);file.name='synthetic-invalid.paia-backup';await panel.inspect([file]);
 assert.equal(get('backup-settings').dataset.inspectionFailure,'true');assert.match(get('backup-status').textContent,/未修改任何内容/);assert.equal(get('backup-restore').disabled,true);assert.equal(panel.sessionId,null);assert.equal(panel.preview,null);assert.deepEqual(calls.map(c=>c.type),['PAIA_BACKUP_BEGIN_RESTORE','PAIA_BACKUP_CANCEL']);
 await panel.cancel();assert.equal(get('backup-settings').dataset.inspectionFailure,undefined);assert.equal(get('backup-preview').hidden,true);assert.equal(get('backup-file').value,'');
 get('backup-settings').dataset.inspectionFailure='true';panel.lock(true);assert.equal(get('backup-settings').dataset.inspectionFailure,undefined,'an unrelated export start clears stale inspection projection');panel.lock(false);
 panel.status('A later restore or export failure','failed');assert.equal(get('backup-settings').dataset.inspectionFailure,undefined,'generic failed state cannot claim invalid backup');
}));

test('S05 does not mislabel storage or transport inspection failures as a rejected file',()=>withDOM(async({get})=>{
 for(const code of ['STORAGE_FAILED','STORAGE_FULL','MESSAGE_CHANNEL_INTERRUPTED','BACKUP_SESSION_EXPIRED']){
  globalThis.chrome={runtime:{sendMessage:async()=>({ok:false,error:code})}};const panel=Object.assign(Object.create(BackupPanel.prototype),{busy:false,mode:'empty',sessionId:null});const file=new Blob(['{}']);file.name='synthetic.paia-backup';await panel.inspect([file]);assert.equal(get('backup-settings').dataset.inspectionFailure,undefined,code);assert.equal(get('backup-restore').disabled,true);
 }
}));

test('New Settings copy follows active language without replacing its nodes',()=>withDOM(async()=>{
 const {syncSettingsCopy}=await import('../ui/settings-preferences.js');const first=new Node(),second=new Node();first.dataset={settingsZh:'捕获状态',settingsEn:'Capture status'};second.dataset={settingsZh:'跟随系统',settingsEn:'Follow system'};const nodes=[first,second],root={querySelectorAll:()=>nodes};
 for(const [language,expected]of [['zh-CN',['捕获状态','跟随系统']],['en',['Capture status','Follow system']],['zh-CN',['捕获状态','跟随系统']]]){navigator.language=language;syncSettingsCopy(root);assert.deepEqual(nodes.map(n=>n.textContent),expected);assert.equal(nodes[0],first);assert.equal(nodes[1],second);}
}));

test('S01 keeps legal saved sizes, six groups and actual controls; system styling cannot activate retired Context',async()=>{
 const source=await readFile(new URL('../ui/settings-preferences.js',import.meta.url),'utf8'),css=await readFile(new URL('../ui/settings-preferences.css',import.meta.url),'utf8');
 assert.match(source,/FONT_PX=\{small:16,standard:17,large:19,xlarge:21\}/);assert.match(source,/WIDTH_PX=\{narrow:640,standard:680,wide:720\}/);assert.match(source,/for\(const \[key,zh\] of SETTINGS_GROUPS\)/);assert.match(source,/move\('history-settings','data'\)/);assert.doesNotMatch(source,/savePreference\('(?:reducedMotion|motion)'/);assert.match(css,/\.reader-confirm:has\(\.reader-conflict-comparison\)/);assert.doesNotMatch(source,/PAIA_RECOVERY_DRAFT|PAIA_BACKUP_RESTORE|SAVE_DEEPSEEK_CREDENTIAL|AUTHORIZE/);
});

test('S05 uses one existing picker and cancellation owner, with local-only presentation and explicit return focus',()=>withDOM(async({get})=>{
 const panel=Object.assign(Object.create(BackupPanel.prototype),{busy:false,mode:'empty',sessionId:null}),choose=get('backup-choose'),host=get('backup-settings');host.append(choose,get('backup-file'),get('ux-backup-failure-title'),get('backup-status'));panel.installInspectionPresentation();
 choose.focus();panel.presentInspectionFailure(true);assert.equal(document.activeElement,choose);assert.equal(host.children[0],get('backup-failure-page-title'));assert.equal(choose.getAttribute('aria-describedby'),'ux-backup-failure-title backup-status');
 assert.equal(get('backup-choose'),choose);assert.equal(choose.textContent,'重新选择文件');assert.equal(host.getAttribute('aria-labelledby'),'backup-failure-page-title');
 assert.equal(get('backup-failure-page-title').textContent,'数据与恢复');assert.match(get('backup-failure-note').textContent,/不会自动触发外部请求/);
 get('backup-failure-return').focus();await panel.cancel();assert.equal(document.activeElement,choose);assert.equal(choose.getAttribute('aria-describedby'),undefined);assert.equal(choose.textContent,'从备份恢复');assert.equal(host.getAttribute('aria-labelledby'),'r6-backup-heading');
 panel.presentInspectionFailure(true);get('backup-failure-return').focus();get('settings-panel').hidden=true;await panel.cancel();assert.equal(document.activeElement,get('backup-failure-return'),'a hidden Settings owner never steals focus');
 get('settings-panel').hidden=false;get('ux-settings-data-group').hidden=true;panel.presentInspectionFailure(true);await panel.cancel();assert.equal(document.activeElement,get('backup-failure-return'),'another Settings group keeps its focus');
 document.documentElement.lang='en';panel.presentInspectionFailure(true);assert.equal(choose.textContent,'Choose another file');panel.presentInspectionFailure(false);assert.equal(choose.textContent,'Restore from backup');
 panel.pickerDescription='original-help';panel.presentInspectionFailure(true);assert.equal(choose.getAttribute('aria-describedby'),'original-help ux-backup-failure-title backup-status');panel.presentInspectionFailure(false);assert.equal(choose.getAttribute('aria-describedby'),'original-help');
}));

test('S05 retains all five inspection rejection reasons; an empty chooser result preserves the current failure',()=>withDOM(async({get})=>{
 for(const code of ['BACKUP_INVALID','BACKUP_VERSION_UNSUPPORTED','BACKUP_INTEGRITY_FAILED','BACKUP_INCOMPLETE','BACKUP_TOO_LARGE']){
  const calls=[];globalThis.chrome={runtime:{sendMessage:async message=>{calls.push(message.type);return {ok:false,error:code};}}};
  const panel=Object.assign(Object.create(BackupPanel.prototype),{busy:false,mode:'empty',sessionId:null});const file=new Blob(['{}']);file.name='synthetic.paia-backup';await panel.inspect([file]);
  assert.equal(get('backup-settings').dataset.inspectionFailure,'true',code);assert.equal(get('backup-choose').textContent,'重新选择文件');assert.equal(get('backup-failure-return').disabled,false);assert.equal(get('backup-restore').disabled,true);
  const status=get('backup-status').textContent;await panel.inspect([]);assert.equal(get('backup-status').textContent,status);assert.equal(get('backup-settings').dataset.inspectionFailure,'true');assert.deepEqual(calls,['PAIA_BACKUP_BEGIN_RESTORE']);
 }
}));

test('S05 late inspection rejection does not move navigation or focus after leaving Data',()=>withDOM(async({get})=>{
 let reject;globalThis.chrome={runtime:{sendMessage:()=>new Promise(resolve=>{reject=()=>resolve({ok:false,error:'BACKUP_INVALID'});})}};
 const panel=Object.assign(Object.create(BackupPanel.prototype),{busy:false,mode:'empty',sessionId:null});const file=new Blob(['{}']);file.name='synthetic.paia-backup';const pending=panel.inspect([file]);
 await Promise.resolve();get('settings-panel').hidden=true;get('ux-settings-data-group').hidden=true;const library=get('primary-library');library.focus();reject();await pending;
 assert.equal(document.activeElement,library);assert.equal(get('settings-panel').hidden,true);assert.equal(get('ux-settings-data-group').hidden,true);assert.equal(get('backup-settings').dataset.inspectionFailure,'true');
 const css=await readFile(new URL('../ui/settings-preferences.css',import.meta.url),'utf8');assert.match(css,/#ux-settings-data-group:not\(\[hidden\]\)>#backup-settings\[data-inspection-failure\]/);assert.doesNotMatch(css,/#backup-settings\[data-inspection-failure\][^{]*\{[^}]*position:fixed/);
}));
