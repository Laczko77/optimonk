# Take-home assignment – Junior AI Product Engineer

**Task:** Build a small funnel analytics mini-app for popup campaigns

## Goal of the assignment

We want to see how you:

- Understand and **narrow down a loosely defined product problem**
- Design and build a **small, realistic v1** end-to-end
- Work with **data, UI, and basic backend logic**
- Use **AI tools** in a smart way (as an assistant, not a crutch)
- Communicate your decisions clearly

The assignment is intentionally small.  
Please focus on **clarity, usability, and good thinking**, not on making it “perfect”.

---

## The product problem

Imagine you’re working on a product like OptiMonk.

Merchants can see the **overall conversion rate** of their popup campaigns (e.g. 5%), but they **don’t understand where the conversion drops** inside multi-step flows.

For example:

- Step 1 (teaser popup) converts well (30%)
- Step 2 (email step) performs poorly, and kills the overall conversion

Right now they only see the **final 5%**, not that the **email step is the real problem**.

**Your task:**  
Build a small web app that helps marketers understand **step-level funnel performance** for popup campaigns and see **where the biggest drop-offs happen**.

---

## What you should build

### 1. A simple UI to explore campaigns

Using the provided JSON data (see at the end of this document), build a small web app where a user can:

- See a **list of campaigns** with some basic metrics (e.g. name, overall conversion rate)
- Select **one campaign** and see a **step-by-step funnel view**, including:
  - number of visitors per step
  - conversion or drop-off between steps
- Quickly spot **where the biggest drop-off** is in that campaign

You’re free to choose the exact UI, but it should be:

- Simple
- Clean
- Understandable for a non-technical marketer

### 2. Highlight the worst step(s)

For a selected campaign, your app should:

- Calculate **drop-off between steps** (in % or absolute numbers)
- Highlight at least **one “problem step”** (e.g. visually marked or listed)

For example:

> “Biggest drop-off: Step 2 – Email form (from 30% to 8%)”

### 3. (Optional but nice) Simple recommendations

You can optionally add a small **“Insights” / “Recommendations”** area that shows 2–3 simple suggestions based on the data.

These can be:

- Hard-coded rules (e.g. “If drop-off on email step > X%, then…”), or
- Generated with an AI model you like using

The **quality of thinking** matters more than the complexity of the rules.

---

## Technical expectations

We don’t want to over-constrain the stack, but we want to see relevant experience.

**Frontend:**

- Please use **Vue** (any recent version is fine)
- You can use **Tailwind CSS** or simple CSS – your choice

**Backend / data:**

- You can serve the JSON from a simple **Node.js backend**
  - or load it directly on the frontend (for this assignment it’s fine)
- You **don’t need** a real database – static JSON is enough
- No authentication is required

**AI usage:**

- You are **encouraged** to use AI tools while working (for coding, thinking, naming, copy, etc.)
- But the final result should be **understandable and maintainable by a human**
- Please briefly explain **how** you used AI in your write-up (see below)

**What we are _not_ asking for:**

- No complex charts or fancy visualizations are required (unless you enjoy it)
- No production-ready architecture
- No pixel-perfect design system

We care much more about **clarity, structure, and problem-solving**.

---

## Timebox / scope

We know your time is valuable.

- Please **aim for 4–6 hours** of focused work
- It’s okay if the result is not “complete” in every aspect
- We prefer a **small but thoughtful v1** over something big and rushed

If you feel you would need much more time for a feature, **cut scope** and mention it in the write-up.

---

## Deliverables

Please send us:

1. **Source code**
   - Link to a GitHub repo (preferred), or
   - A zip file with clear structure

2. **Short write-up (max 1 page)** – in English or Hungarian  
   Please include:
   - How you understood the problem
   - What you decided to build as your **v1 scope** (and what you left out)
   - A short description of your solution (architecture, main components)
   - How you used **AI tools** (if you did)
   - What you would improve in **v2** if you had more time

3. **How to run it**
   - A short `README` or section in the write-up with:
     - prerequisites (e.g. Node version)
     - commands to start the app
     - which URL to open in the browser

4. **(Optional) Screenshots or a short Loom video**
   - If you’d like to show how it works without us having to run it locally,  
     you can add some screenshots or a very short screencast.

---

## What we will look at

When we review your assignment, we’ll look at:

- **Problem understanding & scope**
  - Did you pick a reasonable, small v1?
  - Is it clear what problem you are solving?

- **UI & UX**
  - Is the interface understandable for a non-technical user?
  - Is the most important information easy to spot (e.g. worst drop-off)?

- **Code & structure**
  - Is the code organized in a way that would be maintainable in a real project?
  - Do we see sensible components, names, separation of concerns?

- **Data & logic**
  - Is the funnel logic correct?
  - Are the drop-offs calculated in a sensible way?

- **AI usage & thinking**
  - Did you use AI in a way that _helps_ the work, instead of replacing your own thinking?
  - Is your write-up honest and clear about this?

- **Communication**
  - Is your write-up clear and to the point?

We are not looking for perfection.  
We’re looking for someone who can **take a real problem and move it forward in a smart, practical way**.

---

## Sample campaign data (JSON)

You can use the following JSON as your starting dataset.
Feel free to extend it or modify it if that helps your solution.

```json
{
  "campaigns": [
    {
      "id": "camp_001",
      "name": "Welcome Discount Popup",
      "device": "desktop",
      "steps": [
        {
          "id": "step_1",
          "name": "Teaser – 10% off",
          "type": "teaser",
          "views": 10000,
          "proceeds": 3200,
          "description": "Small teaser popup with 'Get 10% off' button."
        },
        {
          "id": "step_2",
          "name": "Email capture",
          "type": "email",
          "views": 3200,
          "proceeds": 850,
          "description": "Full-screen popup asking for email address."
        },
        {
          "id": "step_3",
          "name": "Success & coupon",
          "type": "success",
          "views": 850,
          "proceeds": 820,
          "description": "Thank-you screen with coupon code."
        }
      ]
    },
    {
      "id": "camp_002",
      "name": "Exit-intent Cart Saver",
      "device": "desktop",
      "steps": [
        {
          "id": "step_1",
          "name": "Exit intent popup",
          "type": "exit-intent",
          "views": 7500,
          "proceeds": 2100,
          "description": "Popup triggered on exit intent with 'Wait, here's 15% off' message."
        },
        {
          "id": "step_2",
          "name": "Coupon reveal",
          "type": "coupon",
          "views": 2100,
          "proceeds": 1100,
          "description": "Shows coupon code and 'Apply discount' button."
        }
      ]
    },
    {
      "id": "camp_003",
      "name": "Mobile Newsletter Signup",
      "device": "mobile",
      "steps": [
        {
          "id": "step_1",
          "name": "Mobile teaser",
          "type": "teaser",
          "views": 12000,
          "proceeds": 1800,
          "description": "Small bottom bar with 'Join our newsletter' text."
        },
        {
          "id": "step_2",
          "name": "Email + preferences",
          "type": "email",
          "views": 1800,
          "proceeds": 300,
          "description": "Mobile-friendly form with email and 2 preference checkboxes."
        },
        {
          "id": "step_3",
          "name": "Confirm subscription",
          "type": "success",
          "views": 300,
          "proceeds": 260,
          "description": "Thank-you screen confirming subscription."
        }
      ]
    }
  ]
}
```

**Notes on the data:**

- `views`: how many users saw that step
- `proceeds`: how many users continued to the **next step** (or completed, for the last step)
- You can compute conversion rates and drop-offs from these numbers
- You don’t have to use every field if you don’t want to

Good luck — we’re excited to see how you approach this!