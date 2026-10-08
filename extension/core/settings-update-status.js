import {ArchiveError} from './constants.js';

export const SETTINGS_UPDATE_STATE_KEY='paia-consumer-update:v1';
function versionParts(value){
 if(typeof value!=='string'||value.length>23||! /^(?:0|[1-9]\d{0,4})(?:\.(?:0|[1-9]\d{0,4})){0,3}$/.test(value))return null;
 const parts=value.split('.').map(Number);if(parts.some(part=>part>65535))return null;
 while(parts.length<4)parts.push(0);return parts;
}
function compareVersion(left,right){const a=versionParts(left),b=versionParts(right);if(!a||!b)return null;for(let i=0;i<4;i++)if(a[i]!==b[i])return a[i]>b[i]?1:-1;return 0;}

// This projects an existing Chrome lifecycle event. It is never a latest-release
// query, installation command or alternate update-state writer.
export function projectSettingsUpdateStatus(value,version,now=Date.now()){
 if(!versionParts(version))throw new ArchiveError('UNAVAILABLE');
 const unknown={version,state:'unknown'};
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!['state','fromVersion','toVersion','at'].includes(key))||!Number.isSafeInteger(value.at)||value.at<=0||value.at>now)return unknown;
 if(value.state==='available'&&compareVersion(value.fromVersion,version)===0&&compareVersion(value.toVersion,version)===1)return {version,state:'available',targetVersion:value.toVersion,at:value.at};
 if(value.state==='installed'&&compareVersion(value.toVersion,version)===0&&(value.fromVersion===null||compareVersion(value.fromVersion,version)===-1))return {version,state:'installed',at:value.at};
 return unknown;
}
export async function readSettingsUpdateStatus(storage,version,now=Date.now()){
 let rows;try{rows=await storage.get(SETTINGS_UPDATE_STATE_KEY);}catch{throw new ArchiveError('STORAGE_FAILED');}
 return projectSettingsUpdateStatus(rows?.[SETTINGS_UPDATE_STATE_KEY],version,now);
}
