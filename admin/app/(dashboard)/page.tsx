"use client";

import { MenuSquare, Percent, Users, CalendarClock } from 'lucide-react';

import { EmptyState } from '@/components/admin/empty-state';
import { LoadingState } from '@/components/admin/loading-state';
import { PageHeader } from '@/components/admin/page-header';
import { SectionCard } from '@/components/admin/section-card';
import { useMenu, usePromotions, useUsers } from '@/hooks/use-admin-data';

export default function DashboardPage() {
  const menu = useMenu();
  const promotions = usePromotions();
  const users = useUsers('', null);

  if (menu.isLoading || promotions.isLoading || users.isLoading) {
    return <LoadingState rows={4} />;
  }

  if (menu.error || promotions.error || users.error) {
    return <EmptyState title="Dashboard unavailable" description="Failed to load operational data from the backend." />;
  }

  const sections = menu.data?.sections ?? [];
  const itemsCount = sections.reduce((acc, section) => acc + section.items.length, 0);

  const stats = [
    { label: 'Sections', value: sections.length, icon: MenuSquare },
    { label: 'Menu Items', value: itemsCount, icon: MenuSquare },
    {
      label: 'Active Promotions',
      value: promotions.data?.promotions.filter((promotion) => promotion.is_active).length ?? 0,
      icon: Percent,
    },
    { label: 'Registered Users', value: users.data?.users.length ?? 0, icon: Users },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Quick overview of menu, promotions, schedules, and user moderation signals."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <SectionCard key={stat.label} title={stat.label}>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-semibold text-zinc-900">{stat.value}</p>
              <stat.icon className="h-6 w-6 text-[#6b4b3e]" />
            </div>
          </SectionCard>
        ))}
      </div>
      <SectionCard title="Owner Workflow" description="Use the sidebar to edit hierarchy, configure schedules, and moderate users.">
        <div className="grid gap-3 text-sm text-zinc-700 md:grid-cols-2">
          <p className="rounded-md bg-[#faf7f1] p-3">1. Update menu hierarchy in Menu Editor</p>
          <p className="rounded-md bg-[#faf7f1] p-3">2. Add time windows in Scheduling</p>
          <p className="rounded-md bg-[#faf7f1] p-3">3. Review live offers in Promotions</p>
          <p className="rounded-md bg-[#faf7f1] p-3">4. Search and moderate users in Users</p>
        </div>
      </SectionCard>
      <SectionCard title="Scheduling note" description="Current backend supports schedule creation but does not provide schedule listing endpoint.">
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <CalendarClock className="h-4 w-4" />
          Schedule visibility is partial until listing endpoints are added.
        </div>
      </SectionCard>
    </div>
  );
}

