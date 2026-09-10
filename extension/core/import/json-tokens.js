import {fail,limits} from './errors.js';
// Generic SAX tokens; no ChatGPT field names or conversation object assembly.
export class JsonTokens {
 constructor({limits:input,selectString=()=>false}={}){this.limits=limits(input);this.selectString=selectString;this.stack=[];this.root=false;this.mode=null;this.token='';this.events=[];this.maxBufferedChars=0;}
 parent(){return this.stack.at(-1);}
 path(){const p=this.parent();return p?[...p.path,p.kind==='array'?p.index:p.key]:[];}
 value(type,value=null){const path=this.path(),p=this.parent();if(p){if(!['value','valueOrEnd'].includes(p.state))fail('JSON_INVALID');p.state='commaOrEnd';}else{if(this.root)fail('JSON_INVALID');this.root=true;}this.events.push({kind:'value',path,type,value});return path;}
 punct(c){const p=this.parent();if(c==='{'||c==='['){const path=this.value(c==='{'?'object':'array');if(this.stack.length>=this.limits.depth)fail('JSON_DEPTH');this.stack.push({path,kind:c==='{'?'object':'array',state:c==='{'?'keyOrEnd':'valueOrEnd',keys:new Set(),key:null,index:0});}
 else if(c==='}'||c===']'){if(!p||p.kind!==(c==='}'?'object':'array')||!['commaOrEnd',c==='}'?'keyOrEnd':'valueOrEnd'].includes(p.state))fail('JSON_INVALID');this.stack.pop();this.events.push({kind:'end',path:p.path,type:p.kind});}
 else if(c===':'){if(p?.state!=='colon')fail('JSON_INVALID');p.state='value';}
 else if(c===','){if(p?.state!=='commaOrEnd')fail('JSON_INVALID');p.state=p.kind==='object'?'key':'value';if(p.kind==='array')p.index++;}else fail('JSON_INVALID');}
 buffer(c){if(!this.keep)return;this.token+=c;if(this.token.length>(this.isKey?this.limits.keyChars*6+2:this.limits.stringChars*6+2))fail(this.isKey?'JSON_KEY_LIMIT':'JSON_STRING_LIMIT');this.maxBufferedChars=Math.max(this.maxBufferedChars,this.token.length);}
 stringDone(){let v=null;if(this.keep){try{v=JSON.parse(this.token);}catch{fail('JSON_INVALID');}if(v.length>(this.isKey?this.limits.keyChars:this.limits.stringChars))fail(this.isKey?'JSON_KEY_LIMIT':'JSON_STRING_LIMIT');}const p=this.parent();if(this.isKey){if(p.keys.has(v))fail('JSON_DUPLICATE_KEY');if(p.keys.size>=this.limits.keys)fail('JSON_KEY_LIMIT');p.keys.add(v);p.key=v;p.state='colon';}else this.value('string',v);this.mode=null;this.token='';}
 primitiveDone(){const t=this.token;if(t==='true'||t==='false')this.value('boolean',t==='true');else if(t==='null')this.value('null');else if(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(t)&&Number.isFinite(Number(t)))this.value('number',Number(t));else fail('JSON_INVALID');this.mode=null;this.token='';}
 *feed(text){for(const c of text){if(this.mode==='string'){this.buffer(c);if(this.unicode){if(!/[a-fA-F0-9]/.test(c))fail('JSON_INVALID');this.unicode--;continue;}if(this.escape){this.escape=false;if(c==='u')this.unicode=4;else if(!'"\\/bfnrt'.includes(c))fail('JSON_INVALID');continue;}if(c==='\\'){this.escape=true;continue;}if(c==='"'){this.stringDone();}else if(c.charCodeAt(0)<32)fail('JSON_INVALID');else continue;}
 else {if(this.mode==='primitive'){if(!/[\s\[\]{},:]/.test(c)){if(this.token.length>=64)fail('JSON_INVALID');this.token+=c;continue;}this.primitiveDone();}
 if(' \r\n\t'.includes(c)){}else if(c==='"'){const p=this.parent();this.isKey=p?.kind==='object'&&['key','keyOrEnd'].includes(p.state);this.keep=this.isKey||this.selectString(this.path())===true;this.mode='string';this.token='';this.escape=false;this.unicode=0;this.buffer('"');}else if('[{}],:'.includes(c))this.punct(c);else{this.mode='primitive';this.token=c;}}
 while(this.events.length)yield this.events.shift();}}
 *finish(){if(this.mode==='primitive')this.primitiveDone();if(this.mode||this.stack.length||!this.root)fail('JSON_INVALID');while(this.events.length)yield this.events.shift();}
}
