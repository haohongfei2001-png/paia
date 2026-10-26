// New direct original-owner assembly for origin-downgrade negatives only.
// No config replacements, selection action, marker, hold, SDK dispatch or inventory.
import * as stores from '../../background/application-store-selection.js';
import * as startup from '../../background/application-startup-events.js';
import * as receipts from '../../background/prompt-insertion-receipts.js';
import * as contexts from '../../background/context-connections.js';
import * as prompts from '../../background/prompt-reuse-commands.js';
import * as surfaces from '../../background/prompt-surface.js';
import * as nexts from '../../background/prompt-next.js';
import * as assists from '../../background/prompt-assist.js';
import {PromptReuseService} from '../../core/prompt-reuse-service.js';
import {SafetyRunner} from '../../core/thought-runner.js';
import {LibraryRunner} from '../../core/library-runner.js';
import {FilterRunner} from '../../core/filter-runner.js';
import {createMaintenanceRunner} from '../../core/ai-usage/maintenance-runner.js';
import {SimpleOriginalOrganizerRunner} from '../../core/organizer/original-simple.js';
import {createConfiguredOrganizeRunner} from '../../core/organizer/configured-organize-runner.js';
import {BoundedOrganizerWorkflow} from '../../core/organizer/bounded-workflow.js';
import {unavailableAIProvider,unavailableAICredentials} from '../../core/organizer/unavailable-service.js';
import * as workers from '../../background/application-worker-coordination.js';
import * as captures from '../../background/capture-recovery.js';
import * as imports from '../../background/import-handler.js';
import {BackupService} from '../../core/backup-service.js';
import {IntegrityChecker} from '../../core/integrity-checker.js';
import * as tools from '../../background/application-local-tools-coordination.js';
import * as transports from '../../background/application-transport-coordination.js';
import * as editors from '../../background/application-editor-guard.js';
import * as commands from '../../background/application-selection-commands.js';
import * as sync from '../../background/sync-local-lifecycle.js';
export async function composeProductionOwners(){
 const store=await stores.selectProductionApplicationStore(null);await store.recoverControlPublication();await store.status();
 const events=startup.createProductionApplicationStartupEvents(),receipt=receipts.createProductionPromptInsertionReceipts(store);
 const contextConnections=contexts.createProductionContextConnections(store,events),service=new PromptReuseService(store),promptCommands=prompts.createProductionPromptReuseCommands(service,{insertionReceipts:receipt}),promptSurface=surfaces.createProductionPromptSurfaceCommands(promptCommands,{}),promptNext=nexts.createProductionNextPromptCommands(service,promptSurface,{insertionReceipts:receipt});promptSurface.next=promptNext;
 const promptAssist=assists.createProductionAssistPromptCommands(store,events,{surface:promptSurface,insertionReceipts:receipt});promptSurface.assist=promptAssist;
 const sourceCoordination=workers.createProductionApplicationWorkerCoordination({store,safety:new SafetyRunner(store),libraryRunner:new LibraryRunner(store),filterRunner:new FilterRunner(store),maintenanceRunner:createMaintenanceRunner(store,null),contextConnections,promptAssist,promptNext,promptCommands,promptSurface,boundedOrganizer:new BoundedOrganizerWorkflow(store,{original:new SimpleOriginalOrganizerRunner(store,{provider:unavailableAIProvider,credentials:unavailableAICredentials}),ai:createConfiguredOrganizeRunner(store,null)})});
 const captureRecovery=captures.installProductionCaptureRecovery(Promise.resolve()),localTools=tools.createProductionApplicationLocalToolsCoordination({store,imports:imports.createProductionImportHandler(store),backups:new BackupService(store),integrity:new IntegrityChecker(store)}),transport=transports.createProductionApplicationTransportCoordination({store,sourceCoordination,captureRecovery,promptInsertionReceipts:receipt}),editor=editors.createProductionApplicationEditorGuard(),activity=commands.createApplicationWorkerActivity(),selection=commands.createProductionApplicationSelectionCommands({activity}),lifecycle=await sync.createProductionConfiguredSyncLifecycle(store);
 return {store,lifecycle,editors:editor,transports:transport,localTools,activity,selection};
}
