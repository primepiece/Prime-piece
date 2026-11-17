---
description: Run the full prospecting chain - signal → enrich → score → research → copy → sequence
argument-hint: "[focus, e.g. 'interior designers Auckland' or '10 hospitality']"
---
Run the Prime Piece GTM prospecting chain. Focus: $ARGUMENTS (if blank, let the Signal Agent pick by rotation).

Run these subagents **one at a time, in order** (they all write to gtm/data/accounts.json, so never run them in parallel). Pass each one the account ids the previous step produced:

1. `gtm-signal`: find new accounts for the focus.
2. `gtm-enrichment`: enrich the new accounts.
3. `gtm-scoring`: score them (fit + `pipeline.mjs score`).
4. `gtm-research`: research up to 5 of the new Tier A/B accounts.
5. `gtm-copywriter`: write sequences for the researched accounts.
6. `gtm-sequence`: launch them and create Gmail drafts for anything due today.

If a step returns nothing (e.g. no Tier A/B), stop there and say why. Finish with one summary: new accounts, tiers, Gmail drafts created, the LinkedIn to-do list, and anything that needs James's approval.
