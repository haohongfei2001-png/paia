import {createIdentityCurrentnessDeploymentGateway} from '../identity-currentness-deployment-bootstrap.mjs';
// Lazy/default-off source entry. Import reads no environment or credential and
// creates no pool, connection, identity, provider call or deployment permission.
const gateway=createIdentityCurrentnessDeploymentGateway();
export const closeIdentityCurrentnessGateway=()=>gateway.close();
export default Object.freeze({fetch:request=>gateway.fetch(request)});
