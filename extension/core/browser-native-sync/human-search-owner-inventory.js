// Unused source facts only. Neither this DTO nor a frozen row is authority.
import {branchRawMeasure} from './human-library-plan.js';
import {searchOwnerFields} from '../library-search.js';
import {scanHumanSearchFieldInventory} from './human-search-field-inventory.js';
import {fail} from './value.js';

const RAW_LIMIT=4*1024*1024,POSTING_CEILING=32768;
const descriptor=Object.getOwnPropertyDescriptor,own=Object.hasOwn;
const invalid=()=>fail('BNS_HUMAN_SEARCH_OWNER_INVENTORY_ARGUMENT_INVALID');
function dataField(row,key,required=false){
 const d=descriptor(row,key);
 if(!d){if(required||key in row)invalid();return;}
 if(!own(d,'value')||!d.enumerable)invalid();
}
function result(kind,active,B,stats,width,examined,reason,n,m,L,complete){
 return Object.freeze({version:1,state:'NOT_ADMITTED',reason,ownerKind:kind,active,rawBytes:B,rawUnits:stats.units,rawNodes:stats.nodes,rawSlots:stats.slots,fieldCount:width,examinedFields:examined,sourceInputUnits:n,sourceMatchCount:m,sourceMatchUnits:L,sourceComplete:complete,withinOwnerSourceMatchCeiling:complete?m<=POSTING_CEILING:null,executionProfileQualified:false,budgetAuthority:false});
}
// Only a borrowed frozen ordinary data row is supported. Reflection is not a
// Proxy detector or a trusted-native cut check. A future original parent must
// prepay the row, meter/frame/fields/scanner/result using its shared ticket;
// this helper does not allocate, resize, retain or refund a budget lease.
export function scanHumanSearchOwnerInventory(kind,row){
 if(arguments.length!==2||!['entry','topic','section'].includes(kind)||!row||typeof row!=='object'||Array.isArray(row)||![Object.prototype,null].includes(Object.getPrototypeOf(row))||!Object.isFrozen(row))invalid();
 // Native descriptor records inherit Object.prototype. Do not let inherited
 // `value` change the existing meter's protected accessor interpretation.
 if('value'in Object.prototype)invalid();
 dataField(row,'lifecycle',true);
 if(kind==='entry'){dataField(row,'title');dataField(row,'thoughtText');dataField(row,'type');}
 else dataField(row,kind==='topic'?'name':'title');
 // Keep the existing meter unchanged, including its fixed original ceiling.
 // native mode rejects ordinary accessors/prototypes without reading getters.
 branchRawMeasure(row,RAW_LIMIT,null,true);
 const stats={},B=branchRawMeasure(row,RAW_LIMIT,stats,'native');
 const fields=searchOwnerFields(kind,row),lifecycle=row.lifecycle,width=kind==='entry'?3:1;
 if(lifecycle!=='active'&&lifecycle!=='removed')invalid();
 const active=lifecycle==='active';
 // The original field expression is eager; removed owners skip tokenization.
 if(!active)return result(kind,false,B,stats,width,0,'INACTIVE_SOURCE_NOT_SCANNED',0,0,0,true);
 let n=0,m=0,L=0;
 for(let i=0;i<width;i++){
  const key=kind==='topic'?'name':i===0?'title':i===1?'body':'type',text=fields[key];
  if(typeof text!=='string')return result(kind,true,B,stats,width,i,'NON_STRING_SOURCE_FIELD',null,null,null,false);
  const facts=scanHumanSearchFieldInventory(text);
  if(!facts.sourceComplete)return result(kind,true,B,stats,width,i+1,facts.reason,null,null,null,false);
  n+=facts.inputUnits;m+=facts.sourceMatchCount;L+=facts.sourceMatchUnits;
 }
 return result(kind,true,B,stats,width,width,m>POSTING_CEILING?'OWNER_SOURCE_MATCH_COUNT_LIMIT':'EXECUTION_PROFILE_UNQUALIFIED',n,m,L,true);
}
