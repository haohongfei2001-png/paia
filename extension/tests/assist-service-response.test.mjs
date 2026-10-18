import test from 'node:test';
import assert from 'node:assert/strict';
import {validateAssistServiceResponse} from '../core/ai-usage/assist-service-response.js';
test('closed Qwen service envelope maps precisely into original bounded Assist result union',()=>{
 assert.deepEqual(validateAssistServiceResponse({version:1,kind:'SUGGESTION',text:'Explain this.',condition:'If useful.',reason:''}),{version:1,kind:'SUGGESTION',text:'Explain this.',condition:'If useful.'});
 assert.deepEqual(validateAssistServiceResponse({version:1,kind:'DEFER',text:'',condition:'',reason:'PREREQUISITE_UNMET'}),{version:1,kind:'DEFER',reason:'PREREQUISITE_UNMET'});
 for(const value of [{version:1,kind:'SUGGESTION',text:'x',condition:'',reason:'PREREQUISITE_UNMET'},{version:1,kind:'DEFER',text:'not empty',condition:'',reason:'PREREQUISITE_UNMET'},{version:1,kind:'SUGGESTION',text:'x'.repeat(121),condition:'',reason:''},{version:1,kind:'SUGGESTION',text:'x',condition:'',reason:'',extra:true}])assert.throws(()=>validateAssistServiceResponse(value),{code:'INVALID_RESPONSE'});
});
