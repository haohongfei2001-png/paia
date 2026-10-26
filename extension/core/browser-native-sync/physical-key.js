// Pure original encoding only. These strings are not scope or commit authority.
export const protocolKey=parts=>parts.map(x=>encodeURIComponent(x)).join(':');
export const protocolPhysicalId=(prefix,namespace,kind,parts)=>prefix+'generation:'+namespace+':'+kind+':'+protocolKey(parts);
