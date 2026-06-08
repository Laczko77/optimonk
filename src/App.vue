<script setup>
import { computed, ref } from 'vue'
import { useCampaigns } from './composables/useCampaigns.js'
import CampaignList from './components/CampaignList.vue'

const { getCampaignById } = useCampaigns()

// Selected-campaign state drives which view is shown. null = campaign list.
const selectedId = ref(null)

const selectedCampaign = computed(() =>
  selectedId.value ? getCampaignById(selectedId.value) : null,
)

function selectCampaign(id) {
  selectedId.value = id
}

function clearSelection() {
  selectedId.value = null
}
</script>

<template>
  <main class="min-h-screen bg-slate-50 text-slate-800">
    <CampaignList v-if="!selectedCampaign" @select="selectCampaign" />

    <!--
      Minimal placeholder for the funnel detail. The real FunnelDetail screen
      is Iteration 3; this only makes selection -> detail navigation real and
      testable now and will be replaced then.
    -->
    <section
      v-else
      class="mx-auto w-full max-w-3xl px-4 py-10"
      data-testid="detail-view"
      :data-campaign-id="selectedCampaign.id"
    >
      <button
        type="button"
        class="inline-flex cursor-pointer items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 ring-1 ring-slate-200 transition hover:bg-white hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        data-testid="back-button"
        @click="clearSelection"
      >
        <span aria-hidden="true">&larr;</span>
        Back
      </button>

      <h1 class="mt-4 text-2xl font-semibold text-slate-900">{{ selectedCampaign.name }}</h1>
      <p class="mt-2 text-sm text-slate-500">
        Funnel detail arrives in the next iteration.
      </p>
    </section>
  </main>
</template>
