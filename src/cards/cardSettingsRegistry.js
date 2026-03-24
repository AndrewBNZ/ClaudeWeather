import { defineAsyncComponent } from 'vue'

// Maps card types to their settings component and display title.
// Cards not listed here have no configurable settings (no long-press target).
export const CARD_SETTINGS_REGISTRY = {
  dailyForecast: {
    title:     'Daily Forecast',
    component: defineAsyncComponent(() => import('../components/settings/DailyForecastSettings.vue')),
  },
}
