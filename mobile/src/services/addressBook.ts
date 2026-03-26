import AsyncStorage from '@react-native-async-storage/async-storage';

export type SavedAddress = {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
  created_at: string;
};

const storageKey = (userId: string) => `take_a_sip_saved_addresses:${userId}`;

const parseAddresses = (rawValue: string | null): SavedAddress[] => {
  if (!rawValue) {
    return [];
  }
  try {
    const parsed = JSON.parse(rawValue) as SavedAddress[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const addressBook = {
  async list(userId: string): Promise<SavedAddress[]> {
    const rawValue = await AsyncStorage.getItem(storageKey(userId));
    return parseAddresses(rawValue);
  },

  async save(
    userId: string,
    input: {
      label: string;
      address: string;
      lat: number;
      lng: number;
    },
  ): Promise<SavedAddress[]> {
    const current = await this.list(userId);
    const normalizedAddress = input.address.trim();
    const existing = current.find(
      (entry) =>
        entry.address.trim().toLowerCase() === normalizedAddress.toLowerCase() &&
        entry.lat === input.lat &&
        entry.lng === input.lng,
    );
    const nextEntry: SavedAddress = existing ?? {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      label: input.label.trim() || normalizedAddress,
      address: normalizedAddress,
      lat: input.lat,
      lng: input.lng,
      created_at: new Date().toISOString(),
    };
    const next = existing
      ? current.map((entry) =>
          entry.id === existing.id ? { ...entry, label: input.label.trim() || normalizedAddress, address: normalizedAddress, lat: input.lat, lng: input.lng } : entry,
        )
      : [nextEntry, ...current].slice(0, 10);
    await AsyncStorage.setItem(storageKey(userId), JSON.stringify(next));
    return next;
  },

  async remove(userId: string, addressId: string): Promise<SavedAddress[]> {
    const current = await this.list(userId);
    const next = current.filter((entry) => entry.id !== addressId);
    await AsyncStorage.setItem(storageKey(userId), JSON.stringify(next));
    return next;
  },
};
