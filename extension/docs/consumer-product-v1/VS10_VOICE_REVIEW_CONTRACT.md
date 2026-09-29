# CPV1-10.3 detached local voice review engineering contract

Canonical VS10 requires explicit record → transcribe → review → save. DFG-CPV1-007 permits a transcription interface and local/synthetic verification while real supported-device evidence and any third-party processor choice remain deferred.

## Current bounded candidate

Provide a detached, dependency-injected local review boundary. Construction performs no capture and asks for no microphone permission. A caller explicitly invokes start; the platform owner supplies a capture session with stop/cancel and a transcription implementation. This module chooses no microphone implementation, model, cloud processor, endpoint, paid plan or product entrypoint. It stores no audio/transcript durably and never writes MyWrite, Source or Input or sends a request.

A single generation owns capture, transcription and review. Cancel/dispose invalidate it before awaiting session cleanup; late capture/audio/transcription cannot present a review. Failed capture/transcription and malformed/empty/overlong transcript yield only finite body-free errors. A complete transcript, including the final Unicode/negation tail, remains available only for explicit review. The owner must submit an exact generation and complete corrected text to accept; no implicit save, truncation or stale handoff. A prior unaccepted review blocks a new recording until explicitly cancelled.

Run complete owning unit cases against an injected synthetic local adapter: zero constructor side effects, full 1000-paragraph transcript and correction, stale/empty/oversize refusals, capture-start and transcribe cancellation races, disposal during audio stop, private failure redaction and no implicit capture authority. Existing MyWrite and full hosted product browser cases remain unchanged. Exact new-head unit/contracts/privacy/release/owning-browser/aggregate CI PENDING until published.

## Open gates

This is a pure review kernel, not a phone client, voice UI, microphone permission or local speech model selection. Before product activation, implement an actual explicit trusted record/stop/review/save UI linked to the protected MyWrite composer, validate mic denial, text correction, interrupted/background/lock/call lifecycle and physical iPhone/iPad large-text/startup behavior. A real processor and its privacy/cost decision stay gated by DFG-CPV1-007. Never treat synthetic transcript acceptance as a real transcription or device PASS. MyWrite remains DEFAULT_OFF / NOT_ACTIVATED / NOT_CERTIFIED. VS07 remains EXPERIMENTAL / DEFAULT_OFF / NON-BLOCKING; VS04 lexical/fuzzy/filter is default search; Semantic Lab alone owns Input→Topic.

## Detached review surface (subsequent synthetic slice)

A DOM review surface may be instantiated only by an explicit owner that injects the capture/transcription flow. Its default workspace configuration has no voice control or capture authority. Start and stop are trusted user actions. The full transcript is shown for correction. Explicit acceptance appends the exact reviewed text into the unsaved local MyWrite composer; a separate explicit save remains required. If the owner cannot accept the complete text, the review remains visible for retry. Switching drafts is blocked while recording or unapplied review exists. This surface is local/synthetic engineering only; it does not resolve mobile architecture, real-device microphone, local transcription quality, or DFG-CPV1-007.

## External lifecycle interruption hook

An owning client may forward a finite `background`, `lock`, `call`, `offline`, or `microphone_denied` signal to the detached workspace. Active capture/transcription is cancelled with a generation fence; no background listening or automatic transcription resumes. A complete transcript already in review remains visible for explicit correction and acceptance. The default workspace has no voice authority. This synthetic hook does not certify actual iPhone/iPad lock, call, app kill, audio session, or microphone-permission behavior; DFG-CPV1-007 remains open.
