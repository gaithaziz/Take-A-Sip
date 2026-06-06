import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert, Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { AppShell } from '@/components/AppShell';
import { AppText } from '@/components/AppText';
import { TopAppBar } from '@/components/TopAppBar';
import { AdminPageSection } from '@/components/admin/AdminPageSection';
import { BilingualFieldGroup } from '@/components/admin/BilingualFieldGroup';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { RootStackParamList } from '@/navigation/types';
import { adminService } from '@/services/adminService';
import { useLanguage } from '@/state/LanguageContext';
import { theme } from '@/theme';
import { getApiErrorMessage } from '@/utils/errors';
import { launchSingleImageGalleryPicker, requestGalleryImagePermission } from '@/utils/galleryImagePicker';
import { mirroredRow } from '@/utils/layout';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminMenuCategoryEditor'>;

export const AdminMenuCategoryEditorScreen = ({ route, navigation }: Props) => {
  const section = route.params?.section;
  const { t } = useAppTranslation();
  const { isRTL } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [nameEn, setNameEn] = useState(section?.name_en ?? '');
  const [nameAr, setNameAr] = useState(section?.name_ar ?? '');
  const [imageUrl, setImageUrl] = useState(section?.image_url ?? '');
  const [sortOrder, setSortOrder] = useState(String(section?.sort_order ?? 0));

  const pickAndUploadImage = async () => {
    try {
      const permission = await requestGalleryImagePermission();
      if (!permission.granted) {
        Alert.alert(t('common.error'), t('admin.photoPermissionRequired'));
        return;
      }
      const result = await launchSingleImageGalleryPicker();
      if (result.canceled || result.assets.length === 0) return;
      const asset = result.assets[0];
      setUploading(true);
      const uploaded = await adminService.uploadImage(
        asset.uri,
        asset.fileName ?? `menu-category-${Date.now()}.jpg`,
        asset.mimeType ?? 'image/jpeg',
      );
      setImageUrl(uploaded.url);
    } catch (e) {
      Alert.alert(t('common.error'), getApiErrorMessage(e, t));
    } finally {
      setUploading(false);
    }
  };

  const saveCategory = async () => {
    if (!nameEn.trim() || !nameAr.trim()) {
      Alert.alert(t('common.error'), t('admin.missingTranslation'));
      return;
    }
    try {
      setSaving(true);
      if (section) {
        await adminService.updateMenuEntity('section', section.id, {
          name_en: nameEn,
          name_ar: nameAr,
          image_url: imageUrl || null,
          sort_order: Number(sortOrder || 0),
        });
      } else {
        await adminService.createSection({
          name_en: nameEn,
          name_ar: nameAr,
          image_url: imageUrl || undefined,
          sort_order: Number(sortOrder || 0),
        });
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert(t('common.error'), getApiErrorMessage(e, t));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.page}>
      <TopAppBar title={section ? t('admin.editCategory') : t('admin.addCategory')} onBack={() => navigation.goBack()} />
      <AppShell includeTopInset={false}>
        <AdminPageSection title={t('admin.categoryDetails')} subtitle={t('admin.categoryDetailsHelp')}>
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
            <View style={styles.imageField}>
              <View style={[styles.imagePreviewRow, mirroredRow(isRTL)]}>
                <View style={styles.imageThumb}>
                  {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
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
              <AppInput label={t('admin.imageUrl')} value={imageUrl} onChangeText={setImageUrl} autoCapitalize="none" autoCorrect={false} />
              <AppButton title={t('admin.uploadPhoto')} variant="secondary" onPress={() => void pickAndUploadImage()} loading={uploading} />
            </View>
            <AppInput label={t('admin.sortOrder')} value={sortOrder} onChangeText={setSortOrder} keyboardType="number-pad" />
            <AppButton
              title={section ? t('admin.saveCategory') : t('admin.addCategory')}
              onPress={() => void saveCategory()}
              loading={saving}
              disabled={!nameEn.trim() || !nameAr.trim()}
            />
          </View>
        </AdminPageSection>
      </AppShell>
    </View>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
    width: 64,
    height: 64,
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
});
