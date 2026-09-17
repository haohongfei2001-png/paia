import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {defaults,validatePreferences,syncWorkspace} from '../core/workspace.js';
import {normalizeUXPreferences,SETTINGS_GROUPS} from '../ui/ux-r1-state.js';
import {storageEstimateText,previewMaskClass} from '../ui/r6-settings.js';
import {completeFixture} from './harness/original-complete.mjs';
import {BackupService} from '../core/backup-service.js';
import {MemoryService} from '../core/memory/service.js';

async function exported(service){const {sessionId,header}=await service.beginExport(),items=[header];let sequence=0;for(;;){const page=await service.exportPage({sessionId,sequence:sequence++});items.push(...page.items);if(page.done)break;}return items;}
async function prepared(service,items){const {sessionId}=await service.beginRestore();for(let i=0;i<items.length;i+=30)await service.stageRestore({sessionId,items:items.slice(i,i+30)});return {sessionId,preview:await service.previewRestore({sessionId})};}

test('UX-R6 preview masking is additive, defaults off and preserves explicit old/new preference state',()=>{
 const legacy={appearance:'dark',language:'zh-CN',fontSize:'large',readingWidth:'wide',sidebarCollapsed:true},normalized=normalizeUXPreferences(legacy);
 assert.equal(normalized.hideContentPreviews,false);assert.equal(normalized.appearance,'dark');assert.equal(normalized.fontSize,'large');assert.equal(normalized.readingWidth,'wide');assert.equal(normalized.sidebarCollapsed,true);assert.equal(normalizeUXPreferences({...legacy,hideContentPreviews:true}).hideContentPreviews,true);assert.equal(defaults().hideContentPreviews,false);assert.deepEqual(validatePreferences({hideContentPreviews:true}),{hideContentPreviews:true});assert.deepEqual(validatePreferences({hideContentPreviews:false}),{hideContentPreviews:false});assert.throws(()=>validatePreferences({hideContentPreviews:'yes'}),error=>error.code==='INVALID_REQUEST');
});

test('UX-R6 old workspace preferences migrate fail-safe without changing content or existing reader settings',()=>{
 const state={preferences:{appearance:'light',timeDisplay:'date_and_seconds'},conversations:[],library:{blocks:[],documents:[]}};syncWorkspace(state);assert.equal(state.preferences.hideContentPreviews,false);assert.equal(state.preferences.appearance,'light');assert.equal(state.preferences.timeDisplay,'date_and_seconds');assert.equal(state.preferences.autoSave,true);assert.deepEqual(state.library.blocks,[]);
});

test('UX-R6 privacy preview preference survives a formal Backup round trip instead of silently reverting',async()=>{
 const source=await completeFixture({texts:[]});await source.s.updatePreferences({hideContentPreviews:true,appearance:'dark'});const items=await exported(new BackupService(source.s,{appVersion:'0.12.0'}));assert.equal(items.find(row=>row.section==='settings').value.preferences.hideContentPreviews,true);
 const target=await completeFixture({texts:[]}),service=new BackupService(target.s,{appVersion:'0.12.0'}),stage=await prepared(service,items);assert.equal(stage.preview.canRestore,true);await service.restore({sessionId:stage.sessionId,confirmation:stage.preview.integrity});const restored=(await target.s.snapshot()).preferences;assert.equal(restored.hideContentPreviews,true);assert.equal(restored.appearance,'dark');assert.equal(target.requests.length,0);
});

test('UX-R6 Backup may preserve policy history but restore always disables old external access authorization',async()=>{
 const source=await completeFixture({texts:[]}),memory=new MemoryService(source.s);await memory.ready();await memory.settings({externalAccess:true});
 const items=await exported(new BackupService(source.s,{appVersion:'0.12.0'})),portable=items.find(row=>row.section==='organizationState'&&row.value.id==='memory:config')?.value.data;assert.equal(portable?.externalAccess,true,'the file can describe the prior setting without turning it into an active restore authorization');
 const target=await completeFixture({texts:[]}),service=new BackupService(target.s,{appVersion:'0.12.0'}),stage=await prepared(service,items);assert.equal(stage.preview.canRestore,true);await service.restore({sessionId:stage.sessionId,confirmation:stage.preview.integrity});
 const restored=await target.s.run(()=>target.s.repository.transaction(false,t=>t.get('meta','memory:config'),['meta']));assert.equal(restored.externalAccess,false,'old external access permission must fail closed after restore');assert.equal(restored.localOnly,false,'restore must not invent a separate Local-only opt-in');assert.equal(target.requests.length,0);
});

test('UX-R6 Settings retains exactly the six governed groups and honest storage reporting',()=>{
 assert.deepEqual(SETTINGS_GROUPS.map(([key])=>key),['content','reading','ai','privacy','data','advanced']);assert.match(storageEstimateText({usage:10*1024*1024,quota:30*1024*1024}),/已用约 10\.0 MiB/);assert.match(storageEstimateText({usage:10*1024*1024}),/无法估计剩余空间/);assert.match(storageEstimateText({},true),/not available/i);assert.equal(previewMaskClass(true),'paia-hide-content-previews');assert.equal(previewMaskClass(false),'');
});

test('UX-R6 preview mask and data-exit copy state their real privacy boundary without hiding Reader/Thought bodies',async()=>{
 const css=await readFile(new URL('../ui/r6.css',import.meta.url),'utf8');assert.match(css,/universal-open p/);assert.match(css,/revisit-card-open p/);assert.match(css,/topic-index-row/);assert.doesNotMatch(css,/document-body/);assert.doesNotMatch(css,/library-prose/);assert.doesNotMatch(css,/original-prose/);assert.doesNotMatch(css,/#topic-body\s*\{/);
 const ui=await readFile(new URL('../ui/r6-settings.js',import.meta.url),'utf8'),shell=await readFile(new URL('../ui/core-loop.js',import.meta.url),'utf8');assert.match(ui,/not encryption|不是加密/);assert.match(shell,/Device sync is not available|未提供设备同步/);assert.match(ui,/not application-layer encrypted|未做应用层加密/);assert.match(ui,/File generated and download started|文件已生成并开始下载/);
});
