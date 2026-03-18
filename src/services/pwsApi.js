// In browser dev, requests are proxied via Vite to avoid CORS (not needed in Capacitor native)
const WU_BASE = import.meta.env.DEV ? '/wu-proxy/v2' : 'https://api.weather.com/v2'

export async function getPwsObservations(stationId, apiKey) {
  const params = new URLSearchParams({
    stationId,
    format: 'json',
    units:  'm',
    apiKey,
  })
  const res = await fetch(`${WU_BASE}/pws/observations/current?${params}`)
  if (!res.ok) throw new Error(`WU API error ${res.status}`)
  const json = await res.json()
  return json.observations?.[0] ?? null
}
