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

const viewsLabel = computed(() => `${formatCount(props.step.views)} fő`)

const resultLine = computed(() => {
  if (props.isLast) {
    return `${formatPercent(conversion.value)} befejezi · ${formatCount(dropoffAbs.value)} fő nem fejezte be`
  }
  return `${formatPercent(conversion.value)} lép tovább · ${formatPercent(dropoffRate.value)} lemorzsolódik (${formatCount(dropoffAbs.value)} fő kiesik)`
})
</script>

<template>
  <div
    data-testid="funnel-step"
    :data-step-index="index"
    :data-is-worst="isWorst ? 'true' : null"
    :class="
      isWorst
        ? 'rounded-2xl border border-warn/20 border-l-4 border-l-warn bg-warn-soft p-4 shadow-sm'
        : ''
    "
  >
    <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span class="shrink-0 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {{ index + 1 }}. lépés
      </span>
      <h3
        class="min-w-0 break-words text-base font-bold text-ink"
        data-testid="funnel-step-name"
      >
        {{ step.name }}
      </h3>
      <span
        class="shrink-0 rounded-full bg-bg-soft px-2.5 py-0.5 text-xs font-medium text-ink-muted ring-1 ring-border"
        :class="isWorst ? '' : 'ml-auto'"
        data-testid="funnel-step-type"
      >
        {{ step.type }}
      </span>
      <span
        v-if="isWorst"
        class="ml-auto shrink-0 rounded-full bg-warn px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm"
        data-testid="worst-step-badge"
      >
        <span aria-hidden="true">⚠</span> Legnagyobb lemorzsolódás
      </span>
    </div>

    <div class="mt-2 flex items-center gap-3">
      <div class="h-4 w-full overflow-hidden rounded-full bg-bg-soft ring-1 ring-border">
        <div
          class="h-full rounded-full transition-all duration-300"
          :class="[isWorst ? 'bg-warn' : 'bg-primary', { 'min-w-[0.5rem]': hasBar }]"
          :style="barStyle"
          data-testid="funnel-step-bar"
        />
      </div>
      <span
        class="shrink-0 text-sm font-semibold tabular-nums text-ink"
        data-testid="funnel-step-views"
      >
        {{ viewsLabel }}
      </span>
    </div>

    <p class="mt-1.5 text-sm text-ink-muted" data-testid="funnel-step-result">
      {{ resultLine }}
    </p>
  </div>
</template>
