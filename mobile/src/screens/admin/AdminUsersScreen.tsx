import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppInput } from '@/components/AppInput';
import { AppShell } from '@/components/AppShell';
import { AppText } from '@/components/AppText';
import { BadgeChip } from '@/components/BadgeChip';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { ActionRow } from '@/components/admin/ActionRow';
import { AdminPageSection } from '@/components/admin/AdminPageSection';
import { ExpandableText } from '@/components/admin/ExpandableText';
import { InfoLine } from '@/components/admin/InfoLine';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { AdminTabParamList } from '@/navigation/types';
import { adminService } from '@/services/adminService';
import { useLanguage } from '@/state/LanguageContext';
import { theme } from '@/theme';
import { UserSummary } from '@/types/api';
import { getApiErrorMessage } from '@/utils/errors';
import { mirroredRow } from '@/utils/layout';

type FilterMode = 'all' | 'banned' | 'active';
type Props = BottomTabScreenProps<AdminTabParamList, 'AdminUsers'>;

export const AdminUsersScreen = ({ navigation }: Props) => {
  const { t } = useAppTranslation();
  const { isRTL } = useLanguage();
  const { width } = useWindowDimensions();
  const isCompact = width < 390;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [users, setUsers] = useState<UserSummary[]>([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const banned = filter === 'all' ? null : filter === 'banned';
      const response = await adminService.listUsers(search.trim() || undefined, banned);
      setUsers(response.users);
    } catch (e) {
      setError(getApiErrorMessage(e, t));
    } finally {
      setLoading(false);
    }
  }, [filter, search, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const doBan = (user: UserSummary) => {
    Alert.alert(t('admin.banUser'), t('admin.banUserConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('admin.ban'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await adminService.banUser(user.id);
              await load();
            } catch (e) {
              Alert.alert(t('common.error'), getApiErrorMessage(e, t));
            }
          })();
        },
      },
    ]);
  };

  const doUnban = (user: UserSummary) => {
    Alert.alert(t('admin.unbanUser'), t('admin.unbanUserConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('admin.unban'),
        onPress: () => {
          void (async () => {
            try {
              await adminService.unbanUser(user.id);
              await load();
            } catch (e) {
              Alert.alert(t('common.error'), getApiErrorMessage(e, t));
            }
          })();
        },
      },
    ]);
  };

  const openUserDetails = (user: UserSummary) => {
    navigation.getParent()?.navigate('AdminUserDetails', { user });
  };

  const sortedUsers = useMemo(() => [...users].sort((a, b) => b.order_count - a.order_count), [users]);
  const roleLabel = useCallback(
    (role: string) => t(`roles.${role.toUpperCase()}`),
    [t],
  );

  if (loading) {
    return <LoadingState label={t('common.loading')} />;
  }

  if (error) {
    return <EmptyState title={t('common.error')} subtitle={error} actionLabel={t('common.retry')} onAction={load} />;
  }

  return (
    <AppShell refreshing={loading} onRefresh={load}>
      <AppText variant="h1">{t('admin.usersTitle')}</AppText>

      <AdminPageSection title={t('admin.searchUsers')}>
        <View style={styles.filterStack}>
          <AppInput value={search} onChangeText={setSearch} placeholder={t('admin.searchByNameOrPhone')} />

          <View style={[styles.filterButtonsRow, mirroredRow(isRTL), isCompact ? styles.filterButtonsRowCompact : null]}>
            <AppButton title={t('admin.filterAll')} variant={filter === 'all' ? 'primary' : 'secondary'} onPress={() => setFilter('all')} style={styles.flexButton} />
            <AppButton title={t('admin.filterBanned')} variant={filter === 'banned' ? 'primary' : 'secondary'} onPress={() => setFilter('banned')} style={styles.flexButton} />
            <AppButton title={t('admin.filterActive')} variant={filter === 'active' ? 'primary' : 'secondary'} onPress={() => setFilter('active')} style={styles.flexButton} />
          </View>

          <AppButton title={t('admin.applyFilters')} onPress={() => void load()} />
        </View>
      </AdminPageSection>

      {sortedUsers.length === 0 ? (
        <EmptyState title={t('admin.noUsersTitle')} subtitle={t('admin.noUsersSubtitle')} />
      ) : (
        sortedUsers.map((user) => (
          <AppCard key={user.id}>
            <View style={[styles.itemHeader, mirroredRow(isRTL)]}>
              <Pressable style={styles.flexButton} onPress={() => openUserDetails(user)}>
                <ExpandableText value={`${user.first_name} ${user.last_name}`} variant="h3" numberOfLines={2} />
              </Pressable>
              <BadgeChip label={user.is_banned ? t('admin.banned') : t('admin.active')} tone={user.is_banned ? 'error' : 'success'} />
            </View>
            <InfoLine label={t('profile.phone')} value={user.phone_number} numberOfLines={1} />
            <InfoLine label={t('admin.role')} value={roleLabel(user.role)} numberOfLines={1} />
            <InfoLine label={t('admin.orderCount')} value={String(user.order_count)} numberOfLines={1} />
            {user.banned_reason ? (
              <InfoLine label={t('admin.banReason')} value={user.banned_reason} numberOfLines={2} />
            ) : null}

            <ActionRow compact={isCompact}>
              <AppButton title={t('admin.viewOrders')} variant="secondary" onPress={() => openUserDetails(user)} style={styles.flexButton} />
              {user.is_banned ? (
                <AppButton title={t('admin.unban')} onPress={() => doUnban(user)} style={styles.flexButton} />
              ) : (
                <AppButton title={t('admin.ban')} variant="destructive" onPress={() => doBan(user)} style={styles.flexButton} />
              )}
            </ActionRow>
          </AppCard>
        ))
      )}
    </AppShell>
  );
};

const styles = StyleSheet.create({
  filterStack: {
    gap: theme.spacing.md,
  },
  filterButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  filterButtonsRowCompact: {
    flexDirection: 'column',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  flexButton: {
    flex: 1,
  },
});
