import { defineAsyncComponent } from 'vue'

// Maps card types to their settings component and display title.
// Cards not listed here have no configurable settings (no long-press target).
export const CARD_SETTINGS_REGISTRY = {
  dailyForecast: {
    title:     'Daily Forecast',
    component: defineAsyncComponent(() => import('../components/settings/DailyForecastSettings.vue')),
  },
  combinedHourly: {
    title:     'Hourly Forecast',
    component: defineAsyncComponent(() => import('../components/settings/HourlyForecastSettings.vue')),
  },
  customAlerts: {
    title:     'Custom Alerts',
    component: defineAsyncComponent(() => import('../components/settings/CustomAlertsSettings.vue')),
  },
  weatherWarnings: {
    title:     'Weather Warnings',
    component: defineAsyncComponent(() => import('../components/settings/WeatherWarningsSettings.vue')),
  },
}
