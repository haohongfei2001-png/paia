/* MAIN document_start: early bounded buffer, independent of route/content startup. */
(() => {
  'use strict';
  const C=globalThis.ParityContract, original=window.fetch, clone=Response.prototype.clone;
  const buffer=new C.Buffer(),readers=new Set();let stopped=false,manuallyStopped=false,jobs=0,generation=0;
  const stats={observed:0,accepted:0,rejected:0};
  const add=k=>{stats[k]=Math.min(1000000,stats[k]+1);};
  function emit(chat,drain=false){
    window.postMessage({type:'parity-data-v1',chat,rows:stopped?[]:buffer.snapshot(chat),stats:{...stats},drain,stopped},C.ORIGIN);
  }
  function current(){return location.pathname.match(/^\/(?:g\/[A-Za-z0-9_-]+\/)?c\/([^/]+)\/?$/)?.[1]||'';}
  async function inspect(response,chat){
    let reader,timer;const version=generation;add('observed');
    try{
      if(stopped||jobs>=2||C.endpoint(response.url)!==chat||response.redirected||!response.ok||
         response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json'||
         Number(response.headers.get('content-length'))>C.BYTES)throw 0;
      // Runs synchronously before the page's fulfillment handler can consume original.
      const copy=Reflect.apply(clone,response,[]);if(!copy.body)throw 0;
      reader=copy.body.getReader();readers.add(reader);jobs++;
      let text='',bytes=0,expired=false;const decoder=new TextDecoder();
      timer=setTimeout(()=>{expired=true;void reader.cancel().catch(()=>{});},5000);
      while(true){const part=await reader.read();if(stopped||expired||generation!==version)throw 0;if(part.done)break;
        bytes+=part.value.byteLength;if(bytes>C.BYTES)throw 0;text+=decoder.decode(part.value,{stream:true});}
      text+=decoder.decode();if(!C.boundedJSON(text))throw 0;
      const rows=C.parse(JSON.parse(text),chat);if(!rows||!buffer.merge(chat,rows))throw 0;
      add('accepted');
    }catch{if(!stopped&&generation===version)add('rejected');}
    finally{clearTimeout(timer);if(reader){readers.delete(reader);jobs--;void reader.cancel().catch(()=>{});}if(!stopped&&generation===version)emit(chat);}
  }
  window.fetch=function(...args){
    const version=generation;
    const result=Reflect.apply(original,this,args);
    if(!stopped)try{
      const input=args[0];const url=typeof input==='string'?input:input instanceof URL?input.href:input instanceof Request?input.url:null;
      const chat=C.endpoint(url);if(chat)void result.then(response=>{if(!stopped&&version===generation)void inspect(response,chat);},()=>{}).catch(()=>{});
    }catch{}
    return result;
  };
  function stop(){generation++;stopped=true;buffer.clear();for(const reader of readers)void reader.cancel().catch(()=>{});}
  window.addEventListener('message',event=>{
    if(event.source!==window||event.origin!==C.ORIGIN)return;
    const d=event.data;
    if(d?.type==='parity-drain-v1'&&C.ID.test(d.chat||'')&&current()===d.chat)emit(d.chat,true);
    if(d?.type==='parity-stop-v1'){manuallyStopped=true;stop();emit(current());}
  });
  let timer=setInterval(()=>buffer.prune(),60000);
  window.addEventListener('pagehide',()=>{stop();clearInterval(timer);});
  window.addEventListener('pageshow',event=>{if(event.persisted&&!manuallyStopped){buffer.clear();stopped=false;timer=setInterval(()=>buffer.prune(),60000);}});
})();
