import { computed } from 'vue'
import { getMoonPhase, moonRiseSet } from '../utils/moonPhase.js'

/**
 * Shared moon arc logic for SunriseMoonCard and MoonDetailSheet.
 *
 * @param {object} opts
 * @param {import('vue').ComputedRef<Date>} opts.refDate   - local-midnight Date for the display day
 * @param {import('vue').Ref<number>}       opts.lat       - latitude (degrees)
 * @param {import('vue').Ref<number>}       opts.lon       - longitude (degrees)
 * @param {import('vue').Ref<number>}       opts.utcOffset - UTC offset in seconds
 * @param {import('vue').Ref<string>}       opts.timeFormat - '12h' | '24h'
 */
export function useMoonArc({ refDate, lat, lon, utcOffset, timeFormat }) {
  // showingTomorrow and riseSet computed together — which cycle is active
  // determines both which times to show and the "Tomorrow" label.
  const _moonBoth = computed(() => {
    const now      = Date.now()
    const yesterday = new Date(refDate.value.getTime() - 86400000)
    const tomorrow  = new Date(refDate.value.getTime() + 86400000)
    const today = moonRiseSet(refDate.value, lat.value, lon.value, utcOffset.value)

    function tomorrowPair(base) {
      const d = moonRiseSet(base, lat.value, lon.value, utcOffset.value)
      if (d.rise && !d.set) {
        const da = moonRiseSet(new Date(base.getTime() + 86400000), lat.value, lon.value, utcOffset.value)
        return { rise: d.rise, set: da.earlySet ?? da.set }
      }
      return d
    }

    if (today.earlySet && !today.set) {
      // Moon rose yesterday; earlySet is the carry-over set. today.rise (if any) is tonight's separate cycle.
      if (now < today.earlySet.getTime()) {
        const yd = moonRiseSet(yesterday, lat.value, lon.value, utcOffset.value)
        return { showingTomorrow: false, riseSet: { rise: yd.rise, set: today.earlySet } }
      } else if (today.rise) {
        // In the gap between earlySet and tonight's rise — show tonight's upcoming arc
        const td = moonRiseSet(tomorrow, lat.value, lon.value, utcOffset.value)
        return { showingTomorrow: false, riseSet: { rise: today.rise, set: td.earlySet ?? td.set } }
      } else {
        return { showingTomorrow: true, riseSet: tomorrowPair(tomorrow) }
      }
    } else if (!today.rise && today.set) {
      // No rise today — moon rose near/before midnight, borrow yesterday's rise
      const yd = moonRiseSet(yesterday, lat.value, lon.value, utcOffset.value)
      if (now > today.set.getTime()) {
        return { showingTomorrow: true, riseSet: tomorrowPair(tomorrow) }
      }
      return { showingTomorrow: false, riseSet: { rise: yd.rise, set: today.set } }
    } else if (today.rise && !today.set) {
      // Rises today, sets tomorrow
      const td = moonRiseSet(tomorrow, lat.value, lon.value, utcOffset.value)
      return { showingTomorrow: false, riseSet: { rise: today.rise, set: td.earlySet ?? td.set } }
    } else if (today.rise && today.set) {
      if (now > today.set.getTime()) {
        return { showingTomorrow: true, riseSet: tomorrowPair(tomorrow) }
      }
      return { showingTomorrow: false, riseSet: today }
    } else {
      // No events today — show tomorrow
      return { showingTomorrow: true, riseSet: tomorrowPair(tomorrow) }
    }
  })

  const showingTomorrow = computed(() => _moonBoth.value.showingTomorrow)
  const riseSet         = computed(() => _moonBoth.value.riseSet)

  // Timestamp at local noon for the displayed day (used for phase calculation)
  const moonRefMs = computed(() => {
    const base = refDate.value.getTime() + 12 * 3600000
    return showingTomorrow.value ? base + 86400000 : base
  })

  const currentPhase = computed(() => getMoonPhase(moonRefMs.value))

  function formatTimeDate(date) {
    if (!date) return '—'
    const localMs = date.getTime() + utcOffset.value * 1000
    const d = new Date(localMs)
    const h = d.getUTCHours()
    const m = d.getUTCMinutes()
    if (timeFormat.value === '24h') return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    const ampm = h >= 12 ? 'PM' : 'AM'
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`
  }

  const moonriseFormatted = computed(() => formatTimeDate(riseSet.value.rise))
  const moonsetFormatted  = computed(() => formatTimeDate(riseSet.value.set))

  // True when moonrise is today and moonset falls on a later calendar day.
  // Not shown when the moon rose yesterday and sets today.
  const moonsetNextDay = computed(() => {
    const { rise, set } = riseSet.value
    if (!rise || !set) return false
    const nowLocalDay  = Math.floor((Date.now() + utcOffset.value * 1000) / 86400000)
    const riseLocalDay = Math.floor((rise.getTime() + utcOffset.value * 1000) / 86400000)
    const setLocalDay  = Math.floor((set.getTime()  + utcOffset.value * 1000) / 86400000)
    return riseLocalDay === nowLocalDay && setLocalDay > riseLocalDay
  })

  // Progress 0–1 while moon is up, -1 otherwise.
  const moonProgress = computed(() => {
    const now  = Date.now()
    const rise = riseSet.value.rise
    const set  = riseSet.value.set
    if (!rise || !set) return -1
    if (now > set.getTime()) return -1
    return (now - rise.getTime()) / (set.getTime() - rise.getTime())
  })

  return {
    showingTomorrow,
    riseSet,
    moonRefMs,
    currentPhase,
    moonriseFormatted,
    moonsetFormatted,
    moonsetNextDay,
    moonProgress,
  }
}
