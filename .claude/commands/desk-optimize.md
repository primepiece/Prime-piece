---
description: Meta Ads crew — Ollie's performance read. Pauses clear losers per config rules, logs MER, flags winners for Scott.
argument-hint: [optional run folder; default = every run with status ACTIVE]
---

Run the `ollie-optimize` subagent on: **$ARGUMENTS** (if that is blank, every run in `meta-ads-crew/runs/` whose launched.json has status ACTIVE).

Then:
- If Ollie flagged any winner candidates, run the `scott-scale` subagent in queue mode.
- Commit + push (`Meta crew: optimize <date>`).
- Reply with Ollie's headline line, what was paused (if anything), and any scale proposals with the exact reply I'd send to approve (`/desk-scale <adset_id>`). Under 8 lines.
