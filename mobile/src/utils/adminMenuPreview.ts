import { HomeMenuGroup, HomeMenuSection } from '@/screens/home/types';
import { Item, MenuEntityType, MenuSchedule, Promotion, PromotionTarget, PromotionTargetInput, Section } from '@/types/api';
import { getLocalizedValue } from '@/utils/i18n';

export type AdminTargetOption = {
  entity_type: MenuEntityType;
  entity_id: string;
  label: string;
  label_en: string;
  label_ar: string;
  level: MenuEntityType;
};

export type AdminSubgroupOption = {
  id: string;
  section_id: string;
  title: string;
  title_en: string;
  title_ar: string;
  item_ids: string[];
};

export type PreviewScheduleInput = Pick<MenuSchedule, 'entity_type' | 'entity_id' | 'start_time' | 'end_time' | 'days_of_week' | 'is_active'>;

export const targetKey = (target: Pick<PromotionTargetInput, 'entity_type' | 'entity_id'>) =>
  `${target.entity_type}:${target.entity_id}`;

const parseTime = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number);
  return {
    minutes: (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0),
  };
};

const isTimeInWindow = (start: number, end: number, current: number) => {
  if (start <= end) return start <= current && current <= end;
  return current >= start || current <= end;
};

export const isPreviewScheduleActiveNow = (schedule: PreviewScheduleInput, now = new Date()) => {
  if (!schedule.is_active) return false;
  const jsDay = now.getDay();
  const storeDay = (jsDay + 6) % 7;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = parseTime(schedule.start_time).minutes;
  const endMinutes = parseTime(schedule.end_time).minutes;
  let scheduleDay = storeDay;

  if (startMinutes > endMinutes) {
    if (currentMinutes <= endMinutes) scheduleDay = (storeDay + 6) % 7;
    else if (currentMinutes < startMinutes) return false;
  }

  if (schedule.days_of_week.length > 0 && !schedule.days_of_week.includes(scheduleDay)) return false;
  return isTimeInWindow(startMinutes, endMinutes, currentMinutes);
};

const scheduleIndexFor = (schedules: PreviewScheduleInput[]) => {
  const index = new Map<string, PreviewScheduleInput[]>();
  schedules
    .filter((schedule) => schedule.is_active)
    .forEach((schedule) => {
      const key = targetKey(schedule);
      index.set(key, [...(index.get(key) ?? []), schedule]);
    });
  return index;
};

const isEntityAvailable = (
  index: Map<string, PreviewScheduleInput[]>,
  entity_type: MenuEntityType,
  entity_id: string,
  now: Date,
) => {
  const schedules = index.get(`${entity_type}:${entity_id}`) ?? [];
  if (schedules.length === 0) return true;
  return schedules.some((schedule) => isPreviewScheduleActiveNow(schedule, now));
};

export const applyPreviewSchedulesToMenu = (
  sections: Section[],
  schedules: PreviewScheduleInput[],
  now = new Date(),
): Section[] => {
  const scheduleIndex = scheduleIndexFor(schedules);

  return sections
    .filter((section) => section.is_active && isEntityAvailable(scheduleIndex, 'section', section.id, now))
    .map((section) => ({
      ...section,
      items: section.items
        .filter((item) => item.is_active && isEntityAvailable(scheduleIndex, 'item', item.id, now))
        .map((item) => ({
          ...item,
          item_types: item.item_types
            .filter((itemType) => itemType.is_active && isEntityAvailable(scheduleIndex, 'type', itemType.id, now))
            .map((itemType) => ({
              ...itemType,
              sizes: itemType.sizes
                .filter((size) => size.is_active && isEntityAvailable(scheduleIndex, 'size', size.id, now))
                .map((size) => ({
                  ...size,
                  addons: size.addons.filter(
                    (addon) => addon.is_active && isEntityAvailable(scheduleIndex, 'addon', addon.id, now),
                  ),
                }))
                .filter((size) => size.is_active),
            }))
            .filter((itemType) => itemType.sizes.length > 0),
        }))
        .filter((item) => item.item_types.length > 0),
    }))
    .filter((section) => section.items.length > 0);
};

export const buildHomeMenuGroups = (section: Section, items: Item[], language: 'en' | 'ar'): HomeMenuGroup[] => {
  const groups: HomeMenuGroup[] = [];
  const groupIndexByTitle = new Map<string, number>();

  items.forEach((item) => {
    const rawGroupTitle = getLocalizedValue(item, language, 'description').trim();
    const groupTitle = rawGroupTitle.length > 0 ? rawGroupTitle : null;
    const groupKey = groupTitle ?? '__ungrouped__';
    const existingIndex = groupIndexByTitle.get(groupKey);

    if (existingIndex === undefined) {
      groupIndexByTitle.set(groupKey, groups.length);
      groups.push({ id: `${section.id}-${groupKey}`, title: groupTitle, data: [item] });
      return;
    }

    groups[existingIndex].data.push(item);
  });

  return groups;
};

