import {eventually} from './fake-chatgpt.mjs';

const visible=locator=>locator.isVisible().catch(()=>false);
const legacyWindow=(page,text)=>text
  ? page.locator('.conversation-document').filter({hasText:text}).first()
  : page.locator('.conversation-document').first();
const navigatorWindow=(page,text)=>text
  ? page.locator('.archive-navigator-window').filter({hasText:text}).first()
  : page.locator('.archive-navigator-window').first();

export async function waitArchiveWindow(page,{text=null,label='Archive window is reachable',timeout=30000}={}){
  const navigator=page.locator('#archive-navigator');
  await eventually(async()=>{
    if(await visible(navigator)){
      const window=navigatorWindow(page,text);
      if(await visible(window))return true;
      const collapsed=page.locator('.archive-navigator-group-toggle[aria-expanded="false"]:visible').first();
      if(await visible(collapsed)){await collapsed.click();return false;}
      const more=page.locator('.archive-navigator-more:visible').first();
      if(await visible(more)){await more.click();return false;}
      return false;
    }
    return visible(legacyWindow(page,text));
  },label,timeout);
  const window=navigatorWindow(page,text);
  return await visible(window)?window:legacyWindow(page,text);
}

export async function openArchiveWindow(page,options={}){
  const deadline=Date.now()+(options.timeout??30000);
  for(;;){
    const remaining=deadline-Date.now();
    if(remaining<=0)throw new Error(options.label||'Archive window is reachable');
    const window=await waitArchiveWindow(page,{...options,timeout:remaining});
    try{
      await window.click({timeout:Math.min(1000,Math.max(1,deadline-Date.now()))});
      return window;
    }catch(error){
      // A late membership observation can move an unselected Window into a
      // collapsed group between discovery and click. Re-discover through normal
      // controls and retain the full action budget for layout stabilization.
      // A persistently unclickable target still fails at the original deadline.
      if(error.name!=='TimeoutError'||Date.now()>=deadline)throw error;
    }
  }
}
