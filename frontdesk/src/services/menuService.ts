import { MenuResponse } from '@/types/api';

import { http } from './http';

export const menuService = {
  async getMenu(): Promise<MenuResponse> {
    const { data } = await http.get<MenuResponse>('/menu');
    return data;
  },
};
