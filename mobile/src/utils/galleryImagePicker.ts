import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export const requestGalleryImagePermission = () =>
  Platform.OS === 'android'
    ? Promise.resolve({ granted: true })
    : ImagePicker.requestMediaLibraryPermissionsAsync(false);

export const launchSingleImageGalleryPicker = () =>
  ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.8,
    selectionLimit: 1,
    defaultTab: 'photos',
    legacy: false,
  });
