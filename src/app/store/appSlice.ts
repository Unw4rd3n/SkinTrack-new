import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type AppLocale = 'ru' | 'en';

type AppState = {
  onboardingComplete: boolean;
  locale: AppLocale;
};

const initialState: AppState = {
  onboardingComplete: false,
  locale: 'ru',
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setOnboardingComplete(state, action: PayloadAction<boolean>) {
      state.onboardingComplete = action.payload;
    },
    setLocale(state, action: PayloadAction<AppLocale>) {
      state.locale = action.payload;
    },
  },
});

export const { setOnboardingComplete, setLocale } = appSlice.actions;
export default appSlice.reducer;
