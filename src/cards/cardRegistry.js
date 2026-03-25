import { defineAsyncComponent } from 'vue'

export const CARD_REGISTRY = {
  //detailTiles:    defineAsyncComponent(() => import('./DetailTilesCard.vue')),
  combinedHourly: defineAsyncComponent(() => import('./HourlyForecastCard.vue')),
  dailyForecast:  defineAsyncComponent(() => import('./DailyForecastCard.vue')),
  //hourlyStrip:    defineAsyncComponent(() => import('./HourlyStripCard.vue')),
  sunriseMoon:    defineAsyncComponent(() => import('./SunriseMoonCard.vue')),
  radar:          defineAsyncComponent(() => import('./RadarCard.vue')),
}
