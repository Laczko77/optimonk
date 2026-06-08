<script setup>
import { computed } from 'vue'
import { stepConversion, stepDropoffRate, stepDropoffAbs } from '../lib/funnel.js'
import { formatPercent, formatCount } from '../lib/format.js'

const props = defineProps({
  step: { type: Object, required: true },
  index: { type: Number, required: true },
  isLast: { type: Boolean, required: true },
  barDenominator: { type: Number, required: true },
  // Iteration 4: when true, this step is the worst (highest drop-off rate) and
  // gets the accessible alert treatment (tinted block, left accent, badge,
  // alert-tone bar). Colour is never the only signal — the badge always shows.
  isWorst: { type: Boolean, default: false },
})

// All math comes from funnel.js; this component never recomputes a rate inline.
const conversion = computed(() => stepConversion(props.step))
const dropoffRate = computed(() => stepDropoffRate(props.step))
const dropoffAbs = computed(() => stepDropoffAbs(props.step))

// Bar width is proportional to views, normalised to the funnel's largest step.
// Guard: a zero denominator renders every bar at 0% width.
const barWidthPercent = computed(() =>
  props.barDenominator > 0 ? (props.step.views / props.barDenominator) * 100 : 0,
)
const barStyle = computed(() => ({ width: `${barWidthPercent.value}%` }))
// A non-zero but tiny bar keeps a small minimum visible width so its share stays
// legible; a genuinely zero-views step shows an empty track (no min-width).
const hasBar = computed(() => props.step.views > 0)

const viewsLabel = computed(() => `${formatCount(props.step.views)} people`)

// Singular guard so "1 person" reads naturally.
const lostNoun = computed(() => (dropoffAbs.value === 1 ? 'person' : 'people'))

const resultLine = computed(() => {
  if (props.isLast) {
    return `${formatPercent(conversion.value)} complete · ${formatCount(dropoffAbs.value)} ${lostNoun.value} didn't complete`
  }
  return `${formatPercent(conversion.value)} continue · ${formatPercent(dropoffRate.value)} drop off (${formatCount(dropoffAbs.value)} ${lostNoun.value} lost)`
})
</script>

<template>
  <div
    data-testid="funnel-step"
    :data-step-index="index"
    :data-is-worst="isWorst ? 'true' : null"
    :class="
      isWorst
        ? 'rounded-lg border-l-4 border-rose-500 bg-rose-50 p-4'
        : ''
    "
  >
    <div class="flex items-baseline gap-3">
      <span class="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Step {{ index + 1 }}
      </span>
      <h3 class="text-base font-medium text-slate-900" data-testid="funnel-step-name">
        {{ step.name }}
      </h3>
      <span
        class="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600"
        :class="isWorst ? '' : 'ml-auto'"
        data-testid="funnel-step-type"
      >
        {{ step.type }}
      </span>
      <span
        v-if="isWorst"
        class="ml-auto shrink-0 rounded-full bg-rose-600 px-2.5 py-0.5 text-xs font-semibold text-white"
        data-testid="worst-step-badge"
      >
        <span aria-hidden="true">⚠</span> Biggest drop-off
      </span>
    </div>

    <div class="mt-2 flex items-center gap-3">
      <div class="h-4 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          class="h-full rounded-full"
          :class="[isWorst ? 'bg-rose-500' : 'bg-indigo-500', { 'min-w-[0.5rem]': hasBar }]"
          :style="barStyle"
          data-testid="funnel-step-bar"
        />
      </div>
      <span
        class="shrink-0 text-sm font-medium tabular-nums text-slate-700"
        data-testid="funnel-step-views"
      >
        {{ viewsLabel }}
      </span>
    </div>

    <p class="mt-1.5 text-sm text-slate-500" data-testid="funnel-step-result">
      {{ resultLine }}
    </p>
  </div>
</template>
