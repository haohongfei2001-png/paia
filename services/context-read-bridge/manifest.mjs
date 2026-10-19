import {isAbsolute} from 'node:path';

// Pure offline package preparation. This does not install a host, grant Chrome
// nativeMessaging, create a credential or start an HTTP listener/tunnel.
export function contextNativeManifest({extensionId,launcherPath}){
 if(typeof extensionId!=='string'||!/^[a-p]{32}$/.test(extensionId)||typeof launcherPath!=='string'||!isAbsolute(launcherPath)||/[\0\r\n]/.test(launcherPath))throw new Error('INVALID_HOST_PACKAGE');
 return {name:'com.paia.context_read',description:'PAIA explicitly paired read-only Context bridge',path:launcherPath,type:'stdio',allowed_origins:[`chrome-extension://${extensionId}/`]};
}
