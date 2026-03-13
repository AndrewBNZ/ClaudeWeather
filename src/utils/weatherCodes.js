// WMO Weather Interpretation Codes
export const WMO = {
  0:  { label: 'Clear sky',                  emoji: '☀️' },
  1:  { label: 'Mainly clear',               emoji: '🌤️' },
  2:  { label: 'Partly cloudy',              emoji: '⛅' },
  3:  { label: 'Overcast',                   emoji: '☁️' },
  45: { label: 'Foggy',                      emoji: '🌫️' },
  48: { label: 'Icy fog',                    emoji: '🌫️' },
  51: { label: 'Light drizzle',              emoji: '🌦️' },
  53: { label: 'Drizzle',                    emoji: '🌦️' },
  55: { label: 'Heavy drizzle',              emoji: '🌧️' },
  56: { label: 'Freezing drizzle',           emoji: '🌨️' },
  57: { label: 'Heavy freezing drizzle',     emoji: '🌨️' },
  61: { label: 'Slight rain',                emoji: '🌧️' },
  63: { label: 'Rain',                       emoji: '🌧️' },
  65: { label: 'Heavy rain',                 emoji: '🌧️' },
  66: { label: 'Freezing rain',              emoji: '🌨️' },
  67: { label: 'Heavy freezing rain',        emoji: '🌨️' },
  71: { label: 'Slight snow',                emoji: '🌨️' },
  73: { label: 'Snow',                       emoji: '❄️' },
  75: { label: 'Heavy snow',                 emoji: '❄️' },
  77: { label: 'Snow grains',               emoji: '❄️' },
  80: { label: 'Slight showers',            emoji: '🌦️' },
  81: { label: 'Showers',                   emoji: '🌧️' },
  82: { label: 'Violent showers',           emoji: '⛈️' },
  85: { label: 'Slight snow showers',       emoji: '🌨️' },
  86: { label: 'Heavy snow showers',        emoji: '🌨️' },
  95: { label: 'Thunderstorm',              emoji: '⛈️' },
  96: { label: 'Thunderstorm w/ hail',      emoji: '⛈️' },
  99: { label: 'Thunderstorm, heavy hail',  emoji: '⛈️' },
}

export function getWeatherInfo(code) {
  return WMO[code] ?? { label: 'Unknown', emoji: '🌡️' }
}

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']

export function getCompassDir(degrees) {
  if (degrees == null) return '–'
  return COMPASS[Math.round(degrees / 22.5) % 16]
}
