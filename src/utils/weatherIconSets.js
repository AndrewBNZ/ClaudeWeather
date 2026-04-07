import { getWeatherInfo } from './weatherCodes.js'

// Registry of available weather icon sets.
// Each set defines how to resolve a WMO weather code to a renderable icon.
//
// To add a new icon set:
//   1. Add an entry to ICON_SETS with type 'img', basePath, ext, and map
//   2. The map keys are WMO weather codes; values are either:
//        - a filename string (same icon for day and night)
//        - { day: 'filename', night: 'filename' } for day/night variants
//   3. Any code not in the map falls back to emoji automatically
//   4. Drop SVG/PNG files in /public/icons/<set-id>/
//   5. The set appears automatically in the settings icon picker

export const ICON_SETS = [
  {
    id: 'emoji',
    label: 'Emoji',
    type: 'emoji',
  },

  // Example — fill in the map after downloading assets:
  // {
  //   id: 'icons8-fluent',
  //   label: 'Fluent',
  //   type: 'img',
  //   basePath: '/icons/icons8-fluent/',
  //   ext: '.svg',
  //   map: {
  //     0:  { day: 'sun', night: 'moon' },
  //     1:  { day: 'mostly-sunny', night: 'mostly-clear-night' },
  //     2:  { day: 'partly-cloudy-day', night: 'partly-cloudy-night' },
  //     3:  'cloud',
  //     45: 'fog',
  //     48: 'fog',
  //     51: 'drizzle',
  //     53: 'drizzle',
  //     55: 'rain',
  //     56: 'sleet',
  //     57: 'sleet',
  //     61: 'rain',
  //     63: 'rain',
  //     65: 'heavy-rain',
  //     66: 'sleet',
  //     67: 'sleet',
  //     71: 'snow',
  //     73: 'snow',
  //     75: 'heavy-snow',
  //     77: 'snow',
  //     80: 'rain-shower',
  //     81: 'rain-shower',
  //     82: 'thunderstorm',
  //     85: 'snow-shower',
  //     86: 'snow-shower',
  //     95: 'thunderstorm',
  //     96: 'thunderstorm',
  //     99: 'thunderstorm',
  //   },
  // },
]

const SET_MAP = Object.fromEntries(ICON_SETS.map(s => [s.id, s]))

// Resolves a WMO code to an icon descriptor.
// Returns { type: 'emoji', value: '☀️' } or { type: 'img', src: '/icons/...' }
export function resolveIcon(code, setId = 'emoji', isDay = true) {
  const set = SET_MAP[setId] ?? SET_MAP.emoji

  if (set.type === 'img') {
    const entry = set.map?.[code]
    if (entry != null) {
      const filename = typeof entry === 'string'
        ? entry
        : (isDay ? (entry.day ?? entry.night) : (entry.night ?? entry.day))
      return { type: 'img', src: `${set.basePath}${filename}${set.ext}` }
    }
    // Fall through to emoji if no mapping found for this code
  }

  return { type: 'emoji', value: getWeatherInfo(code)?.emoji ?? '🌡️' }
}
