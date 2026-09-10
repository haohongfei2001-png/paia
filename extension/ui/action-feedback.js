import {setProductState} from './product-state.js';
import {statusLabel,element} from './common.js';
const preflight=new Set(['BUDGET_EXCEEDED','BUDGET_LIMIT','BUDGET_RESERVATION_FAILED','CREDENTIAL_FAILURE','NO_CREDENTIAL','CREDENTIAL_MISSING','NOT_CONFIGURED','NO_ELIGIBLE_INPUTS','INPUT_TOO_LARGE']);
export function actionFailure(code,controls={}){
 if(['BUDGET_EXCEEDED','BUDGET_LIMIT','BUDGET_RESERVATION_FAILED'].includes(code))return {text:controls.usedRequests>=controls.dailyRequests?'今日 AI 整理额度已达到设置上限。'+(controls.resetAt?'重置时间：'+new Date(controls.resetAt).toLocaleString('zh-CN')+'。':'额度按 24 小时计。'):'本次内容或请求数超出处理预算。请减小本批范围，或到 Settings 检查上限。',settings:true,retry:false};
 return {text:statusLabel(code)+(preflight.has(code)?'。本次未调用 AI。':code==='OUTCOME_UNKNOWN'?'。重试将再次调用 DeepSeek API。':'。已保存的内容保留；本次若有已完成部分，也会保留。重试将再次调用 DeepSeek API。'),settings:['CREDENTIAL_FAILURE','NO_CREDENTIAL','CREDENTIAL_MISSING','NOT_CONFIGURED'].includes(code),retry:!preflight.has(code)};
}
export function showActionFailure(host,code,controls,onSettings){const result=actionFailure(code,controls);setProductState(host,code.startsWith('BUDGET_')?'budget_limited':code==='OUTCOME_UNKNOWN'?'paused':code==='NETWORK_ERROR'?'offline':result.settings?'credential_missing':'failed');host.replaceChildren(element('span','',result.text));host.hidden=false;if(result.settings){const link=element('button','','前往 Settings');link.addEventListener('click',onSettings);host.append(link);}return result;}
