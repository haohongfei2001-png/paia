import {LocalMaintenanceSession} from './local-maintenance-session.js';
import {createMaintenanceServiceClient} from './maintenance-service-client.js';
import {readMaintenanceServiceConfiguration} from './maintenance-service-configuration.js';
export function createConfiguredMaintenanceSession(store,configuration=readMaintenanceServiceConfiguration(store)){
 const remote=createMaintenanceServiceClient(configuration,store);
 try{return new LocalMaintenanceSession(store,remote?{...remote.sessionOptions,remote}:{});}catch{remote?.dispose();return new LocalMaintenanceSession(store);}
}
