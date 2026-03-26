import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppInput } from '@/components/AppInput';
import { AppShell } from '@/components/AppShell';
import { AppText } from '@/components/AppText';
import { BadgeChip } from '@/components/BadgeChip';
import { EmptyState } from '@/components/EmptyState';
import { ActionRow } from '@/components/admin/ActionRow';
import { AdminPageSection } from '@/components/admin/AdminPageSection';
import { InfoLine } from '@/components/admin/InfoLine';
import { ListPageSkeleton } from '@/components/skeleton/PageSkeletons';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { adminService } from '@/services/adminService';
import { useAuth } from '@/state/AuthContext';
import { useLanguage } from '@/state/LanguageContext';
import { theme } from '@/theme';
import { UserSummary } from '@/types/api';
import { getApiErrorMessage } from '@/utils/errors';
import { mirroredRow } from '@/utils/layout';

type StaffRole = 'DRIVER' | 'FRONTDESK' | 'ADMIN';
type StaffFilter = StaffRole | 'ALL';

const staffRoles: StaffRole[] = ['DRIVER', 'FRONTDESK', 'ADMIN'];

export const AdminStaffScreen = () => {
  const { t } = useAppTranslation();
  const { isRTL } = useLanguage();
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [staff, setStaff] = useState<UserSummary[]>([]);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState<StaffRole>('DRIVER');
  const [rosterFilter, setRosterFilter] = useState<StaffFilter>('ALL');
  const [provisioning, setProvisioning] = useState(false);
  const [mutatingStaffId, setMutatingStaffId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [admins, frontdesk, drivers] = await Promise.all([
        adminService.listUsers(undefined, null, 'ADMIN'),
        adminService.listUsers(undefined, null, 'FRONTDESK'),
        adminService.listUsers(undefined, null, 'DRIVER'),
      ]);
      setStaff([...admins.users, ...frontdesk.users, ...drivers.users]);
    } catch (e) {
      setError(getApiErrorMessage(e, t));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const roleCounts = useMemo(
    () => ({
      ALL: staff.length,
      DRIVER: staff.filter((user) => user.role === 'DRIVER').length,
      FRONTDESK: staff.filter((user) => user.role === 'FRONTDESK').length,
      ADMIN: staff.filter((user) => user.role === 'ADMIN').length,
    }),
    [staff],
  );

  const filteredStaff = useMemo(() => {
    const next = rosterFilter === 'ALL' ? staff : staff.filter((user) => user.role === rosterFilter);
    return [...next].sort((a, b) => a.first_name.localeCompare(b.first_name));
  }, [rosterFilter, staff]);

  const onProvision = async () => {
    if (!firstName.trim() || !lastName.trim() || !phoneNumber.trim()) {
      Alert.alert(t('common.error'), t('validation.requiredFields'));
      return;
    }
    try {
      setProvisioning(true);
      const result = await adminService.provisionStaff({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phoneNumber.trim(),
        role,
      });
      Alert.alert(t('common.appName'), result.created ? t('admin.staffCreated') : t('admin.staffUpdated'));
      setFirstName('');
      setLastName('');
      setPhoneNumber('');
      await load();
    } catch (e) {
      Alert.alert(t('common.error'), getApiErrorMessage(e, t));
    } finally {
      setProvisioning(false);
    }
  };

  const runStaffMutation = async (staffUser: UserSummary, action: 'archive' | 'unarchive' | 'delete') => {
    const title =
      action === 'archive'
        ? t('admin.archiveStaff')
        : action === 'unarchive'
          ? t('admin.unarchiveStaff')
          : t('admin.deleteStaff');
    const message =
      action === 'archive'
        ? t('admin.archiveStaffConfirm')
        : action === 'unarchive'
          ? t('admin.unarchiveStaffConfirm')
          : t('admin.deleteStaffConfirm');

    Alert.alert(title, message, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: action === 'delete' ? t('admin.delete') : t('common.confirm'),
        style: action === 'delete' ? 'destructive' : 'default',
        onPress: () => {
          void (async () => {
            try {
              setMutatingStaffId(staffUser.id);
              if (action === 'archive') {
                await adminService.archiveStaff(staffUser.id);
              } else if (action === 'unarchive') {
                await adminService.unarchiveStaff(staffUser.id);
              } else {
                await adminService.deleteStaff(staffUser.id);
              }
              await load();
            } catch (e) {
              Alert.alert(t('common.error'), getApiErrorMessage(e, t));
            } finally {
              setMutatingStaffId(null);
            }
          })();
        },
      },
    ]);
  };

  if (loading) {
    return <ListPageSkeleton isRTL={isRTL} showFilters cards={3} />;
  }

  if (error) {
    return <EmptyState title={t('common.error')} subtitle={error} actionLabel={t('common.retry')} onAction={load} />;
  }

  return (
    <AppShell refreshing={loading} onRefresh={load}>
      <View style={styles.headingBlock}>
        <AppText variant="h1">{t('admin.staffTitle')}</AppText>
        <AppText variant="bodySmall" color={theme.colors.textSecondary}>
          {t('admin.provisionStaffTitle')}
        </AppText>
      </View>

      <AdminPageSection title={t('admin.provisionStaffTitle')} subtitle={t('admin.provisionStaffCta')}>
        <View style={styles.formCard}>
          <AppInput label={t('auth.firstName')} value={firstName} onChangeText={setFirstName} />
          <AppInput label={t('auth.lastName')} value={lastName} onChangeText={setLastName} />
          <AppInput label={t('auth.phoneNumber')} value={phoneNumber} onChangeText={setPhoneNumber} />

          <View style={styles.formGroup}>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              {t('admin.role')}
            </AppText>
            <View style={[styles.roleRow, mirroredRow(isRTL)]}>
              {staffRoles.map((entryRole) => (
                <AppButton
                  key={entryRole}
                  title={t(`roles.${entryRole}`)}
                  variant={role === entryRole ? 'primary' : 'secondary'}
                  fullWidth={false}
                  style={styles.roleButton}
                  onPress={() => setRole(entryRole)}
                />
              ))}
            </View>
          </View>

          <AppButton
            title={t('admin.provisionStaffCta')}
            loading={provisioning}
            disabled={provisioning}
            onPress={() => void onProvision()}
          />
        </View>
      </AdminPageSection>

      <AdminPageSection title={t('admin.usersTitle')} subtitle={t('admin.staffTitle')}>
        <View style={styles.summaryRow}>
          <BadgeChip label={`${t('admin.filterAll')}: ${roleCounts.ALL}`} tone={rosterFilter === 'ALL' ? 'info' : 'default'} />
          {staffRoles.map((entryRole) => (
            <BadgeChip
              key={entryRole}
              label={`${t(`roles.${entryRole}`)}: ${roleCounts[entryRole]}`}
              tone={entryRole === 'DRIVER' ? 'success' : 'info'}
            />
          ))}
        </View>

        <View style={[styles.roleRow, mirroredRow(isRTL)]}>
          <AppButton
            title={t('admin.filterAll')}
            variant={rosterFilter === 'ALL' ? 'primary' : 'secondary'}
            fullWidth={false}
            style={styles.roleButton}
            onPress={() => setRosterFilter('ALL')}
          />
          {staffRoles.map((entryRole) => (
            <AppButton
              key={entryRole}
              title={t(`roles.${entryRole}`)}
              variant={rosterFilter === entryRole ? 'primary' : 'secondary'}
              fullWidth={false}
              style={styles.roleButton}
              onPress={() => setRosterFilter(entryRole)}
            />
          ))}
        </View>

        {filteredStaff.length === 0 ? (
          <EmptyState title={t('admin.noUsersTitle')} subtitle={t('admin.noUsersSubtitle')} />
        ) : (
          <View style={styles.list}>
            {filteredStaff.map((user) => (
              <Pressable key={user.id} accessibilityRole="button" accessibilityLabel={`${user.first_name} ${user.last_name}`}>
                <AppCard style={styles.userCard}>
                  <View style={[styles.itemHeader, mirroredRow(isRTL)]}>
                    <AppText variant="h3">{`${user.first_name} ${user.last_name}`}</AppText>
                    <BadgeChip label={t(`roles.${user.role.toUpperCase()}`)} tone="info" />
                  </View>
                  <View style={[styles.metaRow, mirroredRow(isRTL)]}>
                    <BadgeChip
                      label={!user.is_active ? t('admin.archived') : user.is_banned ? t('admin.banned') : t('admin.active')}
                      tone={!user.is_active ? 'default' : user.is_banned ? 'error' : 'success'}
                    />
                    <BadgeChip label={`${t('admin.orderCount')}: ${user.order_count}`} tone="default" />
                  </View>
                  <View style={styles.infoBox}>
                    <InfoLine label={t('profile.phone')} value={user.phone_number} numberOfLines={1} />
                  </View>
                  <ActionRow>
                    {user.is_active ? (
                      <AppButton
                        title={t('admin.archive')}
                        variant="ghost"
                        fullWidth={false}
                        onPress={() => void runStaffMutation(user, 'archive')}
                        loading={mutatingStaffId === user.id}
                        disabled={mutatingStaffId !== null || currentUser?.id === user.id}
                        style={styles.actionButton}
                      />
                    ) : (
                      <AppButton
                        title={t('admin.unarchive')}
                        variant="secondary"
                        fullWidth={false}
                        onPress={() => void runStaffMutation(user, 'unarchive')}
                        loading={mutatingStaffId === user.id}
                        disabled={mutatingStaffId !== null || currentUser?.id === user.id}
                        style={styles.actionButton}
                      />
                    )}
                    <AppButton
                      title={t('admin.delete')}
                      variant="destructive"
                      fullWidth={false}
                      onPress={() => void runStaffMutation(user, 'delete')}
                      disabled={mutatingStaffId !== null || user.is_active || currentUser?.id === user.id}
                      style={styles.actionButton}
                    />
                  </ActionRow>
                </AppCard>
              </Pressable>
            ))}
          </View>
        )}
      </AdminPageSection>
    </AppShell>
  );
};

const styles = StyleSheet.create({
  headingBlock: {
    gap: theme.spacing.xs,
  },
  formCard: {
    gap: theme.spacing.md,
  },
  formGroup: {
    gap: theme.spacing.sm,
  },
  roleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  roleButton: {
    flex: 1,
    minHeight: 40,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  list: {
    gap: theme.spacing.md,
  },
  userCard: {
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.secondaryCream,
    borderColor: theme.colors.primary200,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.sm,
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
  actionButton: {
    flex: 1,
    minWidth: 110,
  },
});
