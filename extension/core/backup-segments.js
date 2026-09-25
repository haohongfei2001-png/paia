import {BACKUP_LIMITS,backupError} from './backup-format.js';

const encoder=new TextEncoder();
const SHA256=/^[0-9a-f]{64}$/;
const DEFAULT_SEGMENT_BYTES=8*1024*1024;
const MAX_PARTS=8192;

async function digest(blob){
 const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()));
 return [...bytes].map(byte=>byte.toString(16).padStart(2,'0')).join('');
}

// Each part ends at a complete NDJSON row. A missing final manifest or footer
// cannot be mistaken for a usable backup.
export class BackupSegmentWriter{
 constructor({name,maxBytes=DEFAULT_SEGMENT_BYTES,onSegment}){
  if(!/^[A-Za-z0-9][A-Za-z0-9._-]{0,180}$/.test(name)||typeof onSegment!=='function'
      ||!Number.isSafeInteger(maxBytes)||maxBytes<128
      ||maxBytes>16*1024*1024)backupError('BACKUP_INVALID');
  this.name=name;this.maxBytes=maxBytes;this.onSegment=onSegment;
  this.parts=[];this.lines=[];this.bytes=0;this.totalBytes=0;
  this.started=false;this.finished=false;this.footerSeen=false;this.busy=false;this.failed=false;
 }
 async add(row){
  if(this.busy||this.finished||this.footerSeen||this.failed)backupError('BACKUP_INVALID');
  if(!this.started&&row?.type!=='header'||this.started&&!['item','footer'].includes(row?.type))
   backupError('BACKUP_INVALID');
  this.busy=true;
  try{
   const line=JSON.stringify(row)+'\n',size=encoder.encode(line).length;
   if(size>BACKUP_LIMITS.lineBytes+1||size>this.maxBytes)backupError('BACKUP_TOO_LARGE');
   if(this.bytes&&this.bytes+size>this.maxBytes)await this.flush();
   this.lines.push(line);this.bytes+=size;this.totalBytes+=size;
   this.started=true;if(row.type==='footer')this.footerSeen=true;
  }catch(error){this.failed=true;throw error;}finally{this.busy=false;}
 }
 async flush(){
  if(!this.lines.length)return;
  if(this.parts.length>=MAX_PARTS)backupError('BACKUP_TOO_LARGE');
  const blob=new Blob(this.lines,{type:'application/x-ndjson'});
  if(blob.size!==this.bytes)backupError('BACKUP_INVALID');
  const index=this.parts.length+1;
  const name=`${this.name}.part-${String(index).padStart(6,'0')}.paia-backup`;
  const sha256=await digest(blob);
  await this.onSegment({name,blob,index});
  this.parts.push({name,bytes:blob.size,sha256});
  this.lines=[];this.bytes=0;
 }
 async finish(){
  if(this.busy||this.finished||this.failed||!this.started||!this.footerSeen)backupError('BACKUP_INCOMPLETE');
  this.busy=true;
  try{
   await this.flush();
   this.finished=true;
   return {
    format:'PAIA Backup Segments',formatVersion:1,
    contentFormat:'PAIA Backup v1',complete:true,
    totalBytes:this.totalBytes,parts:this.parts.map(part=>({...part})),
   };
  }catch(error){this.failed=true;throw error;}finally{this.busy=false;}
 }
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
