/**
 * Pure funnel-math functions for popup-campaign analytics.
 *
 * No Vue, no DOM — these are fully unit-testable in isolation. UI components
 * import and display these results; they never reimplement the math.
 *
 * A step has the shape { views: number, proceeds: number } (extra fields like
 * `name`/`type` are ignored here). A campaign has the shape { steps: Step[] }.
 *
 * Every division is guarded against `views === 0` so we never return
 * NaN or Infinity.
 */

/**
 * Share of viewers who continued from this step.
 * @returns {number} proceeds / views, or 0 when views is 0.
 */
export function stepConversion(step) {
  return step.views > 0 ? step.proceeds / step.views : 0
}

/**
 * Share of viewers lost at this step.
 * @returns {number} 1 - proceeds / views, or 0 when views is 0.
 */
export function stepDropoffRate(step) {
  return step.views > 0 ? 1 - step.proceeds / step.views : 0
}

/**
 * Absolute number of people lost at this step.
 * @returns {number} views - proceeds.
 */
export function stepDropoffAbs(step) {
  return step.views - step.proceeds
}

/**
 * End-to-end conversion: people who completed the last step relative to the
 * people who entered the first step.
 * @returns {number} last.proceeds / first.views, or 0 when empty / first.views is 0.
 */
export function overallConversion(campaign) {
  const steps = campaign.steps
  if (!steps || steps.length === 0) return 0
  const first = steps[0]
  const last = steps[steps.length - 1]
  return first.views > 0 ? last.proceeds / first.views : 0
}

/**
 * The "problem" step: highest drop-off rate. Ties are broken by highest
 * absolute drop-off, then by earliest index.
 *
 * @returns {{ index: number, step: object, conversion: number,
 *   dropoffRate: number, dropoffAbs: number } | null} null when there are no steps.
 */
export function worstStep(campaign) {
  const steps = campaign.steps
  if (!steps || steps.length === 0) return null

  let worstIndex = 0
  let worstRate = stepDropoffRate(steps[0])
  let worstAbs = stepDropoffAbs(steps[0])

  for (let i = 1; i < steps.length; i++) {
    const rate = stepDropoffRate(steps[i])
    const abs = stepDropoffAbs(steps[i])
    // Strict comparisons keep the earliest index on a tie.
    if (rate > worstRate || (rate === worstRate && abs > worstAbs)) {
      worstIndex = i
      worstRate = rate
      worstAbs = abs
    }
  }

  const step = steps[worstIndex]
  return {
    index: worstIndex,
    step,
    conversion: stepConversion(step),
    dropoffRate: worstRate,
    dropoffAbs: worstAbs,
  }
}
