import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {completeFixture,rows} from './harness/original-complete.mjs';
import {seedLongTerm} from './fixtures/long-term-v081.mjs';
import {BackupService} from '../core/backup-service.js';
import {BackupValidator,BACKUP_LIMITS} from '../core/backup-format.js';

test('CPV1-01.5 current-version recovery point round-trips a bounded synthetic library with human revisions',{timeout:120000},async()=>{
 const source=await completeFixture({texts:[]});
 await seedLongTerm(source.s);
 const exporter=new BackupService(source.s,{appVersion:'0.12.0'});
 const {sessionId,header}=await exporter.beginExport();
 const items=[header],validator=new BackupValidator();
 await validator.add(header);
 for(let sequence=0;;sequence++){
  const page=await exporter.exportPage({sessionId,sequence});
  for(const item of page.items){items.push(item);await validator.add(item);}
  if(page.done)break;
 }
 const preview=validator.preview();
 const fileBytes=Buffer.byteLength(items.map(item=>JSON.stringify(item)+'\n').join(''));
 assert.equal(preview.appVersion,'0.12.0');
 assert.equal(preview.counts.inputs,499);
 assert.equal(preview.counts.entries,360);
 assert.ok(fileBytes<=BACKUP_LIMITS.restoreBytes);
 assert.ok(preview.itemCount<=BACKUP_LIMITS.restoreItems);
 const target=await completeFixture({texts:[]});
 const restore=new BackupService(target.s,{appVersion:'0.12.0'});
 const session=await restore.beginRestore();
 for(let index=0;index<items.length;index+=30)await restore.stageRestore({sessionId:session.sessionId,items:items.slice(index,index+30)});
 const ready=await restore.previewRestore({sessionId:session.sessionId});
 assert.equal(ready.canRestore,true);
 await restore.restore({sessionId:session.sessionId,confirmation:ready.integrity});
 const durable=(store,values)=>{
  if(store==='thoughts')return values.map(row=>[row.id,row.thoughtText,row.title?.trim()?row.title:undefined,row.note,row.revision,row.protections,row.sourceRecordIds]);
  if(store==='topics')return values.map(row=>[row.id,row.name,row.summary,row.revision,row.protections,row.sourceRecordIds]);
  if(store==='revisions')return values.map(row=>[row.id,row.before,row.after,row.reason,row.important]);
  return values;
 };
 const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
 for(const store of ['records','blocks','thoughts','topics','provenance','revisions','tombstones']){
  const actual=await rows(target.s,store),expected=await rows(source.s,store);
  assert.equal(actual.length,expected.length,`${store} count`);
  assert.equal(hash(durable(store,actual)),hash(durable(store,expected)),`${store} durable content`);
 }
});
