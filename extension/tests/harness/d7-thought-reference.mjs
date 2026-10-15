import {whitePalette,whiteReference} from './white-refinement-reference.mjs';

// The approved T01/T02/T04 masters have a 1440px artboard. Compact captures
// retain that master and test its documented responsive rules, never a scaled mock.
export const thoughtLayout=width=>({rail:width>=1280?184:width>=1024?160:width>=768?64:0,gutter:width<768?20:44,cap:936});
export const thoughtPalette=theme=>{const p=whitePalette(theme);return {text:p.heading,title:p.title,muted:p.caption,quiet:p.caption,chapter:p.chapter,continuation:theme==='dark'?'rgb(116, 146, 185)':p.quiet,soft:p.search};};
export const thoughtRootLayout=width=>({...thoughtLayout(width),gutter:width>1250?62:width>1000?34:width>760?28:width>530?22:16,top:width>1000?46:width>760?36:width>530?31:28,headingSize:width>1000?34:width>760?30:26,titleSize:width>1250?17:width>760?15:width>530?14:16,columns:width>1000?3:width>530?2:1,searchWidth:width>1000?282:width>760?220:165});
export const thoughtWhiteAuthority={contract:'TL-PT1-UI-1.3',original:whiteReference.original,historicalReference:'D6.2 T01 compact list superseded; T02/T04 retained geometry only',darkTranslation:'Final original dark semantic roles; unpictured states inherit their corresponding role',referenceComparison:'Independent white original roles; native AppShell rail and preference owners retained'};
export async function openThoughtReference(h,screen){
 const {openD7Reference}=await import('./d7-archive-reference.mjs');
 const references=new Map();
 return {async capture(theme,path){let reference=references.get(theme);if(!reference){reference=await openD7Reference(h,{screen,width:1440,theme});references.set(theme,reference);}await reference.page.screenshot({path});const {page,...metadata}=reference;return {...metadata,contract:'TL-PT1-UI-1.3',whiteAuthority:thoughtWhiteAuthority,comparison:'Historical D6.2 geometry image only; final palette checked independently against white original; real chronology and saved reading preferences remain authoritative'};},async close(){for(const reference of references.values())await reference.page.close();}};
}
