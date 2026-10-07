import test from 'node:test';
import assert from 'node:assert/strict';
import {validateBackupHeader,BACKUP_VERSION,BACKUP_SCHEMA,BACKUP_SECTIONS} from '../core/backup-format.js';

test('v0.11 backup envelope accepts prior and current v0.17 producers but rejects future v0.18 with its exact error',()=>{
 const row={type:'header',format:'PAIA Backup',formatVersion:BACKUP_VERSION,schemaVersion:BACKUP_SCHEMA,appVersion:'0.11.0',createdAt:'2026-09-01T00:00:00Z',contentSections:Object.keys(BACKUP_SECTIONS)};
 assert.equal(validateBackupHeader(row),row);
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.10.1'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.13.0'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.14.0'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.15.0'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.16.0'}));
 assert.doesNotThrow(()=>validateBackupHeader({...row,appVersion:'0.17.0'}));
 assert.throws(()=>validateBackupHeader({...row,appVersion:'0.18.0'}),{code:'BACKUP_VERSION_UNSUPPORTED'});
});
