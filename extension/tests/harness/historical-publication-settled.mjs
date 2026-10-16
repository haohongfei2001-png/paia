// Test-only metadata wait between the same two pre-callback acquisitions.
// This returns no authority or control snapshot; the original run must acquire
// and check everything again. No export/maintenance callback is invoked here.
export async function waitForHistoricalPublication(readFence,equal,{pause=()=>new Promise(resolve=>setTimeout(resolve,25)),now=Date.now}={}){
 const deadline=now()+1000;let previous=null;
 for(let sample=0;sample<40&&now()<deadline;sample++){
  const current=await readFence();
  if(!current.reservation&&previous&&!previous.reservation&&equal(previous,current))return true;
  previous=current;await pause();
 }
 return false;
}
