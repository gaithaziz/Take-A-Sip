# Phase 4 Admin IA and UX Review

## 1. Workflow Analysis
Primary daily owner tasks:
- Quickly confirm menu availability and active sections.
- Add or toggle menu entities inside the hierarchy without losing context.
- Schedule menu entries by time window.
- Review currently active promotions.
- Update loyalty settings.
- Moderate users (search, filter, ban/unban).

Design priorities from review rules:
- Strong hierarchy clarity in menu editing.
- Fast scanning of status and date/time windows.
- Safe destructive actions.
- Lightweight forms with bilingual fields grouped together.

## 2. Information Architecture
Sidebar:
- Dashboard
- Menu Editor
- Promotions
- Loyalty Rules
- Scheduling
- Users

Global frame:
- Left sidebar for persistent navigation.
- Top header for language switch and session actions.
- Page title area with short context.
- Content grid using reusable cards and tables.

## 3. Page Structure and Components
Shared reusable components:
- AdminLayout, PageHeader, SectionCard, StatusBadge, ImageThumbnail
- SearchBar, FilterBar, DataTable, ConfirmDialog
- LoadingState, EmptyState, FormSection

Page hierarchy:
- Dashboard: operational summary cards + quick links.
- Menu Editor: nested expandable cards (Section -> Item -> Type -> Size -> Add-on), inline status, image thumbnail, create forms per level.
- Promotions: scan-first list with status and date range.
- Loyalty Rules: compact configuration panel and active summary.
- Scheduling: create schedule form tied to menu entities.
- Users: searchable/filterable table with safe moderation actions.

## 4. UX Critique Against ADMIN_UI_DESIGN_REVIEW
Risk: menu editor can become visually heavy.
Improvement: collapse by default at each level, keep concise row metadata, separate forms in side panel/card.

Risk: users table can get dense.
Improvement: limit columns to owner-critical fields and move secondary details to compact text.

Risk: unsupported backend actions could confuse owners.
Improvement: explicit capability notices where backend endpoints are missing (edit/reorder/list endpoints), while keeping implemented actions fully functional.

Risk: bilingual forms can feel cluttered.
Improvement: two-column bilingual field groups with clear labels and consistent spacing.

## 5. Final Pre-Implementation Decisions
- Use a calm, light-only warm neutral theme with clear semantic badges.
- Keep every page under consistent spacing rhythm.
- Prefer card + table hybrids over dense raw tables.
- Add confirmation dialogs for ban/unban and toggle actions.
- Include polished loading, empty, and error states on every data surface.

