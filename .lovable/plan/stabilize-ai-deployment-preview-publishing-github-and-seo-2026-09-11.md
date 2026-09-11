# Stabilize AI, deployment, preview, publishing, GitHub, and SEO

## Implementation
- Keep AI generation alive outside tab-mounted components by moving each chat session into a shared in-memory store, while persisting completed messages; restore the same stream when the workspace tab or `/chat` page is reopened.
- Persist deployment lifecycle per project, prevent automatic restarts after navigation, and mark the overlay dismissed before opening the green live URL.
- Generate previews directly from the latest editor/file state, flush pending edits before preview/deploy, and refresh preview output whenever files change or the workspace is revisited.
- Improve project publishing errors with the exact Supabase message, retain the attempted settings, and add a one-click retry action.
- Re-check GitHub identity whenever auth changes or settings opens, persist the detected account status across fresh loads, and accurately distinguish account connection from automatic hosting readiness.
- Correct and verify the static Google verification tag, canonical, robots.txt, and sitemap on the published origin; diagnose the linked Search Console property and report any live-deployment or property-type blocker.

## Verification
- Exercise workspace AI and Claude Mythos 5 `/chat` streaming across panel switches and page reopen.
- Exercise preview before and after edits/navigation and validate the generated HTML.
- Exercise deployment dismissal state and publish retry/error UI.
- Check GitHub badge state from a fresh authenticated page load.
- Fetch the live homepage, robots.txt, and sitemap.xml and compare them with source; run the current-project Search Console diagnosis.

## Technical details
- Preserve project-scoped Supabase persistence and the existing deployment-gated public visibility rule.
- Use stable module-level stores/subscriptions for in-flight chat streams so UI unmounts do not abort or lose buffered tokens.
- Store only non-secret deployment/UI state in browser storage.
