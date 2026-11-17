# Buying Signals Library (45 signals)

The **Signal Agent** looks for these, and the **Monitoring Agent** re-checks them on target accounts. The **Scoring Agent** turns them into an intent score using the weights below. `scripts/pipeline.mjs` holds the same IDs and weights, so keep the two in step if you edit either.

Every logged signal needs: `id`, `date` (when it happened), `evidence` (a URL, or a short note for first-party signals), `detail` (one line).

Weight scale: 1 = weak hint · 5 = strong, time-sensitive buying moment.

## A. Project & build signals (a project needs furniture/stone soon)

| ID | Signal | Where to look | Weight |
|---|---|---|---|
| A01 | New hotel announced / under construction | NZ Herald business, Stuff, hotel group press | 5 |
| A02 | Hotel refurbishment or rebrand announced | Press, LinkedIn, Hospitality Business NZ | 5 |
| A03 | New restaurant/bar "opening soon" | Instagram, Metro, Viva, Denizen, The Spinoff food | 5 |
| A04 | New on-licence / liquor licence application (new venue) | Auckland Council public notices | 4 |
| A05 | Hospitality fit-out tender or resource consent | Council consents, GETS tenders | 4 |
| A06 | Luxury residential development launch / pre-sales | OneRoof, developer sites, Trade Me Property | 4 |
| A07 | Show home or display suite opening | Developer socials, OneRoof | 5 |
| A08 | Architect/designer posts a project "under construction" | Instagram, ArchiPro, LinkedIn | 4 |
| A09 | Commercial office or boutique retail fit-out announced | LinkedIn, Idealog, press | 3 |
| A10 | New premium furniture/homeware showroom opening or relocating | Press, socials | 4 |
| A11 | Gallery announces a design/object exhibition | Gallery sites, Art News NZ | 3 |
| A12 | Large residential listing ($3M+) going to market (stager opportunity) | OneRoof, Bayleys/Sotheby's listings | 3 |

## B. Firm growth & momentum signals

| ID | Signal | Where to look | Weight |
|---|---|---|---|
| B01 | Hiring interior designer / FF&E / procurement role | Seek, LinkedIn Jobs | 4 |
| B02 | New studio, office or second location | LinkedIn, website | 3 |
| B03 | New director/partner/principal appointed | LinkedIn, press | 3 |
| B04 | Won or shortlisted for an award (NZIA, Best Design, Interior Awards, HOTY) | Award sites, press | 3 |
| B05 | Project featured in Homestyle, Urbis, Your Home & Garden, ArchiPro, Dezeen | Publications | 3 |
| B06 | New project published on ArchiPro / website portfolio | ArchiPro, website | 2 |
| B07 | Website relaunch or rebrand | Website, LinkedIn | 2 |
| B08 | Funding, acquisition or major contract win | Press, NZ Companies Office | 3 |
| B09 | Leader joined from a hotel/luxury brand (new FF&E budget holder) | LinkedIn | 3 |
| B10 | Expanding into hospitality or luxury residential | Website, LinkedIn posts | 3 |

## C. Aesthetic & product-fit signals (they already like what we make)

| ID | Signal | Where to look | Weight |
|---|---|---|---|
| C01 | Posts or specifies natural stone (marble, travertine, onyx, quartzite) | Instagram, portfolio | 3 |
| C02 | Uses sculptural/statement furniture in recent projects | Portfolio, Instagram | 2 |
| C03 | Specifies vessel/pedestal basins in bathrooms | Portfolio, ArchiPro | 3 |
| C04 | Posts about sourcing local / NZ-made makers | Instagram, LinkedIn | 2 |
| C05 | Stocks or features European stone/design brands | Website range | 2 |
| C06 | Engages with stone/marble trend content | LinkedIn, Instagram | 1 |
| C07 | Uses plinths/pedestals for display (galleries, retail) | Instagram, store photos | 2 |
| C08 | Portfolio is luxury residential ($2M+ homes) | Portfolio | 2 |

## D. First-party engagement signals (strongest; they came to us)

| ID | Signal | Where to look | Weight |
|---|---|---|---|
| D01 | Submitted trade application or enquiry form | Gmail / enquiry API notifications | 5 |
| D02 | Replied to an email (any reply that isn't an opt-out) | Gmail | 5 |
| D03 | Visited the showroom or booked a visit | James's notes | 5 |
| D04 | Requested samples, a render or the basin trade PDF | Gmail | 5 |
| D05 | Visited `/trade.html` or `/commissions.html` (if identifiable) | Site analytics | 3 |
| D06 | Followed Prime Piece / engaged with a post (IG or LinkedIn) | James's notes | 2 |
| D07 | Opened/clicked a Klaviyo campaign multiple times | Klaviyo | 2 |
| D08 | Referred by an existing client or partner | James's notes | 4 |
| D09 | Past customer (retail or trade) | Orders / Gmail | 3 |
| D10 | Met at an event / trade show | James's notes | 3 |

## E. Timing & seasonal signals

| ID | Signal | Where to look | Weight |
|---|---|---|---|
| E01 | Corporate gifting window (Oct – mid Dec) and the firm gifts clients | Calendar + past posts | 3 |
| E02 | Company milestone/anniversary (gift trigger) | LinkedIn, website | 2 |
| E03 | Financial-year start (Apr) with new FF&E/marketing budget | Calendar | 1 |
| E04 | Hotel/venue reopening date announced | Press | 4 |
| E05 | Design week / home show participation announced | Event sites | 2 |

## Decay rule
Signal value fades with age. If it happened 0–30 days ago it counts in full (×1.0), 31–90 days ×0.6, 91–180 days ×0.3, and older than 180 days it counts as 0. First-party D-signals use the same decay.
