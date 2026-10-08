import {ArchiveError} from '../core/constants.js';

// No Material Tray owner, listeners, task state or output is constructed.
export const getContextController=()=>null;
export class ContextController {
 constructor(){this.disabled=true;}
 activate(){return false;}
 invalidateOutput(){}
 async rpc(){throw new ArchiveError('FEATURE_UNAVAILABLE');}
 async add(){throw new ArchiveError('FEATURE_UNAVAILABLE');}
}
