from pathlib import Path


def once(path, old, new, label):
    p = Path(path)
    s = p.read_text()
    n = s.count(old)
    assert n == 1, (label, n)
    p.write_text(s.replace(old, new, 1))


once(
    "extension/ui/archive.js",
    "recovery.hidden=true;await onboarding.load();if(seq!==serial)return;state=next;",
    "recovery.hidden=true;if(!state&&next.settings.consentVersion===1){state=next;render();}await onboarding.load();if(seq!==serial)return;state=next;",
    "archive startup",
)

once(
    "extension/background/service-worker.js",
    """function notifyArchiveChanged(type){
 const send=()=>{importNotification=null;void chrome.runtime.sendMessage?.({type:'ARCHIVE_CHANGED',cause:type}).catch(()=>{});};
 if(type==='IMPORT_COMMIT'){if(!importNotification)importNotification=setTimeout(send,500);}
 else {if(importNotification)clearTimeout(importNotification);send();}
}""",
    """function notifyArchiveChanged(type){
 const send=()=>{importNotification=null;return Promise.resolve(chrome.runtime.sendMessage?.({type:'ARCHIVE_CHANGED',cause:type})).catch(()=>{});};
 if(type==='IMPORT_COMMIT'){if(!importNotification)importNotification=setTimeout(()=>{void send();},500);return Promise.resolve();}
 if(importNotification)clearTimeout(importNotification);return send();
}""",
    "archive change notifier",
)

once(
    "extension/background/service-worker.js",
    """      await productSignals.observe(request,data,sender).catch(()=>{});
      sendResponse({ ok: true, data });
      const archiveMutation=request.type==='CAPTURE'?Number(data?.added)>0:request.type==='ENRICH_SOURCE_METADATA'?Number(data?.enriched)>0:true;""",
    """      await productSignals.observe(request,data,sender).catch(()=>{});
      const archiveMutation=request.type==='CAPTURE'?Number(data?.added)>0:request.type==='ENRICH_SOURCE_METADATA'?Number(data?.enriched)>0:true;
      if(request.type==='PURGE_SOURCE')await notifyArchiveChanged(request.type);
      sendResponse({ ok: true, data });""",
    "purge pre-response notifier",
)

once(
    "extension/background/service-worker.js",
    "      if(archiveMutation&&!localToolRequest(request.type)&&!['PAIA_MEMORY_STATUS','PAIA_MEMORY_BUILD','PAIA_MEMORY_SHARE','PAIA_MEMORY_ENTRIES'].includes(request.type)",
    "      if(request.type!=='PURGE_SOURCE'&&archiveMutation&&!localToolRequest(request.type)&&!['PAIA_MEMORY_STATUS','PAIA_MEMORY_BUILD','PAIA_MEMORY_SHARE','PAIA_MEMORY_ENTRIES'].includes(request.type)",
    "purge duplicate notifier",
)

once(
    "extension/ui/material-tray.js",
    """  if(this.data.state!=='ready')this.root.append(element('p','material-blocked',this.data.state==='blocked'?c('受阻材料已从可输出正文移除。请返回材料盘处理。','Blocked materials were removed from the output. Resolve them in the tray.'):message({code:'MEMORY_STALE'})));
  if(this.editing||this.data.state==='dirty'){""",
    """  if(['blocked','stale'].includes(this.data.state)){this.root.append(element('p','material-blocked',this.data.state==='blocked'?c('受阻材料已从可输出正文移除。请返回材料盘处理。','Blocked materials were removed from the output. Resolve them in the tray.'):message({code:'MEMORY_STALE'})));return;}
  if(this.editing||this.data.state==='dirty'){""",
    "blocked preview output fence",
)

once(
    "extension/tests/ux-r2-reader-revisit-chrome-e2e.test.mjs",
    "let p=await ready(h);await h.open({id:'uxr2-interleaved'",
    "let p=await ready(h);const chatPage=await h.open({id:'uxr2-interleaved'",
    "interleaved chat page",
)

once(
    "extension/tests/ux-r2-reader-revisit-chrome-e2e.test.mjs",
    "await rpc(p,'UPDATE_PREFERENCES',{changes:{appearance:'dark'}});await eventually(()=>p.evaluate(()=>globalThis.__uxR2Reads.length>=2));",
    "await h.send(chatPage,{id:'uxr2-interleaved-message-002',text:'UXR2_INTERLEAVED concurrent capture 2'});await eventually(async()=>(await h.state()).records.length===2);await eventually(()=>p.evaluate(()=>globalThis.__uxR2Reads.length>=2));",
    "first overlap trigger",
)

once(
    "extension/tests/ux-r2-reader-revisit-chrome-e2e.test.mjs",
    "await rpc(p,'UPDATE_PREFERENCES',{changes:{appearance:'light'}});await eventually(()=>p.evaluate(()=>globalThis.__uxR2Reads.length>=2));",
    "await h.send(chatPage,{id:'uxr2-interleaved-message-003',text:'UXR2_INTERLEAVED concurrent capture 3'});await eventually(async()=>(await h.state()).records.length===3);await eventually(()=>p.evaluate(()=>globalThis.__uxR2Reads.length>=2));",
    "second overlap trigger",
)
