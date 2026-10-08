import {ArchiveError} from './constants.js';

const unavailable=()=>{throw new ArchiveError('FEATURE_UNAVAILABLE');};

// Retired owner: no material sessions, content reads, compilation or release.
// Restoration metadata lives in its existing storage owners and is untouched.
export class ManualContext {
 constructor(){this.sessions=new Map();}
 async run(){unavailable();}
 async dispatch(){unavailable();}
 async transaction(){unavailable();}
 async validate(){unavailable();}
 async compile(){unavailable();}
 invalidate(){unavailable();}
 text(){unavailable();}
 dto(){unavailable();}
}
