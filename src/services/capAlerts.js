// CAP (Common Alerting Protocol) alert service.
// Fetches and parses RSS+CAP feeds from national weather agencies.
// Currently supports: New Zealand (MetService)

// Feed registry keyed by Nominatim country display name.
// To add a new country: add an entry with { name, rssUrl } and wire up the feed URL.
export const CAP_FEEDS = {
  'New Zealand': {
    name:   'MetService NZ',
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
    link:        getTagText(item, 'link'),
    event:       capText(item, 'event'),
    headline:    capText(item, 'headline') || getTagText(item, 'title'),
    description: capText(item, 'description') || getTagText(item, 'description'),
    severity:    capText(item, 'severity'),
    urgency:     capText(item, 'urgency'),
    certainty:   capText(item, 'certainty'),
    expires:     capText(item, 'expires'),
    onset:       capText(item, 'onset'),
    effective:   capText(item, 'effective'),
    pubDate:     getTagText(item, 'pubDate'),
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

    // The RSS items contain no polygon data — fetch each alert's full CAP XML
    // in parallel to populate area polygons (used for location filtering).
    await Promise.all(alerts.map(async (alert) => {
      if (!alert.link) return
      const detail = await fetchAlertDetail(alert.link)
      if (detail.areas?.length) alert.areas = detail.areas
      if (detail.parameters?.ColourCodeHex) alert.colourHex = detail.parameters.ColourCodeHex
      if (detail.parameters?.ColourCode) alert.colourCode = detail.parameters.ColourCode
    }))

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

// ── Full alert detail ─────────────────────────────────────────────────────────

const detailCache = new Map()

/**
 * Fetch the full CAP XML for a single alert by its detail URL.
 * Returns { instruction, web, parameters } — fields not available in the RSS feed.
 */
export async function fetchAlertDetail(rawUrl) {
  if (!rawUrl) return { areas: [], areaDesc: null, onset: null, expires: null, description: null, instruction: null, web: null, parameters: {} }

  const cached = detailCache.get(rawUrl)
  if (cached) return cached

  try {
    const proxied = applyProxy(rawUrl)
    const res = await fetch(proxied)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const xml = await res.text()

    const parser = new DOMParser()
    const doc = parser.parseFromString(xml, 'application/xml')
    const capNS = 'urn:oasis:names:tc:emergency:cap:1.2'

    function elText(parent, tagName) {
      return (parent.getElementsByTagNameNS(capNS, tagName)[0]
        ?? parent.querySelector(tagName))?.textContent.trim() ?? null
    }

    // Parse <parameter> key/value pairs (MetService: ColourCode, ColourCodeHex, ChanceOfUpgrade, NextUpdate)
    const paramEls = [
      ...Array.from(doc.getElementsByTagNameNS(capNS, 'parameter')),
      ...Array.from(doc.querySelectorAll('parameter')),
    ]
    const seen = new Set()
    const parameters = {}
    for (const el of paramEls) {
      const name  = elText(el, 'valueName')
      const value = elText(el, 'value')
      if (name && !seen.has(name)) { parameters[name] = value; seen.add(name) }
    }

    // Parse <area> elements — prefer namespace-aware search to avoid duplicates
    const nsAreaEls = Array.from(doc.getElementsByTagNameNS(capNS, 'area'))
    const areaEls   = nsAreaEls.length > 0 ? nsAreaEls : Array.from(doc.querySelectorAll('area'))

    const areas = areaEls.map(areaEl => {
      const nsPolys = Array.from(areaEl.getElementsByTagNameNS(capNS, 'polygon'))
      const polyEls = nsPolys.length > 0 ? nsPolys : Array.from(areaEl.querySelectorAll('polygon'))
      const polygons = polyEls
        .map(p => parsePolygon(p.textContent))
        .filter(p => p.length >= 3)
      return { desc: elText(areaEl, 'areaDesc'), polygons }
    })

    const detail = {
      areas,
      areaDesc:    areas.map(a => a.desc).filter(Boolean).join(', ') || null,
      sent:        elText(doc, 'sent'),
      effective:   elText(doc, 'effective'),
      onset:       elText(doc, 'onset'),
      expires:     elText(doc, 'expires'),
      description: elText(doc, 'description'),
      instruction: elText(doc, 'instruction'),
      web:         elText(doc, 'web'),
      parameters,
    }

    detailCache.set(rawUrl, detail)
    return detail
  } catch {
    return { areas: [], areaDesc: null, sent: null, effective: null, onset: null, expires: null, description: null, instruction: null, web: null, parameters: {} }
  }
}
