import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppInput } from '@/components/AppInput';
import { AppShell } from '@/components/AppShell';
import { AppText } from '@/components/AppText';
import { TopAppBar } from '@/components/TopAppBar';
import { AdminCustomerProductPreview } from '@/components/admin/AdminCustomerProductPreview';
import { AdminPageSection } from '@/components/admin/AdminPageSection';
import { BilingualFieldGroup } from '@/components/admin/BilingualFieldGroup';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { RootStackParamList } from '@/navigation/types';
import { adminService } from '@/services/adminService';
import { useLanguage } from '@/state/LanguageContext';
import { theme } from '@/theme';
import { Addon, Item, ItemType, LanguageCode, Section, Size } from '@/types/api';
import { getApiErrorMessage } from '@/utils/errors';
import { launchSingleImageGalleryPicker, requestGalleryImagePermission } from '@/utils/galleryImagePicker';
import { getLocalizedValue } from '@/utils/i18n';
import { mirroredRow } from '@/utils/layout';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminMenuProductEditor'>;
type StepKey = 'category' | 'details' | 'variants' | 'addons' | 'review';

type DraftAddon = {
  id?: string;
  name_en: string;
  name_ar: string;
  image_url: string;
  price: string;
  sort_order: string;
};

type DraftSize = {
  id?: string;
  name_en: string;
  name_ar: string;
  image_url: string;
  price: string;
  order_limit: string;
  sort_order: string;
  addons: DraftAddon[];
};

type DraftOption = {
  id?: string;
  name_en: string;
  name_ar: string;
  image_url: string;
  sort_order: string;
  sizes: DraftSize[];
};

type ExistingSubgroup = {
  id: string;
  name_en: string;
  name_ar: string;
};

const stepKeys: StepKey[] = ['category', 'details', 'variants', 'addons', 'review'];
const draftId = (prefix: string, index: number) => `draft-${prefix}-${index}`;
const isPersistedId = (id?: string) => Boolean(id && !id.startsWith('draft-'));
const parseOptionalLimit = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? Number(trimmed) : null;
};

const initialDraftOption = (t: (key: string) => string): DraftOption => ({
  name_en: t('admin.defaultOptionEn'),
  name_ar: t('admin.defaultOptionAr'),
  image_url: '',
  sort_order: '0',
  sizes: [
    {
      name_en: t('admin.defaultVariantEn'),
      name_ar: t('admin.defaultVariantAr'),
      image_url: '',
      price: '',
      order_limit: '',
      sort_order: '0',
      addons: [],
    },
  ],
});

const optionFromApi = (itemType: ItemType): DraftOption => ({
  id: itemType.id,
  name_en: itemType.name_en,
  name_ar: itemType.name_ar,
  image_url: itemType.image_url ?? '',
  sort_order: String(itemType.sort_order ?? 0),
  sizes: itemType.sizes.map((size) => ({
    id: size.id,
    name_en: size.name_en,
    name_ar: size.name_ar,
    image_url: size.image_url ?? '',
    price: String(size.price ?? ''),
    order_limit: size.order_limit == null ? '' : String(size.order_limit),
    sort_order: String(size.sort_order ?? 0),
    addons: size.addons.map((addon) => ({
      id: addon.id,
      name_en: addon.name_en,
      name_ar: addon.name_ar,
      image_url: addon.image_url ?? '',
      price: String(addon.price ?? ''),
      sort_order: String(addon.sort_order ?? 0),
    })),
  })),
});

const buildExistingSubgroups = (section: Section | undefined): ExistingSubgroup[] => {
  if (!section) return [];
  const seen = new Set<string>();
  const groups: ExistingSubgroup[] = [];
  section.items.forEach((item) => {
    const nameEn = (item.description_en ?? '').trim();
    const nameAr = (item.description_ar ?? '').trim();
    if (!nameEn && !nameAr) return;
    const key = `${nameEn}|${nameAr}`;
    if (seen.has(key)) return;
    seen.add(key);
    groups.push({
      id: key,
      name_en: nameEn || nameAr,
      name_ar: nameAr || nameEn,
    });
  });
  return groups;
};

