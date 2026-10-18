// Preserve only the exact module-private installed manifest. All ordinary
// synthetic/request metadata still passes the original bounded snapshot/compiler.
import {createQwenRequestProfileCompiler} from './qwen-request-profile.js';
import {installedQwenManifestCapability,compileInstalledQwenRequest,isInstalledQwenMeasurement} from './qwen-source-profile.js';
import {snapshot,exact,integer} from './qwen-request-data.js';
export function readQwenProfileManifest(value){return installedQwenManifestCapability(value)?value:snapshot(value);}
export function readQwenTokenMeasurement(manifest,value){const cap=installedQwenManifestCapability(manifest);if(!cap)return snapshot(value);if(!isInstalledQwenMeasurement(value,cap))throw Error('TOKENIZER_SOURCE_UNAVAILABLE');return value;}
export function createQwenManifestCompiler(manifest){
 const cap=installedQwenManifestCapability(manifest);
 if(!cap)return createQwenRequestProfileCompiler({profile:manifest?.profile,known:manifest?.known});
 let disposed=false;
 return Object.freeze({compile(value){try{const o=snapshot(value);if(disposed||!exact(o,['childIdentity','inputTokens','outputCap','stream','now'])||!integer(o.now))throw Error();const {now,...input}=o;return compileInstalledQwenRequest(cap,input);}catch{return {status:'UNAVAILABLE',reason:'SOURCE_PROFILE_UNAVAILABLE',qualification:'NOT_ESTABLISHED',financialAuthority:false,dispatchAllowed:false};}},dispose(){disposed=true;}});
}
