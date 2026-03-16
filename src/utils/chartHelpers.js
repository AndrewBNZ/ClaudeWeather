/**
 * Draws a wind direction arrow (background circle + rotated shaft + arrowhead)
 * centred at (cx, cy) on the given canvas 2D context.
 *
 * Wind direction is meteorological (degrees the wind comes FROM).
 * The arrow points in the direction the wind is blowing TO (dir + 180°).
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx          - centre x in canvas pixels
 * @param {number} cy          - centre y in canvas pixels
 * @param {number} dirDeg      - wind direction in degrees (meteorological)
 * @param {string} color       - CSS colour string for the arrow
 * @param {object} [opts]
 * @param {boolean} [opts.isCurrent=false] - highlight as the current time period
 */
export function drawWindArrow(ctx, cx, cy, dirDeg, color, { isCurrent = false } = {}) {
  const angle = (dirDeg + 180) * (Math.PI / 180)
  const radius = isCurrent ? 13 : 11

  ctx.save()
  ctx.translate(cx, cy)

  // Background circle
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.fillStyle = isCurrent ? 'rgba(30, 41, 59, 0.95)' : 'rgba(15, 23, 42, 0.85)'
  ctx.fill()
  ctx.strokeStyle = isCurrent ? color : color + 'aa'
  ctx.lineWidth = isCurrent ? 1.5 : 1
  ctx.stroke()

  // Rotated arrow
  ctx.rotate(angle)
  const arrowColor = isCurrent ? '#ffffff' : color
  ctx.strokeStyle = arrowColor
  ctx.fillStyle   = arrowColor
  ctx.lineWidth   = isCurrent ? 2 : 1.5
  ctx.lineCap     = 'round'

  ctx.beginPath()
  ctx.moveTo(0, 6)
  ctx.lineTo(0, -2)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(0, -7)
  ctx.lineTo(-3.5, -1)
  ctx.lineTo(3.5, -1)
  ctx.closePath()
  ctx.fill()

  ctx.restore()
}
