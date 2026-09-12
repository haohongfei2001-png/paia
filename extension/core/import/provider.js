import {HistoryCompletionProvider} from '../history-provider.js';
import {ImportCoordinator} from './coordinator.js';
import {getOfficialExportAdapter,officialExportStatus} from './registry.js';
export class OfficialExportProvider extends HistoryCompletionProvider {
 describe(){return {...officialExportStatus(),contractVersion:2,input:'user_selected_file',network:false};}
 createSession(options){return new ImportCoordinator({...options,adapter:getOfficialExportAdapter(),resolveAdapter:getOfficialExportAdapter});}
}
