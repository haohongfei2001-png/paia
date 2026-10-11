import {defaults,validatePreferences} from '../workspace.js';
import {exact,fail} from './value.js';

// Portable display intent only. Consent, processing authority, content-preview
// protection and device geometry remain with their existing local owners.
export const CONSUMER_PREFERENCE_KEYS=Object.freeze(['language','appearance','fontSize','readingWidth','timeDisplay','timeEmphasis','smartFilter']);
export const CONSUMER_PREFERENCE_CODEC_VERSION=2;
export function validateConsumerPreference(value){
 if(!exact(value,['id','value','explicit'])||!CONSUMER_PREFERENCE_KEYS.includes(value.id)||value.explicit!==true||typeof value.value!=='string'||value.value.length>100)fail('BNS_CODEC_INVALID');
 return value;
}
export function consumerPreferenceRenderingValue(value){
 validateConsumerPreferenceIntent(value);
 if(value.id==='smartFilter')return value.value;
 // An unsupported display value retains its wire identity. Rendering alone
 // falls back; this never rewrites the stored intent or reports it as default.
 try{validatePreferences({[value.id]:value.value});return value.value;}
 catch{return defaults()[value.id];}
}
export function validateConsumerPreferenceIntent(value){
 if(!exact(value,['id','value','explicit'])||!CONSUMER_PREFERENCE_KEYS.includes(value.id)||![true,null].includes(value.explicit)||typeof value.value!=='string'||value.value.length>100)fail('BNS_CODEC_INVALID');
 if(value.id==='smartFilter'&&!['light','off'].includes(value.value))fail('BNS_CODEC_UNSUPPORTED');
 return value;
}
export function assertConsumerPreferenceOperation(operation){
 if(operation.type!=='consumerPreference'||operation.codecVersion!==CONSUMER_PREFERENCE_CODEC_VERSION||operation.kind!=='put')fail('BNS_CONSUMER_PREFERENCE_AUTHORITY');
 validateConsumerPreferenceIntent(operation.value);
 // Null records a baseline with no historical explicitness evidence. Actual
 // user writes, including selecting the default, always carry explicit=true.
 if(operation.value.explicit===null?operation.actor!=='bootstrap'||operation.parents.length:operation.actor!=='user')fail('BNS_CONSUMER_PREFERENCE_AUTHORITY');
 return true;
}
