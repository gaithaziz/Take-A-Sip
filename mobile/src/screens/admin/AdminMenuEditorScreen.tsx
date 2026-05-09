import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppInput } from '@/components/AppInput';
import { AppShell } from '@/components/AppShell';
import { AppText } from '@/components/AppText';
import { BadgeChip } from '@/components/BadgeChip';
import { EmptyState } from '@/components/EmptyState';
import { ActionRow } from '@/components/admin/ActionRow';
import { AdminActionSheet } from '@/components/admin/AdminActionSheet';
import { AdminPageSection } from '@/components/admin/AdminPageSection';
import { BilingualFieldGroup } from '@/components/admin/BilingualFieldGroup';
import { ExpandableText } from '@/components/admin/ExpandableText';
import { DetailPageSkeleton } from '@/components/skeleton/PageSkeletons';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { adminService } from '@/services/adminService';
import { useLanguage } from '@/state/LanguageContext';
import { theme } from '@/theme';
import { Addon, Item, ItemType, MenuSchedule, Section, Size } from '@/types/api';
import { getApiErrorMessage } from '@/utils/errors';
import { getLocalizedValue } from '@/utils/i18n';
import { mirroredRow } from '@/utils/layout';

type EditTarget =
  | { kind: 'section'; data: Section; mode?: 'edit' | 'move' }
  | { kind: 'item'; data: Item; mode?: 'edit' | 'move' }
  | { kind: 'type'; data: ItemType; mode?: 'edit' | 'move' }
  | { kind: 'size'; data: Size; mode?: 'edit' | 'move' }
  | { kind: 'addon'; data: Addon; mode?: 'edit' | 'move' };
type WorkflowStep = 'browse' | 'section' | 'item' | 'type' | 'size' | 'addon';
type FilterMode = 'all' | 'active' | 'inactive' | 'issues';
type MenuKind = EditTarget['kind'];

const activeTypeCount = (item: Item) => item.item_types.filter((itemType) => itemType.is_active && itemType.sizes.some((size) => size.is_active)).length;
const activeSizeCount = (itemType: ItemType) => itemType.sizes.filter((size) => size.is_active).length;
const matchesQuery = (entity: Section | Item | ItemType | Size | Addon, query: string, kind: WorkflowStep) => {
  if (!query.trim()) return true;
  const normalized = query.trim().toLowerCase();
  const values = [entity.name_en, entity.name_ar, entity.image_url ?? ''];
  if (kind === 'item') {
    values.push((entity as Item).description_en ?? '', (entity as Item).description_ar ?? '');
  }
  return values.some((value) => value.toLowerCase().includes(normalized));
};

const parseOptionalLimit = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? Number(trimmed) : null;
};

const ImageThumbnail = ({ uri }: { uri?: string | null }) => {
  return uri ? (
    <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
  ) : (
    <View style={[styles.thumb, styles.thumbPlaceholder]}>
      <AppText variant="caption" color={theme.colors.textMuted}>
        IMG
      </AppText>
    </View>
  );
};

