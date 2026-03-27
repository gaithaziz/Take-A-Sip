import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppInput } from '@/components/AppInput';
import { AppShell } from '@/components/AppShell';
import { AppText } from '@/components/AppText';
import { ProfileRow } from '@/components/ProfileRow';
import { SavedAddress } from '@/services/addressBook';
import { theme } from '@/theme';
import { mirroredRow } from '@/utils/layout';

type ProfileScreenViewProps = {
  title: string;
  userFullName: string;
  phoneLabel: string;
  phoneValue: string;
  languageLabel: string;
  languageValue: string;
  logoutLabel: string;
  isRTL: boolean;
  isEditing: boolean;
  firstNameLabel: string;
  lastNameLabel: string;
  firstName: string;
  lastName: string;
  saveProfileLabel: string;
  editProfileLabel: string;
  accountDetailsLabel: string;
  quickActionsLabel: string;
  preferencesLabel: string;
  accountSafetyLabel: string;
  ordersShortcutLabel: string;
  cartShortcutLabel: string;
  addressesShortcutLabel: string;
  addressesShortcutValue: string;
  savedAddresses: SavedAddress[];
  removeAddressLabel: string;
  accountStatusLabel: string;
  accountStatusValue: string;
  accountSupportHint: string;
  settingsLabel: string;
  cancelLabel: string;
  deleteAccountLabel: string;
  formError: string | null;
  saving: boolean;
  deletingAccount: boolean;
  onChangeFirstName: (value: string) => void;
  onChangeLastName: (value: string) => void;
  onToggleLanguage: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveProfile: () => void;
  onOpenOrders: () => void;
  onOpenCart: () => void;
  onRemoveSavedAddress: (addressId: string) => void;
  onDeleteAccount: () => void;
  onLogout: () => void;
};

const initialsFromName = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return 'U';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 1).toUpperCase();
  }
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
};

