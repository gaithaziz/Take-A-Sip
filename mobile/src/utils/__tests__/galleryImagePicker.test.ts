import * as ImagePicker from 'expo-image-picker';

import { launchSingleImageGalleryPicker, requestGalleryImagePermission } from '@/utils/galleryImagePicker';

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(),
}));

describe('galleryImagePicker', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('requests read access to the gallery', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });

    await requestGalleryImagePermission();

    expect(ImagePicker.requestMediaLibraryPermissionsAsync).toHaveBeenCalledWith(false);
  });

  it('opens the image gallery instead of the Android legacy file picker', async () => {
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: true, assets: null });

    await launchSingleImageGalleryPicker();

    expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      selectionLimit: 1,
      defaultTab: 'photos',
      legacy: false,
    });
  });
});
