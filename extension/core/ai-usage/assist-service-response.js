import {exact,fail} from './contracts.js';
import {validateAssistResponse,assertAssistPayload} from './assist-response.js';
// The original qualified Qwen schema admits only closed required-field objects.
// This strict wire envelope maps into the original private Assist union; it does
// not widen the response bound or drop a nonempty condition/defer reason.
export function assistServicePayload(payload){
 const value={...payload,instructions:payload.instructions+' For the closed service schema always include version, kind, text, condition, reason. SUGGESTION requires reason to be empty. DEFER requires text and condition to be empty.',response:{...payload.response,requiredFields:['version','kind','text','condition','reason']}};
 assertAssistPayload(value);return value;
}
export function validateAssistServiceResponse(value){
 try{exact(value,['version','kind','text','condition','reason']);}catch{fail('INVALID_RESPONSE');}
 if(value.kind==='SUGGESTION'&&value.reason==='')return validateAssistResponse(JSON.stringify({version:value.version,kind:value.kind,text:value.text,condition:value.condition}));
 if(value.kind==='DEFER'&&value.text===''&&value.condition==='')return validateAssistResponse(JSON.stringify({version:value.version,kind:value.kind,reason:value.reason}));
 fail('INVALID_RESPONSE');
}
