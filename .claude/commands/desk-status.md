---
description: Meta Ads crew — one-screen status of every run, live spend, MER and the scale queue.
---

Give me a phone-sized status of the Meta Ads crew, reading only files (no Meta writes):
- Each folder in `meta-ads-crew/runs/` (newest first, max 8): product, stage (brief / sandbox / live / paused), $/day, last optimize headline.
- Total live $/day vs `max_total_daily_budget_nzd`.
- Last row of `knowledge/mer.md`.
- Open entries in `runs/scale-queue.md`.
If Meta is connected, also run `node meta-ads-crew/tools/meta.mjs spend --preset last_7d` and include the 7-day total.
