"use client";

import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { DataTable } from '@/components/admin/data-table';
import { EmptyState } from '@/components/admin/empty-state';
import { FilterBar } from '@/components/admin/filter-bar';
import { LoadingState } from '@/components/admin/loading-state';
import { PageHeader } from '@/components/admin/page-header';
import { SearchBar } from '@/components/admin/search-bar';
import { SectionCard } from '@/components/admin/section-card';
import { StatusBadge } from '@/components/admin/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUsers } from '@/hooks/use-admin-data';
import { adminApi } from '@/services/admin-api';
import { User } from '@/types/user';

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [reason, setReason] = useState('');
  const [pendingUser, setPendingUser] = useState<User | null>(null);

  const bannedFlag = filter === 'all' ? null : filter === 'banned';
  const { data, error, isLoading, mutate } = useUsers(search, bannedFlag);

  const users = useMemo(() => data?.users ?? [], [data]);

  const confirmModeration = async () => {
    if (!pendingUser) {
      return;
    }

    try {
      if (pendingUser.is_banned) {
        await adminApi.unbanUser(pendingUser.id);
        toast.success('User unbanned');
      } else {
        await adminApi.banUser(pendingUser.id, { reason: reason || undefined });
        toast.success('User banned');
      }
      setPendingUser(null);
      setReason('');
      await mutate();
    } catch {
      toast.error('Moderation request failed');
    }
  };

  if (isLoading) {
    return <LoadingState rows={5} />;
  }

  if (error) {
    return <EmptyState title="Users unavailable" description="Failed to load /admin/users" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Search users, filter banned users, and apply safe moderation actions."
      />

      <SectionCard title="User Management" description="Banned users cannot place new orders or login.">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <SearchBar value={search} onChange={setSearch} placeholder="Search by name or phone" />
          <FilterBar value={filter} onChange={setFilter} />
        </div>
        {users.length === 0 ? (
          <EmptyState title="No users found" description="Try a different search keyword or filter." />
        ) : (
          <DataTable<User>
            rows={users}
            columns={[
              {
                key: 'name',
                label: 'User',
                render: (row) => (
                  <div>
                    <p className="font-medium">{row.first_name} {row.last_name}</p>
                    <p className="text-xs text-zinc-500">{row.phone_number}</p>
                  </div>
                ),
              },
              {
                key: 'status',
                label: 'Status',
                render: (row) => <StatusBadge active={!row.is_banned} activeLabel="Allowed" inactiveLabel="Banned" />,
              },
              {
                key: 'orders',
                label: 'Order Count',
                render: (row) => <span className="text-sm">{row.order_count}</span>,
              },
              {
                key: 'created',
                label: 'Created',
                render: (row) => <span className="text-sm">{new Date(row.created_at).toLocaleDateString()}</span>,
              },
              {
                key: 'action',
                label: 'Action',
                render: (row) => (
                  <Button
                    size="sm"
                    variant={row.is_banned ? 'outline' : 'destructive'}
                    onClick={() => setPendingUser(row)}
                  >
                    {row.is_banned ? 'Unban' : 'Ban'}
                  </Button>
                ),
              },
            ]}
          />
        )}
      </SectionCard>

      <ConfirmDialog
        open={Boolean(pendingUser)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingUser(null);
            setReason('');
          }
        }}
        title={pendingUser?.is_banned ? 'Unban user' : 'Ban user'}
        description={
          pendingUser?.is_banned
            ? 'This user will be allowed to login and place new orders again.'
            : 'This user will be blocked from login and new orders.'
        }
        confirmLabel={pendingUser?.is_banned ? 'Confirm unban' : 'Confirm ban'}
        onConfirm={confirmModeration}
      />

      {pendingUser && !pendingUser.is_banned ? (
        <SectionCard title="Ban reason" description="Optional reason sent to backend if provided.">
          <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason (optional)" />
        </SectionCard>
      ) : null}
    </div>
  );
}