export const AdminMenuProductEditorScreen = ({ route, navigation }: Props) => {
  const editingItem = route.params?.item;
  const { t, language } = useAppTranslation();
  const { isRTL } = useLanguage();
  const { width } = useWindowDimensions();
  const isCompact = width < 390;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [stepIndex, setStepIndex] = useState(editingItem ? 1 : 0);
  const [previewLanguage, setPreviewLanguage] = useState<LanguageCode>(language);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState(editingItem?.section_id ?? route.params?.sectionId ?? '');
  const [nameEn, setNameEn] = useState(editingItem?.name_en ?? '');
  const [nameAr, setNameAr] = useState(editingItem?.name_ar ?? '');
  const [descriptionEn, setDescriptionEn] = useState(editingItem?.description_en ?? '');
  const [descriptionAr, setDescriptionAr] = useState(editingItem?.description_ar ?? '');
  const [imageUrl, setImageUrl] = useState(editingItem?.image_url ?? '');
  const [sortOrder, setSortOrder] = useState(String(editingItem?.sort_order ?? 0));
  const [options, setOptions] = useState<DraftOption[]>(
    editingItem?.item_types.length ? editingItem.item_types.map(optionFromApi) : [initialDraftOption(t)],
  );

  const step = stepKeys[stepIndex];
  const selectedSection = sections.find((section) => section.id === selectedSectionId);
  const existingSubgroups = useMemo(() => buildExistingSubgroups(selectedSection), [selectedSection]);
  const variantCount = useMemo(() => options.reduce((sum, option) => sum + option.sizes.length, 0), [options]);
  const addonCount = useMemo(
    () => options.reduce((sum, option) => sum + option.sizes.reduce((sizeSum, size) => sizeSum + size.addons.length, 0), 0),
    [options],
  );

  const loadSections = useCallback(async () => {
    try {
      setLoading(true);
      const menu = await adminService.getMenuTree();
      setSections(menu.sections);
      setSelectedSectionId((current) => current || menu.sections[0]?.id || '');
    } catch (e) {
      Alert.alert(t('common.error'), getApiErrorMessage(e, t));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadSections();
  }, [loadSections]);

  const pickAndUploadImage = async (fieldKey: string, onUploaded: (url: string) => void) => {
    try {
      const permission = await requestGalleryImagePermission();
      if (!permission.granted) {
        Alert.alert(t('common.error'), t('admin.photoPermissionRequired'));
        return;
      }
      const result = await launchSingleImageGalleryPicker();
      if (result.canceled || result.assets.length === 0) return;
      const asset = result.assets[0];
      setUploadingField(fieldKey);
      const uploaded = await adminService.uploadImage(
        asset.uri,
        asset.fileName ?? `menu-image-${Date.now()}.jpg`,
        asset.mimeType ?? 'image/jpeg',
      );
      onUploaded(uploaded.url);
    } catch (e) {
      Alert.alert(t('common.error'), getApiErrorMessage(e, t));
    } finally {
      setUploadingField(null);
    }
  };

  const previewItem = useMemo<Item>(
    () => ({
      id: editingItem?.id ?? 'draft-item',
      section_id: selectedSectionId,
      name_en: nameEn || t('admin.item'),
      name_ar: nameAr || nameEn || t('admin.item'),
      description_en: descriptionEn || null,
      description_ar: descriptionAr || null,
      image_url: imageUrl || null,
      sort_order: Number(sortOrder || 0),
      is_active: editingItem?.is_active ?? true,
      item_types: options.map((option, optionIndex) => ({
        id: option.id ?? draftId('type', optionIndex),
        item_id: editingItem?.id ?? 'draft-item',
        name_en: option.name_en || t('admin.type'),
        name_ar: option.name_ar || option.name_en || t('admin.type'),
        image_url: option.image_url || null,
        sort_order: Number(option.sort_order || 0),
        is_active: true,
        sizes: option.sizes.map((size, sizeIndex) => ({
          id: size.id ?? draftId(`size-${optionIndex}`, sizeIndex),
          type_id: option.id ?? draftId('type', optionIndex),
          name_en: size.name_en || t('admin.size'),
          name_ar: size.name_ar || size.name_en || t('admin.size'),
          image_url: size.image_url || null,
          price: String(Number(size.price || 0)),
          order_limit: parseOptionalLimit(size.order_limit),
          sort_order: Number(size.sort_order || 0),
          is_active: true,
          addons: size.addons.map((addon, addonIndex) => ({
            id: addon.id ?? draftId(`addon-${optionIndex}-${sizeIndex}`, addonIndex),
            size_id: size.id ?? draftId(`size-${optionIndex}`, sizeIndex),
            name_en: addon.name_en || t('admin.addon'),
            name_ar: addon.name_ar || addon.name_en || t('admin.addon'),
            image_url: addon.image_url || null,
            price: String(Number(addon.price || 0)),
            sort_order: Number(addon.sort_order || 0),
            is_active: true,
          })),
        })),
      })),
    }),
    [descriptionAr, descriptionEn, editingItem, imageUrl, nameAr, nameEn, options, selectedSectionId, sortOrder, t],
  );

  const validationMessages = useMemo(() => {
    const messages: string[] = [];
    if (!selectedSectionId) messages.push(t('admin.selectCategory'));
    if (!nameEn.trim() || !nameAr.trim()) messages.push(t('admin.missingTranslation'));
    if (!options.length || options.every((option) => option.sizes.length === 0)) messages.push(t('admin.productNeedsVariant'));
    options.forEach((option) => {
      if (!option.name_en.trim() || !option.name_ar.trim()) messages.push(t('admin.optionNeedsName'));
      option.sizes.forEach((size) => {
        if (!size.name_en.trim() || !size.name_ar.trim()) messages.push(t('admin.variantNeedsName'));
        if (!size.price.trim()) messages.push(t('admin.variantNeedsPrice'));
      });
    });
    return Array.from(new Set(messages));
  }, [nameAr, nameEn, options, selectedSectionId, t]);

  const canContinue = validationMessages.length === 0 || stepIndex < 2;
  const canSave = validationMessages.length === 0;

  const renderImageField = (fieldKey: string, value: string, onChange: (next: string) => void) => (
    <View style={styles.imageField}>
      <View style={[styles.imagePreviewRow, mirroredRow(isRTL)]}>
        <View style={styles.imageThumb}>
          {value ? (
            <Image source={{ uri: value }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={theme.iconSizes.md} color={theme.colors.textMuted} />
            </View>
          )}
        </View>
        <AppText variant="bodySmall" color={theme.colors.textSecondary}>
          {t('admin.photo')}
        </AppText>
      </View>
      <AppInput label={t('admin.imageUrl')} value={value} onChangeText={onChange} autoCapitalize="none" autoCorrect={false} />
      <AppButton
        title={t('admin.uploadPhoto')}
        variant="secondary"
        onPress={() => void pickAndUploadImage(fieldKey, onChange)}
        loading={uploadingField === fieldKey}
      />
    </View>
  );

  const updateOption = (optionIndex: number, patch: Partial<DraftOption>) => {
    setOptions((current) => current.map((option, index) => (index === optionIndex ? { ...option, ...patch } : option)));
  };

  const updateSize = (optionIndex: number, sizeIndex: number, patch: Partial<DraftSize>) => {
    setOptions((current) =>
      current.map((option, index) =>
        index === optionIndex
          ? {
              ...option,
              sizes: option.sizes.map((size, innerIndex) => (innerIndex === sizeIndex ? { ...size, ...patch } : size)),
            }
          : option,
      ),
    );
  };

  const updateAddon = (optionIndex: number, sizeIndex: number, addonIndex: number, patch: Partial<DraftAddon>) => {
    setOptions((current) =>
      current.map((option, index) =>
        index === optionIndex
          ? {
              ...option,
              sizes: option.sizes.map((size, innerIndex) =>
                innerIndex === sizeIndex
                  ? {
                      ...size,
                      addons: size.addons.map((addon, childIndex) => (childIndex === addonIndex ? { ...addon, ...patch } : addon)),
                    }
                  : size,
              ),
            }
          : option,
      ),
    );
  };

  const addOptionGroup = () => {
    setOptions((current) => [...current, initialDraftOption(t)]);
  };

  const addVariant = (optionIndex: number) => {
    setOptions((current) =>
      current.map((option, index) =>
        index === optionIndex
          ? {
              ...option,
              sizes: [
                ...option.sizes,
                {
                  name_en: '',
                  name_ar: '',
                  image_url: '',
                  price: '',
                  order_limit: '',
                  sort_order: String(option.sizes.length),
                  addons: [],
                },
              ],
            }
          : option,
      ),
    );
  };

  const addAddon = (optionIndex: number, sizeIndex: number) => {
    setOptions((current) =>
      current.map((option, index) =>
        index === optionIndex
          ? {
              ...option,
              sizes: option.sizes.map((size, innerIndex) =>
                innerIndex === sizeIndex
                  ? {
                      ...size,
                      addons: [
                        ...size.addons,
                        {
                          name_en: '',
                          name_ar: '',
                          image_url: '',
                          price: '',
                          sort_order: String(size.addons.length),
                        },
                      ],
                    }
                  : size,
              ),
            }
          : option,
      ),
    );
  };

  const openPreview = () => {
    navigation.navigate('AdminMenuCustomerPreview', { item: previewItem, initialLanguage: previewLanguage });
  };

  const chooseExistingSubgroup = (subgroup: ExistingSubgroup) => {
    setDescriptionEn(subgroup.name_en);
    setDescriptionAr(subgroup.name_ar);
  };

  const renderHierarchySummary = () => {
    const levels = [
      { key: 'category', label: t('admin.section'), value: selectedSection ? getLocalizedValue(selectedSection, language, 'name') : t('admin.selectCategory') },
      { key: 'subgroup', label: t('admin.subgroup'), value: getLocalizedValue({ name_en: descriptionEn, name_ar: descriptionAr }, language, 'name') || t('admin.noSubgroupSelected') },
      { key: 'product', label: t('admin.item'), value: getLocalizedValue({ name_en: nameEn, name_ar: nameAr }, language, 'name') || t('admin.newProduct') },
      { key: 'options', label: t('admin.type'), value: `${options.length}` },
      { key: 'variants', label: t('admin.size'), value: `${variantCount}` },
      { key: 'addons', label: t('admin.addon'), value: `${addonCount}` },
    ];

    return (
      <AppCard style={styles.hierarchyCard}>
        <AppText variant="h3">{t('admin.menuLevels')}</AppText>
        <View style={[styles.hierarchyWrap, mirroredRow(isRTL)]}>
          {levels.map((level) => (
            <View key={level.key} style={styles.hierarchyChip}>
              <AppText variant="caption" color={theme.colors.textSecondary} numberOfLines={1} align="center">
                {level.label}
              </AppText>
              <AppText variant="bodySmall" color={theme.colors.primary700} numberOfLines={2} align="center">
                {level.value}
              </AppText>
            </View>
          ))}
        </View>
      </AppCard>
    );
  };

  const saveProduct = async () => {
    if (!canSave) {
      Alert.alert(t('common.error'), validationMessages.join('\n'));
      return;
    }
    try {
      setSaving(true);
      let itemId = editingItem?.id ?? '';
      if (editingItem) {
        await adminService.updateMenuEntity('item', editingItem.id, {
          section_id: selectedSectionId,
          name_en: nameEn,
          name_ar: nameAr,
          description_en: descriptionEn || null,
          description_ar: descriptionAr || null,
          image_url: imageUrl || null,
          sort_order: Number(sortOrder || 0),
        });
      } else {
        const createdItem = await adminService.createItem({
          section_id: selectedSectionId,
          name_en: nameEn,
          name_ar: nameAr,
          description_en: descriptionEn || undefined,
          description_ar: descriptionAr || undefined,
          image_url: imageUrl || undefined,
          sort_order: Number(sortOrder || 0),
        });
        itemId = String((createdItem as { id: string }).id);
      }

      for (const option of options) {
        let typeId = option.id ?? '';
        if (isPersistedId(option.id)) {
          await adminService.updateMenuEntity('type', option.id!, {
            name_en: option.name_en,
            name_ar: option.name_ar,
            image_url: option.image_url || null,
            sort_order: Number(option.sort_order || 0),
          });
        } else {
          const createdType = await adminService.createType({
            item_id: itemId,
            name_en: option.name_en,
            name_ar: option.name_ar,
            image_url: option.image_url || undefined,
            sort_order: Number(option.sort_order || 0),
          });
          typeId = String((createdType as { id: string }).id);
        }

        for (const size of option.sizes) {
          let sizeId = size.id ?? '';
          if (isPersistedId(size.id)) {
            await adminService.updateMenuEntity('size', size.id!, {
              name_en: size.name_en,
              name_ar: size.name_ar,
              image_url: size.image_url || null,
              price: Number(size.price || 0),
              order_limit: parseOptionalLimit(size.order_limit),
              sort_order: Number(size.sort_order || 0),
            });
          } else {
            const createdSize = await adminService.createSize({
              type_id: typeId,
              name_en: size.name_en,
              name_ar: size.name_ar,
              image_url: size.image_url || undefined,
              price: Number(size.price || 0),
              order_limit: parseOptionalLimit(size.order_limit),
              sort_order: Number(size.sort_order || 0),
            });
            sizeId = String((createdSize as { id: string }).id);
          }

          for (const addon of size.addons) {
            if (isPersistedId(addon.id)) {
              await adminService.updateMenuEntity('addon', addon.id!, {
                name_en: addon.name_en,
                name_ar: addon.name_ar,
                image_url: addon.image_url || null,
                price: Number(addon.price || 0),
                sort_order: Number(addon.sort_order || 0),
              });
            } else if (addon.name_en.trim() && addon.name_ar.trim()) {
              await adminService.createAddon({
                size_id: sizeId,
                name_en: addon.name_en,
                name_ar: addon.name_ar,
                image_url: addon.image_url || undefined,
                price: Number(addon.price || 0),
                sort_order: Number(addon.sort_order || 0),
              });
            }
          }
        }
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert(t('common.error'), getApiErrorMessage(e, t));
    } finally {
      setSaving(false);
    }
  };

  const renderStepChips = () => (
    <View style={[styles.stepWrap, mirroredRow(isRTL)]}>
      {stepKeys.map((entry, index) => (
        <Pressable
          key={entry}
          style={[styles.stepChip, index === stepIndex ? styles.stepChipActive : null]}
          onPress={() => setStepIndex(index)}
          accessibilityRole="button"
          accessibilityState={{ selected: index === stepIndex }}>
          <AppText variant="caption" numberOfLines={2} align="center" color={index === stepIndex ? theme.colors.primary700 : theme.colors.textSecondary}>
            {t(`admin.productStep_${entry}`)}
          </AppText>
        </Pressable>
      ))}
    </View>
  );

  const renderPreviewLanguageToggle = () => (
    <View style={[styles.languageToggle, mirroredRow(isRTL)]}>
      {(['en', 'ar'] as const).map((entry) => (
        <Pressable
          key={entry}
          style={[styles.languageChip, previewLanguage === entry ? styles.languageChipActive : null]}
          onPress={() => setPreviewLanguage(entry)}
          accessibilityRole="button"
          accessibilityState={{ selected: previewLanguage === entry }}>
          <AppText variant="caption" align="center" color={previewLanguage === entry ? theme.colors.primary700 : theme.colors.textSecondary}>
            {entry.toUpperCase()}
          </AppText>
        </Pressable>
      ))}
    </View>
  );

  const renderCategoryStep = () => (
    <AdminPageSection title={t('admin.productStep_category')} subtitle={t('admin.selectCategory')}>
      <View style={styles.formStack}>
        <View style={[styles.selectorWrap, mirroredRow(isRTL)]}>
          {sections.map((section) => (
            <Pressable
              key={section.id}
              style={[styles.categoryChoice, selectedSectionId === section.id ? styles.categoryChoiceActive : null]}
              onPress={() => setSelectedSectionId(section.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedSectionId === section.id }}>
              <AppText variant="bodySmall" numberOfLines={2} align={isRTL ? 'right' : 'left'}>
                {getLocalizedValue(section, language, 'name')}
              </AppText>
            </Pressable>
          ))}
        </View>

        <View style={styles.structureBlock}>
          <AppText variant="h3">{t('admin.subgroupsInCategory')}</AppText>
          <AppText variant="bodySmall" color={theme.colors.textSecondary}>
            {t('admin.subgroupHelp')}
          </AppText>
          {existingSubgroups.length > 0 ? (
            <View style={[styles.selectorWrap, mirroredRow(isRTL)]}>
              {existingSubgroups.map((subgroup) => {
                const selected = descriptionEn === subgroup.name_en && descriptionAr === subgroup.name_ar;
                return (
                  <Pressable
                    key={subgroup.id}
                    style={[styles.categoryChoice, selected ? styles.categoryChoiceActive : null]}
                    onPress={() => chooseExistingSubgroup(subgroup)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}>
                    <AppText variant="bodySmall" numberOfLines={2} align={isRTL ? 'right' : 'left'}>
                      {getLocalizedValue(subgroup, language, 'name')}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              {t('admin.noSubgroupsInCategory')}
            </AppText>
          )}
          <AppButton title={t('admin.createNewSubgroup')} variant="ghost" onPress={() => {
            setDescriptionEn('');
            setDescriptionAr('');
            setStepIndex(1);
          }} />
        </View>
      </View>
    </AdminPageSection>
  );

  const renderDetailsStep = () => (
    <AdminPageSection title={t('admin.productStep_details')} subtitle={selectedSection ? getLocalizedValue(selectedSection, language, 'name') : t('admin.selectCategory')}>
      <View style={styles.formStack}>
        <BilingualFieldGroup
          labelEn={t('admin.nameEn')}
          labelAr={t('admin.nameAr')}
          valueEn={nameEn}
          valueAr={nameAr}
          onChangeEn={setNameEn}
          onChangeAr={setNameAr}
          helperText={!nameEn.trim() || !nameAr.trim() ? t('admin.missingTranslation') : undefined}
        />
        <BilingualFieldGroup
          labelEn={t('admin.subgroupEn')}
          labelAr={t('admin.subgroupAr')}
          valueEn={descriptionEn ?? ''}
          valueAr={descriptionAr ?? ''}
          onChangeEn={setDescriptionEn}
          onChangeAr={setDescriptionAr}
          helperText={t('admin.subgroupHelp')}
        />
        {renderImageField('productImage', imageUrl, setImageUrl)}
        <AppInput label={t('admin.sortOrder')} value={sortOrder} onChangeText={setSortOrder} keyboardType="number-pad" />
        <View style={styles.previewBlock}>
          <View style={[styles.previewHeader, mirroredRow(isRTL)]}>
            <AppText variant="h3">{t('admin.productPreview')}</AppText>
            {renderPreviewLanguageToggle()}
          </View>
          <AdminCustomerProductPreview item={previewItem} language={previewLanguage} />
        </View>
      </View>
    </AdminPageSection>
  );

  const renderVariantsStep = () => (
    <AdminPageSection title={t('admin.productStep_variants')} subtitle={t('admin.itemVisibilityHint')}>
      <View style={styles.formStack}>
        {options.map((option, optionIndex) => (
          <View key={option.id ?? `option-${optionIndex}`} style={styles.structureBlock}>
            <View style={[styles.levelHeader, mirroredRow(isRTL)]}>
              <View style={styles.levelIcon}>
                <AppText variant="caption" color={theme.colors.white} align="center">
                  {optionIndex + 1}
                </AppText>
              </View>
              <View style={styles.levelCopy}>
                <AppText variant="h3">{t('admin.optionGroup')}</AppText>
                <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                  {t('admin.optionGroupHelp')}
                </AppText>
              </View>
            </View>
            <BilingualFieldGroup
              labelEn={t('admin.optionNameEn')}
              labelAr={t('admin.optionNameAr')}
              valueEn={option.name_en}
              valueAr={option.name_ar}
              onChangeEn={(value) => updateOption(optionIndex, { name_en: value })}
              onChangeAr={(value) => updateOption(optionIndex, { name_ar: value })}
            />
            <AppInput
              label={t('admin.sortOrder')}
              value={option.sort_order}
              onChangeText={(value) => updateOption(optionIndex, { sort_order: value })}
              keyboardType="number-pad"
            />
            {option.sizes.map((size, sizeIndex) => (
              <View key={size.id ?? `size-${sizeIndex}`} style={styles.nestedBlock}>
                <View style={[styles.levelHeader, mirroredRow(isRTL)]}>
                  <View style={styles.levelIconSecondary}>
                    <AppText variant="caption" color={theme.colors.primary700} align="center">
                      {sizeIndex + 1}
                    </AppText>
                  </View>
                  <View style={styles.levelCopy}>
                    <AppText variant="bodySmall" color={theme.colors.primary700}>
                      {t('admin.variant')} {sizeIndex + 1}
                    </AppText>
                    <AppText variant="caption" color={theme.colors.textSecondary}>
                      {t('admin.variantLevelHelp')}
                    </AppText>
                  </View>
                </View>
                <BilingualFieldGroup
                  labelEn={t('admin.variantNameEn')}
                  labelAr={t('admin.variantNameAr')}
                  valueEn={size.name_en}
                  valueAr={size.name_ar}
                  onChangeEn={(value) => updateSize(optionIndex, sizeIndex, { name_en: value })}
                  onChangeAr={(value) => updateSize(optionIndex, sizeIndex, { name_ar: value })}
                />
                <View style={[styles.twoColumn, isCompact ? styles.twoColumnCompact : null]}>
                  <AppInput
                    label={t('admin.price')}
                    value={size.price}
                    onChangeText={(value) => updateSize(optionIndex, sizeIndex, { price: value })}
                    keyboardType="decimal-pad"
                    style={styles.flexInput}
                  />
                  <AppInput
                    label={t('admin.orderLimit')}
                    value={size.order_limit}
                    onChangeText={(value) => updateSize(optionIndex, sizeIndex, { order_limit: value })}
                    placeholder={t('admin.unlimited')}
                    keyboardType="number-pad"
                    style={styles.flexInput}
                  />
                </View>
              </View>
            ))}
            <AppButton title={t('admin.addVariant')} variant="secondary" onPress={() => addVariant(optionIndex)} />
          </View>
        ))}
        <AppButton title={t('admin.addOptionGroup')} variant="ghost" onPress={addOptionGroup} />
      </View>
    </AdminPageSection>
  );

  const renderAddonsStep = () => (
    <AdminPageSection title={t('admin.productStep_addons')} subtitle={t('admin.addonsOptional')}>
      <View style={styles.formStack}>
        {options.map((option, optionIndex) =>
          option.sizes.map((size, sizeIndex) => (
            <View key={`${optionIndex}-${sizeIndex}`} style={styles.structureBlock}>
              <View style={[styles.levelHeader, mirroredRow(isRTL)]}>
                <View style={styles.levelIcon}>
                  <Ionicons name="add-circle-outline" size={theme.iconSizes.sm} color={theme.colors.white} />
                </View>
                <View style={styles.levelCopy}>
                  <AppText variant="h3">
                    {option.name_en || t('admin.type')} / {size.name_en || t('admin.size')}
                  </AppText>
                  <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                    {t('admin.addonLevelHelp')}
                  </AppText>
                </View>
              </View>
              {size.addons.map((addon, addonIndex) => (
                <View key={addon.id ?? `addon-${addonIndex}`} style={styles.nestedBlock}>
                  <BilingualFieldGroup
                    labelEn={t('admin.addonNameEn')}
                    labelAr={t('admin.addonNameAr')}
                    valueEn={addon.name_en}
                    valueAr={addon.name_ar}
                    onChangeEn={(value) => updateAddon(optionIndex, sizeIndex, addonIndex, { name_en: value })}
                    onChangeAr={(value) => updateAddon(optionIndex, sizeIndex, addonIndex, { name_ar: value })}
                  />
                  <AppInput
                    label={t('admin.price')}
                    value={addon.price}
                    onChangeText={(value) => updateAddon(optionIndex, sizeIndex, addonIndex, { price: value })}
                    keyboardType="decimal-pad"
                  />
                </View>
              ))}
              <AppButton title={t('admin.addAddon')} variant="secondary" onPress={() => addAddon(optionIndex, sizeIndex)} />
            </View>
          )),
        )}
      </View>
    </AdminPageSection>
  );

  const renderReviewStep = () => (
    <AdminPageSection title={t('admin.productStep_review')} subtitle={t('admin.reviewBeforePublish')}>
      <View style={styles.formStack}>
        {validationMessages.length > 0 ? (
          <View style={styles.warningBox}>
            {validationMessages.map((message) => (
              <AppText key={message} variant="bodySmall" color={theme.colors.warning}>
                {message}
              </AppText>
            ))}
          </View>
        ) : (
          <View style={styles.successBox}>
            <AppText variant="bodySmall" color={theme.colors.success}>
              {t('admin.productIsVisible')}
            </AppText>
          </View>
        )}
        <View style={[styles.previewHeader, mirroredRow(isRTL)]}>
          <AppText variant="h3">{t('admin.productPreview')}</AppText>
          {renderPreviewLanguageToggle()}
        </View>
        <AdminCustomerProductPreview item={previewItem} language={previewLanguage} />
        <AppButton title={t('admin.previewAsCustomer')} variant="secondary" onPress={openPreview} />
      </View>
    </AdminPageSection>
  );

  const renderStep = () => {
    if (step === 'category') return renderCategoryStep();
    if (step === 'details') return renderDetailsStep();
    if (step === 'variants') return renderVariantsStep();
    if (step === 'addons') return renderAddonsStep();
    return renderReviewStep();
  };

  return (
    <View style={styles.page}>
      <TopAppBar title={editingItem ? t('admin.editProduct') : t('admin.addProduct')} onBack={() => navigation.goBack()} />
      <AppShell includeTopInset={false} refreshing={loading} onRefresh={loadSections} resetScrollKey={stepIndex}>
        {renderStepChips()}
        {renderHierarchySummary()}
        {renderStep()}
        <AppCard style={styles.footerCard}>
          <View style={[styles.footerActions, isCompact ? styles.footerActionsCompact : null]}>
            <AppButton
              title={t('common.cancel')}
              variant="ghost"
              fullWidth={false}
              style={styles.footerButton}
              onPress={() => navigation.goBack()}
            />
            {stepIndex > 0 ? (
              <AppButton
                title={t('common.back')}
                variant="secondary"
                fullWidth={false}
                style={styles.footerButton}
                onPress={() => setStepIndex((current) => Math.max(0, current - 1))}
              />
            ) : null}
            {stepIndex < stepKeys.length - 1 ? (
              <AppButton
                title={t('common.next')}
                fullWidth={false}
                style={styles.footerButton}
                onPress={() => setStepIndex((current) => Math.min(stepKeys.length - 1, current + 1))}
                disabled={!canContinue}
              />
            ) : (
              <AppButton
                title={editingItem ? t('admin.updateProduct') : t('admin.publishProduct')}
                fullWidth={false}
                style={styles.footerButton}
                onPress={() => void saveProduct()}
                disabled={!canSave}
                loading={saving}
              />
            )}
          </View>
        </AppCard>
      </AppShell>
    </View>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  stepWrap: {
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  stepChip: {
    flexBasis: '31%',
    minHeight: 42,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.sm,
    justifyContent: 'center',
  },
  stepChipActive: {
    borderColor: theme.colors.primary300,
    backgroundColor: theme.colors.primary50,
  },
  hierarchyCard: {
    gap: theme.spacing.md,
    padding: theme.spacing.md,
    borderColor: theme.colors.primary100,
  },
  hierarchyWrap: {
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  hierarchyChip: {
    flexBasis: '31%',
    minHeight: 58,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.secondaryCream,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    justifyContent: 'center',
    gap: theme.spacing.xs,
  },
  selectorWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  categoryChoice: {
    flexBasis: '48%',
    minHeight: 58,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    justifyContent: 'center',
  },
  categoryChoiceActive: {
    borderColor: theme.colors.primary500,
    backgroundColor: theme.colors.primary50,
  },
  formStack: {
    gap: theme.spacing.lg,
  },
  imageField: {
    gap: theme.spacing.sm,
  },
  imagePreviewRow: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  imageThumb: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    backgroundColor: theme.colors.sectionBackground,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBlock: {
    gap: theme.spacing.md,
  },
  previewHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  languageToggle: {
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: 2,
    gap: 2,
  },
  languageChip: {
    minWidth: 42,
    borderRadius: theme.radius.pill,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  languageChipActive: {
    backgroundColor: theme.colors.primary50,
  },
  structureBlock: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.secondaryCream,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  levelHeader: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  levelIcon: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelIconSecondary: {
    width: 30,
    height: 30,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.primary200,
    backgroundColor: theme.colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelCopy: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  nestedBlock: {
    borderWidth: 1,
    borderColor: theme.colors.primary100,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  twoColumn: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  twoColumnCompact: {
    flexDirection: 'column',
  },
  flexInput: {
    flex: 1,
  },
  warningBox: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.warning,
    backgroundColor: theme.colors.warningSurface,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  successBox: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.success,
    backgroundColor: theme.colors.successSurface,
    padding: theme.spacing.md,
  },
  footerCard: {
    padding: theme.spacing.md,
  },
  footerActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignItems: 'stretch',
  },
  footerActionsCompact: {
    flexWrap: 'wrap',
  },
  footerButton: {
    flex: 1,
    minHeight: 46,
  },
});