export const buildHomeMenuSections = (sections: Section[], language: 'en' | 'ar'): HomeMenuSection[] =>
  sections.map((section) => {
    const activeItems = section.items.filter((item) => item.is_active);
    return {
      id: section.id,
      title: getLocalizedValue(section, language, 'name'),
      imageUrl: section.image_url,
      data: activeItems,
      groups: buildHomeMenuGroups(section, activeItems, language),
    };
  });

export const buildAdminTargetOptions = (sections: Section[], language: 'en' | 'ar'): AdminTargetOption[] => {
  const options: AdminTargetOption[] = [];
  sections.forEach((section) => {
    const sectionLabel = getLocalizedValue(section, language, 'name');
    options.push({
      entity_type: 'section',
      entity_id: section.id,
      label: sectionLabel,
      label_en: section.name_en,
      label_ar: section.name_ar,
      level: 'section',
    });

    section.items.forEach((item) => {
      const itemLabel = `${sectionLabel} > ${getLocalizedValue(item, language, 'name')}`;
      options.push({
        entity_type: 'item',
        entity_id: item.id,
        label: itemLabel,
        label_en: `${section.name_en} > ${item.name_en}`,
        label_ar: `${section.name_ar} > ${item.name_ar}`,
        level: 'item',
      });

      item.item_types.forEach((itemType) => {
        const typeLabel = `${itemLabel} > ${getLocalizedValue(itemType, language, 'name')}`;
        options.push({
          entity_type: 'type',
          entity_id: itemType.id,
          label: typeLabel,
          label_en: `${section.name_en} > ${item.name_en} > ${itemType.name_en}`,
          label_ar: `${section.name_ar} > ${item.name_ar} > ${itemType.name_ar}`,
          level: 'type',
        });

        itemType.sizes.forEach((size) => {
          const sizeLabel = `${typeLabel} > ${getLocalizedValue(size, language, 'name')}`;
          options.push({
            entity_type: 'size',
            entity_id: size.id,
            label: sizeLabel,
            label_en: `${section.name_en} > ${item.name_en} > ${itemType.name_en} > ${size.name_en}`,
            label_ar: `${section.name_ar} > ${item.name_ar} > ${itemType.name_ar} > ${size.name_ar}`,
            level: 'size',
          });

          size.addons.forEach((addon) => {
            options.push({
              entity_type: 'addon',
              entity_id: addon.id,
              label: `${sizeLabel} > ${getLocalizedValue(addon, language, 'name')}`,
              label_en: `${section.name_en} > ${item.name_en} > ${itemType.name_en} > ${size.name_en} > ${addon.name_en}`,
              label_ar: `${section.name_ar} > ${item.name_ar} > ${itemType.name_ar} > ${size.name_ar} > ${addon.name_ar}`,
              level: 'addon',
            });
          });
        });
      });
    });
  });
  return options;
};

export const buildAdminSubgroupOptions = (sections: Section[], language: 'en' | 'ar'): AdminSubgroupOption[] => {
  const options: AdminSubgroupOption[] = [];

  sections.forEach((section) => {
    const groups = new Map<string, AdminSubgroupOption>();
    section.items.forEach((item) => {
      const title = getLocalizedValue(item, language, 'description').trim();
      const titleEn = (item.description_en ?? '').trim();
      const titleAr = (item.description_ar ?? '').trim();
      if (!title && !titleEn && !titleAr) return;
      const key = `${section.id}:${titleEn || title}:${titleAr || title}`;
      const existing = groups.get(key);
      if (existing) {
        existing.item_ids.push(item.id);
        return;
      }
      groups.set(key, {
        id: key,
        section_id: section.id,
        title: title || titleEn || titleAr,
        title_en: titleEn || title || titleAr,
        title_ar: titleAr || title || titleEn,
        item_ids: [item.id],
      });
    });
    options.push(...groups.values());
  });

  return options;
};

export const buildPromotionTargets = (
  targets: PromotionTargetInput[],
  group: PromotionTarget['target_group'],
  promotionId: string,
  targetOptionMap: Map<string, AdminTargetOption>,
): PromotionTarget[] =>
  targets.map((target, index) => {
    const option = targetOptionMap.get(targetKey(target));
    return {
      id: `${promotionId}-${group}-${index}`,
      promotion_id: promotionId,
      target_group: group,
      entity_type: target.entity_type,
      entity_id: target.entity_id,
      entity_name_en: option?.label_en ?? null,
      entity_name_ar: option?.label_ar ?? null,
    };
  });

export const uniqueItemTargets = (itemIds: string[]): PromotionTargetInput[] =>
  Array.from(new Set(itemIds)).map((entity_id) => ({ entity_type: 'item', entity_id }));

export const mergePreviewPromotion = (promotions: Promotion[], draftPromotion?: Promotion) => {
  if (!draftPromotion) return promotions;
  return [draftPromotion, ...promotions.filter((promotion) => promotion.id !== draftPromotion.id)];
};
