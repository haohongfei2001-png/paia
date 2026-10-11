// All private intent data comes from the authenticated original worker owner.
// Notifications contain only an identity; the actual receiver claims once.
export function installArchiveArrival({api,request,startup,arrive,unavailable}){
 let busy=false,again=false;
 const run=async()=>{
  if(busy){again=true;return;}busy=true;
  try{
   await startup;
   do{
    again=false;let intent;
    try{intent=await request('PAIA_ARCHIVE_ARRIVAL_READY');}catch{continue;}
    if(!intent)continue;
    let status='unavailable';
    try{status=await arrive(intent,async()=>{
     const result=await request('PAIA_ARCHIVE_ARRIVAL_QUALIFY',{requestId:intent.requestId});
     if(result?.qualified!==true)throw new Error('arrival_unavailable');
    });}catch{unavailable();}
    try{await request('PAIA_ARCHIVE_ARRIVAL_RESULT',{requestId:intent.requestId,status});}catch{unavailable();}
   }while(again);
  }finally{busy=false;}
 };
 api.runtime.onMessage.addListener(message=>{if(message?.type==='PAIA_ARCHIVE_ARRIVAL_AVAILABLE')void run();});
 void run();
 return {wake:run};
}
