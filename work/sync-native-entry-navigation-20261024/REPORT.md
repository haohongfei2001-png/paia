# Native Settings entry precondition correction

Root reported the first Source invocation failed at the hidden `.sidebar [data-view=settings]` control after 30 seconds. Root retains the original combined run and failure evidence; this lane did not run a browser or alter that ongoing batch.

Read-only comparison with `extension/tests/nib-v4-settings-entry-chrome-e2e.test.mjs:68–85` establishes the existing desktop Settings scenario explicitly sizes its owned headless browser window and viewport to 1280×900. The default small CDP window instead uses the compact navigation, legitimately hiding the desktop sidebar. No product visibility rule is changed.

The native helper now follows that original owning setup: resize the owned headless window using its original CDP Browser API, set the matching viewport, click the genuine existing enable-consent control once, wait for original GET_STATUS to acknowledge consent, and open Settings through `.sidebar-bottom [data-view=settings]`. It no longer substitutes direct consent RPC plus reload for the original onboarding UI. No force click, DOM/CSS mutation, arbitrary delay, launch flag, permission bypass, build or browser execution is added.

This is a test-only correction. Syntax checked; actual corrected Source/Release remains NOT_RUN on this lane. Root must preserve the failed invocation separately from any later corrected result.
