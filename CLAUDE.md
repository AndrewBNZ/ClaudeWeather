# ClaudeWeather — Project Instructions

## Stack

- **Vue 3 + Vite** — no UI framework, custom CSS only
- **Chart.js** — hourly/daily charts
- **Leaflet** — radar map
- **PWA** — vite-plugin-pwa
- **APIs:** Open-Meteo (forecast, no key), Open-Meteo geocoding, CAP alerts (weather warnings), WeatherLink PWS, Tempest

## Dev Commands

```
npm run dev      # dev server → http://localhost:5173
npm run build    # production build
npm run preview  # preview production build
```

Node/npm are not on the bash PATH — use full paths from memory if running via shell.

## Key Files

| File | Responsibility |
|------|---------------|
| `src/App.vue` | Root state, location, units, card layout orchestration |
| `src/config.js` | App name + localStorage key prefix |
| `src/composables/useSettings.js` | All persistent settings (units, tiles, cards, sim, theme, etc.) |
| `src/utils/dataTypes.js` | `DATA_TYPES` config + `DATA_TYPE_LIST`, `getDailyHumidityFromHourly` |
| `src/utils/tileIcons.js` | `TILE_ICONS` — canonical SVG icon set, keyed by data type ID |
| `src/utils/weatherCodes.js` | WMO code → label, `getCompassDir` |
| `src/utils/moonPhase.js` | Moon phase calculation |
| `src/cards/cardRegistry.js` | Async card component map |
| `src/cards/cardSettingsRegistry.js` | Card-specific settings component map |
| `src/services/weatherApi.js` | Open-Meteo forecast fetch |
| `src/services/adapters/openMeteo.js` | Response normalisation |
| `src/services/geocoding.js` | `searchLocations`, `formatLocationName`, `reverseGeocode` |
| `src/services/capAlerts.js` | CAP weather warnings fetch + parse |
| `src/services/pwsApi.js` | WeatherLink PWS integration |
| `src/services/tempestApi.js` / `tempestWs.js` | Tempest station REST + WebSocket |

## Design Rules

- **No UI framework** — all styling is custom CSS with a dark glassmorphism theme
- **SVG icons only** — use `TILE_ICONS` from `tileIcons.js` via `v-html`. Do not add emoji icon fields to `DATA_TYPES`
- **Settings panel order** — when adding new rows to the settings panel, insert above the Weather Simulator row. Weather Simulator is always second-to-last; Reset is always last

## API Notes

- Open-Meteo is free with no API key required
- User is in New Zealand — Open-Meteo can underestimate temperature due to elevation mismatch; consider `cell_selection=nearest` when relevant
- localStorage keys are prefixed with `claudeweather-` (via `APP_STORAGE_PREFIX`)
