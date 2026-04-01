// CAP (Common Alerting Protocol) alert service.
// Fetches and parses RSS+CAP feeds from national weather agencies.
// Currently supports: New Zealand (MetService)

// Feed registry keyed by Nominatim country display name.
// To add a new country: add an entry with { name, rssUrl } and wire up the feed URL.
export const CAP_FEEDS = {
  'New Zealand': {
    name:   'MetService',
    rssUrl: 'https://alerts.metservice.com/cap/rss',
  },
  // 'Australia': { name: 'Bureau of Meteorology', rssUrl: '' },   // TODO: find BoM CAP RSS URL
  // 'United Kingdom': { name: 'Met Office', rssUrl: '' },          // TODO: find UK Met Office CAP RSS URL
}

// In-memory cache: rawUrl → { alerts, fetchedAt }
const cache = new Map()
const CACHE_TTL_MS = 15 * 60 * 1000

// MetService (and other national met services) don't send permissive CORS headers.
// In dev we use a Vite proxy; in production we route through corsproxy.io.
function applyProxy(rawUrl) {
  if (import.meta.env.DEV) {
    return rawUrl.replace('https://alerts.metservice.com', '/cap-proxy')
  }
  return `https://corsproxy.io/?url=${encodeURIComponent(rawUrl)}`
}

function resolveUrl(country, feedOverride) {
  const rawUrl = feedOverride ?? CAP_FEEDS[country]?.rssUrl ?? null
  if (!rawUrl) return null
  return { raw: rawUrl, proxied: applyProxy(rawUrl) }
}

// ── XML parsing ───────────────────────────────────────────────────────────────

// Parse a CAP polygon string "lat,lon lat,lon ..." into an array of [lat, lon] pairs.
function parsePolygon(str) {
  return str.trim().split(/\s+/).map(pair => {
    const [lat, lon] = pair.split(',').map(Number)
    return [lat, lon]
  }).filter(([lat, lon]) => !isNaN(lat) && !isNaN(lon))
}

// Ray-casting point-in-polygon for WGS84 coordinates.
export function isPointInPolygon(lat, lon, polygon) {
  if (!polygon || polygon.length < 3) return false
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i]
    const [yj, xj] = polygon[j]
    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

function getTagText(el, tagName) {
  const node = el.querySelector(tagName)
  return node ? node.textContent.trim() : ''
}

function parseCapItem(item) {
  // Each RSS <item> has a <link> to the full CAP XML document.
  // Some feeds inline CAP data in the RSS itself. Parse what we have.
  const capNS = 'urn:oasis:names:tc:emergency:cap:1.2'

  // Helper: get element text preferring CAP namespace, fallback plain tag name
  function capText(el, tagName) {
    const nsNode = el.getElementsByTagNameNS?.(capNS, tagName)[0]
    if (nsNode) return nsNode.textContent.trim()
    return getTagText(el, tagName)
  }

  const areas = []
  const areaEls = item.getElementsByTagNameNS
    ? Array.from(item.getElementsByTagNameNS(capNS, 'area'))
    : Array.from(item.querySelectorAll('area'))

  if (areaEls.length === 0) {
    // Try without namespace (some feeds don't use the namespace prefix on child elements)
    Array.from(item.querySelectorAll('area')).forEach(areaEl => {
      const polygons = Array.from(areaEl.querySelectorAll('polygon'))
        .map(p => parsePolygon(p.textContent))
        .filter(p => p.length >= 3)
      areas.push({
        desc:     getTagText(areaEl, 'areaDesc'),
        polygons,
      })
    })
  } else {
    areaEls.forEach(areaEl => {
      const polygonEls = areaEl.getElementsByTagNameNS
        ? Array.from(areaEl.getElementsByTagNameNS(capNS, 'polygon'))
        : Array.from(areaEl.querySelectorAll('polygon'))
      const polygons = polygonEls
        .map(p => parsePolygon(p.textContent))
        .filter(p => p.length >= 3)
      areas.push({
        desc:     capText(areaEl, 'areaDesc'),
        polygons,
      })
    })
  }

  return {
    id:          capText(item, 'identifier') || getTagText(item, 'guid'),
    event:       capText(item, 'event'),
    headline:    capText(item, 'headline') || getTagText(item, 'title'),
    description: capText(item, 'description') || getTagText(item, 'description'),
    severity:    capText(item, 'severity'),
    urgency:     capText(item, 'urgency'),
    certainty:   capText(item, 'certainty'),
    expires:     capText(item, 'expires'),
    onset:       capText(item, 'onset'),
    effective:   capText(item, 'effective'),
    areas,
  }
}

export function parseCapRss(xmlText) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlText, 'application/xml')

  // Check for parse errors
  const parseError = doc.querySelector('parsererror')
  if (parseError) throw new Error('XML parse error: ' + parseError.textContent)

  const items = Array.from(doc.querySelectorAll('item'))
  return items.map(parseCapItem).filter(a => a.headline || a.event)
}

// ── Location filtering ────────────────────────────────────────────────────────

// Returns alerts that cover the given lat/lon.
// If an alert has no polygon data, it is included (can't filter — assume area-wide).
export function filterAlertsForLocation(alerts, lat, lon) {
  return alerts.filter(alert => {
    const hasPolygons = alert.areas.some(a => a.polygons.length > 0)
    if (!hasPolygons) return true
    return alert.areas.some(area =>
      area.polygons.some(poly => isPointInPolygon(lat, lon, poly))
    )
  })
}

// ── Main fetch API ────────────────────────────────────────────────────────────

/**
 * Fetch and parse CAP alerts for a given country (or feed override URL).
 * Returns { alerts, error }.
 * Results are cached for 15 minutes.
 */
export async function fetchAlerts(country, feedOverride = null) {
  const resolved = resolveUrl(country, feedOverride)

  if (!resolved) {
    return { alerts: [], error: null, noFeed: true }
  }

  const { raw, proxied } = resolved

  const cached = cache.get(raw)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return { alerts: cached.alerts, error: null }
  }

  try {
    const res = await fetch(proxied)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const xml = await res.text()
    const alerts = parseCapRss(xml)
    cache.set(raw, { alerts, fetchedAt: Date.now() })
    return { alerts, error: null }
  } catch (err) {
    const isCors = err instanceof TypeError && err.message.toLowerCase().includes('fetch')
    return {
      alerts: [],
      error:  isCors ? 'cors' : err.message,
    }
  }
}

/** Clear the cache for a specific URL (or all if no URL given). */
export function clearAlertsCache(url = null) {
  if (url) cache.delete(url)
  else cache.clear()
}
