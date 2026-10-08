import {ManualContext} from './manual-context.js';
import {ArchiveError} from './constants.js';

const unavailable=()=>{throw new ArchiveError('FEATURE_UNAVAILABLE');};

// Retired owner: every old package/material entry point fails before accessing
// Memory, Passport, storage, content or transport, including direct callers.
export class ContextPackageService {
 constructor(){this.packages=new Map();this.manualSelections=new ManualContext();}
 async manual(){unavailable();}
 register(){unavailable();}
 async build(){unavailable();}
 async bind(){unavailable();}
 async share(){unavailable();}
 package(){unavailable();}
 prune(){this.packages.clear();}
}
