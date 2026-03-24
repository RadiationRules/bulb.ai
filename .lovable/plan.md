

## BulbAI Feature Improvement & Enhancement Plan

### Priority Fixes (from your requests)

#### 1. Upload Preview Image Replaces Default Image
- In `ProjectSettingsModal.tsx`, the image upload currently uses `URL.createObjectURL` (local only, lost on reload)
- Fix: Upload to Supabase Storage `project-assets` bucket, save the public URL to `projects.preview_image` column
- When user uploads a preview image, it overwrites the default SVG data URI
- Dashboard cards already read `preview_image` so they'll show the uploaded one automatically

#### 2. Show AI Thinking Like Lovable (Auto-Close When Typing)
- Currently `AiActivityIndicator` shows Reading/Thinking/Coding stages inline in chat
- Enhance: Make the thinking indicator a collapsible overlay that auto-collapses when the AI starts outputting text to the chat
- During "reading" and "thinking" stages, show an expanded card with pulsing animation and detail text
- When stage transitions to "coding" and text starts streaming, smoothly collapse the indicator to a minimal inline badge
- Add a "Show thinking" toggle so users can expand it again if curious

---

### New Features & Improvements List

#### 3. AI Image Upload in Copilot
- Add an image attach button next to the chat input (camera/paperclip icon)
- Users can upload screenshots, mockups, or reference images
- Images sent to the AI via the existing `images` parameter in `useChat`
- AI can analyze the image and generate matching code

#### 4. Multi-Tab Editor (Like VS Code Tabs)
- Show open files as tabs above the editor instead of just the current file badge
- Click tabs to switch, middle-click or X to close
- Tracks which files are open in state, persists across session

#### 5. Find & Replace in Editor
- Add Ctrl+H shortcut and a find/replace bar in the Monaco editor
- Monaco already supports this natively, just need to enable the actions

#### 6. Split Editor View
- Allow users to split the editor horizontally to view two files side by side
- Useful when AI creates multiple files and user wants to compare

#### 7. Real-Time Preview Panel (Inline)
- Instead of only "open in new tab", add an inline iframe preview panel
- Toggle between code and preview with a split view
- Auto-refreshes when files change

#### 8. AI Context Improvements
- Send full file tree structure to AI so it knows what exists
- Include file sizes and types for better context
- AI can reference and modify any file, not just the active one

#### 9. Snippet Library
- Save frequently used code snippets
- Quick-insert into any file
- Personal snippet collection stored in Supabase

#### 10. Project Export Options
- Export as ZIP (already exists but improve)
- Export to GitHub (connect repo, push files)
- Export as static site bundle ready for any host

#### 11. Collaborative Editing Improvements
- Show other users' cursors in real-time (already partially implemented)
- Add a "who's online" indicator in the header
- Chat between collaborators within the workspace

#### 12. Mobile Workspace Improvements
- Bottom navigation bar for mobile with key actions
- Swipe between file tree, editor, and AI panel
- Touch-friendly file tree with long-press context menus

#### 13. AI Code Explanations
- "Explain this code" button on any file
- AI breaks down the code line-by-line in plain English
- Useful for learning and debugging

#### 14. Project Analytics Dashboard
- View count, unique visitors, deploy frequency
- Chart of activity over time
- Show on project settings and dashboard cards

#### 15. Custom Themes for Editor
- Let users pick Monaco editor themes beyond vs-dark
- Add BulbAI custom theme with amber/yellow accents
- Theme picker in settings modal

#### 16. Keyboard Shortcut Customization
- Show all available shortcuts in a modal (Ctrl+?)
- Let users remap shortcuts
- Display shortcut hints on buttons

#### 17. AI Template Generation
- "Generate a landing page", "Generate a portfolio" quick templates
- AI creates complete multi-file projects from a single prompt
- Template gallery with previews

#### 18. Error Console in Workspace
- Capture and display JavaScript errors from the preview iframe
- Show errors inline with red badges
- One-click "Fix this error" sends it to the AI

#### 19. CSS Visual Editor
- Click on elements in preview to edit styles visually
- Color pickers, margin/padding controls, font selectors
- Changes sync back to CSS files

#### 20. Deploy History & Rollback
- Show all previous deployments with URLs and timestamps
- One-click rollback to any previous deployment
- Compare current vs deployed version

---

### Technical Details

**Files to modify for Priority Fixes:**
- `src/components/ProjectSettingsModal.tsx` — Real Supabase Storage upload for preview images, save URL to `preview_image` column
- `src/components/AiActivityIndicator.tsx` — Add auto-collapse behavior, expanded/collapsed states, smooth transition animations
- `src/pages/Workspace.tsx` — Pass collapse trigger based on streaming state, handle thinking overlay dismiss
- `src/hooks/useChat.tsx` — Emit clearer stage transition signals for the collapse logic

**Storage:** Uses existing `project-assets` bucket (already public)

**No database migrations needed** for the two priority fixes — `preview_image` column and `project-assets` bucket already exist.

