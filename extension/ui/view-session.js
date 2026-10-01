const forbidden=new Set(['body','text','originalText','libraryText','thoughtText','proposal','output','apiKey','note']);
function boundedMetadata(value,depth=0){
 if(depth>12)throw Error('View metadata is too deep');
 if(value===null||value===undefined||typeof value==='boolean')return;
 if(typeof value==='number'){if(!Number.isFinite(value))throw Error('Invalid view number');return;}
 if(typeof value==='string'){if(value.length>4096)throw Error('View string is too large');return;}
 if(Array.isArray(value)){if(value.length>100)throw Error('View list is too large');for(const v of value)boundedMetadata(v,depth+1);return;}
 if(typeof value!=='object'||Object.getPrototypeOf(value)!==Object.prototype)throw Error('Invalid view metadata');
 for(const [key,v] of Object.entries(value)){if(forbidden.has(key))throw Error('Body or secret cannot enter a view session');boundedMetadata(v,depth+1);}
}
// In-tab metadata only. Snapshots are copied in/out so a read cannot become a
// hidden mutable cache of canonical bodies. Eviction loses view state, not data.
export class ViewSessions {
 constructor(limit=32){if(!Number.isInteger(limit)||limit<1||limit>128)throw Error('Invalid view bound');this.limit=limit;this.entries=new Map();}
 set(key,value){if(typeof key!=='string'||!key.length||key.length>4096)throw Error('Invalid view key');boundedMetadata(value);if(JSON.stringify(value)?.length>65536)throw Error('View metadata is too large');this.entries.delete(key);this.entries.set(key,structuredClone(value));while(this.entries.size>this.limit)this.entries.delete(this.entries.keys().next().value);return this;}
 get(key){if(!this.entries.has(key))return undefined;const value=this.entries.get(key);this.entries.delete(key);this.entries.set(key,value);return structuredClone(value);}
 delete(key){return this.entries.delete(key);}
 clear(){this.entries.clear();}
 get size(){return this.entries.size;}
}
