<script setup>
import { ref } from 'vue'
import { useCampaigns } from '../composables/useCampaigns.js'
import CampaignCard from './CampaignCard.vue'

const emit = defineEmits(['select'])

const { campaigns, loading, error, reload } = useCampaigns()

// Focus target when returning from the detail view (App.vue): moving focus to
// the heading restores keyboard orientation after the detail unmounts. The h1
// carries tabindex="-1" so it is programmatically focusable but not a tab stop.
const headingRef = ref(null)
defineExpose({ focus: () => headingRef.value?.focus() })
</script>

<template>
  <section class="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6" data-testid="campaign-list">
    <header class="mb-8">
      <h1
        ref="headingRef"
        tabindex="-1"
        class="text-3xl font-extrabold tracking-tight text-ink outline-none sm:text-4xl"
      >
        Kampányok
      </h1>
      <p class="mt-2 text-base text-ink-muted">
        Nézze meg, hogyan konvertálnak az egyes popup kampányok.
      </p>
    </header>

    <!-- LOADING: shown while the fetch is in flight -->
    <div
      v-if="loading"
      class="py-16 text-center text-sm text-ink-muted"
      data-testid="campaigns-loading"
    >
      Kampányok betöltése…
    </div>

    <!-- ERROR: shown only if the fetch fails; calm, with a one-click retry -->
    <div
      v-else-if="error"
      class="rounded-2xl border border-border bg-bg p-10 text-center shadow-sm"
      data-testid="campaigns-error"
    >
      <h2 class="text-lg font-bold text-ink">Nem sikerült betölteni a kampányokat</h2>
      <p class="mx-auto mt-2 max-w-md text-sm text-ink-muted">
        Hiba történt az adatok betöltése közben. Ellenőrizze a kapcsolatot, és próbálja újra.
      </p>
      <button
        type="button"
        class="mt-5 inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        data-testid="campaigns-retry"
        @click="reload"
      >
        Újrapróbálom
      </button>
    </div>

    <!-- CARD LIST: successful fetch with at least one campaign -->
    <div v-else-if="campaigns.length" class="stagger flex flex-col gap-4">
      <CampaignCard
        v-for="campaign in campaigns"
        :key="campaign.id"
        :campaign="campaign"
        @select="emit('select', $event)"
      />
    </div>

    <!-- EMPTY: successful fetch that returned zero campaigns -->
    <div
      v-else
      class="rounded-2xl border border-border bg-bg p-10 text-center shadow-sm"
      data-testid="empty-state"
    >
      <h2 class="text-lg font-bold text-ink">Még nincsenek kampányok</h2>
      <p class="mt-2 text-sm text-ink-muted">Jelenleg nincs megjeleníthető kampány.</p>
    </div>
  </section>
</template>
