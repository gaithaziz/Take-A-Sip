import { Item } from '@/types/api';

export type HomeMenuGroup = {
  id: string;
  title: string | null;
  data: Item[];
};

export type HomeMenuSection = {
  id: string;
  title: string;
  imageUrl: string | null;
  data: Item[];
  groups: HomeMenuGroup[];
};
