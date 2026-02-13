import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { RootNavigator } from './navigation/RootNavigator';
import {
  ensureDefaultReminderPreferences,
  ensureDefaultReminders,
} from '../data/repos/remindersRepo';
import { getProfile } from '../data/repos/profileRepo';
import { setOnboardingComplete } from './store/appSlice';

export function AppProviders() {
  useEffect(() => {
    const bootstrap = async () => {
      await ensureDefaultReminders();
      await ensureDefaultReminderPreferences();
      const profile = await getProfile();
      if (profile) {
        store.dispatch(setOnboardingComplete(true));
      }
    };

    bootstrap();
  }, []);

  return (
    <Provider store={store}>
      <GestureHandlerRootView style={styles.root}>
        <RootNavigator />
      </GestureHandlerRootView>
    </Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
