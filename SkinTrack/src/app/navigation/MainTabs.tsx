import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../localization';
import { colors } from '../theme';
import { MainTabParamList } from './types';
import { AnalyticsScreen } from '../../features/analytics/AnalyticsScreen';
import { CareScreen } from '../../features/care/CareScreen';
import { CheckinScreen } from '../../features/checkin/CheckinScreen';
import { ProfileScreen } from '../../features/profile/ProfileScreen';
import { TodayScreen } from '../../features/today/TodayScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Text style={[styles.iconText, focused && styles.iconTextActive]}>
        {icon}
      </Text>
    </View>
  );
}

const renderTodayIcon = ({ focused }: { focused: boolean }) => (
  <TabIcon icon="●" focused={focused} />
);
const renderCheckinIcon = ({ focused }: { focused: boolean }) => (
  <TabIcon icon="✓" focused={focused} />
);
const renderAnalyticsIcon = ({ focused }: { focused: boolean }) => (
  <TabIcon icon="◔" focused={focused} />
);
const renderCareIcon = ({ focused }: { focused: boolean }) => (
  <TabIcon icon="✦" focused={focused} />
);
const renderProfileIcon = ({ focused }: { focused: boolean }) => (
  <TabIcon icon="◉" focused={focused} />
);

export function MainTabs() {
  const { t } = useI18n();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryDeep,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: 12,
          height: 70,
          borderRadius: 24,
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: colors.border,
          paddingTop: 6,
          shadowColor: colors.primaryDeep,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 16,
          elevation: 5,
        },
        tabBarLabelStyle: {
          fontSize: 11,
        },
      }}
    >
      <Tab.Screen
        name="Today"
        component={TodayScreen}
        options={{
          title: t('tabs.today'),
          tabBarIcon: renderTodayIcon,
        }}
      />
      <Tab.Screen
        name="CheckIn"
        component={CheckinScreen}
        options={{
          title: t('tabs.checkin'),
          tabBarIcon: renderCheckinIcon,
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          title: t('tabs.analytics'),
          tabBarIcon: renderAnalyticsIcon,
        }}
      />
      <Tab.Screen
        name="Care"
        component={CareScreen}
        options={{
          title: t('tabs.care'),
          tabBarIcon: renderCareIcon,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: t('tabs.profile'),
          tabBarIcon: renderProfileIcon,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  iconWrapActive: {
    backgroundColor: colors.accentSoft,
  },
  iconText: {
    fontSize: 12,
    color: colors.muted,
  },
  iconTextActive: {
    color: colors.primaryDeep,
  },
});
