// One coherent CDP glyph/geometry sample. A remounted selector invalidates the
// entire sample; callers may retry within their existing bounded wait.
export async function sampleRenderedTypography(page,client,selector){
 try{
  // getDocument resets Chromium's frontend node bindings. Acquire it once per
  // attempt so the final identity fence compares IDs in the same binding set.
  const {root}=await client.send('DOM.getDocument',{depth:0});
  const currentNode=async()=>(await client.send('DOM.querySelector',{nodeId:root.nodeId,selector})).nodeId;
  const nodeId=await currentNode();if(!nodeId)return null;
  const {fonts}=await client.send('CSS.getPlatformFontsForNode',{nodeId});
  const geometry=await page.locator(selector).first().evaluate(node=>{
   const s=getComputedStyle(node),b=node.getBoundingClientRect(),r=document.createRange();r.selectNodeContents(node);
   const rect=x=>({x:x.x,y:x.y,width:x.width,height:x.height,right:x.right,bottom:x.bottom});
   return {text:node.textContent,family:s.fontFamily,size:s.fontSize,weight:s.fontWeight,lineHeight:s.lineHeight,synthesis:s.fontSynthesis,box:rect(b),textRects:[...r.getClientRects()].map(rect)};
  });
  // Geometry comes from the live selector, so require that it still identifies
  // the exact node whose actual glyph fonts were measured above.
  if(await currentNode()!==nodeId)return null;
  return {selector,...geometry,fonts};
 }catch(error){
  if(/Protocol error \((?:DOM\.querySelector|CSS\.getPlatformFontsForNode)\): Could not find node with given id/.test(String(error?.message)))return null;
  throw error;
 }
}
