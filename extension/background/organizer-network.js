import {OrganizerError} from '../core/organizer/contracts.js';

import {DEEPSEEK_ORIGIN as ORIGIN} from '../core/organizer/deepseek.js';
const HOST=ORIGIN+'/*';
const fail=code=>{throw new OrganizerError(code);};

// Runs in the trusted worker immediately before each explicit paid request.
// No permission requests, network probes, credentials or content are involved.
export function organizerNetworkGuard(platform=globalThis.chrome,scope=globalThis){
 return async()=>{
  const expected=platform?.runtime?.getURL?.('background/service-worker.js');
  if(!expected||scope.location?.href!==expected||typeof scope.document!=='undefined'||!scope.registration)fail('WRONG_FETCH_CONTEXT');
  const manifest=platform.runtime.getManifest();
  if(!manifest.host_permissions?.includes(HOST))fail('HOST_PERMISSION_MISSING');
  const policy=manifest.content_security_policy?.extension_pages||'';
  const directives=new Map(policy.split(';').map(value=>value.trim().split(/\s+/)).filter(parts=>parts[0]).map(([name,...values])=>[name,values]));
  if(!directives.get('connect-src')?.includes(ORIGIN))fail('CSP_BLOCKED');
  try{if(!await platform.permissions.contains({origins:[HOST]}))fail('HOST_PERMISSION_NOT_GRANTED');}
  catch(error){if(error?.code==='HOST_PERMISSION_NOT_GRANTED')throw error;fail('HOST_PERMISSION_NOT_GRANTED');}
 };
}
