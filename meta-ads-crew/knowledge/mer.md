# MER tracker

MER = total store revenue ÷ total Meta spend, same window. It's the number that tells you whether ads are paying for the business, regardless of what Meta's attribution claims.

- **Revenue**: Klaviyo "Placed Order" metric (sent by api/webhook.js on every Stripe payment), via the Klaviyo connector.
- **Spend**: `node meta-ads-crew/tools/meta.mjs spend --preset last_7d`.
- Targets live in `config.json → targets`.

Ollie appends a row on each optimize read; Scott reads the last 7 days before proposing any budget increase.

| Week ending | Revenue NZD | Meta spend NZD | MER | Meta-reported ROAS | Notes |
|---|---|---|---|---|---|
