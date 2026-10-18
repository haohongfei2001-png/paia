import assert from 'node:assert/strict';

// Serialize into the original private production frame for native evidence.
// Rectangles/spacing only; no expression text or private identity is returned.
export function promptRowViewportGeometry(){
 const box=node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
 const list=document.getElementById('list'),style=getComputedStyle(list);
 return {card:box(document.getElementById('card')),header:box(document.querySelector('header')),list:box(list),scrollTop:list.scrollTop,padding:[parseFloat(style.paddingTop),parseFloat(style.paddingBottom)],margin:[parseFloat(style.marginTop),parseFloat(style.marginBottom)],rows:[...list.querySelectorAll('.row')].map(box)};
}
export function assertSixCompletePromptRows(value){
 const near=(a,b,label)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<.02,`${label}: ${a} != ${b}`);
 const {card,header,list,rows}=value;
 assert.ok(rows.length>=7,'many-row control must contain at least seven real rows');
 near(value.scrollTop,0,'default settled view');near(list.height,264,'six-row scrollport');
 near(value.padding[0],0,'no scrolling top breathing space');near(value.padding[1],0,'no scrolling bottom breathing space');
 near(value.margin[0],7,'non-scrolling top breathing space');near(value.margin[1],7,'non-scrolling bottom breathing space');
 near(list.y-card.y,8,'border plus top breathing space');near(header.y-(list.y+list.height),7,'bottom breathing space outside scrollport');near(header.height,48,'existing bottom tools');
 const intersections=rows.map(row=>Math.max(0,Math.min(row.y+row.height,list.y+list.height)-Math.max(row.y,list.y)));
 assert.equal(intersections.filter(height=>height>.02).length,6,'no partial seventh row may paint at the default settled view');
 for(let i=0;i<6;i++){near(rows[i].height,44,'complete row height');near(rows[i].y,list.y+44*i,'equal row placement');near(intersections[i],44,'whole visible row');near(rows[i].width,rows[0].width,'equal row width');}
 for(let i=6;i<rows.length;i++)near(intersections[i],0,'additional rows stay outside the native scrollport');
}
