import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppInput } from '@/components/AppInput';
import { AppShell } from '@/components/AppShell';
import { AppText } from '@/components/AppText';
import { BadgeChip } from '@/components/BadgeChip';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { AdminPageSection } from '@/components/admin/AdminPageSection';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { adminService } from '@/services/adminService';
import { useLanguage } from '@/state/LanguageContext';
import { theme } from '@/theme';
import { UserSummary } from '@/types/api';
import { getApiErrorMessage } from '@/utils/errors';
import { mirroredRow } from '@/utils/layout';

type StaffRole = 'DRIVER' | 'FRONTDESK' | 'ADMIN';

export const AdminStaffScreen = () => {
  const { t } = useAppTranslation();
  const { isRTL } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [staff, setStaff] = useState<UserSummary[]>([]);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState<StaffRole>('DRIVER');
  const [provisioning, setProvisioning] = useState(false);

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

  const sortedStaff = useMemo(
    () => [...staff].sort((a, b) => a.first_name.localeCompare(b.first_name)),
    [staff],
  );

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

  if (loading) {
    return <LoadingState label={t('common.loading')} />;
  }

  if (error) {
    return <EmptyState title={t('common.error')} subtitle={error} actionLabel={t('common.retry')} onAction={load} />;
  }

  return (
    <AppShell refreshing={loading} onRefresh={load}>
      <AppText variant="h1">{t('admin.staffTitle')}</AppText>

      <AdminPageSection title={t('admin.provisionStaffTitle')}>
        <View style={styles.formCard}>
          <AppInput label={t('auth.firstName')} value={firstName} onChangeText={setFirstName} />
          <AppInput label={t('auth.lastName')} value={lastName} onChangeText={setLastName} />
          <AppInput label={t('auth.phoneNumber')} value={phoneNumber} onChangeText={setPhoneNumber} />

          <AppText variant="bodySmall" color={theme.colors.textSecondary}>
            {t('admin.role')}
          </AppText>
          <View style={[styles.roleRow, mirroredRow(isRTL)]}>
            <AppButton
              title={t('roles.DRIVER')}
              variant={role === 'DRIVER' ? 'primary' : 'secondary'}
              fullWidth={false}
              style={styles.roleButton}
              onPress={() => setRole('DRIVER')}
            />
            <AppButton
              title={t('roles.FRONTDESK')}
              variant={role === 'FRONTDESK' ? 'primary' : 'secondary'}
              fullWidth={false}
              style={styles.roleButton}
              onPress={() => setRole('FRONTDESK')}
            />
            <AppButton
              title={t('roles.ADMIN')}
              variant={role === 'ADMIN' ? 'primary' : 'secondary'}
              fullWidth={false}
              style={styles.roleButton}
              onPress={() => setRole('ADMIN')}
            />
          </View>
          <AppButton
            title={t('admin.provisionStaffCta')}
            loading={provisioning}
            disabled={provisioning}
            onPress={() => void onProvision()}
          />
        </View>
      </AdminPageSection>

      <AdminPageSection title={t('admin.usersTitle')}>
        {sortedStaff.length === 0 ? (
          <EmptyState title={t('admin.noUsersTitle')} subtitle={t('admin.noUsersSubtitle')} />
        ) : (
          <View style={styles.list}>
            {sortedStaff.map((user) => (
              <Pressable key={user.id}>
                <AppCard style={styles.userCard}>
                  <View style={[styles.itemHeader, mirroredRow(isRTL)]}>
                    <AppText variant="h3">{`${user.first_name} ${user.last_name}`}</AppText>
                    <BadgeChip label={t(`roles.${user.role.toUpperCase()}`)} tone="info" />
                  </View>
                  <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                    {user.phone_number}
                  </AppText>
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
  formCard: {
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.secondaryCream,
    padding: theme.spacing.md,
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
  list: {
    gap: theme.spacing.md,
  },
  userCard: {
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.secondaryCream,
    borderColor: theme.colors.primary200,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
});
