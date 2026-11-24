---
description: Meta Ads crew — drop in a product URL, run Research → Strategy → Creative → Launch (paused sandbox), and come back with an approval card.
argument-hint: <product URL> [notes, e.g. "budget $40/day, push the Christmas cut-off"]
---

Run the Prime Piece Meta Ads crew on this brief: **$ARGUMENTS**

1. Create the run folder `meta-ads-crew/runs/<YYYY-MM-DD>-<product-slug>/` (today's date, slug from the product name or URL). Write `brief.md` with the URL, the notes exactly as given, and today's date. If the folder exists, add `-2`.
2. Run the desks **in order**, each as its subagent, passing the run folder path. Don't start a desk until the previous one has written its file:
   1. `rita-research` → research.md. If Rita reports the product is sold or not found, stop here and tell me.
   2. `sam-strategy` → strategy.md + campaign.json (ad sets).
   3. `charlie-creative` → hooks.md (20 hooks), ads.md, campaign.json (ads).
   4. `luca-launch` (mode A) → validates, preflights, builds it PAUSED, writes launch.md.
3. If the `slack.channel` in config.json is set and a Slack connector is available, post the top section of launch.md there.
4. Commit the run folder and push to the current branch (message: `Meta crew: brief <run>`).
5. Reply with **only** the top section of launch.md (the approval card), so I can read it on my phone. Nothing goes live until I reply `approve <run>`.
