"use client";

import { Plus, Power, Save } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { EmptyState } from '@/components/admin/empty-state';
import { FormSection } from '@/components/admin/form-section';
import { ImageThumbnail } from '@/components/admin/image-thumbnail';
import { LoadingState } from '@/components/admin/loading-state';
import { PageHeader } from '@/components/admin/page-header';
import { SectionCard } from '@/components/admin/section-card';
import { StatusBadge } from '@/components/admin/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useMenu } from '@/hooks/use-admin-data';
import { adminApi } from '@/services/admin-api';
import { UUID } from '@/types/menu';

type EditTarget = {
  kind: 'section' | 'item' | 'type' | 'size' | 'addon';
  id: UUID;
};

function Row({
  title,
  subtitle,
  image,
  active,
  onToggle,
  onCreateChild,
  onEdit,
}: {
  title: string;
  subtitle: string;
  image?: string | null;
  active: boolean;
  onToggle: () => void;
  onCreateChild?: () => void;
  onEdit?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-zinc-200 bg-white p-3">
      <div className="flex items-center gap-3">
        <ImageThumbnail src={image} alt={title} />
        <div>
          <p className="font-medium text-zinc-900">{title}</p>
          <p className="text-xs text-zinc-500">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <StatusBadge active={active} />
        {onCreateChild ? (
          <Button variant="outline" size="sm" onClick={onCreateChild}>
            <Plus className="mr-1 h-4 w-4" />
            Add Child
          </Button>
        ) : null}
        {onEdit ? (
          <Button variant="outline" size="sm" onClick={onEdit}>
            Edit
          </Button>
        ) : null}
        <Button variant="outline" size="sm" onClick={onToggle}>
          <Power className="mr-1 h-4 w-4" />
          Toggle
        </Button>
      </div>
    </div>
  );
}

