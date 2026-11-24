---
description: James approves a drafted run — Luca takes it live
argument-hint: <run folder name>
---
James has explicitly approved run `$ARGUMENTS` to go live.

Use the `luca-launch` subagent in **activate** mode for `meta-ads-crew/runs/$ARGUMENTS`, telling it James approved this run in his own words via /approve. Then commit `launch.json` and `meta-ads-crew/ledger.jsonl`, push, and reply with one line: what went live, at what $/day, and the crew's total daily budget.

If `$ARGUMENTS` is empty, list runs that have a launch.json without `activated_at` and ask which one.
