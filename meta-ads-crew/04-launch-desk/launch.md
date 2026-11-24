# Launch desk (Luca)

## Draft (automatic, spends nothing)
1. Read `runs/<run>/campaign.json` (written by Charlie).
2. `node scripts/meta-ads/meta.mjs draft meta-ads-crew/runs/<run> --dry-run` to check it passes guardrails.
3. `node scripts/meta-ads/meta.mjs draft meta-ads-crew/runs/<run>` creates **campaign + ad set + ads, all PAUSED**. This is the "sandbox": the campaign exists in Ads Manager, but nothing spends.
4. Write `runs/<run>/approval.md`, the one-screen summary James approves from his phone (template below).
5. Commit and push the run folder so it survives the session.

## Go live (only after James says "approve")
1. `node scripts/meta-ads/meta.mjs check-pixel`. The script refuses to activate if the Pixel hasn't fired in 48h.
2. `node scripts/meta-ads/meta.mjs activate meta-ads-crew/runs/<run> --approved-by-human`
3. Commit `launch.json` + `ledger.jsonl`.

## Tracking status
- **Browser Pixel** `722124784327437` is on `index.html`, `checkout.html` and `success.html`, and Purchase already sends an `eventID` (the order id).
- **Conversions API (server-side):** ❌ not set up yet. Meta loses a share of iOS/in-app-browser purchases without it. Because the browser Purchase already carries `eventID`, adding a CAPI Purchase from the Stripe webhook (`api/webhook.js`) with the same `event_id` would deduplicate cleanly. That's a separate change to the payment webhook, so James has to OK it first.

## approval.md template
```
# Ready to approve: <campaign name>
Product: <url>   Budget: $<n>/day NZD   Ads: <n>   Status: PAUSED (nothing spending)
Angles: <top 3 with scores>
Ads:
1. <ad name>: "<hook>" / <image>
...
Ads Manager: https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=<id without act_>&selected_campaign_ids=<campaign id>
Reply "approve <run>" to go live, or tell me what to change.
```
