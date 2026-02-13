export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
};

export type MainStackParamList = {
  Tabs: undefined;
  Diary: undefined;
  Stats: undefined;
  Reminders: undefined;
  Settings: undefined;
  Diagnostics: undefined;
  Labs: undefined;
  Routine: undefined;
  Wellness: undefined;
  DiaryCalendar: undefined;
  DiaryEntry: {
    entryDate: number;
  };
};

export type MainTabParamList = {
  Today: undefined;
  CheckIn: undefined;
  Analytics: undefined;
  Care: undefined;
  Profile: undefined;
};
