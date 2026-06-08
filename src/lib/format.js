/**
 * Display formatting helpers. Pure, no Vue/DOM, so they can be unit-tested in
 * isolation and reused across screens (campaign list, funnel detail).
 *
 * Output follows Hungarian convention: a SPACE groups thousands and a COMMA is
 * the decimal separator (the UI is Hungarian).
 */

/**
 * Format a fraction (0..1) as a one-decimal percent string, Hungarian style
 * (comma decimal separator). e.g. 0.082 -> "8,2%". Non-finite input is guarded
 * to "0.0%" (unchanged guard behaviour — do not regress).
 *
 * The funnel math lives in src/lib/funnel.js; this only formats the result —
 * it never recomputes a rate.
 *
 * @param {number} fraction
 * @returns {string}
 */
export function formatPercent(fraction) {
  if (!Number.isFinite(fraction)) return '0.0%'
  return `${(fraction * 100).toFixed(1).replace('.', ',')}%`
}

/**
 * Format a whole-people count with thousands separators, Hungarian style: a
 * regular ASCII SPACE groups every three digits. e.g. 10000 -> "10 000",
 * 2350 -> "2 350", 850 -> "850". Non-finite input is guarded to "0".
 *
 * Note: Intl 'hu-HU' only groups numbers with 5+ digits (2350 -> "2350") and
 * emits a non-breaking space, both of which are surprising and test-fragile.
 * We instead group via 'en-US' (every three digits) and swap its comma for a
 * regular ASCII space (U+0020), so the output is deterministic and matches the
 * Hungarian "2 350" convention.
 *
 * @param {number} count
 * @returns {string}
 */
export function formatCount(count) {
  if (!Number.isFinite(count)) return '0'
  return new Intl.NumberFormat('en-US').format(count).replace(/,/g, ' ')
}
