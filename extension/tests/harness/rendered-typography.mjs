// Read actual Chromium glyph fonts as well as CSS families. A declared fallback
// stack alone does not establish which CJK face painted a page.
import {eventually} from './fake-chatgpt.mjs';
import {sampleRenderedTypography} from './rendered-typography-sample.mjs';
export async function renderedTypography(page,selectors){
 const client=await page.context().newCDPSession(page),rows=[];
 try{
  await client.send('DOM.enable');await client.send('CSS.enable');
  for(const selector of selectors){
   let sample;
   // A real navigator refresh can replace the target between DOM and CSS calls.
   // Retry the whole coherent sample, never accept missing nodes or mixed rows.
   await page.locator(selector).first().waitFor({state:'visible'});
   await eventually(async()=>{sample=await sampleRenderedTypography(page,client,selector);return !!sample;},'current typography target: '+selector);
   rows.push(sample);
  }
  return rows;
 }finally{await client.detach();}
}
