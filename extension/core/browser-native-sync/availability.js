// No provider is qualified in this release. This body-free build fact does not
// inspect private data, browser identity, credentials or the network.
export function syncAvailability(){return Object.freeze({version:1,state:'unavailable',reason:'provider-not-configured',canEnable:false,localDataUnaffected:true});}
