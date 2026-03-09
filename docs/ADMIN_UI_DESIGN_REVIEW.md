# Admin UI Design Review

This document defines the UX and UI review rules for the Admin Mobile App.

Its purpose is to force the coding agent to think through the admin experience before implementing screens, so the result feels polished, efficient, and easy for a real shop owner to use.

This file supplements:
- /docs/PRD.md
- /docs/DESIGN_SYSTEM.md
- /docs/AGENT_RULES.md
- /docs/TASKS_FOR_CODEX.md

---

# 1. Objective

The Admin Mobile App must not feel like a rough internal tool.

It must feel:
- professional
- clear
- modern
- efficient
- easy to scan
- easy to learn
- comfortable for daily use

The target user is a local shop owner or manager, not a developer.

The admin mobile app should optimize for:
- fast menu editing
- clear visibility into promotions and loyalty rules
- easy user moderation
- confidence when changing active/inactive states
- low mental load

---

# 2. Admin Experience Principles

The Admin Mobile App should be designed around these principles:

## Clarity first
The user should always understand:
- where they are
- what they are editing
- what is active/inactive
- what action they are about to take

## Efficiency
Common tasks should be quick:
- add a new menu item
- toggle item availability
- edit a promotion
- ban or unban a user
- inspect a hierarchy entry image
- adjust scheduling

## Low cognitive load
Avoid forcing the admin to interpret complicated layouts or deeply nested forms without guidance.

## Strong hierarchy
The structure of the menu must be visually obvious.

## Confidence
Destructive or important actions should feel safe and deliberate.

---

# 3. Required Design Process for the Agent

Before implementing any admin page, the agent must:

1. identify the page goal
2. identify the primary user actions on the page
3. identify the page's most important information
4. design the layout around those priorities
5. critique the page for usability
6. refine the page if it feels cluttered, confusing, or visually weak
7. only then implement it

The agent must not immediately jump into raw CRUD screens.

---

# 4. Global Layout Review Rules

The Admin Mobile App layout should include:

- navigation drawer
- page header/title area
- main content area
- consistent content width and spacing
- reusable actions area for buttons and filters

The layout must be reviewed against these questions:

- Is navigation obvious?
- Is the current page clearly indicated?
- Is the content area visually balanced?
- Is there enough spacing between major sections?
- Are filters and actions placed where users expect them?
- Does the page feel too dense?

---

# 5. Navigation Rules

The navigation drawer should feel simple and dependable.

Required qualities:
- clear active state
- obvious labels
- consistent icon use if icons are used
- not overcrowded
- easy to scan

Recommended items:
- Dashboard
- Menu Editor
- Promotions
- Loyalty Rules
- Scheduling
- Users

Questions to review:
- Can the admin understand the app structure at a glance?
- Are there too many navigation choices?
- Is the current location obvious?

---

# 6. Page Header Rules

Each page should have a strong top area including:
- page title
- short supporting description if useful
- primary page actions if relevant

Questions to review:
- Does the title clearly describe the page?
- Are the main actions visible without clutter?
- Is the top area too empty or too crowded?

---

# 7. Menu Editor Review Rules

The menu editor is the most important and most complex page.

The hierarchy is:

Section
→ Item
→ Item Type
→ Size
→ Add-on

The UI must make this hierarchy extremely clear.

The page should support:
- visual nesting
- inline status visibility
- image preview where supported
- easy expand/collapse
- easy create/edit actions at each level
- obvious active/inactive state

The menu editor must be reviewed against these questions:

- Can a non-technical owner understand the hierarchy quickly?
- Is the parent-child relationship visually obvious?
- Are actions easy to find at every level?
- Is active/inactive state clearly visible?
- Is image presence obvious?
- Can the admin tell what they are editing without confusion?
- Does the page feel structured rather than messy?

The menu editor must not look like:
- a flat table of unrelated rows
- a dump of forms
- an overcomplicated developer-only tree

Preferred qualities:
- expandable nested cards, panels, or rows
- subtle indentation
- badges for active/inactive
- thumbnails for image_url where available
- clear edit/add buttons at each hierarchy level

---

# 8. Image Handling Review Rules

Images are important in the menu editor.

If image_url is supported for an entity, the UI should:
- show a thumbnail preview
- support editing the image URL
- show a clear empty placeholder if missing
- keep aspect ratio consistent
- avoid broken image layouts

Questions to review:
- Is the image easy to notice?
- Is the placeholder elegant when no image exists?
- Is image editing obvious?
- Does the layout stay clean with or without images?

---

# 9. Promotions Page Review Rules

The Promotions page should help the owner understand what offers are currently live and what is upcoming.

The page should make these things easy to scan:
- promotion title
- active/inactive state
- date range
- language-specific content
- edit action

Questions to review:
- Can the owner quickly see active promotions?
- Is date information obvious?
- Is bilingual content easy to understand?
- Is creating/editing a promotion straightforward?

Avoid:
- overcomplicated promotion logic UI
- confusing tables with too many columns
- weak visual distinction between active and inactive promotions

