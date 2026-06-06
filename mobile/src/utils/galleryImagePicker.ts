import * as ImagePicker from 'expo-image-picker';

export const requestGalleryImagePermission = () => ImagePicker.requestMediaLibraryPermissionsAsync(false);

export const launchSingleImageGalleryPicker = () =>
  ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.8,
    selectionLimit: 1,
    defaultTab: 'photos',
    legacy: false,
  });
