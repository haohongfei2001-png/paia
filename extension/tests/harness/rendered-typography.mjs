// Read actual Chromium glyph fonts as well as CSS families. A declared fallback
// stack alone does not establish which CJK face painted a page.
export async function renderedTypography(page,selectors){
 const client=await page.context().newCDPSession(page),rows=[];
 try{
  await client.send('DOM.enable');await client.send('CSS.enable');
  const {root}=await client.send('DOM.getDocument',{depth:0});
  for(const selector of selectors){
   const {nodeId}=await client.send('DOM.querySelector',{nodeId:root.nodeId,selector});
   if(!nodeId)throw Error('Missing typography target: '+selector);
   const {fonts}=await client.send('CSS.getPlatformFontsForNode',{nodeId});
   const geometry=await page.locator(selector).first().evaluate(node=>{
    const s=getComputedStyle(node),b=node.getBoundingClientRect(),r=document.createRange();r.selectNodeContents(node);
    const rect=x=>({x:x.x,y:x.y,width:x.width,height:x.height,right:x.right,bottom:x.bottom});
    return {text:node.textContent,family:s.fontFamily,size:s.fontSize,weight:s.fontWeight,lineHeight:s.lineHeight,synthesis:s.fontSynthesis,box:rect(b),textRects:[...r.getClientRects()].map(rect)};
   });
   rows.push({selector,...geometry,fonts});
  }
  return rows;
 }finally{await client.detach();}
}
