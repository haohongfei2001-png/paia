import test from 'node:test';
import assert from 'node:assert/strict';
import {BackupSegmentWriter,verifyBackupSegments} from '../core/backup-segments.js';
import {backupSegmentRows} from '../ui/backup.js';
import {BackupService} from '../core/backup-service.js';
import {completeFixture,rows,meta} from './harness/original-complete.mjs';
import {exported,prepared} from './harness/backup-v081.mjs';

const named=(name,blob)=>Object.assign(new Blob([blob]),{name});

test('segmented backup keeps complete rows in bounded parts and verifies every part before restore',async()=>{
 const files=[],rows=[{type:'header'},...Array.from({length:30},(_,index)=>({
  type:'item',section:'inputs',value:{id:`input-${index}`,text:'中文 text'},
 })),{type:'footer'}];
 const writer=new BackupSegmentWriter({
  name:'PAIA-Backup-fixture',maxBytes:256,
  onSegment:async({name,blob})=>files.push(named(name,blob)),
 });
 for(const row of rows)await writer.add(row);
 const manifest=await writer.finish();
 assert.ok(files.length>2);
 assert.equal(manifest.parts.length,files.length);
 assert.ok(files.every(file=>file.size<=256));
 const ordered=await verifyBackupSegments(manifest,[...files].reverse());
 const recovered=(await Promise.all(ordered.map(file=>file.text()))).join('');
 assert.deepEqual(recovered.trimEnd().split('\n').map(JSON.parse),rows);
 assert.equal(manifest.totalBytes,Buffer.byteLength(recovered));
 await assert.rejects(()=>writer.add({type:'item'}));
});

test('a missing, altered, or duplicated part cannot be accepted',async()=>{
 const files=[];
 const writer=new BackupSegmentWriter({
  name:'PAIA-Backup-fixture',maxBytes:128,
  onSegment:async({name,blob})=>files.push(named(name,blob)),
 });
 await writer.add({type:'header'});
 for(let index=0;index<15;index++)await writer.add({type:'item',value:{id:index}});
 await writer.add({type:'footer'});
 const manifest=await writer.finish();
 assert.ok(files.length>1);
 await assert.rejects(()=>verifyBackupSegments(manifest,files.slice(1)));
 await assert.rejects(()=>verifyBackupSegments(manifest,[files[0],files[0],...files.slice(2)]));
 const original=await files[0].text();
 const damaged=named(files[0].name,new Blob(['X'+original.slice(1)]));
 await assert.rejects(()=>verifyBackupSegments(manifest,[damaged,...files.slice(1)]));
});

test('interrupted segment output never produces a completion manifest',async()=>{
 let calls=0;
 const writer=new BackupSegmentWriter({
  name:'PAIA-Backup-fixture',maxBytes:128,
  onSegment:async()=>{calls++;throw new Error('download interrupted');},
 });
 await writer.add({type:'header'});
 await assert.rejects(async()=>{
  for(let index=0;index<10;index++)await writer.add({type:'item',value:{id:index}});
 },/download interrupted/);
 assert.equal(calls,1);
 await assert.rejects(()=>writer.finish());
 await assert.rejects(()=>writer.add({type:'footer'}));
});

test('footer is required before publishing a segmented backup',async()=>{
 const writer=new BackupSegmentWriter({
  name:'PAIA-Backup-fixture',maxBytes:128,onSegment:async()=>{},
 });
 await writer.add({type:'header'});
 await assert.rejects(()=>writer.finish());
});


test('selected segment files are authenticated before any restore row is staged',async()=>{
 const files=[],rows=[{type:'header'},{type:'item',value:{id:'one'}},{type:'footer'}];
 const writer=new BackupSegmentWriter({
  name:'PAIA-Backup-fixture',maxBytes:128,
  onSegment:async({name,blob})=>files.push(named(name,blob)),
 });
 for(const row of rows)await writer.add(row);
 const manifest=await writer.finish();
 const manifestFile=named('PAIA-Backup-fixture.manifest.paia-backup',
  new Blob([JSON.stringify(manifest)]));
 const actual=[];
 for await(const row of backupSegmentRows([manifestFile,...files].reverse()))actual.push(row);
 assert.deepEqual(actual,rows);
 const damaged=named(files[0].name,new Blob(['X'+(await files[0].text()).slice(1)]));
 const iterator=backupSegmentRows([manifestFile,damaged,...files.slice(1)]);
 await assert.rejects(()=>iterator.next());
});


