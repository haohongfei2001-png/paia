import {openD7Reference} from './d7-archive-reference.mjs';

// The approved T01/T02/T04 masters have a 1440px artboard. Compact captures
// retain that master and test its documented responsive rules, never a scaled mock.
export const thoughtLayout=width=>({rail:width>=1280?184:width>=1024?160:width>=768?64:0,gutter:width<768?20:44,cap:936});
export const thoughtPalette=theme=>theme==='dark'?{text:'rgb(232, 237, 247)',muted:'rgb(176, 189, 208)',quiet:'rgb(165, 180, 203)',soft:'rgb(32, 41, 57)'}:{text:'rgb(23, 35, 60)',muted:'rgb(99, 114, 138)',quiet:'rgb(104, 119, 142)',soft:'rgb(244, 246, 250)'};
export async function openThoughtReference(h,screen){
 const references=new Map();
 return {async capture(theme,path){let reference=references.get(theme);if(!reference){reference=await openD7Reference(h,{screen,width:1440,theme});references.set(theme,reference);}await reference.page.screenshot({path});const {page,...metadata}=reference;return {...metadata,contract:'D6.2',comparison:'1440px approved master; other widths are responsive derivatives; real chronology and saved reading preferences remain authoritative'};},async close(){for(const reference of references.values())await reference.page.close();}};
}
