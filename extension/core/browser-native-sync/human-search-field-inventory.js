// Unused source inventory only. Never invokes or admits the original tokenizer.
import {fail} from './value.js';
const MAX_SOURCE_UNITS=2*1024*1024,POSTING_CEILING=32768;
function supported(point){
 if(point<128)return point<65||point>90;
 if(point>=0x4e00&&point<=0x9fff)return true;
 if(point>=0x3008&&point<=0x300f)return true;
 return point===0x2014||point===0x2018||point===0x2019||point===0x201c||point===0x201d||point===0x3001||point===0x3002||point===0x3010||point===0x3011||point===0x3014||point===0x3015;
}
function result(reason,inputUnits,scannedUnits,sourceMatchCount,sourceMatchUnits,sourceComplete){return Object.freeze({version:1,state:'NOT_ADMITTED',reason,inputUnits,scannedUnits,sourceMatchCount,sourceMatchUnits,sourceComplete,withinSingleFieldPostingCeiling:sourceComplete?sourceMatchCount<=POSTING_CEILING:null,executionProfileQualified:false,budgetAuthority:false});}
// MAX_SOURCE_UNITS is a conservative scanner work bound, not the old UTF8 raw
// cut's equivalent, a product input limit, a tariff or a normalizer guarantee.
// Future callers must prepay the fixed frame using their original projection
// work ticket; this primitive helper neither creates nor releases a ticket.
export function scanHumanSearchFieldInventory(text){
 if(arguments.length!==1||typeof text!=='string')fail('BNS_HUMAN_SEARCH_FIELD_INVENTORY_ARGUMENT_INVALID');
 const n=text.length;if(n>MAX_SOURCE_UNITS)return result('SOURCE_WORK_LIMIT',n,0,null,null,false);
 let m=0,L=0,inWord=false;
 for(let i=0;i<n;i++){
  const point=text.charCodeAt(i);if(!supported(point))return result('UNSUPPORTED_SOURCE_REPERTOIRE',n,i,null,null,false);
  const han=point>=0x4e00&&point<=0x9fff,word=point>=97&&point<=122||point>=48&&point<=57||point===95;
  if(han){if(!inWord)m++;L++;}
  else if(word){if(!inWord)m++;L++;inWord=true;}
  else inWord=false;
 }
 // These are the SOURCE regex-shape counts. Default-locale/native case and
 // normalization execution remain unqualified; no token/index fact follows.
 return result(m>POSTING_CEILING?'SOURCE_POSTING_COUNT_LIMIT':'EXECUTION_PROFILE_UNQUALIFIED',n,n,m,L,true);
}
