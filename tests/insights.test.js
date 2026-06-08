// Unit tests for the pure rule engine in src/lib/insights.js (Iteration 5).
//
// Runs under the default `node` env (no DOM) — getInsights is pure. We assert by
// the public contract (id + severity + stepIndex + order + length), never by
// brittle full-object copy, since `text` copy can be retuned independently. Every
// boundary fixture is built off the exact thresholds in insights.js and respects
// the code's ≥ / < direction. Numbers embedded in `text` are verified via the
// same format helpers the lib uses, so host-locale / toFixed drift can't sneak in.
import { describe, it, expect } from 'vitest'
import { getInsights } from '../src/lib/insights.js'
import { stepDropoffRate } from '../src/lib/funnel.js'
import { formatPercent } from '../src/lib/format.js'
import campaigns from '../src/data/campaigns.json'

const byId = (id) => campaigns.find((c) => c.id === id)
const camp001 = byId('camp_001')
const camp002 = byId('camp_002')
const camp003 = byId('camp_003')
const camp004 = byId('camp_004')

// Reduce an insight list to the load-bearing contract triple, in order.
const shape = (insights) =>
  insights.map((i) => ({ id: i.id, severity: i.severity, stepIndex: i.stepIndex }))

// ---------------------------------------------------------------------------
// Per-campaign truth (independently derived from JSON + the rule operators).
// ---------------------------------------------------------------------------

