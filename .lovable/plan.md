# BulbAI: Auth Fix, Smarter AI, and Multi-Target Deployment

## 1. Fix "Continue with Google"

Google is enabled in Supabase, so the failure is almost certainly redirect handling on our side.

- Redirect to `${window.location.origin}/dashboard` instead of `/` (the landing page doesn't wait for the OAuth session), and add `queryParams: { access_type: 'offline', prompt: 'select_account' }`.
- Add a `/auth/callback` route that waits for the Supabase session, then routes to `/dashboard` (or back to the page the user started on, stored before redirect).
- Surface the real error instead of a generic toast: show provider errors returned in the URL hash (`error_description`) after redirect.
- Add the Google button to `/auth` too (currently only in `AuthModal`), so both entry points match.
- Ensure a profile row exists after OAuth sign-up (fallback insert if the trigger didn't run for a Google identity).

Checklist for you (needed for OAuth to succeed at all):
- Supabase → Authentication → URL Configuration: Site URL = `https://bulb-ai.lovable.app`, Redirect URLs must include `https://bulb-ai.lovable.app/**` and the preview URL `https://id-preview--3da6eadd-fec8-4ddb-bef4-697645443995.lovable.app/**`.
- Google Cloud OAuth client → Authorized redirect URI must be `https://thpdlrhpodjysrfsokqo.supabase.co/auth/v1/callback`.

## 2. Deployment: choose where to deploy

Replace the single Vercel action with a **Deploy target picker** in the deploy overlay:

- **BulbAI Hosting (default, zero setup)** — new `deploy-bulbai` edge function uploads the project's files to a new public `sites` storage bucket under `sites/<projectId>/<version>/`, then the app serves it at `/@/:slug` through a hosted-site viewer route that loads `index.html` and rewrites relative `style.css` / `script.js` / image references into a blob so it renders as a real page, not raw HTML. Instant, works for every user.
- **Vercel (optional)** — keeps the existing static deploy, but only shown once a Vercel token is saved; explains the token step inline instead of failing.

Deploy flow improvements:
- Pre-deploy validation: require `index.html`, warn on broken relative links.
- Real status polling with a build log, then a success card with Copy URL / Open / QR.
- Fix the repeat-deploy loop: deployment state resets on overlay close and a deploy in flight is guarded by a ref, so returning to the tab never re-triggers it.
- Deployment history per project with target, URL, timestamp, and one-click redeploy of an older version.
- `projects.deploy_target` + `deployments.target` columns so the dashboard shows where each project lives.

## 3. Smarter, more reliable AI

- **Balanced model routing**: default `google/gemini-3.7-flash` for chat/edits; automatically escalate to a frontier model (`openai/gpt-5.4`) when the request is a multi-file build, a debug/fix request, or the user picks "Deep build" in the model selector. Cheap fallback (`google/gemini-3.1-flash-lite`) only when credits run out.
- **Teach it to do things correctly**: rewrite the system prompt around a plan → edit → verify loop, full-file output, an explicit project file manifest (every filename + size sent with each request so it never invents paths), HTML5 correctness rules, and a required summary. Add a self-check pass: after generating, the model validates its own HTML/CSS/JS for unclosed tags, missing links, and undefined references before finishing.
- **Streaming quality**: single rAF-batched buffer with a fixed-rate character drain, so text types smoothly instead of arriving in chunks; stage transitions (reading → planning → coding → verifying → done) driven by actual stream events rather than timers.
- **Reliability**: retry once on 5xx with backoff, honour `Retry-After` on 429, and never lose a partial reply — an interrupted stream is saved and can be resumed with "continue".
- **Persistence**: chat and file state keyed per project and per user, restored on tab switch so nothing disappears.

## 4. New / improved features (suggestions)

Recommended first:
1. **Live inline preview panel** with auto-refresh on save and a console that captures iframe errors, with a one-click "Fix this error" that sends the stack to the AI.
2. **Multi-tab editor** with Ctrl+H find/replace and a format-on-save action.
3. **AI image input** — drop a screenshot or mockup into the copilot and have it build the matching page.
4. **Project analytics** — views, remixes, and deploys per project, charted on the dashboard.
5. **One-click templates → deployed site** so a new user gets a live URL in under a minute.

Also worth adding later: snippet library, custom editor themes, shortcut cheat-sheet (Ctrl+?), GitHub export, visual CSS editor, and deploy rollback.

## Technical notes

- New: `src/pages/AuthCallback.tsx`, `src/pages/HostedSite.tsx`, `src/components/DeployTargetPicker.tsx`, `supabase/functions/deploy-bulbai/index.ts`.
- Changed: `AuthModal.tsx`, `Auth.tsx`, `App.tsx`, `DeploymentOverlay.tsx`, `DeploymentPanel.tsx`, `deploy-vercel/index.ts`, `chat/index.ts`, `useChat.tsx`, `Workspace.tsx`.
- Migration: public `sites` storage bucket with owner-write / public-read policies, `projects.deploy_target`, `deployments.target`, plus GRANTs.
- No secrets required for BulbAI Hosting; Vercel token stays optional.
