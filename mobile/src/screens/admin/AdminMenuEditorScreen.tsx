import { useCallback, useMemo, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Switch, View, useWindowDimensions } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { AppInput } from '@/components/AppInput';
import { AppShell } from '@/components/AppShell';
import { AppText } from '@/components/AppText';
import { BadgeChip } from '@/components/BadgeChip';
import { EmptyState } from '@/components/EmptyState';
import { AdminActionSheet } from '@/components/admin/AdminActionSheet';
import { DetailPageSkeleton } from '@/components/skeleton/PageSkeletons';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { RootStackParamList } from '@/navigation/types';
import { adminService } from '@/services/adminService';
import { useLanguage } from '@/state/LanguageContext';
import { theme } from '@/theme';
import { Item, MenuEntityType, MenuSchedule, Section } from '@/types/api';
import { formatCurrency, toNumber } from '@/utils/format';
import { getApiErrorMessage } from '@/utils/errors';
import { getLocalizedValue } from '@/utils/i18n';
import { mirroredRow } from '@/utils/layout';

type FilterMode = 'all' | 'active' | 'inactive' | 'issues';
type AdminMenuNavigation = NativeStackNavigationProp<RootStackParamList>;
type AdminMenuGroup = {
  id: string;
  title: string | null;
  data: Item[];
};

const activeTypeCount = (item: Item) =>
  item.item_types.filter((itemType) => itemType.is_active && itemType.sizes.some((size) => size.is_active)).length;

const lowestActivePrice = (item: Item) => {
  const prices = item.item_types
    .filter((itemType) => itemType.is_active)
    .flatMap((itemType) => itemType.sizes.filter((size) => size.is_active).map((size) => toNumber(size.price)));
  return prices.length ? Math.min(...prices) : 0;
};

const matchesQuery = (section: Section, item: Item | null, query: string) => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const values = item
    ? [item.name_en, item.name_ar, item.description_en ?? '', item.description_ar ?? '', section.name_en, section.name_ar]
    : [section.name_en, section.name_ar];
  return values.some((value) => value.toLowerCase().includes(normalized));
};

const getProductVisibility = (section: Section, item: Item) => {
  if (!section.is_active) return 'ancestor';
  if (!item.is_active) return 'inactive';
  return activeTypeCount(item) > 0 ? 'visible' : 'issue';
};

const buildMenuGroups = (section: Section, items: Item[], language: 'en' | 'ar'): AdminMenuGroup[] => {
  const groups: AdminMenuGroup[] = [];
  const groupIndexByTitle = new Map<string, number>();

  items.forEach((item) => {
    const rawGroupTitle = getLocalizedValue(item, language, 'description').trim();
    const groupTitle = rawGroupTitle.length > 0 ? rawGroupTitle : null;
    const groupKey = groupTitle ?? '__ungrouped__';
    const existingIndex = groupIndexByTitle.get(groupKey);

    if (existingIndex === undefined) {
      groupIndexByTitle.set(groupKey, groups.length);
      groups.push({
        id: `${section.id}-${groupKey}`,
        title: groupTitle,
        data: [item],
      });
      return;
    }

    groups[existingIndex].data.push(item);
  });

  return groups;
};

const Thumbnail = ({ uri, fallbackIcon }: { uri?: string | null; fallbackIcon: keyof typeof Ionicons.glyphMap }) => (
  <View style={styles.thumbnail}>
    {uri ? (
      <Image source={{ uri }} style={styles.image} resizeMode="cover" />
    ) : (
      <View style={styles.thumbnailPlaceholder}>
        <Ionicons name={fallbackIcon} size={theme.iconSizes.md} color={theme.colors.primary700} />
      </View>
    )}
  </View>
);

