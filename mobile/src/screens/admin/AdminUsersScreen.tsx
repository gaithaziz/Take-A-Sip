import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const insets = useSafeAreaInsets();
  const isCompact = width < 390;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [filterInput, setFilterInput] = useState<FilterMode>('all');
  const [query, setQuery] = useState<{ search: string; filter: FilterMode }>({ search: '', filter: 'all' });
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [mutatingUserId, setMutatingUserId] = useState<string | null>(null);

  const load = useCallback(async (activeQuery: { search: string; filter: FilterMode }) => {
    try {
      setLoading(true);
      setError(null);
      const banned = activeQuery.filter === 'all' ? null : activeQuery.filter === 'banned';
      const response = await adminService.listUsers(activeQuery.search || undefined, banned);
      setUsers(response.users);
    } catch (e) {
      setError(getApiErrorMessage(e, t));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load(query);
  }, [load, query]);

  const doBan = (user: UserSummary) => {
    Alert.alert(t('admin.banUser'), t('admin.banUserConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('admin.ban'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              setMutatingUserId(user.id);
              await adminService.banUser(user.id);
              await load(query);
            } catch (e) {
              Alert.alert(t('common.error'), getApiErrorMessage(e, t));
            } finally {
              setMutatingUserId(null);
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
              setMutatingUserId(user.id);
              await adminService.unbanUser(user.id);
              await load(query);
            } catch (e) {
              Alert.alert(t('common.error'), getApiErrorMessage(e, t));
            } finally {
              setMutatingUserId(null);
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

  const applyFilters = () => {
    setQuery({ search: searchInput.trim(), filter: filterInput });
  };

  const renderUser = ({ item: user }: { item: UserSummary }) => (
    <AppCard style={styles.userCard}>
      <View style={[styles.itemHeader, mirroredRow(isRTL)]}>
        <Pressable style={styles.flexButton} onPress={() => openUserDetails(user)} accessibilityRole="button" accessibilityLabel={`${user.first_name} ${user.last_name}`}>
          <ExpandableText value={`${user.first_name} ${user.last_name}`} variant="h3" numberOfLines={2} />
        </Pressable>
        <BadgeChip label={user.is_banned ? t('admin.banned') : t('admin.active')} tone={user.is_banned ? 'error' : 'success'} />
      </View>
      <View style={[styles.metaRow, mirroredRow(isRTL)]}>
        <BadgeChip label={`${t('admin.role')}: ${roleLabel(user.role)}`} tone="info" />
        <BadgeChip label={`${t('admin.orderCount')}: ${user.order_count}`} tone="default" />
      </View>
      <View style={styles.infoBox}>
        <InfoLine label={t('profile.phone')} value={user.phone_number} numberOfLines={1} />
        {user.banned_reason ? (
          <InfoLine label={t('admin.banReason')} value={user.banned_reason} numberOfLines={1} />
        ) : null}
      </View>

      <ActionRow compact={isCompact}>
        <AppButton
          title={t('admin.viewOrders')}
          variant="secondary"
          onPress={() => openUserDetails(user)}
          style={styles.flexButton}
          disabled={mutatingUserId === user.id}
        />
        {user.is_banned ? (
          <AppButton
            title={t('admin.unban')}
            onPress={() => doUnban(user)}
            style={styles.flexButton}
            loading={mutatingUserId === user.id}
            disabled={Boolean(mutatingUserId && mutatingUserId !== user.id)}
          />
        ) : (
          <AppButton
            title={t('admin.ban')}
            variant="destructive"
            onPress={() => doBan(user)}
            style={styles.flexButton}
            loading={mutatingUserId === user.id}
            disabled={Boolean(mutatingUserId && mutatingUserId !== user.id)}
          />
        )}
      </ActionRow>
    </AppCard>
  );

  return (
    <FlatList
      data={loading || error ? [] : sortedUsers}
      renderItem={renderUser}
      keyExtractor={(user) => user.id}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListHeaderComponent={
        <View style={styles.headerBlock}>
          <AppText variant="h1">{t('admin.usersTitle')}</AppText>
          <AdminPageSection title={t('admin.searchUsers')}>
            <View style={styles.filterStack}>
              <View style={styles.formGroup}>
                <AppInput
                  label={t('admin.searchUsers')}
                  value={searchInput}
                  onChangeText={setSearchInput}
                  placeholder={t('admin.searchByNameOrPhone')}
                />
              </View>

              <View style={styles.formGroup}>
                <AppText variant="bodySmall" color={theme.colors.textSecondary}>{t('admin.status')}</AppText>
                <View style={[styles.filterButtonsRow, mirroredRow(isRTL), isCompact ? styles.filterButtonsRowCompact : null]}>
                  <AppButton
                    title={t('admin.filterAll')}
                    variant={filterInput === 'all' ? 'primary' : 'secondary'}
                    onPress={() => setFilterInput('all')}
                    style={styles.filterButton}
                    fullWidth={false}
                    accessibilityState={{ selected: filterInput === 'all' }}
                    testID="users-filter-all"
                  />
                  <AppButton
                    title={t('admin.filterBanned')}
                    variant={filterInput === 'banned' ? 'primary' : 'secondary'}
                    onPress={() => setFilterInput('banned')}
                    style={styles.filterButton}
                    fullWidth={false}
                    accessibilityState={{ selected: filterInput === 'banned' }}
                    testID="users-filter-banned"
                  />
                  <AppButton
                    title={t('admin.filterActive')}
                    variant={filterInput === 'active' ? 'primary' : 'secondary'}
                    onPress={() => setFilterInput('active')}
                    style={styles.filterButton}
                    fullWidth={false}
                    accessibilityState={{ selected: filterInput === 'active' }}
                    testID="users-filter-active"
                  />
                </View>

                <AppButton
                  title={t('admin.applyFilters')}
                  onPress={applyFilters}
                  disabled={loading}
                />
              </View>
            </View>
          </AdminPageSection>
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <LoadingState label={t('common.loading')} />
        ) : error ? (
          <EmptyState
            title={t('common.error')}
            subtitle={error}
            actionLabel={t('common.retry')}
            onAction={() => void load(query)}
          />
        ) : (
          <EmptyState title={t('admin.noUsersTitle')} subtitle={t('admin.noUsersSubtitle')} />
        )
      }
      refreshing={loading}
      onRefresh={() => void load(query)}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + theme.spacing.md,
          paddingBottom: insets.bottom + theme.spacing.xl,
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  content: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.lg,
  },
  headerBlock: {
    marginBottom: theme.spacing.md,
    gap: theme.spacing.lg,
  },
  filterStack: {
    gap: theme.spacing.lg,
  },
  formGroup: {
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.secondaryCream,
    padding: theme.spacing.md,
  },
  filterButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  filterButtonsRowCompact: {
    flexDirection: 'column',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  userCard: {
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.secondaryCream,
    borderColor: theme.colors.primary200,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  infoBox: {
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
  },
  flexButton: {
    flex: 1,
  },
  filterButton: {
    flex: 1,
    minHeight: 40,
  },
  separator: {
    height: theme.spacing.md,
  },
});
