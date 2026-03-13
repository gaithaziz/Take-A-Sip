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
import { LoadingState } from '@/components/LoadingState';
import { ActionRow } from '@/components/admin/ActionRow';
import { AdminPageSection } from '@/components/admin/AdminPageSection';
import { BilingualFieldGroup } from '@/components/admin/BilingualFieldGroup';
import { ExpandableText } from '@/components/admin/ExpandableText';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { adminService } from '@/services/adminService';
import { useLanguage } from '@/state/LanguageContext';
import { theme } from '@/theme';
import { Addon, Item, ItemType, Section, Size } from '@/types/api';
import { getApiErrorMessage } from '@/utils/errors';
import { getLocalizedValue } from '@/utils/i18n';
import { mirroredRow } from '@/utils/layout';

type EditTarget =
  | { kind: 'section'; data: Section }
  | { kind: 'item'; data: Item }
  | { kind: 'type'; data: ItemType }
  | { kind: 'size'; data: Size }
  | { kind: 'addon'; data: Addon };
type WorkflowStep = 'browse' | 'section' | 'item' | 'type' | 'size' | 'addon';

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

  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('browse');

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [sectionForm, setSectionForm] = useState({ name_en: '', name_ar: '', image_url: '', sort_order: '0' });
  const [itemForm, setItemForm] = useState({ name_en: '', name_ar: '', image_url: '', description_en: '', description_ar: '', sort_order: '0' });
  const [typeForm, setTypeForm] = useState({ name_en: '', name_ar: '', image_url: '', sort_order: '0' });
  const [sizeForm, setSizeForm] = useState({ name_en: '', name_ar: '', image_url: '', price: '', sort_order: '0' });
  const [addonForm, setAddonForm] = useState({ name_en: '', name_ar: '', image_url: '', price: '', sort_order: '0' });

  const [editForm, setEditForm] = useState({ name_en: '', name_ar: '', image_url: '', description_en: '', description_ar: '', price: '', sort_order: '0' });
  const missingName = (nameEn: string, nameAr: string) => (!nameEn.trim() || !nameAr.trim() ? t('admin.missingTranslation') : undefined);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [mutatingEntityId, setMutatingEntityId] = useState<string | null>(null);

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
      const menu = await adminService.getMenuTree();
      setSections(menu.sections);
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

  const beginEdit = (target: EditTarget) => {
    setEditTarget(target);
    const data = target.data as Record<string, unknown>;
    setEditForm({
      name_en: String(data.name_en ?? ''),
      name_ar: String(data.name_ar ?? ''),
      image_url: String(data.image_url ?? ''),
      description_en: String(data.description_en ?? ''),
      description_ar: String(data.description_ar ?? ''),
      price: String(data.price ?? ''),
      sort_order: String(data.sort_order ?? 0),
    });
  };

  const saveEdit = async () => {
    if (!editTarget) {
      return;
    }
    try {
      const payload: Record<string, unknown> = {
        name_en: editForm.name_en,
        name_ar: editForm.name_ar,
        image_url: editForm.image_url || null,
        sort_order: Number(editForm.sort_order || 0),
      };
      if (editTarget.kind === 'item') {
        payload.description_en = editForm.description_en || null;
        payload.description_ar = editForm.description_ar || null;
      }
      if (editTarget.kind === 'size' || editTarget.kind === 'addon') {
        payload.price = Number(editForm.price || 0);
      }
      await adminService.updateMenuEntity(editTarget.kind, editTarget.data.id, payload);
      setEditTarget(null);
      await load();
    } catch (e) {
      Alert.alert(t('common.error'), getApiErrorMessage(e, t));
    }
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
      await adminService.createItem({
        section_id: selectedSectionId,
        ...itemForm,
        sort_order: Number(itemForm.sort_order || 0),
        image_url: itemForm.image_url || undefined,
        description_en: itemForm.description_en || undefined,
        description_ar: itemForm.description_ar || undefined,
      });
      setItemForm({ name_en: '', name_ar: '', image_url: '', description_en: '', description_ar: '', sort_order: '0' });
      await load();
    } catch (e) {
      Alert.alert(t('common.error'), getApiErrorMessage(e, t));
    }
  };

  const createType = async () => {
    if (!selectedItemId) return;
    try {
      await adminService.createType({
        item_id: selectedItemId,
        ...typeForm,
        sort_order: Number(typeForm.sort_order || 0),
        image_url: typeForm.image_url || undefined,
      });
      setTypeForm({ name_en: '', name_ar: '', image_url: '', sort_order: '0' });
      await load();
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
        sort_order: Number(sizeForm.sort_order || 0),
        image_url: sizeForm.image_url || undefined,
      });
      setSizeForm({ name_en: '', name_ar: '', image_url: '', price: '', sort_order: '0' });
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

  const renderHierarchyActions = (
    id: string,
    isActive: boolean,
    label: string,
    onEdit: () => void,
  ) => (
    <View style={[styles.rowActions, isCompact ? styles.rowActionsCompact : null]}>
      <AppButton
        title={t('admin.edit')}
        variant="ghost"
        fullWidth={false}
        style={styles.actionButton}
        onPress={onEdit}
        disabled={Boolean(mutatingEntityId && mutatingEntityId !== id)}
      />
      <AppButton
        title={t('admin.toggle')}
        variant="secondary"
        fullWidth={false}
        style={styles.actionButton}
        loading={mutatingEntityId === id}
        disabled={Boolean(mutatingEntityId && mutatingEntityId !== id)}
        onPress={() => void toggleEntity(id, isActive, label)}
      />
    </View>
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

  if (loading) return <LoadingState label={t('common.loading')} />;
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
        <AppText variant="h3">{t('admin.currentContext')}</AppText>
        <View style={[styles.contextRow, mirroredRow(isRTL)]}>
          <BadgeChip label={`${t('admin.section')}: ${selectedSection ? getLocalizedValue(selectedSection, language, 'name') : t('admin.none')}`} />
          <BadgeChip label={`${t('admin.item')}: ${selectedItem ? getLocalizedValue(selectedItem, language, 'name') : t('admin.none')}`} />
          <BadgeChip label={`${t('admin.type')}: ${selectedType ? getLocalizedValue(selectedType, language, 'name') : t('admin.none')}`} />
          <BadgeChip label={`${t('admin.size')}: ${selectedSize ? getLocalizedValue(selectedSize, language, 'name') : t('admin.none')}`} />
        </View>
      </AppCard>

      <AppCard>
        <AppText variant="h3">{t('admin.menuHierarchy')}</AppText>
        <View style={styles.list}>
          {sections.map((section) => {
            const sectionKey = `s-${section.id}`;
            const sectionOpen = expanded[sectionKey] ?? false;
            return (
              <View key={section.id}>
                <View style={styles.nodeCard}>
                  <View style={[styles.nodeHeader, mirroredRow(isRTL)]}>
                    {renderExpandControl(sectionOpen, () => toggleExpanded(sectionKey))}
                    <ImageThumbnail uri={section.image_url} />
                    <Pressable
                      style={styles.rowLabelPressable}
                      onPress={() => {
                        setSelectedSectionId(section.id);
                        setSelectedItemId(null);
                        setSelectedTypeId(null);
                        setSelectedSizeId(null);
                      }}>
                      <ExpandableText value={`${t('admin.section')}: ${getLocalizedValue(section, language, 'name')} (${section.sort_order})`} numberOfLines={1} />
                    </Pressable>
                  </View>
                  <View style={[styles.nodeMetaRow, mirroredRow(isRTL)]}>
                    <BadgeChip label={section.is_active ? t('admin.active') : t('admin.inactive')} tone={section.is_active ? 'success' : 'default'} />
                  </View>
                  {renderHierarchyActions(
                    section.id,
                    section.is_active,
                    `${t('admin.section')} ${getLocalizedValue(section, language, 'name')}`,
                    () => beginEdit({ kind: 'section', data: section }),
                  )}
                </View>

                {sectionOpen
                  ? section.items.map((item) => {
                      const itemKey = `i-${item.id}`;
                      const itemOpen = expanded[itemKey] ?? false;
                      return (
                        <View key={item.id} style={[styles.level1, isCompact ? styles.level1Compact : null]}>
                          <View style={styles.nodeCard}>
                            <View style={[styles.nodeHeader, mirroredRow(isRTL)]}>
                              {renderExpandControl(itemOpen, () => toggleExpanded(itemKey))}
                              <ImageThumbnail uri={item.image_url} />
                              <Pressable
                                style={styles.rowLabelPressable}
                                onPress={() => {
                                  setSelectedSectionId(section.id);
                                  setSelectedItemId(item.id);
                                  setSelectedTypeId(null);
                                  setSelectedSizeId(null);
                                }}>
                                <ExpandableText value={`${t('admin.item')}: ${getLocalizedValue(item, language, 'name')} (${item.sort_order})`} numberOfLines={1} />
                              </Pressable>
                            </View>
                            <View style={[styles.nodeMetaRow, mirroredRow(isRTL)]}>
                              <BadgeChip label={item.is_active ? t('admin.active') : t('admin.inactive')} tone={item.is_active ? 'success' : 'default'} />
                            </View>
                            {renderHierarchyActions(
                              item.id,
                              item.is_active,
                              `${t('admin.item')} ${getLocalizedValue(item, language, 'name')}`,
                              () => beginEdit({ kind: 'item', data: item }),
                            )}
                          </View>

                          {itemOpen
                            ? item.item_types.map((itemType) => {
                                const typeKey = `t-${itemType.id}`;
                                const typeOpen = expanded[typeKey] ?? false;
                                return (
                                <View key={itemType.id} style={[styles.level2, isCompact ? styles.level2Compact : null]}>
                                  <View style={styles.nodeCard}>
                                    <View style={[styles.nodeHeader, mirroredRow(isRTL)]}>
                                      {renderExpandControl(typeOpen, () => toggleExpanded(typeKey))}
                                      <ImageThumbnail uri={itemType.image_url} />
                                      <Pressable
                                        style={styles.rowLabelPressable}
                                        onPress={() => {
                                          setSelectedSectionId(section.id);
                                          setSelectedItemId(item.id);
                                          setSelectedTypeId(itemType.id);
                                          setSelectedSizeId(null);
                                        }}>
                                        <ExpandableText value={`${t('admin.type')}: ${getLocalizedValue(itemType, language, 'name')} (${itemType.sort_order})`} numberOfLines={1} />
                                      </Pressable>
                                    </View>
                                    <View style={[styles.nodeMetaRow, mirroredRow(isRTL)]}>
                                      <BadgeChip label={itemType.is_active ? t('admin.active') : t('admin.inactive')} tone={itemType.is_active ? 'success' : 'default'} />
                                    </View>
                                    {renderHierarchyActions(
                                      itemType.id,
                                      itemType.is_active,
                                      `${t('admin.type')} ${getLocalizedValue(itemType, language, 'name')}`,
                                      () => beginEdit({ kind: 'type', data: itemType }),
                                    )}
                                  </View>

                                    {typeOpen
                                      ? itemType.sizes.map((size) => {
                                          const sizeKey = `z-${size.id}`;
                                          const sizeOpen = expanded[sizeKey] ?? false;
                                          return (
                                            <View key={size.id} style={[styles.level3, isCompact ? styles.level3Compact : null]}>
                                              <View style={styles.nodeCard}>
                                                <View style={[styles.nodeHeader, mirroredRow(isRTL)]}>
                                                  {renderExpandControl(sizeOpen, () => toggleExpanded(sizeKey))}
                                                  <ImageThumbnail uri={size.image_url} />
                                                  <Pressable
                                                    style={styles.rowLabelPressable}
                                                    onPress={() => {
                                                      setSelectedSectionId(section.id);
                                                      setSelectedItemId(item.id);
                                                      setSelectedTypeId(itemType.id);
                                                      setSelectedSizeId(size.id);
                                                    }}>
                                                    <ExpandableText value={`${t('admin.size')}: ${getLocalizedValue(size, language, 'name')} (${size.sort_order})`} numberOfLines={1} />
                                                  </Pressable>
                                                </View>
                                                <View style={[styles.nodeMetaRow, mirroredRow(isRTL)]}>
                                                  <BadgeChip label={size.is_active ? t('admin.active') : t('admin.inactive')} tone={size.is_active ? 'success' : 'default'} />
                                                </View>
                                                {renderHierarchyActions(
                                                  size.id,
                                                  size.is_active,
                                                  `${t('admin.size')} ${getLocalizedValue(size, language, 'name')}`,
                                                  () => beginEdit({ kind: 'size', data: size }),
                                                )}
                                              </View>
                                              {sizeOpen
                                                ? size.addons.map((addon) => (
                                                    <View key={addon.id} style={[styles.level4, isCompact ? styles.level4Compact : null]}>
                                                        <View style={styles.nodeCard}>
                                                          <View style={[styles.nodeHeader, mirroredRow(isRTL)]}>
                                                            <View style={styles.expandToggleSpacer} />
                                                            <ImageThumbnail uri={addon.image_url} />
                                                            <Pressable style={styles.rowLabelPressable} onPress={() => setSelectedSizeId(size.id)}>
                                                              <ExpandableText value={`${t('admin.addon')}: ${getLocalizedValue(addon, language, 'name')} (${addon.sort_order})`} numberOfLines={1} />
                                                            </Pressable>
                                                          </View>
                                                        <View style={[styles.nodeMetaRow, mirroredRow(isRTL)]}>
                                                          <BadgeChip label={addon.is_active ? t('admin.active') : t('admin.inactive')} tone={addon.is_active ? 'success' : 'default'} />
                                                        </View>
                                                        {renderHierarchyActions(
                                                          addon.id,
                                                          addon.is_active,
                                                          `${t('admin.addon')} ${getLocalizedValue(addon, language, 'name')}`,
                                                          () => beginEdit({ kind: 'addon', data: addon }),
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
              {sections.map((section) => (
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
              {items.map((item) => (
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
              {itemTypes.map((itemType) => (
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
              {sizes.map((size) => (
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
        <AdminPageSection title={`${t('admin.edit')} ${t(`admin.${editTarget.kind}`)}`}>
          <View style={styles.formStack}>
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
            <View style={styles.formGroup}>
              {editTarget.kind === 'size' || editTarget.kind === 'addon' ? (
                <AppInput label={t('admin.price')} value={editForm.price} onChangeText={(v) => setEditForm((p) => ({ ...p, price: v }))} keyboardType="decimal-pad" />
              ) : null}
              <AppInput label={t('admin.sortOrder')} value={editForm.sort_order} onChangeText={(v) => setEditForm((p) => ({ ...p, sort_order: v }))} keyboardType="number-pad" />
            </View>
          <ActionRow compact={isCompact}>
            <AppButton
              title={t('admin.saveChanges')}
              onPress={() => void saveEdit()}
              style={styles.flexButton}
              disabled={!editForm.name_en.trim() || !editForm.name_ar.trim()}
            />
            <AppButton title={t('common.cancel')} variant="ghost" onPress={() => setEditTarget(null)} fullWidth={false} />
          </ActionRow>
          </View>
        </AdminPageSection>
      ) : null}
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
    flexDirection: 'column',
  },
  actionButton: {
    flex: 1,
    minHeight: 40,
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
