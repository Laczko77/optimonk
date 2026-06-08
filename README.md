# Funnel Analytics Mini-App

A small funnel analytics tool for multi-step popup campaigns (think OptiMonk).

Marketers can usually see a campaign's *overall* conversion rate, but not *where* inside the flow
people drop off. This app loads a static dataset of popup campaigns, lists each one with its overall
conversion, and lets you open a campaign to see a step-by-step funnel: per-step conversion and
drop-off (both as a rate and as an absolute head-count). It then **highlights the biggest drop-off**
in plain language and offers a few rule-based suggestions, so a non-technical marketer can spot the
real problem step in seconds.

## Prerequisites

- **Node.js 20.19+ or 22.12+** (the project's build tool, Vite 8, requires
  `^20.19.0 || >=22.12.0`). Node 22 LTS or newer is recommended.
- **npm** (ships with Node).

## Install

```bash
npm install
```

## Run the dev server

```bash
npm run dev
```

This single command starts **both** the API and the web app together (via
`concurrently`): the minimal Express backend on port **3001** and the Vite dev server on
**5173**. The dev server proxies `/api` requests to the backend, so no extra setup is needed.

Then open **http://localhost:5173** in your browser.

## Run the tests

```bash
npm run test
```

This runs the full Vitest suite once (pure funnel/insight math unit tests plus component tests).
Use `npm run test:watch` for watch mode.

## Build / preview

```bash
npm run build      # production build into dist/
npm run preview    # serve the production build locally
```

## Project structure / architecture

A minimal **Express backend** (`server/index.js`) exposes `GET /api/campaigns`, reading the dataset
from `src/data/campaigns.json` and returning it in the canonical `{ "campaigns": [...] }` shape. The
frontend **fetches** that endpoint at runtime via the `useCampaigns()` composable (no static
import), which manages loading / error / empty states. There is no database and no auth.

```
server/
  index.js                # minimal Express backend serving GET /api/campaigns (port 3001)

src/
  data/campaigns.json     # the campaign dataset (served by the backend, fetched by the frontend)
  lib/
    funnel.js             # PURE funnel math: stepConversion, stepDropoffRate, stepDropoffAbs,
                          #   overallConversion, worstStep, worstStepByAbsolute (no Vue, fully unit-tested)
    insights.js           # PURE rule-based suggestion engine: getInsights(campaign) (unit-tested)
    format.js             # display-only helpers: formatPercent, formatCount
  composables/
    useCampaigns.js       # fetches /api/campaigns, exposes campaigns/loading/error/reload + getCampaignById
  components/
    CampaignList.vue      # the list screen (one CampaignCard per campaign)
    CampaignCard.vue
    FunnelDetail.vue      # the detail screen: header, worst-step callout, steps, insights
    FunnelStep.vue
    Insights.vue
  App.vue                 # top-level view switch (list <-> detail) via selection state
  main.js, style.css      # entry point + Tailwind import

docs/
  application.md          # project scope
  backlog.md              # the iteration backlog
  ui/                     # markdown UI design specs (source of truth for each UI iteration)
  writeup.md              # assignment write-up (Hungarian)

tests/                    # Vitest unit + @vue/test-utils component tests
```

**Key idea:** all funnel and insight calculations live in pure functions in `src/lib/` so they can
be unit-tested in isolation. The Vue components are presentational — they consume those functions
and never reimplement the math. View switching between the campaign list and the funnel detail is
handled in `App.vue` with simple selection state (no router).

## Tech stack

Vue 3 (`<script setup>` SFCs) · Vite 8 · Tailwind CSS v4 · Vitest + @vue/test-utils.
