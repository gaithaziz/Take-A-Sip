"use client";

import { CalendarDays } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { DataTable } from '@/components/admin/data-table';
import { EmptyState } from '@/components/admin/empty-state';
import { FormSection } from '@/components/admin/form-section';
import { LoadingState } from '@/components/admin/loading-state';
import { PageHeader } from '@/components/admin/page-header';
import { SectionCard } from '@/components/admin/section-card';
import { StatusBadge } from '@/components/admin/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePromotions } from '@/hooks/use-admin-data';
import { adminApi } from '@/services/admin-api';
import { Promotion } from '@/types/promotion';

export default function PromotionsPage() {
  const { data, error, isLoading, mutate } = usePromotions();
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [form, setForm] = useState({
    title_en: '',
    title_ar: '',
    type: 'TEMPORARY',
    value: '0',
    starts_at: '',
    ends_at: '',
    is_active: true,
  });

  const resetForm = () => {
    setEditing(null);
    setForm({
      title_en: '',
      title_ar: '',
      type: 'TEMPORARY',
      value: '0',
      starts_at: '',
      ends_at: '',
      is_active: true,
    });
  };

  const submitForm = async () => {
    try {
      if (editing) {
        await adminApi.updatePromotion(editing.id, {
          title_en: form.title_en,
          title_ar: form.title_ar,
          type: form.type,
          value: Number(form.value),
          starts_at: new Date(form.starts_at).toISOString(),
          ends_at: new Date(form.ends_at).toISOString(),
          is_active: form.is_active,
        });
        toast.success('Promotion updated');
      } else {
        await adminApi.createPromotion({
          title_en: form.title_en,
          title_ar: form.title_ar,
          type: form.type,
          value: Number(form.value),
          starts_at: new Date(form.starts_at).toISOString(),
          ends_at: new Date(form.ends_at).toISOString(),
          is_active: form.is_active,
        });
        toast.success('Promotion created');
      }
      resetForm();
      await mutate();
    } catch {
      toast.error('Failed to save promotion');
    }
  };

  const startEdit = (promotion: Promotion) => {
    setEditing(promotion);
    setForm({
      title_en: promotion.title_en,
      title_ar: promotion.title_ar,
      type: promotion.type,
      value: String(promotion.value),
      starts_at: promotion.starts_at.slice(0, 16),
      ends_at: promotion.ends_at.slice(0, 16),
      is_active: promotion.is_active,
    });
  };

  const togglePromotion = async (id: string) => {
    try {
      await adminApi.togglePromotion(id);
      toast.success('Promotion status updated');
      await mutate();
    } catch {
      toast.error('Failed to toggle promotion');
    }
  };

  if (isLoading) {
    return <LoadingState rows={4} />;
  }

  if (error) {
    return <EmptyState title="Promotions unavailable" description="Failed to fetch /admin/promotions" />;
  }

  const promotions = data?.promotions ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Promotions" description="Create, edit, and toggle mobile ribbon offers with bilingual text." />

      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <SectionCard title="Promotion List" description="Scan title, status, date range, and type/value quickly.">
          {promotions.length === 0 ? (
            <EmptyState title="No promotions" description="Create your first promotion using the right panel." />
          ) : (
            <DataTable<Promotion>
              rows={promotions}
              columns={[
                {
                  key: 'title',
                  label: 'Title',
                  render: (row) => (
                    <div>
                      <p className="font-medium">{row.title_en}</p>
                      <p className="text-xs text-zinc-500">{row.title_ar}</p>
                    </div>
                  ),
                },
                {
                  key: 'status',
                  label: 'Status',
                  render: (row) => <StatusBadge active={row.is_active} />,
                },
                {
                  key: 'range',
                  label: 'Date Range',
                  render: (row) => (
                    <div className="text-sm text-zinc-700">
                      <div className="flex items-center gap-1">
                        <CalendarDays className="h-4 w-4 text-zinc-500" />
                        {new Date(row.starts_at).toLocaleDateString()}
                      </div>
                      <p className="text-xs text-zinc-500">to {new Date(row.ends_at).toLocaleDateString()}</p>
                    </div>
                  ),
                },
                {
                  key: 'type',
                  label: 'Type / Value',
                  render: (row) => (
                    <span className="text-sm">
                      {row.type} ({row.value})
                    </span>
                  ),
                },
                {
                  key: 'action',
                  label: 'Action',
                  render: (row) => (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => startEdit(row)}>
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => togglePromotion(row.id)}>
                        Toggle
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          )}
        </SectionCard>

        <SectionCard title={editing ? 'Edit Promotion' : 'Create Promotion'}>
          <div className="space-y-3">
            <FormSection title="Bilingual title">
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="title_en"
                  value={form.title_en}
                  onChange={(event) => setForm((prev) => ({ ...prev, title_en: event.target.value }))}
                />
                <Input
                  placeholder="title_ar"
                  value={form.title_ar}
                  onChange={(event) => setForm((prev) => ({ ...prev, title_ar: event.target.value }))}
                />
              </div>
            </FormSection>
            <FormSection title="Type and value">
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={form.type}
                  onValueChange={(value) => {
                    if (value) {
                      setForm((prev) => ({ ...prev, type: value }));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIRST_TIME">FIRST_TIME</SelectItem>
                    <SelectItem value="LOYALTY">LOYALTY</SelectItem>
                    <SelectItem value="TEMPORARY">TEMPORARY</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="value"
                  value={form.value}
                  onChange={(event) => setForm((prev) => ({ ...prev, value: event.target.value }))}
                />
              </div>
            </FormSection>
            <FormSection title="Date range">
              <div className="grid grid-cols-1 gap-2">
                <Input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(event) => setForm((prev) => ({ ...prev, starts_at: event.target.value }))}
                />
                <Input
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={(event) => setForm((prev) => ({ ...prev, ends_at: event.target.value }))}
                />
              </div>
            </FormSection>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={submitForm}>
                {editing ? 'Save Changes' : 'Create Promotion'}
              </Button>
              {editing ? (
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