---

# 10. Loyalty Rules Page Review Rules

This page should explain loyalty logic clearly.

The owner should be able to quickly understand:
- how many orders trigger the reward
- what the reward is
- whether the rule is active

Questions to review:
- Can the owner understand the loyalty setup in seconds?
- Is the form too technical?
- Is the configured reward shown clearly after saving?

Avoid building a visually confusing “rules engine” interface.

---

# 11. Scheduling Page Review Rules

Scheduling should feel simple and trustworthy.

The owner should be able to:
- choose a target menu entity
- set start time
- set end time
- enable/disable the schedule

Questions to review:
- Is it obvious what entity the schedule applies to?
- Are start and end times easy to edit?
- Is the schedule state obvious?
- Can the owner understand this without reading documentation?

Avoid:
- overly technical recurrence UI
- dense scheduling tables without explanation
- unclear relation between schedule and menu hierarchy entry

---

# 12. Users Page Review Rules

The Users page should feel operational and clear.

It should support:
- search
- filtering
- banned status visibility
- ban/unban actions
- basic user information visibility

Questions to review:
- Can the owner quickly find a user?
- Is banned status obvious?
- Do ban/unban actions feel safe and deliberate?
- Is the table readable and not overcrowded?

Ban/unban actions should ideally use confirmation.

If the API supports ban reason, the UI should handle it cleanly without making the flow annoying.

---

# 13. Table Review Rules

Where tables are used, they must be:
- readable
- well spaced
- not overly dense
- responsive enough for laptop usage
- visually organized

Questions to review:
- Are the most important columns visible first?
- Is there enough spacing?
- Are status badges readable?
- Are actions obvious but not noisy?

Avoid:
- cramped row height
- too many columns
- tiny action buttons
- weak text contrast

---

# 14. Form Review Rules

Admin forms must be easy to complete.

They should use:
- clear labels
- grouped fields
- consistent spacing
- inline validation where useful
- simple save/cancel actions

Questions to review:
- Are the fields grouped logically?
- Are bilingual fields clearly labeled?
- Is validation feedback helpful?
- Does the form feel overwhelming?

Avoid:
- giant unstructured forms
- poor distinction between English and Arabic fields
- excessive modal complexity

---

# 15. Bilingual / RTL Review Rules

The Admin Mobile App must support English and Arabic.

Requirements:
- English in LTR
- Arabic in RTL
- labels and inputs remain aligned properly
- tables and cards remain visually balanced in RTL
- bilingual content fields are easy to distinguish

Questions to review:
- Does RTL break the layout?
- Are Arabic fields readable and well aligned?
- Is the UI still elegant in both languages?

The agent must not treat RTL as an afterthought.

---

# 16. Status Visibility Rules

States such as:
- active
- inactive
- banned
- scheduled
- unscheduled

must be easy to identify.

Use:
- badges
- chips
- clear labels
- consistent semantic colors

Questions to review:
- Can the owner identify state without opening details?
- Are colors consistent?
- Are labels readable without relying only on color?

---

# 17. Feedback and Safety Rules

The Admin Mobile App must clearly communicate actions.

Required feedback quality:
- loading states
- save success feedback
- mutation errors
- empty states
- destructive action confirmation where appropriate

Questions to review:
- Does the owner know when a save worked?
- Are errors understandable?
- Do destructive actions feel safe?

Avoid silent failures or ambiguous updates.

---

# 18. Visual Density Rules

The admin mobile app must not feel visually overwhelming.

Questions to review:
- Is there enough spacing between blocks?
- Are pages trying to do too much at once?
- Can the owner focus on one task at a time?
- Are nested structures still readable?

If a page feels heavy, the agent should simplify it before shipping.

---

# 19. Reusable Component Rules

The agent should not design each page from scratch.

It should create reusable admin UI components such as:
- AdminLayout
- PageHeader
- SectionCard
- StatusBadge
- EmptyState
- LoadingState
- ConfirmDialog
- ImageThumbnail
- SearchBar
- FilterBar
- DataTable
- FormSection

Questions to review:
- Are pages visually consistent?
- Are interactions consistent?
- Is there duplication that should become reusable UI?

---

# 20. Definition of Good Admin UI

A page is good only if:
- the owner can understand it quickly
- the page hierarchy is visually clear
- primary actions are obvious
- the layout is calm and readable
- the page looks polished, not temporary
- English and Arabic both look intentional
- image and status handling are clear
- the page feels production-ready

---

# 21. Final Review Requirement for the Agent

Before considering the Admin Mobile App complete, the agent must perform a final self-review of all pages using this checklist:

- Is the admin mobile app easy for a real shop owner to use?
- Is the menu hierarchy visually clear?
- Are images handled elegantly?
- Are tables readable?
- Are forms clean and grouped properly?
- Are statuses obvious?
- Does the bilingual UI look intentional?
- Does the admin panel feel polished rather than generic?

If the answer is no to any of these, improve the UI before finalizing implementation.
