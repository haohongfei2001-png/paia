import {ArchiveError} from './constants.js';

export const AI_STYLE_KEY='aiOrganizeStyle';
export const AI_STYLE_VERSION=1;
export const AI_STYLES=Object.freeze(['original','balanced','concise']);
const plain=value=>!!value&&typeof value==='object'&&!Array.isArray(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value));
const exact=(value,keys)=>plain(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key));
const invalid=()=>{throw new ArchiveError('INVALID_REQUEST');};
const validEpoch=value=>typeof value==='string'&&/^[a-zA-Z0-9:-]{1,128}$/.test(value);

// This optional scalar envelope carries human preference intent only. Future
// versions/enums can round-trip inertly; no arbitrary extension metadata travels.
export function portableAIStyle(value){
 return exact(value,['version','value','revision','explicit'])&&Number.isSafeInteger(value.version)&&value.version>0&&value.version<=1000000&&typeof value.value==='string'&&/^[a-z][a-z0-9_-]{0,63}$/.test(value.value)&&Number.isSafeInteger(value.revision)&&value.revision>0&&value.explicit===true;
}
export function readAIStyle(preferences,epoch='initial'){
 if(!validEpoch(epoch))throw new ArchiveError('STORAGE_FAILED');
 if(!Object.hasOwn(preferences||{},AI_STYLE_KEY))return {available:true,value:'balanced',revision:0,explicit:false,epoch};
 const saved=preferences[AI_STYLE_KEY];
 if(!portableAIStyle(saved)||saved.version!==AI_STYLE_VERSION||!AI_STYLES.includes(saved.value))return {available:false,value:null,revision:null,explicit:null,epoch};
 return {available:true,value:saved.value,revision:saved.revision,explicit:true,epoch};
}
export function validateAIStyleChange(change){
 if(!exact(change,['version','value','expectedRevision','expectedEpoch'])||change.version!==AI_STYLE_VERSION||!AI_STYLES.includes(change.value)||!Number.isSafeInteger(change.expectedRevision)||change.expectedRevision<0||!validEpoch(change.expectedEpoch))invalid();
 return change;
}
export function applyAIStyleChange(preferences,change,epoch='initial'){
 validateAIStyleChange(change);
 const prior=readAIStyle(preferences,epoch);
 if(!prior.available)throw new ArchiveError('FEATURE_UNAVAILABLE');
 if(prior.epoch!==change.expectedEpoch||prior.revision!==change.expectedRevision)return {conflict:true};
 if(prior.explicit&&prior.value===change.value)return {ok:true,changed:false};
 if(prior.revision===Number.MAX_SAFE_INTEGER)throw new ArchiveError('FEATURE_UNAVAILABLE');
 preferences[AI_STYLE_KEY]={version:AI_STYLE_VERSION,value:change.value,revision:prior.revision+1,explicit:true};
 return {ok:true,changed:true};
}
export const isAIStyleOnlyRequest=request=>request?.type==='UPDATE_PREFERENCES'&&plain(request.changes)&&Object.keys(request.changes).length===1&&Object.hasOwn(request.changes,AI_STYLE_KEY);
