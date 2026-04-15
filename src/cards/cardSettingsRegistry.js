import { defineAsyncComponent } from 'vue'

// Maps card types to their settings component and display title.
// Cards not listed here have no configurable settings (no long-press target).
// Optional `props` object is forwarded to the settings component via CardSettingsSheet.
export const CARD_SETTINGS_REGISTRY = {
  dailyForecast: {
    title:     'Daily Forecast',
    component: defineAsyncComponent(() => import('../components/settings/ForecastSettings.vue')),
    props:     { type: 'daily' },
  },
  combinedHourly: {
    title:     'Hourly Forecast',
    component: defineAsyncComponent(() => import('../components/settings/ForecastSettings.vue')),
    props:     { type: 'hourly' },
  },
  combinedForecast: {
    title:     'Combined Forecast',
    component: defineAsyncComponent(() => import('../components/settings/ForecastSettings.vue')),
    props:     { type: 'combined' },
  },
  daySegment: {
    title:     'Day Segments',
    component: defineAsyncComponent(() => import('../components/settings/DaySegmentSettings.vue')),
  },
  customAlerts: {
    title:     'Custom Alerts',
    component: defineAsyncComponent(() => import('../components/settings/CustomAlertsSettings.vue')),
  },
  weatherWarnings: {
    title:     'Weather Warnings',
    component: defineAsyncComponent(() => import('../components/settings/WeatherWarningsSettings.vue')),
  },
  radar: {
    title:     'Radar',
    component: defineAsyncComponent(() => import('../components/settings/RadarSettings.vue')),
  },
}
