// No Sync identity/provider host is qualified in this build. Only this fixed
// source module may provide a host capability; RPC, storage and Settings cannot.
// Local tests replace this module in an isolated source copy, never in a user
// installation. A binding DTO alone is not a verified provider identity.
export function readSyncLifecycleConfiguration(){return null;}
