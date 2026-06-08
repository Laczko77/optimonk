# Funnel Analytics Mini-App — Project Backlog

## Scope Summary

A funnel analytics mini-app for multi-step popup campaigns. It loads a static JSON dataset, lists
campaigns with their overall conversion rate, lets the user open one campaign to see a step-by-step
funnel (visitors, per-step conversion, drop-off), and visually highlights the biggest drop-off.
Optionally it shows 2–3 rule-based recommendations. Built with Vue 3 + Vite + Tailwind. No
database or auth.

> **Scope note (2026-06-08):** the original v1 (Iterations 1–6) loaded the dataset statically with
> no backend. Iteration 7 reopens scope to add a **minimal Node backend** that serves the dataset
> over `GET /api/campaigns`, which the frontend fetches at runtime.

> Note: UI design specs in `/docs/ui/` are authored on-demand by the ui-designer immediately before
> each UI iteration starts, so an empty `/docs/ui/` is expected until that point and does not mean
> work was forgotten.

---

## Backlog Progress

| Metric          | Value |
|-----------------|-------|
| Total tasks     | 33    |
| Completed tasks | 33    |
| Remaining tasks | 0     |
| Completion      | 100%  |

> **All backlog items are complete. The project backlog is finished.** Iterations 1–7 are DONE.
> Iteration 7 (added 2026-06-08) introduced a minimal Node backend, adopted the assignment's
> official sample dataset, and made data loading robust; it is now delivered and verified.

---

## Iterations

---

### Iteration 1 — Project Foundation

**Status:** DONE

**Goal:** Establish the Vue 3 + Vite + Tailwind baseline, the dataset, and the pure funnel-math
layer, so later iterations have a stable, testable foundation.

**UI required:** No

**Tasks:**

- [x] 1.1 Scaffold a Vue 3 + Vite project that runs with `npm run dev`
- [x] 1.2 Add and configure Tailwind CSS
- [x] 1.3 Add the dataset at `src/data/campaigns.json` (the assignment's sample data)
- [x] 1.4 Implement pure funnel-math functions in `src/lib/funnel.js` (`stepConversion`,
      `stepDropoffRate`, `stepDropoffAbs`, `overallConversion`, `worstStep`) with zero-views guards
- [x] 1.5 Set up Vitest and write unit tests for `src/lib/funnel.js` including edge cases

**Acceptance Criteria:**

- `npm run dev` starts the app without errors; Tailwind classes apply
- `src/lib/funnel.js` exports the funnel functions and never returns `NaN`/`Infinity`
- Unit tests pass, including: zero-views step, single-step campaign, and a campaign where the
  worst-by-rate and worst-by-absolute steps differ
- Sample numbers verified (e.g. `camp_001` overall conversion ≈ 8.2%)

**Dependencies:** None

---

### Iteration 2 — Campaign List

**Status:** DONE

**Goal:** Show all campaigns with their key metrics so the marketer has an overview and an entry
point into each funnel.

**UI required:** Yes

**Tasks:**

- [x] 2.1 Add a `useCampaigns()` composable that loads the dataset and exposes campaigns
- [x] 2.2 Build a `CampaignList` component rendering one card/row per campaign
- [x] 2.3 Show campaign name, device, step count, and overall conversion rate per campaign
- [x] 2.4 Make each campaign selectable to open its funnel detail
- [x] 2.5 Handle the empty-dataset state gracefully

**Acceptance Criteria:**

- All campaigns render with name, device, and overall conversion rate
- Selecting a campaign navigates/switches to its funnel detail view
- Empty dataset renders a friendly empty state, no crash
- Conversion rates match `src/lib/funnel.js`

**Dependencies:** Iteration 1

---

### Iteration 3 — Funnel Detail View

**Status:** DONE

**Goal:** For a selected campaign, show the step-by-step funnel with visitors per step and the
conversion/drop-off between steps.

**UI required:** Yes

**Tasks:**

- [x] 3.1 Build a `FunnelDetail` component for the selected campaign
- [x] 3.2 Render each step in order with name, type, and `views`
- [x] 3.3 Show per-step conversion and drop-off to the next step (rate + absolute people lost)
- [x] 3.4 Use a simple visual (horizontal bar / shrinking funnel) sized by `views`
- [x] 3.5 Add a back/close control to return to the campaign list

**Acceptance Criteria:**

- Steps appear in correct order with correct visitor counts
- Each step shows conversion and drop-off (both rate and absolute), matching `funnel.js`
- A single-step campaign and a zero-views step render without errors
- The user can return to the list

**Dependencies:** Iteration 2

---

### Iteration 4 — Worst-Step Highlight

**Status:** DONE

**Goal:** Make the biggest drop-off the most prominent thing on the funnel screen so a marketer
spots the problem instantly.

**UI required:** Yes

**Tasks:**

- [x] 4.1 Use `worstStep()` to identify the problem step for the selected campaign
- [x] 4.2 Visually mark the worst step (colour + badge) in `FunnelDetail`
- [x] 4.3 Add a one-line callout summarising the biggest drop-off in plain language
      (e.g. "Biggest drop-off: Step 2 — Email capture: only ~27% continue (~73% drop-off rate),
      2,350 people lost"). All three figures describe the same step (step 2 conversion ≈27%,
      drop-off rate ≈73%, absolute 2,350); do not mix in another step's conversion rate.
      The exact user-facing copy is owned by the ui-designer's spec — this example only fixes the
      numbers so they are internally consistent with `camp_001`.
- [x] 4.4 If worst-by-rate and worst-by-absolute differ, make that distinction clear, not confusing

**Acceptance Criteria:**

- The worst step is unmistakably highlighted and matches `worstStep()`
- The plain-language callout states the step, the rate change, and people lost
- A non-technical reader can identify the problem step in a few seconds
- Component test asserts the highlight is applied to the correct step

**Dependencies:** Iteration 3

---

### Iteration 5 — Insights / Recommendations (optional)

**Status:** DONE

**Goal:** Offer 2–3 simple, rule-based suggestions for the selected campaign based on its drop-offs.

**UI required:** Yes

**Tasks:**

- [x] 5.1 Implement rule-based insight functions in `src/lib/insights.js` (pure, testable)
- [x] 5.2 Define a few sensible rules (e.g. email-step drop-off > 70% → suggest social login /
      asking for email later; final step near 100% → flow is healthy after capture; etc.)
- [x] 5.3 Build an `Insights` panel in the funnel detail showing the 2–3 top suggestions
- [x] 5.4 Unit-test the insight rules

**Acceptance Criteria:**

- Relevant, non-generic suggestions appear for each campaign based on its data
- Rules are pure functions and unit-tested
- If no rule fires, the panel degrades gracefully (e.g. "No major issues detected")

**Dependencies:** Iteration 4

---

### Iteration 6 — Polish, README & Hand-off

**Status:** DONE

**Goal:** Final polish and the deliverables the assignment asks for (README + how-to-run + write-up).

**UI required:** No


**Tasks:**

- [x] 6.1 Visual/responsive polish pass on both screens
- [x] 6.2 Write `README.md`: prerequisites (Node version), install, `npm run dev`, URL to open
- [x] 6.3 Ensure `npm run test` runs all Vitest suites green
- [x] 6.4 Final manual run-through of the full flow (list → detail → worst step → insights)
- [x] 6.5 Write the assignment write-up (`docs/writeup.md`), max ~1 page, **in Hungarian**, written
      közérthetően for a non-technical reviewer. It must cover all five required points:
      (1) how the problem was understood, (2) the chosen v1 scope and what was deliberately cut,
      (3) a short description of the solution (architecture + main components), (4) how AI tools were
      used, and (5) what would be improved in v2.

**Acceptance Criteria:**

- App runs from a clean clone following the README only
- All tests pass
- Both screens are clean and readable on desktop and a narrow viewport
- `docs/writeup.md` exists, is written in Hungarian, and is ≤ ~1 page
- The write-up is közérthető (understandable to a non-technical reviewer)
- The write-up addresses all five required points: problem understanding, v1 scope + deliberate
  cuts, solution description (architecture + main components), AI tool usage, and v2 improvements

**Dependencies:** Iteration 5

---

### Iteration 7 — Backend + Official Dataset & Data-format Robustness

**Status:** DONE

**Goal:** Bring the app in line with the assignment brief (`docs/task.md`): serve the campaign data
from a minimal Node backend that the frontend fetches at runtime, adopt the assignment's official
sample campaigns as the canonical dataset, and make data loading robust (loading / empty / error
states, tolerant JSON shape).

**UI required:** Yes — minimal. Only the new **loading** and **error** states are net-new
user-facing UI (the empty state already exists from Iteration 2). Before implementing 7.2, a short
UI spec for the loading + error (+ existing empty) states must exist in `/docs/ui/` (a new small
spec or an extension of an existing one). The backend (7.1), dataset (7.3), and tooling (7.4) tasks
have no UI dependency and are not blocked.

**Tasks:**

- [x] 7.1 Add a minimal Node/Express backend exposing `GET /api/campaigns` that returns the dataset
      in the assignment's canonical `{ "campaigns": [...] }` shape. Keep it tiny (single file /
      `server/`), no DB, no auth; reads `src/data/campaigns.json` (or a shared copy) and serves it.
