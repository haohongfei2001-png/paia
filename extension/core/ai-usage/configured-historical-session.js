import {HistoricalCandidateSession} from './historical-candidate-session.js';
import {createHistoricalServiceClient} from './historical-service-client.js';
import {readHistoricalServiceConfiguration} from './historical-service-configuration.js';
// The worker always enters here. Missing configuration leaves ordinary local
// Prompt Reuse intact and reports available:false without starting any network.
export function createConfiguredHistoricalCandidateSession(store,configuration=readHistoricalServiceConfiguration()){
 const service=createHistoricalServiceClient(configuration);
 return new HistoricalCandidateSession(store,service?{...service.sessionOptions,service}:{});
}
