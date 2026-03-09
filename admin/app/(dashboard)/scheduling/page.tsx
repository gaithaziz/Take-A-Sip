"use client";

import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { EmptyState } from '@/components/admin/empty-state';
import { FormSection } from '@/components/admin/form-section';
import { LoadingState } from '@/components/admin/loading-state';
import { PageHeader } from '@/components/admin/page-header';
import { SectionCard } from '@/components/admin/section-card';
import { StatusBadge } from '@/components/admin/status-badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMenu, useSchedules } from '@/hooks/use-admin-data';
import { adminApi } from '@/services/admin-api';
import { ScheduleMenuRequest, UUID } from '@/types/menu';

const weekdays = [
  { label: 'Mon', value: 0 },
  { label: 'Tue', value: 1 },
  { label: 'Wed', value: 2 },
  { label: 'Thu', value: 3 },
  { label: 'Fri', value: 4 },
  { label: 'Sat', value: 5 },
  { label: 'Sun', value: 6 },
] as const;

export default function SchedulingPage() {
  const { data, error, isLoading } = useMenu();
  const schedulesQuery = useSchedules();
  const [form, setForm] = useState<ScheduleMenuRequest>({
    entity_type: 'section',
    entity_id: '',
    start_time: '07:00',
    end_time: '11:00',
    days_of_week: [0, 1, 2, 3, 4, 5, 6],
  });

  const entities = useMemo(() => {
    const sectionRows = (data?.sections ?? []).flatMap((section) => {
      const base = [{ id: section.id, type: 'section' as const, label: `Section: ${section.name_en}` }];
      const items = section.items.flatMap((item) => {
        const itemRow = { id: item.id, type: 'item' as const, label: `Item: ${item.name_en}` };
        const types = item.item_types.flatMap((type) => {
          const typeRow = { id: type.id, type: 'type' as const, label: `Type: ${type.name_en}` };
          const sizes = type.sizes.flatMap((size) => {
            const sizeRow = { id: size.id, type: 'size' as const, label: `Size: ${size.name_en}` };
            const addons = size.addons.map((addon) => ({
              id: addon.id,
              type: 'addon' as const,
              label: `Add-on: ${addon.name_en}`,
            }));
            return [sizeRow, ...addons];
          });
          return [typeRow, ...sizes];
        });
        return [itemRow, ...types];
      });
      return [...base, ...items];
    });
    return sectionRows;
  }, [data]);

  const entityLabel = useMemo(() => {
    const map = new Map<string, string>();
    entities.forEach((entity) => map.set(entity.id, entity.label));
    return map;
  }, [entities]);

  const refreshSchedules = async () => {
    await schedulesQuery.mutate();
  };

  const handleSubmit = async () => {
    if (!form.entity_id) {
      toast.error('Select menu entry first');
      return;
    }

    try {
      await adminApi.scheduleMenu(form);
      toast.success('Schedule created');
      await refreshSchedules();
    } catch {
      toast.error('Failed to create schedule');
    }
  };

  const handleToggle = async (scheduleId: UUID, isActive: boolean) => {
    try {
      await adminApi.updateSchedule(scheduleId, { is_active: !isActive });
      toast.success('Schedule updated');
      await refreshSchedules();
    } catch {
      toast.error('Failed to update schedule');
    }
  };

  const handleDelete = async (scheduleId: UUID) => {
    try {
      await adminApi.deleteSchedule(scheduleId);
      toast.success('Schedule deleted');
      await refreshSchedules();
    } catch {
      toast.error('Failed to delete schedule');
    }
  };

  if (isLoading || schedulesQuery.isLoading) {
    return <LoadingState rows={4} />;
  }

  if (error || schedulesQuery.error) {
    return <EmptyState title="Scheduling unavailable" description="Cannot load scheduling data from backend." />;
  }

  const schedules = schedulesQuery.data?.schedules ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scheduling"
        description="Define start/end time windows and enable/disable schedule records per menu entity."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Create Schedule" description="Choose one entity, then set time window and active weekdays.">
          <div className="space-y-4">
            <FormSection title="Target entity">
              <Select
                value={form.entity_id ? `${form.entity_type}:${form.entity_id}` : ''}
                onValueChange={(value) => {
                  if (!value) {
                    return;
                  }
                  const [entity_type, entity_id] = value.split(':');
                  setForm((prev) => ({ ...prev, entity_type: entity_type as ScheduleMenuRequest['entity_type'], entity_id }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select entity" />
                </SelectTrigger>
                <SelectContent>
                  {entities.map((entity) => (
                    <SelectItem key={`${entity.type}:${entity.id}`} value={`${entity.type}:${entity.id}`}>
                      {entity.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormSection>

            <FormSection title="Time window">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Start</Label>
                  <Input
                    type="time"
                    value={form.start_time}
                    onChange={(event) => setForm((prev) => ({ ...prev, start_time: event.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>End</Label>
                  <Input
                    type="time"
                    value={form.end_time}
                    onChange={(event) => setForm((prev) => ({ ...prev, end_time: event.target.value }))}
                  />
                </div>
              </div>
            </FormSection>

            <FormSection title="Days of week">
              <div className="grid grid-cols-4 gap-2">
                {weekdays.map((day) => {
                  const checked = form.days_of_week.includes(day.value);
                  return (
                    <label key={day.value} className="flex items-center gap-2 rounded-md border border-zinc-200 p-2 text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => {
                          const next = value
                            ? [...form.days_of_week, day.value]
                            : form.days_of_week.filter((d) => d !== day.value);
                          setForm((prev) => ({ ...prev, days_of_week: next.sort((a, b) => a - b) }));
                        }}
                      />
                      {day.label}
                    </label>
                  );
                })}
              </div>
            </FormSection>

            <Button onClick={handleSubmit} className="w-full">
              Create Schedule
            </Button>
          </div>
        </SectionCard>

        <SectionCard title="Existing schedules" description="You can disable or delete existing rules directly.">
          {schedules.length === 0 ? (
            <EmptyState title="No schedules" description="Create your first schedule from the left panel." />
          ) : (
            <div className="space-y-3">
              {schedules.map((schedule) => (
                <div key={schedule.id} className="rounded-md border border-zinc-200 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">
                      {entityLabel.get(schedule.entity_id) ?? `${schedule.entity_type}: ${schedule.entity_id}`}
                    </p>
                    <StatusBadge active={schedule.is_active} activeLabel="Enabled" inactiveLabel="Disabled" />
                  </div>
                  <p className="text-xs text-zinc-600">
                    {schedule.start_time} - {schedule.end_time}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">Days: {schedule.days_of_week.join(', ')}</p>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleToggle(schedule.id, schedule.is_active)}>
                      {schedule.is_active ? 'Disable' : 'Enable'}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(schedule.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
