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
  const window=await waitArchiveWindow(page,options);
  await window.click();
  return window;
}
