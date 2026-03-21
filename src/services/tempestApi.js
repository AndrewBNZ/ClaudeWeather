const TEMPEST_BASE = import.meta.env.DEV
  ? '/tempest-proxy/swd/rest'
  : 'https://swd.weatherflow.com/swd/rest'

// Returns all Tempest stations on the account that have a Tempest sensor (ST).
// Each item: { stationId, deviceId, name }
export async function fetchTempestStations(token) {
  const res = await fetch(`${TEMPEST_BASE}/stations?token=${token}`)
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new Error('Invalid token or not authorised.')
    throw new Error(`Tempest API error ${res.status}`)
  }
  const json = await res.json()
  const stations = (json.stations ?? [])
    .map(s => {
      const device = s.devices?.find(d => d.device_type === 'ST')
      if (!device) return null
      return {
        stationId: s.station_id,
        deviceId:  device.device_id,
        name:      s.name || `Station ${s.station_id}`,
      }
    })
    .filter(Boolean)
  if (!stations.length) throw new Error('No Tempest stations found on this account.')
  return stations
}
