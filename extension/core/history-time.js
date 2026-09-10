/* Minimal user time evidence; shared validation in document and trusted background. */
(() => {
  'use strict';
  const LIMIT=2000, REASONS=['MISSING','INVALID','CONFLICT','ORDER','UPDATE','LIMIT'];
  const validID=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{8,128}$/.test(v);
  const validSeconds=(v,now)=>typeof v==='number'&&Number.isFinite(v)&&v>=946684800&&v*1000<=now;
  const blocked=reason=>({state:'blocked',reason});
  const unavailable=e=>e?.state==='blocked'&&['MISSING','INVALID','LIMIT'].includes(e.reason);
  function sanitize(e,now=Date.now()) {
    if(e?.state==='blocked'&&REASONS.includes(e.reason))return blocked(e.reason);
    if(e?.state!=='valid')return null;
    if(!validSeconds(e.createTime,now))return blocked('INVALID');
    if(e.updateTime!==null&&!validSeconds(e.updateTime,now))return blocked('INVALID');
    if(e.updateTime!==null&&e.updateTime<e.createTime)return blocked('UPDATE');
    return {state:'valid',createTime:e.createTime,updateTime:e.updateTime};
  }
  function scalar(v) {
    if(!v||!['missing','invalid','value'].includes(v.state))return null;
    if(v.state==='value'?(typeof v.value!=='number'||!Number.isFinite(v.value)):v.value!==null)return null;
    return {state:v.state,value:v.value};
  }
  class Model {
    constructor(){this.reset();}
    reset(chat=''){this.chat=chat;this.rows=new Map();this.limited=false;}
    ingest(batch,now=Date.now()) {
      if(batch?.contract!=='chatgpt-history-user-v1'||!Array.isArray(batch.rows)||batch.rows.length>LIMIT)return false;
      const rows=[];
      for(const r of batch.rows) {
        const create=scalar(r?.create),update=scalar(r?.update);
        if(!validID(r?.chat)||!validID(r.id)||!create||!update)return false;
        if(r.chat!==this.chat)continue;
        const e=create.state==='missing'?blocked('MISSING'):create.state!=='value'?blocked('INVALID'):update.state==='invalid'?blocked('INVALID'):sanitize({state:'valid',createTime:create.value,updateTime:update.value},now);
        rows.push({id:r.id,e});
      }
      for(const {id,e} of rows) {
        const prior=this.rows.get(id);
        if(prior?.state==='blocked'&&!unavailable(prior))continue;
        if(prior?.state==='valid'&&unavailable(e))continue;
        if(prior?.state==='valid'&&e.state==='valid'&&prior.createTime!==e.createTime)this.rows.set(id,blocked('CONFLICT'));
        else if(prior||this.rows.size<LIMIT)this.rows.set(id,e);
        else this.limited=true;
      }
      return true;
    }
    match(ids,now=Date.now()) {
      const result=new Map();let previous=null,inverted=false;
      for(const id of ids) {
        const row=this.rows.get(id);if(!row){previous=null;continue;}
        const e=sanitize(row,now);result.set(id,e);
        if(e.state!=='valid'){previous=null;continue;}
        if(previous!==null&&e.createTime<previous)inverted=true;
        previous=e.createTime;
      }
      if(inverted||this.limited||ids.length>LIMIT)for(const id of result.keys())result.set(id,blocked(inverted?'ORDER':'LIMIT'));
      return result;
    }
  }
  globalThis.HistoryTime=Object.freeze({sanitize,validSeconds,unavailable,Model});
})();
