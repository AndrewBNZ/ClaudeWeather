// Config for each selectable data type.
// getUnit(unitPrefs) and scale(v, unitPrefs) receive the full unitPrefs object.
export const DATA_TYPES = {
  temperature: {
    id: 'temperature',
    label: 'Temperature',
    hourlyKey: 'temperature_2m',
    dailyMaxKey: 'temperature_2m_max',
    dailyMinKey: 'temperature_2m_min',
    color: '#f97316',
    getUnit: (p) => p.temperature === 'fahrenheit' ? '°F' : '°C',
    decimals: 1,
    floatingBar: true,
  },
  rain: {
    id: 'rain',
    label: 'Rain',
    hourlyKey: 'precipitation',
    dailyMaxKey: 'precipitation_sum',
    dailyMinKey: null,
    color: '#3b82f6',
    getUnit: (p) => p.precipitation === 'inch' ? 'in' : 'mm',
    decimals: 2,
    floatingBar: false,
  },
  wind: {
    id: 'wind',
    label: 'Wind',
    hourlyKey: 'wind_speed_10m',
    dailyMaxKey: 'wind_speed_10m_max',
    dailyMinKey: null,
    color: '#06b6d4',
    getUnit: (p) => ({ kmh: 'km/h', mph: 'mph', ms: 'm/s', kn: 'kn' })[p.wind] ?? 'km/h',
    decimals: 1,
    floatingBar: false,
  },
  feelsLike: {
    id: 'feelsLike',
    label: 'Feels Like',
    hourlyKey: 'apparent_temperature',
    dailyMaxKey: 'apparent_temperature_max',
    dailyMinKey: 'apparent_temperature_min',
    color: '#a855f7',
    getUnit: (p) => p.temperature === 'fahrenheit' ? '°F' : '°C',
    decimals: 1,
    floatingBar: true,
  },
  humidity: {
    id: 'humidity',
    label: 'Humidity',
    hourlyKey: 'relative_humidity_2m',
    dailyMaxKey: null,
    dailyMinKey: null,
    dailyAvg: true,
    color: '#14b8a6',
    getUnit: () => '%',
    decimals: 0,
    floatingBar: false,
  },
  uv: {
    id: 'uv',
    label: 'UV Index',
    hourlyKey: 'uv_index',
    dailyMaxKey: 'uv_index_max',
    dailyMinKey: null,
    color: '#eab308',
    getUnit: () => '',
    decimals: 1,
    floatingBar: false,
  },
  cloudCover: {
    id: 'cloudCover',
    label: 'Cloud Cover',
    hourlyKey: 'cloud_cover',
    dailyMaxKey: null,
    dailyMinKey: null,
    dailyAvg: true,
    color: '#94a3b8',
    getUnit: () => '%',
    decimals: 0,
    floatingBar: false,
  },
  pressure: {
    id: 'pressure',
    label: 'Pressure',
    hourlyKey: 'surface_pressure',
    dailyMaxKey: null,
    dailyMinKey: null,
    dailyAvg: true,
    color: '#818cf8',
    getUnit: (p) => ({ hpa: 'hPa', inhg: 'inHg', mmhg: 'mmHg' })[p.pressure] ?? 'hPa',
    decimals: 0,
    getDecimals: (p) => p.pressure === 'inhg' ? 2 : p.pressure === 'mmhg' ? 1 : 0,
    floatingBar: false,
    scale: (v, p) => {
      if (p.pressure === 'inhg') return v * 0.02953
      if (p.pressure === 'mmhg') return v * 0.75006
      return v
    },
  },
  visibility: {
    id: 'visibility',
    label: 'Visibility',
    hourlyKey: 'visibility',
    dailyMaxKey: null,
    dailyMinKey: null,
    dailyAvg: true,
    color: '#22d3ee',
    getUnit: (p) => p.visibility === 'mi' ? 'mi' : 'km',
    decimals: 1,
    floatingBar: false,
    scale: (v, p) => p.visibility === 'mi' ? v / 1609.344 : v / 1000,
  },
  radar: {
    id: 'radar',
    label: 'Radar',
    isMap: true,
    color: '#10b981',
    getUnit: () => '',
  },
}

export const DATA_TYPE_LIST = Object.values(DATA_TYPES)

// Generic: daily average from hourly for any key
export function getDailyAvgFromHourly(hourly, key) {
  const arr = hourly[key] ?? []
  return Array.from({ length: 14 }, (_, d) => {
    const slice = arr.slice(d * 24, d * 24 + 24)
    const valid = slice.filter(v => v != null)
    return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null
  })
}

// Compute daily average humidity from hourly data
export function getDailyHumidityFromHourly(hourly) {
  return getDailyAvgFromHourly(hourly, 'relative_humidity_2m')
}

// Returns the display unit string for a given data type, or '' for unit-less types
export function getUnitLabel(activeType, unitPrefs) {
  const cfg = DATA_TYPES[activeType]
  if (!cfg || cfg.id === 'humidity' || cfg.id === 'cloudCover') return ''
  return cfg.getUnit(unitPrefs)
}
