"use client";

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
import { useLoyaltyRules } from '@/hooks/use-admin-data';
import { adminApi } from '@/services/admin-api';
import { LoyaltyRule } from '@/types/promotion';

export default function LoyaltyRulesPage() {
  const { data, error, isLoading, mutate } = useLoyaltyRules();
  const [editing, setEditing] = useState<LoyaltyRule | null>(null);
  const [form, setForm] = useState({
    required_orders: '5',
    reward_type: 'FREE_ITEM',
    reward_value: 'Free dessert',
    is_active: true,
  });

  const resetForm = () => {
    setEditing(null);
    setForm({
      required_orders: '5',
      reward_type: 'FREE_ITEM',
      reward_value: 'Free dessert',
      is_active: true,
    });
  };

  const submitForm = async () => {
    try {
      if (editing) {
        await adminApi.updateLoyaltyRule(editing.id, {
          required_orders: Number(form.required_orders),
          reward_type: form.reward_type,
          reward_value: form.reward_value,
          is_active: form.is_active,
        });
        toast.success('Loyalty rule updated');
      } else {
        await adminApi.createLoyaltyRule({
          required_orders: Number(form.required_orders),
          reward_type: form.reward_type,
          reward_value: form.reward_value,
          is_active: form.is_active,
        });
        toast.success('Loyalty rule created');
      }
      resetForm();
      await mutate();
    } catch {
      toast.error('Failed to save loyalty rule');
    }
  };

  const startEdit = (rule: LoyaltyRule) => {
    setEditing(rule);
    setForm({
      required_orders: String(rule.required_orders),
      reward_type: rule.reward_type,
      reward_value: rule.reward_value,
      is_active: rule.is_active,
    });
  };

  const toggleRule = async (id: string) => {
    try {
      await adminApi.toggleLoyaltyRule(id);
      toast.success('Rule status updated');
      await mutate();
    } catch {
      toast.error('Failed to toggle rule');
    }
  };

  if (isLoading) {
    return <LoadingState rows={4} />;
  }

  if (error) {
    return <EmptyState title="Loyalty unavailable" description="Failed to fetch /admin/loyalty-rules" />;
  }

  const rules = data?.rules ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Loyalty Rules" description="Configure required order count and reward logic with clear active status." />

      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <SectionCard title="Configured Rules">
          {rules.length === 0 ? (
            <EmptyState title="No loyalty rules" description="Create your first loyalty reward rule." />
          ) : (
            <DataTable<LoyaltyRule>
              rows={rules}
              columns={[
                { key: 'required_orders', label: 'Orders', render: (row) => <span>{row.required_orders}</span> },
                { key: 'reward_type', label: 'Reward Type', render: (row) => <span>{row.reward_type}</span> },
                { key: 'reward_value', label: 'Reward', render: (row) => <span>{row.reward_value}</span> },
                { key: 'status', label: 'Status', render: (row) => <StatusBadge active={row.is_active} /> },
                {
                  key: 'action',
                  label: 'Action',
                  render: (row) => (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => startEdit(row)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toggleRule(row.id)}>
                        Toggle
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          )}
        </SectionCard>

        <SectionCard title={editing ? 'Edit Rule' : 'Create Rule'}>
          <div className="space-y-3">
            <FormSection title="Required orders">
              <Input
                type="number"
                value={form.required_orders}
                onChange={(event) => setForm((prev) => ({ ...prev, required_orders: event.target.value }))}
              />
            </FormSection>
            <FormSection title="Reward type">
              <Select
                value={form.reward_type}
                onValueChange={(value) => {
                  if (value) {
                    setForm((prev) => ({ ...prev, reward_type: value }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reward type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FREE_ITEM">FREE_ITEM</SelectItem>
                  <SelectItem value="DISCOUNT">DISCOUNT</SelectItem>
                </SelectContent>
              </Select>
            </FormSection>
            <FormSection title="Reward value/description">
              <Input
                value={form.reward_value}
                onChange={(event) => setForm((prev) => ({ ...prev, reward_value: event.target.value }))}
              />
            </FormSection>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={submitForm}>
                {editing ? 'Save Rule' : 'Create Rule'}
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
