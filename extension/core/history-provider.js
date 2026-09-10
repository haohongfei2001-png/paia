// History ingestion and AI organization have independent contracts.
// The base boundary exposes a local file session, never a network client.
export class HistoryCompletionProvider {
 describe(){throw new Error('HISTORY_PROVIDER_UNAVAILABLE');}
 createSession(){throw new Error('HISTORY_PROVIDER_UNAVAILABLE');}
}
