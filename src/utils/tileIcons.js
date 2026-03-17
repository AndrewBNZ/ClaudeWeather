// Shared SVG icon strings for each data tile type.
// Sized via CSS per context — all use viewBox="0 0 20 20".
export const TILE_ICONS = {
  temperature: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#f97316" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 13V6a2 2 0 0 0-4 0v7a3.5 3.5 0 1 0 4 0z"/>
  </svg>`,
  rain: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#a0d8ff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M5 13a4 4 0 0 1 .4-8A5.5 5.5 0 0 1 15.6 8H16a2.5 2.5 0 0 1 0 5"/>
    <line x1="8" y1="15.5" x2="7" y2="18"/>
    <line x1="12" y1="15.5" x2="11" y2="18"/>
  </svg>`,
  wind: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#06b6d4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3 7c2-2 4-2 6 0s4 2 8 0"/>
    <path d="M3 11c2-2 4-2 6 0s4 2 7 0"/>
    <path d="M3 15c2-2 4-2 5 0"/>
  </svg>`,
  feelsLike: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#cc00ff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 13V7a2 2 0 0 0-4 0v6a3.5 3.5 0 1 0 4 0z"/>
    <line x1="10" y1="9" x2="12.5" y2="9"/>
    <line x1="10" y1="11.5" x2="13.5" y2="11.5"/>
  </svg>`,
  humidity: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#00ffdd" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 3C10 3 3.5 9.5 3.5 13a6.5 6.5 0 0 0 13 0C16.5 9.5 10 3 10 3z"/>
  </svg>`,
  uv: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#ffcc00" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
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
  cloudCover: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#40c8ff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 14a4 4 0 0 1 .4-8A5 5 0 0 1 15.6 8.5H16a2.5 2.5 0 0 1 0 5H4z"/>
  </svg>`,
  pressure: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#6655ff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="10" cy="11" r="6"/>
    <path d="M6.5 5.7a7 7 0 0 1 7 0"/>
    <line x1="10" y1="11" x2="13.5" y2="7.5"/>
    <circle cx="10" cy="11" r="1" fill="#6655ff" stroke="none"/>
  </svg>`,
  visibility: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#00e0ff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M2 10s3.5-6 8-6 8 6 8 6-3.5 6-8 6-8-6-8-6z"/>
    <circle cx="10" cy="10" r="2.5"/>
  </svg>`,
}