export const AdminMenuEditorScreen = () => {
  const { t, language } = useAppTranslation();
  const { isRTL } = useLanguage();
  const navigation = useNavigation<AdminMenuNavigation>();
  const { width } = useWindowDimensions();
  const isCompact = width < 390;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [schedules, setSchedules] = useState<MenuSchedule[]>([]);
  const [query, setQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [expandedSectionIds, setExpandedSectionIds] = useState<string[]>([]);
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<string[]>([]);
  const [focusedGroupBySection, setFocusedGroupBySection] = useState<Record<string, string>>({});
  const [mutatingEntityId, setMutatingEntityId] = useState<string | null>(null);
  const [orderingEnabled, setOrderingEnabled] = useState(true);
  const [orderingMutating, setOrderingMutating] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedEntities, setSelectedEntities] = useState<Set<string>>(new Set());
  const [bulkMutating, setBulkMutating] = useState(false);
  const [actionSheet, setActionSheet] = useState<{
    title: string;
    items: Array<{ key: string; label: string; tone?: 'default' | 'destructive'; onPress: () => void }>;
  } | null>(null);

  const scheduleKeys = useMemo(
    () => new Set(schedules.filter((schedule) => schedule.is_active).map((schedule) => `${schedule.entity_type}:${schedule.entity_id}`)),
    [schedules],
  );

  const load = useCallback(
    async (asRefresh = false) => {
      try {
        asRefresh ? setRefreshing(true) : setLoading(true);
        setError(null);
        const [menu, scheduleResponse, storeStatus] = await Promise.all([
          adminService.getMenuTree(),
          adminService.listSchedules(),
          adminService.getStoreStatus(),
        ]);
        setSections(menu.sections);
        setSchedules(scheduleResponse.schedules);
        setOrderingEnabled(storeStatus.ordering_enabled);
        setExpandedSectionIds((current) => (current.length ? current : menu.sections.slice(0, 2).map((section) => section.id)));
      } catch (e) {
        setError(getApiErrorMessage(e, t));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const visibleSections = useMemo(() => {
    const matchesFilter = (section: Section, item: Item | null) => {
      if (filterMode === 'all') return true;
      if (!item) {
        if (filterMode === 'active') return section.is_active;
        if (filterMode === 'inactive') return !section.is_active;
        return !section.is_active || section.items.some((entry) => getProductVisibility(section, entry) !== 'visible');
      }
      const visibility = getProductVisibility(section, item);
      if (filterMode === 'active') return item.is_active;
      if (filterMode === 'inactive') return !item.is_active || visibility === 'ancestor';
      return visibility !== 'visible';
    };

    return sections
      .map((section) => {
        const items = section.items.filter((item) => matchesQuery(section, item, query) && matchesFilter(section, item));
        const keepSection = matchesQuery(section, null, query) && matchesFilter(section, null);
        return keepSection || items.length > 0 ? { ...section, items } : null;
      })
      .filter((section): section is Section => Boolean(section));
  }, [filterMode, query, sections]);

  const toggleExpanded = (sectionId: string) => {
    setExpandedSectionIds((current) =>
      current.includes(sectionId) ? current.filter((id) => id !== sectionId) : [...current, sectionId],
    );
  };

  const toggleSelected = (kind: 'section' | 'item', id: string) => {
    const key = `${kind}:${id}`;
    setSelectedEntities((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const leaveSelectionMode = () => {
    setSelectionMode(false);
    setSelectedEntities(new Set());
  };

  const updateOrderingStatus = (nextEnabled: boolean) => {
    Alert.alert(
      t('admin.orderingStatus'),
      nextEnabled ? t('admin.resumeOrderingConfirm') : t('admin.pauseOrderingConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: async () => {
            try {
              setOrderingMutating(true);
              const next = await adminService.updateStoreStatus(nextEnabled);
              setOrderingEnabled(next.ordering_enabled);
            } catch (e) {
              Alert.alert(t('common.error'), getApiErrorMessage(e, t));
            } finally {
              setOrderingMutating(false);
            }
          },
        },
      ],
    );
  };

  const updateSelectedAvailability = (isActive: boolean) => {
    if (selectedEntities.size === 0) return;
    const action = isActive ? t('admin.enable') : t('admin.disable');
    Alert.alert(
      t('common.appName'),
      t('admin.bulkAvailabilityConfirm', { action, count: selectedEntities.size }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: async () => {
            try {
              setBulkMutating(true);
              const entities = [...selectedEntities].map((key) => {
                const [entity_type, entity_id] = key.split(':');
                return { entity_type: entity_type as 'section' | 'item', entity_id };
              });
              await adminService.setMenuEntitiesAvailability(entities, isActive);
              leaveSelectionMode();
              await load(true);
            } catch (e) {
              Alert.alert(t('common.error'), getApiErrorMessage(e, t));
            } finally {
              setBulkMutating(false);
            }
          },
        },
      ],
    );
  };

  const toggleGroup = (groupId: string) => {
    setCollapsedGroupIds((current) =>
      current.includes(groupId) ? current.filter((id) => id !== groupId) : [...current, groupId],
    );
  };

  const focusGroup = (sectionId: string, groupId: string) => {
    setFocusedGroupBySection((current) => ({ ...current, [sectionId]: groupId }));
    setCollapsedGroupIds((current) => current.filter((id) => id !== groupId));
  };

  const toggleEntity = async (kind: MenuEntityType, id: string, isActive: boolean, label: string) => {
    Alert.alert(t('common.appName'), `${isActive ? t('admin.disable') : t('admin.enable')}: ${label}`, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.confirm'),
        onPress: async () => {
          try {
            setMutatingEntityId(id);
            await adminService.toggleMenuEntity(id);
            await load(true);
          } catch (e) {
            Alert.alert(t('common.error'), getApiErrorMessage(e, t));
          } finally {
            setMutatingEntityId(null);
          }
        },
      },
    ]);
  };

  const deleteEntity = async (kind: MenuEntityType, id: string, label: string) => {
    Alert.alert(t('admin.delete'), label, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('admin.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            setMutatingEntityId(id);
            await adminService.deleteMenuEntity(kind, id);
            await load(true);
          } catch (e) {
            Alert.alert(t('common.error'), getApiErrorMessage(e, t));
          } finally {
            setMutatingEntityId(null);
          }
        },
      },
    ]);
  };

  const productVisibilityBadge = (section: Section, item: Item) => {
    const visibility = getProductVisibility(section, item);
    if (visibility === 'visible') return <BadgeChip label={t('admin.visibilityVisible')} tone="success" />;
    if (visibility === 'ancestor') return <BadgeChip label={t('admin.visibilityHiddenInactiveAncestor')} tone="warning" />;
    if (visibility === 'inactive') return <BadgeChip label={t('admin.visibilityHiddenInactive')} tone="default" />;
    return <BadgeChip label={t('admin.visibilityNeedsTypeAndSize')} tone="info" />;
  };

  const openSectionActions = (section: Section) => {
    const label = getLocalizedValue(section, language, 'name');
    setActionSheet({
      title: label,
      items: [
        { key: 'edit', label: t('admin.editCategory'), onPress: () => navigation.navigate('AdminMenuCategoryEditor', { section }) },
        {
          key: 'toggle',
          label: section.is_active ? t('admin.disable') : t('admin.enable'),
          onPress: () => void toggleEntity('section', section.id, section.is_active, label),
        },
        {
          key: 'delete',
          label: t('admin.delete'),
          tone: 'destructive',
          onPress: () => void deleteEntity('section', section.id, label),
        },
      ],
    });
  };

  const openProductActions = (section: Section, item: Item) => {
    const label = getLocalizedValue(item, language, 'name');
    setActionSheet({
      title: label,
      items: [
        { key: 'preview', label: t('admin.previewAsCustomer'), onPress: () => navigation.navigate('AdminMenuCustomerPreview', { item, initialLanguage: language }) },
        { key: 'edit', label: t('admin.editProduct'), onPress: () => navigation.navigate('AdminMenuProductEditor', { item, sectionId: section.id }) },
        {
          key: 'toggle',
          label: item.is_active ? t('admin.disable') : t('admin.enable'),
          onPress: () => void toggleEntity('item', item.id, item.is_active, label),
        },
        {
          key: 'delete',
          label: t('admin.delete'),
          tone: 'destructive',
          onPress: () => void deleteEntity('item', item.id, label),
        },
      ],
    });
  };

  const renderProductRow = (section: Section, item: Item) => {
    const title = getLocalizedValue(item, language, 'name');
    const description = getLocalizedValue(item, language, 'description');
    const selectionKey = `item:${item.id}`;
    const selected = selectedEntities.has(selectionKey);
    return (
      <Pressable
        key={item.id}
        style={({ pressed }) => [styles.productRow, selected ? styles.selectedRow : null, pressed ? styles.rowPressed : null]}
        onPress={() => selectionMode ? toggleSelected('item', item.id) : navigation.navigate('AdminMenuProductEditor', { item, sectionId: section.id })}
        accessibilityRole="button"
        accessibilityLabel={title}>
        <View style={[styles.productTopRow, mirroredRow(isRTL)]}>
          {selectionMode ? (
            <Ionicons name={selected ? 'checkbox' : 'square-outline'} size={theme.iconSizes.lg} color={theme.colors.primary700} />
          ) : null}
          <Thumbnail uri={item.image_url} fallbackIcon="cafe-outline" />
          <View style={styles.productCopy}>
            <View style={[styles.productTitleRow, mirroredRow(isRTL)]}>
              <AppText variant="h3" numberOfLines={2} style={styles.productTitle}>
                {title}
              </AppText>
              <AppText variant="price" color={theme.colors.primary700}>
                {formatCurrency(lowestActivePrice(item), language)}
              </AppText>
            </View>
            {description ? (
              <AppText variant="bodySmall" color={theme.colors.textSecondary} numberOfLines={2}>
                {description}
              </AppText>
            ) : null}
            <View style={[styles.badgeRow, mirroredRow(isRTL)]}>
              <BadgeChip label={item.is_active ? t('admin.active') : t('admin.inactive')} tone={item.is_active ? 'success' : 'default'} />
              {productVisibilityBadge(section, item)}
              {scheduleKeys.has(`item:${item.id}`) ? <BadgeChip label={t('admin.scheduled')} tone="info" /> : null}
            </View>
          </View>
        </View>
        {!selectionMode ? <View style={[styles.productActionRow, isCompact ? styles.productActionRowCompact : null, mirroredRow(isRTL)]}>
          <AppButton
            title={t('admin.previewAsCustomer')}
            variant="secondary"
            textVariant="bodySmall"
            fullWidth={false}
            style={styles.rowButton}
            onPress={() => navigation.navigate('AdminMenuCustomerPreview', { item, initialLanguage: language })}
          />
          <AppButton
            title={t('admin.editProduct')}
            variant="ghost"
            textVariant="bodySmall"
            fullWidth={false}
            style={styles.rowButton}
            onPress={() => navigation.navigate('AdminMenuProductEditor', { item, sectionId: section.id })}
          />
          <Pressable
            style={styles.iconButton}
            onPress={() => openProductActions(section, item)}
            accessibilityRole="button"
            accessibilityLabel={t('admin.moreActions')}>
            {mutatingEntityId === item.id ? (
              <AppText variant="caption" color={theme.colors.textSecondary}>
                ...
              </AppText>
            ) : (
              <Ionicons name="ellipsis-horizontal" size={theme.iconSizes.md} color={theme.colors.primary700} />
            )}
          </Pressable>
        </View> : null}
      </Pressable>
    );
  };

  if (loading && sections.length === 0) return <DetailPageSkeleton isRTL={isRTL} sections={4} />;
  if (error && sections.length === 0) return <EmptyState title={t('common.error')} subtitle={error} actionLabel={t('common.retry')} onAction={() => void load()} />;

  return (
    <AppShell refreshing={refreshing} onRefresh={() => void load(true)}>
      <View style={[styles.headerRow, mirroredRow(isRTL)]}>
        <View style={styles.headerCopy}>
          <AppText variant="h1">{t('admin.menuEditorTitle')}</AppText>
          <AppText variant="bodySmall" color={theme.colors.textSecondary}>
            {t('admin.menuEditorSubtitle')}
          </AppText>
        </View>
      </View>

      <AppCard style={[styles.orderingCard, !orderingEnabled ? styles.orderingCardPaused : null]}>
        <View style={[styles.orderingRow, mirroredRow(isRTL)]}>
          <View style={styles.orderingCopy}>
            <AppText variant="h3">{t('admin.orderingStatus')}</AppText>
            <BadgeChip
              label={orderingEnabled ? t('admin.acceptingOrders') : t('admin.orderingPaused')}
              tone={orderingEnabled ? 'success' : 'warning'}
            />
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              {t('admin.orderingStatusHelp')}
            </AppText>
          </View>
          <Switch
            value={orderingEnabled}
            disabled={orderingMutating}
            onValueChange={updateOrderingStatus}
            accessibilityLabel={t('admin.orderingStatus')}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary300 }}
            thumbColor={orderingEnabled ? theme.colors.primary700 : theme.colors.textSecondary}
          />
        </View>
      </AppCard>

      <AppCard style={styles.actionsCard}>
        <View style={[styles.primaryActions, isCompact ? styles.primaryActionsCompact : null]}>
          <AppButton
            title={t('admin.addProduct')}
            onPress={() => navigation.navigate('AdminMenuProductEditor', {})}
            style={styles.primaryActionButton}
          />
          <AppButton
            title={t('admin.addCategory')}
            variant="secondary"
            onPress={() => navigation.navigate('AdminMenuCategoryEditor', {})}
            style={styles.primaryActionButton}
          />
          <AppButton
            title={selectionMode ? t('common.cancel') : t('admin.selectMenuItems')}
            variant="ghost"
            onPress={() => selectionMode ? leaveSelectionMode() : setSelectionMode(true)}
            style={styles.primaryActionButton}
          />
        </View>
        {selectionMode ? (
          <View style={styles.bulkActions}>
            <AppText variant="bodySmall">
              {t('admin.selectionCount', { count: selectedEntities.size })}
            </AppText>
            <View style={[styles.primaryActions, isCompact ? styles.primaryActionsCompact : null]}>
              <AppButton
                title={t('admin.enableSelected')}
                variant="secondary"
                disabled={selectedEntities.size === 0 || bulkMutating}
                onPress={() => updateSelectedAvailability(true)}
                style={styles.primaryActionButton}
              />
              <AppButton
                title={t('admin.disableSelected')}
                disabled={selectedEntities.size === 0 || bulkMutating}
                onPress={() => updateSelectedAvailability(false)}
                style={styles.primaryActionButton}
              />
            </View>
          </View>
        ) : null}
      </AppCard>

      <AppCard style={styles.searchCard}>
        <AppInput label={t('admin.searchMenu')} value={query} onChangeText={setQuery} placeholder={t('admin.searchMenuPlaceholder')} />
        <View style={[styles.filterWrap, mirroredRow(isRTL)]}>
          {([
            { key: 'all', label: t('admin.filterAll') },
            { key: 'active', label: t('admin.active') },
            { key: 'inactive', label: t('admin.inactive') },
            { key: 'issues', label: t('admin.filterIssues') },
          ] as const).map((filter) => (
            <Pressable
              key={filter.key}
              style={[styles.filterChip, filterMode === filter.key ? styles.filterChipActive : null]}
              onPress={() => setFilterMode(filter.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: filterMode === filter.key }}>
              <AppText variant="caption" numberOfLines={2} align="center">
                {filter.label}
              </AppText>
            </Pressable>
          ))}
        </View>
      </AppCard>

      <View style={styles.categoryList}>
        {visibleSections.length === 0 ? (
          <EmptyState title={t('admin.noMenuMatches')} subtitle={t('admin.noMenuMatchesHelp')} actionLabel={t('admin.addProduct')} onAction={() => navigation.navigate('AdminMenuProductEditor', {})} />
        ) : (
          visibleSections.map((section) => {
            const expanded = expandedSectionIds.includes(section.id) || Boolean(query.trim());
            const title = getLocalizedValue(section, language, 'name');
            const groups = buildMenuGroups(section, section.items, language);
            const focusedGroupId = focusedGroupBySection[section.id] ?? 'all';
            const visibleGroups = focusedGroupId === 'all' ? groups : groups.filter((group) => group.id === focusedGroupId);
            const sectionSelected = selectedEntities.has(`section:${section.id}`);
            return (
              <AppCard key={section.id} style={styles.categoryCard}>
                <Pressable
                  style={[styles.categoryHeader, mirroredRow(isRTL), sectionSelected ? styles.selectedRow : null]}
                  onPress={() => selectionMode ? toggleSelected('section', section.id) : toggleExpanded(section.id)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  accessibilityLabel={title}>
                  {selectionMode ? (
                    <Ionicons name={sectionSelected ? 'checkbox' : 'square-outline'} size={theme.iconSizes.lg} color={theme.colors.primary700} />
                  ) : null}
                  <Thumbnail uri={section.image_url} fallbackIcon="restaurant-outline" />
                  <View style={styles.categoryCopy}>
                    <View style={[styles.categoryTitleRow, mirroredRow(isRTL)]}>
                      <AppText variant="h2" numberOfLines={2} style={styles.productTitle}>
                        {title}
                      </AppText>
                      <View style={styles.countBadge}>
                        <AppText variant="caption" color={theme.colors.primary700} align="center">
                          {section.items.length}
                        </AppText>
                      </View>
                    </View>
                    <View style={[styles.badgeRow, mirroredRow(isRTL)]}>
                      <BadgeChip label={section.is_active ? t('admin.active') : t('admin.inactive')} tone={section.is_active ? 'success' : 'default'} />
                      {scheduleKeys.has(`section:${section.id}`) ? <BadgeChip label={t('admin.scheduled')} tone="info" /> : null}
                    </View>
                  </View>
                  {!selectionMode ? <Pressable
                    style={styles.iconButton}
                    onPress={() => openSectionActions(section)}
                    accessibilityRole="button"
                    accessibilityLabel={t('admin.moreActions')}>
                    <Ionicons name="ellipsis-horizontal" size={theme.iconSizes.md} color={theme.colors.primary700} />
                  </Pressable> : null}
                  {!selectionMode ? <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={theme.iconSizes.md} color={theme.colors.primary700} /> : null}
                </Pressable>

                {expanded ? (
                  <View style={styles.categoryBody}>
                    <AppButton
                      title={t('admin.addProductHere')}
                      variant="secondary"
                      onPress={() => navigation.navigate('AdminMenuProductEditor', { sectionId: section.id })}
                    />
                    {section.items.length > 0 ? (
                      <View style={styles.productsStack}>
                        {groups.length > 1 ? (
                          <View style={[styles.subgroupFilterWrap, mirroredRow(isRTL)]}>
                            <Pressable
                              style={[styles.subgroupFilterChip, focusedGroupId === 'all' ? styles.subgroupFilterChipActive : null]}
                              onPress={() => focusGroup(section.id, 'all')}
                              accessibilityRole="button"
                              accessibilityState={{ selected: focusedGroupId === 'all' }}>
                              <AppText variant="caption" numberOfLines={2} align="center">
                                {t('admin.allSubgroups')}
                              </AppText>
                            </Pressable>
                            {groups.map((group) => (
                              <Pressable
                                key={group.id}
                                style={[styles.subgroupFilterChip, focusedGroupId === group.id ? styles.subgroupFilterChipActive : null]}
                                onPress={() => focusGroup(section.id, group.id)}
                                accessibilityRole="button"
                                accessibilityState={{ selected: focusedGroupId === group.id }}>
                                <AppText variant="caption" numberOfLines={2} align="center">
                                  {group.title ?? t('admin.ungroupedProducts')}
                                </AppText>
                              </Pressable>
                            ))}
                          </View>
                        ) : null}

                        {visibleGroups.map((group, groupIndex) => {
                          const groupExpanded = focusedGroupId !== 'all' || !group.title || query.trim() || !collapsedGroupIds.includes(group.id);
                          return (
                            <View key={group.id} style={styles.subgroupBlock}>
                              {group.title ? (
                                <Pressable
                                  style={({ pressed }) => [
                                    styles.subgroupHeader,
                                    mirroredRow(isRTL),
                                    groupExpanded ? styles.subgroupHeaderExpanded : null,
                                    pressed ? styles.rowPressed : null,
                                  ]}
                                  onPress={() => toggleGroup(group.id)}
                                  accessibilityRole="button"
                                  accessibilityState={{ expanded: Boolean(groupExpanded) }}
                                  accessibilityLabel={group.title}>
                                  <View style={[styles.subgroupTitleWrap, mirroredRow(isRTL)]}>
                                    <View style={styles.subgroupAccent} />
                                    <AppText variant="bodySmall" color={theme.colors.primary700} numberOfLines={2} style={styles.productTitle}>
                                      {group.title}
                                    </AppText>
                                  </View>
                                  <View style={[styles.subgroupMetaWrap, mirroredRow(isRTL)]}>
                                    <View style={styles.countBadge}>
                                      <AppText variant="caption" color={theme.colors.primary700} align="center">
                                        {group.data.length}
                                      </AppText>
                                    </View>
                                    <Ionicons
                                      name={groupExpanded ? 'chevron-up' : 'chevron-down'}
                                      size={theme.iconSizes.sm}
                                      color={theme.colors.primary700}
                                    />
                                  </View>
                                </Pressable>
                              ) : null}
                              {groupExpanded ? (
                                <View style={styles.subgroupItemsWrap}>
                                  {group.data.map((item) => renderProductRow(section, item))}
                                </View>
                              ) : null}
                              {groupIndex < visibleGroups.length - 1 ? <View style={styles.groupSeparator} /> : null}
                            </View>
                          );
                        })}
                      </View>
                    ) : (
                      <AppText variant="bodySmall" color={theme.colors.textSecondary}>
                        {t('admin.noProductsInCategory')}
                      </AppText>
                    )}
                  </View>
                ) : null}
              </AppCard>
            );
          })
        )}
      </View>

      <AdminActionSheet
        open={Boolean(actionSheet)}
        title={actionSheet?.title ?? t('admin.moreActions')}
        items={actionSheet?.items ?? []}
        onClose={() => setActionSheet(null)}
      />
    </AppShell>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  actionsCard: {
    padding: theme.spacing.md,
    borderColor: theme.colors.primary100,
  },
  orderingCard: {
    borderColor: theme.colors.primary100,
  },
  orderingCardPaused: {
    borderColor: theme.colors.warning,
  },
  orderingRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  orderingCopy: {
    flex: 1,
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  bulkActions: {
    gap: theme.spacing.sm,
  },
  primaryActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  primaryActionsCompact: {
    flexDirection: 'column',
  },
  primaryActionButton: {
    flex: 1,
  },
  searchCard: {
    gap: theme.spacing.md,
  },
  filterWrap: {
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  filterChip: {
    flexBasis: '23%',
    minHeight: 38,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.sm,
    justifyContent: 'center',
  },
  filterChipActive: {
    borderColor: theme.colors.primary300,
    backgroundColor: theme.colors.primary50,
  },
  categoryList: {
    gap: theme.spacing.md,
  },
  categoryCard: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  categoryHeader: {
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  thumbnail: {
    width: 58,
    height: 58,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary100,
    backgroundColor: theme.colors.secondarySand,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryCopy: {
    flex: 1,
    gap: theme.spacing.sm,
  },
  categoryTitleRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  productTitle: {
    flex: 1,
  },
  countBadge: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.primary100,
    backgroundColor: theme.colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: {
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary100,
    backgroundColor: theme.colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBody: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.md,
    gap: theme.spacing.md,
  },
  productsStack: {
    gap: theme.spacing.sm,
  },
  subgroupFilterWrap: {
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  subgroupFilterChip: {
    flexBasis: '48%',
    minHeight: 42,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.sm,
    justifyContent: 'center',
  },
  subgroupFilterChipActive: {
    borderColor: theme.colors.primary300,
    backgroundColor: theme.colors.primary50,
  },
  subgroupBlock: {
    gap: theme.spacing.sm,
  },
  subgroupHeader: {
    minHeight: 48,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary100,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  subgroupHeaderExpanded: {
    backgroundColor: theme.colors.primary50,
  },
  subgroupTitleWrap: {
    flex: 1,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  subgroupAccent: {
    width: 4,
    height: 28,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.primary300,
  },
  subgroupMetaWrap: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  subgroupItemsWrap: {
    gap: theme.spacing.sm,
  },
  groupSeparator: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.xs,
  },
  productRow: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.secondaryCream,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  rowPressed: {
    opacity: 0.94,
  },
  selectedRow: {
    borderColor: theme.colors.primary500,
    backgroundColor: theme.colors.primary50,
  },
  productTopRow: {
    alignItems: 'stretch',
    gap: theme.spacing.md,
  },
  productCopy: {
    flex: 1,
    gap: theme.spacing.sm,
  },
  productTitleRow: {
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  productActionRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: theme.spacing.sm,
  },
  productActionRowCompact: {
    flexWrap: 'wrap',
  },
  rowButton: {
    flex: 1,
    minHeight: 42,
    paddingHorizontal: theme.spacing.sm,
  },
});
