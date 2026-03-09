import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

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
import { menuService } from '@/services/menuService';
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
  const actionButtonStyle = isCompact ? styles.actionButtonCompact : undefined;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sections, setSections] = useState<Section[]>([]);

  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [sectionForm, setSectionForm] = useState({ name_en: '', name_ar: '', image_url: '', sort_order: '0' });
  const [itemForm, setItemForm] = useState({ name_en: '', name_ar: '', image_url: '', description_en: '', description_ar: '', sort_order: '0' });
  const [typeForm, setTypeForm] = useState({ name_en: '', name_ar: '', image_url: '', sort_order: '0' });
  const [sizeForm, setSizeForm] = useState({ name_en: '', name_ar: '', image_url: '', price: '', sort_order: '0' });
  const [addonForm, setAddonForm] = useState({ name_en: '', name_ar: '', image_url: '', price: '', sort_order: '0' });

  const [editForm, setEditForm] = useState({ name_en: '', name_ar: '', image_url: '', description_en: '', description_ar: '', price: '', sort_order: '0' });
  const missingName = (nameEn: string, nameAr: string) => (!nameEn.trim() || !nameAr.trim() ? t('admin.missingTranslation') : undefined);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const menu = await menuService.getMenu();
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

  const toggleEntity = async (id: string) => {
    try {
      await adminService.toggleMenuEntity(id);
      await load();
    } catch (e) {
      Alert.alert(t('common.error'), getApiErrorMessage(e, t));
    }
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

  if (loading) return <LoadingState label={t('common.loading')} />;
  if (error) return <EmptyState title={t('common.error')} subtitle={error} actionLabel={t('common.retry')} onAction={load} />;

  return (
    <AppShell refreshing={loading} onRefresh={load}>
      <AppText variant="h1">{t('admin.menuEditorTitle')}</AppText>

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
            const sectionOpen = expanded[sectionKey] ?? true;
            return (
              <View key={section.id}>
                <View style={[styles.row, mirroredRow(isRTL)]}>
                  <Pressable onPress={() => toggleExpanded(sectionKey)}>
                    <AppText variant="h3">{sectionOpen ? '-' : '+'}</AppText>
                  </Pressable>
                  <ImageThumbnail uri={section.image_url} />
                  <Pressable
                    style={{ flex: 1 }}
                    onPress={() => {
                      setSelectedSectionId(section.id);
                      setSelectedItemId(null);
                      setSelectedTypeId(null);
                      setSelectedSizeId(null);
                    }}>
                    <ExpandableText value={`${t('admin.section')}: ${getLocalizedValue(section, language, 'name')} (${section.sort_order})`} />
                  </Pressable>
                  <BadgeChip label={section.is_active ? t('admin.active') : t('admin.inactive')} tone={section.is_active ? 'success' : 'default'} />
                  <AppButton title={t('admin.edit')} variant="ghost" fullWidth={false} style={actionButtonStyle} onPress={() => beginEdit({ kind: 'section', data: section })} />
                  <AppButton title={t('admin.toggle')} variant="secondary" fullWidth={false} style={actionButtonStyle} onPress={() => void toggleEntity(section.id)} />
                </View>

                {sectionOpen
                  ? section.items.map((item) => {
                      const itemKey = `i-${item.id}`;
                      const itemOpen = expanded[itemKey] ?? false;
                      return (
                        <View key={item.id} style={styles.level1}>
                          <View style={[styles.row, mirroredRow(isRTL)]}>
                            <Pressable onPress={() => toggleExpanded(itemKey)}>
                              <AppText variant="h3">{itemOpen ? '-' : '+'}</AppText>
                            </Pressable>
                            <ImageThumbnail uri={item.image_url} />
                            <Pressable
                              style={{ flex: 1 }}
                              onPress={() => {
                                setSelectedSectionId(section.id);
                                setSelectedItemId(item.id);
                                setSelectedTypeId(null);
                                setSelectedSizeId(null);
                              }}>
                              <ExpandableText value={`${t('admin.item')}: ${getLocalizedValue(item, language, 'name')} (${item.sort_order})`} />
                            </Pressable>
                            <BadgeChip label={item.is_active ? t('admin.active') : t('admin.inactive')} tone={item.is_active ? 'success' : 'default'} />
                            <AppButton title={t('admin.edit')} variant="ghost" fullWidth={false} style={actionButtonStyle} onPress={() => beginEdit({ kind: 'item', data: item })} />
                            <AppButton title={t('admin.toggle')} variant="secondary" fullWidth={false} style={actionButtonStyle} onPress={() => void toggleEntity(item.id)} />
                          </View>

                          {itemOpen
                            ? item.item_types.map((itemType) => {
                                const typeKey = `t-${itemType.id}`;
                                const typeOpen = expanded[typeKey] ?? false;
                                return (
                                  <View key={itemType.id} style={styles.level2}>
                                    <View style={[styles.row, mirroredRow(isRTL)]}>
                                      <Pressable onPress={() => toggleExpanded(typeKey)}>
                                        <AppText variant="h3">{typeOpen ? '-' : '+'}</AppText>
                                      </Pressable>
                                      <ImageThumbnail uri={itemType.image_url} />
                                      <Pressable
                                        style={{ flex: 1 }}
                                        onPress={() => {
                                          setSelectedSectionId(section.id);
                                          setSelectedItemId(item.id);
                                          setSelectedTypeId(itemType.id);
                                          setSelectedSizeId(null);
                                        }}>
                                        <ExpandableText value={`${t('admin.type')}: ${getLocalizedValue(itemType, language, 'name')} (${itemType.sort_order})`} />
                                      </Pressable>
                                      <BadgeChip label={itemType.is_active ? t('admin.active') : t('admin.inactive')} tone={itemType.is_active ? 'success' : 'default'} />
                                      <AppButton title={t('admin.edit')} variant="ghost" fullWidth={false} style={actionButtonStyle} onPress={() => beginEdit({ kind: 'type', data: itemType })} />
                                      <AppButton title={t('admin.toggle')} variant="secondary" fullWidth={false} style={actionButtonStyle} onPress={() => void toggleEntity(itemType.id)} />
                                    </View>

                                    {typeOpen
                                      ? itemType.sizes.map((size) => {
                                          const sizeKey = `z-${size.id}`;
                                          const sizeOpen = expanded[sizeKey] ?? false;
                                          return (
                                            <View key={size.id} style={styles.level3}>
                                              <View style={[styles.row, mirroredRow(isRTL)]}>
                                                <Pressable onPress={() => toggleExpanded(sizeKey)}>
                                                  <AppText variant="h3">{sizeOpen ? '-' : '+'}</AppText>
                                                </Pressable>
                                                <ImageThumbnail uri={size.image_url} />
                                                <Pressable
                                                  style={{ flex: 1 }}
                                                  onPress={() => {
                                                    setSelectedSectionId(section.id);
                                                    setSelectedItemId(item.id);
                                                    setSelectedTypeId(itemType.id);
                                                    setSelectedSizeId(size.id);
                                                  }}>
                                                  <ExpandableText value={`${t('admin.size')}: ${getLocalizedValue(size, language, 'name')} (${size.sort_order})`} />
                                                </Pressable>
                                                <BadgeChip label={size.is_active ? t('admin.active') : t('admin.inactive')} tone={size.is_active ? 'success' : 'default'} />
                                                <AppButton title={t('admin.edit')} variant="ghost" fullWidth={false} style={actionButtonStyle} onPress={() => beginEdit({ kind: 'size', data: size })} />
                                                <AppButton title={t('admin.toggle')} variant="secondary" fullWidth={false} style={actionButtonStyle} onPress={() => void toggleEntity(size.id)} />
                                              </View>
                                              {sizeOpen
                                                ? size.addons.map((addon) => (
                                                    <View key={addon.id} style={styles.level4}>
                                                      <View style={[styles.row, mirroredRow(isRTL)]}>
                                                        <ImageThumbnail uri={addon.image_url} />
                                                        <Pressable style={{ flex: 1 }} onPress={() => setSelectedSizeId(size.id)}>
                                                          <ExpandableText value={`${t('admin.addon')}: ${getLocalizedValue(addon, language, 'name')} (${addon.sort_order})`} />
                                                        </Pressable>
                                                        <BadgeChip label={addon.is_active ? t('admin.active') : t('admin.inactive')} tone={addon.is_active ? 'success' : 'default'} />
                                                        <AppButton title={t('admin.edit')} variant="ghost" fullWidth={false} style={actionButtonStyle} onPress={() => beginEdit({ kind: 'addon', data: addon })} />
                                                        <AppButton title={t('admin.toggle')} variant="secondary" fullWidth={false} style={actionButtonStyle} onPress={() => void toggleEntity(addon.id)} />
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

      <AdminPageSection title={t('admin.createSection')}>
        <BilingualFieldGroup
          labelEn={t('admin.nameEn')}
          labelAr={t('admin.nameAr')}
          valueEn={sectionForm.name_en}
          valueAr={sectionForm.name_ar}
          onChangeEn={(v) => setSectionForm((p) => ({ ...p, name_en: v }))}
          onChangeAr={(v) => setSectionForm((p) => ({ ...p, name_ar: v }))}
          helperText={missingName(sectionForm.name_en, sectionForm.name_ar)}
        />
        <AppInput label={t('admin.imageUrl')} value={sectionForm.image_url} onChangeText={(v) => setSectionForm((p) => ({ ...p, image_url: v }))} />
        <AppInput label={t('admin.sortOrder')} value={sectionForm.sort_order} onChangeText={(v) => setSectionForm((p) => ({ ...p, sort_order: v }))} keyboardType="number-pad" />
        <AppButton
          title={t('admin.createSection')}
          onPress={() => void createSection()}
          disabled={!sectionForm.name_en.trim() || !sectionForm.name_ar.trim()}
        />
      </AdminPageSection>

      <AdminPageSection title={t('admin.createItem')}>
        <View style={[styles.selectorWrap, mirroredRow(isRTL)]}>
          {sections.map((section) => (
            <Pressable
              key={section.id}
              style={[styles.selectorChip, selectedSectionId === section.id ? styles.selectorChipActive : null]}
              onPress={() => setSelectedSectionId(section.id)}>
              <AppText variant="caption" numberOfLines={1}>{getLocalizedValue(section, language, 'name')}</AppText>
            </Pressable>
          ))}
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
        <AppInput label={t('admin.descriptionEn')} value={itemForm.description_en} onChangeText={(v) => setItemForm((p) => ({ ...p, description_en: v }))} />
        <AppInput label={t('admin.descriptionAr')} value={itemForm.description_ar} onChangeText={(v) => setItemForm((p) => ({ ...p, description_ar: v }))} />
        <AppInput label={t('admin.imageUrl')} value={itemForm.image_url} onChangeText={(v) => setItemForm((p) => ({ ...p, image_url: v }))} />
        <AppInput label={t('admin.sortOrder')} value={itemForm.sort_order} onChangeText={(v) => setItemForm((p) => ({ ...p, sort_order: v }))} keyboardType="number-pad" />
        <AppButton
          title={t('admin.createItem')}
          onPress={() => void createItem()}
          disabled={!selectedSectionId || !itemForm.name_en.trim() || !itemForm.name_ar.trim()}
        />
      </AdminPageSection>

      <AdminPageSection title={t('admin.createType')}>
        <View style={[styles.selectorWrap, mirroredRow(isRTL)]}>
          {items.map((item) => (
            <Pressable
              key={item.id}
              style={[styles.selectorChip, selectedItemId === item.id ? styles.selectorChipActive : null]}
              onPress={() => setSelectedItemId(item.id)}>
              <AppText variant="caption" numberOfLines={1}>{getLocalizedValue(item, language, 'name')}</AppText>
            </Pressable>
          ))}
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
        <AppInput label={t('admin.imageUrl')} value={typeForm.image_url} onChangeText={(v) => setTypeForm((p) => ({ ...p, image_url: v }))} />
        <AppInput label={t('admin.sortOrder')} value={typeForm.sort_order} onChangeText={(v) => setTypeForm((p) => ({ ...p, sort_order: v }))} keyboardType="number-pad" />
        <AppButton
          title={t('admin.createType')}
          onPress={() => void createType()}
          disabled={!selectedItemId || !typeForm.name_en.trim() || !typeForm.name_ar.trim()}
        />
      </AdminPageSection>

      <AdminPageSection title={t('admin.createSize')}>
        <View style={[styles.selectorWrap, mirroredRow(isRTL)]}>
          {itemTypes.map((itemType) => (
            <Pressable
              key={itemType.id}
              style={[styles.selectorChip, selectedTypeId === itemType.id ? styles.selectorChipActive : null]}
              onPress={() => setSelectedTypeId(itemType.id)}>
              <AppText variant="caption" numberOfLines={1}>{getLocalizedValue(itemType, language, 'name')}</AppText>
            </Pressable>
          ))}
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
        <AppInput label={t('admin.imageUrl')} value={sizeForm.image_url} onChangeText={(v) => setSizeForm((p) => ({ ...p, image_url: v }))} />
        <AppInput label={t('admin.price')} value={sizeForm.price} onChangeText={(v) => setSizeForm((p) => ({ ...p, price: v }))} keyboardType="decimal-pad" />
        <AppInput label={t('admin.sortOrder')} value={sizeForm.sort_order} onChangeText={(v) => setSizeForm((p) => ({ ...p, sort_order: v }))} keyboardType="number-pad" />
        <AppButton
          title={t('admin.createSize')}
          onPress={() => void createSize()}
          disabled={!selectedTypeId || !sizeForm.name_en.trim() || !sizeForm.name_ar.trim()}
        />
      </AdminPageSection>

      <AdminPageSection title={t('admin.createAddon')}>
        <View style={[styles.selectorWrap, mirroredRow(isRTL)]}>
          {sizes.map((size) => (
            <Pressable
              key={size.id}
              style={[styles.selectorChip, selectedSizeId === size.id ? styles.selectorChipActive : null]}
              onPress={() => setSelectedSizeId(size.id)}>
              <AppText variant="caption" numberOfLines={1}>{getLocalizedValue(size, language, 'name')}</AppText>
            </Pressable>
          ))}
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
        <AppInput label={t('admin.imageUrl')} value={addonForm.image_url} onChangeText={(v) => setAddonForm((p) => ({ ...p, image_url: v }))} />
        <AppInput label={t('admin.price')} value={addonForm.price} onChangeText={(v) => setAddonForm((p) => ({ ...p, price: v }))} keyboardType="decimal-pad" />
        <AppInput label={t('admin.sortOrder')} value={addonForm.sort_order} onChangeText={(v) => setAddonForm((p) => ({ ...p, sort_order: v }))} keyboardType="number-pad" />
        <AppButton
          title={t('admin.createAddon')}
          onPress={() => void createAddon()}
          disabled={!selectedSizeId || !addonForm.name_en.trim() || !addonForm.name_ar.trim()}
        />
      </AdminPageSection>

      {editTarget ? (
        <AdminPageSection title={`${t('admin.edit')} ${t(`admin.${editTarget.kind}`)}`}>
          <ImageThumbnail uri={editForm.image_url} />
          <BilingualFieldGroup
            labelEn={t('admin.nameEn')}
            labelAr={t('admin.nameAr')}
            valueEn={editForm.name_en}
            valueAr={editForm.name_ar}
            onChangeEn={(v) => setEditForm((p) => ({ ...p, name_en: v }))}
            onChangeAr={(v) => setEditForm((p) => ({ ...p, name_ar: v }))}
            helperText={missingName(editForm.name_en, editForm.name_ar)}
          />
          <AppInput label={t('admin.imageUrl')} value={editForm.image_url} onChangeText={(v) => setEditForm((p) => ({ ...p, image_url: v }))} />
          {editTarget.kind === 'item' ? (
            <BilingualFieldGroup
              labelEn={t('admin.descriptionEn')}
              labelAr={t('admin.descriptionAr')}
              valueEn={editForm.description_en}
              valueAr={editForm.description_ar}
              onChangeEn={(v) => setEditForm((p) => ({ ...p, description_en: v }))}
              onChangeAr={(v) => setEditForm((p) => ({ ...p, description_ar: v }))}
            />
          ) : null}
          {editTarget.kind === 'size' || editTarget.kind === 'addon' ? (
            <AppInput label={t('admin.price')} value={editForm.price} onChangeText={(v) => setEditForm((p) => ({ ...p, price: v }))} keyboardType="decimal-pad" />
          ) : null}
          <AppInput label={t('admin.sortOrder')} value={editForm.sort_order} onChangeText={(v) => setEditForm((p) => ({ ...p, sort_order: v }))} keyboardType="number-pad" />
          <ActionRow compact={isCompact}>
            <AppButton
              title={t('admin.saveChanges')}
              onPress={() => void saveEdit()}
              style={styles.flexButton}
              disabled={!editForm.name_en.trim() || !editForm.name_ar.trim()}
            />
            <AppButton title={t('common.cancel')} variant="ghost" onPress={() => setEditTarget(null)} fullWidth={false} />
          </ActionRow>
        </AdminPageSection>
      ) : null}
    </AppShell>
  );
};

const styles = StyleSheet.create({
  list: {
    gap: theme.spacing.sm,
  },
  thumb: {
    width: 34,
    height: 34,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.sectionBackground,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: theme.spacing.sm,
    paddingTop: theme.spacing.xs,
  },
  level1: { marginStart: 12 },
  level2: { marginStart: 24 },
  level3: { marginStart: 36 },
  level4: { marginStart: 48 },
  contextRow: {
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  selectorWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  selectorChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    maxWidth: '48%',
  },
  selectorChipActive: {
    borderColor: theme.colors.primary300,
    backgroundColor: theme.colors.secondaryCream,
  },
  actionButtonCompact: {
    minHeight: 38,
    paddingHorizontal: theme.spacing.md,
  },
  flexButton: {
    flex: 1,
  },
});
