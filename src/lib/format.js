/**
 * Display formatting helpers. Pure, no Vue/DOM, so they can be unit-tested in
 * isolation and reused across screens (campaign list, funnel detail).
 */

/**
 * Format a fraction (0..1) as a one-decimal percent string.
 * e.g. 0.082 -> "8.2%". Non-finite input is guarded to "0.0%".
 *
 * The funnel math lives in src/lib/funnel.js; this only formats the result —
 * it never recomputes a rate.
 *
 * @param {number} fraction
 * @returns {string}
 */
export function formatPercent(fraction) {
  if (!Number.isFinite(fraction)) return '0.0%'
  return `${(fraction * 100).toFixed(1)}%`
}

/**
 * Format a whole-people count with thousands separators.
 * e.g. 4780 -> "4,780". Non-finite input is guarded to "0".
 *
 * @param {number} count
 * @returns {string}
 */
export function formatCount(count) {
  if (!Number.isFinite(count)) return '0'
  return new Intl.NumberFormat('en-US').format(count)
}
