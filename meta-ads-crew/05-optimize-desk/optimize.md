# Optimize desk (Ollie)

Runs `/optimize` daily (by hand or as a scheduled task).

1. `node scripts/meta-ads/meta.mjs insights --days 7`. Every row gets a mechanical verdict from `crew.config.json`:
   - **TOO_EARLY**: under 24h live or under $50 spent. Do nothing; the data isn't real yet.
   - **KILL**: spent ≥ 2× target CPA with zero purchases. Pause it.
   - **WINNER**: CPA ≤ target (and ROAS ≥ breakeven). Hand it to Scott.
   - **KEEP**: everything else. Leave it alone.
2. Ollie may pause KILL ads on his own (`pause <ad_id> --reason "..."`) because pausing only *lowers* spend. Nothing else changes without James.
3. Fatigue flags (report only): frequency > 3.5 with CTR falling, or CPM up > 40% week-on-week. Suggest a refresh brief.
4. `node scripts/meta-ads/meta.mjs mer --days 7` for the blended MER, which counts every sale against all Meta spend.
5. Log judged ads in `../02-strategy-desk/angles.md` (performance log) and winners in `../03-creative-desk/hooks.md`.
6. Write `reports/<date>-optimize.md`: 5 lines max, so it can be read on a phone.

Report shape:
```
MER 7d: 3.4 (target 3.0) ✅   Spend $412   Revenue $1,401
Paused: 2 ads (zero purchases after $64+)
Winner: "Same lounge. One piece changed." CPA $41 → Scott proposes +20%
Too early: 3 ads
Next: refresh brief for Basins (frequency 3.9)
```
