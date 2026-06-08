import { ref } from 'vue'

/**
 * Data-access composable for the campaign dataset.
 *
 * As of Iteration 7 the data is no longer a static import: it is fetched at
 * runtime from `GET /api/campaigns` (served by the minimal Express backend and
 * proxied through the Vite dev server). The composable manages the async
 * lifecycle (loading / error) and exposes the campaigns reactively.
 *
 * The reactive state is module-level (a single shared instance) so that every
 * caller — `CampaignList` rendering the list and `App` resolving the selected
 * campaign via `getCampaignById` — reads the same loaded data and the same
 * single fetch, rather than each triggering its own request.
 */

const campaigns = ref([])
const loading = ref(false)
const error = ref(false)
let started = false

/**
 * Accept both the canonical `{ "campaigns": [...] }` shape and a bare top-level
 * array `[...]`; anything else normalizes to an empty list (never throws).
 */
function normalize(data) {
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.campaigns)) return data.campaigns
  return []
}

/** Fetch (or re-fetch) the dataset. Used on init and by the error-state retry. */
async function load() {
  loading.value = true
  error.value = false
  try {
    const res = await fetch('/api/campaigns')
    if (!res.ok) throw new Error(`Request failed with status ${res.status}`)
    const data = await res.json()
    campaigns.value = normalize(data)
  } catch {
    error.value = true
    campaigns.value = []
  } finally {
    loading.value = false
  }
}

export function useCampaigns() {
  // Trigger the fetch once, on first use of the composable.
  if (!started) {
    started = true
    load()
  }

  /**
   * @param {string} id
   * @returns {object | null} the matching loaded campaign, or null if not found.
   */
  const getCampaignById = (id) => campaigns.value.find((c) => c.id === id) ?? null

  return { campaigns, loading, error, reload: load, getCampaignById }
}
