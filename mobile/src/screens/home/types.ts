import { Item } from '@/types/api';

export type HomeMenuSection = {
  id: string;
  title: string;
  imageUrl: string | null;
  data: Item[];
};
