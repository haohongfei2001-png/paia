import {createDeploymentGateway} from '../deployment-bootstrap.mjs';

// Vercel Node 22 Web Standard entry, never Edge. Lazy runtime-only deployment
// configuration; source/import alone never opens a socket or supplies authority.
const gateway=createDeploymentGateway();
export const closeReservationGateway=()=>gateway.close();
export default Object.freeze({fetch:request=>gateway.fetch(request)});
