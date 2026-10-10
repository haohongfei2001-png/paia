import {defaults,validatePreferences} from '../workspace.js';
import {exact,fail} from './value.js';

// Portable display intent only. Consent, processing authority, content-preview
// protection and device geometry remain with their existing local owners.
export const CONSUMER_PREFERENCE_KEYS=Object.freeze(['language','appearance','fontSize','readingWidth','timeDisplay','timeEmphasis','smartFilter']);
export function validateConsumerPreference(value){
 if(!exact(value,['id','value','explicit'])||!CONSUMER_PREFERENCE_KEYS.includes(value.id)||value.explicit!==true||typeof value.value!=='string'||value.value.length>100)fail('BNS_CODEC_INVALID');
 return value;
}
export function consumerPreferenceRenderingValue(value){
 validateConsumerPreference(value);
 if(value.id==='smartFilter')return ['light','off'].includes(value.value)?value.value:'light';
 // An unsupported display value retains its wire identity. Rendering alone
 // falls back; this never rewrites the stored intent or reports it as default.
 try{validatePreferences({[value.id]:value.value});return value.value;}
 catch{return defaults()[value.id];}
}
