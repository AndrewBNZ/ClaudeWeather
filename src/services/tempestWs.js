import { ref } from 'vue'

const WS_URL = 'wss://ws.weatherflow.com/swd/data'

// Reactive state consumed by App.vue
export const tempestData      = ref(null)
export const tempestConnected = ref(false)

let ws             = null
let reconnectTimer = null
let _token         = null
let _deviceId      = null

// ── Public API ────────────────────────────────────────────────────────────────

export function connectTempest(token, deviceId) {
  _token    = token
  _deviceId = deviceId
  connect()
}

export function disconnectTempest() {
  _token    = null
  _deviceId = null
  cleanup()
  tempestData.value      = null
  tempestConnected.value = false
}

// ── Connection management ─────────────────────────────────────────────────────

function cleanup() {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
  if (ws) {
    ws.onopen    = null
    ws.onclose   = null
    ws.onerror   = null
    ws.onmessage = null
    ws.close()
    ws = null
  }
}

function connect() {
  if (!_token || !_deviceId) return
  // Already connecting or connected — no need to restart
  if (ws && ws.readyState <= WebSocket.OPEN) return
  cleanup()

  ws = new WebSocket(`${WS_URL}?token=${_token}`)

  ws.onopen = () => {
    tempestConnected.value = true
    ws.send(JSON.stringify({ type: 'listen_start',       device_id: _deviceId, id: 'cw-obs'   }))
    ws.send(JSON.stringify({ type: 'listen_rapid_start', device_id: _deviceId, id: 'cw-rapid' }))
  }

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data)
      if      (msg.type === 'obs_st')      handleObsSt(msg)
      else if (msg.type === 'rapid_wind')  handleRapidWind(msg)
    } catch {}
  }

  ws.onerror = () => { ws.close() }

  ws.onclose = () => {
    tempestConnected.value = false
    ws = null
    // Reconnect if still intended to be running (handles 10-min idle disconnect)
    if (_token && _deviceId) {
      reconnectTimer = setTimeout(connect, 5000)
    }
  }
}

// Pause on tab hide, resume on show (saves the server connection quota)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    cleanup()
    tempestConnected.value = false
  } else if (_token && _deviceId) {
    connect()
  }
})

// ── Wind smoothing ────────────────────────────────────────────────────────────

const WIND_WINDOW = 10  // rolling samples (~30 s at 3 s rapid_wind interval)
const windBuf = []     // { speed, dir } entries

function pushWind(speed, dir) {
  windBuf.push({ speed, dir })
  if (windBuf.length > WIND_WINDOW) windBuf.shift()
}

function smoothedWind() {
  if (!windBuf.length) return { speed: null, dir: null }
  const speed = windBuf.reduce((s, e) => s + e.speed, 0) / windBuf.length
  // Circular mean for direction (handles 350°/10° wraparound correctly)
  const sinSum = windBuf.reduce((s, e) => s + Math.sin(e.dir * Math.PI / 180), 0)
  const cosSum = windBuf.reduce((s, e) => s + Math.cos(e.dir * Math.PI / 180), 0)
  const dir = (Math.atan2(sinSum, cosSum) * 180 / Math.PI + 360) % 360
  return { speed, dir: Math.round(dir) }
}

// ── Message handlers ──────────────────────────────────────────────────────────

// obs_st array field indices (Tempest UDP / WebSocket format v171)
const F = {
  TIMESTAMP:             0,
  WIND_LULL:             1,
  WIND_AVG:              2,
  WIND_GUST:             3,
  WIND_DIRECTION:        4,
  STATION_PRESSURE:      6,
  AIR_TEMPERATURE:       7,
  RELATIVE_HUMIDITY:     8,
  ILLUMINANCE:           9,
  UV:                    10,
  SOLAR_RADIATION:       11,
  RAIN_PREV_MIN:         12,
  PRECIP_TYPE:           13,
  LIGHTNING_DISTANCE:    14,
  LIGHTNING_COUNT:       15,
  BATTERY:               16,
  RAIN_ACCUM_LOCAL_DAY:  18,
}

function handleObsSt(msg) {
  const obs = msg.obs?.[0]
  if (!obs) return
  // Seed the rolling buffer with the authoritative obs_st reading
  windBuf.length = 0
  pushWind(obs[F.WIND_AVG], obs[F.WIND_DIRECTION])
  tempestData.value = {
    _source:               'tempest',
    timestamp:             obs[F.TIMESTAMP],
    wind_lull:             obs[F.WIND_LULL],
    wind_avg:              obs[F.WIND_AVG],
    wind_gust:             obs[F.WIND_GUST],
    wind_direction:        obs[F.WIND_DIRECTION],
    station_pressure:      obs[F.STATION_PRESSURE],
    air_temperature:       obs[F.AIR_TEMPERATURE],
    relative_humidity:     obs[F.RELATIVE_HUMIDITY],
    illuminance:           obs[F.ILLUMINANCE],
    uv:                    obs[F.UV],
    solar_radiation:       obs[F.SOLAR_RADIATION],
    rain_prev_min:         obs[F.RAIN_PREV_MIN],
    rain_accum_local_day:  obs[F.RAIN_ACCUM_LOCAL_DAY],
    precip_type:           obs[F.PRECIP_TYPE],
    lightning_distance:    obs[F.LIGHTNING_DISTANCE],
    lightning_count:       obs[F.LIGHTNING_COUNT],
    battery:               obs[F.BATTERY],
  }
}

function handleRapidWind(msg) {
  const ob = msg.ob
  if (!ob || !tempestData.value) return
  pushWind(ob[1], ob[2])
  const { speed, dir } = smoothedWind()
  tempestData.value = {
    ...tempestData.value,
    wind_avg:       speed,
    wind_direction: dir,
  }
}
