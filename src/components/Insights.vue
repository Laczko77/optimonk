<script setup>
import { computed } from 'vue'
import { getInsights } from '../lib/insights.js'

const props = defineProps({
  // The same campaign object already in scope in FunnelDetail. This panel is
  // presentational: it asks the lib for insights and only lays them out.
  campaign: { type: Object, required: true },
})

// Call the pure rule engine ONCE; the panel computes no rules/thresholds itself.
const insights = computed(() => getInsights(props.campaign))

// Severity → presentation. Colour is never the only signal: an icon and the
// title text always accompany it. 💡 = suggestion, ✓ = praise.
const SEVERITY_STYLES = {
  critical: {
    icon: '💡',
    container: 'border-l-4 border-rose-500 bg-rose-50',
    title: 'text-rose-900',
    text: 'text-rose-700',
  },
  warning: {
    icon: '💡',
    container: 'border-l-4 border-amber-500 bg-amber-50',
    title: 'text-amber-900',
    text: 'text-amber-700',
  },
  positive: {
    icon: '✓',
    container: 'border-l-4 border-emerald-500 bg-emerald-50',
    title: 'text-emerald-900',
    text: 'text-emerald-700',
  },
}
</script>

<template>
  <section class="mt-10 border-t border-slate-200 pt-8" data-testid="insights-panel">
    <h2 class="text-lg font-semibold text-slate-900">Suggestions</h2>
    <p v-if="insights.length" class="mt-0.5 text-sm text-slate-500">
      Based on this campaign's drop-offs
    </p>

    <div class="mt-4 flex flex-col gap-3">
      <!-- One block per insight, in the order the lib returned them. -->
      <div
        v-for="insight in insights"
        :key="insight.id"
        class="rounded-lg p-4"
        :class="SEVERITY_STYLES[insight.severity].container"
        data-testid="insight-item"
        :data-insight-id="insight.id"
        :data-severity="insight.severity"
      >
        <p class="text-sm font-semibold" :class="SEVERITY_STYLES[insight.severity].title">
          <span aria-hidden="true">{{ SEVERITY_STYLES[insight.severity].icon }}</span>
          {{ insight.title }}
        </p>
        <p class="mt-1 text-sm" :class="SEVERITY_STYLES[insight.severity].text">
          {{ insight.text }}
        </p>
      </div>

      <!-- Empty state: calm styling (not an alert), still informative. -->
      <div
        v-if="!insights.length"
        class="rounded-lg border border-slate-200 bg-slate-50 p-4"
        data-testid="insights-empty"
      >
        <p class="text-sm font-semibold text-slate-700">
          <span aria-hidden="true">✓</span>
          No major issues detected
        </p>
        <p class="mt-1 text-sm text-slate-500">
          This funnel looks healthy across its steps — nothing stands out as a problem
          right now.
        </p>
      </div>
    </div>
  </section>
</template>
