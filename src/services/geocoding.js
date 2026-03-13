// Nominatim (OpenStreetMap) — free, no API key, excellent worldwide coverage.
// Usage policy requires a User-Agent and max 1 req/sec (our 300ms debounce handles this).
const NOMINATIM = 'https://nominatim.openstreetmap.org'
const HEADERS   = { 'Accept-Language': 'en', 'User-Agent': 'ClaudeWeather/1.0' }

// Normalize a Nominatim result into the shape LocationSearch.vue expects:
// { id, name, admin1, country, latitude, longitude }
function normalize(r) {
  const addr = r.address ?? {}
  const name = addr.city ?? addr.town ?? addr.village ?? addr.hamlet ?? addr.suburb ?? r.name ?? r.display_name.split(',')[0]
  const admin1  = addr.state ?? addr.region ?? addr.county ?? ''
  const country = addr.country ?? ''
  return {
    id:        r.place_id,
    name,
    admin1,
    country,
    latitude:  parseFloat(r.lat),
    longitude: parseFloat(r.lon),
  }
}

export async function searchLocations(query) {
  if (!query || query.trim().length < 2) return []

  const params = new URLSearchParams({
    q:               query.trim(),
    format:          'json',
    addressdetails:  1,
    limit:           6,
    featuretype:     'settlement',
  })

  const res = await fetch(`${NOMINATIM}/search?${params}`, { headers: HEADERS })
  if (!res.ok) throw new Error(`Geocoding error: ${res.status}`)
  const data = await res.json()
  return data.map(normalize)
}

export function formatLocationName(result) {
  const parts = [result.name]
  if (result.admin1) parts.push(result.admin1)
  if (result.country) parts.push(result.country)
  return parts.join(', ')
}

export async function reverseGeocode(lat, lon) {
  const params = new URLSearchParams({ lat, lon, format: 'json', addressdetails: 1, zoom: 10 })
  const res = await fetch(`${NOMINATIM}/reverse?${params}`, { headers: HEADERS })
  if (!res.ok) throw new Error(`Reverse geocode error: ${res.status}`)
  const r = await res.json()
  return formatLocationName(normalize(r))
}
