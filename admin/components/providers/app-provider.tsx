"use client";

import { SWRConfig } from 'swr';

import { LocaleProvider } from '@/components/providers/locale-provider';
import { Toaster } from '@/components/ui/sonner';

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <SWRConfig
        value={{
          shouldRetryOnError: false,
          revalidateOnFocus: false,
        }}
      >
        {children}
        <Toaster richColors position="top-right" />
      </SWRConfig>
    </LocaleProvider>
  );
}

