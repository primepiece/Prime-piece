---
description: Meta Ads crew — approve a queued budget step (or, with no argument, show the queue).
argument-hint: [adset_id to approve]
---

Argument: **$ARGUMENTS**

- No argument: show the open entries in `meta-ads-crew/runs/scale-queue.md` and stop.
- With an ad set id: I approve that queued step. Run the `scott-scale` subagent with "scale <adset_id>". It must use the from/to amounts already in the queue entry; if there's no open entry for that id, stop and say so. Commit + push (`Meta crew: scale <adset_id>`). Reply with one line: old → new $/day, or the tool's refusal message verbatim.
