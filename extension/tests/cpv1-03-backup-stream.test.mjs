import test from 'node:test';
import assert from 'node:assert/strict';
import {openBackupOutput} from '../ui/backup-export-output.js';

test('user-chosen export streams each page, counts UTF-8 bytes, and never creates a Blob download', async()=>{
  const events=[];
  const output=await openBackupOutput({
    name:'library.paia-backup',
    savePicker:async options=>{
      assert.equal(options.suggestedName,'library.paia-backup');
      return {createWritable:async()=>({
        write:async text=>events.push(['write',text]),
        close:async()=>events.push(['close']),
        abort:async()=>events.push(['abort']),
      })};
    },
    download:()=>assert.fail('streaming path must not download a Blob'),
  });
  assert.equal(output.mode,'stream');
  await output.write('{"type":"header"}\n');
  await output.write('{"value":"中文"}\n');
  assert.equal(output.bytes,Buffer.byteLength('{"type":"header"}\n{"value":"中文"}\n'));
  await output.finish();
  await output.abort();
  assert.deepEqual(events.map(event=>event[0]),['write','write','close']);
  await assert.rejects(()=>output.write('later'));
});

test('interrupted stream aborts the temporary write without closing it',async()=>{
  const events=[];
  const output=await openBackupOutput({
    name:'library.paia-backup',
    savePicker:async()=>({createWritable:async()=>({
      write:async()=>events.push('write'),
      close:async()=>events.push('close'),
      abort:async()=>events.push('abort'),
    })}),
  });
  await output.write('partial');
  await output.abort();
  assert.deepEqual(events,['write','abort']);
  await assert.rejects(()=>output.finish());
});

test('browser without picker retains existing download path',async()=>{
  let downloaded;
  const output=await openBackupOutput({
    name:'library.paia-backup',
    savePicker:undefined,
    download:(parts,name,type)=>{downloaded={parts:[...parts],name,type};},
  });
  await output.write('header\n');
  await output.write('footer\n');
  await output.finish();
  assert.deepEqual(downloaded,{
    parts:['header\n','footer\n'],name:'library.paia-backup',type:'application/x-ndjson',
  });
  assert.equal(output.bytes,14);
});
