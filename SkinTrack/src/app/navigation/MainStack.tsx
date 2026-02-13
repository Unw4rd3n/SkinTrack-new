import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainStackParamList } from './types';
import { MainTabs } from './MainTabs';
import { StatsScreen } from '../../features/stats/StatsScreen';
import { RemindersScreen } from '../../features/reminders/RemindersScreen';
import { SettingsScreen } from '../../features/settings/SettingsScreen';
import { DiagnosticsScreen } from '../../features/diagnostics/DiagnosticsScreen';
import { LabsScreen } from '../../features/labs/LabsScreen';
import { RoutineScreen } from '../../features/routine/RoutineScreen';
import { WellnessScreen } from '../../features/wellness/WellnessScreen';
import { DiaryScreen } from '../../features/diary/DiaryScreen';
import { DiaryEntryScreen } from '../../features/diary/DiaryEntryScreen';
import { DiaryCalendarScreen } from '../../features/diary/DiaryCalendarScreen';
import { colors, fonts } from '../theme';
import { useI18n } from '../localization';

const Stack = createNativeStackNavigator<MainStackParamList>();

export function MainStack() {
  const { t } = useI18n();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.heading },
        headerBackTitle: t('common.back'),
      }}
    >
      <Stack.Screen
        name="Tabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Diary"
        component={DiaryScreen}
        options={{ title: 'Дневник' }}
      />
      <Stack.Screen
        name="Stats"
        component={StatsScreen}
        options={{ title: t('tabs.analytics') }}
      />
      <Stack.Screen
        name="Diagnostics"
        component={DiagnosticsScreen}
        options={{ title: 'Диагностика' }}
      />
      <Stack.Screen
        name="Labs"
        component={LabsScreen}
        options={{ title: 'Анализы' }}
      />
      <Stack.Screen
        name="Routine"
        component={RoutineScreen}
        options={{ title: t('care.title') }}
      />
      <Stack.Screen
        name="Wellness"
        component={WellnessScreen}
        options={{ title: 'Самочувствие' }}
      />
      <Stack.Screen
        name="Reminders"
        component={RemindersScreen}
        options={{ title: 'Напоминания' }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: t('tabs.profile') }}
      />
      <Stack.Screen
        name="DiaryEntry"
        component={DiaryEntryScreen}
        options={{ title: t('checkin.title') }}
      />
      <Stack.Screen
        name="DiaryCalendar"
        component={DiaryCalendarScreen}
        options={{ title: 'Календарь' }}
      />
    </Stack.Navigator>
  );
}
