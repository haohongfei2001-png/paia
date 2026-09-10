/* Passive historical JSON contract. Never inspect message content or non-user scalars. */
(() => {
  'use strict';
  const ID=/^[A-Za-z0-9_-]{8,128}$/;
  const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  const scalar=v=>v==null?{state:'missing',value:null}:typeof v==='number'&&Number.isFinite(v)?{state:'value',value:v}:{state:'invalid',value:null};
  const omit=k=>['id','create_time','update_time','role','author','message','parent','children'].includes(k)||/content|parts|text|title|attachment|html|body|draft|token|authorization|cookie|credential|password|secret|header|session/i.test(k);
  function parse(root) {
    try {
      if(!object(root))return null;
      let nodes=0, found=0;const rows=[];
      function collection(value,chat,mapping) {
        if(typeof chat!=='string'||!ID.test(chat)||(mapping?!object(value):!Array.isArray(value)))throw 0;
        const entries=Object.values(value);if(!entries.length||entries.length>2000)throw 0;
        found++;if(found>1)throw 0;
        for(const node of entries) {
          // The existing historical candidate contract also recognizes wrapped
          // entries in an explicit messages array; never infer identity from text.
          const m=mapping||object(node)&&Object.hasOwn(node,'message')?node?.message:node;
          if(m===null)continue; // Explicit empty root nodes have no message.
          if(!object(m)||!object(m.author)||typeof m.author.role!=='string')throw 0;
          if(m.author.role!=='user')continue;
          if(typeof m.id!=='string'||!ID.test(m.id))throw 0;
          rows.push({chat,id:m.id,create:scalar(m.create_time),update:scalar(m.update_time)});
        }
      }
      function walk(value,depth,identity) {
        if(!object(value))return;
        if(depth>3||++nodes>128)throw 0;
        const keys=Object.keys(value);if(keys.length>64)throw 0;
        let chat=identity;
        if(Object.hasOwn(value,'conversation_id')) {
          if(typeof value.conversation_id!=='string'||!ID.test(value.conversation_id))throw 0;
          chat=value.conversation_id;
        }
        for(const key of keys) {
          if(key==='mapping'||key==='messages') {collection(value[key],chat,key==='mapping');continue;}
          if(key==='conversation_id'||omit(key))continue;
          // Only bounded object envelopes; unknown arrays are never message collections.
          const child=value[key];if(object(child))walk(child,depth+1,chat);
        }
      }
      walk(root,0,null);
      return found===1&&rows.length?{contract:'chatgpt-history-user-v1',rows}:null;
    } catch {return null;}
  }
  // Formalize the diagnostic's structural collections without trusting its
  // candidate flag. The known named contract above remains unchanged.
  function parseStructural(root,currentChat,now=Date.now()) {
    try {
      if(!object(root)||typeof currentChat!=='string'||!ID.test(currentChat))return null;
      let nodes=0,found=0;const rows=[],seen=new Set();
      const seconds=v=>typeof v==='number'&&Number.isFinite(v)&&v>=946684800&&v*1000<=now;
      const unwrap=v=>object(v)&&Object.hasOwn(v,'message')?v.message:v;
      const shaped=v=>object(v)&&object(v.author)&&Object.hasOwn(v.author,'role')&&Object.hasOwn(v,'id');
      function walk(value,depth,identity) {
        if(value===null||typeof value!=='object')return;
        if(depth>4||++nodes>128)throw 0;
        const keys=Object.keys(value);if(keys.length>64)throw 0;
        let chat=identity;
        if(Object.hasOwn(value,'conversation_id')) {
          if(value.conversation_id!==currentChat)throw 0;
          chat=currentChat;
        }
        const childKeys=keys.filter(k=>k!=='conversation_id'&&!omit(k));
        const entries=childKeys.map(k=>value[k]);
        if(entries.filter(v=>shaped(unwrap(v))).length>=2) {
          // A collection cannot hide additional entries under excluded field names.
          if(childKeys.length!==keys.filter(k=>k!=='conversation_id').length||
             chat!==currentChat||entries.length<2||entries.length>64||++found!==1)throw 0;
          for(const entry of entries) {
            const wrapped=object(entry)&&Object.hasOwn(entry,'message'),m=unwrap(entry);
            if(!shaped(m)||depth+(wrapped?3:2)>4||++nodes>128||Object.keys(m).length>64||Object.keys(m.author).length>64)throw 0;
            const role=m.author.role;
            if(!['user','assistant','system','developer','tool'].includes(role))throw 0;
            if(role!=='user')continue;
            if(typeof m.id!=='string'||!ID.test(m.id)||seen.has(m.id)||!seconds(m.create_time))throw 0;
            const update=m.update_time;
            if(update!=null&&(!seconds(update)||update<m.create_time))throw 0;
            seen.add(m.id);rows.push({chat,id:m.id,create:scalar(m.create_time),update:scalar(update)});
          }
          return; // Never descend into message bodies or assistant metadata.
        }
        if(Array.isArray(value))throw 0; // Unknown arrays must be complete message collections.
        for(const child of entries)walk(child,depth+1,chat);
      }
      walk(root,0,null);
      return found===1&&rows.length?{contract:'chatgpt-history-user-v1',rows}:null;
    }catch{return null;}
  }
  globalThis.ChatGPTHistoryContract=Object.freeze({parse,parseStructural});
})();
