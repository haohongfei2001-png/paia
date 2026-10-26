import {createAssistContextProcessingSource,disposeAssistContextProcessingSource} from './assist-context-processing-source.js';
import {LocalAssistSession} from './local-assist-session.js';
import {createAssistServiceClient} from './assist-service-client.js';
import {readAssistServiceConfiguration} from './assist-service-configuration.js';
export function createConfiguredAssistSession(store,{lease,consent=null,configuration=readAssistServiceConfiguration()}={}){
 if(configuration===null)return null;
 let contextSource;try{contextSource=createAssistContextProcessingSource(store,{consent,lease});}catch{return null;}
 const service=createAssistServiceClient(configuration,{contextSource,store,lease});if(!service){disposeAssistContextProcessingSource(contextSource,store,lease);return null;}
 let session;try{
  session=new LocalAssistSession(store,{...service.sessionOptions,lease,service,intent:'automatic_assist'});
  service.onInvalidate(()=>{session.dispose();service.dispose();});return session;
 }catch{session?.dispose();service.dispose();disposeAssistContextProcessingSource(contextSource,store,lease);return null;}
}
