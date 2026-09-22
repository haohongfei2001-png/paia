import {eventually} from './fake-chatgpt.mjs';

const visible=locator=>locator.isVisible().catch(()=>false);
const legacyWindow=(page,text)=>text
  ? page.locator('.conversation-document').filter({hasText:text}).first()
  : page.locator('.conversation-document').first();
const navigatorWindow=(page,text)=>text
  ? page.locator('.archive-navigator-window').filter({hasText:text}).first()
  : page.locator('.archive-navigator-window').first();
const NAVIGATOR_CONTROL_TIMEOUT=3000;
const NAVIGATOR_WINDOW_ACTION_TIMEOUT=5000;
const tryNavigatorControl=async locator=>{
  try{await locator.click({timeout:NAVIGATOR_CONTROL_TIMEOUT});return true;}
  catch(error){if(error.name==='TimeoutError')return false;throw error;}
};

export async function waitArchiveWindow(page,{text=null,label='Archive window is reachable',timeout=30000}={}){
  const navigator=page.locator('#archive-navigator');
  await eventually(async()=>{
    if(await visible(navigator)){
      const window=navigatorWindow(page,text);
      if(await visible(window))return true;
      const collapsed=page.locator('.archive-navigator-group-toggle[aria-expanded="false"]:visible').first();
      if(await visible(collapsed)){await tryNavigatorControl(collapsed);return false;}
      const more=page.locator('.archive-navigator-more:visible').first();
      if(await visible(more)){await tryNavigatorControl(more);return false;}
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
      // Discovery and actionability are separate phases: a Window that becomes
      // visible near the discovery deadline still gets one bounded normal click
      // budget to settle after asynchronous Navigator regrouping/repaint.
      await window.click({timeout:NAVIGATOR_WINDOW_ACTION_TIMEOUT});
      return window;
    }catch(error){
      // A late membership observation can move an unselected Window into a
      // collapsed group between discovery and click. Re-discover through normal
      // controls while the original discovery deadline still has budget.
      if(error.name!=='TimeoutError'||Date.now()>=deadline)throw error;
    }
  }
}
