import {createDeclarationDeploymentGateway} from '../declaration-deployment-bootstrap.mjs';

// Default-off Node entry. Import reads no secrets and opens no connection.
const gateway=createDeclarationDeploymentGateway();
export const closeDeclarationGateway=()=>gateway.close();
export default Object.freeze({fetch:request=>gateway.fetch(request)});
