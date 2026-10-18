import {createGatewayHandler} from '../request-entry.mjs';

// Vercel Node Web Standard entry. Intentionally no ambient DATABASE_URL,
// identity issuer, self-signed root, budget or provider. A separately reviewed
// deployment composition must supply its configured reservation service.
// The shipped entry genuinely parses requests and refuses unconfigured traffic.
export default Object.freeze({fetch:createGatewayHandler()});
