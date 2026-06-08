// Vercel Serverless Function: GET /api/campaigns
//
// In production on Vercel the Express backend (server/index.js) does NOT run —
// a Vite static build only ships the frontend. Vercel instead auto-deploys any
// file under /api as a serverless function (api/campaigns.js -> /api/campaigns),
// so this mirrors the Express route and serves the same payload the frontend
// already fetches at runtime (the canonical { "campaigns": [...] } shape).
//
// The dataset is pulled in with an ESM JSON import attribute. The Vercel
// bundler (esbuild) inlines the JSON into the function bundle at build time, so
// the data is guaranteed to ship with the deployed function — no runtime path
// resolution and no vercel.json includeFiles entry required. Node 20/22 (the
// Vercel runtimes) support import attributes natively.
import data from '../src/data/campaigns.json' with { type: 'json' }

export default function handler(_req, res) {
  try {
    // The data is static, so let Vercel's edge cache hold it for an hour.
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate')
    res.status(200).json(data)
  } catch {
    res.status(500).json({ error: 'Failed to load campaigns' })
  }
}
