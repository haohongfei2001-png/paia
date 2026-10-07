import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {BACKUP_SCHEMA,BACKUP_VERSION,BACKUP_SECTIONS,validateBackupHeader} from '../core/backup-format.js';
import {BackupService} from '../core/backup-service.js';
import {BackupService as HistoricalEncoder} from './harness/historical-backup.mjs';
import {completeFixture,rows} from './harness/original-complete.mjs';

const manifest=JSON.parse(await readFile(new URL('../manifest.json',import.meta.url),'utf8'));
const packageManifest=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
const header=appVersion=>({type:'header',format:'PAIA Backup',formatVersion:BACKUP_VERSION,schemaVersion:BACKUP_SCHEMA,appVersion,createdAt:'2026-10-06T00:00:00Z',contentSections:Object.keys(BACKUP_SECTIONS)});

test('product version agrees across manifest, version name and package identity',()=>{
 assert.equal(packageManifest.version,manifest.version);
 assert.equal(/^v(\d+\.\d+\.\d+)(?:\s|$)/.exec(manifest.version_name)?.[1],manifest.version);
});

test('current compatible product version and every prior admitted minor retain strict existing-file admission',()=>{
 for(const version of ['0.7.0','0.8.1','0.9.1','0.10.0','0.11.0','0.12.1',manifest.version])assert.equal(validateBackupHeader(header(version)).appVersion,version);
 for(const version of ['0.6.0','0.14.0','1.0.0','0.13','0.13.0-extra','not-a-version'])assert.throws(()=>validateBackupHeader(header(version)),e=>e.code==='BACKUP_VERSION_UNSUPPORTED');
 assert.throws(()=>validateBackupHeader({...header(manifest.version),schemaVersion:999}),e=>e.code==='BACKUP_VERSION_UNSUPPORTED');
 assert.throws(()=>validateBackupHeader({...header(manifest.version),contentSections:[]}),e=>e.code==='BACKUP_VERSION_UNSUPPORTED');
 for(const key of ['apiKey','credentials','authorization','password','accessToken'])assert.throws(()=>validateBackupHeader({...header(manifest.version),[key]:'synthetic-forbidden'}),e=>e.code==='BACKUP_INVALID');
});

test('current-version existing-file restore preserves Source and Input while production export stays retired',async()=>{
 const source=await completeFixture(),target=await completeFixture({texts:[]}),encoder=new HistoricalEncoder(source.s,{appVersion:manifest.version});
 const start=await encoder.beginExport(),items=[start.header];
 for(let sequence=0;;sequence++){const page=await encoder.exportPage({sessionId:start.sessionId,sequence});items.push(...page.items);if(page.done)break;}
 const service=new BackupService(target.s,{appVersion:manifest.version});
 await assert.rejects(()=>service.beginExport(),e=>e.code==='FEATURE_UNAVAILABLE');
 const {sessionId}=await service.beginRestore();for(let i=0;i<items.length;i+=30)await service.stageRestore({sessionId,items:items.slice(i,i+30)});
 const preview=await service.previewRestore({sessionId});assert.equal(preview.canRestore,true);
 assert.equal((await service.restore({sessionId,confirmation:preview.integrity})).restored,true);
 assert.deepEqual((await rows(target.s,'records')).map(x=>[x.id,x.value.originalText,x.value.contentHash]),(await rows(source.s,'records')).map(x=>[x.id,x.value.originalText,x.value.contentHash]));
 assert.deepEqual((await rows(target.s,'blocks')).map(x=>[x.id,x.value.libraryText,x.value.revision]),(await rows(source.s,'blocks')).map(x=>[x.id,x.value.libraryText,x.value.revision]));
 assert.equal(source.requests.length,0);assert.equal(target.requests.length,0);
});
