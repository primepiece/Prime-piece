# Meta ads: Christmas 2026 setup checklist

Two campaigns: gift vouchers (main spend) and retargeting site visitors. Run them from now until 24 December.
The copy comes from `brand-kit/copy/COPY-PACK.md` ("Meta ads").

## Before you start (10 min)

- [ ] In Events Manager, open pixel **722124784327437** and check that **Purchase**, **InitiateCheckout** and
      **ViewContent** have fired in the last 7 days. If Purchase shows nothing, make a $100 test voucher
      purchase and refund it, so Meta has seen the event before you optimise for it.
- [ ] In Business Settings, check the Prime Piece Facebook Page and the @prime.piece Instagram account are both
      connected to the ad account.
- [ ] Download the 6 creatives (links in the chat, or export them again from Canva: designs 01, 02, 03, 04, 08
      and 10 in the "Gift voucher" set).

## Campaign 1: Gift vouchers

**Campaign**
- [ ] Objective: **Sales**
- [ ] Name: `Vouchers | Xmas 26 | Sales`
- [ ] Use Advantage+ campaign budget: **$35 NZD/day**

**Ad set**
- [ ] Conversion location: Website · Pixel 722124784327437 · Event: **Purchase**
- [ ] Location: New Zealand (keep all of NZ, because the vouchers are digital)
- [ ] Age 28–65. Use Advantage+ audience and leave interests empty.
- [ ] Placements: Advantage+ placements

**Ad** (one ad, with flexible format or several images uploaded)
- [ ] Feed images (3:4): `feed-01`, `feed-03`, `feed-04`, `feed-10`
- [ ] Stories/Reels images (9:16): `story-02`, `story-08`. Use "Customise for placements" so these only show
      in Stories and Reels.
- [ ] Check the feed preview: Meta crops 3:4 images to 4:5 in the feed, which trims about 45 px off the top and
      bottom. If the eyebrow or URL gets cut, ask Claude for 1080×1350 versions.
- [ ] Primary text: add all three options from the copy pack
- [ ] Headlines: "Let them choose the stone" · "Gift vouchers, emailed instantly" · "$100 · $200 · $500 NZD"
- [ ] Description: "Spend online or in our Auckland showroom."
- [ ] CTA: **Shop now**
- [ ] URL: `https://www.primepiece.co.nz/gift-vouchers.html`
- [ ] URL parameters: `utm_source=meta&utm_medium=paid_social&utm_campaign=vouchers_xmas26&utm_content={{ad.name}}`

## Campaign 2: Retargeting

**Campaign**
- [ ] Objective: **Sales** · Name: `Retarget | Xmas 26` · **$12 NZD/day**

**Ad set**
- [ ] Event: Purchase
- [ ] Custom audiences: Website visitors (30 days) + Instagram engagers (60 days) + Facebook Page engagers
      (60 days). Exclude Purchasers (30 days).
- [ ] Turn **off** Advantage+ audience so it sticks to these people.

**Ad**
- [ ] Creatives: the 6 voucher images plus 3–4 of your best furniture photos (marble coffee tables, the side
      tables and the Teal Tide platter)
- [ ] Primary text: "Still thinking about it? Every Prime Piece is one of one, so once it's gone, it's gone.
      Or give a gift voucher and let them choose."
- [ ] URL: `https://www.primepiece.co.nz/`, with the same UTM parameters but `utm_campaign=retarget_xmas26`

## Dates to change things

| Date | Change |
|---|---|
| Days 1–4 | Leave everything alone while Meta is in the learning phase. |
| ~13 Nov | Look at cost per purchase. Pause any image that has had good spend but no clicks. |
| 20 Nov | Add the unboxing reel with the printed stone card copy from the copy pack. |
| 27–30 Nov | Black Friday: raise Campaign 1 to ~$50/day if it is already returning more than it costs. |
| 15 Dec | The printed card cut-off. Remove the unboxing reel ad. |
| 16 Dec | Switch primary text to option 3 only ("No courier. No Christmas cut-off.") and push `story-02`. |
| 24 Dec | Pause both campaigns at 6 pm. |

## What "working" looks like

- Click-through rate (link) above **1%**
- Cost per purchase under about **$40** on vouchers, given an average order of about $200
- If you've spent about $150 with no purchases, check that the Purchase event fires before changing the ads.
