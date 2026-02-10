

## BulbAI Workspace Overhaul Plan

This is a big set of changes covering deployment animations, tab reordering, terminal upgrades, AI improvements, file tree fixes, and version history. Here's the breakdown:

---

### 1. Breathtaking Deploy Button and Full-Page Deployment Experience

**What changes:**
- The top-right "Deploy" button gets a glowing animated gradient with a rocket pulse effect
- Clicking it opens a full-screen deployment overlay (not just a tab) with:
  - Animated rocket launch sequence
  - Real-time build log with typewriter effect
  - Progress bar with stages (Uploading -> Building -> Deploying -> Live)
  - Auto-transitions to "Live" state showing the Vercel URL
  - Confetti or particle burst on success
- The Vercel short URL is displayed prominently and is copyable
- After deploy completes, the overlay auto-dismisses with the URL shown in a toast

**Files:** `src/pages/Workspace.tsx`, new `src/components/DeploymentOverlay.tsx`, `src/index.css`

---

### 2. Reorder Right Panel Tabs

**New tab order:** AI, Review, Deploy, Terminal (renamed from Dev), History (new)

Remove: Live, Activity, Friends, Preview tabs from the main tab bar (they can stay accessible elsewhere)

**Files:** `src/pages/Workspace.tsx` (lines 1513-1548)

---

### 3. Smart Terminal with Real Git Commands

**What changes:**
- Terminal becomes project-aware - `ls`, `cat`, `rm`, `touch`, `mkdir` actually read/modify project files in Supabase
- `git status` shows actually modified files
- `git add`, `git commit -m "message"` creates real commits in the database
- `rm` and `mkdir` actually create/delete files
- `cat` shows real file contents
- Arrow key history navigation works properly

**Files:** `src/components/Terminal.tsx` (major rewrite to accept project files and callbacks)

---

### 4. History Tab (Version Control)

**What changes:**
- New "History" tab at the end of the tab bar
- Shows each save and deployment as a timeline entry
- Each entry shows: timestamp, commit message (user types before deploying), file changes
- Click any entry to restore that version
- Before deploying, a dialog asks user to describe their changes (like a git commit message)
- Project cards in templates/explore show "Updated: [date] - [commit message]" like GitHub

**Files:** New `src/components/HistoryPanel.tsx`, `src/pages/Workspace.tsx`, database migration for `project_snapshots` table

---

### 5. Fix AI: Persistent Chat, Better Responses, No Corny Messages

**What changes:**
- Chat messages persist to Supabase `chat_messages` table so they survive tab changes and reloads
- AI system prompt updated to be ultra-concise: 1-3 sentences max, then code
- Remove "Code generated and applied seamlessly" and "Changes applied successfully" - replace with a clean checkmark badge
- AI creates proper file structures (multiple files at once) using a structured format
- Add clickable suggestion chips below AI responses (like Lovable does)
- AI knows about Vite build requirements so deployed code doesn't error

**Files:** `src/pages/Workspace.tsx` (CopilotPanel), `supabase/functions/chat/index.ts`, new migration for `chat_messages` table, `src/hooks/useChat.tsx`

---

### 6. Fix File Tree: Smooth Drag-and-Drop, No Glitches

**What changes:**
- Drag-and-drop only moves files within the tree (no page scroll/movement)
- When a folder is selected (highlighted with color outline), clicking "New File" creates the file inside that folder
- Prevent screen jumping during drag operations using `e.stopPropagation()` and proper state management
- Selected folder shows a subtle colored border/outline
- Files sort properly: folders first, then files alphabetically
- `onMoveFile` actually updates `file_path` in Supabase (currently just logs to console)

**Files:** `src/components/FileTree.tsx`, `src/pages/Workspace.tsx` (onMoveFile handler at line 1436-1439)

---

### 7. Fix Download Button

**What changes:**
- Replace `require('jszip')` with proper ES module import (current code will crash)
- Use the already-installed `jszip` package with `import JSZip from 'jszip'`

**Files:** `src/pages/Workspace.tsx` (lines 789-813)

---

### 8. AI Chat Button Goes to Main BulbAI Chat

**What changes:**
- The AI chat button on the landing/dashboard page navigates to a dedicated `/chat` route (main BulbAI chat room) instead of the workspace copilot

**Files:** `src/pages/Dashboard.tsx` or navigation component

---

### 9. Fix BulbAI Default Template

**What changes:**
- The default template (index.html + README.md) is locked as the starting point
- Template only changes when user explicitly edits - it persists via auto-save
- Template image uses the BulbAI branding consistently

**Files:** `src/pages/Workspace.tsx` (lines 669-736)

---

### 10. Fix Vercel Build Error

**What changes:**
- Update AI system prompt to instruct it about Vite/React project structure
- When AI creates files, ensure `src/main.tsx` imports from `./App.tsx` (with extension)
- Add a pre-deploy validation step that checks critical files exist (`index.html`, `src/main.tsx`, `src/App.tsx`)
- The deploy function already adds missing files, but the AI needs to generate compatible code

**Files:** `supabase/functions/chat/index.ts` (system prompt), `supabase/functions/deploy-vercel/index.ts`

---

### Technical Details

**Database migrations needed:**
1. `chat_messages` table: `id`, `project_id`, `user_id`, `role`, `content`, `created_at`
2. `project_snapshots` table: `id`, `project_id`, `user_id`, `message`, `files_snapshot` (jsonb), `created_at`

**New components:**
- `src/components/DeploymentOverlay.tsx` - Full-screen animated deployment experience
- `src/components/HistoryPanel.tsx` - Version history timeline
- `src/components/SuggestionChips.tsx` - Clickable AI suggestions

**Modified components:**
- `src/pages/Workspace.tsx` - Tab reorder, deploy button, file tree fix, download fix, chat persistence
- `src/components/Terminal.tsx` - Project-aware smart terminal
- `src/components/FileTree.tsx` - Smooth drag-drop, folder selection highlight
- `src/components/DeploymentPanel.tsx` - Pre-deploy commit message dialog
- `supabase/functions/chat/index.ts` - Concise AI, Vite-aware prompts
- `src/hooks/useChat.tsx` - Persist messages to Supabase
- `src/index.css` - Deploy animations, glow effects

