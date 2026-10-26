export function fakeDeviceOptions({viewport,hasTouch=false,launchThroughPort=false}={}){
 if(typeof hasTouch!=='boolean'||hasTouch&&launchThroughPort)throw Error('UNSUPPORTED_SYNTHETIC_DEVICE_CONFIGURATION');
 return {...(viewport===undefined?{}:{viewport}),...(hasTouch?{hasTouch:true}:{})};
}
