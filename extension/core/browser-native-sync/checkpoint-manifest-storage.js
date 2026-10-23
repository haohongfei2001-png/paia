import {ArchiveError} from '../constants.js';
import {SEGMENT_PROFILE} from './segments.js';
// Private durable checkpoint representation only. Protocol object bytes, refs,
// hash validation and decoded manifest interpretation remain owned by readObject.
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const fail=()=>{throw new ArchiveError('GENERATION_CHECKPOINT_CHANGED');};
export function requireCheckpointManifestStorage(version,value,length){
 if(!Number.isSafeInteger(length)||length<1||length>SEGMENT_PROFILE.encoded)fail();
 if(version===1){if(!Array.isArray(value)||value.length!==length)fail();for(let i=0;i<length;i++)if(!Object.hasOwn(value,i)||!Number.isInteger(value[i])||value[i]<0||value[i]>255)fail();return;}
 if(version!==2||typeof value!=='string'||value.length!==4*Math.ceil(length/3)||!(/^[A-Za-z0-9+/]*={0,2}$/).test(value))fail();
 const padding=value.endsWith('==')?2:value.endsWith('=')?1:0;
 if(value.length/4*3-padding!==length||padding===2&&(alphabet.indexOf(value.at(-3))&15)!==0||padding===1&&(alphabet.indexOf(value.at(-2))&3)!==0)fail();
}
export function encodeCheckpointManifestStorage(raw){
 if(!(raw instanceof Uint8Array)||!raw.length||raw.length>SEGMENT_PROFILE.encoded)fail();
 let binary='';for(let offset=0;offset<raw.length;offset+=4096)binary+=String.fromCharCode(...raw.subarray(offset,offset+4096));
 return btoa(binary);
}
export function decodeCheckpointManifestStorage(version,value,length){
 requireCheckpointManifestStorage(version,value,length);
 if(version===1)return Uint8Array.from(value);
 const binary=atob(value),raw=new Uint8Array(binary.length);for(let i=0;i<raw.length;i++)raw[i]=binary.charCodeAt(i);return raw;
}
