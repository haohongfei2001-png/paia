import {recoveryGuidance} from './recovery-guidance.js';
const details={
 capture:'Save any unsent text, then refresh that ChatGPT page. Content already saved in PAIA remains readable.',
 storage:'Check available space on this device and keep the current installation and data. Do not uninstall the extension or clear browser data.',
 save:'Previously saved content remains readable. Check your current text in PAIA, then manually retry saving.',
 read:'Keep the current installation and data, then retry reading later. Do not uninstall the extension or clear browser data.',
 update:'Keep the current installation and local data, then manually retry the check later. This does not mean an update was installed.',
 index:'The original conversation remains readable. Retrying search does not delete or rebuild your archive.'
};
export function settingsCaptureRecovery(page,language,now=Date.now()){
 const error=page?.diagnostics?.lastError,age=now-Date.parse(error?.at||'');
 const guidance=recoveryGuidance(page?.diagnostics?.status)||(age>=0&&age<=120_000?recoveryGuidance(error?.code):null);
 return guidance?(language==='zh-CN'?guidance.detail:details[guidance.kind]||'Keep the current installation and local data. Retry the affected action later.'):'';
}