test('segmented transport restores the complete existing domain fixture',async()=>{
 const source=await completeFixture();
 const backup=await exported(new BackupService(source.s,{appVersion:'0.12.0'}));
 const files=[],writer=new BackupSegmentWriter({
  name:'PAIA-Backup-domain-fixture',maxBytes:4096,
  onSegment:async({name,blob})=>files.push(named(name,blob)),
 });
 for(const row of backup)await writer.add(row);
 const manifest=await writer.finish();
 const manifestFile=named('PAIA-Backup-domain-fixture.manifest.paia-backup',
  new Blob([JSON.stringify(manifest)]));
 const restoredRows=[];
 for await(const row of backupSegmentRows([manifestFile,...files].reverse()))
  restoredRows.push(row);
 assert.deepEqual(restoredRows,backup);
 const target=await completeFixture({texts:[]});
 const service=new BackupService(target.s,{appVersion:'0.12.0'});
 const stage=await prepared(service,restoredRows);
 assert.equal(stage.preview.canRestore,true);
 await service.restore({sessionId:stage.sessionId,confirmation:stage.preview.integrity});
 assert.deepEqual(await rows(target.s,'records'),await rows(source.s,'records'));
 assert.deepEqual(await rows(target.s,'provenance'),await rows(source.s,'provenance'));
});


test('derived search writes preserve backup generation while portable edits invalidate it',async()=>{
 const {s}=await completeFixture({texts:[]});
 await s.repository.transaction(true,t=>t.put('topics',{
  id:'derived-probe',name:'original',searchVersion:'old',indexedSearchVersion:'old',
 }));
 const before=(await meta(s,'backup-data-generation')).value;
 await s.repository.transaction(true,async t=>{
  const row=await t.get('topics','derived-probe');
  row.searchVersion='new';row.indexedSearchVersion='new';
  await t.putDerivedSearchRow('topics',row);
 });
 assert.equal((await meta(s,'backup-data-generation')).value,before);
 await assert.rejects(()=>s.repository.transaction(true,async t=>{
  const row=await t.get('topics','derived-probe');
  row.name='changed';
  await t.putDerivedSearchRow('topics',row);
 }));
 assert.equal((await meta(s,'backup-data-generation')).value,before);
 assert.equal((await s.repository.transaction(false,t=>t.get('topics','derived-probe'))).name,'original');
 await s.repository.transaction(true,async t=>{
  const row=await t.get('topics','derived-probe');
  row.name='changed';await t.put('topics',row);
 });
 assert.equal((await meta(s,'backup-data-generation')).value,before+1);
});


test('oversized declared restore is refused before reading any segment',async()=>{
 const partBytes=16*1024*1024,base='PAIA-Backup-fixture';
 let reads=0;
 const parts=Array.from({length:5},(_,index)=>({
  name:`${base}.part-${String(index+1).padStart(6,'0')}.paia-backup`,
  bytes:partBytes,sha256:'0'.repeat(64),
 }));
 const files=parts.map(part=>({
  name:part.name,size:part.bytes,
  async arrayBuffer(){reads++;throw new Error('oversized segment was read');},
 }));
 const manifest={format:'PAIA Backup Segments',formatVersion:1,
  contentFormat:'PAIA Backup v1',complete:true,totalBytes:partBytes*parts.length,parts};
 const manifestFile=named(`${base}.manifest.paia-backup`,
  new Blob([JSON.stringify(manifest)]));
 const iterator=backupSegmentRows([manifestFile,...files]);
 await assert.rejects(()=>iterator.next(),error=>error?.code==='BACKUP_TOO_LARGE');
 assert.equal(reads,0);
});
