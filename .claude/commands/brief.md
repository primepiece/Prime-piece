---
description: Run the full Meta ads crew on a product URL — research, angles, 20 hooks, PAUSED campaign draft, approval summary
argument-hint: <product-url> [notes: focus, budget, must-say...]
---
Run the Prime Piece Meta ads crew on: $ARGUMENTS

1. Create `meta-ads-crew/runs/<YYYY-MM-DD>-<short-slug>/` and write `brief.md` using `meta-ads-crew/01-research-desk/product-url.md` as the template, filled from the arguments.
2. Run the desks **in order**, each as its subagent, passing the run folder path:
   - `rita-research` → research.md
   - `sam-strategy` → angles.md
   - `charlie-creative` → hooks.md + campaign.json
   - `luca-launch` in **draft** mode → PAUSED campaign in Meta + approval.md
3. Commit the run folder (and any library/ledger updates) and push to the current branch.
4. Send a push notification: "<campaign name> is ready to approve: <n> ads, $<budget>/day".
5. Reply with the contents of approval.md and stop. **Do not activate anything.** Wait for James to reply "approve <run>".
