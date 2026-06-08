import campaigns from '../data/campaigns.json'

/**
 * Data-access composable for the campaign dataset.
 *
 * The dataset is a static local JSON import, so there is no async loading,
 * no fetch, and no loading/error state to manage. This simply exposes the
 * campaigns array plus a lookup-by-id helper for the detail view.
 */
export function useCampaigns() {
  /**
   * @param {string} id
   * @returns {object | null} the matching campaign, or null if not found.
   */
  const getCampaignById = (id) => campaigns.find((c) => c.id === id) ?? null

  return { campaigns, getCampaignById }
}
