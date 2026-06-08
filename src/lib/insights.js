/**
 * Pure, rule-based insight engine for popup-campaign funnels.
 *
 * No Vue, no DOM — fully unit-testable in isolation. The `Insights` panel calls
 * `getInsights(campaign)` once and renders whatever it returns; it computes no
 * rules itself. All funnel math is delegated to the already-guarded helpers in
 * `funnel.js` (this module never reimplements a rate), and every number embedded
 * in `text` is pre-formatted via `format.js` so the UI never re-rounds.
 *
 * An Insight has the shape:
 *   {
 *     id: string,                                  // stable rule id (render key + testid hook)
 *     severity: "critical" | "warning" | "positive",
 *     title: string,                               // short scannable headline
 *     text: string,                                // recommendation with formatted numbers
 *     stepIndex: number | null                     // 0-based target step, null for campaign-wide
 *   }
 *
 * `getInsights` returns an array already sorted most-important-first
 * (critical → warning → positive; larger magnitude first within a tier) and
 * capped at 3. It returns [] (never null) for degenerate input and never
 * produces NaN/Infinity/crashes.
 */

import {
  stepConversion,
  stepDropoffRate,
  stepDropoffAbs,
  overallConversion,
} from './funnel.js'
import { formatPercent, formatCount } from './format.js'

// --- Thresholds (tunable design cut-offs; qa builds boundary fixtures off these) ---
const CAPTURE_DROPOFF_MIN = 0.6 // Rule A: capture step drop-off >= 60% is critical
const FIRST_STEP_DROPOFF_MIN = 0.55 // Rule B: entry step drop-off >= 55% is a warning
const CLOSING_STRONG_MIN = 0.85 // Rule C-positive: final step completion >= 85%
const CLOSING_WEAK_MAX = 0.7 // Rule C-warning: final step completion < 70%
const OVERALL_LOW_MAX = 0.07 // Rule D-low: overall conversion < 7%
const OVERALL_HIGH_MIN = 0.12 // Rule D-high: overall conversion > 12%

const MAX_INSIGHTS = 3
const SEVERITY_RANK = { critical: 0, warning: 1, positive: 2 }

const CAPTURE_TYPES = new Set(['email', 'form'])

// Hungarian "fő" is invariant after a number, so no singular/plural branch.
function peopleLabel(count) {
  return `${formatCount(count)} fő`
}

/**
 * Rule A — a capture step (type "email"/"form") is bleeding people.
 * Picks the single worst qualifying capture step (highest drop-off rate).
 */
function captureStepInsight(steps) {
  let worst = null
  steps.forEach((step, index) => {
    if (!CAPTURE_TYPES.has(step.type)) return
    const rate = stepDropoffRate(step)
    if (rate < CAPTURE_DROPOFF_MIN) return
    const abs = stepDropoffAbs(step)
    if (!worst || rate > worst.rate || (rate === worst.rate && abs > worst.abs)) {
      worst = { index, step, rate, abs }
    }
  })
  if (!worst) return null

  // The article is baked into the label so the title reads correctly for both
  // values: "az e-mailes lépés" vs "a regisztrációs lépés".
  const typeWord = worst.step.type === 'email' ? 'az e-mailes' : 'a regisztrációs'
  return {
    id: 'capture-step-high-dropoff',
    severity: 'critical',
    title: `A legtöbb látogatót ${typeWord} lépés veszíti el`,
    text:
      `A látogatók ${formatPercent(worst.rate)}-a lemorzsolódik ennél a lépésnél: ` +
      `"${worst.step.name}" (${peopleLabel(worst.abs)}). Kérje be az e-mail-címet később ` +
      `a folyamatban, vagy kínáljon egykattintásos / közösségi bejelentkezést a súrlódás csökkentésére.`,
    stepIndex: worst.index,
    _magnitude: worst.rate,
    _tiebreak: worst.abs,
  }
}

/** Rule B — big drop at the very first (teaser) step. */
function firstStepInsight(steps) {
  const step = steps[0]
  const rate = stepDropoffRate(step)
  if (step.type !== 'teaser' || rate < FIRST_STEP_DROPOFF_MIN) return null

  const abs = stepDropoffAbs(step)
  return {
    id: 'first-step-high-dropoff',
    severity: 'warning',
    title: 'A legtöbben rögtön az első lépésnél lemorzsolódnak',
    text:
      `A látogatók ${formatPercent(rate)}-a rögtön ezután lemorzsolódik: "${step.name}" ` +
      `(${peopleLabel(abs)}). Egy világosabb címsor vagy egy erősebb ajánlat az elején ` +
      `többeket tarthatna meg a folyamatban.`,
    stepIndex: 0,
    _magnitude: rate,
    _tiebreak: abs,
  }
}

