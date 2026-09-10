/* Standalone experiment; no Archive imports, content fields, or persistence. */
(() => {
  'use strict';
  const ORIGIN='https://chatgpt.com', ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const LIMIT=2000, TTL=600000, MAX_CHATS=8, BYTES=2097152;
  const validTime=(t,now=Date.now())=>typeof t==='number'&&Number.isFinite(t)&&t>=946684800&&t*1000<=now;
  function endpoint(value){
    try{const u=new URL(value,ORIGIN);if(u.origin!==ORIGIN||u.username||u.password||u.search||u.hash)return null;
      const part=u.pathname.match(/^\/backend-api\/conversation\/([^/]+)$/)?.[1];return ID.test(part||'')?part:null;
    }catch{return null;}
  }
  function parse(root,chat,now=Date.now()){
    if(!ID.test(chat)||!root||typeof root!=='object'||Array.isArray(root))return null;
    for(const key of ['conversation_id','id'])if(root[key]!==undefined&&root[key]!==chat)return null;
    const mapping=root.mapping;if(!mapping||typeof mapping!=='object'||Array.isArray(mapping))return null;
    const entries=Object.values(mapping);if(entries.length>4000)return null;
    const rows=[],seen=new Set();
    for(const node of entries){
      const m=node?.message;if(m==null)continue;
      const role=m.author?.role;if(!['user','assistant','system','tool'].includes(role))return null;
      if(role!=='user')continue;
      if(!ID.test(m.id||'')||seen.has(m.id))return null;seen.add(m.id);
      if(seen.size>LIMIT)return null;
      if(!validTime(m.create_time,now))continue;
      rows.push({id:m.id,time:m.create_time});
    }
    return rows;
  }
  // Scan only JSON delimiters outside strings before parsing; never traverse message content.
  function boundedJSON(text){
    let depth=0,nodes=0,string=false,escape=false;
    for(const c of text){
      if(string){if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')string=false;continue;}
      if(c==='"')string=true;
      else if(c==='{'||c==='['){if(++depth>20||++nodes>30000)return false;}
      else if(c==='}'||c===']')depth--;
      else if(c===','&&++nodes>30000)return false;
    }
    return true;
  }
  function validRows(rows,now=Date.now()){
    if(!Array.isArray(rows)||rows.length>LIMIT)return false;
    const seen=new Set();
    return rows.every(r=>r&&Object.keys(r).every(k=>['id','time'].includes(k))&&ID.test(r.id||'')&&!seen.has(r.id)&&Boolean(seen.add(r.id))&&(r.time===null||validTime(r.time,now)));
  }
  class Buffer {
    constructor(){this.chats=new Map();}
    prune(now=Date.now()){for(const [chat,b] of this.chats)if(now-b.at>=TTL)this.chats.delete(chat);}
    merge(chat,rows,now=Date.now()){
      this.prune(now);if(!ID.test(chat)||!validRows(rows,now))return false;
      if(!rows.length)return true;
      let b=this.chats.get(chat);
      if(!b){if(this.chats.size>=MAX_CHATS)this.chats.delete(this.chats.keys().next().value);b={at:now,rows:new Map()};this.chats.set(chat,b);}
      if(new Set([...b.rows.keys(),...rows.map(r=>r.id)]).size>LIMIT)return false;
      for(const r of rows)b.rows.set(r.id,b.rows.has(r.id)&&b.rows.get(r.id)!==r.time?null:r.time);
      b.at=now;return true;
    }
    snapshot(chat,now=Date.now()){this.prune(now);return [...(this.chats.get(chat)?.rows||[])].map(([id,time])=>({id,time}));}
    clear(){this.chats.clear();}
  }
  globalThis.ParityContract=Object.freeze({ORIGIN,ID,LIMIT,TTL,MAX_CHATS,BYTES,validTime,endpoint,parse,boundedJSON,validRows,Buffer});
})();
