import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {nativeWorkingReceiveFixture,nativeWorkingInboxFixture} from './input-working-receive-fixture.mjs';
const source=await readFile(new URL('../browser-native-sync-input-working-receive.test.mjs',import.meta.url),'utf8');
test('actual receive browser fixture removes exact Node reader imports and preserves production imports',()=>{
 const fixture=nativeWorkingReceiveFixture(source);
 assert.equal(/(?:from\s*|import\s*)['"]node:/.test(fixture),false,'extension worker must not import Node builtins');
 assert.equal(fixture.includes("test('actual maxOperations=1"),false);
 for(const line of source.split('\n').filter(x=>x.startsWith('import ')&&x.includes("from '../core/")))assert.ok(fixture.includes(line),line);
 assert.ok(fixture.includes("command==='working-receive-matrix'"));
 assert.ok(fixture.includes("command==='working-receive-durable-read'"));
 assert.ok(fixture.includes("test('malformed source descriptors"));
});
test('receive browser fixture refuses unexpected Node import drift rather than silently dropping a runtime import',()=>{
 assert.throws(()=>nativeWorkingReceiveFixture(source.replace("import {createHash} from 'node:crypto';","import {createHash,randomBytes} from 'node:crypto';")),/OLD_READER_IMPORT_CHANGED/);
});

const inboxSource=await readFile(new URL('../browser-native-sync-input-working-inbox.test.mjs',import.meta.url),'utf8');
test('inbox native compiler retains all actual cases and production imports with isolated historical backup',()=>{
 const fixture=nativeWorkingInboxFixture(inboxSource);
 assert.equal(/(?:from\s*|import\s*)['"]node:/.test(fixture),false);
 for(const line of inboxSource.split('\n').filter(x=>x.startsWith('import ')&&x.includes("from '../core/")))assert.ok(fixture.includes(line),line);
 assert.deepEqual([...fixture.matchAll(/test\('([^']+)'/g)].map(x=>x[1]),[...inboxSource.matchAll(/test\('([^']+)'/g)].map(x=>x[1]));
 for(const command of ['working-inbox-matrix','working-inbox-durable-create','working-inbox-durable-resume'])assert.ok(fixture.includes(command));
 assert.ok(fixture.includes("from './bns-inbox-historical-backup.mjs'"));
});
test('inbox native compiler fails closed on owner or backup import drift',()=>{
 for(const original of ["import {setup,inputEdit} from './harness/thought-m1.mjs';","import {BackupService as HistoricalBackup} from './harness/historical-backup.mjs';"])assert.throws(()=>nativeWorkingInboxFixture(inboxSource.replace(original,'')),/INBOX_OWNER_IMPORT_CHANGED/);
});
