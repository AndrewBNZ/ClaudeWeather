// Config for each selectable data type
export const DATA_TYPES = {
  temperature: {
    id: 'temperature',
    label: 'Temperature',
    icon: '🌡️',
    hourlyKey: 'temperature_2m',
    dailyMaxKey: 'temperature_2m_max',
    dailyMinKey: 'temperature_2m_min',
    color: '#f97316',
    getUnit: (units) => units === 'metric' ? '°C' : '°F',
    decimals: 1,
    floatingBar: true,
  },
  rain: {
    id: 'rain',
    label: 'Rain',
    icon: '🌧️',
    hourlyKey: 'precipitation',
    dailyMaxKey: 'precipitation_sum',
    dailyMinKey: null,
    color: '#3b82f6',
    getUnit: (units) => units === 'metric' ? 'mm' : 'in',
    decimals: 2,
    floatingBar: false,
  },
  wind: {
    id: 'wind',
    label: 'Wind',
    icon: '💨',
    hourlyKey: 'wind_speed_10m',
    dailyMaxKey: 'wind_speed_10m_max',
    dailyMinKey: null,
    color: '#06b6d4',
    getUnit: (units) => units === 'metric' ? 'km/h' : 'mph',
    decimals: 1,
    floatingBar: false,
  },
  feelsLike: {
    id: 'feelsLike',
    label: 'Feels Like',
    icon: '🤔',
    hourlyKey: 'apparent_temperature',
    dailyMaxKey: 'apparent_temperature_max',
    dailyMinKey: 'apparent_temperature_min',
    color: '#a855f7',
    getUnit: (units) => units === 'metric' ? '°C' : '°F',
    decimals: 1,
    floatingBar: true,
  },
  humidity: {
    id: 'humidity',
    label: 'Humidity',
    icon: '💧',
    hourlyKey: 'relative_humidity_2m',
    dailyMaxKey: null, // computed from hourly
    dailyMinKey: null,
    color: '#14b8a6',
    getUnit: () => '%',
    decimals: 0,
    floatingBar: false,
  },
  uv: {
    id: 'uv',
    label: 'UV Index',
    icon: '☀️',
    hourlyKey: 'uv_index',
    dailyMaxKey: 'uv_index_max',
    dailyMinKey: null,
    color: '#eab308',
    getUnit: () => '',
    decimals: 1,
    floatingBar: false,
  },
}

export const DATA_TYPE_LIST = Object.values(DATA_TYPES)

// Compute daily average humidity from hourly data (7 days × 24 hours)
export function getDailyHumidityFromHourly(hourly) {
  return Array.from({ length: 14 }, (_, d) => {
    const slice = hourly.relative_humidity_2m.slice(d * 24, d * 24 + 24)
    const valid = slice.filter(v => v != null)
    return valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null
  })
}
