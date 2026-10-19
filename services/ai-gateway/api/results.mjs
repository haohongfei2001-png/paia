import {createResultDeploymentGateway} from '../result-deployment-bootstrap.mjs';
// Lazy default-off Node entry. Import opens no socket and reads no credentials.
const gateway=createResultDeploymentGateway();
export const closeResultGateway=()=>gateway.close();
export default Object.freeze({fetch:request=>gateway.fetch(request)});
