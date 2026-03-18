# Reorder Snapshot ID Enhancement Spec

## Goal
Make reorder resilient to menu name changes by matching order lines to current catalog using stable IDs first, then fallback to legacy name matching for backward compatibility.

## Scope
- Keep existing endpoints and payload shapes valid.
- Add optional snapshot ID fields on order item snapshot records.
- Preserve current behavior for old orders that do not have IDs.

## Proposed Schema Additions
- `OrderItemRead`
  - `item_id_snapshot?: string | null`
  - `size_id_snapshot?: string | null`
- `OrderItemAddonRead`
  - `addon_id_snapshot?: string | null`

## Write-Time Behavior (Order Creation)
- When creating an order line:
  - Persist `item_id_snapshot` using selected item ID.
  - Persist `size_id_snapshot` using selected size ID.
  - Persist each `addon_id_snapshot` using selected addon ID.
- Continue persisting existing name snapshots unchanged.

## Read-Time / Reorder Behavior
1. Try ID matching first:
   - Match line by `size_id_snapshot`.
   - Validate linked item via `item_id_snapshot` when present.
   - Match addons by `addon_id_snapshot`.
2. If any required ID is missing, fallback to current name snapshot matching.
3. If any line still cannot be rebuilt, keep current failure path (`reorderNotPossible`).

## Migration
- No destructive migration required.
- Existing rows remain valid with null snapshot IDs.
- Reorder logic must support mixed old/new orders.

## API Compatibility
- Existing clients continue to work.
- New fields are additive and optional in response models.

## Validation / Tests
- Unit tests:
  - Reorder success with ID snapshots when names changed.
  - Reorder fallback to name matching when IDs are missing.
  - Reorder failure when IDs and fallback both fail.
- Integration test:
  - Create order, rename menu entities, verify reorder still succeeds using ID snapshots.
