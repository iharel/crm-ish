# Resizable & collapsible panels — implementation (2026-10-20)
| # | Task | Files |
|---|------|-------|
| 1 | `usePanelSize` hook: width/collapsed state, clamp, persistence via storageService, `startDrag`, `toggle`, `reset`, `nudge` | `frontend/src/hooks/usePanelSize.ts` |
| 2 | `ResizeHandle` separator + pill button (drag, dblclick reset, keyboard) | `frontend/src/components/common/ResizeHandle.tsx` |
| 3 | Sidebar `collapsed` prop → icon rail; AppShell places the handle | `components/shell/Sidebar.tsx`, `components/shell/AppShell.tsx` |
| 4 | Inbox list + right panel use the hook and handles | `pages/InboxPage.tsx` |
| 5 | Mockups show handles; PRD note | `mockups/AppShell.tsx`, `mockups/pages/InboxMockup.tsx`, `docs/prd.md` |
