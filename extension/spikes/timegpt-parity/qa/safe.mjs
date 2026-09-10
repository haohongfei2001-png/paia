import {createHash,randomBytes} from 'node:crypto';
export const ORIGIN='https://chatgpt.com';
export function targetURL(value){try{const u=new URL(value);if(u.origin!==ORIGIN||u.search||u.hash||u.username||u.password)return null;if(!/^\/(?:g\/[A-Za-z0-9_-]+\/)?c\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/?$/i.test(u.pathname))return null;return u.origin+u.pathname.replace(/\/$/,'');}catch{return null;}}
export const newSalt=()=>randomBytes(32).toString('hex');
export const alias=(url,salt)=>createHash('sha256').update(salt+'\n'+url).digest('hex');
export function configFor(url,mode='alias'){const target=targetURL(url);if(!target)throw Error('INVALID_TARGET');const salt=newSalt();return mode==='url'?{mode,salt,alias:alias(target,salt),url:target}:{mode:'alias',salt,alias:alias(target,salt)};}
export function validConfig(v){return v&&['alias','url'].includes(v.mode)&&/^[a-f0-9]{64}$/.test(v.salt||'')&&/^[a-f0-9]{64}$/.test(v.alias||'')&&(v.mode==='alias'?!Object.hasOwn(v,'url'):targetURL(v.url)&&alias(v.url,v.salt)===v.alias);}
const keys=['matched','candidates','observed','accepted','rejected'];
export function safeReport(status,reason,counts={}){
 const allowed=['STARTING','WAITING','RUNNING','PASS','FAIL'];
 const reasons=['QA_START','LOGIN_OR_TARGET_REQUIRED','TARGET_ALIAS_UNAVAILABLE','SMOKE_RUNNING','COUNTS_POSITIVE','NO_DETAIL_RESPONSE','NO_TIME_CANDIDATE','NO_EXACT_DOM_MATCH','PARITY_NOT_READY','AUTH_REQUIRED','INVALID_TARGET','PROFILE_REFUSED','EXTENSION_VERIFY_FAILED','BROWSER_START_FAILED','NAVIGATION_FAILED','HARNESS_ERROR','BROWSER_CLOSED'];
 const r={status:allowed.includes(status)?status:'FAIL',reason:reasons.includes(reason)?reason:'HARNESS_ERROR'};
 for(const key of keys)r[key]=Number.isSafeInteger(counts[key])&&counts[key]>=0&&counts[key]<=1000000?counts[key]:null;
 if(r.status==='PASS'&&!(r.reason==='COUNTS_POSITIVE'&&r.matched>0&&r.candidates>0)){r.status='FAIL';r.reason='HARNESS_ERROR';}
 return r;
}
// Runs in the page. Returns numbers/booleans only, never the raw diagnostic text.
export function readSafePanel(){
 const host=document.getElementById('paia-parity-panel'),pre=host?.shadowRoot?.getElementById('paia-parity-summary');
 if(!pre)return null;
 const s=pre.textContent||'',out={};
 for(const [key,label] of [['matched','matched user messages'],['candidates','create_time candidates'],['observed','observed detail responses'],['accepted','accepted responses'],['rejected','rejected responses']]){
  const match=s.match(new RegExp('^'+label+': ([0-9]{1,7})$','m'));const n=match?Number(match[1]):NaN;
  if(!Number.isSafeInteger(n)||n>1000000)return null;out[key]=n;
 }
 out.ready=/^status: observing$/m.test(s)&&/^MAIN hook: seen$/m.test(s)&&/^drain received: yes$/m.test(s);
 return out;
}
export function verdict(c){if(!c?.ready)return safeReport('FAIL','PARITY_NOT_READY',c||{});if(c.matched>0&&c.candidates>0)return safeReport('PASS','COUNTS_POSITIVE',c);return safeReport('FAIL',c.observed===0?'NO_DETAIL_RESPONSE':c.candidates===0?'NO_TIME_CANDIDATE':'NO_EXACT_DOM_MATCH',c);}