export default function MenuEditorPage() {
  const { data, error, isLoading, mutate } = useMenu();
  const [pendingToggleId, setPendingToggleId] = useState<UUID | null>(null);

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
  const [sizeForm, setSizeForm] = useState({ name_en: '', name_ar: '', image_url: '', price: '', sort_order: '0' });
  const [addonForm, setAddonForm] = useState({ name_en: '', name_ar: '', image_url: '', price: '', sort_order: '0' });
  const [editForm, setEditForm] = useState({
    name_en: '',
    name_ar: '',
    image_url: '',
    description_en: '',
    description_ar: '',
    price: '',
    sort_order: '0',
  });

  const sections = useMemo(() => data?.sections ?? [], [data]);

  const refreshMenu = async () => {
    await mutate();
  };

  const startEdit = (
    kind: EditTarget['kind'],
    id: UUID,
    values: {
      name_en: string;
      name_ar: string;
      image_url?: string | null;
      description_en?: string | null;
      description_ar?: string | null;
      price?: string | number;
      sort_order: number;
    },
  ) => {
    setEditingEntity({ kind, id });
    setEditForm({
      name_en: values.name_en,
      name_ar: values.name_ar,
      image_url: values.image_url ?? '',
      description_en: values.description_en ?? '',
      description_ar: values.description_ar ?? '',
      price: values.price === undefined ? '' : String(values.price),
      sort_order: String(values.sort_order),
    });
  };

  const saveEdit = async () => {
    if (!editingEntity) {
      return;
    }
    const payload: Record<string, unknown> = {
      name_en: editForm.name_en,
      name_ar: editForm.name_ar,
      image_url: editForm.image_url || null,
      sort_order: Number(editForm.sort_order || 0),
    };
    if (editingEntity.kind === 'item') {
      payload.description_en = editForm.description_en || null;
      payload.description_ar = editForm.description_ar || null;
    }
    if (editingEntity.kind === 'size' || editingEntity.kind === 'addon') {
      payload.price = Number(editForm.price || 0);
    }
    try {
      if (editingEntity.kind === 'section') await adminApi.updateSection(editingEntity.id, payload);
      if (editingEntity.kind === 'item') await adminApi.updateItem(editingEntity.id, payload);
      if (editingEntity.kind === 'type') await adminApi.updateType(editingEntity.id, payload);
      if (editingEntity.kind === 'size') await adminApi.updateSize(editingEntity.id, payload);
      if (editingEntity.kind === 'addon') await adminApi.updateAddon(editingEntity.id, payload);
      toast.success('Entity updated');
      setEditingEntity(null);
      await refreshMenu();
    } catch {
      toast.error('Failed to update entity');
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
      toast.success('Section created');
      setSectionForm({ name_en: '', name_ar: '', image_url: '', sort_order: '0' });
      await refreshMenu();
    } catch {
      toast.error('Failed to create section');
    }
  };

  const createItem = async () => {
    if (!selectedSection) {
      toast.error('Select a section first');
      return;
    }
    try {
      await adminApi.createItem({
        section_id: selectedSection,
        name_en: itemForm.name_en,
        name_ar: itemForm.name_ar,
        image_url: itemForm.image_url || undefined,
        description_en: itemForm.description_en || undefined,
        description_ar: itemForm.description_ar || undefined,
        sort_order: Number(itemForm.sort_order || 0),
      });
      toast.success('Item created');
      setItemForm({ name_en: '', name_ar: '', image_url: '', description_en: '', description_ar: '', sort_order: '0' });
      await refreshMenu();
    } catch {
      toast.error('Failed to create item');
    }
  };

  const createType = async () => {
    if (!selectedItem) {
      toast.error('Select an item first');
      return;
    }
    try {
      await adminApi.createType({
        item_id: selectedItem,
        name_en: typeForm.name_en,
        name_ar: typeForm.name_ar,
        image_url: typeForm.image_url || undefined,
        sort_order: Number(typeForm.sort_order || 0),
      });
      toast.success('Item type created');
      setTypeForm({ name_en: '', name_ar: '', image_url: '', sort_order: '0' });
      await refreshMenu();
    } catch {
      toast.error('Failed to create type');
    }
  };

  const createSize = async () => {
    if (!selectedType) {
      toast.error('Select an item type first');
      return;
    }
    try {
      await adminApi.createSize({
        type_id: selectedType,
        name_en: sizeForm.name_en,
        name_ar: sizeForm.name_ar,
        image_url: sizeForm.image_url || undefined,
        price: Number(sizeForm.price),
        sort_order: Number(sizeForm.sort_order || 0),
      });
      toast.success('Size created');
      setSizeForm({ name_en: '', name_ar: '', image_url: '', price: '', sort_order: '0' });
      await refreshMenu();
    } catch {
      toast.error('Failed to create size');
    }
  };

  const createAddon = async () => {
    if (!selectedSize) {
      toast.error('Select a size first');
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

  if (isLoading) return <LoadingState rows={6} />;
  if (error) return <EmptyState title="Menu unavailable" description="Could not load menu hierarchy from /menu." />;

  return (
    <div className="space-y-6">
      <PageHeader title="Menu Editor" description="Expandable hierarchy editor: Section -> Item -> Type -> Size -> Add-on." />

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <SectionCard title="Hierarchy" description="Use expanders to inspect parent-child relationships and edit sort order quickly.">
          <div className="space-y-3">
            {sections.length === 0 ? <EmptyState title="No sections yet" description="Create your first section." /> : null}
            {sections.sort((a, b) => a.sort_order - b.sort_order).map((section) => (
              <details key={section.id} className="rounded-md border border-zinc-200 bg-[#fcfbf9] p-3" open>
                <summary className="list-none">
                  <Row
                    title={`${section.name_en} / ${section.name_ar}`}
                    subtitle={`Section - sort ${section.sort_order}`}
                    image={section.image_url}
                    active={section.is_active}
                    onToggle={() => setPendingToggleId(section.id)}
                    onCreateChild={() => setSelectedSection(section.id)}
                    onEdit={() => startEdit('section', section.id, { ...section, sort_order: section.sort_order })}
                  />
                </summary>
                <div className="mt-3 space-y-3 pl-4">
                  {section.items.map((item) => (
                    <details key={item.id} className="rounded-md border border-zinc-200 bg-white p-3">
                      <summary className="list-none">
                        <Row
                          title={`${item.name_en} / ${item.name_ar}`}
                          subtitle={`Item - sort ${item.sort_order}`}
                          image={item.image_url}
                          active={item.is_active}
                          onToggle={() => setPendingToggleId(item.id)}
                          onCreateChild={() => {
                            setSelectedSection(section.id);
                            setSelectedItem(item.id);
                          }}
                          onEdit={() => startEdit('item', item.id, { ...item, sort_order: item.sort_order })}
                        />
                      </summary>
                      <div className="mt-3 space-y-3 pl-4">
                        {item.item_types.map((type) => (
                          <details key={type.id} className="rounded-md border border-zinc-200 bg-[#fcfbf9] p-3">
                            <summary className="list-none">
                              <Row
                                title={`${type.name_en} / ${type.name_ar}`}
                                subtitle={`Type - sort ${type.sort_order}`}
                                image={type.image_url}
                                active={type.is_active}
                                onToggle={() => setPendingToggleId(type.id)}
                                onCreateChild={() => {
                                  setSelectedItem(item.id);
                                  setSelectedType(type.id);
                                }}
                                onEdit={() => startEdit('type', type.id, { ...type, sort_order: type.sort_order })}
                              />
                            </summary>
                            <div className="mt-3 space-y-3 pl-4">
                              {type.sizes.map((size) => (
                                <details key={size.id} className="rounded-md border border-zinc-200 bg-white p-3">
                                  <summary className="list-none">
                                    <Row
                                      title={`${size.name_en} / ${size.name_ar}`}
                                      subtitle={`Size - ${size.price} - sort ${size.sort_order}`}
                                      image={size.image_url}
                                      active={size.is_active}
                                      onToggle={() => setPendingToggleId(size.id)}
                                      onCreateChild={() => {
                                        setSelectedType(type.id);
                                        setSelectedSize(size.id);
                                      }}
                                      onEdit={() => startEdit('size', size.id, { ...size, sort_order: size.sort_order })}
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
                                        onToggle={() => setPendingToggleId(addon.id)}
                                        onEdit={() => startEdit('addon', addon.id, { ...addon, sort_order: addon.sort_order })}
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
          <SectionCard title="Create Entries" description="Use selected parent IDs from hierarchy actions to add child entities.">
            <div className="space-y-4">
              <FormSection title="Section">
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="name_en" value={sectionForm.name_en} onChange={(e) => setSectionForm((p) => ({ ...p, name_en: e.target.value }))} />
                  <Input placeholder="name_ar" value={sectionForm.name_ar} onChange={(e) => setSectionForm((p) => ({ ...p, name_ar: e.target.value }))} />
                </div>
                <Input placeholder="image_url" value={sectionForm.image_url} onChange={(e) => setSectionForm((p) => ({ ...p, image_url: e.target.value }))} />
                <Input placeholder="sort_order" type="number" value={sectionForm.sort_order} onChange={(e) => setSectionForm((p) => ({ ...p, sort_order: e.target.value }))} />
                <Button onClick={createSection} className="w-full"><Save className="mr-1 h-4 w-4" />Create Section</Button>
              </FormSection>

              <FormSection title="Item" description={`Parent section: ${selectedSection ?? 'Not selected'}`}>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="name_en" value={itemForm.name_en} onChange={(e) => setItemForm((p) => ({ ...p, name_en: e.target.value }))} />
                  <Input placeholder="name_ar" value={itemForm.name_ar} onChange={(e) => setItemForm((p) => ({ ...p, name_ar: e.target.value }))} />
                </div>
                <Input placeholder="image_url" value={itemForm.image_url} onChange={(e) => setItemForm((p) => ({ ...p, image_url: e.target.value }))} />
                <Textarea placeholder="description_en" value={itemForm.description_en} onChange={(e) => setItemForm((p) => ({ ...p, description_en: e.target.value }))} />
                <Textarea placeholder="description_ar" value={itemForm.description_ar} onChange={(e) => setItemForm((p) => ({ ...p, description_ar: e.target.value }))} />
                <Input placeholder="sort_order" type="number" value={itemForm.sort_order} onChange={(e) => setItemForm((p) => ({ ...p, sort_order: e.target.value }))} />
                <Button onClick={createItem} className="w-full"><Save className="mr-1 h-4 w-4" />Create Item</Button>
              </FormSection>

              <FormSection title="Item Type" description={`Parent item: ${selectedItem ?? 'Not selected'}`}>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="name_en" value={typeForm.name_en} onChange={(e) => setTypeForm((p) => ({ ...p, name_en: e.target.value }))} />
                  <Input placeholder="name_ar" value={typeForm.name_ar} onChange={(e) => setTypeForm((p) => ({ ...p, name_ar: e.target.value }))} />
                </div>
                <Input placeholder="image_url" value={typeForm.image_url} onChange={(e) => setTypeForm((p) => ({ ...p, image_url: e.target.value }))} />
                <Input placeholder="sort_order" type="number" value={typeForm.sort_order} onChange={(e) => setTypeForm((p) => ({ ...p, sort_order: e.target.value }))} />
                <Button onClick={createType} className="w-full"><Save className="mr-1 h-4 w-4" />Create Type</Button>
              </FormSection>

              <FormSection title="Size" description={`Parent type: ${selectedType ?? 'Not selected'}`}>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="name_en" value={sizeForm.name_en} onChange={(e) => setSizeForm((p) => ({ ...p, name_en: e.target.value }))} />
                  <Input placeholder="name_ar" value={sizeForm.name_ar} onChange={(e) => setSizeForm((p) => ({ ...p, name_ar: e.target.value }))} />
                </div>
                <Input placeholder="image_url" value={sizeForm.image_url} onChange={(e) => setSizeForm((p) => ({ ...p, image_url: e.target.value }))} />
                <Input placeholder="price" type="number" value={sizeForm.price} onChange={(e) => setSizeForm((p) => ({ ...p, price: e.target.value }))} />
                <Input placeholder="sort_order" type="number" value={sizeForm.sort_order} onChange={(e) => setSizeForm((p) => ({ ...p, sort_order: e.target.value }))} />
                <Button onClick={createSize} className="w-full"><Save className="mr-1 h-4 w-4" />Create Size</Button>
              </FormSection>

              <FormSection title="Add-on" description={`Parent size: ${selectedSize ?? 'Not selected'}`}>
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
            <SectionCard title={`Edit ${editingEntity.kind}`}>
              <div className="space-y-3">
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
                <Input placeholder="sort_order" type="number" value={editForm.sort_order} onChange={(e) => setEditForm((p) => ({ ...p, sort_order: e.target.value }))} />
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={saveEdit}>Save</Button>
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
        description="This will toggle active/inactive state for this entity and affect menu visibility."
        confirmLabel="Confirm toggle"
        onConfirm={handleToggle}
      />
    </div>
  );
}
