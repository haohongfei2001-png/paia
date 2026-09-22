import {summarizeDiscovery} from './probe-core.js';
const $=id=>document.getElementById(id);
const labels=['project','projectReload','ordinary','projectReturn'];
const captures={};
const salt=[...crypto.getRandomValues(new Uint8Array(16))].map(v=>v.toString(16).padStart(2,'0')).join('');
const runtime=globalThis.PAIA_CPR00_RUNTIME_CHECK&&typeof globalThis.PAIA_CPR00_RUNTIME_CHECK==='object'
  ?globalThis.PAIA_CPR00_RUNTIME_CHECK:{runtimeParity:false};

async function probeMostRecentChatGPT(label){
  const tabs=await chrome.tabs.query({});
  const replies=[];
  await Promise.all(tabs.filter(tab=>Number.isSafeInteger(tab.id)).map(async tab=>{
    try{
      const reply=await Promise.race([
        chrome.tabs.sendMessage(tab.id,{type:'CPR00_PROJECT_PROBE',salt}),
        new Promise((_,reject)=>setTimeout(()=>reject(Error('timeout')),1800))
      ]);
      if(reply?.ok===true&&reply.data?.schemaVersion===1)replies.push({data:reply.data,lastAccessed:Number(tab.lastAccessed)||0});
    }catch{}
  }));
  if(!replies.length)throw Error('NO_CHATGPT_PROBE');
  let eligible=replies;
  if(label==='project')eligible=replies.filter(row=>row.data?.route?.kind==='project_chat');
  if(['projectReload','projectReturn'].includes(label)&&captures.project?.route?.conversationDigest){
    eligible=replies.filter(row=>row.data?.route?.conversationDigest===captures.project.route.conversationDigest);
  }
  if(label==='ordinary')eligible=replies.filter(row=>row.data?.route?.kind==='plain_chat'&&row.data?.route?.projectDigest==null);
  if(!eligible.length)throw Error('TARGET_CHAT_NOT_FOUND');
  eligible.sort((a,b)=>b.lastAccessed-a.lastAccessed);
  return {snapshot:eligible[0].data,responders:replies.length};
}

function renderState(){
  for(const label of labels){
    const node=$('state-'+label);
    node.textContent=captures[label]?'已采集':'未采集';
  }
  $('finish').disabled=!labels.every(label=>captures[label]);
}

for(const label of labels){
  $('capture-'+label).onclick=async()=>{
    const button=$('capture-'+label),status=$('status');
    button.disabled=true;status.textContent='正在读取最近使用的 ChatGPT 标签页…';
    try{
      const {snapshot,responders}=await probeMostRecentChatGPT(label);
      captures[label]=snapshot;
      status.textContent=responders>1
        ?`已采集。检测到 ${responders} 个可响应的 ChatGPT 标签页，使用最近访问的一个。`
        :'已采集。';
      renderState();
    }catch{
      status.textContent='未找到可响应的 ChatGPT 页面。请刷新目标 ChatGPT 标签页，等待几秒后再试。';
    }finally{button.disabled=false;}
  };
}

$('finish').onclick=()=>{
  const report=summarizeDiscovery({runtime,captures});
  const line='PAIA_CPR00_PROJECT_DISCOVERY '+JSON.stringify(report);
  $('result').textContent=JSON.stringify(report,null,2);
  $('verdict').textContent=report.contractCandidateReady
    ?'候选证据链完整 — 复制脱敏结果发回 ChatGPT。'
    :'候选证据链还不完整 — 复制结果发回 ChatGPT 诊断，不要自行调整 Project。';
  $('copy-result').disabled=false;
  $('copy-result').onclick=async()=>{await navigator.clipboard.writeText(line);$('copy-result').textContent='已复制';};
};
$('runtime').textContent=runtime.runtimeParity
  ?'当前 Chrome PAIA 与本次 main release 一致。'
  :'当前 Chrome PAIA 与本次 main release 不一致；结果会 fail closed。';
renderState();
