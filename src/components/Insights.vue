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
    container: 'border border-warn/20 border-l-4 border-l-warn bg-warn-soft',
    title: 'text-warn',
    text: 'text-ink-muted',
  },
  warning: {
    icon: '💡',
    container: 'border border-amber-200 border-l-4 border-l-amber-500 bg-amber-50',
    title: 'text-amber-900',
    text: 'text-amber-800',
  },
  positive: {
    icon: '✓',
    container: 'border border-emerald-200 border-l-4 border-l-emerald-500 bg-emerald-50',
    title: 'text-emerald-900',
    text: 'text-emerald-800',
  },
}
</script>

<template>
  <section class="mt-10 border-t border-border pt-8" data-testid="insights-panel">
    <h2 class="text-xl font-bold text-ink">Ajánlások</h2>
    <p v-if="insights.length" class="mt-0.5 text-sm text-ink-muted">
      A kampány lemorzsolódásai alapján
    </p>

    <div class="stagger mt-4 flex flex-col gap-3">
      <!-- One block per insight, in the order the lib returned them. -->
      <div
        v-for="insight in insights"
        :key="insight.id"
        class="rounded-2xl p-4 shadow-sm"
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
        class="rounded-2xl border border-border bg-bg p-4 shadow-sm"
        data-testid="insights-empty"
      >
        <p class="text-sm font-semibold text-ink">
          <span aria-hidden="true">✓</span>
          Nem találtunk komoly problémát
        </p>
        <p class="mt-1 text-sm text-ink-muted">
          Ez a tölcsér minden lépésében egészségesnek tűnik — jelenleg semmi sem tűnik
          problémásnak.
        </p>
      </div>
    </div>
  </section>
</template>