export const ProfileScreenView = ({
  title,
  userFullName,
  phoneLabel,
  phoneValue,
  languageLabel,
  languageValue,
  logoutLabel,
  isRTL,
  isEditing,
  firstNameLabel,
  lastNameLabel,
  firstName,
  lastName,
  saveProfileLabel,
  editProfileLabel,
  accountDetailsLabel,
  quickActionsLabel,
  preferencesLabel,
  accountSafetyLabel,
  ordersShortcutLabel,
  cartShortcutLabel,
  addressesShortcutLabel,
  addressesShortcutValue,
  savedAddresses,
  removeAddressLabel,
  accountStatusLabel,
  accountStatusValue,
  accountSupportHint,
  settingsLabel,
  cancelLabel,
  deleteAccountLabel,
  formError,
  saving,
  deletingAccount,
  onChangeFirstName,
  onChangeLastName,
  onToggleLanguage,
  onStartEdit,
  onCancelEdit,
  onSaveProfile,
  onOpenOrders,
  onOpenCart,
  onRemoveSavedAddress,
  onDeleteAccount,
  onLogout,
}: ProfileScreenViewProps) => {
  return (
    <AppShell>
      <View style={styles.headerBlock}>
        <AppText variant="h1">{title}</AppText>
        <AppText variant="bodySmall" color={theme.colors.textSecondary}>
          {accountSupportHint}
        </AppText>
      </View>

      <AppCard style={styles.heroCard}>
        <View style={[styles.userRow, mirroredRow(isRTL)]}>
          <View style={styles.avatar}>
            <AppText variant="button" color={theme.colors.white} align="center">
              {initialsFromName(userFullName)}
            </AppText>
          </View>
          <View style={styles.userInfo}>
            <AppText variant="h3">{userFullName}</AppText>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              {`${phoneLabel}: ${phoneValue}`}
            </AppText>
          </View>
        </View>
        <View style={[styles.statusChip, mirroredRow(isRTL)]}>
          <Ionicons name="shield-checkmark-outline" size={16} color={theme.colors.success} />
          <AppText variant="caption" color={theme.colors.success}>
            {accountStatusValue}
          </AppText>
        </View>
        <View style={styles.heroActions}>
          <AppButton title={ordersShortcutLabel} onPress={onOpenOrders} />
          <AppButton title={cartShortcutLabel} variant="secondary" onPress={onOpenCart} />
        </View>
      </AppCard>

      <AppCard style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <AppText variant="h3">{accountDetailsLabel}</AppText>
          {!isEditing ? <AppButton title={editProfileLabel} variant="ghost" fullWidth={false} onPress={onStartEdit} /> : null}
        </View>
        {isEditing ? (
          <View style={styles.formStack}>
            <AppInput label={firstNameLabel} value={firstName} onChangeText={onChangeFirstName} />
            <AppInput label={lastNameLabel} value={lastName} onChangeText={onChangeLastName} />
            {formError ? (
              <AppText variant="caption" color={theme.colors.error}>
                {formError}
              </AppText>
            ) : null}
            <View style={[styles.actionRow, mirroredRow(isRTL)]}>
              <AppButton title={cancelLabel} variant="ghost" fullWidth={false} onPress={onCancelEdit} />
              <AppButton title={saveProfileLabel} fullWidth={false} loading={saving} onPress={onSaveProfile} />
            </View>
          </View>
        ) : (
          <View style={styles.readOnlyInfo}>
            <ProfileRow label={firstNameLabel} value={firstName} />
            <ProfileRow label={lastNameLabel} value={lastName} />
            <ProfileRow label={phoneLabel} value={phoneValue} />
          </View>
        )}
      </AppCard>

      <AppCard style={styles.sectionCard}>
        <AppText variant="h3">{quickActionsLabel}</AppText>
        <View style={styles.quickActionsGrid}>
          <AppButton title={ordersShortcutLabel} variant="secondary" onPress={onOpenOrders} />
          <AppButton title={cartShortcutLabel} variant="secondary" onPress={onOpenCart} />
        </View>
      </AppCard>

      <AppCard style={styles.sectionCard}>
        <AppText variant="h3">{preferencesLabel}</AppText>
        <AppText variant="bodySmall" color={theme.colors.textSecondary}>
          {settingsLabel}
        </AppText>
        <View style={styles.readOnlyInfo}>
          <ProfileRow label={languageLabel} value={languageValue} onPress={onToggleLanguage} />
        </View>
      </AppCard>

      <AppCard style={styles.sectionCard}>
        <AppText variant="h3">{addressesShortcutLabel}</AppText>
        <AppText variant="bodySmall" color={theme.colors.textSecondary}>
          {addressesShortcutValue}
        </AppText>
        {savedAddresses.length > 0 ? (
          <View style={styles.addressList}>
            {savedAddresses.map((address) => (
              <View key={address.id} style={styles.addressCard}>
                <View style={styles.addressMeta}>
                  <AppText variant="bodySmall">{address.label}</AppText>
                  <AppText variant="caption" color={theme.colors.textSecondary}>
                    {address.address}
                  </AppText>
                </View>
                <AppButton
                  title={removeAddressLabel}
                  variant="ghost"
                  fullWidth={false}
                  onPress={() => onRemoveSavedAddress(address.id)}
                />
              </View>
            ))}
          </View>
        ) : null}
      </AppCard>

      <AppCard style={styles.sectionCard}>
        <AppText variant="h3">{accountSafetyLabel}</AppText>
        <ProfileRow label={accountStatusLabel} value={accountStatusValue} />
        <AppText variant="bodySmall" color={theme.colors.textSecondary}>
          {accountSupportHint}
        </AppText>
      </AppCard>

      <AppCard style={styles.safetyCard}>
        <AppButton
          title={deleteAccountLabel}
          variant="destructive"
          onPress={onDeleteAccount}
          loading={deletingAccount}
        />
        <View style={styles.logoutWrap}>
          <AppButton title={logoutLabel} variant="destructive" onPress={onLogout} />
        </View>
      </AppCard>
    </AppShell>
  );
};

const styles = StyleSheet.create({
  headerBlock: {
    gap: theme.spacing.xs,
  },
  heroCard: {
    gap: theme.spacing.md,
    backgroundColor: theme.colors.secondaryCream,
    borderColor: theme.colors.primary200,
  },
  statusChip: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.successSurface,
    borderWidth: 1,
    borderColor: '#cfe2d1',
  },
  userRow: {
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary500,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.card,
  },
  userInfo: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  heroActions: {
    gap: theme.spacing.sm,
  },
  sectionCard: {
    gap: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  formStack: {
    gap: theme.spacing.md,
  },
  readOnlyInfo: {
    gap: theme.spacing.xs,
  },
  quickActionsGrid: {
    gap: theme.spacing.sm,
  },
  actionRow: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  safetyCard: {
    gap: theme.spacing.md,
    backgroundColor: theme.colors.errorSurface,
    borderColor: '#efc8c3',
  },
  logoutWrap: {
    paddingTop: theme.spacing.xs,
  },
  addressList: {
    gap: theme.spacing.sm,
  },
  addressCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.secondaryCream,
    padding: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  addressMeta: {
    gap: theme.spacing.xs,
  },
});
