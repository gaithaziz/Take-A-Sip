"use client";

import { ArrowRightLeft, Plus, Power, Save, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { EmptyState } from '@/components/admin/empty-state';
import { FormSection } from '@/components/admin/form-section';
import { ImageThumbnail } from '@/components/admin/image-thumbnail';
import { LoadingState } from '@/components/admin/loading-state';
import { PageHeader } from '@/components/admin/page-header';
import { SearchBar } from '@/components/admin/search-bar';
import { SectionCard } from '@/components/admin/section-card';
import { StatusBadge } from '@/components/admin/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useMenu, useSchedules } from '@/hooks/use-admin-data';
import { adminApi } from '@/services/admin-api';
import { MenuAddon, MenuItem, MenuSection, MenuSize, MenuType, UUID } from '@/types/menu';

type MenuKind = 'section' | 'item' | 'type' | 'size' | 'addon';
type FilterMode = 'all' | 'active' | 'inactive' | 'issues';
type MenuEntity = MenuSection | MenuItem | MenuType | MenuSize | MenuAddon;

type EditTarget = {
  kind: MenuKind;
  mode?: 'edit' | 'move';
  id: UUID;
};

type DeleteTarget = {
  kind: MenuKind;
  id: UUID;
  description: string;
};

function badgeClasses(tone: 'visible' | 'warning' | 'muted') {
  if (tone === 'visible') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (tone === 'warning') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-zinc-200 bg-zinc-100 text-zinc-700';
}

function parseOptionalLimit(value: string) {
  const trimmed = value.trim();
  return trimmed ? Number(trimmed) : null;
}

function menuKindLabel(kind: MenuKind) {
  if (kind === 'section') return 'category';
  if (kind === 'item') return 'product';
  if (kind === 'type') return 'option';
  if (kind === 'size') return 'variant';
  return 'add-on';
}

function activeTypeCount(item: MenuItem) {
  return item.item_types.filter((itemType) => itemType.is_active && itemType.sizes.some((size) => size.is_active)).length;
}

function activeSizeCount(itemType: MenuType) {
  return itemType.sizes.filter((size) => size.is_active).length;
}

function getVisibilityLabel(kind: MenuKind, entity: MenuEntity, ancestorsActive: boolean) {
  if (!ancestorsActive) return { label: 'Hidden: inactive ancestor', tone: 'muted' as const };
  if (!entity.is_active) return { label: 'Hidden: inactive', tone: 'muted' as const };
  if (kind === 'section') {
    return (entity as MenuSection).items.some((item) => activeTypeCount(item) > 0)
      ? { label: 'Visible', tone: 'visible' as const }
      : { label: 'Hidden: needs active item path', tone: 'warning' as const };
  }
  if (kind === 'item') {
    return activeTypeCount(entity as MenuItem) > 0
      ? { label: 'Visible', tone: 'visible' as const }
      : { label: 'Hidden: needs active option and variant', tone: 'warning' as const };
  }
  if (kind === 'type') {
    return activeSizeCount(entity as MenuType) > 0
      ? { label: 'Visible', tone: 'visible' as const }
      : { label: 'Hidden: needs active variant', tone: 'warning' as const };
  }
  return { label: 'Visible', tone: 'visible' as const };
}

function matchesQuery(entity: MenuEntity, kind: MenuKind, query: string) {
  if (!query.trim()) return true;
  const normalized = query.trim().toLowerCase();
  const values = [entity.name_en, entity.name_ar, entity.image_url ?? ''];
  if (kind === 'item') {
    values.push((entity as MenuItem).description_en ?? '', (entity as MenuItem).description_ar ?? '');
  }
  return values.some((value) => value.toLowerCase().includes(normalized));
}

function Row({
  title,
  subtitle,
  image,
  active,
  visibility,
  scheduled,
  onToggle,
  onCreateChild,
  onEdit,
  onMove,
  onDelete,
}: {
  title: string;
  subtitle: string;
  image?: string | null;
  active: boolean;
  visibility: ReturnType<typeof getVisibilityLabel>;
  scheduled?: boolean;
  onToggle: () => void;
  onCreateChild?: () => void;
  onEdit?: () => void;
  onMove?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-zinc-200 bg-white p-3">
      <div className="flex items-start gap-3">
        <ImageThumbnail src={image} alt={title} />
        <div>
          <p className="font-medium text-zinc-900">{title}</p>
          <p className="text-xs text-zinc-500">{subtitle}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge active={active} />
            <Badge variant="outline" className={badgeClasses(visibility.tone)}>
              {visibility.label}
            </Badge>
            {scheduled ? (
              <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
                Scheduled
              </Badge>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {onCreateChild ? (
          <Button variant="outline" size="xs" onClick={onCreateChild}>
            <Plus className="mr-1 h-4 w-4" />
            Add Child
          </Button>
        ) : null}
        {onEdit ? (
          <Button variant="outline" size="xs" onClick={onEdit}>
            Edit
          </Button>
        ) : null}
        {onMove ? (
          <Button variant="outline" size="xs" onClick={onMove}>
            <ArrowRightLeft className="mr-1 h-4 w-4" />
            Move
          </Button>
        ) : null}
        <Button variant="outline" size="xs" onClick={onToggle}>
          <Power className="mr-1 h-4 w-4" />
          Toggle
        </Button>
        {onDelete ? (
          <Button variant="destructive" size="xs" onClick={onDelete}>
            <Trash2 className="mr-1 h-4 w-4" />
            Delete
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export default function MenuEditorPage() {
  const { data, error, isLoading, mutate } = useMenu();
  const { data: schedulesData, mutate: mutateSchedules } = useSchedules();
  const [pendingToggleId, setPendingToggleId] = useState<UUID | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [query, setQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  const [selectedSection, setSelectedSection] = useState<UUID | null>(null);
  const [selectedItem, setSelectedItem] = useState<UUID | null>(null);
  const [selectedType, setSelectedType] = useState<UUID | null>(null);
  const [selectedSize, setSelectedSize] = useState<UUID | null>(null);
  const [editingEntity, setEditingEntity] = useState<EditTarget | null>(null);

  const [sectionForm, setSectionForm] = useState({ name_en: '', name_ar: '', image_url: '', sort_order: '0' });
  const [itemForm, setItemForm] = useState({
    name_en: '',
    name_ar: '',
    image_url: '',
    description_en: '',
    description_ar: '',
    sort_order: '0',
  });
  const [typeForm, setTypeForm] = useState({ name_en: '', name_ar: '', image_url: '', sort_order: '0' });
  const [sizeForm, setSizeForm] = useState({ name_en: '', name_ar: '', image_url: '', price: '', order_limit: '', sort_order: '0' });
  const [addonForm, setAddonForm] = useState({ name_en: '', name_ar: '', image_url: '', price: '', sort_order: '0' });
  const [editForm, setEditForm] = useState({
    parent_id: '',
    name_en: '',
    name_ar: '',
    image_url: '',
    description_en: '',
    description_ar: '',
    price: '',
    order_limit: '',
    sort_order: '0',
  });

  const sections = useMemo(() => data?.sections ?? [], [data]);
  const schedules = useMemo(() => schedulesData?.schedules ?? [], [schedulesData]);
  const scheduleKeys = useMemo(
    () => new Set(schedules.filter((schedule) => schedule.is_active).map((schedule) => `${schedule.entity_type}:${schedule.entity_id}`)),
    [schedules],
  );
  const items = useMemo(() => sections.flatMap((section) => section.items), [sections]);
  const itemTypes = useMemo(() => items.flatMap((item) => item.item_types), [items]);
  const sizes = useMemo(() => itemTypes.flatMap((itemType) => itemType.sizes), [itemTypes]);

  const refreshMenu = async (includeSchedules = false) => {
    await mutate();
    if (includeSchedules) {
      await mutateSchedules();
    }
  };

  const startEdit = (
    kind: EditTarget['kind'],
    id: UUID,
    values: {
      parent_id?: UUID | null;
      name_en: string;
      name_ar: string;
      image_url?: string | null;
      description_en?: string | null;
      description_ar?: string | null;
      price?: string | number;
      order_limit?: number | null;
      sort_order: number;
    },
  ) => {
    setEditingEntity({ kind, id, mode: 'edit' });
    setEditForm({
      parent_id: values.parent_id ?? '',
      name_en: values.name_en,
      name_ar: values.name_ar,
      image_url: values.image_url ?? '',
      description_en: values.description_en ?? '',
      description_ar: values.description_ar ?? '',
      price: values.price === undefined ? '' : String(values.price),
      order_limit: values.order_limit == null ? '' : String(values.order_limit),
      sort_order: String(values.sort_order),
    });
  };

  const startMove = (kind: EditTarget['kind'], id: UUID, parentId: UUID | null, sortOrder: number) => {
    setEditingEntity({ kind, id, mode: 'move' });
    setEditForm({
      parent_id: parentId ?? '',
      name_en: '',
      name_ar: '',
      image_url: '',
      description_en: '',
      description_ar: '',
      price: '',
      order_limit: '',
      sort_order: String(sortOrder),
    });
  };

  const buildDeleteDescription = (kind: MenuKind, entity: MenuEntity) => {
    const counts = {
      sections: 0,
      items: 0,
      types: 0,
      sizes: 0,
      addons: 0,
      schedules: 0,
    };
    const keys: string[] = [];
    const track = (entityKind: MenuKind, entityId: UUID) => {
      if (entityKind === 'section') counts.sections += 1;
      if (entityKind === 'item') counts.items += 1;
      if (entityKind === 'type') counts.types += 1;
      if (entityKind === 'size') counts.sizes += 1;
      if (entityKind === 'addon') counts.addons += 1;
      keys.push(`${entityKind}:${entityId}`);
    };

    if (kind === 'section') {
      track('section', entity.id);
      (entity as MenuSection).items.forEach((item) => {
        track('item', item.id);
        item.item_types.forEach((itemType) => {
          track('type', itemType.id);
          itemType.sizes.forEach((size) => {
            track('size', size.id);
            size.addons.forEach((addon) => track('addon', addon.id));
          });
        });
      });
    } else if (kind === 'item') {
      track('item', entity.id);
      (entity as MenuItem).item_types.forEach((itemType) => {
        track('type', itemType.id);
        itemType.sizes.forEach((size) => {
          track('size', size.id);
          size.addons.forEach((addon) => track('addon', addon.id));
        });
      });
    } else if (kind === 'type') {
      track('type', entity.id);
      (entity as MenuType).sizes.forEach((size) => {
        track('size', size.id);
        size.addons.forEach((addon) => track('addon', addon.id));
      });
    } else if (kind === 'size') {
      track('size', entity.id);
      (entity as MenuSize).addons.forEach((addon) => track('addon', addon.id));
    } else {
      track('addon', entity.id);
    }

    counts.schedules = keys.filter((key) => scheduleKeys.has(key)).length;
    return `This removes ${counts.sections} categories, ${counts.items} products, ${counts.types} options, ${counts.sizes} variants, ${counts.addons} add-ons, and ${counts.schedules} schedules. Historical orders keep their snapshots.`;
  };

  const saveEdit = async () => {
    if (!editingEntity) {
      return;
    }
    try {
      const payload: Record<string, unknown> = {
        sort_order: Number(editForm.sort_order || 0),
      };
      if (editingEntity.mode !== 'move') {
        payload.name_en = editForm.name_en;
        payload.name_ar = editForm.name_ar;
        payload.image_url = editForm.image_url || null;
        if (editingEntity.kind === 'item') {
          payload.description_en = editForm.description_en || null;
          payload.description_ar = editForm.description_ar || null;
        }
        if (editingEntity.kind === 'size' || editingEntity.kind === 'addon') {
          payload.price = Number(editForm.price || 0);
        }
        if (editingEntity.kind === 'size') {
          payload.order_limit = parseOptionalLimit(editForm.order_limit);
        }
      }
      if (editingEntity.mode === 'move') {
        if (editingEntity.kind === 'item') payload.section_id = editForm.parent_id;
        if (editingEntity.kind === 'type') payload.item_id = editForm.parent_id;
        if (editingEntity.kind === 'size') payload.type_id = editForm.parent_id;
        if (editingEntity.kind === 'addon') payload.size_id = editForm.parent_id;
      }
      if (editingEntity.kind === 'section') await adminApi.updateSection(editingEntity.id, payload);
      if (editingEntity.kind === 'item') await adminApi.updateItem(editingEntity.id, payload);
      if (editingEntity.kind === 'type') await adminApi.updateType(editingEntity.id, payload);
      if (editingEntity.kind === 'size') await adminApi.updateSize(editingEntity.id, payload);
      if (editingEntity.kind === 'addon') await adminApi.updateAddon(editingEntity.id, payload);
      toast.success(editingEntity.mode === 'move' ? 'Entity moved' : 'Entity updated');
      setEditingEntity(null);
      await refreshMenu();
    } catch {
      toast.error(editingEntity.mode === 'move' ? 'Failed to move entity' : 'Failed to update entity');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    try {
      await adminApi.deleteMenuEntity(deleteTarget.kind, deleteTarget.id);
      toast.success('Hierarchy entry deleted');
      setDeleteTarget(null);
      setEditingEntity(null);
      await refreshMenu(true);
    } catch {
      toast.error('Failed to delete hierarchy entry');
    }
  };

  const handleToggle = async () => {
    if (!pendingToggleId) {
      return;
    }
    try {
      await adminApi.toggleMenuEntity(pendingToggleId);
      toast.success('Status updated');
      await refreshMenu();
    } catch {
      toast.error('Failed to update status');
    } finally {
      setPendingToggleId(null);
    }
  };

  const createSection = async () => {
    try {
      await adminApi.createSection({
        name_en: sectionForm.name_en,
        name_ar: sectionForm.name_ar,
        image_url: sectionForm.image_url || undefined,
        sort_order: Number(sectionForm.sort_order || 0),
      });
      toast.success('Category created');
      setSectionForm({ name_en: '', name_ar: '', image_url: '', sort_order: '0' });
      await refreshMenu();
    } catch {
      toast.error('Failed to create category');
    }
  };

  const createItem = async () => {
    if (!selectedSection) {
      toast.error('Select a category first');
      return;
    }
    try {
      const createdItem = await adminApi.createItem({
        section_id: selectedSection,
        name_en: itemForm.name_en,
        name_ar: itemForm.name_ar,
        image_url: itemForm.image_url || undefined,
        description_en: itemForm.description_en || undefined,
        description_ar: itemForm.description_ar || undefined,
        sort_order: Number(itemForm.sort_order || 0),
      });
      setSelectedItem(createdItem.id);
      setSelectedType(null);
      setSelectedSize(null);
      toast.success('Product created. Add an option and a variant to make it visible to customers.');
      setItemForm({ name_en: '', name_ar: '', image_url: '', description_en: '', description_ar: '', sort_order: '0' });
      await refreshMenu();
    } catch {
      toast.error('Failed to create product');
    }
  };

  const createType = async () => {
    if (!selectedItem) {
      toast.error('Select a product first');
      return;
    }
    try {
      const createdType = await adminApi.createType({
        item_id: selectedItem,
        name_en: typeForm.name_en,
        name_ar: typeForm.name_ar,
        image_url: typeForm.image_url || undefined,
        sort_order: Number(typeForm.sort_order || 0),
      });
      setSelectedType(createdType.id);
      setSelectedSize(null);
      toast.success('Option created. Add a variant to make the product visible to customers.');
      setTypeForm({ name_en: '', name_ar: '', image_url: '', sort_order: '0' });
      await refreshMenu();
    } catch {
      toast.error('Failed to create option');
    }
  };

  const createSize = async () => {
    if (!selectedType) {
      toast.error('Select an option first');
      return;
    }
    try {
      await adminApi.createSize({
        type_id: selectedType,
        name_en: sizeForm.name_en,
        name_ar: sizeForm.name_ar,
        image_url: sizeForm.image_url || undefined,
        price: Number(sizeForm.price),
        order_limit: parseOptionalLimit(sizeForm.order_limit),
        sort_order: Number(sizeForm.sort_order || 0),
      });
      toast.success('Variant created');
      setSizeForm({ name_en: '', name_ar: '', image_url: '', price: '', order_limit: '', sort_order: '0' });
      await refreshMenu();
    } catch {
      toast.error('Failed to create variant');
    }
  };

  const createAddon = async () => {
    if (!selectedSize) {
      toast.error('Select a variant first');
      return;
    }
    try {
      await adminApi.createAddon({
        size_id: selectedSize,
        name_en: addonForm.name_en,
        name_ar: addonForm.name_ar,
        image_url: addonForm.image_url || undefined,
        price: Number(addonForm.price),
        sort_order: Number(addonForm.sort_order || 0),
      });
      toast.success('Add-on created');
      setAddonForm({ name_en: '', name_ar: '', image_url: '', price: '', sort_order: '0' });
      await refreshMenu();
    } catch {
      toast.error('Failed to create add-on');
    }
  };

  const selectedContextLabel = useMemo(() => {
    const labels: string[] = [];
    const section = sections.find((entry) => entry.id === selectedSection);
    if (section) labels.push(section.name_en);
    const item = items.find((entry) => entry.id === selectedItem);
    if (item) labels.push(item.name_en);
    const itemType = itemTypes.find((entry) => entry.id === selectedType);
    if (itemType) labels.push(itemType.name_en);
    const size = sizes.find((entry) => entry.id === selectedSize);
    if (size) labels.push(size.name_en);
    return labels.join(' > ');
  }, [itemTypes, items, sections, selectedItem, selectedSection, selectedSize, selectedType, sizes]);

  const visibleSections = useMemo(() => {
    const matchesFilter = (isActive: boolean, visibility: ReturnType<typeof getVisibilityLabel>) => {
      if (filterMode === 'all') return true;
      if (filterMode === 'active') return isActive;
      if (filterMode === 'inactive') return !isActive;
      return visibility.label !== 'Visible';
    };

    return sections
      .map((section) => {
        const visibleItems = section.items
          .map((item) => {
            const visibleTypes = item.item_types
              .map((itemType) => {
                const visibleSizes = itemType.sizes
                  .map((size) => {
                    const visibleAddons = size.addons.filter((addon) => {
                      const visibility = getVisibilityLabel('addon', addon, section.is_active && item.is_active && itemType.is_active && size.is_active);
                      return matchesQuery(addon, 'addon', query) && matchesFilter(addon.is_active, visibility);
                    });
                    const visibility = getVisibilityLabel('size', size, section.is_active && item.is_active && itemType.is_active);
                    const keepSelf = matchesQuery(size, 'size', query) && matchesFilter(size.is_active, visibility);
                    return keepSelf || visibleAddons.length > 0 ? { ...size, addons: visibleAddons } : null;
                  })
                  .filter((size): size is MenuSize => Boolean(size));

                const visibility = getVisibilityLabel('type', itemType, section.is_active && item.is_active);
                const keepSelf = matchesQuery(itemType, 'type', query) && matchesFilter(itemType.is_active, visibility);
                return keepSelf || visibleSizes.length > 0 ? { ...itemType, sizes: visibleSizes } : null;
              })
              .filter((itemType): itemType is MenuType => Boolean(itemType));

            const visibility = getVisibilityLabel('item', item, section.is_active);
            const keepSelf = matchesQuery(item, 'item', query) && matchesFilter(item.is_active, visibility);
            return keepSelf || visibleTypes.length > 0 ? { ...item, item_types: visibleTypes } : null;
          })
          .filter((item): item is MenuItem => Boolean(item));

        const visibility = getVisibilityLabel('section', section, true);
        const keepSelf = matchesQuery(section, 'section', query) && matchesFilter(section.is_active, visibility);
        return keepSelf || visibleItems.length > 0 ? { ...section, items: visibleItems } : null;
      })
      .filter((section): section is MenuSection => Boolean(section))
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [filterMode, query, sections]);

  if (isLoading) return <LoadingState rows={6} />;
  if (error) return <EmptyState title="Menu unavailable" description="Could not load menu hierarchy from /menu." />;

  return (
    <div className="space-y-6">
      <PageHeader title="Menu Editor" description="Row-level hierarchy actions for add, edit, move, toggle, delete, and visibility review." />

      <div className="flex flex-wrap items-center gap-3">
        <SearchBar value={query} onChange={setQuery} placeholder="Search menu hierarchy" />
        <div className="flex flex-wrap gap-2">
          {(['all', 'active', 'inactive', 'issues'] as const).map((mode) => (
            <Button key={mode} variant={filterMode === mode ? 'default' : 'outline'} size="sm" onClick={() => setFilterMode(mode)}>
              {mode === 'all' ? 'All' : mode === 'active' ? 'Active' : mode === 'inactive' ? 'Inactive' : 'Needs attention'}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <SectionCard title="Hierarchy" description="Use the row actions directly where you are working. Search and filters keep large menus manageable.">
          <div className="space-y-3">
            {selectedContextLabel ? (
              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
                Current context: {selectedContextLabel}
              </div>
            ) : null}
            {visibleSections.length === 0 ? <EmptyState title="No matching entries" description="Create a category or change the current search/filter." /> : null}
            {visibleSections.map((section) => (
              <details key={section.id} className="rounded-md border border-zinc-200 bg-[#fcfbf9] p-3" open>
                <summary className="list-none">
                  <Row
                    title={`${section.name_en} / ${section.name_ar}`}
                    subtitle={`Category - sort ${section.sort_order}`}
                    image={section.image_url}
                    active={section.is_active}
                    visibility={getVisibilityLabel('section', section, true)}
                    scheduled={scheduleKeys.has(`section:${section.id}`)}
                    onToggle={() => setPendingToggleId(section.id)}
                    onCreateChild={() => setSelectedSection(section.id)}
                    onEdit={() => {
                      setSelectedSection(section.id);
                      setSelectedItem(null);
                      setSelectedType(null);
                      setSelectedSize(null);
                      startEdit('section', section.id, { ...section, sort_order: section.sort_order });
                    }}
                    onMove={() => startMove('section', section.id, null, section.sort_order)}
                    onDelete={() => setDeleteTarget({
                      kind: 'section',
                      id: section.id,
                      description: buildDeleteDescription('section', section),
                    })}
                  />
                </summary>
                <div className="mt-3 space-y-3 pl-4">
                  {section.items.map((item) => (
                    <details key={item.id} className="rounded-md border border-zinc-200 bg-white p-3">
                      <summary className="list-none">
                        <Row
                            title={`${item.name_en} / ${item.name_ar}`}
                            subtitle={`Product - sort ${item.sort_order}`}
                            image={item.image_url}
                            active={item.is_active}
                            visibility={getVisibilityLabel('item', item, section.is_active)}
                            scheduled={scheduleKeys.has(`item:${item.id}`)}
                            onToggle={() => setPendingToggleId(item.id)}
                            onCreateChild={() => {
                              setSelectedSection(section.id);
                              setSelectedItem(item.id);
                            }}
                            onEdit={() => {
                              setSelectedSection(section.id);
                              setSelectedItem(item.id);
                              setSelectedType(null);
                              setSelectedSize(null);
                              startEdit('item', item.id, { ...item, parent_id: item.section_id, sort_order: item.sort_order });
                            }}
                            onMove={() => startMove('item', item.id, item.section_id, item.sort_order)}
                            onDelete={() => setDeleteTarget({
                              kind: 'item',
                              id: item.id,
                              description: buildDeleteDescription('item', item),
                            })}
                          />
                        </summary>
                        <div className="mt-3 space-y-3 pl-4">
                          {item.item_types.map((type) => (
                            <details key={type.id} className="rounded-md border border-zinc-200 bg-[#fcfbf9] p-3">
                            <summary className="list-none">
                              <Row
                                title={`${type.name_en} / ${type.name_ar}`}
                                subtitle={`Option - sort ${type.sort_order}`}
                                image={type.image_url}
                                active={type.is_active}
                                visibility={getVisibilityLabel('type', type, section.is_active && item.is_active)}
                                scheduled={scheduleKeys.has(`type:${type.id}`)}
                                onToggle={() => setPendingToggleId(type.id)}
                                onCreateChild={() => {
                                  setSelectedItem(item.id);
                                  setSelectedType(type.id);
                                }}
                                onEdit={() => {
                                  setSelectedSection(section.id);
                                  setSelectedItem(item.id);
                                  setSelectedType(type.id);
                                  setSelectedSize(null);
                                  startEdit('type', type.id, { ...type, parent_id: type.item_id, sort_order: type.sort_order });
                                }}
                                onMove={() => startMove('type', type.id, type.item_id, type.sort_order)}
                                onDelete={() => setDeleteTarget({
                                  kind: 'type',
                                  id: type.id,
                                  description: buildDeleteDescription('type', type),
                                })}
                              />
                            </summary>
                            <div className="mt-3 space-y-3 pl-4">
                              {type.sizes.map((size) => (
                                <details key={size.id} className="rounded-md border border-zinc-200 bg-white p-3">
                                  <summary className="list-none">
                                    <Row
                                      title={`${size.name_en} / ${size.name_ar}`}
                                      subtitle={`Variant - ${size.price} - ${size.order_limit ? `limit ${size.order_limit}` : 'unlimited'} - sort ${size.sort_order}`}
                                      image={size.image_url}
                                      active={size.is_active}
                                      visibility={getVisibilityLabel('size', size, section.is_active && item.is_active && type.is_active)}
                                      scheduled={scheduleKeys.has(`size:${size.id}`)}
                                      onToggle={() => setPendingToggleId(size.id)}
                                      onCreateChild={() => {
                                        setSelectedType(type.id);
                                        setSelectedSize(size.id);
                                      }}
                                      onEdit={() => {
                                        setSelectedSection(section.id);
                                        setSelectedItem(item.id);
                                        setSelectedType(type.id);
                                        setSelectedSize(size.id);
                                        startEdit('size', size.id, { ...size, parent_id: size.type_id, sort_order: size.sort_order });
                                      }}
                                      onMove={() => startMove('size', size.id, size.type_id, size.sort_order)}
                                      onDelete={() => setDeleteTarget({
                                        kind: 'size',
                                        id: size.id,
                                        description: buildDeleteDescription('size', size),
                                      })}
                                    />
                                  </summary>
                                  <div className="mt-3 space-y-3 pl-4">
                                    {size.addons.map((addon) => (
                                      <Row
                                        key={addon.id}
                                        title={`${addon.name_en} / ${addon.name_ar}`}
                                        subtitle={`Add-on - ${addon.price} - sort ${addon.sort_order}`}
                                        image={addon.image_url}
                                        active={addon.is_active}
                                        visibility={getVisibilityLabel('addon', addon, section.is_active && item.is_active && type.is_active && size.is_active)}
                                        scheduled={scheduleKeys.has(`addon:${addon.id}`)}
                                        onToggle={() => setPendingToggleId(addon.id)}
                                        onEdit={() => {
                                          setSelectedSection(section.id);
                                          setSelectedItem(item.id);
                                          setSelectedType(type.id);
                                          setSelectedSize(size.id);
                                          startEdit('addon', addon.id, { ...addon, parent_id: addon.size_id, sort_order: addon.sort_order });
                                        }}
                                        onMove={() => startMove('addon', addon.id, addon.size_id, addon.sort_order)}
                                        onDelete={() => setDeleteTarget({
                                          kind: 'addon',
                                          id: addon.id,
                                          description: buildDeleteDescription('addon', addon),
                                        })}
                                      />
                                    ))}
                                  </div>
                                </details>
                              ))}
                            </div>
                          </details>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="Create Entries" description="Use selected parent context from row actions to add new child entities quickly.">
            <div className="space-y-4">
              <FormSection title="Category">
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="name_en" value={sectionForm.name_en} onChange={(e) => setSectionForm((p) => ({ ...p, name_en: e.target.value }))} />
                  <Input placeholder="name_ar" value={sectionForm.name_ar} onChange={(e) => setSectionForm((p) => ({ ...p, name_ar: e.target.value }))} />
                </div>
                <Input placeholder="image_url" value={sectionForm.image_url} onChange={(e) => setSectionForm((p) => ({ ...p, image_url: e.target.value }))} />
                <Input placeholder="sort_order" type="number" value={sectionForm.sort_order} onChange={(e) => setSectionForm((p) => ({ ...p, sort_order: e.target.value }))} />
                <Button onClick={createSection} className="w-full"><Save className="mr-1 h-4 w-4" />Create Category</Button>
              </FormSection>

              <FormSection
                title="Product"
                description={`Parent category: ${selectedSection ?? 'Not selected'}. Products appear in the customer menu after they have at least one active option and variant.`}>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="name_en" value={itemForm.name_en} onChange={(e) => setItemForm((p) => ({ ...p, name_en: e.target.value }))} />
                  <Input placeholder="name_ar" value={itemForm.name_ar} onChange={(e) => setItemForm((p) => ({ ...p, name_ar: e.target.value }))} />
                </div>
                <Input placeholder="image_url" value={itemForm.image_url} onChange={(e) => setItemForm((p) => ({ ...p, image_url: e.target.value }))} />
                <Textarea placeholder="description_en" value={itemForm.description_en} onChange={(e) => setItemForm((p) => ({ ...p, description_en: e.target.value }))} />
                <Textarea placeholder="description_ar" value={itemForm.description_ar} onChange={(e) => setItemForm((p) => ({ ...p, description_ar: e.target.value }))} />
                <Input placeholder="sort_order" type="number" value={itemForm.sort_order} onChange={(e) => setItemForm((p) => ({ ...p, sort_order: e.target.value }))} />
                <Button onClick={createItem} className="w-full"><Save className="mr-1 h-4 w-4" />Create Product</Button>
              </FormSection>

              <FormSection
                title="Option"
                description={`Parent product: ${selectedItem ?? 'Not selected'}. Add a variant next so customers can order it.`}>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="name_en" value={typeForm.name_en} onChange={(e) => setTypeForm((p) => ({ ...p, name_en: e.target.value }))} />
                  <Input placeholder="name_ar" value={typeForm.name_ar} onChange={(e) => setTypeForm((p) => ({ ...p, name_ar: e.target.value }))} />
                </div>
                <Input placeholder="image_url" value={typeForm.image_url} onChange={(e) => setTypeForm((p) => ({ ...p, image_url: e.target.value }))} />
                <Input placeholder="sort_order" type="number" value={typeForm.sort_order} onChange={(e) => setTypeForm((p) => ({ ...p, sort_order: e.target.value }))} />
                <Button onClick={createType} className="w-full"><Save className="mr-1 h-4 w-4" />Create Option</Button>
              </FormSection>

              <FormSection title="Variant" description={`Parent option: ${selectedType ?? 'Not selected'}`}>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="name_en" value={sizeForm.name_en} onChange={(e) => setSizeForm((p) => ({ ...p, name_en: e.target.value }))} />
                  <Input placeholder="name_ar" value={sizeForm.name_ar} onChange={(e) => setSizeForm((p) => ({ ...p, name_ar: e.target.value }))} />
                </div>
                <Input placeholder="image_url" value={sizeForm.image_url} onChange={(e) => setSizeForm((p) => ({ ...p, image_url: e.target.value }))} />
                <Input placeholder="price" type="number" value={sizeForm.price} onChange={(e) => setSizeForm((p) => ({ ...p, price: e.target.value }))} />
                <Input placeholder="order_limit (blank = unlimited)" type="number" min="1" value={sizeForm.order_limit} onChange={(e) => setSizeForm((p) => ({ ...p, order_limit: e.target.value }))} />
                <Input placeholder="sort_order" type="number" value={sizeForm.sort_order} onChange={(e) => setSizeForm((p) => ({ ...p, sort_order: e.target.value }))} />
                <Button onClick={createSize} className="w-full"><Save className="mr-1 h-4 w-4" />Create Variant</Button>
              </FormSection>

              <FormSection title="Add-on" description={`Parent variant: ${selectedSize ?? 'Not selected'}`}>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="name_en" value={addonForm.name_en} onChange={(e) => setAddonForm((p) => ({ ...p, name_en: e.target.value }))} />
                  <Input placeholder="name_ar" value={addonForm.name_ar} onChange={(e) => setAddonForm((p) => ({ ...p, name_ar: e.target.value }))} />
                </div>
                <Input placeholder="image_url" value={addonForm.image_url} onChange={(e) => setAddonForm((p) => ({ ...p, image_url: e.target.value }))} />
                <Input placeholder="price" type="number" value={addonForm.price} onChange={(e) => setAddonForm((p) => ({ ...p, price: e.target.value }))} />
                <Input placeholder="sort_order" type="number" value={addonForm.sort_order} onChange={(e) => setAddonForm((p) => ({ ...p, sort_order: e.target.value }))} />
                <Button onClick={createAddon} className="w-full"><Save className="mr-1 h-4 w-4" />Create Add-on</Button>
              </FormSection>
            </div>
          </SectionCard>

          {editingEntity ? (
            <SectionCard title={`${editingEntity.mode === 'move' ? 'Move' : 'Edit'} ${menuKindLabel(editingEntity.kind)}`}>
              <div className="space-y-3">
                {editingEntity.mode === 'move' && editingEntity.kind !== 'section' ? (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-zinc-700">
                      {editingEntity.kind === 'item'
                        ? 'Parent category'
                        : editingEntity.kind === 'type'
                          ? 'Parent product'
                          : editingEntity.kind === 'size'
                            ? 'Parent option'
                            : 'Parent variant'}
                    </p>
                    <select
                      className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-400"
                      value={editForm.parent_id}
                      onChange={(e) => setEditForm((p) => ({ ...p, parent_id: e.target.value }))}
                    >
                      <option value="">Select</option>
                      {editingEntity.kind === 'item'
                        ? sections.map((section) => (
                            <option key={section.id} value={section.id}>
                              {section.name_en} / {section.name_ar}
                            </option>
                          ))
                        : editingEntity.kind === 'type'
                          ? items.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name_en} / {item.name_ar}
                              </option>
                            ))
                          : editingEntity.kind === 'size'
                            ? itemTypes.map((itemType) => (
                                <option key={itemType.id} value={itemType.id}>
                                  {itemType.name_en} / {itemType.name_ar}
                                </option>
                              ))
                            : sizes.map((size) => (
                                <option key={size.id} value={size.id}>
                                  {size.name_en} / {size.name_ar}
                                </option>
                              ))}
                    </select>
                  </div>
                ) : null}
                {editingEntity.mode !== 'move' ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="name_en" value={editForm.name_en} onChange={(e) => setEditForm((p) => ({ ...p, name_en: e.target.value }))} />
                      <Input placeholder="name_ar" value={editForm.name_ar} onChange={(e) => setEditForm((p) => ({ ...p, name_ar: e.target.value }))} />
                    </div>
                    <Input placeholder="image_url" value={editForm.image_url} onChange={(e) => setEditForm((p) => ({ ...p, image_url: e.target.value }))} />
                    {editingEntity.kind === 'item' ? (
                      <>
                        <Textarea placeholder="description_en" value={editForm.description_en} onChange={(e) => setEditForm((p) => ({ ...p, description_en: e.target.value }))} />
                        <Textarea placeholder="description_ar" value={editForm.description_ar} onChange={(e) => setEditForm((p) => ({ ...p, description_ar: e.target.value }))} />
                      </>
                    ) : null}
                    {editingEntity.kind === 'size' || editingEntity.kind === 'addon' ? (
                      <Input placeholder="price" type="number" value={editForm.price} onChange={(e) => setEditForm((p) => ({ ...p, price: e.target.value }))} />
                    ) : null}
                    {editingEntity.kind === 'size' ? (
                      <Input placeholder="order_limit (blank = unlimited)" type="number" min="1" value={editForm.order_limit} onChange={(e) => setEditForm((p) => ({ ...p, order_limit: e.target.value }))} />
                    ) : null}
                  </>
                ) : (
                  <p className="text-sm text-zinc-600">Update the parent and sort order for this branch. Category moves only change sort order.</p>
                )}
                <Input placeholder="sort_order" type="number" value={editForm.sort_order} onChange={(e) => setEditForm((p) => ({ ...p, sort_order: e.target.value }))} />
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={saveEdit}>
                    {editingEntity.mode === 'move' ? 'Move' : 'Save'}
                  </Button>
                  <Button variant="outline" onClick={() => setEditingEntity(null)}>Cancel</Button>
                </div>
              </div>
            </SectionCard>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingToggleId)}
        onOpenChange={(open) => {
          if (!open) setPendingToggleId(null);
        }}
        title="Change availability"
        description="This toggles active/inactive state for the selected entity and can change customer visibility."
        confirmLabel="Confirm toggle"
        onConfirm={handleToggle}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete hierarchy entry"
        description={deleteTarget?.description ?? ''}
        confirmLabel="Delete permanently"
        onConfirm={handleDelete}
      />
    </div>
  );
}
