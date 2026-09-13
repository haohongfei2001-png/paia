export const UX_PREF_VERSION=2;
export const UX_DEFAULTS=Object.freeze({settingsVersion:UX_PREF_VERSION,appearance:'system',language:'system',fontSize:'standard',readingWidth:'standard',sidebarCollapsed:false});
const ROOTS=new Set(['library','thoughts','memory']);
const APPEARANCE=new Set(['system','light','dark']);
const LANGUAGE=new Set(['system','zh-CN','en']);
const FONT_SIZE=new Set(['small','standard','large','xlarge']);
const READING_WIDTH=new Set(['narrow','standard','wide']);
export function normalizeUXPreferences(value={}){
 const source=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
 return {
  settingsVersion:UX_PREF_VERSION,
  appearance:APPEARANCE.has(source.appearance)?source.appearance:UX_DEFAULTS.appearance,
  language:LANGUAGE.has(source.language)?source.language:UX_DEFAULTS.language,
  fontSize:FONT_SIZE.has(source.fontSize)?source.fontSize:UX_DEFAULTS.fontSize,
  readingWidth:READING_WIDTH.has(source.readingWidth)?source.readingWidth:UX_DEFAULTS.readingWidth,
  sidebarCollapsed:typeof source.sidebarCollapsed==='boolean'?source.sidebarCollapsed:UX_DEFAULTS.sidebarCollapsed
 };
}
export function resolveLanguage(value,systemLanguage='zh-CN'){
 const selected=LANGUAGE.has(value)?value:'system';
 if(selected!=='system')return selected;
 return String(systemLanguage||'').toLocaleLowerCase().startsWith('zh')?'zh-CN':'en';
}
export function resolveAppearance(value,systemDark=false){
 const selected=APPEARANCE.has(value)?value:'system';
 return selected==='system'?(systemDark?'dark':'light'):selected;
}
export function canonicalRoot(view){return ROOTS.has(view)?view:view==='settings'?'settings':'library';}
export function validReturnTarget(view){return ROOTS.has(view)?view:'library';}
export function onboardingTarget({consented=false,existingUser=false,hasContent=false,step='consent'}={}){
 if(consented&&(existingUser||hasContent))return 'done';
 if(consented&&['welcome','consent'].includes(step))return 'history';
 if(!consented&&step==='welcome')return 'consent';
 return step;
}
export const SETTINGS_GROUPS=Object.freeze([
 ['content','内容与收录'],['reading','阅读与外观'],['ai','AI'],['privacy','隐私与对外使用'],['data','数据与设备'],['advanced','高级']
]);
