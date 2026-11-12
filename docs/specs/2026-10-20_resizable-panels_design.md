# Resizable & collapsible panels — design (2026-10-20)

## Why
The left navigation, the inbox thread list and the inbox right panel (context + AI draft) have fixed widths. On narrow screens the reading pane is cramped; on wide screens the list truncates subjects. Users asked to drag the panels and to collapse them with small buttons.

## What
Three panels become resizable by dragging their edge and collapsible with a tiny button on that edge:
| Panel | Default | Min / max | Collapsed form |
|-------|---------|-----------|----------------|
| Left navigation (every page) | 240 px | 200 – 320 px | 56 px icon rail: logo, icons with tooltips, avatar |
| Inbox thread list | 340 px | 260 – 520 px | hidden; the edge handle stays with an expand button |
| Inbox right panel | 380 px | 300 – 560 px | hidden; the edge handle stays with an expand button |

## Decisions
- **One handle component** (`ResizeHandle`, `components/common`): a 6 px vertical separator with `role="separator"`, drag with pointer capture, a centered pill button (chevron) that collapses / expands, double-click resets to the default, Arrow keys resize by 16 px and Enter toggles when the handle is focused.
- **Widths and collapsed state persist** per panel in the prefs blob through `storageService` (the only module touching localStorage), keys `panel.<name>.width` / `panel.<name>.collapsed`. Hook `usePanelSize(name, { default, min, max })` owns state, clamping, drag and persistence.
- **Collapsed nav is an icon rail**, not hidden: navigation must stay one click away. Collapsed inbox panels are fully hidden since the handle button restores them.
- During a drag the body gets `cursor: col-resize` and `user-select: none` so text does not get selected and iframes/preview do not swallow events.
- Mockups (`/design/inbox` and the mockup AppShell) show the handles statically.

## Out of scope
Vertical resizing, remembering sizes per device/breakpoint, touch gestures beyond pointer events (pointer events cover touch).
