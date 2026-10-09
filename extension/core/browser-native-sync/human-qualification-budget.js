// Numeric cooperation only: no data, reader, cleanup callback or authority.
import {fail} from './value.js';

const RETAINED=4*1024*1024,TOTAL=8*1024*1024,MIN=256,ESCROW=128;
const brands=new WeakMap(),live=new Map();
let retained=0,count=0,work=null;
const argument=()=>fail('BNS_HUMAN_QUALIFICATION_ARGUMENT_INVALID');
const required=()=>fail('BNS_HUMAN_QUALIFICATION_LEASE_REQUIRED');
const limit=()=>fail('BNS_HUMAN_QUALIFICATION_LIMIT');
function bytes(value,ceiling){if(!Number.isSafeInteger(value)||value<MIN||value>ceiling)argument();}
function record(lease){const r=brands.get(lease);if(!r||live.get(lease)!==r)required();return r;}
function active(lease){const r=record(lease);if(r!==work||r.phase!=='work'||r.committed)required();return r;}
function register(r){const lease=Object.freeze({});brands.set(lease,r);live.set(lease,r);return lease;}

export function beginHumanQualificationWork(kind,reservedBytes){
 if(arguments.length!==2||(kind!=='graph'&&kind!=='projection'))argument();
 bytes(reservedBytes,TOTAL);
 if(work)fail('BNS_HUMAN_QUALIFICATION_BUSY');
 if(retained+reservedBytes>TOTAL)limit();
 const r={kind,phase:'work',charge:reservedBytes,committed:false,pair:null};
 const lease=register(r);work=r;return lease;
}
export function resizeHumanQualificationLease(lease,reservedBytes){
 if(arguments.length!==2)argument();bytes(reservedBytes,TOTAL);
 const r=active(lease);if(retained+reservedBytes>TOTAL)limit();r.charge=reservedBytes;
}
export function retainHumanQualificationLease(lease,retainedBytes){
 if(arguments.length!==2)argument();bytes(retainedBytes,RETAINED);
 const r=active(lease);
 if(retainedBytes>r.charge||count>=8||retained+retainedBytes>RETAINED)limit();
 const kept={kind:r.kind,phase:'retained',charge:retainedBytes,committed:false,pair:r};
 const ticket=register(kept);
 r.charge-=retainedBytes;r.committed=true;r.pair=kept;
 retained+=retainedBytes;count++;return ticket;
}
export function releaseHumanQualificationLease(lease){
 if(arguments.length!==1)argument();const r=record(lease);
 if(r.phase==='retained'){
  // Transfer fixed bookkeeping escrow; never consume residual work scratch.
  if(r.pair){r.pair.charge+=ESCROW;r.pair.pair=null;r.pair=null;}
  retained-=r.charge;count--;
 }else{
  if(r.pair){r.pair.pair=null;r.pair=null;}
  work=null;
 }
 brands.delete(lease);live.delete(lease);
}
