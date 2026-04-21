# BulbAI Improvement Plan — Smoother AI, Bulletproof Workspace, Better UX

Monetization is set aside. Focus: reliability, performance, polish.

---

## 1. AI Copilot — kill every glitch

**Streaming**
- Replace ad-hoc rAF batching with one typewriter scheduler (1–3 chars/frame) for a real typing feel.
- Persist in-flight streams in a module-level `Map<projectId, { controller, buffer }>` so tab switches NEVER restart, drop, or duplicate a response.
- Flush buffer on `done` and unmount; cancel only on explicit user action.
- Add a visible **Stop generating** button.

**SSE robustness**
- Harden CRLF / `:` keepalive / partial JSON / `[DONE]` handling; add unit tests in the edge function.
- Surface 429 / 402 / 500 as friendly toasts with retry CTA.

**Conversation correctness**
- Dedupe assistant bubbles by message id on remount.
- Preserve scroll position + show "scroll to bottom" pill when user scrolls up mid-stream.
- Optimistic insert into `chat_messages` with reconciliation.

**Branding**
- Finish the "Claude Opus 4.5" rename sweep (system prompts, UI labels, model selector, memory). Backing model stays Gemini 2.5 Pro.

---

## 2. Workspace — no lost work, no jank

**File integrity**
- File tree = single source of truth. Deletions write through to Supabase immediately; tombstone prevents re-hydration on tab refocus.
- Auto-save indicator (`saving / saved / error`) in the header.
- 5-second **undo delete** toast.

**Tab + visibility**
- Keep editor / preview / copilot mounted via CSS visibility on tab change. Audit every panel.
- Pause linter and preview rebuild when `document.hidden`; resume on focus without remount.

**Editor polish**
- Monaco: bracket-pair colorization, sticky scroll, format-on-save, themed to glassmorphism palette.
- Fix BulbAI logo / AI profile alignment in copilot header (flex gap + consistent avatar size).
- Eliminate layout shift from the AI activity indicator.

**Preview**
- Reliable inline CSS/JS into blob URL; auto-reload on save (debounced) + manual reload button.
- Capture iframe runtime errors in a small overlay.

---

## 3. Realtime + persistence

- Real-time credit balance with subtle pulse on change (hook already in place).
- Realtime project files for collaborators (channel per `project_id`).
- Presence indicator shows live cursors only for users actively in the file.

---

## 4. Performance

- `React.lazy` for `/workspace`, `/chat`, `/project/:id`.
- Memoize `FileTree`; virtualize chat message list past ~100 messages.
- Remove `transition-all` on streaming text to kill repaint jank.
- Lighthouse pass, target ≥ 90 on landing + dashboard.

---

## 5. Stability safety net

- `ErrorBoundary` around every top-level route with "Reload / Report" UI.
- Global toast for unhandled promise rejections.
- Lightweight `/log-client-error` edge function for telemetry.

---

## 6. UX polish

- Logo in nav always returns to `/` (verify on every page).
- Consistent 1.5 s toasts, bottom-left.
- `Ctrl+/` overlay lists every shortcut.
- Empty states for: no projects, no chats, no notifications, no collaborators.
- Skeleton loaders instead of spinners on dashboard, explore, project pages.

---

## 7. Public Explore + Showcase

- Showcase: large preview iframe, big **Remix** + **Visit Live**, author card, tags, view/star counts.
- Explore: filter + sort (newest, most starred, most remixed).
- Block public toggle until deployed (already enforced) + friendly "Deploy now" shortcut when blocked.

---

## 8. Security finish line

- Resolve remaining Supabase linter warnings.
- Audit every edge function: JWT check, zod input validation, CORS, friendly error envelopes.
- Per-bucket storage policy review.

---

## Execution order

1. AI streaming + tab persistence (biggest pain)
2. Workspace file integrity + auto-save indicator
3. Logo / layout polish + branding sweep
4. Showcase + explore polish
5. Performance + code-splitting
6. Error boundaries + telemetry
7. Security + linter cleanup
