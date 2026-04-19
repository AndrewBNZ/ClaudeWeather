// Shared SVG icon strings for each data tile type.
// Sized via CSS per context — all use viewBox="0 0 20 20".
export const TILE_ICONS = {
  temperature: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#f97316" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 11V4a2 2 0 0 0-4 0v7a3.5 3.5 0 1 0 4 0z"/>
  </svg>`,
  rain: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#3b82f6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M5.2 4.6C5.2 4.6 3.2 7 3.2 8.4a2 2 0 0 0 4 0c0-1.4-2-3.8-2-3.8z"/>
    <path d="M13.9 2.8C13.9 2.8 11.4 5.9 11.4 7.6a2.5 2.5 0 0 0 5 0c0-1.7-2.5-4.8-2.5-4.8z"/>
    <path d="M9.2 11.4C9.2 11.4 7.2 13.8 7.2 15.2a2 2 0 0 0 4 0c0-1.4-2-3.8-2-3.8z"/>
  </svg>`,
  wind: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#06b6d4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 7c2-2 4-2 6 0s4 2 8 0"/>
    <path d="M3 11c2-2 4-2 6 0s4 2 7 0"/>
    <path d="M3 15c2-2 4-2 5 0"/>
  </svg>`,
  feelsLike: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#a855f7" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 11V5a2 2 0 0 0-4 0v6a3.5 3.5 0 1 0 4 0z"/>
    <line x1="10" y1="7" x2="12.5" y2="7"/>
    <line x1="10" y1="9.5" x2="13.5" y2="9.5"/>
  </svg>`,
  humidity: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#14b8a6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 3C10 3 3.5 9.5 3.5 13a6.5 6.5 0 0 0 13 0C16.5 9.5 10 3 10 3z"/>
  </svg>`,
  uv: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#eab308" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="10" cy="10" r="3.5"/>
    <line x1="10" y1="1.5" x2="10" y2="3.5"/>
    <line x1="10" y1="16.5" x2="10" y2="18.5"/>
    <line x1="1.5" y1="10" x2="3.5" y2="10"/>
    <line x1="16.5" y1="10" x2="18.5" y2="10"/>
    <line x1="4.4" y1="4.4" x2="5.8" y2="5.8"/>
    <line x1="14.2" y1="14.2" x2="15.6" y2="15.6"/>
    <line x1="15.6" y1="4.4" x2="14.2" y2="5.8"/>
    <line x1="5.8" y1="14.2" x2="4.4" y2="15.6"/>
  </svg>`,
  cloudCover: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 14a4 4 0 0 1 .4-8A5 5 0 0 1 15.6 8.5H16a2.5 2.5 0 0 1 0 5H4z"/>
  </svg>`,
  pressure: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#818cf8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="10" cy="11" r="6"/>
    <path d="M6.5 5.7a7 7 0 0 1 7 0"/>
    <line x1="10" y1="11" x2="13.5" y2="7.5"/>
    <circle cx="10" cy="11" r="1" fill="#818cf8" stroke="none"/>
  </svg>`,
  visibility: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#22d3ee" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M2 10s3.5-6 8-6 8 6 8 6-3.5 6-8 6-8-6-8-6z"/>
    <circle cx="10" cy="10" r="2.5"/>
  </svg>`,
  radar: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#10b981" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M7.5 14 A2.5 2.5 0 0 1 12.5 14"/>
    <path d="M5 14 A5 5 0 0 1 15 14"/>
    <path d="M2.5 14 A7.5 7.5 0 0 1 17.5 14"/>
    <line x1="10" y1="14" x2="5" y2="9"/>
    <circle cx="10" cy="14" r="1" fill="#10b981" stroke="none"/>
  </svg>`,
  sunrise: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#fb923c" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="2" y1="13" x2="18" y2="13"/>
    <path d="M5.5 13 a4.5 4.5 0 0 1 9 0"/>
    <line x1="10" y1="2.5" x2="10" y2="4.5"/>
    <line x1="15" y1="5" x2="13.5" y2="6.5"/>
    <line x1="5" y1="5" x2="6.5" y2="6.5"/>
    <polyline points="7.5,17 10,15.5 12.5,17"/>
  </svg>`,
  sunset: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#f472b6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="2" y1="13" x2="18" y2="13"/>
    <path d="M5.5 13 a4.5 4.5 0 0 1 9 0"/>
    <line x1="10" y1="2.5" x2="10" y2="4.5"/>
    <line x1="15" y1="5" x2="13.5" y2="6.5"/>
    <line x1="5" y1="5" x2="6.5" y2="6.5"/>
    <polyline points="7.5,15.5 10,17 12.5,15.5"/>
  </svg>`,
  moon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#a5b4fc" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M15.5 13.5A6.5 6.5 0 0 1 7 3.5 6.5 6.5 0 1 0 15.5 13.5z"/>
  </svg>`,
}

export const CARD_ICONS = {
  sceneConditions: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#34d399" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="10" cy="8" r="3"/>
    <path d="M2 17 c2-4 4-5 8-5 s6 1 8 5"/>
  </svg>`,

  combinedHourly: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#38bdf8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="10" cy="10" r="7.5"/>
    <polyline points="10,5.5 10,10 13,12.5"/>
  </svg>`,

  dailyForecast: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#818cf8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="4.5" width="14" height="13" rx="2"/>
    <line x1="3" y1="8.5" x2="17" y2="8.5"/>
    <line x1="7" y1="3" x2="7" y2="6"/>
    <line x1="13" y1="3" x2="13" y2="6"/>
    <line x1="7" y1="12" x2="7" y2="12" stroke-width="2.5"/>
    <line x1="10" y1="12" x2="10" y2="12" stroke-width="2.5"/>
    <line x1="13" y1="12" x2="13" y2="12" stroke-width="2.5"/>
    <line x1="7" y1="15" x2="7" y2="15" stroke-width="2.5"/>
    <line x1="10" y1="15" x2="10" y2="15" stroke-width="2.5"/>
  </svg>`,

  sunriseMoon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#fb923c" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="2.5" y1="13" x2="17.5" y2="13"/>
    <path d="M6 13 a4 4 0 0 1 8 0"/>
    <line x1="10" y1="3" x2="10" y2="4.5"/>
    <line x1="14.5" y1="5" x2="13.5" y2="6"/>
    <line x1="5.5" y1="5" x2="6.5" y2="6"/>
    <path d="M15 16.5 a2.5 2.5 0 0 1-3.5-3.5 3 3 0 1 0 3.5 3.5z" stroke="#a5b4fc"/>
  </svg>`,

  radar: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#10b981" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M7.5 14 A2.5 2.5 0 0 1 12.5 14"/>
    <path d="M5 14 A5 5 0 0 1 15 14"/>
    <path d="M2.5 14 A7.5 7.5 0 0 1 17.5 14"/>
    <line x1="10" y1="14" x2="5" y2="9"/>
    <circle cx="10" cy="14" r="1" fill="#10b981" stroke="none"/>
  </svg>`,

  customAlerts: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 2.5 C10 2.5 5 7 5 12 h10 C15 7 10 2.5 10 2.5z"/>
    <line x1="7.5" y1="15" x2="12.5" y2="15"/>
    <path d="M8.5 17.5 a1.5 1.5 0 0 0 3 0"/>
    <line x1="13.5" y1="3" x2="13.5" y2="5" stroke="#fbbf24" stroke-width="2"/>
    <line x1="16" y1="5.5" x2="14.5" y2="6.5" stroke="#fbbf24" stroke-width="2"/>
  </svg>`,

  weatherWarnings: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#f87171" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 3 L18 17 H2 Z"/>
    <line x1="10" y1="9" x2="10" y2="13"/>
    <line x1="10" y1="15.5" x2="10" y2="15.5" stroke-width="2.5"/>
  </svg>`,


  daySegment: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="5" width="16" height="11" rx="1.5"/>
    <line x1="7.3" y1="5" x2="7.3" y2="16"/>
    <line x1="12.7" y1="5" x2="12.7" y2="16"/>
    <circle cx="4.7" cy="9.5" r="1.5" fill="#f59e0b" stroke="none"/>
    <circle cx="10" cy="9.5" r="1.5" fill="#f59e0b" stroke="none"/>
    <circle cx="15.3" cy="9.5" r="1.5" fill="#f59e0b" stroke="none"/>
  </svg>`,

  airQuality: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#22c55e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 17 C10 17 3 12 3 7.5 a7 7 0 0 1 14 0 C17 12 10 17 10 17z"/>
    <path d="M10 17 C10 17 10 11 10 7.5" stroke-opacity="0.5"/>
    <path d="M10 9.5 C8 8 6 9 6 11" stroke-opacity="0.6"/>
    <path d="M10 9.5 C12 8 14 9 14 11" stroke-opacity="0.6"/>
  </svg>`,
}
