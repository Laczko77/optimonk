<script setup>
import { computed, ref } from 'vue'
import { overallConversion, worstStep, worstStepByAbsolute } from '../lib/funnel.js'
import { formatPercent, formatCount } from '../lib/format.js'
import FunnelStep from './FunnelStep.vue'
import Insights from './Insights.vue'

const props = defineProps({
  // The already-selected campaign, passed in by App.vue. This component does
  // not look the campaign up itself.
  campaign: { type: Object, required: true },
})

const emit = defineEmits(['back'])

const steps = computed(() => props.campaign.steps ?? [])

const stepCount = computed(() => steps.value.length)
const stepCountLabel = computed(() => `${stepCount.value} lépés`)

// Display-only formatting; the math comes from funnel.js.
const conversionLabel = computed(() => formatPercent(overallConversion(props.campaign)))

// Hungarian device labels for the known dataset values; unknown values fall
// back to the raw value capitalised (the dataset itself stays untranslated).
const DEVICE_LABELS = { desktop: 'Asztali', mobile: 'Mobil' }
const deviceLabel = computed(() => {
  const device = props.campaign.device ?? ''
  return DEVICE_LABELS[device] ?? device.charAt(0).toUpperCase() + device.slice(1)
})

// One bar denominator for the whole funnel = the largest views across the
// steps (in consistent data this is the first step). Used so every bar is
// comparable. Guard: no steps -> 0 -> every bar renders at width 0.
const barDenominator = computed(() =>
  steps.value.reduce((max, step) => Math.max(max, step.views), 0),
)

// --- Iteration 4: worst-step highlight (additive layer) ---
// Suppressed for single-step / empty funnels: a one-step funnel has no internal
// drop-off to diagnose, so the highlight is misleading noise.
const worst = computed(() => worstStep(props.campaign))
const worstAbs = computed(() => worstStepByAbsolute(props.campaign))
const highlightActive = computed(() => steps.value.length > 1 && worst.value !== null)

// Split for scannability: a bold-red headline (which step) plus a neutral,
// normal-weight detail line (the numbers). The math still comes from funnel.js.
const calloutHeadline = computed(() => {
  if (!highlightActive.value) return ''
  const w = worst.value
  return `Legnagyobb lemorzsolódás — ${w.index + 1}. lépés: ${w.step.name}`
})
const calloutDetail = computed(() => {
  if (!highlightActive.value) return ''
  const w = worst.value
  return (
    `A látogatók ${formatPercent(w.dropoffRate)}-a távozik itt ` +
    `(${formatCount(w.dropoffAbs)} fő); csak ${formatPercent(w.conversion)} lép tovább.`
  )
})

// Secondary note only when the rate-worst and absolute-worst steps differ.
const showNote = computed(
  () => highlightActive.value && worst.value.index !== worstAbs.value.index,
)
const calloutNote = computed(() => {
  if (!showNote.value) return ''
  const a = worstAbs.value
  const w = worst.value
  return (
    `Megjegyzés: összességében a legtöbb látogatót ez a lépés veszíti el — ` +
    `${a.index + 1}. lépés: ${a.step.name} (${formatCount(a.dropoffAbs)} fő), ` +
    `de arányát tekintve a legnagyobb lemorzsolódás a(z) ${w.index + 1}. lépésnél van.`
  )
})

// Focus target on view switch (App.vue): moving focus to the back button keeps
// keyboard orientation when the list unmounts. Exposed so the parent can call
// it after nextTick, without breaking the component boundary.
const backButtonRef = ref(null)
defineExpose({ focus: () => backButtonRef.value?.focus() })
</script>

<template>
  <section
    class="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6"
    data-testid="detail-view"
    :data-campaign-id="campaign.id"
  >
    <button
      ref="backButtonRef"
      type="button"
      class="inline-flex cursor-pointer items-center gap-1 rounded-full border border-border bg-bg px-4 py-1.5 text-sm font-semibold text-ink-muted shadow-sm transition hover:border-primary/40 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      data-testid="back-button"
      @click="emit('back')"
    >
      <span aria-hidden="true">&larr;</span>
      Vissza a kampányokhoz
    </button>

    <header class="mt-6">
      <div class="flex items-start justify-between gap-3">
        <h1 class="min-w-0 break-words text-3xl font-extrabold tracking-tight text-ink">
          {{ campaign.name }}
        </h1>
        <span
          class="shrink-0 rounded-full bg-bg-soft px-2.5 py-0.5 text-xs font-semibold text-ink-muted ring-1 ring-border"
          data-testid="detail-device"
        >
          {{ deviceLabel }}
        </span>
      </div>
      <p class="mt-2 text-sm text-ink-muted" data-testid="detail-summary">
        {{ stepCountLabel }} · {{ conversionLabel }} összesített konverzió
      </p>
    </header>

    <!--
      Iteration 4 worst-step callout lives in this reserved slot, directly under
      the header. Rendered only when the highlight is active (multi-step funnel
      with a worst step); suppressed entirely otherwise.
    -->
    <div data-testid="callout-slot">
      <div
        v-if="highlightActive"
        class="mt-6 rounded-2xl border border-warn/20 border-l-4 border-l-warn bg-warn-soft p-5 shadow-sm"
        data-testid="worst-step-callout"
        role="status"
      >
        <p
          class="text-sm font-semibold text-warn"
          data-testid="worst-step-callout-headline"
        >
          <span aria-hidden="true">⚠</span> {{ calloutHeadline }}
        </p>
        <p
          class="mt-1 text-sm font-normal text-ink-muted"
          data-testid="worst-step-callout-detail"
        >
          {{ calloutDetail }}
        </p>
        <p
          v-if="showNote"
          class="mt-2 text-sm text-ink-muted"
          data-testid="worst-step-callout-note"
        >
          {{ calloutNote }}
        </p>
      </div>
    </div>

    <h2 class="mt-8 text-xl font-bold text-ink">A tölcsér lépései</h2>

    <div class="stagger mt-4 flex flex-col gap-6">
      <FunnelStep
        v-for="(step, index) in steps"
        :key="index"
        :step="step"
        :index="index"
        :is-last="index === steps.length - 1"
        :bar-denominator="barDenominator"
        :is-worst="highlightActive && index === worst.index"
      />
    </div>

    <!--
      Iteration 5: rule-based recommendations. Additive last region, below the
      funnel steps. Presentational only — all rules live in src/lib/insights.js.
    -->
    <Insights :campaign="campaign" />
  </section>
</template>
