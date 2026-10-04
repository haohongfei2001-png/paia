import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {BackupPanel} from '../ui/backup.js';

class Node {
 constructor(){this.dataset={};this.children=[];this.textContent='';this.hidden=false;this.value='';this.checked=false;this.disabled=false;}
 append(...nodes){this.children.push(...nodes);}
 setAttribute(){}
 addEventListener(){}
}
async function withDOM(run){
 const names=['document','navigator','chrome'],prior=new Map(names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)])),nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id);};
 Object.defineProperty(globalThis,'document',{configurable:true,writable:true,value:{documentElement:{lang:'zh-CN'},createElement:()=>new Node(),addEventListener(){},getElementById:get}});
 Object.defineProperty(globalThis,'navigator',{configurable:true,writable:true,value:{language:'zh-CN'}});
 Object.defineProperty(globalThis,'chrome',{configurable:true,writable:true,value:new Proxy({}, {get(){throw Error('Read-only presentation cannot access extension services');}})});
 try{await run({get,nodes});}finally{for(const [name,descriptor]of prior)if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}
}

test('S03 presents real successful-scan metadata without inventing capture or history completeness',()=>withDOM(async({get})=>{
 const {presentSettingsStatus}=await import('../ui/settings-preferences.js');
 const empty={settings:{consentVersion:1,enabled:true},diagnostics:{lastSuccessAt:null,lastScanAt:null}};
 const before=structuredClone(empty);presentSettingsStatus(empty);assert.match(get('ux-capture-last').textContent,/尚无成功扫描/);assert.match(get('ux-capture-health').textContent,/首次扫描/);assert.deepEqual(empty,before);
 const paused={settings:{consentVersion:1,enabled:false},diagnostics:{lastSuccessAt:'2026-01-02T03:04:05.000Z',lastScanAt:'2026-01-02T03:04:05.000Z',status:'CAPTURING',added:0}};
 presentSettingsStatus(paused);assert.equal(get('ux-capture-last').textContent,'最近一次成功扫描：'+new Date(paused.diagnostics.lastSuccessAt).toLocaleString('zh-CN'));assert.match(get('ux-capture-health').textContent,/暂停/);assert.doesNotMatch(get('ux-capture-last').textContent,/新增|完整历史/);
 paused.settings.enabled=true;presentSettingsStatus(paused);assert.match(get('ux-capture-health').textContent,/状态已过期/);paused.diagnostics.lastSuccessAt='invalid';presentSettingsStatus(paused);assert.match(get('ux-capture-last').textContent,/尚无成功扫描/);
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
 assert.match(source,/FONT_PX=\{small:16,standard:17,large:19,xlarge:21\}/);assert.match(source,/WIDTH_PX=\{narrow:640,standard:680,wide:720\}/);assert.match(source,/for\(const \[key,zh\] of SETTINGS_GROUPS\)/);assert.match(source,/importButton.addEventListener\('click',\(\)=>\$\('settings-history'\)\?\.click\(\)\)/);assert.doesNotMatch(source,/savePreference\('(?:reducedMotion|motion)'/);assert.match(css,/\.reader-confirm:has\(\.reader-conflict-comparison\)/);assert.doesNotMatch(source,/PAIA_RECOVERY_DRAFT|PAIA_BACKUP_RESTORE|SAVE_DEEPSEEK_CREDENTIAL|AUTHORIZE/);
});