- [x] 7.2 Make the frontend load campaigns by **fetching `/api/campaigns`** via the `useCampaigns()`
      composable, with explicit **loading**, **empty**, and **error** states. Normalize the response
      so BOTH `{ "campaigns": [...] }` and a bare `[...]` array are accepted (also tolerate a
      missing/empty `steps` array without crashing).
- [x] 7.3 Adopt the assignment's **official sample campaigns** as the canonical dataset in
      `src/data/campaigns.json`, preserving each campaign's `id`/`name`/`device` and each step's
      `id`/`name`/`type`/`views`/`proceeds`/`description` exactly as given in `docs/task.md`
      (see the composition decision recorded by product-owner).
- [x] 7.4 Single-command dev run: `npm run dev` starts **both** the backend and Vite (e.g. via
      `concurrently`), with a Vite dev-server proxy forwarding `/api` to the backend. Update
      `README.md` accordingly (prerequisites, the single start command, and the URL to open).
- [x] 7.5 Re-anchor/extend the Vitest suites so the full suite passes against the new official
      dataset **and** the async data-loading path (mock `fetch`); cover the loading/empty/error
      branches and the `{campaigns}`-vs-bare-array normalization. Keep existing coverage of the
      pure funnel/insights math.

**Acceptance Criteria:**

- The app runs from a clean clone following the `README` only, with a single `npm run dev` command
  that brings up both backend and frontend.
- Pasting the exact JSON from `docs/task.md` (the `{ "campaigns": [...] }` block) into the dataset
  works end-to-end; a bare top-level array also works (normalization verified by tests).
- The full Vitest suite is green, including the new async-loading and normalization tests.
- Loading, empty, and error states each render correctly: a loading indicator while fetching, the
  existing friendly empty state for an empty dataset, and a clear non-crashing error state if the
  fetch fails.
- The official `camp_001` still shows overall conversion ≈ 8.2% and an email-step worst drop-off of
  ≈ 27% conversion / ≈ 73% drop-off / 2,350 people lost (existing Iteration 4 copy stays correct).

**Dependencies:** Iterations 1–6

---
