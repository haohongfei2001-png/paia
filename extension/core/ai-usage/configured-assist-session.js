import {LocalAssistSession} from './local-assist-session.js';
import {createAssistServiceClient} from './assist-service-client.js';
import {readAssistServiceConfiguration} from './assist-service-configuration.js';
export function createConfiguredAssistSession(store,{lease,configuration=readAssistServiceConfiguration()}={}){
 const service=createAssistServiceClient(configuration);if(!service)return null;
 const session=new LocalAssistSession(store,{...service.sessionOptions,lease,service});
 service.onInvalidate(()=>{session.dispose();service.dispose();});
 return session;
}
