// Frozen original v1 reader from 41db1b0fa45f5fea6b19cfbcc9cec0afe85e6109.
// Compatibility fixture only; the checked() body below is byte-for-byte original.
// Original body SHA256: be08bd391a7488b6dcc374c797b72a026d44d0460ed8b05ad5ad07ccb886d8be
import {ArchiveError} from '../../core/constants.js';
import {exact,hash,opaque} from '../../core/browser-native-sync/value.js';
import {assertProtocolObjectReference} from '../../core/browser-native-sync/segments.js';
const states=new Set(['active','paused','disconnected','account-changed']);
const fail=code=>{throw new ArchiveError(code);};
function checked(row){
 if(!exact(row,['version','bindingId','generation','revision','mode','task','error'])||row.version!==1||!hash(row.bindingId)||!hash(row.generation)||!Number.isSafeInteger(row.revision)||row.revision<1||!states.has(row.mode)||row.error!==null&&(typeof row.error!=='string'||!/^(BNS_|STORAGE_|CONTROL_|BACKUP_)[A-Z_]+$/.test(row.error)))fail('BNS_SYNC_STATE_CORRUPT');
 if(row.task!==null){const task=row.task;if(!exact(task,['kind','id','phase','reference'])||!['publication','checkpoint','restore'].includes(task.kind)||!opaque(task.id)||!['reserved','running','unknown','confirmed'].includes(task.phase))fail('BNS_SYNC_STATE_CORRUPT');if(task.kind==='publication'&&task.reference!==null)fail('BNS_SYNC_STATE_CORRUPT');if(task.reference!==null){assertProtocolObjectReference(task.reference);if(task.reference.kind!=='checkpoint-manifest')fail('BNS_SYNC_STATE_CORRUPT');}}
 return row;
}

export {checked as readOriginalLifecycleV1};