export const AdminMenuEditorScreen = () => {
  const { t, language } = useAppTranslation();
  const { isRTL } = useLanguage();
  const { width } = useWindowDimensions();
  const isCompact = width < 390;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [schedules, setSchedules] = useState<MenuSchedule[]>([]);
  const [query, setQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('browse');

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [actionSheet, setActionSheet] = useState<{
    title: string;
    items: Array<{ key: string; label: string; tone?: 'default' | 'destructive'; onPress: () => void }>;
  } | null>(null);

  const [sectionForm, setSectionForm] = useState({ name_en: '', name_ar: '', image_url: '', sort_order: '0' });
  const [itemForm, setItemForm] = useState({ name_en: '', name_ar: '', image_url: '', description_en: '', description_ar: '', sort_order: '0' });
  const [typeForm, setTypeForm] = useState({ name_en: '', name_ar: '', image_url: '', sort_order: '0' });
  const [sizeForm, setSizeForm] = useState({ name_en: '', name_ar: '', image_url: '', price: '', order_limit: '', sort_order: '0' });
  const [addonForm, setAddonForm] = useState({ name_en: '', name_ar: '', image_url: '', price: '', sort_order: '0' });

  const [editForm, setEditForm] = useState({ parent_id: '', name_en: '', name_ar: '', image_url: '', description_en: '', description_ar: '', price: '', order_limit: '', sort_order: '0' });
  const missingName = (nameEn: string, nameAr: string) => (!nameEn.trim() || !nameAr.trim() ? t('admin.missingTranslation') : undefined);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [mutatingEntityId, setMutatingEntityId] = useState<string | null>(null);
  const scheduleKeys = useMemo(() => new Set(schedules.filter((schedule) => schedule.is_active).map((schedule) => `${schedule.entity_type}:${schedule.entity_id}`)), [schedules]);

  const pickAndUploadImage = async (fieldKey: string, onUploaded: (url: string) => void) => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t('common.error'), t('admin.photoPermissionRequired'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (result.canceled || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const fileName = asset.fileName ?? `menu-image-${Date.now()}.jpg`;
      const mimeType = asset.mimeType ?? 'image/jpeg';
      setUploadingField(fieldKey);
      const uploaded = await adminService.uploadImage(asset.uri, fileName, mimeType);
      onUploaded(uploaded.url);
    } catch (e) {
      Alert.alert(t('common.error'), getApiErrorMessage(e, t));
    } finally {
      setUploadingField(null);
    }
  };

  const renderImageField = (fieldKey: string, value: string, onChange: (next: string) => void) => (
    <View style={styles.formGroup}>
      <View style={[styles.imageFieldHeader, mirroredRow(isRTL)]}>
        <ImageThumbnail uri={value} />
        <AppText variant="caption" color={theme.colors.textSecondary}>
          {t('admin.photo')}
        </AppText>
      </View>
      <AppInput
        label={t('admin.photo')}
        value={value}
        onChangeText={onChange}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <AppButton
        title={t('admin.uploadPhoto')}
        variant="secondary"
        onPress={() => void pickAndUploadImage(fieldKey, onChange)}
        loading={uploadingField === fieldKey}
      />
    </View>
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [menu, scheduleResponse] = await Promise.all([adminService.getMenuTree(), adminService.listSchedules()]);
      setSections(menu.sections);
      setSchedules(scheduleResponse.schedules);
    } catch (e) {
      setError(getApiErrorMessage(e, t));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = useMemo(() => sections.flatMap((section) => section.items), [sections]);
  const itemTypes = useMemo(() => items.flatMap((item) => item.item_types), [items]);
  const sizes = useMemo(() => itemTypes.flatMap((itemType) => itemType.sizes), [itemTypes]);

  const selectedSection = useMemo(() => sections.find((section) => section.id === selectedSectionId) ?? null, [sections, selectedSectionId]);
  const selectedItem = useMemo(() => items.find((item) => item.id === selectedItemId) ?? null, [items, selectedItemId]);
  const selectedType = useMemo(() => itemTypes.find((itemType) => itemType.id === selectedTypeId) ?? null, [itemTypes, selectedTypeId]);
  const selectedSize = useMemo(() => sizes.find((size) => size.id === selectedSizeId) ?? null, [sizes, selectedSizeId]);
  const selectedContextLabel = useMemo(
    () =>
      [selectedSection, selectedItem, selectedType, selectedSize]
        .filter(Boolean)
        .map((entry) => getLocalizedValue(entry as Section | Item | ItemType | Size, language, 'name'))
        .join(' > '),
    [language, selectedItem, selectedSection, selectedSize, selectedType],
  );
  const setSelection = ({
    sectionId,
    itemId = null,
    typeId = null,
    sizeId = null,
  }: {
    sectionId: string | null;
    itemId?: string | null;
    typeId?: string | null;
    sizeId?: string | null;
  }) => {
    setSelectedSectionId(sectionId);
    setSelectedItemId(itemId);
    setSelectedTypeId(typeId);
    setSelectedSizeId(sizeId);
  };
  const scopedItems = useMemo(
    () => (selectedSection ? selectedSection.items : items),
    [items, selectedSection],
  );
  const scopedTypes = useMemo(
    () => (selectedItem ? selectedItem.item_types : scopedItems.flatMap((item) => item.item_types)),
    [scopedItems, selectedItem],
  );
  const scopedSizes = useMemo(
    () => (selectedType ? selectedType.sizes : scopedTypes.flatMap((itemType) => itemType.sizes)),
    [scopedTypes, selectedType],
  );
  const moveParentOptions = useMemo(() => {
    if (!editTarget || editTarget.mode !== 'move' || editTarget.kind === 'section') {
      return [] as Array<Section | Item | ItemType | Size>;
    }
    if (editTarget.kind === 'item') {
      return selectedSection ? [selectedSection] : sections;
    }
    if (editTarget.kind === 'type') {
      return selectedItem ? [selectedItem] : scopedItems;
    }
    if (editTarget.kind === 'size') {
      return selectedType ? [selectedType] : scopedTypes;
    }
    return selectedSize ? [selectedSize] : scopedSizes;
  }, [editTarget, scopedItems, scopedSizes, scopedTypes, sections, selectedItem, selectedSection, selectedSize, selectedType]);
  function getVisibility(kind: WorkflowStep, entity: Section | Item | ItemType | Size | Addon, ancestorsActive: boolean) {
    if (!ancestorsActive) return { label: t('admin.visibilityHiddenInactiveAncestor'), tone: 'default' as const };
    if (!entity.is_active) return { label: t('admin.visibilityHiddenInactive'), tone: 'default' as const };
    if (kind === 'section') {
      return (entity as Section).items.some((item) => activeTypeCount(item) > 0)
        ? { label: t('admin.visibilityVisible'), tone: 'success' as const }
        : { label: t('admin.visibilityNeedsActiveItemPath'), tone: 'info' as const };
    }
    if (kind === 'item') {
      return activeTypeCount(entity as Item) > 0
        ? { label: t('admin.visibilityVisible'), tone: 'success' as const }
        : { label: t('admin.visibilityNeedsTypeAndSize'), tone: 'info' as const };
    }
    if (kind === 'type') {
      return activeSizeCount(entity as ItemType) > 0
        ? { label: t('admin.visibilityVisible'), tone: 'success' as const }
        : { label: t('admin.visibilityNeedsSize'), tone: 'info' as const };
    }
    return { label: t('admin.visibilityVisible'), tone: 'success' as const };
  }

  const visibleSections = useMemo(() => {
    const matchesFilter = (isActive: boolean, visibilityTone: 'default' | 'info' | 'success') => {
      if (filterMode === 'all') return true;
      if (filterMode === 'active') return isActive;
      if (filterMode === 'inactive') return !isActive;
      return visibilityTone !== 'success';
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
                      const visibility = getVisibility('addon', addon, section.is_active && item.is_active && itemType.is_active && size.is_active);
                      return matchesQuery(addon, query, 'addon') && matchesFilter(addon.is_active, visibility.tone);
                    });
                    const visibility = getVisibility('size', size, section.is_active && item.is_active && itemType.is_active);
                    const keepSelf = matchesQuery(size, query, 'size') && matchesFilter(size.is_active, visibility.tone);
                    return keepSelf || visibleAddons.length > 0 ? { ...size, addons: visibleAddons } : null;
                  })
                  .filter((size): size is Size => Boolean(size));

                const visibility = getVisibility('type', itemType, section.is_active && item.is_active);
                const keepSelf = matchesQuery(itemType, query, 'type') && matchesFilter(itemType.is_active, visibility.tone);
                return keepSelf || visibleSizes.length > 0 ? { ...itemType, sizes: visibleSizes } : null;
              })
              .filter((itemType): itemType is ItemType => Boolean(itemType));

            const visibility = getVisibility('item', item, section.is_active);
            const keepSelf = matchesQuery(item, query, 'item') && matchesFilter(item.is_active, visibility.tone);
            return keepSelf || visibleTypes.length > 0 ? { ...item, item_types: visibleTypes } : null;
          })
          .filter((item): item is Item => Boolean(item));

        const visibility = getVisibility('section', section, true);
        const keepSelf = matchesQuery(section, query, 'section') && matchesFilter(section.is_active, visibility.tone);
        return keepSelf || visibleItems.length > 0 ? { ...section, items: visibleItems } : null;
      })
      .filter((section): section is Section => Boolean(section));
  }, [filterMode, query, sections]);

  const beginEdit = (target: EditTarget) => {
    setEditTarget(target);
    const data = target.data as Record<string, unknown>;
    setEditForm({
      parent_id:
        target.kind === 'item'
          ? String((target.data as Item).section_id ?? '')
          : target.kind === 'type'
            ? String((target.data as ItemType).item_id ?? '')
            : target.kind === 'size'
              ? String((target.data as Size).type_id ?? '')
              : target.kind === 'addon'
                ? String((target.data as Addon).size_id ?? '')
                : '',
      name_en: String(data.name_en ?? ''),
      name_ar: String(data.name_ar ?? ''),
      image_url: String(data.image_url ?? ''),
      description_en: String(data.description_en ?? ''),
      description_ar: String(data.description_ar ?? ''),
      price: String(data.price ?? ''),
      order_limit: data.order_limit == null ? '' : String(data.order_limit),
      sort_order: String(data.sort_order ?? 0),
    });
  };

  const beginMove = (target: EditTarget) => {
    beginEdit({ ...target, mode: 'move' });
  };

  const saveEdit = async () => {
    if (!editTarget) {
      return;
    }
    try {
      const payload: Record<string, unknown> = {
        sort_order: Number(editForm.sort_order || 0),
      };
      if (editTarget.mode !== 'move') {
        payload.name_en = editForm.name_en;
        payload.name_ar = editForm.name_ar;
        payload.image_url = editForm.image_url || null;
        if (editTarget.kind === 'item') {
          payload.description_en = editForm.description_en || null;
          payload.description_ar = editForm.description_ar || null;
        }
        if (editTarget.kind === 'size' || editTarget.kind === 'addon') {
          payload.price = Number(editForm.price || 0);
        }
        if (editTarget.kind === 'size') {
          payload.order_limit = parseOptionalLimit(editForm.order_limit);
        }
      }
      if (editTarget.mode === 'move') {
        if (editTarget.kind === 'item') payload.section_id = editForm.parent_id;
        if (editTarget.kind === 'type') payload.item_id = editForm.parent_id;
        if (editTarget.kind === 'size') payload.type_id = editForm.parent_id;
        if (editTarget.kind === 'addon') payload.size_id = editForm.parent_id;
      }
      await adminService.updateMenuEntity(editTarget.kind, editTarget.data.id, payload);
      setEditTarget(null);
      await load();
    } catch (e) {
      Alert.alert(t('common.error'), getApiErrorMessage(e, t));
    }
  };

  const deleteEntity = async (kind: MenuKind, id: string, label: string) => {
    Alert.alert(t('admin.delete'), label, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('admin.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            setMutatingEntityId(id);
            await adminService.deleteMenuEntity(kind, id);
            setEditTarget(null);
            await load();
          } catch (e) {
            Alert.alert(t('common.error'), getApiErrorMessage(e, t));
          } finally {
            setMutatingEntityId(null);
          }
        },
      },
    ]);
  };

  const toggleEntity = async (id: string, isActive: boolean, label: string) => {
    Alert.alert(t('common.appName'), `${isActive ? t('admin.disable') : t('admin.enable')}: ${label}`, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.confirm'),
        onPress: async () => {
          try {
            setMutatingEntityId(id);
            await adminService.toggleMenuEntity(id);
            await load();
          } catch (e) {
            Alert.alert(t('common.error'), getApiErrorMessage(e, t));
          } finally {
            setMutatingEntityId(null);
          }
        },
      },
    ]);
  };

  const createSection = async () => {
    try {
      await adminService.createSection({
        ...sectionForm,
        sort_order: Number(sectionForm.sort_order || 0),
        image_url: sectionForm.image_url || undefined,
      });
      setSectionForm({ name_en: '', name_ar: '', image_url: '', sort_order: '0' });
      await load();
    } catch (e) {
      Alert.alert(t('common.error'), getApiErrorMessage(e, t));
    }
  };

  const createItem = async () => {
    if (!selectedSectionId) return;
    try {
      const createdItem = await adminService.createItem({
        section_id: selectedSectionId,
        ...itemForm,
        sort_order: Number(itemForm.sort_order || 0),
        image_url: itemForm.image_url || undefined,
        description_en: itemForm.description_en || undefined,
        description_ar: itemForm.description_ar || undefined,
      });
      setSelectedItemId(createdItem.id);
      setSelectedTypeId(null);
      setSelectedSizeId(null);
      setWorkflowStep('type');
      setItemForm({ name_en: '', name_ar: '', image_url: '', description_en: '', description_ar: '', sort_order: '0' });
      await load();
      Alert.alert(t('common.appName'), t('admin.itemCreatedNeedsTypeAndSize'));
    } catch (e) {
      Alert.alert(t('common.error'), getApiErrorMessage(e, t));
    }
  };

  const createType = async () => {
    if (!selectedItemId) return;
    try {
      const createdType = await adminService.createType({
        item_id: selectedItemId,
        ...typeForm,
        sort_order: Number(typeForm.sort_order || 0),
        image_url: typeForm.image_url || undefined,
      });
      setSelectedTypeId(createdType.id);
      setSelectedSizeId(null);
      setWorkflowStep('size');
      setTypeForm({ name_en: '', name_ar: '', image_url: '', sort_order: '0' });
      await load();
      Alert.alert(t('common.appName'), t('admin.typeCreatedNeedsSize'));
    } catch (e) {
      Alert.alert(t('common.error'), getApiErrorMessage(e, t));
    }
  };

  const createSize = async () => {
    if (!selectedTypeId) return;
    try {
      await adminService.createSize({
        type_id: selectedTypeId,
        ...sizeForm,
        price: Number(sizeForm.price || 0),
        order_limit: parseOptionalLimit(sizeForm.order_limit),
        sort_order: Number(sizeForm.sort_order || 0),
        image_url: sizeForm.image_url || undefined,
      });
      setSizeForm({ name_en: '', name_ar: '', image_url: '', price: '', order_limit: '', sort_order: '0' });
      await load();
    } catch (e) {
      Alert.alert(t('common.error'), getApiErrorMessage(e, t));
    }
  };

  const createAddon = async () => {
    if (!selectedSizeId) return;
    try {
      await adminService.createAddon({
        size_id: selectedSizeId,
        ...addonForm,
        price: Number(addonForm.price || 0),
        sort_order: Number(addonForm.sort_order || 0),
        image_url: addonForm.image_url || undefined,
      });
      setAddonForm({ name_en: '', name_ar: '', image_url: '', price: '', sort_order: '0' });
      await load();
    } catch (e) {
      Alert.alert(t('common.error'), getApiErrorMessage(e, t));
    }
  };

  const toggleExpanded = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isAutoExpanded = useCallback(
    (key: string, ids: Array<string | null | undefined>) => {
      if (expanded[key] !== undefined) {
        return expanded[key];
      }
      if (query.trim()) {
        return true;
      }
      return ids.some((id) => Boolean(id));
    },
    [expanded, query],
  );

  const renderHierarchyActions = (
    id: string,
    isActive: boolean,
    label: string,
    visibilityLabel: string,
    visibilityTone: 'default' | 'info' | 'success',
    scheduled: boolean,
    onAddChild: (() => void) | null,
    onEdit: () => void,
    onMove: () => void,
    onDelete: () => void,
  ) => (
    <>
      <View style={[styles.nodeMetaRow, mirroredRow(isRTL)]}>
        <BadgeChip label={isActive ? t('admin.active') : t('admin.inactive')} tone={isActive ? 'success' : 'default'} />
        <BadgeChip label={visibilityLabel} tone={visibilityTone} />
        {scheduled ? <BadgeChip label={t('admin.scheduled')} tone="info" /> : null}
      </View>
      <View style={[styles.rowActions, isCompact ? styles.rowActionsCompact : null]}>
        {onAddChild ? (
          <AppButton
            title={t('admin.addChild')}
            variant="secondary"
            textVariant="bodySmall"
            fullWidth={false}
            style={StyleSheet.flatten([styles.actionButton, isCompact ? styles.actionButtonCompact : null])}
            onPress={onAddChild}
            disabled={Boolean(mutatingEntityId && mutatingEntityId !== id)}
          />
        ) : null}
        <AppButton
          title={t('admin.edit')}
          variant="ghost"
          textVariant="bodySmall"
          fullWidth={false}
          style={StyleSheet.flatten([styles.actionButton, isCompact ? styles.actionButtonCompact : null])}
          onPress={onEdit}
          disabled={Boolean(mutatingEntityId && mutatingEntityId !== id)}
        />
        <AppButton
          title={t('admin.more')}
          variant="secondary"
          textVariant="bodySmall"
          fullWidth={false}
          style={StyleSheet.flatten([styles.actionButton, isCompact ? styles.actionButtonCompact : null])}
          onPress={() =>
            setActionSheet({
              title: label,
              items: [
                { key: 'move', label: t('admin.move'), onPress: onMove },
                { key: 'toggle', label: isActive ? t('admin.disable') : t('admin.enable'), onPress: () => void toggleEntity(id, isActive, label) },
                { key: 'delete', label: t('admin.delete'), tone: 'destructive', onPress: onDelete },
              ],
            })
          }
          loading={mutatingEntityId === id}
          disabled={Boolean(mutatingEntityId && mutatingEntityId !== id)}
        />
      </View>
    </>
  );

  const renderExpandControl = (open: boolean, onPress: () => void) => (
    <Pressable
      style={styles.expandToggle}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={open ? t('admin.disable') : t('admin.enable')}>
      <AppText variant="h3" align="center">
        {open ? '-' : '+'}
      </AppText>
    </Pressable>
  );

  if (loading) return <DetailPageSkeleton isRTL={isRTL} sections={4} />;
  if (error) return <EmptyState title={t('common.error')} subtitle={error} actionLabel={t('common.retry')} onAction={load} />;

  return (
    <AppShell refreshing={loading} onRefresh={load}>
      <AppText variant="h1">{t('admin.menuEditorTitle')}</AppText>

      <AppCard>
        <AppText variant="h3">{t('admin.quickActions')}</AppText>
        <View style={[styles.selectorWrap, mirroredRow(isRTL)]}>
          {([
            { key: 'browse', label: t('admin.menuHierarchy') },
            { key: 'section', label: t('admin.createSection') },
            { key: 'item', label: t('admin.createItem') },
            { key: 'type', label: t('admin.createType') },
            { key: 'size', label: t('admin.createSize') },
            { key: 'addon', label: t('admin.createAddon') },
          ] as const).map((step) => (
            <Pressable
              key={step.key}
              style={[styles.selectorChip, workflowStep === step.key ? styles.selectorChipActive : null]}
              onPress={() => setWorkflowStep(step.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: workflowStep === step.key }}
              accessibilityLabel={step.label}>
              <AppText variant="caption" numberOfLines={2}>{step.label}</AppText>
            </Pressable>
          ))}
        </View>
      </AppCard>

      <AppCard>
        <AppInput label={t('admin.searchMenu')} value={query} onChangeText={setQuery} placeholder={t('admin.searchMenuPlaceholder')} />
        <View style={[styles.selectorWrap, mirroredRow(isRTL)]}>
          {([
            { key: 'all', label: t('admin.filterAll') },
            { key: 'active', label: t('admin.active') },
            { key: 'inactive', label: t('admin.inactive') },
            { key: 'issues', label: t('admin.filterIssues') },
          ] as const).map((filter) => (
            <Pressable
              key={filter.key}
              style={[styles.selectorChip, filterMode === filter.key ? styles.selectorChipActive : null]}
              onPress={() => setFilterMode(filter.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: filterMode === filter.key }}
              accessibilityLabel={filter.label}>
              <AppText variant="caption" numberOfLines={2}>{filter.label}</AppText>
            </Pressable>
          ))}
        </View>
      </AppCard>

      <AppCard>
        <AppText variant="h3">{t('admin.currentContext')}</AppText>
        {selectedContextLabel ? (
          <>
            <View style={[styles.contextRow, mirroredRow(isRTL)]}>
              <BadgeChip label={selectedContextLabel} tone="info" />
            </View>
            <AppText variant="caption" color={theme.colors.textSecondary}>{t('admin.currentContext')}</AppText>
          </>
        ) : (
          <AppText variant="bodySmall" color={theme.colors.textSecondary}>
            {t('admin.noContextSelected')}
          </AppText>
        )}
      </AppCard>

      <AppCard>
        <AppText variant="h3">{t('admin.menuHierarchy')}</AppText>
        <View style={styles.list}>
          {visibleSections.map((section) => {
            const sectionKey = `s-${section.id}`;
            const sectionOpen = isAutoExpanded(sectionKey, [selectedSectionId === section.id ? section.id : null, selectedItem?.section_id === section.id ? section.id : null]);
            const sectionVisibility = getVisibility('section', section, true);
            return (
              <View key={section.id}>
                <View style={styles.nodeCard}>
                  <View style={[styles.nodeHeader, mirroredRow(isRTL)]}>
                    {renderExpandControl(sectionOpen, () => toggleExpanded(sectionKey))}
                    <ImageThumbnail uri={section.image_url} />
                    <Pressable
                      style={styles.rowLabelPressable}
                      onPress={() => {
                        setSelection({ sectionId: section.id });
                      }}>
                      <ExpandableText value={`${t('admin.section')}: ${getLocalizedValue(section, language, 'name')} (${section.sort_order})`} numberOfLines={1} />
                    </Pressable>
                  </View>
                  {renderHierarchyActions(
                    section.id,
                    section.is_active,
                    `${t('admin.section')} ${getLocalizedValue(section, language, 'name')}`,
                    sectionVisibility.label,
                    sectionVisibility.tone,
                    scheduleKeys.has(`section:${section.id}`),
                    () => {
                      setSelectedSectionId(section.id);
                      setSelectedItemId(null);
                      setSelectedTypeId(null);
                      setSelectedSizeId(null);
                      setWorkflowStep('item');
                    },
                    () => beginEdit({ kind: 'section', data: section }),
                    () => beginMove({ kind: 'section', data: section }),
                    () => void deleteEntity('section', section.id, getLocalizedValue(section, language, 'name')),
                  )}
                </View>

                {sectionOpen
                  ? section.items.map((item) => {
                      const itemKey = `i-${item.id}`;
                      const itemOpen = isAutoExpanded(itemKey, [selectedItemId === item.id ? item.id : null, selectedType?.item_id === item.id ? item.id : null, selectedSize && item.item_types.some((itemType) => itemType.id === selectedSize.type_id) ? item.id : null]);
                      const itemVisibility = getVisibility('item', item, section.is_active);
                      return (
                        <View key={item.id} style={[styles.level1, isCompact ? styles.level1Compact : null]}>
                          <View style={styles.nodeCard}>
                            <View style={[styles.nodeHeader, mirroredRow(isRTL)]}>
                              {renderExpandControl(itemOpen, () => toggleExpanded(itemKey))}
                              <ImageThumbnail uri={item.image_url} />
                              <Pressable
                                style={styles.rowLabelPressable}
                                onPress={() => {
                                  setSelection({ sectionId: section.id, itemId: item.id });
                                }}>
                                <ExpandableText value={`${t('admin.item')}: ${getLocalizedValue(item, language, 'name')} (${item.sort_order})`} numberOfLines={1} />
                              </Pressable>
                            </View>
                            {renderHierarchyActions(
                              item.id,
                              item.is_active,
                              `${t('admin.item')} ${getLocalizedValue(item, language, 'name')}`,
                              itemVisibility.label,
                              itemVisibility.tone,
                              scheduleKeys.has(`item:${item.id}`),
                              () => {
                                setSelectedSectionId(section.id);
                                setSelectedItemId(item.id);
                                setSelectedTypeId(null);
                                setSelectedSizeId(null);
                                setWorkflowStep('type');
                              },
                              () => beginEdit({ kind: 'item', data: item }),
                              () => beginMove({ kind: 'item', data: item }),
                              () => void deleteEntity('item', item.id, getLocalizedValue(item, language, 'name')),
                            )}
                          </View>

                          {itemOpen
                            ? item.item_types.map((itemType) => {
                                const typeKey = `t-${itemType.id}`;
                                const typeOpen = isAutoExpanded(typeKey, [selectedTypeId === itemType.id ? itemType.id : null, selectedSize?.type_id === itemType.id ? itemType.id : null]);
                                const typeVisibility = getVisibility('type', itemType, section.is_active && item.is_active);
                                return (
                                <View key={itemType.id} style={[styles.level2, isCompact ? styles.level2Compact : null]}>
                                  <View style={styles.nodeCard}>
                                    <View style={[styles.nodeHeader, mirroredRow(isRTL)]}>
                                      {renderExpandControl(typeOpen, () => toggleExpanded(typeKey))}
                                      <ImageThumbnail uri={itemType.image_url} />
                                      <Pressable
                                        style={styles.rowLabelPressable}
                                        onPress={() => {
                                          setSelection({ sectionId: section.id, itemId: item.id, typeId: itemType.id });
                                        }}>
                                        <ExpandableText value={`${t('admin.type')}: ${getLocalizedValue(itemType, language, 'name')} (${itemType.sort_order})`} numberOfLines={1} />
                                      </Pressable>
                                    </View>
                                    {renderHierarchyActions(
                                      itemType.id,
                                      itemType.is_active,
                                      `${t('admin.type')} ${getLocalizedValue(itemType, language, 'name')}`,
                                      typeVisibility.label,
                                      typeVisibility.tone,
                                      scheduleKeys.has(`type:${itemType.id}`),
                                      () => {
                                        setSelectedSectionId(section.id);
                                        setSelectedItemId(item.id);
                                        setSelectedTypeId(itemType.id);
                                        setSelectedSizeId(null);
                                        setWorkflowStep('size');
                                      },
                                      () => beginEdit({ kind: 'type', data: itemType }),
                                      () => beginMove({ kind: 'type', data: itemType }),
                                      () => void deleteEntity('type', itemType.id, getLocalizedValue(itemType, language, 'name')),
                                    )}
                                  </View>

                                    {typeOpen
                                      ? itemType.sizes.map((size) => {
                                          const sizeKey = `z-${size.id}`;
                                          const sizeOpen = isAutoExpanded(sizeKey, [selectedSizeId === size.id ? size.id : null]);
                                          const sizeVisibility = getVisibility('size', size, section.is_active && item.is_active && itemType.is_active);
                                          return (
                                            <View key={size.id} style={[styles.level3, isCompact ? styles.level3Compact : null]}>
                                              <View style={styles.nodeCard}>
                                                <View style={[styles.nodeHeader, mirroredRow(isRTL)]}>
                                                  {renderExpandControl(sizeOpen, () => toggleExpanded(sizeKey))}
                                                  <ImageThumbnail uri={size.image_url} />
                                                  <Pressable
                                                    style={styles.rowLabelPressable}
                                                    onPress={() => {
                                                      setSelection({ sectionId: section.id, itemId: item.id, typeId: itemType.id, sizeId: size.id });
                                                    }}>
                                                    <ExpandableText
                                                      value={`${t('admin.size')}: ${getLocalizedValue(size, language, 'name')} (${size.order_limit ? `${t('admin.orderLimit')}: ${size.order_limit}` : t('admin.unlimited')})`}
                                                      numberOfLines={1}
                                                    />
                                                  </Pressable>
                                                </View>
                                                {renderHierarchyActions(
                                                  size.id,
                                                  size.is_active,
                                                  `${t('admin.size')} ${getLocalizedValue(size, language, 'name')}`,
                                                  sizeVisibility.label,
                                                  sizeVisibility.tone,
                                                  scheduleKeys.has(`size:${size.id}`),
                                                  () => {
                                                    setSelectedSectionId(section.id);
                                                    setSelectedItemId(item.id);
                                                    setSelectedTypeId(itemType.id);
                                                    setSelectedSizeId(size.id);
                                                    setWorkflowStep('addon');
                                                  },
                                                  () => beginEdit({ kind: 'size', data: size }),
                                                  () => beginMove({ kind: 'size', data: size }),
                                                  () => void deleteEntity('size', size.id, getLocalizedValue(size, language, 'name')),
                                                )}
                                              </View>
                                              {sizeOpen
                                                ? size.addons.map((addon) => (
                                                    <View key={addon.id} style={[styles.level4, isCompact ? styles.level4Compact : null]}>
                                                        <View style={styles.nodeCard}>
                                                          <View style={[styles.nodeHeader, mirroredRow(isRTL)]}>
                                                            <View style={styles.expandToggleSpacer} />
                                                            <ImageThumbnail uri={addon.image_url} />
                                                            <Pressable style={styles.rowLabelPressable} onPress={() => setSelection({ sectionId: section.id, itemId: item.id, typeId: itemType.id, sizeId: size.id })}>
                                                              <ExpandableText value={`${t('admin.addon')}: ${getLocalizedValue(addon, language, 'name')} (${addon.sort_order})`} numberOfLines={1} />
                                                            </Pressable>
                                                          </View>
                                                        {renderHierarchyActions(
                                                          addon.id,
                                                          addon.is_active,
                                                          `${t('admin.addon')} ${getLocalizedValue(addon, language, 'name')}`,
                                                          getVisibility('addon', addon, section.is_active && item.is_active && itemType.is_active && size.is_active).label,
                                                          getVisibility('addon', addon, section.is_active && item.is_active && itemType.is_active && size.is_active).tone,
                                                          scheduleKeys.has(`addon:${addon.id}`),
                                                          null,
                                                          () => beginEdit({ kind: 'addon', data: addon }),
                                                          () => beginMove({ kind: 'addon', data: addon }),
                                                          () => void deleteEntity('addon', addon.id, getLocalizedValue(addon, language, 'name')),
                                                        )}
                                                      </View>
                                                    </View>
                                                  ))
                                                : null}
                                            </View>
                                          );
                                        })
                                      : null}
                                  </View>
                                );
                              })
                            : null}
                        </View>
                      );
                    })
                  : null}
              </View>
            );
          })}
        </View>
      </AppCard>

      {workflowStep === 'section' ? (
      <AdminPageSection title={t('admin.createSection')}>
        <View style={styles.formStack}>
          <BilingualFieldGroup
            labelEn={t('admin.nameEn')}
            labelAr={t('admin.nameAr')}
            valueEn={sectionForm.name_en}
            valueAr={sectionForm.name_ar}
            onChangeEn={(v) => setSectionForm((p) => ({ ...p, name_en: v }))}
            onChangeAr={(v) => setSectionForm((p) => ({ ...p, name_ar: v }))}
            helperText={missingName(sectionForm.name_en, sectionForm.name_ar)}
          />
        {renderImageField('sectionForm', sectionForm.image_url, (v) => setSectionForm((p) => ({ ...p, image_url: v })))}
          <View style={styles.formGroup}>
            <AppInput label={t('admin.sortOrder')} value={sectionForm.sort_order} onChangeText={(v) => setSectionForm((p) => ({ ...p, sort_order: v }))} keyboardType="number-pad" />
          </View>
        <AppButton
          title={t('admin.createSection')}
          onPress={() => void createSection()}
          disabled={!sectionForm.name_en.trim() || !sectionForm.name_ar.trim()}
        />
        </View>
      </AdminPageSection>
      ) : null}

      {workflowStep === 'item' ? (
      <AdminPageSection title={t('admin.createItem')}>
        <View style={styles.formStack}>
          <View style={styles.formGroup}>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>{t('admin.section')}</AppText>
            <View style={[styles.selectorWrap, mirroredRow(isRTL)]}>
              {(selectedSection ? [selectedSection] : sections).map((section) => (
                <Pressable
                  key={section.id}
                  style={[styles.selectorChip, selectedSectionId === section.id ? styles.selectorChipActive : null]}
                  onPress={() => setSelectedSectionId(section.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedSectionId === section.id }}
                  accessibilityLabel={getLocalizedValue(section, language, 'name')}>
                  <AppText variant="caption" numberOfLines={2}>{getLocalizedValue(section, language, 'name')}</AppText>
                </Pressable>
              ))}
            </View>
          </View>
          <BilingualFieldGroup
            labelEn={t('admin.nameEn')}
            labelAr={t('admin.nameAr')}
            valueEn={itemForm.name_en}
            valueAr={itemForm.name_ar}
            onChangeEn={(v) => setItemForm((p) => ({ ...p, name_en: v }))}
            onChangeAr={(v) => setItemForm((p) => ({ ...p, name_ar: v }))}
            helperText={missingName(itemForm.name_en, itemForm.name_ar)}
          />
          <AppText variant="caption" color={theme.colors.textSecondary}>
            {t('admin.itemVisibilityHint')}
          </AppText>
          <View style={styles.formGroup}>
            <AppInput label={t('admin.descriptionEn')} value={itemForm.description_en} onChangeText={(v) => setItemForm((p) => ({ ...p, description_en: v }))} />
            <AppInput label={t('admin.descriptionAr')} value={itemForm.description_ar} onChangeText={(v) => setItemForm((p) => ({ ...p, description_ar: v }))} />
          </View>
          {renderImageField('itemForm', itemForm.image_url, (v) => setItemForm((p) => ({ ...p, image_url: v })))}
          <View style={styles.formGroup}>
            <AppInput label={t('admin.sortOrder')} value={itemForm.sort_order} onChangeText={(v) => setItemForm((p) => ({ ...p, sort_order: v }))} keyboardType="number-pad" />
          </View>
        <AppButton
          title={t('admin.createItem')}
          onPress={() => void createItem()}
          disabled={!selectedSectionId || !itemForm.name_en.trim() || !itemForm.name_ar.trim()}
        />
        </View>
      </AdminPageSection>
      ) : null}

      {workflowStep === 'type' ? (
      <AdminPageSection title={t('admin.createType')}>
        <View style={styles.formStack}>
          <View style={styles.formGroup}>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>{t('admin.item')}</AppText>
            <View style={[styles.selectorWrap, mirroredRow(isRTL)]}>
              {scopedItems.map((item) => (
                <Pressable
                  key={item.id}
                  style={[styles.selectorChip, selectedItemId === item.id ? styles.selectorChipActive : null]}
                  onPress={() => setSelectedItemId(item.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedItemId === item.id }}
                  accessibilityLabel={getLocalizedValue(item, language, 'name')}>
                  <AppText variant="caption" numberOfLines={2}>{getLocalizedValue(item, language, 'name')}</AppText>
                </Pressable>
              ))}
            </View>
          </View>
          <BilingualFieldGroup
            labelEn={t('admin.nameEn')}
            labelAr={t('admin.nameAr')}
            valueEn={typeForm.name_en}
            valueAr={typeForm.name_ar}
            onChangeEn={(v) => setTypeForm((p) => ({ ...p, name_en: v }))}
            onChangeAr={(v) => setTypeForm((p) => ({ ...p, name_ar: v }))}
            helperText={missingName(typeForm.name_en, typeForm.name_ar)}
          />
          <AppText variant="caption" color={theme.colors.textSecondary}>
            {t('admin.typeVisibilityHint')}
          </AppText>
          {renderImageField('typeForm', typeForm.image_url, (v) => setTypeForm((p) => ({ ...p, image_url: v })))}
          <View style={styles.formGroup}>
            <AppInput label={t('admin.sortOrder')} value={typeForm.sort_order} onChangeText={(v) => setTypeForm((p) => ({ ...p, sort_order: v }))} keyboardType="number-pad" />
          </View>
        <AppButton
          title={t('admin.createType')}
          onPress={() => void createType()}
          disabled={!selectedItemId || !typeForm.name_en.trim() || !typeForm.name_ar.trim()}
        />
        </View>
      </AdminPageSection>
      ) : null}

      {workflowStep === 'size' ? (
      <AdminPageSection title={t('admin.createSize')}>
        <View style={styles.formStack}>
          <View style={styles.formGroup}>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>{t('admin.type')}</AppText>
            <View style={[styles.selectorWrap, mirroredRow(isRTL)]}>
              {scopedTypes.map((itemType) => (
                <Pressable
                  key={itemType.id}
                  style={[styles.selectorChip, selectedTypeId === itemType.id ? styles.selectorChipActive : null]}
                  onPress={() => setSelectedTypeId(itemType.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedTypeId === itemType.id }}
                  accessibilityLabel={getLocalizedValue(itemType, language, 'name')}>
                  <AppText variant="caption" numberOfLines={2}>{getLocalizedValue(itemType, language, 'name')}</AppText>
                </Pressable>
              ))}
            </View>
          </View>
          <BilingualFieldGroup
            labelEn={t('admin.nameEn')}
            labelAr={t('admin.nameAr')}
            valueEn={sizeForm.name_en}
            valueAr={sizeForm.name_ar}
            onChangeEn={(v) => setSizeForm((p) => ({ ...p, name_en: v }))}
            onChangeAr={(v) => setSizeForm((p) => ({ ...p, name_ar: v }))}
            helperText={missingName(sizeForm.name_en, sizeForm.name_ar)}
          />
          {renderImageField('sizeForm', sizeForm.image_url, (v) => setSizeForm((p) => ({ ...p, image_url: v })))}
          <View style={styles.formGroup}>
            <AppInput label={t('admin.price')} value={sizeForm.price} onChangeText={(v) => setSizeForm((p) => ({ ...p, price: v }))} keyboardType="decimal-pad" />
            <AppInput
              label={t('admin.orderLimit')}
              value={sizeForm.order_limit}
              onChangeText={(v) => setSizeForm((p) => ({ ...p, order_limit: v }))}
              placeholder={t('admin.unlimited')}
              keyboardType="number-pad"
            />
            <AppInput label={t('admin.sortOrder')} value={sizeForm.sort_order} onChangeText={(v) => setSizeForm((p) => ({ ...p, sort_order: v }))} keyboardType="number-pad" />
          </View>
        <AppButton
          title={t('admin.createSize')}
          onPress={() => void createSize()}
          disabled={!selectedTypeId || !sizeForm.name_en.trim() || !sizeForm.name_ar.trim()}
        />
        </View>
      </AdminPageSection>
      ) : null}

      {workflowStep === 'addon' ? (
      <AdminPageSection title={t('admin.createAddon')}>
        <View style={styles.formStack}>
          <View style={styles.formGroup}>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>{t('admin.size')}</AppText>
            <View style={[styles.selectorWrap, mirroredRow(isRTL)]}>
              {scopedSizes.map((size) => (
                <Pressable
                  key={size.id}
                  style={[styles.selectorChip, selectedSizeId === size.id ? styles.selectorChipActive : null]}
                  onPress={() => setSelectedSizeId(size.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedSizeId === size.id }}
                  accessibilityLabel={getLocalizedValue(size, language, 'name')}>
                  <AppText variant="caption" numberOfLines={2}>{getLocalizedValue(size, language, 'name')}</AppText>
                </Pressable>
              ))}
            </View>
          </View>
          <BilingualFieldGroup
            labelEn={t('admin.nameEn')}
            labelAr={t('admin.nameAr')}
            valueEn={addonForm.name_en}
            valueAr={addonForm.name_ar}
            onChangeEn={(v) => setAddonForm((p) => ({ ...p, name_en: v }))}
            onChangeAr={(v) => setAddonForm((p) => ({ ...p, name_ar: v }))}
            helperText={missingName(addonForm.name_en, addonForm.name_ar)}
          />
          {renderImageField('addonForm', addonForm.image_url, (v) => setAddonForm((p) => ({ ...p, image_url: v })))}
          <View style={styles.formGroup}>
            <AppInput label={t('admin.price')} value={addonForm.price} onChangeText={(v) => setAddonForm((p) => ({ ...p, price: v }))} keyboardType="decimal-pad" />
            <AppInput label={t('admin.sortOrder')} value={addonForm.sort_order} onChangeText={(v) => setAddonForm((p) => ({ ...p, sort_order: v }))} keyboardType="number-pad" />
          </View>
        <AppButton
          title={t('admin.createAddon')}
          onPress={() => void createAddon()}
          disabled={!selectedSizeId || !addonForm.name_en.trim() || !addonForm.name_ar.trim()}
        />
        </View>
      </AdminPageSection>
      ) : null}

      {editTarget ? (
        <AdminPageSection title={`${editTarget.mode === 'move' ? t('admin.move') : t('admin.edit')} ${t(`admin.${editTarget.kind}`)}`}>
          <View style={styles.formStack}>
            {editTarget.mode === 'move' && editTarget.kind !== 'section' ? (
              <View style={styles.formGroup}>
                <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                  {editTarget.kind === 'item'
                    ? t('admin.section')
                    : editTarget.kind === 'type'
                      ? t('admin.item')
                      : editTarget.kind === 'size'
                        ? t('admin.type')
                        : t('admin.size')}
                </AppText>
                <View style={[styles.selectorWrap, mirroredRow(isRTL)]}>
                  {moveParentOptions.map((entry) => (
                    <Pressable
                      key={entry.id}
                      style={[styles.selectorChip, editForm.parent_id === entry.id ? styles.selectorChipActive : null]}
                      onPress={() => setEditForm((p) => ({ ...p, parent_id: entry.id }))}
                      accessibilityRole="button"
                      accessibilityState={{ selected: editForm.parent_id === entry.id }}
                      accessibilityLabel={getLocalizedValue(entry as Section | Item | ItemType | Size, language, 'name')}>
                      <AppText variant="caption" numberOfLines={2}>
                        {getLocalizedValue(entry as Section | Item | ItemType | Size, language, 'name')}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
            {editTarget.mode !== 'move' ? (
              <>
                <BilingualFieldGroup
                  labelEn={t('admin.nameEn')}
                  labelAr={t('admin.nameAr')}
                  valueEn={editForm.name_en}
                  valueAr={editForm.name_ar}
                  onChangeEn={(v) => setEditForm((p) => ({ ...p, name_en: v }))}
                  onChangeAr={(v) => setEditForm((p) => ({ ...p, name_ar: v }))}
                  helperText={missingName(editForm.name_en, editForm.name_ar)}
                />
                {renderImageField('editForm', editForm.image_url, (v) => setEditForm((p) => ({ ...p, image_url: v })))}
                {editTarget.kind === 'item' ? (
                  <View style={styles.formGroup}>
                    <BilingualFieldGroup
                      labelEn={t('admin.descriptionEn')}
                      labelAr={t('admin.descriptionAr')}
                      valueEn={editForm.description_en}
                      valueAr={editForm.description_ar}
                      onChangeEn={(v) => setEditForm((p) => ({ ...p, description_en: v }))}
                      onChangeAr={(v) => setEditForm((p) => ({ ...p, description_ar: v }))}
                    />
                  </View>
                ) : null}
              </>
            ) : null}
            <View style={styles.formGroup}>
              {editTarget.mode !== 'move' && (editTarget.kind === 'size' || editTarget.kind === 'addon') ? (
                <AppInput label={t('admin.price')} value={editForm.price} onChangeText={(v) => setEditForm((p) => ({ ...p, price: v }))} keyboardType="decimal-pad" />
              ) : null}
              {editTarget.mode !== 'move' && editTarget.kind === 'size' ? (
                <AppInput
                  label={t('admin.orderLimit')}
                  value={editForm.order_limit}
                  onChangeText={(v) => setEditForm((p) => ({ ...p, order_limit: v }))}
                  placeholder={t('admin.unlimited')}
                  keyboardType="number-pad"
                />
              ) : null}
              <AppInput label={t('admin.sortOrder')} value={editForm.sort_order} onChangeText={(v) => setEditForm((p) => ({ ...p, sort_order: v }))} keyboardType="number-pad" />
            </View>
          <ActionRow compact={isCompact}>
            <AppButton
              title={editTarget.mode === 'move' ? t('admin.move') : t('admin.saveChanges')}
              onPress={() => void saveEdit()}
              style={styles.flexButton}
              disabled={editTarget.mode === 'move' ? (editTarget.kind === 'section' ? false : !editForm.parent_id) : (!editForm.name_en.trim() || !editForm.name_ar.trim())}
            />
            <AppButton title={t('common.cancel')} variant="ghost" onPress={() => setEditTarget(null)} fullWidth={false} />
          </ActionRow>
          </View>
        </AdminPageSection>
      ) : null}

      <AdminActionSheet
        open={Boolean(actionSheet)}
        title={actionSheet?.title ?? t('admin.moreActions')}
        items={actionSheet?.items ?? []}
        onClose={() => setActionSheet(null)}
      />
    </AppShell>
  );
};

const styles = StyleSheet.create({
  list: {
    gap: theme.spacing.md,
  },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.sectionBackground,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.secondaryCream,
    padding: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  nodeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  nodeMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  rowLabelPressable: {
    flex: 1,
    minWidth: 120,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: theme.spacing.sm,
    width: '100%',
  },
  rowActionsCompact: {
    marginTop: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  actionButton: {
    flex: 1,
    minHeight: 40,
    paddingHorizontal: theme.spacing.xs,
  },
  actionButtonCompact: {
    flexBasis: '31%',
  },
  level1: {
    marginStart: theme.spacing.md,
    marginTop: theme.spacing.sm,
    paddingStart: theme.spacing.sm,
    borderStartWidth: 2,
    borderStartColor: theme.colors.primary100,
  },
  level2: {
    marginStart: theme.spacing.lg,
    marginTop: theme.spacing.sm,
    paddingStart: theme.spacing.sm,
    borderStartWidth: 2,
    borderStartColor: theme.colors.primary100,
  },
  level3: {
    marginStart: theme.spacing.xl,
    marginTop: theme.spacing.sm,
    paddingStart: theme.spacing.sm,
    borderStartWidth: 2,
    borderStartColor: theme.colors.primary100,
  },
  level4: {
    marginStart: theme.spacing.xxl,
    marginTop: theme.spacing.sm,
    paddingStart: theme.spacing.sm,
    borderStartWidth: 2,
    borderStartColor: theme.colors.primary100,
  },
  level1Compact: { marginStart: theme.spacing.sm },
  level2Compact: { marginStart: theme.spacing.md },
  level3Compact: { marginStart: theme.spacing.lg },
  level4Compact: { marginStart: theme.spacing.xl },
  contextRow: {
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  selectorWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  selectorChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    minHeight: 36,
    flexBasis: '48%',
    justifyContent: 'center',
  },
  selectorChipActive: {
    borderColor: theme.colors.primary300,
    backgroundColor: theme.colors.secondaryCream,
  },
  flexButton: {
    flex: 1,
  },
  imageField: {
    gap: theme.spacing.sm,
  },
  imageFieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  formStack: {
    gap: theme.spacing.lg,
  },
  formGroup: {
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.secondaryCream,
    padding: theme.spacing.md,
  },
  expandToggle: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  expandToggleSpacer: {
    width: 32,
    height: 32,
  },
});
