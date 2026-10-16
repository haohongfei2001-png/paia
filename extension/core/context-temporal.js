// Explicit provider evidence only. No inferred deadline, timer, writer or grant.
const text=value=>value===null||typeof value==='string'&&value.length>0&&value.length<=512&&!value.includes('\0');
function instant(value){
 if(typeof value!=='string')return null;
 const at=Date.parse(value);if(!Number.isFinite(at))return null;
 return new Date(at).toISOString()===value?at:null;
}
export function validContextTemporal(value){
 return !!value&&typeof value==='object'&&!Array.isArray(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value))&&Reflect.ownKeys(value).length===3&&['temporalScope','uncertainty','validUntil'].every(key=>Object.hasOwn(value,key))&&text(value.temporalScope)&&text(value.uncertainty)&&(value.validUntil===null||instant(value.validUntil)!==null);
}
export function contextTemporalProjection(item,at=Date.now()){
 const temporal=item?.maintenance?.temporal;if(!validContextTemporal(temporal))return null;
 const expires=instant(temporal.validUntil),eligible=item.lifecycle==='active'&&item.origin==='automatic'&&item.card==='now'&&item.protected===false&&item.userEdited===false;
 return {temporal:structuredClone(temporal),temporalStatus:eligible&&expires!==null&&Number.isFinite(at)?at>=expires?'expired':'not_expired':'unknown'};
}
