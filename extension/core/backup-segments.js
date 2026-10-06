import {BACKUP_LIMITS,backupError} from './backup-format.js';

const SHA256=/^[0-9a-f]{64}$/;
const MAX_PARTS=8192;

async function digest(blob){
 const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()));
 return [...bytes].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}

// Retired output entry points cannot create content, blobs, or download callbacks.
export class BackupSegmentWriter{
 constructor(){backupError('FEATURE_UNAVAILABLE');}
 async add(){backupError('FEATURE_UNAVAILABLE');}
 async flush(){backupError('FEATURE_UNAVAILABLE');}
 async finish(){backupError('FEATURE_UNAVAILABLE');}
}

export async function verifyBackupSegments(manifest,files,{maxBytes=BACKUP_LIMITS.segmentedExportBytes}={}){
 if(!Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>BACKUP_LIMITS.segmentedExportBytes)
  backupError('BACKUP_INVALID');
 if(manifest?.format!=='PAIA Backup Segments'||manifest.formatVersion!==1
     ||manifest.contentFormat!=='PAIA Backup v1'||manifest.complete!==true
     ||!Array.isArray(manifest.parts)||manifest.parts.length<1
     ||manifest.parts.length>MAX_PARTS||!Array.isArray(files)
     ||files.length!==manifest.parts.length)backupError('BACKUP_INCOMPLETE');
 const byName=new Map(files.map(file=>[file.name,file]));
 if(byName.size!==files.length)backupError('BACKUP_INVALID');
 let total=0;
 for(let index=0;index<manifest.parts.length;index++){
  const part=manifest.parts[index],file=byName.get(part?.name);
  if(!part||typeof part.name!=='string'
      ||!part.name.endsWith(`.part-${String(index+1).padStart(6,'0')}.paia-backup`)
      ||!Number.isSafeInteger(part.bytes)||part.bytes<1
      ||part.bytes>16*1024*1024||!SHA256.test(part.sha256)
      ||!file||file.size!==part.bytes)backupError('BACKUP_INCOMPLETE');
  total+=part.bytes;
  if(!Number.isSafeInteger(total)||total>maxBytes)backupError('BACKUP_TOO_LARGE');
 }
 if(total!==manifest.totalBytes)backupError('BACKUP_INTEGRITY_FAILED');
 // Bound the declared complete set before reading a single selected file.
 for(const part of manifest.parts)if(await digest(byName.get(part.name))!==part.sha256)
  backupError('BACKUP_INTEGRITY_FAILED');
 return manifest.parts.map(part=>byName.get(part.name));
}
