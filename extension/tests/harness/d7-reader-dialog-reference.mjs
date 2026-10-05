// Approved original SVGs remain offline reference images, never production DOM.
import assert from 'node:assert/strict';
import {openD7Reference} from './d7-archive-reference.mjs';
export async function openReaderDialogReference(h,screen,theme){
 assert.ok(['A07','A08'].includes(screen));const reference=await openD7Reference(h,{screen,width:1440,theme});
 const master=await reference.page.evaluate(()=>{
  const card=document.querySelector('svg>rect[height="650"][rx="10"]'),title=card?.nextElementSibling;
  if(!card||title?.tagName!=='text')throw Error('Expected unchanged A07/A08 modal and its heading');
  return {width:Number(card.getAttribute('width')),padding:Number(title.getAttribute('x'))-Number(card.getAttribute('x')),radius:Number(card.getAttribute('rx')),headingSize:Number(title.getAttribute('font-size')),headingWeight:title.getAttribute('font-weight'),headingFamily:title.getAttribute('font-family')};
 });
 assert.deepEqual(master,{width:screen==='A07'?700:860,padding:32,radius:10,headingSize:23,headingWeight:'500',headingFamily:'Georgia, Noto Serif CJK SC, serif'},'the approved SVG, not legacy production, declares the replacement');
 return {...reference,master,screen,theme};
}
export function readerDialogContract(reference,width){
 const {master,theme}=reference,dark=theme==='dark';
 return {authority:'D6.2 approved A07/A08 SVG + RESPONSIVE + DESIGN_SYSTEM',name:reference.name,sha256:reference.sha256,paletteDerived:reference.paletteDerived,referenceWidth:1440,independentReflow:width===1440,
  surface:{width:Math.min(master.width,width-32),padding:width<768?'20px 16px':`${master.padding}px`,borderWidth:'1px',borderRadius:`${master.radius}px`,background:dark?'rgb(23, 29, 40)':'rgb(255, 255, 255)',color:dark?'rgb(232, 237, 247)':'rgb(23, 35, 60)',boxShadow:'rgba(23, 35, 60, 0.18) 0px 18px 60px 0px'},
  heading:{fontSize:`${master.headingSize}px`,fontWeight:master.headingWeight,lineHeight:'32px'},
  caption:{fontSize:'12px',lineHeight:'18px',color:dark?'rgb(165, 180, 203)':'rgb(104, 119, 142)'},pair:{gap:width<1024?'14px':'40px'},
  retainedOwnerDifferences:['Current target, real revision dates, before/after actions and page coverage stay native; no illustrative tabs are fabricated.','Saved 17px standard prose preference remains authoritative. Caption and comparison spacing retain existing owner values.','Long content determines modal height within the existing viewport-minus48px bound; the drawing is not a fixed-height app canvas.','Compact frames derive from RESPONSIVE, not an independently drawn or scaled-down A07/A08 artboard.']};
}
