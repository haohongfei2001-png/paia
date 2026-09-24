import test from 'node:test';
import assert from 'node:assert/strict';
import {BackupSegmentWriter,verifyBackupSegments} from '../core/backup-segments.js';

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