describe('getInsights — per-campaign truth (real dataset)', () => {
  it('camp_001: A(crit,idx1) → B(warn,idx0) → C-strong(positive,idx3); D silent (overall 8.2% dead-zone)', () => {
    const result = getInsights(camp001)
    expect(result).toHaveLength(3)
    expect(shape(result)).toEqual([
      { id: 'capture-step-high-dropoff', severity: 'critical', stepIndex: 1 },
      { id: 'first-step-high-dropoff', severity: 'warning', stepIndex: 0 },
      { id: 'closing-step-strong', severity: 'positive', stepIndex: 3 },
    ])
    // overall-conversion rules must NOT fire in the 7%–12% dead zone.
    expect(result.some((i) => i.id.startsWith('overall-conversion'))).toBe(false)
  })

  it('camp_002: B(warn,idx0) → C-weak(warn,idx2); no A, no D; B before C-weak by magnitude', () => {
    const result = getInsights(camp002)
    expect(result).toHaveLength(2)
    expect(shape(result)).toEqual([
      { id: 'first-step-high-dropoff', severity: 'warning', stepIndex: 0 },
      { id: 'closing-step-weak', severity: 'warning', stepIndex: 2 },
    ])
    expect(result.some((i) => i.id === 'capture-step-high-dropoff')).toBe(false)
    expect(result.some((i) => i.id.startsWith('overall-conversion'))).toBe(false)
  })

  it('camp_003: B(warn,idx0) → C-strong(positive,idx4) → overall-strong(positive,null); warning before both positives', () => {
    const result = getInsights(camp003)
    expect(result).toHaveLength(3)
    expect(shape(result)).toEqual([
      { id: 'first-step-high-dropoff', severity: 'warning', stepIndex: 0 },
      { id: 'closing-step-strong', severity: 'positive', stepIndex: 4 },
      { id: 'overall-conversion-strong', severity: 'positive', stepIndex: null },
    ])
    // No capture step clears 60% here (rates 25% / 40% / 11%).
    expect(result.some((i) => i.id === 'capture-step-high-dropoff')).toBe(false)
  })

  it('camp_004: A(crit,idx2) → B(warn,idx0) → C-weak(warn,idx3); D-low dropped by the cap', () => {
    const result = getInsights(camp004)
    expect(result).toHaveLength(3)
    expect(shape(result)).toEqual([
      { id: 'capture-step-high-dropoff', severity: 'critical', stepIndex: 2 },
      { id: 'first-step-high-dropoff', severity: 'warning', stepIndex: 0 },
      { id: 'closing-step-weak', severity: 'warning', stepIndex: 3 },
    ])
    // D-low (overall ≈ 6.2%, < 7%) is a real candidate but is the lowest-magnitude
    // warning, so the cap of 3 drops it.
    expect(result.some((i) => i.id === 'overall-conversion-low')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Rule A: capture-step boundary + which step is picked + email/form wording.
// ---------------------------------------------------------------------------

describe('getInsights — Rule A (capture step, ≥ 60% drop)', () => {
  it('fires on a capture step whose drop-off is EXACTLY 60% (camp_004 email idx2)', () => {
    // 572/1430 = 0.40 exactly → drop-off exactly 0.60 → ≥ boundary fires.
    expect(stepDropoffRate(camp004.steps[2])).toBeCloseTo(0.6, 12)
    const a = getInsights(camp004).find((i) => i.id === 'capture-step-high-dropoff')
    expect(a).toBeDefined()
    expect(a.stepIndex).toBe(2)
  })

  it('does NOT fire just below 60% (59% drop)', () => {
    const fixture = {
      steps: [
        { name: 'Teaser', type: 'teaser', views: 1000, proceeds: 900 }, // rate 0.10, no B
        { name: 'Email', type: 'email', views: 1000, proceeds: 410 }, // rate 0.59 < 0.60
      ],
    }
    expect(getInsights(fixture).some((i) => i.id === 'capture-step-high-dropoff')).toBe(false)
  })

  it('picks the single WORST qualifying capture step by rate when several qualify', () => {
    const fixture = {
      steps: [
        { name: 'Teaser', type: 'teaser', views: 1000, proceeds: 900 }, // no B
        { name: 'Email A', type: 'email', views: 1000, proceeds: 350 }, // rate 0.65
        { name: 'Email B', type: 'email', views: 1000, proceeds: 200 }, // rate 0.80 (worst)
      ],
    }
    const a = getInsights(fixture).find((i) => i.id === 'capture-step-high-dropoff')
    expect(a.stepIndex).toBe(2)
    expect(a.text).toContain('80.0%')
    expect(a.text).toContain('Email B')
  })

  it('uses "email" wording + camp_001 anchor copy (73.0%, 2,350 people, "Email capture")', () => {
    const a = getInsights(camp001).find((i) => i.id === 'capture-step-high-dropoff')
    expect(a.title).toContain('email')
    expect(a.title).not.toContain('sign-up')
    expect(a.text).toContain('73.0%')
    expect(a.text).toContain('2,350 people')
    expect(a.text).toContain('"Email capture"')
  })

  it('uses "sign-up" wording for a type "form" capture step', () => {
    const fixture = {
      steps: [
        { name: 'Teaser', type: 'teaser', views: 1000, proceeds: 900 }, // no B
        { name: 'Sign up', type: 'form', views: 100, proceeds: 30 }, // rate 0.70 → A fires
      ],
    }
    const a = getInsights(fixture).find((i) => i.id === 'capture-step-high-dropoff')
    expect(a.title).toContain('sign-up')
    expect(a.title).not.toContain('email')
  })

  it('singular guard: a capture step that loses exactly 1 person reads "1 person"', () => {
    const fixture = {
      steps: [
        { name: 'Teaser', type: 'teaser', views: 1000, proceeds: 900 }, // no B
        { name: 'Email', type: 'email', views: 1, proceeds: 0 }, // abs 1, rate 1.0 → A fires
      ],
    }
    const a = getInsights(fixture).find((i) => i.id === 'capture-step-high-dropoff')
    expect(a.text).toContain('1 person')
    expect(a.text).not.toContain('1 people')
  })
})

// ---------------------------------------------------------------------------
// Rule B: first-step copy is lib-tied (toFixed-ambiguous → build via formatPercent).
// ---------------------------------------------------------------------------

describe('getInsights — Rule B (first/teaser step)', () => {
  it("camp_001 first-step text uses formatPercent(dropoffRate) (don't hardcode 59.7%)", () => {
    const b = getInsights(camp001).find((i) => i.id === 'first-step-high-dropoff')
    const expected = formatPercent(stepDropoffRate(camp001.steps[0]))
    expect(expected).toBe('59.7%') // documents the lib's rounding for this anchor
    expect(b.text).toContain(expected)
    expect(b.stepIndex).toBe(0)
  })

  it('does NOT fire when the first step is not a teaser, even with a huge drop', () => {
    const fixture = {
      steps: [
        { name: 'Engaged', type: 'engagement', views: 1000, proceeds: 100 }, // rate 0.90 but not teaser
        { name: 'Done', type: 'conversion', views: 100, proceeds: 80 }, // conv 0.80 dead zone
      ],
    }
    expect(getInsights(fixture).some((i) => i.id === 'first-step-high-dropoff')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Rule C: closing-step, both branches + dead zone, boundaries on ≥0.85 / <0.70.
// Each fixture isolates C: first step is non-teaser, no capture step, overall in
// the 7%–12% dead zone so D stays silent.
// ---------------------------------------------------------------------------

const closingFixture = (lastViews, lastProceeds, firstViews) => ({
  steps: [
    { name: 'Entry', type: 'engagement', views: firstViews, proceeds: lastViews },
    { name: 'Coupon redeemed', type: 'conversion', views: lastViews, proceeds: lastProceeds },
  ],
})

describe('getInsights — Rule C (closing step)', () => {
  it('C-strong fires at EXACTLY 85% completion (≥ boundary)', () => {
    const result = getInsights(closingFixture(100, 85, 1000)) // overall 8.5%
    expect(shape(result)).toEqual([
      { id: 'closing-step-strong', severity: 'positive', stepIndex: 1 },
    ])
    expect(result[0].text).toContain('85.0%')
  })

  it('dead zone: 84% completion → no closing insight', () => {
    expect(getInsights(closingFixture(100, 84, 1000))).toEqual([])
  })

  it('C-weak does NOT fire at EXACTLY 70% completion (< boundary, dead zone)', () => {
    expect(getInsights(closingFixture(100, 70, 800))).toEqual([]) // overall 8.75%
  })

  it('C-weak fires just below 70% (69% completion)', () => {
    const result = getInsights(closingFixture(100, 69, 800)) // overall 8.6%
    expect(shape(result)).toEqual([
      { id: 'closing-step-weak', severity: 'warning', stepIndex: 1 },
    ])
    expect(result[0].text).toContain('69.0%')
  })

  it('C-positive anchor copy: camp_001 closing step → "91.1%" + "Coupon redeemed"', () => {
    const c = getInsights(camp001).find((i) => i.id === 'closing-step-strong')
    expect(c.text).toContain('91.1%')
    expect(c.text).toContain('Coupon redeemed')
  })

  it('C-warning anchor copy: camp_002 closing step → "60.0%" + "Checkout complete"', () => {
    const c = getInsights(camp002).find((i) => i.id === 'closing-step-weak')
    expect(c.text).toContain('60.0%')
    expect(c.text).toContain('Checkout complete')
  })
})

// ---------------------------------------------------------------------------
// Rule D: overall conversion, both branches + dead zone, boundaries on <0.07 / >0.12.
// Each fixture isolates D: first step non-teaser, no capture, closing conv in the
// 70%–85% dead zone so C stays silent.
// ---------------------------------------------------------------------------

// firstViews drives overall = lastProceeds / firstViews; closing conv held ~0.80.
const overallFixture = (firstViews) => ({
  steps: [
    { name: 'Entry', type: 'engagement', views: firstViews, proceeds: 150 },
    { name: 'Done', type: 'conversion', views: 150, proceeds: 120 }, // conv 0.80 (C dead zone)
  ],
})

describe('getInsights — Rule D (overall conversion)', () => {
  it('D-low does NOT fire at EXACTLY 7% (< boundary, dead zone)', () => {
    // 120/firstViews = 0.07 → firstViews ≈ 1714.28; use exact-7% via 70/1000.
    const fixture = {
      steps: [
        { name: 'Entry', type: 'engagement', views: 1000, proceeds: 90 },
        { name: 'Done', type: 'conversion', views: 90, proceeds: 70 }, // conv 0.777 dead zone
      ],
    }
    expect(getInsights(fixture)).toEqual([]) // overall exactly 7.0%
  })

  it('D-low fires just below 7% overall', () => {
    const result = getInsights(overallFixture(2400)) // 120/2400 = 5.0%
    expect(shape(result)).toEqual([
      { id: 'overall-conversion-low', severity: 'warning', stepIndex: null },
    ])
  })

  it('D-high does NOT fire at EXACTLY 12% (> boundary, dead zone)', () => {
    expect(getInsights(overallFixture(1000))).toEqual([]) // 120/1000 = 12.0%
  })

  it('D-high fires just above 12% overall', () => {
    const result = getInsights(overallFixture(900)) // 120/900 ≈ 13.3%
    expect(shape(result)).toEqual([
      { id: 'overall-conversion-strong', severity: 'positive', stepIndex: null },
    ])
  })

  it('D-high anchor copy: camp_003 overall → "14.0%"', () => {
    const d = getInsights(camp003).find((i) => i.id === 'overall-conversion-strong')
    expect(d.text).toContain('14.0%')
  })
})

// ---------------------------------------------------------------------------
// Ordering: severity dominates magnitude; magnitude orders within a tier.
// ---------------------------------------------------------------------------

describe('getInsights — ordering', () => {
  it('severity rank wins over magnitude (critical < warning < positive)', () => {
    const ranks = { critical: 0, warning: 1, positive: 2 }
    for (const camp of [camp001, camp003, camp004]) {
      const seq = getInsights(camp).map((i) => ranks[i.severity])
      const sorted = [...seq].sort((a, b) => a - b)
      expect(seq).toEqual(sorted)
    }
  })

  it('camp_003 puts a high-magnitude positive AFTER a lower-magnitude warning (severity dominates)', () => {
    // closing-step-strong magnitude 0.875 > first-step-high-dropoff magnitude 0.60,
    // yet the warning still comes first because severity outranks magnitude.
    const result = getInsights(camp003)
    expect(result[0].id).toBe('first-step-high-dropoff')
    expect(result[0].severity).toBe('warning')
    expect(result[1].severity).toBe('positive')
  })

  it('intra-tier: camp_004 warnings ordered by descending magnitude (B 0.60 before C-weak 0.30)', () => {
    const result = getInsights(camp004)
    const warnings = result.filter((i) => i.severity === 'warning').map((i) => i.id)
    expect(warnings).toEqual(['first-step-high-dropoff', 'closing-step-weak'])
  })

  it('intra-tier: camp_003 positives ordered by magnitude (C-strong 0.875 before overall-strong 0.02)', () => {
    const result = getInsights(camp003)
    const positives = result.filter((i) => i.severity === 'positive').map((i) => i.id)
    expect(positives).toEqual(['closing-step-strong', 'overall-conversion-strong'])
  })
})

// ---------------------------------------------------------------------------
// Cap: 4 candidates incl. a positive → length 3, and the POSITIVE is the casualty.
// ---------------------------------------------------------------------------

describe('getInsights — cap at 3', () => {
  // A(crit) + B(warn) + D-low(warn) + C-strong(positive). Sorted: A, B, D-low, C.
  // Cap 3 → the positive (lowest-priority tier) is dropped; criticals/warnings survive.
  const capFixture = {
    steps: [
      { name: 'Exit popup', type: 'teaser', views: 10000, proceeds: 4000 }, // B: rate 0.60
      { name: 'Email capture', type: 'email', views: 4000, proceeds: 1000 }, // A: rate 0.75
      { name: 'Offer clicked', type: 'engagement', views: 1000, proceeds: 500 }, // inert
      { name: 'Purchase', type: 'conversion', views: 500, proceeds: 450 }, // C-strong conv 0.90
    ],
  }

  it('returns exactly 3 insights even though 4 rules fire', () => {
    expect(getInsights(capFixture)).toHaveLength(3)
  })

  it('drops the positive (praise), keeps the critical + both warnings', () => {
    const result = getInsights(capFixture)
    expect(result.some((i) => i.severity === 'positive')).toBe(false)
    expect(shape(result)).toEqual([
      { id: 'capture-step-high-dropoff', severity: 'critical', stepIndex: 1 },
      { id: 'first-step-high-dropoff', severity: 'warning', stepIndex: 0 },
      { id: 'overall-conversion-low', severity: 'warning', stepIndex: null },
    ])
  })
})

// ---------------------------------------------------------------------------
// Empty / degenerate / edge input — always a valid array, never a throw or NaN.
// ---------------------------------------------------------------------------

describe('getInsights — empty & edge input', () => {
  it('returns [] when no rule fires (healthy mid-range funnel, every metric in its dead zone)', () => {
    // Non-teaser entry (no B), no capture step (no A), closing conv 0.80 (C dead
    // zone), overall 80/1000 = 8% (D dead zone) → nothing to say.
    expect(getInsights(closingFixture(100, 80, 1000))).toEqual([])
  })

  it('single-step campaign → [] (no internal flow to diagnose)', () => {
    expect(getInsights({ steps: [{ name: 'Only', type: 'teaser', views: 1000, proceeds: 100 }] })).toEqual([])
  })

  it('empty steps array → []', () => {
    expect(getInsights({ steps: [] })).toEqual([])
  })

  it('missing / null campaign → [] (no throw)', () => {
    expect(getInsights(undefined)).toEqual([])
    expect(getInsights(null)).toEqual([])
    expect(getInsights({})).toEqual([])
  })

  it('first step has zero views → [] (degenerate, no entry traffic)', () => {
    const fixture = {
      steps: [
        { name: 'Teaser', type: 'teaser', views: 0, proceeds: 0 },
        { name: 'Email', type: 'email', views: 0, proceeds: 0 },
      ],
    }
    expect(getInsights(fixture)).toEqual([])
  })

  it('a zero-views capture step does NOT fire Rule A (guarded rate is 0, not NaN)', () => {
    const fixture = {
      steps: [
        { name: 'Teaser', type: 'teaser', views: 1000, proceeds: 900 }, // rate 0.10, no B
        { name: 'Email', type: 'email', views: 0, proceeds: 0 }, // 0-drop empty step
      ],
    }
    const result = getInsights(fixture)
    expect(Array.isArray(result)).toBe(true)
    expect(result.some((i) => i.id === 'capture-step-high-dropoff')).toBe(false)
  })

  it('never emits NaN / Infinity in any title or text across all dataset + edge fixtures', () => {
    const edge = [
      { steps: [] },
      { steps: [{ name: 'a', type: 'teaser', views: 0, proceeds: 0 }] },
      { steps: [{ name: 'a', type: 'teaser', views: 0, proceeds: 0 }, { name: 'b', type: 'conversion', views: 0, proceeds: 0 }] },
      { steps: [{ name: 'a', type: 'teaser', views: 1000, proceeds: 900 }, { name: 'b', type: 'email', views: 0, proceeds: 0 }] },
    ]
    for (const camp of [...campaigns, ...edge]) {
      for (const insight of getInsights(camp)) {
        expect(insight.title).not.toMatch(/NaN|Infinity/)
        expect(insight.text).not.toMatch(/NaN|Infinity/)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// Purity: getInsights must not mutate its input.
// ---------------------------------------------------------------------------

describe('getInsights — purity', () => {
  it('does not mutate the campaign it is given', () => {
    const original = byId('camp_004')
    const clone = structuredClone(original)
    getInsights(original)
    expect(original).toEqual(clone)
  })
})
