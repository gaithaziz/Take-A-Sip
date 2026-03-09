"use client";

import useSWR from 'swr';

import { adminApi } from '@/services/admin-api';

export function useMenu() {
  return useSWR('menu', adminApi.getMenu);
}

export function usePromotions() {
  return useSWR('promotions', adminApi.getPromotions);
}

export function useSchedules() {
  return useSWR('schedules', adminApi.getSchedules);
}

export function useLoyaltyRules() {
  return useSWR('loyalty-rules', adminApi.getLoyaltyRules);
}

export function useUsers(search: string, banned: boolean | null) {
  const key = ['users', search, banned] as const;
  return useSWR(key, () =>
    adminApi.getUsers({
      search: search || undefined,
      banned: banned === null ? undefined : banned,
    }),
  );
}

