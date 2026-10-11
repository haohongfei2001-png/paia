import {projectSettingsUpdateStatus,SETTINGS_UPDATE_STATE_KEY} from '../core/settings-update-status.js';
// Explicit installation-source check only. No fetch, reload or archive access.
// Reuse the original browser update API and worker/Popup event record.
export async function checkInstallationUpdate(runtime,storage){
 const version=runtime.getManifest().version;
 const unknown=()=>({version,state:'check-unavailable'});
 if(typeof runtime.requestUpdateCheck!=='function')return unknown();
 try{
  const result=await new Promise((resolve,reject)=>runtime.requestUpdateCheck((status,details)=>{
   if(runtime.lastError)reject(Error('UPDATE_CHECK_UNAVAILABLE'));
   else resolve({status,targetVersion:details?.version});
  }));
  if(result.status==='no_update')return {version,state:'checked-none'};
  if(result.status!=='update_available')return unknown();
  const now=Date.now(),record={state:'available',fromVersion:version,toVersion:result.targetVersion,at:now};
  const projected=projectSettingsUpdateStatus(record,version,now);
  if(projected.state!=='available')return unknown();
  const value={version,state:'available',targetVersion:projected.targetVersion};
  // A failed local acknowledgement cannot revoke the browser's actual report.
  try{await storage.set({[SETTINGS_UPDATE_STATE_KEY]:record});}catch{return {...value,recordUnconfirmed:true};}
  return value;
 }catch{return unknown();}
}
