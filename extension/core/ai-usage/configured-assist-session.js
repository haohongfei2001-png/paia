import {LocalAssistSession} from './local-assist-session.js';
import {createAssistServiceClient} from './assist-service-client.js';
import {readAssistServiceConfiguration} from './assist-service-configuration.js';
export function createConfiguredAssistSession(store,{lease,contextProcessingSource=null,configuration=readAssistServiceConfiguration()}={}){
 const service=createAssistServiceClient(configuration);if(!service)return null;
 // A static assembly chooses one permission owner. Never discard a separately
 // configured veto merely because a new source capability is also available.
 if(contextProcessingSource!==null&&(service.sessionOptions.contextProcessing!==null||service.sessionOptions.contextDiscovery!==null)){service.dispose();return null;}
 const session=new LocalAssistSession(store,{...service.sessionOptions,lease,service,contextProcessingSource,intent:'automatic_assist'});
 service.onInvalidate(()=>{session.dispose();service.dispose();});
 return session;
}
