// Source-qualified lifetime policy, never an RPC-supplied permission. A source
// deployment must choose and qualify explicit lifetimes before activation.
const plain=x=>!!x&&[Object.prototype,null].includes(Object.getPrototypeOf(x));
const exact=(x,keys)=>plain(x)&&Object.keys(x).length===keys.length&&Object.keys(x).every(k=>keys.includes(k))&&Object.values(Object.getOwnPropertyDescriptors(x)).every(d=>Object.hasOwn(d,'value'));
const integer=x=>Number.isSafeInteger(x)&&x>0;
const label=x=>typeof x==='string'&&x.length>0&&x.length<=200;
const base=['version','target','transport','principalMode','qualificationId'];
export function qualifyContextConnectionConfiguration(value){
 if(!plain(value)||!Object.values(Object.getOwnPropertyDescriptors(value)).every(d=>Object.hasOwn(d,'value')))return null;const keys=value.version===1?base:value.version===2?[...base,'authorizationPolicy']:[];
 if(!keys.length||!exact(value,keys)||value.target!=='chatgpt'||value.transport!=='native-loopback-http-bearer'||value.principalMode!=='paired-local-profile'||!label(value.qualificationId))return null;
 if(value.version===1)return Object.freeze({...value});
 const p=value.authorizationPolicy;if(!exact(p,['version','id','authorizationLifetimeMs','runtimeLeaseMs'])||p.version!==1||!label(p.id)||!integer(p.authorizationLifetimeMs)||!integer(p.runtimeLeaseMs)||p.runtimeLeaseMs<1000||p.runtimeLeaseMs>3600000||p.authorizationLifetimeMs<=p.runtimeLeaseMs)return null;
 return Object.freeze({...value,authorizationPolicy:Object.freeze({...p})});
}
export function validContextPairingAuthorization(a){
 return exact(a,['version','id','policyId','qualificationId','extensionId','host','grantedAt','expiresAt'])&&a.version===1&&typeof a.id==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(a.id)&&label(a.policyId)&&label(a.qualificationId)&&typeof a.extensionId==='string'&&/^[a-p]{32}$/.test(a.extensionId)&&a.host==='com.paia.context_read'&&Number.isSafeInteger(a.grantedAt)&&Number.isSafeInteger(a.expiresAt)&&a.expiresAt>a.grantedAt;
}
export function isCurrentContextPairingAuthorization(a,configuration,extensionId,now){
 const policy=configuration?.authorizationPolicy;return !!policy&&validContextPairingAuthorization(a)&&a.policyId===policy.id&&a.qualificationId===configuration.qualificationId&&a.extensionId===extensionId&&Number.isSafeInteger(now)&&now>=a.grantedAt&&now<a.expiresAt&&a.expiresAt-a.grantedAt===policy.authorizationLifetimeMs;
}
