import {createOperationStatusDeploymentGateway} from '../operation-status-deployment-bootstrap.mjs';
// Lazy, default-off. No import-time environment reads, credentials or sockets.
const gateway=createOperationStatusDeploymentGateway();
export const closeOperationStatusGateway=()=>gateway.close();
export default Object.freeze({fetch:request=>gateway.fetch(request)});
