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
    icon: '☀️',
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
    icon: '☁️',
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
    icon: '↕️',
    hourlyKey: 'surface_pressure',
    dailyMaxKey: null,
    dailyMinKey: null,
    dailyAvg: true,
    color: '#818cf8',
    getUnit: () => 'hPa',
    decimals: 0,
    floatingBar: false,
  },
  visibility: {
    id: 'visibility',
    label: 'Visibility',
    icon: '👁️',
    hourlyKey: 'visibility',
    dailyMaxKey: null,
    dailyMinKey: null,
    dailyAvg: true,
    color: '#22d3ee',
    getUnit: (units) => units === 'metric' ? 'km' : 'mi',
    decimals: 1,
    floatingBar: false,
    scale: (v, units) => units === 'metric' ? v / 1000 : v / 1609.344,
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
