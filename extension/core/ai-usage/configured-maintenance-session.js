import {readAIFilterServiceSourceConfiguration} from './filter-visibility-service.js';
import {configuredMaintenanceTopicIdentityProcessing} from '../../background/maintenance-processing-commands.js';
import {LocalMaintenanceSession} from './local-maintenance-session.js';
import {createMaintenanceServiceClient} from './maintenance-service-client.js';
import {readMaintenanceServiceConfiguration} from './maintenance-service-configuration.js';
export function createConfiguredMaintenanceSession(store,configuration=readMaintenanceServiceConfiguration(store)){
 const remote=createMaintenanceServiceClient(configuration);
 try{return new LocalMaintenanceSession(store,remote?{...remote.sessionOptions,remote,topicIdentityProcessing:configuredMaintenanceTopicIdentityProcessing(readAIFilterServiceSourceConfiguration(configuration)??configuration,store)}:{});}catch{remote?.dispose();return new LocalMaintenanceSession(store);}
}
