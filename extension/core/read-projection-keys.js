import {ArchiveError} from './constants.js';
import {hashText} from './dedupe.js';

export const NAV_INDEX='ans:index:v1:';
export const NAV_STATE='ans:index-state:v1:';
export const NAV_CATALOG=NAV_STATE+'catalog';
export const NAV_DIRTY=NAV_STATE+'dirty:';
export const NAV_BATCH=100;
export const NAV_LIMIT=40;
const invalid=()=>{throw new ArchiveError('INVALID_REQUEST');};
export function unicode(value){
 if(typeof value!=='string')invalid();
 for(let i=0;i<value.length;i++){
  const c=value.charCodeAt(i);
  if(c>=0xd800&&c<=0xdbff){const d=value.charCodeAt(++i);if(!(d>=0xdc00&&d<=0xdfff))invalid();}
  else if(c>=0xdc00&&c<=0xdfff)invalid();
 }
 return value;
}
export function stringKey(value){return Array.from(new TextEncoder().encode(unicode(value)),n=>n.toString(16).padStart(2,'0')).join('')+'!';}
export const tupleKey=values=>values.map(stringKey).join('');
export const codepointCompare=(a,b)=>{const x=stringKey(a),y=stringKey(b);return x<y?-1:x>y?1:0;};
export function timeKey(value){
 if(!Number.isSafeInteger(value)||Math.abs(value)>8640000000000000)invalid();
 return (BigInt(value)+8640000000000000n).toString().padStart(17,'0');
}
export function rankKey(value){if(!Number.isInteger(value)||value<0||value>99999)invalid();return '0'+String(value).padStart(5,'0');}
export const unrankedKey=value=>'1'+value;
export const windowKey=(time,id)=>timeKey(time)+stringKey(id);
export const projectKey=(name,stable)=>'0'+stringKey(unicode(name).normalize('NFKC').toLowerCase())+stringKey(stable);
export const providerKey=key=>(key==='chatgpt'?'0':key==='claude'?'1':'2')+stringKey(key);
export const prefixRange=prefix=>IDBKeyRange.bound(prefix,prefix+'\uffff',false,true);
export const scopeHash=scope=>hashText(JSON.stringify(scope));
export const scopeStateId=hash=>NAV_STATE+'scope:'+hash;
export const memberPrefix=hash=>NAV_INDEX+'member:'+hash+':';
export const pagePrefix=(hash,generation)=>NAV_INDEX+'page:'+hash+':'+generation+':';
export const documentKey=id=>NAV_INDEX+'document:'+stringKey(id);
export const memberId=(hash,id)=>memberPrefix(hash)+stringKey(id);
export function identifier(value){if(typeof value!=='string'||!value.length||value.length>512)invalid();return unicode(value);}
export const validProvider=value=>typeof value==='string'&&/^[A-Za-z0-9._:@-]{1,128}$/.test(value);
export function provider(value){if(!validProvider(value))invalid();return value;}
export const rootScope=()=>['providers'];
export const groupScope=key=>['groups',key];
export const windowScope=(key,kind,ref=null)=>['windows',key,kind,ref?[ref.providerKey,ref.namespace,ref.projectId]:null];
