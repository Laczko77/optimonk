// Minimal Node/Express backend for the funnel analytics app.
//
// Single responsibility: serve the campaign dataset over HTTP so the frontend
// can fetch it at runtime. No DB, no auth — it reads src/data/campaigns.json
// and returns it as-is (the canonical { "campaigns": [...] } shape).
import express from 'express'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataPath = join(__dirname, '..', 'src', 'data', 'campaigns.json')

const PORT = 3001
const app = express()

// Read the file per request so edits to the dataset are picked up without a restart.
app.get('/api/campaigns', (_req, res) => {
  const data = JSON.parse(readFileSync(dataPath, 'utf-8'))
  res.json(data)
})

app.listen(PORT, () => {
  console.log(`Campaigns API listening on http://localhost:${PORT}`)
})
