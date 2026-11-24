---
description: Meta Ads crew — approve a run that's sitting paused, and Luca takes it live.
argument-hint: <run folder name, e.g. 2026-11-24-rosso-levanto-plinth>
---

I approve run **$ARGUMENTS** to go live.

1. Resolve the run folder under `meta-ads-crew/runs/` (accept a partial name if it matches exactly one folder; otherwise list the matches and stop).
2. Confirm `launch.md` and `launched.json` exist with status PAUSED. If it was only a dry run (no launched.json), stop and tell me Meta isn't connected yet.
3. Write `approval.json` in the run folder: `{"action":"activate","decision":"approved","approved_by":"James","at":"<ISO now>","via":"/desk-approve"}`.
4. Run the `luca-launch` subagent with "activate <run folder>".
5. Commit + push (`Meta crew: activate <run>`).
6. Reply in two lines: what's live and at what $/day, and when Ollie's first read is due.
