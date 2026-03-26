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
  formError: string | null;
  saving: boolean;
  onChangeFirstName: (value: string) => void;
  onChangeLastName: (value: string) => void;
  onToggleLanguage: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveProfile: () => void;
  onOpenOrders: () => void;
  onOpenCart: () => void;
  onRemoveSavedAddress: (addressId: string) => void;
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
  formError,
  saving,
  onChangeFirstName,
  onChangeLastName,
  onToggleLanguage,
  onStartEdit,
  onCancelEdit,
  onSaveProfile,
  onOpenOrders,
  onOpenCart,
  onRemoveSavedAddress,
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
        {!isEditing ? (
          <View style={styles.heroActions}>
            <AppButton title={ordersShortcutLabel} onPress={onOpenOrders} />
            <AppButton title={editProfileLabel} variant="secondary" onPress={onStartEdit} />
          </View>
        ) : null}
      </AppCard>

      <AppCard style={styles.sectionCard}>
        <AppText variant="h3">{editProfileLabel}</AppText>
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
          </View>
        )}
      </AppCard>

      <AppCard style={styles.sectionCard}>
        <AppText variant="h3">{settingsLabel}</AppText>
        <View style={styles.readOnlyInfo}>
          <ProfileRow label={languageLabel} value={languageValue} onPress={onToggleLanguage} />
          <ProfileRow label={ordersShortcutLabel} onPress={onOpenOrders} />
          <ProfileRow label={cartShortcutLabel} onPress={onOpenCart} />
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
        <AppText variant="h3">{accountStatusLabel}</AppText>
        <ProfileRow label={accountStatusLabel} value={accountStatusValue} />
      </AppCard>

      <View style={styles.logoutWrap}>
        <AppButton title={logoutLabel} variant="destructive" onPress={onLogout} />
      </View>
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
  formStack: {
    gap: theme.spacing.md,
  },
  readOnlyInfo: {
    gap: theme.spacing.xs,
  },
  actionRow: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  logoutWrap: {
    paddingTop: theme.spacing.sm,
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
