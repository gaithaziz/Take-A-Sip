export type Locale = 'en' | 'ar';

export type Dictionary = {
  common: {
    dashboard: string;
    menuEditor: string;
    promotions: string;
    loyaltyRules: string;
    scheduling: string;
    users: string;
    active: string;
    inactive: string;
    save: string;
    cancel: string;
    create: string;
    search: string;
    loading: string;
    noData: string;
  };
};

export const dictionaries: Record<Locale, Dictionary> = {
  en: {
    common: {
      dashboard: 'Dashboard',
      menuEditor: 'Menu Editor',
      promotions: 'Promotions',
      loyaltyRules: 'Loyalty Rules',
      scheduling: 'Scheduling',
      users: 'Users',
      active: 'Active',
      inactive: 'Inactive',
      save: 'Save',
      cancel: 'Cancel',
      create: 'Create',
      search: 'Search',
      loading: 'Loading',
      noData: 'No data available',
    },
  },
  ar: {
    common: {
      dashboard: '???? ??????',
      menuEditor: '???? ???????',
      promotions: '??????',
      loyaltyRules: '????? ??????',
      scheduling: '???????',
      users: '??????????',
      active: '???',
      inactive: '??? ???',
      save: '???',
      cancel: '?????',
      create: '?????',
      search: '???',
      loading: '??? ???????',
      noData: '?? ???? ??????',
    },
  },
};

