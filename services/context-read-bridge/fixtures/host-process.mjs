// Offline protocol fixture: the parent test simulates Chrome's native pipe.
// This is not an installed host, real ChatGPT client or authenticated account.
import {NativeContextBridge} from '../native-host.mjs';
new NativeContextBridge({input:process.stdin,output:process.stdout,origin:'chrome-extension://'+'a'.repeat(32)+'/',extensionId:'a'.repeat(32)});
