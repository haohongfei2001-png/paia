import {createProviderDeploymentGateway} from '../provider-deployment-bootstrap.mjs';

// Actual Node Web Standard entry. Both enablement and the statically installed
// server registry are required. Import/construction alone reads no secrets and
// opens no socket; the checked-in registry contains no qualified capability.
const gateway=createProviderDeploymentGateway();
export const closeProviderGateway=()=>gateway.close();
export default Object.freeze({fetch:request=>gateway.fetch(request)});
