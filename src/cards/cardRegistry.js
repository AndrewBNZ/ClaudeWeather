import { defineAsyncComponent } from 'vue'

export const CARD_REGISTRY = {
  combinedHourly:   defineAsyncComponent(() => import('./HourlyForecastCard.vue')),
  dailyForecast:    defineAsyncComponent(() => import('./DailyForecastCard.vue')),
  combinedForecast: defineAsyncComponent(() => import('./CombinedForecastCard.vue')),
  sunriseMoon:     defineAsyncComponent(() => import('./SunriseMoonCard.vue')),
  radar:           defineAsyncComponent(() => import('./RadarCard.vue')),
  customAlerts:    defineAsyncComponent(() => import('./CustomAlertsCard.vue')),
  weatherWarnings: defineAsyncComponent(() => import('./WeatherWarningsCard.vue')),
}
