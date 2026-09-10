(() => {
 'use strict';
 const consent=document.getElementById('consent'),file=document.getElementById('file'),choose=document.getElementById('choose'),cancel=document.getElementById('cancel'),status=document.getElementById('status'),summary=document.getElementById('summary');
 const codes=new Set(['CONSENT_REQUIRED','CANCELLED','FILE_INVALID','ZIP_INVALID','ZIP_MULTIDISK','ZIP64_UNSUPPORTED','ZIP_NO_CONVERSATIONS','ZIP_ENCRYPTED','ZIP_FLAGS','ZIP_COMPRESSION','ZIP_RATIO','ZIP_INTEGRITY','UTF8_INVALID','JSON_INVALID','JSON_DEPTH','JSON_DUPLICATE_KEY','JSON_KEY_LIMIT']);
 let epoch=0,running=false;
 function clear(){epoch++;running=false;file.value='';summary.textContent='';summary.hidden=true;cancel.disabled=true;choose.disabled=!consent.checked;}
 consent.addEventListener('change',()=>{clear();status.textContent=consent.checked?'同意仅适用于下一次主动选择的文件。':'等待本次读取同意。文件不会自动选择。';});
 choose.addEventListener('click',event=>{if(!event.isTrusted||!navigator.userActivation.isActive||!consent.checked||running)return;file.click();});
 cancel.addEventListener('click',()=>{clear();consent.checked=false;choose.disabled=true;status.textContent='已停止并清空内存中的结果。没有导入或保存。';});
 file.addEventListener('change',async()=>{
  const selected=file.files?.[0];if(!selected||!consent.checked||running)return;
  clear();const mine=epoch;running=true;choose.disabled=true;cancel.disabled=false;status.textContent='正在本机检查结构。没有写入档案。';
  try{
   const result=await PAIAExportProbe.sample(selected,{consent:true,shouldStop:()=>mine!==epoch});
   if(mine!==epoch)return;
   summary.textContent=JSON.stringify(result,null,2);summary.hidden=false;
   status.textContent=result.status==='SAMPLE_LIMIT'?'已取得有限结构摘要；到达采样上限，尚未验证整个文件。':result.status==='UNSUPPORTED_STRUCTURE'?'该样本结构不支持当前检查规则；未导入。':'结构摘要已生成；整个导出包与正式导入规则尚未验证，未导入。';
  }catch(error){if(mine!==epoch)return;status.textContent='检查停止：'+(codes.has(error.message)?error.message:'READ_FAILED')+'。未导入或保存。';}
  finally{if(mine===epoch){running=false;consent.checked=false;choose.disabled=true;cancel.disabled=false;}}
 });
 window.addEventListener('pagehide',clear);
})();
