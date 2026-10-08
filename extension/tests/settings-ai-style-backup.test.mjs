import test from 'node:test';
import assert from 'node:assert/strict';
import {BackupService} from '../core/backup-service.js';
import {BackupService as HistoricalEncoder} from './harness/historical-backup.mjs';
import {completeFixture,rows} from './harness/original-complete.mjs';
import {defaults} from '../core/workspace.js';
import {readAIStyle} from '../core/ai-organize-style-preference.js';

test('strict Backup permits only optional bounded style intent and preserves all old preference constraints',async()=>{
 const service=new BackupService({});
 const validate=preferences=>service.validateReferences({items:[{section:'settings',value:{id:'preferences',preferences}}]});
 await validate(defaults());
 const base={version:1,value:'balanced',revision:1,explicit:true};
 for(const style of [base,{...base,version:2,value:'future_style'}])await validate({...defaults(),aiOrganizeStyle:style});
 for(const style of [{...base,grant:true},{...base,jobs:[]},{...base,consent:true},{...base,entitlement:'pro'},{...base,revision:-1},{...base,value:{nested:'style'}},{...base,value:'x'.repeat(65)},{...base,explicit:false}])await assert.rejects(()=>validate({...defaults(),aiOrganizeStyle:style}));
 for(const extra of [{aiEnabled:true},{unknownPreference:true},{memoryAccess:true}])await assert.rejects(()=>validate({...defaults(),...extra}));
});

for(const style of [undefined,{version:1,value:'concise',revision:6,explicit:true},{version:2,value:'future_style',revision:11,explicit:true}])test(`actual existing-file restore retains ${style?style.value:'absent legacy'} preference without activation`,async()=>{
 const source=await completeFixture({texts:['Synthetic original remains unchanged.']}),target=await completeFixture({texts:[]});
 if(style)await source.s.write(async t=>{const c=await source.s.control(t);c.preferences.aiOrganizeStyle=structuredClone(style);await source.s.saveControl(t,c);});
 const encoder=new HistoricalEncoder(source.s,{appVersion:'0.15.0'}),start=await encoder.beginExport(),items=[start.header];
 for(let sequence=0;;sequence++){const page=await encoder.exportPage({sessionId:start.sessionId,sequence});items.push(...page.items);if(page.done)break;}
 const service=new BackupService(target.s,{appVersion:'0.15.0'}),{sessionId}=await service.beginRestore();
 for(let i=0;i<items.length;i+=30)await service.stageRestore({sessionId,items:items.slice(i,i+30)});
 const preview=await service.previewRestore({sessionId});assert.equal(preview.canRestore,true,preview.reason);
 await service.restore({sessionId,confirmation:preview.integrity});
 const preferences=(await target.s.page()).preferences;assert.deepEqual(preferences.aiOrganizeStyle,style);
 assert.equal(readAIStyle(preferences).available,style?.version!==2);if(!style)assert.equal(Object.hasOwn(preferences,'aiOrganizeStyle'),false);
 assert.deepEqual((await rows(target.s,'records')).map(r=>[r.id,r.value.originalText]),(await rows(source.s,'records')).map(r=>[r.id,r.value.originalText]));
 assert.deepEqual(await rows(target.s,'organizerJobs'),[]);assert.equal(source.requests.length,0);assert.equal(target.requests.length,0);
 if(style?.version===2)await assert.rejects(()=>target.s.updatePreferences({aiOrganizeStyle:{version:1,value:'original',expectedRevision:11,expectedEpoch:'initial'}}),e=>e.code==='FEATURE_UNAVAILABLE');
});
