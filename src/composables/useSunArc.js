import { computed } from 'vue'

/**
 * Shared sun arc logic for SunriseMoonCard and SunDetailSheet.
 *
 * @param {object} opts
 * @param {import('vue').Ref<object|null>} opts.daily      - daily weather data object
 * @param {import('vue').Ref<number>}      opts.utcOffset  - UTC offset in seconds
 * @param {import('vue').Ref<string>}      opts.timeFormat - '12h' | '24h'
 */
export function useSunArc({ daily, utcOffset, timeFormat }) {
  // Open-Meteo sunrise/sunset strings are LOCAL time (e.g. "2026-04-05T06:32").
  // Never append 'Z' — work directly with the local HH:MM values as minutes.

  function isoToLocalMins(isoStr) {
    if (!isoStr) return null
    const [h, m] = isoStr.slice(11, 16).split(':').map(Number)
    return h * 60 + m
  }

  function formatMins(totalMins, format) {
    if (totalMins == null) return '—'
    const h = Math.floor(((totalMins % 1440) + 1440) % 1440 / 60)
    const m = ((totalMins % 60) + 60) % 60
    if (format === '24h') return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    const ampm = h >= 12 ? 'PM' : 'AM'
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
  }

  function formatIso(isoStr, format) {
    return formatMins(isoToLocalMins(isoStr), format)
  }

  function dayLengthStr(riseIso, setIso) {
    const r = isoToLocalMins(riseIso)
    const s = isoToLocalMins(setIso)
    if (r == null || s == null) return '—'
    const mins = s - r
    return `${Math.floor(mins / 60)}h ${mins % 60}m`
  }

  const showingSunTomorrow = computed(() => {
    const s = daily.value?.sunset?.[0]
    if (!s) return false
    const [h, m] = s.slice(11, 16).split(':').map(Number)
    const setMins = h * 60 + m
    const localDate = new Date(Date.now() + utcOffset.value * 1000)
    const nowMins = localDate.getUTCHours() * 60 + localDate.getUTCMinutes()
    return nowMins > setMins
  })

  const dayIdx = computed(() => showingSunTomorrow.value ? 1 : 0)

  const sunrise = computed(() => daily.value?.sunrise?.[dayIdx.value] ?? null)
  const sunset  = computed(() => daily.value?.sunset?.[dayIdx.value]  ?? null)

  const sunriseMins = computed(() => isoToLocalMins(sunrise.value))
  const sunsetMins  = computed(() => isoToLocalMins(sunset.value))

  const sunriseFormatted = computed(() => formatIso(sunrise.value, timeFormat.value))
  const sunsetFormatted  = computed(() => formatIso(sunset.value,  timeFormat.value))
  const dayLength        = computed(() => dayLengthStr(sunrise.value, sunset.value))

  // Progress 0–1 while sun is up, -1 before sunrise, >1 after sunset.
  const sunProgress = computed(() => {
    if (showingSunTomorrow.value) return -1
    if (sunriseMins.value == null || sunsetMins.value == null) return -1
    const localDate = new Date(Date.now() + utcOffset.value * 1000)
    const nowMins = localDate.getUTCHours() * 60 + localDate.getUTCMinutes()
    return (nowMins - sunriseMins.value) / (sunsetMins.value - sunriseMins.value)
  })

  return {
    showingSunTomorrow,
    dayIdx,
    sunrise,
    sunset,
    sunriseMins,
    sunsetMins,
    sunriseFormatted,
    sunsetFormatted,
    dayLength,
    sunProgress,
    // Expose helpers so detail sheet can use them without re-implementing
    isoToLocalMins,
    formatMins,
    formatIso,
    dayLengthStr,
  }
}
