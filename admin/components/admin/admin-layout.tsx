"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutGrid, MenuSquare, Percent, Gift, CalendarClock, Users, Languages, LogOut } from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { clearAuthToken, getAuthToken } from '@/lib/auth';
import { navItems } from '@/lib/constants/nav';
import { useLocale } from '@/components/providers/locale-provider';
import { cn } from '@/lib/utils';

const iconMap = {
  dashboard: LayoutGrid,
  menuEditor: MenuSquare,
  promotions: Percent,
  loyaltyRules: Gift,
  scheduling: CalendarClock,
  users: Users,
} as const;

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { locale, setLocale, dir } = useLocale();

  useEffect(() => {
    if (!getAuthToken() && pathname !== '/login') {
      router.replace('/login');
    }
  }, [pathname, router]);

  const handleLogout = () => {
    clearAuthToken();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-[#f8f6f2] text-zinc-900" dir={dir}>
      <div className="mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 lg:grid-cols-[250px_1fr]">
        <aside className="border-r border-[#e7ded3] bg-[#f3ece3] px-4 py-6">
          <div className="mb-6 px-2">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-zinc-500">Take A Sip</p>
            <h2 className="mt-1 text-lg font-semibold">Admin Console</h2>
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = iconMap[item.key];
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-[#4b2e1f] text-[#fffaf5]'
                      : 'text-zinc-700 hover:bg-[#e7ded3] hover:text-zinc-900',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {locale === 'ar' ? item.labelAr : item.labelEn}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-h-screen flex-col">
          <header className="flex h-16 items-center justify-between border-b border-[#e7ded3] bg-white px-6">
            <p className="text-sm text-zinc-600">Coffee Shop Operations</p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
                className="gap-1"
              >
                <Languages className="h-4 w-4" />
                {locale === 'en' ? 'AR' : 'EN'}
              </Button>
              <Button variant="outline" size="sm" className="gap-1" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </header>
          <Separator />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}

