import test from 'node:test';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {validateBackupHeader,BACKUP_VERSION,BACKUP_SCHEMA,BACKUP_SECTIONS} from '../core/backup-format.js';

test('v0.11 backup envelope accepts prior and current v0.55 producers but rejects future v0.56 with its exact error',()=>{
 const row={type:'header',format:'PAIA Backup',formatVersion:BACKUP_VERSION,schemaVersion:BACKUP_SCHEMA,appVersion:'0.11.0',createdAt:'2026-09-01T00:00:00Z',contentSections:Object.keys(BACKUP_SECTIONS)};
 assert.equal(validateBackupHeader(row),row);
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.10.1'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.13.0'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.14.0'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.15.0'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.16.0'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.17.0'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.18.0'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.19.0'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.20.0'}));assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.21.0'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.22.0'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.23.0'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.24.0'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.25.0'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.26.0'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.27.0'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.28.0'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.29.0'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.30.0'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.31.0'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.32.0'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.33.0'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.34.0'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.35.0'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.36.0'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.37.0'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.38.0'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.39.0'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.40.0'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.41.0'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.42.0'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.43.0'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.44.0'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.45.0'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.46.0'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.47.0'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.48.0'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.49.0'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.50.0'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.51.0'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.52.0'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.53.0'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.54.0'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.55.0'}));
 assert.throws(()=>validateBackupHeader({...row,appVersion:'0.56.0'}),{code:'BACKUP_VERSION_UNSUPPORTED'});
});

// The coherent runtime must recognize its own producer version without
// accepting the next unimplemented minor or widening the backup schema.
test('current manifest backup producer is accepted while the next minor refuses',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../manifest.json',import.meta.url),'utf8'));
 const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
 assert.equal(manifest.version,pkg.version);
 const row={type:'header',format:'PAIA Backup',formatVersion:BACKUP_VERSION,schemaVersion:BACKUP_SCHEMA,appVersion:manifest.version,createdAt:'2026-09-01T00:00:00Z',contentSections:Object.keys(BACKUP_SECTIONS)};
 assert.equal(validateBackupHeader(row),row);
 const [major,minor]=manifest.version.split('.').map(Number);
 assert.throws(()=>validateBackupHeader({...row,appVersion:major+'.'+(minor+1)+'.0'}),{code:'BACKUP_VERSION_UNSUPPORTED'});
});