/** Rule C — the closing (final) step's completion rate, two-sided. */
function closingStepInsight(steps) {
  const index = steps.length - 1
  const step = steps[index]
  if (!(step.views > 0)) return null // no one reached the end → nothing to say

  const conv = stepConversion(step)
  if (conv >= CLOSING_STRONG_MIN) {
    return {
      id: 'closing-step-strong',
      severity: 'positive',
      title: 'A záró lépés jól működik',
      text:
        `Akik eljutnak idáig ("${step.name}"), azok ${formatPercent(conv)}-a be is fejezi. ` +
        `Az ajánlat és a záró lépés rendben van — a tölcsér korábbi szakaszaira érdemes koncentrálni.`,
      stepIndex: index,
      _magnitude: conv,
      _tiebreak: 0,
    }
  }
  if (conv < CLOSING_WEAK_MAX) {
    return {
      id: 'closing-step-weak',
      severity: 'warning',
      title: 'Még a végére eljutók sem konvertálnak mind',
      text:
        `Itt csak ${formatPercent(conv)} fejezi be: "${step.name}". Egy erősebb záró ajánlat ` +
        `vagy egy egyszerűbb utolsó lépés többeket konvertálhatna az idáig eljutók közül.`,
      stepIndex: index,
      _magnitude: 1 - conv, // worse (lower completion) → larger magnitude
      _tiebreak: 0,
    }
  }
  return null
}

/** Rule D — campaign-wide overall conversion note, two-sided. */
function overallInsight(campaign) {
  const overall = overallConversion(campaign)
  if (overall < OVERALL_LOW_MAX) {
    return {
      id: 'overall-conversion-low',
      severity: 'warning',
      title: 'Az összesített konverzió alacsony',
      text:
        `A látogatóknak csak ${formatPercent(overall)}-a fejezi be ezt a kampányt. ` +
        `A fenti legnagyobb lemorzsolódás javítása a leggyorsabb módja ennek a számnak a növelésére.`,
      stepIndex: null,
      _magnitude: OVERALL_LOW_MAX - overall, // distance below the threshold
      _tiebreak: 0,
    }
  }
  if (overall > OVERALL_HIGH_MIN) {
    return {
      id: 'overall-conversion-strong',
      severity: 'positive',
      title: 'Ez a kampány jól konvertál',
      text:
        `A látogatók ${formatPercent(overall)}-a fejezi be ezt a kampányt — ez erős eredmény ` +
        `egy többlépcsős popupnál. Érdemes futni hagyni, és sablonként használni a többihez.`,
      stepIndex: null,
      _magnitude: overall - OVERALL_HIGH_MIN, // distance above the threshold
      _tiebreak: 0,
    }
  }
  return null
}

/**
 * Produce the ordered, capped list of insights for a campaign.
 *
 * @param {{ steps?: Array<{ name: string, type: string, views: number, proceeds: number }> }} campaign
 * @returns {Array<{ id: string, severity: string, title: string, text: string, stepIndex: number|null }>}
 *   Most-important-first, capped at 3. Empty for degenerate input
 *   (no campaign, single-step, or a funnel with no entry traffic).
 */
export function getInsights(campaign) {
  const steps = campaign?.steps ?? []
  // Single-step / empty funnels have no internal flow to diagnose; a funnel with
  // no entry traffic is degenerate. Either way: nothing meaningful to suggest.
  if (steps.length < 2) return []
  if (!(steps[0].views > 0)) return []

  const candidates = [
    captureStepInsight(steps),
    firstStepInsight(steps),
    closingStepInsight(steps),
    overallInsight(campaign),
  ].filter(Boolean)

  candidates.sort((a, b) => {
    if (SEVERITY_RANK[a.severity] !== SEVERITY_RANK[b.severity]) {
      return SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
    }
    if (b._magnitude !== a._magnitude) return b._magnitude - a._magnitude
    return b._tiebreak - a._tiebreak
  })

  // Strip the internal sort keys; the public Insight shape is the contract.
  return candidates
    .slice(0, MAX_INSIGHTS)
    .map(({ _magnitude, _tiebreak, ...insight }) => insight)
}
