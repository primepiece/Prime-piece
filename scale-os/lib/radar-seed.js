// Initial Market Radar seed — the 52-product research universe already gathered in
// this session, converted into the Market Radar schema with real computed scores
// (scripts/market-radar/scoring.mjs). Auto-loaded once by getRadarOpportunities() in
// store.js if the Redis key is empty; every subsequent scan from the GitHub Actions
// worker appends real history on top of this baseline.
export const RADAR_SEED_DATA = [
  {
    "id": "radar_001",
    "product": "Stone Wall Mirror",
    "variant": "",
    "category": "Mirror",
    "tier": "A",
    "opportunityScore": 70,
    "confidenceScore": 80,
    "scoreBreakdown": {
      "demandEvidence": {
        "score": 80,
        "why": "2 sold-out signals + 2,100 reviews on comparable"
      },
      "contributionProfit": {
        "score": 70,
        "why": "High price ceiling, unknown COGS"
      },
      "aovCac": {
        "score": 75,
        "why": "$1,200-1,800 AOV"
      },
      "differentiation": {
        "score": 80,
        "why": "NZ has 1 direct competitor"
      },
      "adContent": {
        "score": 80,
        "why": "Highly photogenic"
      },
      "auScale": {
        "score": 75,
        "why": "2 real AU competitors validate market"
      },
      "designerTrade": {
        "score": 60,
        "why": "Trend-press coverage, no direct project credit"
      },
      "sourcing": {
        "score": 50,
        "why": "New material combo (glass+stone)"
      },
      "operationalRisk": {
        "score": 30,
        "why": "Highest freight/damage risk of decor items"
      },
      "crossSell": {
        "score": 55,
        "why": "Bathroom pairing"
      }
    },
    "trendDirection": "New opportunity",
    "mainMarket": "NZ",
    "priceBand": {
      "low": 1200,
      "high": 4200,
      "currency": "$",
      "premiumCeiling": "$57,160 (1stDibs designer tier)"
    },
    "demandSignal": {
      "level": "Strong",
      "type": "Proxy / Signal",
      "description": "2 AU brands sold out on multiple SKUs; one Etsy shop at 2,100 reviews."
    },
    "competitors": [
      {
        "name": "Annuello",
        "country": "AU",
        "priceLow": 1155,
        "priceHigh": 1499
      },
      {
        "name": "Future Glass",
        "country": "AU",
        "priceLow": 1155,
        "priceHigh": 1499,
        "bestsellerFlag": true
      },
      {
        "name": "Natural Stone Co",
        "country": "NZ",
        "priceLow": 1356,
        "priceHigh": 1808
      },
      {
        "name": "MirrorHomeDecorArt (Etsy)",
        "country": "Global",
        "reviewCount": 2100
      }
    ],
    "reviews": {
      "positiveThemes": [
        "sculptural presence",
        "statement piece"
      ],
      "complaints": [
        "shipping damage is the dominant complaint pattern industry-wide for mirrors generally"
      ],
      "purchaseMotivations": [
        "entryway/bathroom focal point"
      ]
    },
    "trendSignals": [
      {
        "signal": "Arched/organic stone mirrors named a 2026 interior trend — 'mirrors that function as sculpture'",
        "type": "Proxy / Signal",
        "source": "Homedit, Berwyn Glass, Rose Restoration"
      }
    ],
    "marketGap": {
      "description": "NZ has essentially one direct competitor (Natural Stone Co) despite real sold-out demand signals elsewhere.",
      "gapScore": 82
    },
    "economicsPotential": {
      "retailPriceRangeEstimate": "NZ$1,200-1,800 mid tier, up to $4,000+ designer",
      "aovBand": "High ($1,200-1,800)",
      "paidAcquisitionSuitability": "Good — visually distinctive",
      "grossMarginPotentialCategory": "Estimate: Good",
      "freightDifficulty": "High (glass + stone)",
      "packagingDifficulty": "High",
      "damageRisk": "High",
      "crossSellPotential": "Moderate — bathroom/vanity pairing"
    },
    "operatingRisks": [
      "Highest freight/damage risk of any decor-scale item researched (glass + stone combined)",
      "New material combination Prime Piece has not produced before"
    ],
    "designerTradeSignals": [
      "Design press explicitly names arched stone mirrors as sculpture-adjacent 2026 trend"
    ],
    "auPotential": "High",
    "nzPotential": "High",
    "tradePotential": "Moderate",
    "sources": [
      {
        "url": "https://annuello.com.au",
        "title": "Annuello — Stone Mirrors"
      },
      {
        "url": "https://futureglass.com.au",
        "title": "Future Glass — Natural Stone Mirrors"
      },
      {
        "url": "https://naturalstoneco.co.nz",
        "title": "Natural Stone Co NZ — Mirrors"
      }
    ],
    "recommendedNextAction": "GET_SUPPLIER_PRICE",
    "firstSeen": "2026-09-02",
    "lastResearched": "2026-09-02",
    "history": [
      {
        "scanDate": "2026-09-02",
        "score": 70,
        "confidence": 80,
        "priceRange": {
          "low": 1200,
          "high": 4200,
          "currency": "$",
          "premiumCeiling": "$57,160 (1stDibs designer tier)"
        },
        "reviewCount": null,
        "note": "Initial research pass"
      }
    ],
    "promotedToProductLab": false
  },
  {
    "id": "radar_002",
    "product": "Oval Vessel Basin",
    "variant": "Carrara / Travertine",
    "category": "Vessel Basin",
    "tier": "A",
    "opportunityScore": 65,
    "confidenceScore": 80,
    "scoreBreakdown": {
      "demandEvidence": {
        "score": 65,
        "why": "Multi-source 2026 trend consensus"
      },
      "contributionProfit": {
        "score": 70,
        "why": "Real price premium over round confirmed"
      },
      "aovCac": {
        "score": 70,
        "why": "$1,499-1,599"
      },
      "differentiation": {
        "score": 70,
        "why": "Premium confirmed vs round"
      },
      "adContent": {
        "score": 55,
        "why": "Similar to existing basin content"
      },
      "auScale": {
        "score": 60,
        "why": "Moderate AU evidence"
      },
      "designerTrade": {
        "score": 40,
        "why": "Weak direct trade evidence"
      },
      "sourcing": {
        "score": 90,
        "why": "Direct extension of existing capability"
      },
      "operationalRisk": {
        "score": 65,
        "why": "Known basin freight profile"
      },
      "crossSell": {
        "score": 85,
        "why": "Launch-adjacent to existing basin range"
      }
    },
    "trendDirection": "New opportunity",
    "mainMarket": "NZ",
    "priceBand": {
      "low": 839,
      "high": 1599,
      "currency": "$"
    },
    "demandSignal": {
      "level": "Moderate-Strong",
      "type": "Proxy / Signal",
      "description": "Multiple independent 2026 design-press sources call oval \"the dominant 2026 shape\"; price premium confirmed across 4 NZ retailers."
    },
    "competitors": [
      {
        "name": "ABI Interiors",
        "country": "NZ",
        "priceLow": 839,
        "priceHigh": 1299
      },
      {
        "name": "The Bathroom Shop",
        "country": "NZ",
        "priceLow": 1299,
        "priceHigh": 1299
      },
      {
        "name": "StoneBase",
        "country": "NZ"
      },
      {
        "name": "Plumbline (Marmo 550 Oval)",
        "country": "NZ",
        "priceLow": 1499,
        "priceHigh": 1599
      }
    ],
    "reviews": {
      "positiveThemes": [],
      "complaints": [],
      "purchaseMotivations": [
        "spa-like calm aesthetic"
      ]
    },
    "trendSignals": [
      {
        "signal": "Oval/rounded basin forms named the dominant 2026 bathroom basin shape",
        "type": "Proxy / Signal",
        "source": "Decorilla, The Tile House, Global Hues"
      }
    ],
    "marketGap": {
      "description": "Near-zero incremental tooling cost — same material, new carving profile, on a basin line about to launch. Price premium confirmed across 4 retailers, not one.",
      "gapScore": 75
    },
    "economicsPotential": {
      "retailPriceRangeEstimate": "NZ$1,499-1,599",
      "aovBand": "High",
      "paidAcquisitionSuitability": "Good — extends existing basin ads",
      "grossMarginPotentialCategory": "Estimate: Good (near-zero incremental cost)",
      "freightDifficulty": "Moderate (same as existing basins)",
      "packagingDifficulty": "Moderate",
      "damageRisk": "Moderate",
      "crossSellPotential": "High — direct basin-line extension"
    },
    "operatingRisks": [
      "Same freight/damage profile as existing basins — known, manageable"
    ],
    "designerTradeSignals": [],
    "auPotential": "High",
    "nzPotential": "High",
    "tradePotential": "Low-Moderate",
    "sources": [
      {
        "url": "https://abiinteriors.co.nz",
        "title": "ABI Interiors — Pedra Oval Basin"
      },
      {
        "url": "https://thebathroomshop.co.nz",
        "title": "The Bathroom Shop NZ"
      },
      {
        "url": "https://plumbline.co.nz",
        "title": "Plumbline — Marmo 550 Oval"
      }
    ],
    "recommendedNextAction": "GET_SUPPLIER_PRICE",
    "firstSeen": "2026-09-02",
    "lastResearched": "2026-09-02",
    "history": [
      {
        "scanDate": "2026-09-02",
        "score": 65,
        "confidence": 80,
        "priceRange": {
          "low": 839,
          "high": 1599,
          "currency": "$"
        },
        "reviewCount": null,
        "note": "Initial research pass"
      }
    ],
    "promotedToProductLab": false
  },
  {
    "id": "radar_003",
    "product": "Marble / Travertine Console Table",
    "variant": "",
    "category": "Console Table",
    "tier": "A",
    "opportunityScore": 66,
    "confidenceScore": 80,
    "scoreBreakdown": {
      "demandEvidence": {
        "score": 80,
        "why": "Broadest, most consistent multi-tier stocking found"
      },
      "contributionProfit": {
        "score": 60,
        "why": "Real gap identified but competitive"
      },
      "aovCac": {
        "score": 75,
        "why": "$1,200-2,500 achievable tier"
      },
      "differentiation": {
        "score": 40,
        "why": "Most saturated category researched"
      },
      "adContent": {
        "score": 60,
        "why": "Standard furniture ad format"
      },
      "auScale": {
        "score": 70,
        "why": "Multiple AU competitors present"
      },
      "designerTrade": {
        "score": 80,
        "why": "Named designers sell into this format"
      },
      "sourcing": {
        "score": 80,
        "why": "Existing table-making capability transfers"
      },
      "operationalRisk": {
        "score": 35,
        "why": "High freight/breakage risk, long slab"
      },
      "crossSell": {
        "score": 50,
        "why": "Standalone furniture piece"
      }
    },
    "trendDirection": "New opportunity",
    "mainMarket": "Global",
    "priceBand": {
      "low": 1400,
      "high": 15650,
      "currency": "$"
    },
    "demandSignal": {
      "level": "Strong",
      "type": "Proxy / Signal",
      "description": "West Elm and CB2 each run 4+ concurrent marble console SKUs as an ongoing category."
    },
    "competitors": [
      {
        "name": "West Elm",
        "country": "US",
        "priceLow": 1400,
        "priceHigh": 5220
      },
      {
        "name": "CB2",
        "country": "US",
        "priceLow": 3680,
        "priceHigh": 5175
      },
      {
        "name": "GlobeWest",
        "country": "AU"
      },
      {
        "name": "Fleur Studios",
        "country": "AU"
      },
      {
        "name": "Natural Stone Co",
        "country": "NZ"
      }
    ],
    "reviews": {
      "positiveThemes": [
        "built to last"
      ],
      "complaints": [],
      "purchaseMotivations": [
        "entryway statement piece"
      ]
    },
    "trendSignals": [
      {
        "signal": "Statement marble console named an 'entryway essential' in 2025/2026 trend coverage",
        "type": "Proxy / Signal",
        "source": "Boca do Lobo, Brabbu, Vedant Artisans"
      }
    ],
    "marketGap": {
      "description": "Real accessible-premium gap ($1,200-2,500) between commodity sintered-stone and $3,500+ solid slab pieces.",
      "gapScore": 60
    },
    "economicsPotential": {
      "retailPriceRangeEstimate": "$1,200-2,500 target tier",
      "aovBand": "High",
      "paidAcquisitionSuitability": "Good",
      "grossMarginPotentialCategory": "Estimate: Moderate (most saturated category)",
      "freightDifficulty": "High (long thin slab, cracks across span)",
      "packagingDifficulty": "High",
      "damageRisk": "High",
      "crossSellPotential": "Moderate"
    },
    "operatingRisks": [
      "Most saturated category researched — needs real differentiation to compete",
      "Long slab top = high in-transit cracking risk"
    ],
    "designerTradeSignals": [
      "Named designers (Karen Chekerdjian, Mario Bellini, Frédéric Saulou) sell into this format via 1stDibs/Chairish"
    ],
    "auPotential": "High",
    "nzPotential": "Moderate",
    "tradePotential": "High",
    "sources": [
      {
        "url": "https://westelm.com",
        "title": "West Elm — Marble Consoles"
      },
      {
        "url": "https://cb2.com",
        "title": "CB2 — Marble Media Consoles"
      },
      {
        "url": "https://1stdibs.com",
        "title": "1stDibs — Console Tables"
      }
    ],
    "recommendedNextAction": "MONITOR",
    "firstSeen": "2026-09-02",
    "lastResearched": "2026-09-02",
    "history": [
      {
        "scanDate": "2026-09-02",
        "score": 66,
        "confidence": 80,
        "priceRange": {
          "low": 1400,
          "high": 15650,
          "currency": "$"
        },
        "reviewCount": null,
        "note": "Initial research pass"
      }
    ],
    "promotedToProductLab": false
  },
  {
    "id": "radar_004",
    "product": "Fluted Round Basin",
    "variant": "",
    "category": "Vessel Basin",
    "tier": "A",
    "opportunityScore": 60,
    "confidenceScore": 80,
    "scoreBreakdown": {
      "demandEvidence": {
        "score": 60,
        "why": "4+ AU retailers, real price ladder confirmed"
      },
      "contributionProfit": {
        "score": 60,
        "why": "Genuine-stone tier open between commodity and premium"
      },
      "aovCac": {
        "score": 60,
        "why": "NZ$800-1,000 estimate"
      },
      "differentiation": {
        "score": 40,
        "why": "Already established AU sub-category"
      },
      "adContent": {
        "score": 80,
        "why": "Fluting is highly photogenic/trend-aligned"
      },
      "auScale": {
        "score": 55,
        "why": "Already actively stocked in AU"
      },
      "designerTrade": {
        "score": 45,
        "why": "Category-level trend, not product-specific"
      },
      "sourcing": {
        "score": 85,
        "why": "Direct extension of existing basin capability"
      },
      "operationalRisk": {
        "score": 60,
        "why": "Similar risk to standard vessel basin"
      },
      "crossSell": {
        "score": 80,
        "why": "Launch-adjacent to Sept basin drop"
      }
    },
    "trendDirection": "New opportunity",
    "mainMarket": "AU",
    "priceBand": {
      "low": 197,
      "high": 2996,
      "currency": "AU$"
    },
    "demandSignal": {
      "level": "Moderate",
      "type": "Proxy / Signal",
      "description": "4+ AU retailers run dedicated fluted collections; genuine marble tier ($949) confirmed."
    },
    "competitors": [
      {
        "name": "CIBO / Bunnings",
        "country": "AU",
        "priceLow": 197,
        "priceHigh": 197
      },
      {
        "name": "ATS Tiles & Bathrooms (Kyklos Groove, Nero Marquina)",
        "country": "AU",
        "priceLow": 949,
        "priceHigh": 949
      },
      {
        "name": "ATS (Circa Swirl fluted pedestal)",
        "country": "AU",
        "priceLow": 2996,
        "priceHigh": 2996
      },
      {
        "name": "Buildmat",
        "country": "AU"
      },
      {
        "name": "Stones Work (green onyx)",
        "country": "AU"
      },
      {
        "name": "Stonebaths",
        "country": "AU"
      }
    ],
    "reviews": {
      "positiveThemes": [],
      "complaints": [],
      "purchaseMotivations": []
    },
    "trendSignals": [
      {
        "signal": "Fluted detailing repeatedly named the top textural 2026 bathroom trend",
        "type": "Proxy / Signal",
        "source": "onfloatingvanity.com, thetileshouse.com, goodhomesmagazine.com"
      }
    ],
    "marketGap": {
      "description": "Weaker than it first appears — 46 fluted SKUs at one AU competitor alone. The real gap is NZ-specifically, not the format being novel.",
      "gapScore": 45
    },
    "economicsPotential": {
      "retailPriceRangeEstimate": "NZ$800-1,000 genuine-stone tier",
      "aovBand": "Moderate-High",
      "paidAcquisitionSuitability": "Good — high content potential",
      "grossMarginPotentialCategory": "Estimate: Good",
      "freightDifficulty": "Moderate (same as existing basins)",
      "packagingDifficulty": "Moderate",
      "damageRisk": "Moderate (fluted edges add marginal fragility)",
      "crossSellPotential": "High — basin-line extension"
    },
    "operatingRisks": [
      "Already an established AU sub-category (46 SKUs at one competitor) — not a blue ocean"
    ],
    "designerTradeSignals": [],
    "auPotential": "Moderate",
    "nzPotential": "High",
    "tradePotential": "Low-Moderate",
    "sources": [
      {
        "url": "https://ats.sydney",
        "title": "ATS Tiles & Bathrooms — Kyklos Groove"
      },
      {
        "url": "https://buildmat.com.au",
        "title": "Buildmat — Fluted Basins"
      },
      {
        "url": "https://stoneswork.com.au",
        "title": "Stones Work AU"
      }
    ],
    "recommendedNextAction": "GET_SUPPLIER_PRICE",
    "firstSeen": "2026-09-02",
    "lastResearched": "2026-09-02",
    "history": [
      {
        "scanDate": "2026-09-02",
        "score": 60,
        "confidence": 80,
        "priceRange": {
          "low": 197,
          "high": 2996,
          "currency": "AU$"
        },
        "reviewCount": null,
        "note": "Initial research pass"
      }
    ],
    "promotedToProductLab": false
  },
  {
    "id": "radar_005",
    "product": "Twin / Double Basin",
    "variant": "trough format",
    "category": "Vessel Basin",
    "tier": "A",
    "opportunityScore": 58,
    "confidenceScore": 70,
    "scoreBreakdown": {
      "demandEvidence": {
        "score": 75,
        "why": "Directly validated by closest NZ competitor"
      },
      "contributionProfit": {
        "score": 65,
        "why": "High-ticket but unconfirmed local price"
      },
      "aovCac": {
        "score": 70,
        "why": "High AOV implied by UK designer tier"
      },
      "differentiation": {
        "score": 70,
        "why": "Real gap in own backyard"
      },
      "adContent": {
        "score": 45,
        "why": "Harder to convey in a fast ad crop than single basin"
      },
      "auScale": {
        "score": 45,
        "why": "Weaker AU-specific evidence"
      },
      "designerTrade": {
        "score": 35,
        "why": "Low direct trade evidence"
      },
      "sourcing": {
        "score": 70,
        "why": "Extension of existing basin capability"
      },
      "operationalRisk": {
        "score": 25,
        "why": "Highest breakage risk of any basin format"
      },
      "crossSell": {
        "score": 40,
        "why": "Standalone renovation purchase"
      }
    },
    "trendDirection": "New opportunity",
    "mainMarket": "NZ",
    "priceBand": {
      "low": 5070,
      "high": 6948,
      "currency": "£"
    },
    "demandSignal": {
      "level": "Strong",
      "type": "Fact",
      "description": "Prime Piece's closest NZ competitor (StoneBase) runs Twin Basins as its own standing collection."
    },
    "competitors": [
      {
        "name": "StoneBase",
        "country": "NZ"
      },
      {
        "name": "LUSSO Stone",
        "country": "UK"
      },
      {
        "name": "Durovin Bathrooms",
        "country": "UK"
      },
      {
        "name": "The Sink Boutique",
        "country": "UK/US"
      }
    ],
    "reviews": {
      "positiveThemes": [],
      "complaints": [],
      "purchaseMotivations": [
        "'his and hers' double-vanity renovation"
      ]
    },
    "trendSignals": [],
    "marketGap": {
      "description": "A direct NZ competitor already validates this as its own product line, and Prime Piece doesn't currently compete in it.",
      "gapScore": 78
    },
    "economicsPotential": {
      "retailPriceRangeEstimate": "Not established locally",
      "aovBand": "High",
      "paidAcquisitionSuitability": "Moderate — niche renovation buyer",
      "grossMarginPotentialCategory": "Estimate: Good",
      "freightDifficulty": "High (long single slab)",
      "packagingDifficulty": "High",
      "damageRisk": "High (highest breakage risk of any basin variant)",
      "crossSellPotential": "Low"
    },
    "operatingRisks": [
      "Long single-slab format = highest breakage risk of any basin variant researched"
    ],
    "designerTradeSignals": [],
    "auPotential": "Moderate",
    "nzPotential": "High",
    "tradePotential": "Low",
    "sources": [
      {
        "url": "https://stonebase.co.nz",
        "title": "StoneBase — Twin Basins"
      },
      {
        "url": "https://lussostone.com",
        "title": "LUSSO Stone — Double Basins"
      }
    ],
    "recommendedNextAction": "GET_SUPPLIER_PRICE",
    "firstSeen": "2026-09-02",
    "lastResearched": "2026-09-02",
    "history": [
      {
        "scanDate": "2026-09-02",
        "score": 58,
        "confidence": 70,
        "priceRange": {
          "low": 5070,
          "high": 6948,
          "currency": "£"
        },
        "reviewCount": null,
        "note": "Initial research pass"
      }
    ],
    "promotedToProductLab": false
  },
  {
    "id": "radar_006",
    "product": "Stone Decorative Bowl",
    "variant": "fruit / statement bowl",
    "category": "Stone Object",
    "tier": "A",
    "opportunityScore": 62,
    "confidenceScore": 80,
    "scoreBreakdown": {
      "demandEvidence": {
        "score": 60,
        "why": "Real confirmed premium price point, not anecdote"
      },
      "contributionProfit": {
        "score": 65,
        "why": "Best confirmed premium price evidence in the project"
      },
      "aovCac": {
        "score": 55,
        "why": "Two-tier — small giftable lower, large statement higher"
      },
      "differentiation": {
        "score": 60,
        "why": "Two-tier range logic"
      },
      "adContent": {
        "score": 80,
        "why": "Highly photogenic centerpiece object"
      },
      "auScale": {
        "score": 70,
        "why": "Real AU design-brand precedent (Urban Road)"
      },
      "designerTrade": {
        "score": 40,
        "why": "Luxury press coverage, no direct trade credit"
      },
      "sourcing": {
        "score": 75,
        "why": "Extension of existing carving capability"
      },
      "operationalRisk": {
        "score": 65,
        "why": "Moderate freight, low for small size"
      },
      "crossSell": {
        "score": 60,
        "why": "Pairs with table/console range"
      }
    },
    "trendDirection": "New opportunity",
    "mainMarket": "AU",
    "priceBand": {
      "low": 99,
      "high": 905,
      "currency": "AU$"
    },
    "demandSignal": {
      "level": "Strong",
      "type": "Fact",
      "description": "Urban Road (AU) genuinely lists a travertine bowl at $905 (seen on a 30% sale, so a real list price, not inflated)."
    },
    "competitors": [
      {
        "name": "CB2 (7+ named SKUs)",
        "country": "US"
      },
      {
        "name": "Urban Road (Verve, travertine)",
        "country": "AU",
        "priceLow": 905,
        "priceHigh": 905
      },
      {
        "name": "Round Form",
        "country": "AU"
      },
      {
        "name": "Crafter & Co (Serenity, Orb, Eclipse)",
        "country": "NZ",
        "priceLow": 136.5,
        "priceHigh": 439
      }
    ],
    "reviews": {
      "positiveThemes": [],
      "complaints": [],
      "purchaseMotivations": [
        "centerpiece / display object"
      ]
    },
    "trendSignals": [],
    "marketGap": {
      "description": "Real spread confirmed from $99 to $900+ — the clearest confirmation that customers will pay four-figures-adjacent money for a single decorative stone object.",
      "gapScore": 70
    },
    "economicsPotential": {
      "retailPriceRangeEstimate": "$99-905 two-tier (small giftable + large statement)",
      "aovBand": "Moderate (small) to High (large)",
      "paidAcquisitionSuitability": "Good",
      "grossMarginPotentialCategory": "Estimate: Good",
      "freightDifficulty": "Moderate (large format only)",
      "packagingDifficulty": "Moderate",
      "damageRisk": "Moderate",
      "crossSellPotential": "Moderate"
    },
    "operatingRisks": [
      "Moderate freight risk for large-format pieces only"
    ],
    "designerTradeSignals": [
      "Robb Report covered a marble bowl by named designer Maria Nilsson — luxury design-press coverage"
    ],
    "auPotential": "High",
    "nzPotential": "High",
    "tradePotential": "Low",
    "sources": [
      {
        "url": "https://cb2.com",
        "title": "CB2 — Marble Bowls"
      },
      {
        "url": "https://urbanroad.com.au",
        "title": "Urban Road — Verve Travertine Bowl"
      },
      {
        "url": "https://crafterandco.co.nz",
        "title": "Crafter & Co NZ"
      }
    ],
    "recommendedNextAction": "SAMPLE",
    "firstSeen": "2026-09-02",
    "lastResearched": "2026-09-02",
    "history": [
      {
        "scanDate": "2026-09-02",
        "score": 62,
        "confidence": 80,
        "priceRange": {
          "low": 99,
          "high": 905,
          "currency": "AU$"
        },
        "reviewCount": null,
        "note": "Initial research pass"
      }
    ],
    "promotedToProductLab": false
  },
  {
    "id": "radar_007",
    "product": "Sculptural Stone Stool / Occasional Table",
    "variant": "",
    "category": "Side Table / Stool",
    "tier": "A",
    "opportunityScore": 64,
    "confidenceScore": 70,
    "scoreBreakdown": {
      "demandEvidence": {
        "score": 55,
        "why": "1stDibs marketplace price distribution, not anecdote"
      },
      "contributionProfit": {
        "score": 65,
        "why": "Real quantified pricing gap identified"
      },
      "aovCac": {
        "score": 70,
        "why": "$800-2,500 target"
      },
      "differentiation": {
        "score": 80,
        "why": "Clear, quantified pricing white space"
      },
      "adContent": {
        "score": 60,
        "why": "Sculptural object, decent visual"
      },
      "auScale": {
        "score": 65,
        "why": "Moderate AU evidence"
      },
      "designerTrade": {
        "score": 60,
        "why": "Named designers sell into this format"
      },
      "sourcing": {
        "score": 80,
        "why": "Direct extension of carving competency"
      },
      "operationalRisk": {
        "score": 60,
        "why": "Same tier as existing tables"
      },
      "crossSell": {
        "score": 50,
        "why": "Standalone furniture piece"
      }
    },
    "trendDirection": "New opportunity",
    "mainMarket": "Global",
    "priceBand": {
      "low": 736,
      "high": 18880,
      "currency": "$",
      "premiumCeiling": "$18,880 (1stDibs)"
    },
    "demandSignal": {
      "level": "Moderate",
      "type": "Proxy / Signal",
      "description": "1stDibs marketplace data shows a real, wide price distribution (avg ~$3,400), not one anecdote."
    },
    "competitors": [
      {
        "name": "Kelly Wearstler (Tribute Stool)",
        "country": "US"
      },
      {
        "name": "Kiwano Concept",
        "country": "EU"
      },
      {
        "name": "Barh Design",
        "country": "EU"
      },
      {
        "name": "Christophe Delcourt (Roi Stool)",
        "country": "EU",
        "priceLow": 5564.82,
        "priceHigh": 5564.82
      }
    ],
    "reviews": {
      "positiveThemes": [],
      "complaints": [],
      "purchaseMotivations": [
        "dual-use stool/occasional table"
      ]
    },
    "trendSignals": [],
    "marketGap": {
      "description": "Wide price gulf between $700 entry and $18k+ designer pieces with almost nothing populated in an accessible-premium $800-2,500 band.",
      "gapScore": 75
    },
    "economicsPotential": {
      "retailPriceRangeEstimate": "$800-2,500 target tier",
      "aovBand": "High",
      "paidAcquisitionSuitability": "Good",
      "grossMarginPotentialCategory": "Estimate: Good",
      "freightDifficulty": "Moderate (same tier as existing tables)",
      "packagingDifficulty": "Moderate",
      "damageRisk": "Moderate",
      "crossSellPotential": "Moderate"
    },
    "operatingRisks": [
      "Moderate freight/damage, comparable to existing table range"
    ],
    "designerTradeSignals": [
      "Sold via named designers (Christophe Delcourt, Barh Design) through design-trade platforms (1stDibs, Adorno, Pamono)"
    ],
    "auPotential": "High",
    "nzPotential": "Moderate",
    "tradePotential": "Moderate",
    "sources": [
      {
        "url": "https://1stdibs.com",
        "title": "1stDibs — Stone Stools"
      },
      {
        "url": "https://kiwanoconcept.com",
        "title": "Kiwano Concept"
      }
    ],
    "recommendedNextAction": "SAMPLE",
    "firstSeen": "2026-09-02",
    "lastResearched": "2026-09-02",
    "history": [
      {
        "scanDate": "2026-09-02",
        "score": 64,
        "confidence": 70,
        "priceRange": {
          "low": 736,
          "high": 18880,
          "currency": "$",
          "premiumCeiling": "$18,880 (1stDibs)"
        },
        "reviewCount": null,
        "note": "Initial research pass"
      }
    ],
    "promotedToProductLab": false
  },
  {
    "id": "radar_008",
    "product": "Marble Dining Table",
    "variant": "large format",
    "category": "Dining Table",
    "tier": "A",
    "opportunityScore": 64,
    "confidenceScore": 70,
    "scoreBreakdown": {
      "demandEvidence": {
        "score": 75,
        "why": "Deepest, most liquid market in the whole project"
      },
      "contributionProfit": {
        "score": 70,
        "why": "Natural AOV-increasing extension"
      },
      "aovCac": {
        "score": 80,
        "why": "Highest AOV of any candidate"
      },
      "differentiation": {
        "score": 40,
        "why": "Most saturated category by inventory count"
      },
      "adContent": {
        "score": 60,
        "why": "Standard furniture format"
      },
      "auScale": {
        "score": 70,
        "why": "Deep AU/global market"
      },
      "designerTrade": {
        "score": 70,
        "why": "Recognisable specifier aesthetic (onyx+brass)"
      },
      "sourcing": {
        "score": 75,
        "why": "Existing capability + stock"
      },
      "operationalRisk": {
        "score": 15,
        "why": "Highest freight/damage risk researched"
      },
      "crossSell": {
        "score": 35,
        "why": "Standalone hero purchase"
      }
    },
    "trendDirection": "New opportunity",
    "mainMarket": "Global",
    "priceBand": {
      "low": 1400,
      "high": 15650,
      "currency": "$"
    },
    "demandSignal": {
      "level": "Strong",
      "type": "Proxy / Signal",
      "description": "~1,961 listings on 1stDibs alone — the deepest, most liquid market found in the whole project."
    },
    "competitors": [
      {
        "name": "CB2",
        "country": "US",
        "priceLow": 1399,
        "priceHigh": 2499
      },
      {
        "name": "1stDibs (~1,961 listings)",
        "country": "Global"
      },
      {
        "name": "Joss & Main",
        "country": "US"
      },
      {
        "name": "Marble & Home",
        "country": "US/UK"
      }
    ],
    "reviews": {
      "positiveThemes": [],
      "complaints": [],
      "purchaseMotivations": [
        "luxury/statement piece"
      ]
    },
    "trendSignals": [
      {
        "signal": "Marble dining tables explicitly named a 2026 design-press trend application",
        "type": "Proxy / Signal",
        "source": "roserestoration.com"
      }
    ],
    "marketGap": {
      "description": "A format Prime Piece does not currently offer at all — natural AOV-increasing extension using existing stone stock and fabrication skill.",
      "gapScore": 55
    },
    "economicsPotential": {
      "retailPriceRangeEstimate": "$1,400-2,500 benchmark tier",
      "aovBand": "Highest of any candidate researched",
      "paidAcquisitionSuitability": "Good — but considered purchase",
      "grossMarginPotentialCategory": "Estimate: Good",
      "freightDifficulty": "Highest of any candidate researched",
      "packagingDifficulty": "Highest",
      "damageRisk": "Highest",
      "crossSellPotential": "Low (standalone hero purchase)"
    },
    "operatingRisks": [
      "Highest freight/damage risk of any candidate researched — full dining-scale slabs",
      "Most saturated category researched (deepest 1stDibs inventory)"
    ],
    "designerTradeSignals": [
      "Onyx-topped, brass-based designer dining tables are a recognisable specifier aesthetic"
    ],
    "auPotential": "High",
    "nzPotential": "Low-Moderate",
    "tradePotential": "High",
    "sources": [
      {
        "url": "https://cb2.com",
        "title": "CB2 — Marble Dining Tables"
      },
      {
        "url": "https://1stdibs.com",
        "title": "1stDibs — Marble Dining Tables"
      }
    ],
    "recommendedNextAction": "MONITOR",
    "firstSeen": "2026-09-02",
    "lastResearched": "2026-09-02",
    "history": [
      {
        "scanDate": "2026-09-02",
        "score": 64,
        "confidence": 70,
        "priceRange": {
          "low": 1400,
          "high": 15650,
          "currency": "$"
        },
        "reviewCount": null,
        "note": "Initial research pass"
      }
    ],
    "promotedToProductLab": false
  },
  {
    "id": "radar_009",
    "product": "Stone Pedestal Basin",
    "variant": "",
    "category": "Pedestal Basin",
    "tier": "A",
    "opportunityScore": 54,
    "confidenceScore": 70,
    "scoreBreakdown": {
      "demandEvidence": {
        "score": 45,
        "why": "Narrow niche but locally confirmed price point"
      },
      "contributionProfit": {
        "score": 70,
        "why": "Highest AOV of any basin format"
      },
      "aovCac": {
        "score": 75,
        "why": "NZ$3,500-3,950 confirmed"
      },
      "differentiation": {
        "score": 55,
        "why": "Real but narrow high-ticket niche"
      },
      "adContent": {
        "score": 55,
        "why": "Dramatic but needs room-context photography"
      },
      "auScale": {
        "score": 45,
        "why": "Moderate AU evidence"
      },
      "designerTrade": {
        "score": 55,
        "why": "Hospitality/wellness project signal"
      },
      "sourcing": {
        "score": 60,
        "why": "Extension of basin capability but heavier"
      },
      "operationalRisk": {
        "score": 20,
        "why": "Heaviest, narrowest-buyer-pool basin format"
      },
      "crossSell": {
        "score": 30,
        "why": "High-ticket standalone purchase"
      }
    },
    "trendDirection": "New opportunity",
    "mainMarket": "NZ",
    "priceBand": {
      "low": 3500,
      "high": 3950,
      "currency": "NZ$"
    },
    "demandSignal": {
      "level": "Moderate",
      "type": "Fact",
      "description": "StoneBase (direct NZ competitor) prices this exact format at this exact level."
    },
    "competitors": [
      {
        "name": "StoneBase",
        "country": "NZ",
        "priceLow": 3500,
        "priceHigh": 3950
      },
      {
        "name": "MaestroBath",
        "country": "US"
      },
      {
        "name": "Elemento Bath",
        "country": "US",
        "priceLow": 3929,
        "priceHigh": 4237
      },
      {
        "name": "Kobu Marble",
        "country": "US",
        "priceLow": 2750,
        "priceHigh": 5500
      }
    ],
    "reviews": {
      "positiveThemes": [],
      "complaints": [],
      "purchaseMotivations": [
        "hero-piece bathroom renovation"
      ]
    },
    "trendSignals": [],
    "marketGap": {
      "description": "Highest AOV of any basin format, with a local competitor confirming the price point — de-risks the AOV assumption.",
      "gapScore": 50
    },
    "economicsPotential": {
      "retailPriceRangeEstimate": "NZ$3,500-3,950 (confirmed local comparable)",
      "aovBand": "Highest of any basin format",
      "paidAcquisitionSuitability": "Moderate — narrow buyer pool",
      "grossMarginPotentialCategory": "Estimate: Good",
      "freightDifficulty": "High (full-height single-block form)",
      "packagingDifficulty": "High",
      "damageRisk": "High",
      "crossSellPotential": "Low"
    },
    "operatingRisks": [
      "Heaviest, most freight-intensive, narrowest-buyer-pool basin format researched"
    ],
    "designerTradeSignals": [
      "Described in search results as used in high-end hospitality/wellness projects"
    ],
    "auPotential": "Moderate",
    "nzPotential": "Moderate",
    "tradePotential": "Moderate",
    "sources": [
      {
        "url": "https://stonebase.co.nz",
        "title": "StoneBase — Pedestal Basins"
      },
      {
        "url": "https://kobumarble.com",
        "title": "Kobu Marble"
      }
    ],
    "recommendedNextAction": "GET_SUPPLIER_PRICE",
    "firstSeen": "2026-09-02",
    "lastResearched": "2026-09-02",
    "history": [
      {
        "scanDate": "2026-09-02",
        "score": 54,
        "confidence": 70,
        "priceRange": {
          "low": 3500,
          "high": 3950,
          "currency": "NZ$"
        },
        "reviewCount": null,
        "note": "Initial research pass"
      }
    ],
    "promotedToProductLab": false
  },
  {
    "id": "radar_010",
    "product": "Stone Shower Shelf / Niche Insert",
    "variant": "",
    "category": "Bathroom Accessory",
    "tier": "A",
    "opportunityScore": 59,
    "confidenceScore": 70,
    "scoreBreakdown": {
      "demandEvidence": {
        "score": 85,
        "why": "Only category backed by an actual quantified market-size report"
      },
      "contributionProfit": {
        "score": 45,
        "why": "Lower price point limits contribution profit per order"
      },
      "aovCac": {
        "score": 35,
        "why": "Low AOV"
      },
      "differentiation": {
        "score": 60,
        "why": "Real gap for a finished, boxed product"
      },
      "adContent": {
        "score": 45,
        "why": "Less product-shaped than a basin, harder to convey standalone"
      },
      "auScale": {
        "score": 70,
        "why": "Broad NZ/AU/UK/US retailer presence"
      },
      "designerTrade": {
        "score": 30,
        "why": "Low direct trade evidence"
      },
      "sourcing": {
        "score": 75,
        "why": "Simple flat-slab fabrication"
      },
      "operationalRisk": {
        "score": 70,
        "why": "Low-moderate freight/damage risk"
      },
      "crossSell": {
        "score": 85,
        "why": "Natural upsell alongside every basin sale"
      }
    },
    "trendDirection": "New opportunity",
    "mainMarket": "Global",
    "priceBand": {
      "low": 211,
      "high": 385,
      "currency": "$"
    },
    "demandSignal": {
      "level": "Strong",
      "type": "Fact",
      "description": "Global shower niche market valued at USD1.21B (2024), projected ~USD2.12B by 2033, 6.4% CAGR — a real published market estimate."
    },
    "competitors": [
      {
        "name": "Etsy (NZ/AU/US)",
        "country": "Global"
      },
      {
        "name": "Wayfair",
        "country": "US"
      },
      {
        "name": "Tilehouz",
        "country": "US"
      },
      {
        "name": "Edison Stone",
        "country": "AU"
      }
    ],
    "reviews": {
      "positiveThemes": [],
      "complaints": [],
      "purchaseMotivations": [
        "bathroom renovation storage + aesthetic"
      ]
    },
    "trendSignals": [
      {
        "signal": "Shower niches becoming focal points complementing high-end bathroom renovations",
        "type": "Proxy / Signal",
        "source": "dataintelo.com market research report"
      }
    ],
    "marketGap": {
      "description": "Most of the market still self-sources via fabricators/tilers rather than buying a finished retail product — real gap for a boxed, ready-made version.",
      "gapScore": 65
    },
    "economicsPotential": {
      "retailPriceRangeEstimate": "$211-385",
      "aovBand": "Low-Moderate",
      "paidAcquisitionSuitability": "Moderate — good upsell, weak standalone hero",
      "grossMarginPotentialCategory": "Estimate: Moderate",
      "freightDifficulty": "Low-Moderate (flat slab)",
      "packagingDifficulty": "Low-Moderate",
      "damageRisk": "Moderate (flat slabs crack in transit)",
      "crossSellPotential": "High — natural basin-purchase upsell"
    },
    "operatingRisks": [
      "Flat slabs crack in transit — needs rigid flat-crate packaging"
    ],
    "designerTradeSignals": [],
    "auPotential": "High",
    "nzPotential": "High",
    "tradePotential": "Low",
    "sources": [
      {
        "url": "https://dataintelo.com",
        "title": "Shower Niche Market Report"
      },
      {
        "url": "https://etsy.com",
        "title": "Etsy — Marble Shower Niche"
      }
    ],
    "recommendedNextAction": "GET_SUPPLIER_PRICE",
    "firstSeen": "2026-09-02",
    "lastResearched": "2026-09-02",
    "history": [
      {
        "scanDate": "2026-09-02",
        "score": 59,
        "confidence": 70,
        "priceRange": {
          "low": 211,
          "high": 385,
          "currency": "$"
        },
        "reviewCount": null,
        "note": "Initial research pass"
      }
    ],
    "promotedToProductLab": false
  },
  {
    "id": "radar_011",
    "product": "Rectangular/Trough Vessel Basin",
    "variant": "",
    "category": "Vessel Basin",
    "tier": "B",
    "opportunityScore": 47,
    "confidenceScore": 60,
    "scoreBreakdown": {
      "demandEvidence": {
        "score": 45,
        "why": "Real but thinner competitor base than oval; better as a companion SKU."
      },
      "contributionProfit": {
        "score": 50,
        "why": ""
      },
      "aovCac": {
        "score": 50,
        "why": ""
      },
      "differentiation": {
        "score": 45,
        "why": ""
      },
      "adContent": {
        "score": 50,
        "why": ""
      },
      "auScale": {
        "score": 45,
        "why": ""
      },
      "designerTrade": {
        "score": 30,
        "why": ""
      },
      "sourcing": {
        "score": 70,
        "why": ""
      },
      "operationalRisk": {
        "score": 55,
        "why": ""
      },
      "crossSell": {
        "score": 45,
        "why": ""
      }
    },
    "trendDirection": "New opportunity",
    "mainMarket": "Global",
    "priceBand": {
      "low": 550,
      "high": 703,
      "currency": "£/$"
    },
    "demandSignal": {
      "level": "Moderate",
      "type": "Proxy / Signal",
      "description": "Real but thinner competitor base than oval; better as a companion SKU."
    },
    "competitors": [],
    "reviews": {
      "positiveThemes": [],
      "complaints": [],
      "purchaseMotivations": []
    },
    "trendSignals": [],
    "marketGap": {
      "description": "Real but thinner competitor base than oval; better as a companion SKU.",
      "gapScore": 45
    },
    "economicsPotential": {
      "retailPriceRangeEstimate": "£/$550-703",
      "aovBand": "Moderate",
      "paidAcquisitionSuitability": "Moderate-Good",
      "grossMarginPotentialCategory": "Estimate: Weak",
      "freightDifficulty": "Moderate",
      "packagingDifficulty": "Moderate",
      "damageRisk": "Moderate",
      "crossSellPotential": "Low"
    },
    "operatingRisks": [],
    "designerTradeSignals": [],
    "auPotential": "Moderate",
    "nzPotential": "Moderate",
    "tradePotential": "Low",
    "sources": [
      {
        "url": "#",
        "title": "Aquatica UK, Stone Sink Company UK"
      }
    ],
    "recommendedNextAction": "MONITOR",
    "firstSeen": "2026-09-02",
    "lastResearched": "2026-09-02",
    "history": [
      {
        "scanDate": "2026-09-02",
        "score": 47,
        "confidence": 60,
        "priceRange": {
          "low": 550,
          "high": 703,
          "currency": "£/$"
        },
        "reviewCount": null,
        "note": "Initial research pass"
      }
    ],
    "promotedToProductLab": false
  },
  {
    "id": "radar_012",
    "product": "Travertine Bath Stool",
    "variant": "repositioned",
    "category": "Furniture",
    "tier": "B",
    "opportunityScore": 45,
    "confidenceScore": 60,
    "scoreBreakdown": {
      "demandEvidence": {
        "score": 40,
        "why": "Overlaps existing table capability — a repositioning play, not a new product."
      },
      "contributionProfit": {
        "score": 45,
        "why": ""
      },
      "aovCac": {
        "score": 55,
        "why": ""
      },
      "differentiation": {
        "score": 35,
        "why": ""
      },
      "adContent": {
        "score": 55,
        "why": ""
      },
      "auScale": {
        "score": 40,
        "why": ""
      },
      "designerTrade": {
        "score": 25,
        "why": ""
      },
      "sourcing": {
        "score": 85,
        "why": ""
      },
      "operationalRisk": {
        "score": 55,
        "why": ""
      },
      "crossSell": {
        "score": 45,
        "why": ""
      }
    },
    "trendDirection": "New opportunity",
    "mainMarket": "Global",
    "priceBand": {
      "low": 650,
      "high": 1663,
      "currency": "$"
    },
    "demandSignal": {
      "level": "Moderate",
      "type": "Proxy / Signal",
      "description": "Overlaps existing table capability — a repositioning play, not a new product."
    },
    "competitors": [],
    "reviews": {
      "positiveThemes": [],
      "complaints": [],
      "purchaseMotivations": []
    },
    "trendSignals": [],
    "marketGap": {
      "description": "Overlaps existing table capability — a repositioning play, not a new product.",
      "gapScore": 35
    },
    "economicsPotential": {
      "retailPriceRangeEstimate": "$650-1663",
      "aovBand": "Moderate",
      "paidAcquisitionSuitability": "Moderate-Good",
      "grossMarginPotentialCategory": "Estimate: Weak",
      "freightDifficulty": "Moderate",
      "packagingDifficulty": "Moderate",
      "damageRisk": "Moderate",
      "crossSellPotential": "Low"
    },
    "operatingRisks": [],
    "designerTradeSignals": [],
    "auPotential": "Moderate",
    "nzPotential": "Low",
    "tradePotential": "Low",
    "sources": [
      {
        "url": "#",
        "title": "1stDibs, Chairish"
      }
    ],
    "recommendedNextAction": "MONITOR",
    "firstSeen": "2026-09-02",
    "lastResearched": "2026-09-02",
    "history": [
      {
        "scanDate": "2026-09-02",
        "score": 45,
        "confidence": 60,
        "priceRange": {
          "low": 650,
          "high": 1663,
          "currency": "$"
        },
        "reviewCount": null,
        "note": "Initial research pass"
      }
    ],
    "promotedToProductLab": false
  },
  {
    "id": "radar_013",
    "product": "Marble / Travertine Bench",
    "variant": "",
    "category": "Furniture",
    "tier": "B",
    "opportunityScore": 40,
    "confidenceScore": 60,
    "scoreBreakdown": {
      "demandEvidence": {
        "score": 30,
        "why": "Real but thin demand — CB2's flagship natural-stone bench has only 2 reviews."
      },
      "contributionProfit": {
        "score": 45,
        "why": ""
      },
      "aovCac": {
        "score": 45,
        "why": ""
      },
      "differentiation": {
        "score": 40,
        "why": ""
      },
      "adContent": {
        "score": 50,
        "why": ""
      },
      "auScale": {
        "score": 45,
        "why": ""
      },
      "designerTrade": {
        "score": 25,
        "why": ""
      },
      "sourcing": {
        "score": 60,
        "why": ""
      },
      "operationalRisk": {
        "score": 45,
        "why": ""
      },
      "crossSell": {
        "score": 30,
        "why": ""
      }
    },
    "trendDirection": "New opportunity",
    "mainMarket": "US",
    "priceBand": {
      "low": 139,
      "high": 1999,
      "currency": "$"
    },
    "demandSignal": {
      "level": "Weak",
      "type": "Proxy / Signal",
      "description": "Real but thin demand — CB2's flagship natural-stone bench has only 2 reviews."
    },
    "competitors": [],
    "reviews": {
      "positiveThemes": [],
      "complaints": [],
      "purchaseMotivations": []
    },
    "trendSignals": [],
    "marketGap": {
      "description": "Real but thin demand — CB2's flagship natural-stone bench has only 2 reviews.",
      "gapScore": 40
    },
    "economicsPotential": {
      "retailPriceRangeEstimate": "$139-1999",
      "aovBand": "Moderate",
      "paidAcquisitionSuitability": "Moderate-Good",
      "grossMarginPotentialCategory": "Estimate: Weak",
      "freightDifficulty": "Moderate",
      "packagingDifficulty": "Moderate",
      "damageRisk": "Moderate",
      "crossSellPotential": "Low"
    },
    "operatingRisks": [],
    "designerTradeSignals": [],
    "auPotential": "Moderate",
    "nzPotential": "Low",
    "tradePotential": "Low",
    "sources": [
      {
        "url": "#",
        "title": "CB2 Pierre Bench (2 reviews)"
      }
    ],
    "recommendedNextAction": "MONITOR",
    "firstSeen": "2026-09-02",
    "lastResearched": "2026-09-02",
    "history": [
      {
        "scanDate": "2026-09-02",
        "score": 40,
        "confidence": 60,
        "priceRange": {
          "low": 139,
          "high": 1999,
          "currency": "$"
        },
        "reviewCount": null,
        "note": "Initial research pass"
      }
    ],
    "promotedToProductLab": false
  },
  {
    "id": "radar_014",
    "product": "Marble / Travertine Planters",
    "variant": "",
    "category": "Decor",
    "tier": "B",
    "opportunityScore": 42,
    "confidenceScore": 60,
    "scoreBreakdown": {
      "demandEvidence": {
        "score": 35,
        "why": "Modest believable style gap vs. classical garden-ornament competitors."
      },
      "contributionProfit": {
        "score": 45,
        "why": ""
      },
      "aovCac": {
        "score": 50,
        "why": ""
      },
      "differentiation": {
        "score": 50,
        "why": ""
      },
      "adContent": {
        "score": 50,
        "why": ""
      },
      "auScale": {
        "score": 35,
        "why": ""
      },
      "designerTrade": {
        "score": 15,
        "why": ""
      },
      "sourcing": {
        "score": 60,
        "why": ""
      },
      "operationalRisk": {
        "score": 55,
        "why": ""
      },
      "crossSell": {
        "score": 40,
        "why": ""
      }
    },
    "trendDirection": "New opportunity",
    "mainMarket": "US",
    "priceBand": {
      "low": 500,
      "high": 1800,
      "currency": "$"
    },
    "demandSignal": {
      "level": "Weak",
      "type": "Proxy / Signal",
      "description": "Modest believable style gap vs. classical garden-ornament competitors."
    },
    "competitors": [],
    "reviews": {
      "positiveThemes": [],
      "complaints": [],
      "purchaseMotivations": []
    },
    "trendSignals": [],
    "marketGap": {
      "description": "Modest believable style gap vs. classical garden-ornament competitors.",
      "gapScore": 50
    },
    "economicsPotential": {
      "retailPriceRangeEstimate": "$500-1800",
      "aovBand": "Moderate",
      "paidAcquisitionSuitability": "Moderate-Good",
      "grossMarginPotentialCategory": "Estimate: Weak",
      "freightDifficulty": "Moderate",
      "packagingDifficulty": "Moderate",
      "damageRisk": "Moderate",
      "crossSellPotential": "Low"
    },
    "operatingRisks": [],
    "designerTradeSignals": [],
    "auPotential": "Moderate",
    "nzPotential": "Low",
    "tradePotential": "Low",
    "sources": [
      {
        "url": "#",
        "title": "Christopher Spitzmiller, Fine's Gallery"
      }
    ],
    "recommendedNextAction": "MONITOR",
    "firstSeen": "2026-09-02",
    "lastResearched": "2026-09-02",
    "history": [
      {
        "scanDate": "2026-09-02",
        "score": 42,
        "confidence": 60,
        "priceRange": {
          "low": 500,
          "high": 1800,
          "currency": "$"
        },
        "reviewCount": null,
        "note": "Initial research pass"
      }
    ],
    "promotedToProductLab": false
  },
  {
    "id": "radar_015",
    "product": "Stone Lamp Base",
    "variant": "",
    "category": "Architectural",
    "tier": "B",
    "opportunityScore": 37,
    "confidenceScore": 60,
    "scoreBreakdown": {
      "demandEvidence": {
        "score": 20,
        "why": "Plausible easy-fulfilment SKU; weakest demand evidence of the moderate group."
      },
      "contributionProfit": {
        "score": 40,
        "why": ""
      },
      "aovCac": {
        "score": 35,
        "why": ""
      },
      "differentiation": {
        "score": 45,
        "why": ""
      },
      "adContent": {
        "score": 45,
        "why": ""
      },
      "auScale": {
        "score": 35,
        "why": ""
      },
      "designerTrade": {
        "score": 10,
        "why": ""
      },
      "sourcing": {
        "score": 80,
        "why": ""
      },
      "operationalRisk": {
        "score": 80,
        "why": ""
      },
      "crossSell": {
        "score": 35,
        "why": ""
      }
    },
    "trendDirection": "New opportunity",
    "mainMarket": "AU",
    "priceBand": {
      "low": 71,
      "high": 806,
      "currency": "$"
    },
    "demandSignal": {
      "level": "Weak",
      "type": "Proxy / Signal",
      "description": "Plausible easy-fulfilment SKU; weakest demand evidence of the moderate group."
    },
    "competitors": [],
    "reviews": {
      "positiveThemes": [],
      "complaints": [],
      "purchaseMotivations": []
    },
    "trendSignals": [],
    "marketGap": {
      "description": "Plausible easy-fulfilment SKU; weakest demand evidence of the moderate group.",
      "gapScore": 45
    },
    "economicsPotential": {
      "retailPriceRangeEstimate": "$71-806",
      "aovBand": "Moderate",
      "paidAcquisitionSuitability": "Weak",
      "grossMarginPotentialCategory": "Estimate: Weak",
      "freightDifficulty": "Low",
      "packagingDifficulty": "Moderate",
      "damageRisk": "Low",
      "crossSellPotential": "Low"
    },
    "operatingRisks": [],
    "designerTradeSignals": [],
    "auPotential": "Moderate",
    "nzPotential": "Low",
    "tradePotential": "Low",
    "sources": [
      {
        "url": "#",
        "title": "Lighting Collective AU, Nook Collections AU"
      }
    ],
    "recommendedNextAction": "MONITOR",
    "firstSeen": "2026-09-02",
    "lastResearched": "2026-09-02",
    "history": [
      {
        "scanDate": "2026-09-02",
        "score": 37,
        "confidence": 60,
        "priceRange": {
          "low": 71,
          "high": 806,
          "currency": "$"
        },
        "reviewCount": null,
        "note": "Initial research pass"
      }
    ],
    "promotedToProductLab": false
  },
  {
    "id": "radar_016",
    "product": "Travertine / Marble Floating Shelf",
    "variant": "",
    "category": "Architectural",
    "tier": "B",
    "opportunityScore": 42,
    "confidenceScore": 60,
    "scoreBreakdown": {
      "demandEvidence": {
        "score": 45,
        "why": "Real Etsy/renovation-imagery demand, but needs professional wall-anchoring — new install complexity."
      },
      "contributionProfit": {
        "score": 40,
        "why": ""
      },
      "aovCac": {
        "score": 40,
        "why": ""
      },
      "differentiation": {
        "score": 45,
        "why": ""
      },
      "adContent": {
        "score": 55,
        "why": ""
      },
      "auScale": {
        "score": 45,
        "why": ""
      },
      "designerTrade": {
        "score": 15,
        "why": ""
      },
      "sourcing": {
        "score": 55,
        "why": ""
      },
      "operationalRisk": {
        "score": 35,
        "why": ""
      },
      "crossSell": {
        "score": 45,
        "why": ""
      }
    },
    "trendDirection": "New opportunity",
    "mainMarket": "Global",
    "priceBand": {},
    "demandSignal": {
      "level": "Moderate",
      "type": "Proxy / Signal",
      "description": "Real Etsy/renovation-imagery demand, but needs professional wall-anchoring — new install complexity."
    },
    "competitors": [],
    "reviews": {
      "positiveThemes": [],
      "complaints": [],
      "purchaseMotivations": []
    },
    "trendSignals": [],
    "marketGap": {
      "description": "Real Etsy/renovation-imagery demand, but needs professional wall-anchoring — new install complexity.",
      "gapScore": 45
    },
    "economicsPotential": {
      "retailPriceRangeEstimate": "Not established",
      "aovBand": "Moderate",
      "paidAcquisitionSuitability": "Moderate-Good",
      "grossMarginPotentialCategory": "Estimate: Weak",
      "freightDifficulty": "Moderate",
      "packagingDifficulty": "Moderate",
      "damageRisk": "Moderate",
      "crossSellPotential": "Low"
    },
    "operatingRisks": [],
    "designerTradeSignals": [],
    "auPotential": "Moderate",
    "nzPotential": "Moderate",
    "tradePotential": "Low",
    "sources": [
      {
        "url": "#",
        "title": "BCN Marble, Houzz AU renovation galleries"
      }
    ],
    "recommendedNextAction": "MONITOR",
    "firstSeen": "2026-09-02",
    "lastResearched": "2026-09-02",
    "history": [
      {
        "scanDate": "2026-09-02",
        "score": 42,
        "confidence": 60,
        "priceRange": {},
        "reviewCount": null,
        "note": "Initial research pass"
      }
    ],
    "promotedToProductLab": false
  },
  {
    "id": "radar_017",
    "product": "Marble Mortar & Pestle",
    "variant": "",
    "category": "Decor",
    "tier": "B",
    "opportunityScore": 35,
    "confidenceScore": 60,
    "scoreBreakdown": {
      "demandEvidence": {
        "score": 40,
        "why": "Genuinely functional (not decorative), real NZ premium-retailer validation."
      },
      "contributionProfit": {
        "score": 35,
        "why": ""
      },
      "aovCac": {
        "score": 30,
        "why": ""
      },
      "differentiation": {
        "score": 40,
        "why": ""
      },
      "adContent": {
        "score": 40,
        "why": ""
      },
      "auScale": {
        "score": 35,
        "why": ""
      },
      "designerTrade": {
        "score": 10,
        "why": ""
      },
      "sourcing": {
        "score": 40,
        "why": ""
      },
      "operationalRisk": {
        "score": 60,
        "why": ""
      },
      "crossSell": {
        "score": 25,
        "why": ""
      }
    },
    "trendDirection": "New opportunity",
    "mainMarket": "NZ",
    "priceBand": {},
    "demandSignal": {
      "level": "Moderate",
      "type": "Proxy / Signal",
      "description": "Genuinely functional (not decorative), real NZ premium-retailer validation."
    },
    "competitors": [],
    "reviews": {
      "positiveThemes": [],
      "complaints": [],
      "purchaseMotivations": []
    },
    "trendSignals": [],
    "marketGap": {
      "description": "Genuinely functional (not decorative), real NZ premium-retailer validation.",
      "gapScore": 40
    },
    "economicsPotential": {
      "retailPriceRangeEstimate": "Not established",
      "aovBand": "Low",
      "paidAcquisitionSuitability": "Weak",
      "grossMarginPotentialCategory": "Estimate: Weak",
      "freightDifficulty": "Moderate",
      "packagingDifficulty": "Moderate",
      "damageRisk": "Moderate",
      "crossSellPotential": "Low"
    },
    "operatingRisks": [],
    "designerTradeSignals": [],
    "auPotential": "Moderate",
    "nzPotential": "High",
    "tradePotential": "Low",
    "sources": [
      {
        "url": "#",
        "title": "Città NZ, Simon James NZ, IKEA NZ (4.5/5)"
      }
    ],
    "recommendedNextAction": "MONITOR",
    "firstSeen": "2026-09-02",
    "lastResearched": "2026-09-02",
    "history": [
      {
        "scanDate": "2026-09-02",
        "score": 35,
        "confidence": 60,
        "priceRange": {},
        "reviewCount": null,
        "note": "Initial research pass"
      }
    ],
    "promotedToProductLab": false
  },
  {
    "id": "radar_018",
    "product": "Marble Wine Chiller / Champagne Bucket",
    "variant": "",
    "category": "Decor",
    "tier": "B",
    "opportunityScore": 37,
    "confidenceScore": 60,
    "scoreBreakdown": {
      "demandEvidence": {
        "score": 25,
        "why": "No NZ/AU evidence, but closest manufacturing-skillset match to existing basins."
      },
      "contributionProfit": {
        "score": 40,
        "why": ""
      },
      "aovCac": {
        "score": 35,
        "why": ""
      },
      "differentiation": {
        "score": 45,
        "why": ""
      },
      "adContent": {
        "score": 55,
        "why": ""
      },
      "auScale": {
        "score": 20,
        "why": ""
      },
      "designerTrade": {
        "score": 10,
        "why": ""
      },
      "sourcing": {
        "score": 80,
        "why": ""
      },
      "operationalRisk": {
        "score": 65,
        "why": ""
      },
      "crossSell": {
        "score": 40,
        "why": ""
      }
    },
    "trendDirection": "New opportunity",
    "mainMarket": "US",
    "priceBand": {
      "low": 135,
      "high": 135,
      "currency": "$"
    },
    "demandSignal": {
      "level": "Weak",
      "type": "Proxy / Signal",
      "description": "No NZ/AU evidence, but closest manufacturing-skillset match to existing basins."
    },
    "competitors": [],
    "reviews": {
      "positiveThemes": [],
      "complaints": [],
      "purchaseMotivations": []
    },
    "trendSignals": [],
    "marketGap": {
      "description": "No NZ/AU evidence, but closest manufacturing-skillset match to existing basins.",
      "gapScore": 45
    },
    "economicsPotential": {
      "retailPriceRangeEstimate": "$135-135",
      "aovBand": "Moderate",
      "paidAcquisitionSuitability": "Moderate-Good",
      "grossMarginPotentialCategory": "Estimate: Weak",
      "freightDifficulty": "Low",
      "packagingDifficulty": "Moderate",
      "damageRisk": "Low",
      "crossSellPotential": "Low"
    },
    "operatingRisks": [],
    "designerTradeSignals": [],
    "auPotential": "Low-Moderate",
    "nzPotential": "Low",
    "tradePotential": "Low",
    "sources": [
      {
        "url": "#",
        "title": "Wayfair US, Homeries US"
      }
    ],
    "recommendedNextAction": "MONITOR",
    "firstSeen": "2026-09-02",
    "lastResearched": "2026-09-02",
    "history": [
      {
        "scanDate": "2026-09-02",
        "score": 37,
        "confidence": 60,
        "priceRange": {
          "low": 135,
          "high": 135,
          "currency": "$"
        },
        "reviewCount": null,
        "note": "Initial research pass"
      }
    ],
    "promotedToProductLab": false
  },
  {
    "id": "radar_019",
    "product": "Stone Floor / Leaner Mirror",
    "variant": "",
    "category": "Mirror",
    "tier": "B",
    "opportunityScore": 51,
    "confidenceScore": 60,
    "scoreBreakdown": {
      "demandEvidence": {
        "score": 55,
        "why": "Same trend tailwind as wall mirrors, materially higher freight/breakage risk, higher price ceiling."
      },
      "contributionProfit": {
        "score": 55,
        "why": ""
      },
      "aovCac": {
        "score": 70,
        "why": ""
      },
      "differentiation": {
        "score": 60,
        "why": ""
      },
      "adContent": {
        "score": 65,
        "why": ""
      },
      "auScale": {
        "score": 45,
        "why": ""
      },
      "designerTrade": {
        "score": 25,
        "why": ""
      },
      "sourcing": {
        "score": 45,
        "why": ""
      },
      "operationalRisk": {
        "score": 20,
        "why": ""
      },
      "crossSell": {
        "score": 35,
        "why": ""
      }
    },
    "trendDirection": "New opportunity",
    "mainMarket": "US",
    "priceBand": {
      "low": 548,
      "high": 22000,
      "currency": "$"
    },
    "demandSignal": {
      "level": "Moderate",
      "type": "Proxy / Signal",
      "description": "Same trend tailwind as wall mirrors, materially higher freight/breakage risk, higher price ceiling."
    },
    "competitors": [],
    "reviews": {
      "positiveThemes": [],
      "complaints": [],
      "purchaseMotivations": []
    },
    "trendSignals": [],
    "marketGap": {
      "description": "Same trend tailwind as wall mirrors, materially higher freight/breakage risk, higher price ceiling.",
      "gapScore": 60
    },
    "economicsPotential": {
      "retailPriceRangeEstimate": "$548-22000",
      "aovBand": "High",
      "paidAcquisitionSuitability": "Moderate-Good",
      "grossMarginPotentialCategory": "Estimate: Moderate-Good",
      "freightDifficulty": "High",
      "packagingDifficulty": "High",
      "damageRisk": "High",
      "crossSellPotential": "Low"
    },
    "operatingRisks": [
      "Same trend tailwind as wall mirrors, materially higher freight/breakage risk, higher price ceiling."
    ],
    "designerTradeSignals": [],
    "auPotential": "Moderate",
    "nzPotential": "Low",
    "tradePotential": "Low",
    "sources": [
      {
        "url": "#",
        "title": "1stDibs, CB2, Elsa Home and Beauty AU"
      }
    ],
    "recommendedNextAction": "MONITOR",
    "firstSeen": "2026-09-02",
    "lastResearched": "2026-09-02",
    "history": [
      {
        "scanDate": "2026-09-02",
        "score": 51,
        "confidence": 60,
        "priceRange": {
          "low": 548,
          "high": 22000,
          "currency": "$"
        },
        "reviewCount": null,
        "note": "Initial research pass"
      }
    ],
    "promotedToProductLab": false
  },
  {
    "id": "radar_020",
    "product": "Outdoor / Garden Stone Furniture",
    "variant": "",
    "category": "Furniture",
    "tier": "C",
    "opportunityScore": 32,
    "confidenceScore": 60,
    "scoreBreakdown": {
      "demandEvidence": {
        "score": 30,
        "why": "Established leaders (Haddonstone, Chilstone) use CAST stone specifically to solve weathering — a real caution against natural stone outdoors."
      },
      "contributionProfit": {
        "score": 45,
        "why": ""
      },
      "aovCac": {
        "score": 55,
        "why": ""
      },
      "differentiation": {
        "score": 30,
        "why": ""
      },
      "adContent": {
        "score": 45,
        "why": ""
      },
      "auScale": {
        "score": 20,
        "why": ""
      },
      "designerTrade": {
        "score": 15,
        "why": ""
      },
      "sourcing": {
        "score": 25,
        "why": ""
      },
      "operationalRisk": {
        "score": 15,
        "why": ""
      },
      "crossSell": {
        "score": 15,
        "why": ""
      }
    },
    "trendDirection": "New opportunity",
    "mainMarket": "UK",
    "priceBand": {
      "low": 399,
      "high": 44783,
      "currency": "£/$"
    },
    "demandSignal": {
      "level": "Weak",
      "type": "Proxy / Signal",
      "description": "Established leaders (Haddonstone, Chilstone) use CAST stone specifically to solve weathering — a real caution against natural stone outdoors."
    },
    "competitors": [],
    "reviews": {
      "positiveThemes": [],
      "complaints": [],
      "purchaseMotivations": []
    },
    "trendSignals": [],
    "marketGap": {
      "description": "Established leaders (Haddonstone, Chilstone) use CAST stone specifically to solve weathering — a real caution against natural stone outdoors.",
      "gapScore": 30
    },
    "economicsPotential": {
      "retailPriceRangeEstimate": "£/$399-44783",
      "aovBand": "Moderate",
      "paidAcquisitionSuitability": "Weak",
      "grossMarginPotentialCategory": "Estimate: Weak",
      "freightDifficulty": "High",
      "packagingDifficulty": "High",
      "damageRisk": "High",
      "crossSellPotential": "Low"
    },
    "operatingRisks": [
      "Established leaders (Haddonstone, Chilstone) use CAST stone specifically to solve weathering — a real caution against natural stone outdoors."
    ],
    "designerTradeSignals": [],
    "auPotential": "Low",
    "nzPotential": "Low",
    "tradePotential": "Low",
    "sources": [
      {
        "url": "#",
        "title": "Haddonstone UK, Chilstone UK"
      }
    ],
    "recommendedNextAction": "IGNORE",
    "firstSeen": "2026-09-02",
    "lastResearched": "2026-09-02",
    "history": [
      {
        "scanDate": "2026-09-02",
        "score": 32,
        "confidence": 60,
        "priceRange": {
          "low": 399,
          "high": 44783,
          "currency": "£/$"
        },
        "reviewCount": null,
        "note": "Initial research pass"
      }
    ],
    "promotedToProductLab": false
  },
  {
    "id": "radar_021",
    "product": "Stone Trays",
    "variant": "",
    "category": "Decor",
    "tier": "C",
    "opportunityScore": 35,
    "confidenceScore": 60,
    "scoreBreakdown": {
      "demandEvidence": {
        "score": 40,
        "why": "Real demand but the single most Kmart-commoditised item found."
      },
      "contributionProfit": {
        "score": 25,
        "why": ""
      },
      "aovCac": {
        "score": 20,
        "why": ""
      },
      "differentiation": {
        "score": 15,
        "why": ""
      },
      "adContent": {
        "score": 45,
        "why": ""
      },
      "auScale": {
        "score": 45,
        "why": ""
      },
      "designerTrade": {
        "score": 10,
        "why": ""
      },
      "sourcing": {
        "score": 80,
        "why": ""
      },
      "operationalRisk": {
        "score": 80,
        "why": ""
      },
      "crossSell": {
        "score": 25,
        "why": ""
      }
    },
    "trendDirection": "New opportunity",
    "mainMarket": "AU",
    "priceBand": {
      "low": 13,
      "high": 149,
      "currency": "$"
    },
    "demandSignal": {
      "level": "Moderate",
      "type": "Proxy / Signal",
      "description": "Real demand but the single most Kmart-commoditised item found."
    },
    "competitors": [],
    "reviews": {
      "positiveThemes": [],
      "complaints": [],
      "purchaseMotivations": []
    },
    "trendSignals": [],
    "marketGap": {
      "description": "Real demand but the single most Kmart-commoditised item found.",
      "gapScore": 15
    },
    "economicsPotential": {
      "retailPriceRangeEstimate": "$13-149",
      "aovBand": "Low",
      "paidAcquisitionSuitability": "Weak",
      "grossMarginPotentialCategory": "Estimate: Weak",
      "freightDifficulty": "Low",
      "packagingDifficulty": "Moderate",
      "damageRisk": "Low",
      "crossSellPotential": "Low"
    },
    "operatingRisks": [],
    "designerTradeSignals": [],
    "auPotential": "Moderate",
    "nzPotential": "Moderate",
    "tradePotential": "Low",
    "sources": [
      {
        "url": "#",
        "title": "Kmart AU, CB2 (bestseller, 24 reviews)"
      }
    ],
    "recommendedNextAction": "IGNORE",
    "firstSeen": "2026-09-02",
    "lastResearched": "2026-09-02",
    "history": [
      {
        "scanDate": "2026-09-02",
        "score": 35,
        "confidence": 60,
        "priceRange": {
          "low": 13,
          "high": 149,
          "currency": "$"
        },
        "reviewCount": null,
        "note": "Initial research pass"
      }
    ],
    "promotedToProductLab": false
  },
  {
    "id": "radar_022",
    "product": "Marble Cake Stand (solid)",
    "variant": "",
    "category": "Decor",
    "tier": "C",
    "opportunityScore": 27,
    "confidenceScore": 60,
    "scoreBreakdown": {
      "demandEvidence": {
        "score": 25,
        "why": "Real whitespace vs. the composite-material norm, but higher fragility risk and unresolved food-contact-safety questions."
      },
      "contributionProfit": {
        "score": 25,
        "why": ""
      },
      "aovCac": {
        "score": 25,
        "why": ""
      },
      "differentiation": {
        "score": 45,
        "why": ""
      },
      "adContent": {
        "score": 45,
        "why": ""
      },
      "auScale": {
        "score": 20,
        "why": ""
      },
      "designerTrade": {
        "score": 5,
        "why": ""
      },
      "sourcing": {
        "score": 35,
        "why": ""
      },
      "operationalRisk": {
        "score": 25,
        "why": ""
      },
      "crossSell": {
        "score": 20,
        "why": ""
      }
    },
    "trendDirection": "New opportunity",
    "mainMarket": "US",
    "priceBand": {
      "low": 30,
      "high": 120,
      "currency": "$"
    },
    "demandSignal": {
      "level": "Weak",
      "type": "Proxy / Signal",
      "description": "Real whitespace vs. the composite-material norm, but higher fragility risk and unresolved food-contact-safety questions."
    },
    "competitors": [],
    "reviews": {
      "positiveThemes": [],
      "complaints": [],
      "purchaseMotivations": []
    },
    "trendSignals": [],
    "marketGap": {
      "description": "Real whitespace vs. the composite-material norm, but higher fragility risk and unresolved food-contact-safety questions.",
      "gapScore": 45
    },
    "economicsPotential": {
      "retailPriceRangeEstimate": "$30-120",
      "aovBand": "Low",
      "paidAcquisitionSuitability": "Weak",
      "grossMarginPotentialCategory": "Estimate: Weak",
      "freightDifficulty": "High",
      "packagingDifficulty": "High",
      "damageRisk": "High",
      "crossSellPotential": "Low"
    },
    "operatingRisks": [
      "Real whitespace vs. the composite-material norm, but higher fragility risk and unresolved food-contact-safety questions."
    ],
    "designerTradeSignals": [],
    "auPotential": "Low",
    "nzPotential": "Low",
    "tradePotential": "Low",
    "sources": [
      {
        "url": "#",
        "title": "Crate & Barrel, Top Shelf Concepts AU"
      }
    ],
    "recommendedNextAction": "IGNORE",
    "firstSeen": "2026-09-02",
    "lastResearched": "2026-09-02",
    "history": [
      {
        "scanDate": "2026-09-02",
        "score": 27,
        "confidence": 60,
        "priceRange": {
          "low": 30,
          "high": 120,
          "currency": "$"
        },
        "reviewCount": null,
        "note": "Initial research pass"
      }
    ],
    "promotedToProductLab": false
  },
  {
    "id": "radar_023",
    "product": "Wall-Mounted Stone Bathroom Vanity / Cabinet",
    "variant": "",
    "category": "Architectural",
    "tier": "C",
    "opportunityScore": 32,
    "confidenceScore": 60,
    "scoreBreakdown": {
      "demandEvidence": {
        "score": 30,
        "why": "Interesting long-term basin-adjacent idea, but a heavy multi-material, plumbing-adjacent, install-heavy product."
      },
      "contributionProfit": {
        "score": 35,
        "why": ""
      },
      "aovCac": {
        "score": 50,
        "why": ""
      },
      "differentiation": {
        "score": 35,
        "why": ""
      },
      "adContent": {
        "score": 45,
        "why": ""
      },
      "auScale": {
        "score": 30,
        "why": ""
      },
      "designerTrade": {
        "score": 10,
        "why": ""
      },
      "sourcing": {
        "score": 20,
        "why": ""
      },
      "operationalRisk": {
        "score": 15,
        "why": ""
      },
      "crossSell": {
        "score": 45,
        "why": ""
      }
    },
    "trendDirection": "New opportunity",
    "mainMarket": "AU",
    "priceBand": {},
    "demandSignal": {
      "level": "Weak",
      "type": "Proxy / Signal",
      "description": "Interesting long-term basin-adjacent idea, but a heavy multi-material, plumbing-adjacent, install-heavy product."
    },
    "competitors": [],
    "reviews": {
      "positiveThemes": [],
      "complaints": [],
      "purchaseMotivations": []
    },
    "trendSignals": [],
    "marketGap": {
      "description": "Interesting long-term basin-adjacent idea, but a heavy multi-material, plumbing-adjacent, install-heavy product.",
      "gapScore": 35
    },
    "economicsPotential": {
      "retailPriceRangeEstimate": "Not established",
      "aovBand": "Moderate",
      "paidAcquisitionSuitability": "Weak",
      "grossMarginPotentialCategory": "Estimate: Weak",
      "freightDifficulty": "High",
      "packagingDifficulty": "High",
      "damageRisk": "High",
      "crossSellPotential": "Low"
    },
    "operatingRisks": [
      "Interesting long-term basin-adjacent idea, but a heavy multi-material, plumbing-adjacent, install-heavy product."
    ],
    "designerTradeSignals": [],
    "auPotential": "Moderate",
    "nzPotential": "Low",
    "tradePotential": "Low",
    "sources": [
      {
        "url": "#",
        "title": "Elsa Home and Beauty AU, Marble Basin Hub AU"
      }
    ],
    "recommendedNextAction": "IGNORE",
    "firstSeen": "2026-09-02",
    "lastResearched": "2026-09-02",
    "history": [
      {
        "scanDate": "2026-09-02",
        "score": 32,
        "confidence": 60,
        "priceRange": {},
        "reviewCount": null,
        "note": "Initial research pass"
      }
    ],
    "promotedToProductLab": false
  },
  {
    "id": "radar_024",
    "product": "Stone Display Pedestal",
    "variant": "",
    "category": "Furniture",
    "tier": "C",
    "opportunityScore": 31,
    "confidenceScore": 60,
    "scoreBreakdown": {
      "demandEvidence": {
        "score": 30,
        "why": "Overlaps heavily with Prime Piece's existing 9-variant plinth line."
      },
      "contributionProfit": {
        "score": 30,
        "why": ""
      },
      "aovCac": {
        "score": 55,
        "why": ""
      },
      "differentiation": {
        "score": 10,
        "why": ""
      },
      "adContent": {
        "score": 40,
        "why": ""
      },
      "auScale": {
        "score": 25,
        "why": ""
      },
      "designerTrade": {
        "score": 10,
        "why": ""
      },
      "sourcing": {
        "score": 70,
        "why": ""
      },
      "operationalRisk": {
        "score": 50,
        "why": ""
      },
      "crossSell": {
        "score": 10,
        "why": ""
      }
    },
    "trendDirection": "New opportunity",
    "mainMarket": "US",
    "priceBand": {
      "low": 1100,
      "high": 3970,
      "currency": "$"
    },
    "demandSignal": {
      "level": "Weak",
      "type": "Proxy / Signal",
      "description": "Overlaps heavily with Prime Piece's existing 9-variant plinth line."
    },
    "competitors": [],
    "reviews": {
      "positiveThemes": [],
      "complaints": [],
      "purchaseMotivations": []
    },
    "trendSignals": [],
    "marketGap": {
      "description": "Overlaps heavily with Prime Piece's existing 9-variant plinth line.",
      "gapScore": 10
    },
    "economicsPotential": {
      "retailPriceRangeEstimate": "$1100-3970",
      "aovBand": "Moderate",
      "paidAcquisitionSuitability": "Weak",
      "grossMarginPotentialCategory": "Estimate: Weak",
      "freightDifficulty": "Moderate",
      "packagingDifficulty": "Moderate",
      "damageRisk": "Moderate",
      "crossSellPotential": "Low"
    },
    "operatingRisks": [],
    "designerTradeSignals": [],
    "auPotential": "Low",
    "nzPotential": "Low",
    "tradePotential": "Low",
    "sources": [
      {
        "url": "#",
        "title": "1stDibs (391 listings), Fine's Gallery"
      }
    ],
    "recommendedNextAction": "IGNORE",
    "firstSeen": "2026-09-02",
    "lastResearched": "2026-09-02",
    "history": [
      {
        "scanDate": "2026-09-02",
        "score": 31,
        "confidence": 60,
        "priceRange": {
          "low": 1100,
          "high": 3970,
          "currency": "$"
        },
        "reviewCount": null,
        "note": "Initial research pass"
      }
    ],
    "promotedToProductLab": false
  },
  {
    "id": "radar_025",
    "product": "Marble Coaster Sets",
    "variant": "",
    "category": "Decor",
    "tier": "C",
    "opportunityScore": 29,
    "confidenceScore": 60,
    "scoreBreakdown": {
      "demandEvidence": {
        "score": 30,
        "why": "Commodity-saturated, thin margins likely; bundle add-on only."
      },
      "contributionProfit": {
        "score": 15,
        "why": ""
      },
      "aovCac": {
        "score": 10,
        "why": ""
      },
      "differentiation": {
        "score": 10,
        "why": ""
      },
      "adContent": {
        "score": 40,
        "why": ""
      },
      "auScale": {
        "score": 45,
        "why": ""
      },
      "designerTrade": {
        "score": 5,
        "why": ""
      },
      "sourcing": {
        "score": 85,
        "why": ""
      },
      "operationalRisk": {
        "score": 85,
        "why": ""
      },
      "crossSell": {
        "score": 30,
        "why": ""
      }
    },
    "trendDirection": "New opportunity",
    "mainMarket": "AU",
    "priceBand": {
      "low": 45,
      "high": 53,
      "currency": "$"
    },
    "demandSignal": {
      "level": "Weak",
      "type": "Proxy / Signal",
      "description": "Commodity-saturated, thin margins likely; bundle add-on only."
    },
    "competitors": [],
    "reviews": {
      "positiveThemes": [],
      "complaints": [],
      "purchaseMotivations": []
    },
    "trendSignals": [],
    "marketGap": {
      "description": "Commodity-saturated, thin margins likely; bundle add-on only.",
      "gapScore": 10
    },
    "economicsPotential": {
      "retailPriceRangeEstimate": "$45-53",
      "aovBand": "Low",
      "paidAcquisitionSuitability": "Weak",
      "grossMarginPotentialCategory": "Estimate: Weak",
      "freightDifficulty": "Low",
      "packagingDifficulty": "Moderate",
      "damageRisk": "Low",
      "crossSellPotential": "Low"
    },
    "operatingRisks": [],
    "designerTradeSignals": [],
    "auPotential": "Moderate",
    "nzPotential": "Moderate",
    "tradePotential": "Low",
    "sources": [
      {
        "url": "#",
        "title": "Amazon AU, Marble Wholesale AU, Trenzseater NZ"
      }
    ],
    "recommendedNextAction": "IGNORE",
    "firstSeen": "2026-09-02",
    "lastResearched": "2026-09-02",
    "history": [
      {
        "scanDate": "2026-09-02",
        "score": 29,
        "confidence": 60,
        "priceRange": {
          "low": 45,
          "high": 53,
          "currency": "$"
        },
        "reviewCount": null,
        "note": "Initial research pass"
      }
    ],
    "promotedToProductLab": false
  },
  {
    "id": "radar_026",
    "product": "Marble Paperweights / Desk Accessories",
    "variant": "",
    "category": "Decor",
    "tier": "C",
    "opportunityScore": 24,
    "confidenceScore": 60,
    "scoreBreakdown": {
      "demandEvidence": {
        "score": 15,
        "why": "No NZ/AU consumer retail evidence found; B2B corporate-gifting niche only."
      },
      "contributionProfit": {
        "score": 20,
        "why": ""
      },
      "aovCac": {
        "score": 15,
        "why": ""
      },
      "differentiation": {
        "score": 30,
        "why": ""
      },
      "adContent": {
        "score": 35,
        "why": ""
      },
      "auScale": {
        "score": 10,
        "why": ""
      },
      "designerTrade": {
        "score": 5,
        "why": ""
      },
      "sourcing": {
        "score": 75,
        "why": ""
      },
      "operationalRisk": {
        "score": 80,
        "why": ""
      },
      "crossSell": {
        "score": 20,
        "why": ""
      }
    },
    "trendDirection": "New opportunity",
    "mainMarket": "US",
    "priceBand": {
      "low": 25,
      "high": 30,
      "currency": "$"
    },
    "demandSignal": {
      "level": "Weak",
      "type": "Proxy / Signal",
      "description": "No NZ/AU consumer retail evidence found; B2B corporate-gifting niche only."
    },
    "competitors": [],
    "reviews": {
      "positiveThemes": [],
      "complaints": [],
      "purchaseMotivations": []
    },
    "trendSignals": [],
    "marketGap": {
      "description": "No NZ/AU consumer retail evidence found; B2B corporate-gifting niche only.",
      "gapScore": 30
    },
    "economicsPotential": {
      "retailPriceRangeEstimate": "$25-30",
      "aovBand": "Low",
      "paidAcquisitionSuitability": "Weak",
      "grossMarginPotentialCategory": "Estimate: Weak",
      "freightDifficulty": "Low",
      "packagingDifficulty": "Moderate",
      "damageRisk": "Low",
      "crossSellPotential": "Low"
    },
    "operatingRisks": [],
    "designerTradeSignals": [],
    "auPotential": "Low",
    "nzPotential": "Low",
    "tradePotential": "Low",
    "sources": [
      {
        "url": "#",
        "title": "1stDibs, Zazzle US, Archiproducts EU"
      }
    ],
    "recommendedNextAction": "IGNORE",
    "firstSeen": "2026-09-02",
    "lastResearched": "2026-09-02",
    "history": [
      {
        "scanDate": "2026-09-02",
        "score": 24,
        "confidence": 60,
        "priceRange": {
          "low": 25,
          "high": 30,
          "currency": "$"
        },
        "reviewCount": null,
        "note": "Initial research pass"
      }
    ],
    "promotedToProductLab": false
  },
  {
    "id": "radar_027",
    "product": "Marble Desk Organizers / Pen Holders",
    "variant": "",
    "category": "Decor",
    "tier": "C",
    "opportunityScore": 22,
    "confidenceScore": 60,
    "scoreBreakdown": {
      "demandEvidence": {
        "score": 15,
        "why": "No NZ/AU evidence; unproven locally."
      },
      "contributionProfit": {
        "score": 15,
        "why": ""
      },
      "aovCac": {
        "score": 15,
        "why": ""
      },
      "differentiation": {
        "score": 20,
        "why": ""
      },
      "adContent": {
        "score": 30,
        "why": ""
      },
      "auScale": {
        "score": 10,
        "why": ""
      },
      "designerTrade": {
        "score": 5,
        "why": ""
      },
      "sourcing": {
        "score": 75,
        "why": ""
      },
      "operationalRisk": {
        "score": 80,
        "why": ""
      },
      "crossSell": {
        "score": 15,
        "why": ""
      }
    },
    "trendDirection": "New opportunity",
    "mainMarket": "US",
    "priceBand": {
      "low": 4.79,
      "high": 71.98,
      "currency": "$"
    },
    "demandSignal": {
      "level": "Weak",
      "type": "Proxy / Signal",
      "description": "No NZ/AU evidence; unproven locally."
    },
    "competitors": [],
    "reviews": {
      "positiveThemes": [],
      "complaints": [],
      "purchaseMotivations": []
    },
    "trendSignals": [],
    "marketGap": {
      "description": "No NZ/AU evidence; unproven locally.",
      "gapScore": 20
    },
    "economicsPotential": {
      "retailPriceRangeEstimate": "$4.79-71.98",
      "aovBand": "Low",
      "paidAcquisitionSuitability": "Weak",
      "grossMarginPotentialCategory": "Estimate: Weak",
      "freightDifficulty": "Low",
      "packagingDifficulty": "Moderate",
      "damageRisk": "Low",
      "crossSellPotential": "Low"
    },
    "operatingRisks": [],
    "designerTradeSignals": [],
    "auPotential": "Low",
    "nzPotential": "Low",
    "tradePotential": "Low",
    "sources": [
      {
        "url": "#",
        "title": "Walmart, Amazon, Target US, For Counsel US"
      }
    ],
    "recommendedNextAction": "IGNORE",
    "firstSeen": "2026-09-02",
    "lastResearched": "2026-09-02",
    "history": [
      {
        "scanDate": "2026-09-02",
        "score": 22,
        "confidence": 60,
        "priceRange": {
          "low": 4.79,
          "high": 71.98,
          "currency": "$"
        },
        "reviewCount": null,
        "note": "Initial research pass"
      }
    ],
    "promotedToProductLab": false
  },
  {
    "id": "radar_028",
    "product": "Marble Bedside Table",
    "variant": "drawer format",
    "category": "Furniture",
    "tier": "Kill",
    "opportunityScore": 28,
    "confidenceScore": 60,
    "scoreBreakdown": {
      "demandEvidence": {
        "score": 25,
        "why": "Requires wood/metal cabinetry — outside core stone-fabrication competency."
      },
      "contributionProfit": {
        "score": 25,
        "why": ""
      },
      "aovCac": {
        "score": 45,
        "why": ""
      },
      "differentiation": {
        "score": 25,
        "why": ""
      },
      "adContent": {
        "score": 40,
        "why": ""
      },
      "auScale": {
        "score": 20,
        "why": ""
      },
      "designerTrade": {
        "score": 20,
        "why": ""
      },
      "sourcing": {
        "score": 15,
        "why": ""
      },
      "operationalRisk": {
        "score": 45,
        "why": ""
      },
      "crossSell": {
        "score": 20,
        "why": ""
      }
    },
    "trendDirection": "New opportunity",
    "mainMarket": "AU",
    "priceBand": {
      "low": 1170,
      "high": 1170,
      "currency": "$"
    },
    "demandSignal": {
      "level": "Weak",
      "type": "Proxy / Signal",
      "description": "Requires wood/metal cabinetry — outside core stone-fabrication competency."
    },
    "competitors": [],
    "reviews": {
      "positiveThemes": [],
      "complaints": [],
      "purchaseMotivations": []
    },
    "trendSignals": [],
    "marketGap": {
      "description": "Requires wood/metal cabinetry — outside core stone-fabrication competency.",
      "gapScore": 25
    },
    "economicsPotential": {
      "retailPriceRangeEstimate": "$1170-1170",
      "aovBand": "Moderate",
      "paidAcquisitionSuitability": "Weak",
      "grossMarginPotentialCategory": "Estimate: Weak",
      "freightDifficulty": "Moderate",
      "packagingDifficulty": "Moderate",
      "damageRisk": "Moderate",
      "crossSellPotential": "Low"
    },
    "operatingRisks": [],
    "designerTradeSignals": [],
    "auPotential": "Low",
    "nzPotential": "Low",
    "tradePotential": "Low",
    "sources": [
      {
        "url": "#",
        "title": "Trit House AU"
      }
    ],
    "recommendedNextAction": "IGNORE",
    "firstSeen": "2026-09-02",
    "lastResearched": "2026-09-02",
    "history": [
      {
        "scanDate": "2026-09-02",
        "score": 28,
        "confidence": 60,
        "priceRange": {
          "low": 1170,
          "high": 1170,
          "currency": "$"
        },
        "reviewCount": null,
        "note": "Initial research pass"
      }
    ],
    "promotedToProductLab": false
  },
  {
    "id": "radar_029",
    "product": "Marble / Stone TV Media Console",
    "variant": "",
    "category": "Furniture",
    "tier": "Kill",
    "opportunityScore": 28,
    "confidenceScore": 60,
    "scoreBreakdown": {
      "demandEvidence": {
        "score": 30,
        "why": "Requires cabinetry construction; the one directly-observed review on a comparable flagged quality issues."
      },
      "contributionProfit": {
        "score": 30,
        "why": ""
      },
      "aovCac": {
        "score": 50,
        "why": ""
      },
      "differentiation": {
        "score": 15,
        "why": ""
      },
      "adContent": {
        "score": 35,
        "why": ""
      },
      "auScale": {
        "score": 30,
        "why": ""
      },
      "designerTrade": {
        "score": 15,
        "why": ""
      },
      "sourcing": {
        "score": 10,
        "why": ""
      },
      "operationalRisk": {
        "score": 25,
        "why": ""
      },
      "crossSell": {
        "score": 20,
        "why": ""
      }
    },
    "trendDirection": "New opportunity",
    "mainMarket": "US",
    "priceBand": {
      "low": 2500,
      "high": 2500,
      "currency": "$"
    },
    "demandSignal": {
      "level": "Weak",
      "type": "Proxy / Signal",
      "description": "Requires cabinetry construction; the one directly-observed review on a comparable flagged quality issues."
    },
    "competitors": [],
    "reviews": {
      "positiveThemes": [],
      "complaints": [],
      "purchaseMotivations": []
    },
    "trendSignals": [],
    "marketGap": {
      "description": "Requires cabinetry construction; the one directly-observed review on a comparable flagged quality issues.",
      "gapScore": 15
    },
    "economicsPotential": {
      "retailPriceRangeEstimate": "$2500-2500",
      "aovBand": "Moderate",
      "paidAcquisitionSuitability": "Weak",
      "grossMarginPotentialCategory": "Estimate: Weak",
      "freightDifficulty": "High",
      "packagingDifficulty": "High",
      "damageRisk": "High",
      "crossSellPotential": "Low"
    },
    "operatingRisks": [
      "Requires cabinetry construction; the one directly-observed review on a comparable flagged quality issues."
    ],
    "designerTradeSignals": [],
    "auPotential": "Low",
    "nzPotential": "Low",
    "tradePotential": "Low",
    "sources": [
      {
        "url": "#",
        "title": "West Elm, CB2, Wayfair (quality complaints)"
      }
    ],
    "recommendedNextAction": "IGNORE",
    "firstSeen": "2026-09-02",
    "lastResearched": "2026-09-02",
    "history": [
      {
        "scanDate": "2026-09-02",
        "score": 28,
        "confidence": 60,
        "priceRange": {
          "low": 2500,
          "high": 2500,
          "currency": "$"
        },
        "reviewCount": null,
        "note": "Initial research pass"
      }
    ],
    "promotedToProductLab": false
  },
  {
    "id": "radar_030",
    "product": "Upholstered \"Marble-Look\" Bar / Counter Stool",
    "variant": "",
    "category": "Furniture",
    "tier": "Kill",
    "opportunityScore": 19,
    "confidenceScore": 60,
    "scoreBreakdown": {
      "demandEvidence": {
        "score": 20,
        "why": "Not real stone (MDF + faux veneer + upholstery) — different business entirely."
      },
      "contributionProfit": {
        "score": 10,
        "why": ""
      },
      "aovCac": {
        "score": 20,
        "why": ""
      },
      "differentiation": {
        "score": 5,
        "why": ""
      },
      "adContent": {
        "score": 30,
        "why": ""
      },
      "auScale": {
        "score": 30,
        "why": ""
      },
      "designerTrade": {
        "score": 5,
        "why": ""
      },
      "sourcing": {
        "score": 10,
        "why": ""
      },
      "operationalRisk": {
        "score": 70,
        "why": ""
      },
      "crossSell": {
        "score": 10,
        "why": ""
      }
    },
    "trendDirection": "New opportunity",
    "mainMarket": "US",
    "priceBand": {},
    "demandSignal": {
      "level": "Weak",
      "type": "Proxy / Signal",
      "description": "Not real stone (MDF + faux veneer + upholstery) — different business entirely."
    },
    "competitors": [],
    "reviews": {
      "positiveThemes": [],
      "complaints": [],
      "purchaseMotivations": []
    },
    "trendSignals": [],
    "marketGap": {
      "description": "Not real stone (MDF + faux veneer + upholstery) — different business entirely.",
      "gapScore": 5
    },
    "economicsPotential": {
      "retailPriceRangeEstimate": "Not established",
      "aovBand": "Low",
      "paidAcquisitionSuitability": "Weak",
      "grossMarginPotentialCategory": "Estimate: Weak",
      "freightDifficulty": "Low",
      "packagingDifficulty": "Moderate",
      "damageRisk": "Low",
      "crossSellPotential": "Low"
    },
    "operatingRisks": [],
    "designerTradeSignals": [],
    "auPotential": "Low",
    "nzPotential": "Low",
    "tradePotential": "Low",
    "sources": [
      {
        "url": "#",
        "title": "Wayfair, Target, Amazon, Walmart"
      }
    ],
    "recommendedNextAction": "IGNORE",
    "firstSeen": "2026-09-02",
    "lastResearched": "2026-09-02",
    "history": [
      {
        "scanDate": "2026-09-02",
        "score": 19,
        "confidence": 60,
        "priceRange": {},
        "reviewCount": null,
        "note": "Initial research pass"
      }
    ],
    "promotedToProductLab": false
  },
  {
    "id": "radar_031",
    "product": "Marble Room Divider / Screen",
    "variant": "",
    "category": "Furniture",
    "tier": "Kill",
    "opportunityScore": 14,
    "confidenceScore": 60,
    "scoreBreakdown": {
      "demandEvidence": {
        "score": 10,
        "why": "Not real stone — printed canvas/graphic panels."
      },
      "contributionProfit": {
        "score": 5,
        "why": ""
      },
      "aovCac": {
        "score": 20,
        "why": ""
      },
      "differentiation": {
        "score": 5,
        "why": ""
      },
      "adContent": {
        "score": 25,
        "why": ""
      },
      "auScale": {
        "score": 15,
        "why": ""
      },
      "designerTrade": {
        "score": 5,
        "why": ""
      },
      "sourcing": {
        "score": 10,
        "why": ""
      },
      "operationalRisk": {
        "score": 70,
        "why": ""
      },
      "crossSell": {
        "score": 10,
        "why": ""
      }
    },
    "trendDirection": "New opportunity",
    "mainMarket": "US",
    "priceBand": {
      "low": 100,
      "high": 500,
      "currency": "$"
    },
    "demandSignal": {
      "level": "Weak",
      "type": "Proxy / Signal",
      "description": "Not real stone — printed canvas/graphic panels."
    },
    "competitors": [],
    "reviews": {
      "positiveThemes": [],
      "complaints": [],
      "purchaseMotivations": []
    },
    "trendSignals": [],
    "marketGap": {
      "description": "Not real stone — printed canvas/graphic panels.",
      "gapScore": 5
    },
    "economicsPotential": {
      "retailPriceRangeEstimate": "$100-500",
      "aovBand": "Low",
      "paidAcquisitionSuitability": "Weak",
      "grossMarginPotentialCategory": "Estimate: Weak",
      "freightDifficulty": "Low",
      "packagingDifficulty": "Moderate",
      "damageRisk": "Low",
      "crossSellPotential": "Low"
    },
    "operatingRisks": [],
    "designerTradeSignals": [],
    "auPotential": "Low",
    "nzPotential": "Low",
    "tradePotential": "Low",
    "sources": [
      {
        "url": "#",
        "title": "Amazon (Screen Gems), Target, IKEA"
      }
    ],
    "recommendedNextAction": "IGNORE",
    "firstSeen": "2026-09-02",
    "lastResearched": "2026-09-02",
    "history": [
      {
        "scanDate": "2026-09-02",
        "score": 14,
        "confidence": 60,
        "priceRange": {
          "low": 100,
          "high": 500,
          "currency": "$"
        },
        "reviewCount": null,
        "note": "Initial research pass"
      }
    ],
    "promotedToProductLab": false
  },
  {
    "id": "radar_032",
    "product": "Full Freestanding Stone Bathtub",
    "variant": "",
    "category": "Bathroom",
    "tier": "Kill",
    "opportunityScore": 54,
    "confidenceScore": 60,
    "scoreBreakdown": {
      "demandEvidence": {
        "score": 60,
        "why": "Highest AOV found, but the heaviest/most fragile/most operationally complex item researched — recreates the bespoke problem being left behind."
      },
      "contributionProfit": {
        "score": 80,
        "why": ""
      },
      "aovCac": {
        "score": 90,
        "why": ""
      },
      "differentiation": {
        "score": 60,
        "why": ""
      },
      "adContent": {
        "score": 75,
        "why": ""
      },
      "auScale": {
        "score": 40,
        "why": ""
      },
      "designerTrade": {
        "score": 15,
        "why": ""
      },
      "sourcing": {
        "score": 10,
        "why": ""
      },
      "operationalRisk": {
        "score": 5,
        "why": ""
      },
      "crossSell": {
        "score": 15,
        "why": ""
      }
    },
    "trendDirection": "New opportunity",
    "mainMarket": "Global",
    "priceBand": {
      "low": 1900,
      "high": 15125,
      "currency": "$"
    },
    "demandSignal": {
      "level": "Moderate-Strong",
      "type": "Proxy / Signal",
      "description": "Highest AOV found, but the heaviest/most fragile/most operationally complex item researched — recreates the bespoke problem being left behind."
    },
    "competitors": [],
    "reviews": {
      "positiveThemes": [],
      "complaints": [],
      "purchaseMotivations": []
    },
    "trendSignals": [],
    "marketGap": {
      "description": "Highest AOV found, but the heaviest/most fragile/most operationally complex item researched — recreates the bespoke problem being left behind.",
      "gapScore": 60
    },
    "economicsPotential": {
      "retailPriceRangeEstimate": "$1900-15125",
      "aovBand": "High",
      "paidAcquisitionSuitability": "Moderate-Good",
      "grossMarginPotentialCategory": "Estimate: Moderate-Good",
      "freightDifficulty": "High",
      "packagingDifficulty": "High",
      "damageRisk": "High",
      "crossSellPotential": "Low"
    },
    "operatingRisks": [
      "Highest AOV found, but the heaviest/most fragile/most operationally complex item researched — recreates the bespoke problem being left behind."
    ],
    "designerTradeSignals": [],
    "auPotential": "Low",
    "nzPotential": "Low",
    "tradePotential": "Moderate",
    "sources": [
      {
        "url": "#",
        "title": "Elemento Bath US, Architect Marble EU, trendsideas.com NZ"
      }
    ],
    "recommendedNextAction": "IGNORE",
    "firstSeen": "2026-09-02",
    "lastResearched": "2026-09-02",
    "history": [
      {
        "scanDate": "2026-09-02",
        "score": 54,
        "confidence": 60,
        "priceRange": {
          "low": 1900,
          "high": 15125,
          "currency": "$"
        },
        "reviewCount": null,
        "note": "Initial research pass"
      }
    ],
    "promotedToProductLab": false
  },
  {
    "id": "radar_033",
    "product": "Stone Bath Caddy / Tub Tray",
    "variant": "",
    "category": "Bathroom",
    "tier": "Kill",
    "opportunityScore": 33,
    "confidenceScore": 60,
    "scoreBreakdown": {
      "demandEvidence": {
        "score": 55,
        "why": "Real Amazon bestseller category, but the winning format is metal-framed with marble accents, not solid stone."
      },
      "contributionProfit": {
        "score": 15,
        "why": ""
      },
      "aovCac": {
        "score": 20,
        "why": ""
      },
      "differentiation": {
        "score": 10,
        "why": ""
      },
      "adContent": {
        "score": 60,
        "why": ""
      },
      "auScale": {
        "score": 40,
        "why": ""
      },
      "designerTrade": {
        "score": 10,
        "why": ""
      },
      "sourcing": {
        "score": 20,
        "why": ""
      },
      "operationalRisk": {
        "score": 70,
        "why": ""
      },
      "crossSell": {
        "score": 25,
        "why": ""
      }
    },
    "trendDirection": "New opportunity",
    "mainMarket": "US",
    "priceBand": {},
    "demandSignal": {
      "level": "Moderate",
      "type": "Proxy / Signal",
      "description": "Real Amazon bestseller category, but the winning format is metal-framed with marble accents, not solid stone."
    },
    "competitors": [],
    "reviews": {
      "positiveThemes": [],
      "complaints": [],
      "purchaseMotivations": []
    },
    "trendSignals": [],
    "marketGap": {
      "description": "Real Amazon bestseller category, but the winning format is metal-framed with marble accents, not solid stone.",
      "gapScore": 10
    },
    "economicsPotential": {
      "retailPriceRangeEstimate": "Not established",
      "aovBand": "Low",
      "paidAcquisitionSuitability": "Moderate-Good",
      "grossMarginPotentialCategory": "Estimate: Weak",
      "freightDifficulty": "Low",
      "packagingDifficulty": "Moderate",
      "damageRisk": "Low",
      "crossSellPotential": "Low"
    },
    "operatingRisks": [],
    "designerTradeSignals": [],
    "auPotential": "Low",
    "nzPotential": "Low",
    "tradePotential": "Low",
    "sources": [
      {
        "url": "#",
        "title": "Amazon Best Sellers: Best Bathtub Trays"
      }
    ],
    "recommendedNextAction": "IGNORE",
    "firstSeen": "2026-09-02",
    "lastResearched": "2026-09-02",
    "history": [
      {
        "scanDate": "2026-09-02",
        "score": 33,
        "confidence": 60,
        "priceRange": {},
        "reviewCount": null,
        "note": "Initial research pass"
      }
    ],
    "promotedToProductLab": false
  },
  {
    "id": "radar_034",
    "product": "Stone Vanity / Countertop Tray (small)",
    "variant": "",
    "category": "Bathroom",
    "tier": "Kill",
    "opportunityScore": 25,
    "confidenceScore": 60,
    "scoreBreakdown": {
      "demandEvidence": {
        "score": 25,
        "why": "Commodity-priced, poor premium-brand fit."
      },
      "contributionProfit": {
        "score": 10,
        "why": ""
      },
      "aovCac": {
        "score": 10,
        "why": ""
      },
      "differentiation": {
        "score": 10,
        "why": ""
      },
      "adContent": {
        "score": 40,
        "why": ""
      },
      "auScale": {
        "score": 30,
        "why": ""
      },
      "designerTrade": {
        "score": 5,
        "why": ""
      },
      "sourcing": {
        "score": 80,
        "why": ""
      },
      "operationalRisk": {
        "score": 85,
        "why": ""
      },
      "crossSell": {
        "score": 20,
        "why": ""
      }
    },
    "trendDirection": "New opportunity",
    "mainMarket": "US",
    "priceBand": {
      "low": 19.53,
      "high": 31.34,
      "currency": "$"
    },
    "demandSignal": {
      "level": "Weak",
      "type": "Proxy / Signal",
      "description": "Commodity-priced, poor premium-brand fit."
    },
    "competitors": [],
    "reviews": {
      "positiveThemes": [],
      "complaints": [],
      "purchaseMotivations": []
    },
    "trendSignals": [],
    "marketGap": {
      "description": "Commodity-priced, poor premium-brand fit.",
      "gapScore": 10
    },
    "economicsPotential": {
      "retailPriceRangeEstimate": "$19.53-31.34",
      "aovBand": "Low",
      "paidAcquisitionSuitability": "Weak",
      "grossMarginPotentialCategory": "Estimate: Weak",
      "freightDifficulty": "Low",
      "packagingDifficulty": "Moderate",
      "damageRisk": "Low",
      "crossSellPotential": "Low"
    },
    "operatingRisks": [],
    "designerTradeSignals": [],
    "auPotential": "Low",
    "nzPotential": "Low",
    "tradePotential": "Low",
    "sources": [
      {
        "url": "#",
        "title": "Amazon listing snippets"
      }
    ],
    "recommendedNextAction": "IGNORE",
    "firstSeen": "2026-09-02",
    "lastResearched": "2026-09-02",
    "history": [
      {
        "scanDate": "2026-09-02",
        "score": 25,
        "confidence": 60,
        "priceRange": {
          "low": 19.53,
          "high": 31.34,
          "currency": "$"
        },
        "reviewCount": null,
        "note": "Initial research pass"
      }
    ],
    "promotedToProductLab": false
  },
  {
    "id": "radar_035",
    "product": "Stone Towel Shelf / Ladder",
    "variant": "",
    "category": "Bathroom",
    "tier": "Kill",
    "opportunityScore": 23,
    "confidenceScore": 60,
    "scoreBreakdown": {
      "demandEvidence": {
        "score": 25,
        "why": "Hybrid metal+stone construction — same brand mismatch as the bath tray."
      },
      "contributionProfit": {
        "score": 15,
        "why": ""
      },
      "aovCac": {
        "score": 15,
        "why": ""
      },
      "differentiation": {
        "score": 10,
        "why": ""
      },
      "adContent": {
        "score": 35,
        "why": ""
      },
      "auScale": {
        "score": 30,
        "why": ""
      },
      "designerTrade": {
        "score": 10,
        "why": ""
      },
      "sourcing": {
        "score": 25,
        "why": ""
      },
      "operationalRisk": {
        "score": 65,
        "why": ""
      },
      "crossSell": {
        "score": 20,
        "why": ""
      }
    },
    "trendDirection": "New opportunity",
    "mainMarket": "US",
    "priceBand": {
      "low": 35,
      "high": 75,
      "currency": "$"
    },
    "demandSignal": {
      "level": "Weak",
      "type": "Proxy / Signal",
      "description": "Hybrid metal+stone construction — same brand mismatch as the bath tray."
    },
    "competitors": [],
    "reviews": {
      "positiveThemes": [],
      "complaints": [],
      "purchaseMotivations": []
    },
    "trendSignals": [],
    "marketGap": {
      "description": "Hybrid metal+stone construction — same brand mismatch as the bath tray.",
      "gapScore": 10
    },
    "economicsPotential": {
      "retailPriceRangeEstimate": "$35-75",
      "aovBand": "Low",
      "paidAcquisitionSuitability": "Weak",
      "grossMarginPotentialCategory": "Estimate: Weak",
      "freightDifficulty": "Low",
      "packagingDifficulty": "Moderate",
      "damageRisk": "Low",
      "crossSellPotential": "Low"
    },
    "operatingRisks": [],
    "designerTradeSignals": [],
    "auPotential": "Low",
    "nzPotential": "Low",
    "tradePotential": "Low",
    "sources": [
      {
        "url": "#",
        "title": "BWE via Lowe's US, eBay, Wayfair"
      }
    ],
    "recommendedNextAction": "IGNORE",
    "firstSeen": "2026-09-02",
    "lastResearched": "2026-09-02",
    "history": [
      {
        "scanDate": "2026-09-02",
        "score": 23,
        "confidence": 60,
        "priceRange": {
          "low": 35,
          "high": 75,
          "currency": "$"
        },
        "reviewCount": null,
        "note": "Initial research pass"
      }
    ],
    "promotedToProductLab": false
  },
  {
    "id": "radar_036",
    "product": "Built-in Marble Shower Bench",
    "variant": "",
    "category": "Bathroom",
    "tier": "Kill",
    "opportunityScore": 24,
    "confidenceScore": 60,
    "scoreBreakdown": {
      "demandEvidence": {
        "score": 30,
        "why": "Functions as a trade/tile product (built to measure), not a retail ecommerce SKU."
      },
      "contributionProfit": {
        "score": 25,
        "why": ""
      },
      "aovCac": {
        "score": 30,
        "why": ""
      },
      "differentiation": {
        "score": 15,
        "why": ""
      },
      "adContent": {
        "score": 35,
        "why": ""
      },
      "auScale": {
        "score": 25,
        "why": ""
      },
      "designerTrade": {
        "score": 10,
        "why": ""
      },
      "sourcing": {
        "score": 15,
        "why": ""
      },
      "operationalRisk": {
        "score": 35,
        "why": ""
      },
      "crossSell": {
        "score": 10,
        "why": ""
      }
    },
    "trendDirection": "New opportunity",
    "mainMarket": "US",
    "priceBand": {
      "low": 99,
      "high": 350,
      "currency": "$"
    },
    "demandSignal": {
      "level": "Weak",
      "type": "Proxy / Signal",
      "description": "Functions as a trade/tile product (built to measure), not a retail ecommerce SKU."
    },
    "competitors": [],
    "reviews": {
      "positiveThemes": [],
      "complaints": [],
      "purchaseMotivations": []
    },
    "trendSignals": [],
    "marketGap": {
      "description": "Functions as a trade/tile product (built to measure), not a retail ecommerce SKU.",
      "gapScore": 15
    },
    "economicsPotential": {
      "retailPriceRangeEstimate": "$99-350",
      "aovBand": "Low",
      "paidAcquisitionSuitability": "Weak",
      "grossMarginPotentialCategory": "Estimate: Weak",
      "freightDifficulty": "Moderate",
      "packagingDifficulty": "Moderate",
      "damageRisk": "Moderate",
      "crossSellPotential": "Low"
    },
    "operatingRisks": [],
    "designerTradeSignals": [],
    "auPotential": "Low",
    "nzPotential": "Low",
    "tradePotential": "Low",
    "sources": [
      {
        "url": "#",
        "title": "Demtech AU, Wholetiles, Amazon"
      }
    ],
    "recommendedNextAction": "IGNORE",
    "firstSeen": "2026-09-02",
    "lastResearched": "2026-09-02",
    "history": [
      {
        "scanDate": "2026-09-02",
        "score": 24,
        "confidence": 60,
        "priceRange": {
          "low": 99,
          "high": 350,
          "currency": "$"
        },
        "reviewCount": null,
        "note": "Initial research pass"
      }
    ],
    "promotedToProductLab": false
  },
  {
    "id": "radar_037",
    "product": "Marble Bathroom Accessory Set",
    "variant": "soap/tumbler",
    "category": "Bathroom",
    "tier": "Kill",
    "opportunityScore": 25,
    "confidenceScore": 60,
    "scoreBreakdown": {
      "demandEvidence": {
        "score": 25,
        "why": "Dominant competitive set is faux \"marble-look\" resin/ceramic, not genuine stone."
      },
      "contributionProfit": {
        "score": 10,
        "why": ""
      },
      "aovCac": {
        "score": 10,
        "why": ""
      },
      "differentiation": {
        "score": 5,
        "why": ""
      },
      "adContent": {
        "score": 35,
        "why": ""
      },
      "auScale": {
        "score": 30,
        "why": ""
      },
      "designerTrade": {
        "score": 5,
        "why": ""
      },
      "sourcing": {
        "score": 80,
        "why": ""
      },
      "operationalRisk": {
        "score": 85,
        "why": ""
      },
      "crossSell": {
        "score": 25,
        "why": ""
      }
    },
    "trendDirection": "New opportunity",
    "mainMarket": "AU",
    "priceBand": {
      "low": 40.99,
      "high": 89.38,
      "currency": "$"
    },
    "demandSignal": {
      "level": "Weak",
      "type": "Proxy / Signal",
      "description": "Dominant competitive set is faux \"marble-look\" resin/ceramic, not genuine stone."
    },
    "competitors": [],
    "reviews": {
      "positiveThemes": [],
      "complaints": [],
      "purchaseMotivations": []
    },
    "trendSignals": [],
    "marketGap": {
      "description": "Dominant competitive set is faux \"marble-look\" resin/ceramic, not genuine stone.",
      "gapScore": 5
    },
    "economicsPotential": {
      "retailPriceRangeEstimate": "$40.99-89.38",
      "aovBand": "Low",
      "paidAcquisitionSuitability": "Weak",
      "grossMarginPotentialCategory": "Estimate: Weak",
      "freightDifficulty": "Low",
      "packagingDifficulty": "Moderate",
      "damageRisk": "Low",
      "crossSellPotential": "Low"
    },
    "operatingRisks": [],
    "designerTradeSignals": [],
    "auPotential": "Low",
    "nzPotential": "Low",
    "tradePotential": "Low",
    "sources": [
      {
        "url": "#",
        "title": "Bed Bath N' Table AU, Home Depot"
      }
    ],
    "recommendedNextAction": "IGNORE",
    "firstSeen": "2026-09-02",
    "lastResearched": "2026-09-02",
    "history": [
      {
        "scanDate": "2026-09-02",
        "score": 25,
        "confidence": 60,
        "priceRange": {
          "low": 40.99,
          "high": 89.38,
          "currency": "$"
        },
        "reviewCount": null,
        "note": "Initial research pass"
      }
    ],
    "promotedToProductLab": false
  },
  {
    "id": "radar_038",
    "product": "Stone Bathroom Accessory Sets",
    "variant": "Adairs-style",
    "category": "Decor",
    "tier": "Kill",
    "opportunityScore": 25,
    "confidenceScore": 60,
    "scoreBreakdown": {
      "demandEvidence": {
        "score": 30,
        "why": "The most big-box-dominated category found (Adairs AU+NZ, Bed Bath N' Table both carry dedicated lines)."
      },
      "contributionProfit": {
        "score": 10,
        "why": ""
      },
      "aovCac": {
        "score": 10,
        "why": ""
      },
      "differentiation": {
        "score": 5,
        "why": ""
      },
      "adContent": {
        "score": 35,
        "why": ""
      },
      "auScale": {
        "score": 35,
        "why": ""
      },
      "designerTrade": {
        "score": 5,
        "why": ""
      },
      "sourcing": {
        "score": 60,
        "why": ""
      },
      "operationalRisk": {
        "score": 75,
        "why": ""
      },
      "crossSell": {
        "score": 25,
        "why": ""
      }
    },
    "trendDirection": "New opportunity",
    "mainMarket": "AU",
    "priceBand": {},
    "demandSignal": {
      "level": "Weak",
      "type": "Proxy / Signal",
      "description": "The most big-box-dominated category found (Adairs AU+NZ, Bed Bath N' Table both carry dedicated lines)."
    },
    "competitors": [],
    "reviews": {
      "positiveThemes": [],
      "complaints": [],
      "purchaseMotivations": []
    },
    "trendSignals": [],
    "marketGap": {
      "description": "The most big-box-dominated category found (Adairs AU+NZ, Bed Bath N' Table both carry dedicated lines).",
      "gapScore": 5
    },
    "economicsPotential": {
      "retailPriceRangeEstimate": "Not established",
      "aovBand": "Low",
      "paidAcquisitionSuitability": "Weak",
      "grossMarginPotentialCategory": "Estimate: Weak",
      "freightDifficulty": "Low",
      "packagingDifficulty": "Moderate",
      "damageRisk": "Low",
      "crossSellPotential": "Low"
    },
    "operatingRisks": [],
    "designerTradeSignals": [],
    "auPotential": "Low",
    "nzPotential": "Low",
    "tradePotential": "Low",
    "sources": [
      {
        "url": "#",
        "title": "Adairs AU/NZ, Bed Bath N' Table"
      }
    ],
    "recommendedNextAction": "IGNORE",
    "firstSeen": "2026-09-02",
    "lastResearched": "2026-09-02",
    "history": [
      {
        "scanDate": "2026-09-02",
        "score": 25,
        "confidence": 60,
        "priceRange": {},
        "reviewCount": null,
        "note": "Initial research pass"
      }
    ],
    "promotedToProductLab": false
  },
  {
    "id": "radar_039",
    "product": "Backlit Onyx Feature Wall Panel",
    "variant": "",
    "category": "Architectural",
    "tier": "Kill",
    "opportunityScore": 43,
    "confidenceScore": 60,
    "scoreBreakdown": {
      "demandEvidence": {
        "score": 30,
        "why": "Bespoke commercial fit-out (electrician + mason) — not a purchasable SKU."
      },
      "contributionProfit": {
        "score": 60,
        "why": ""
      },
      "aovCac": {
        "score": 70,
        "why": ""
      },
      "differentiation": {
        "score": 80,
        "why": ""
      },
      "adContent": {
        "score": 85,
        "why": ""
      },
      "auScale": {
        "score": 15,
        "why": ""
      },
      "designerTrade": {
        "score": 20,
        "why": ""
      },
      "sourcing": {
        "score": 5,
        "why": ""
      },
      "operationalRisk": {
        "score": 10,
        "why": ""
      },
      "crossSell": {
        "score": 10,
        "why": ""
      }
    },
    "trendDirection": "New opportunity",
    "mainMarket": "Global",
    "priceBand": {},
    "demandSignal": {
      "level": "Weak",
      "type": "Proxy / Signal",
      "description": "Bespoke commercial fit-out (electrician + mason) — not a purchasable SKU."
    },
    "competitors": [],
    "reviews": {
      "positiveThemes": [],
      "complaints": [],
      "purchaseMotivations": []
    },
    "trendSignals": [],
    "marketGap": {
      "description": "Bespoke commercial fit-out (electrician + mason) — not a purchasable SKU.",
      "gapScore": 80
    },
    "economicsPotential": {
      "retailPriceRangeEstimate": "Not established",
      "aovBand": "High",
      "paidAcquisitionSuitability": "Moderate-Good",
      "grossMarginPotentialCategory": "Estimate: Moderate-Good",
      "freightDifficulty": "High",
      "packagingDifficulty": "High",
      "damageRisk": "High",
      "crossSellPotential": "Low"
    },
    "operatingRisks": [
      "Bespoke commercial fit-out (electrician + mason) — not a purchasable SKU."
    ],
    "designerTradeSignals": [],
    "auPotential": "Low",
    "nzPotential": "Low",
    "tradePotential": "Moderate",
    "sources": [
      {
        "url": "#",
        "title": "Purchasestones.com, ARKdeko, KSM Onyx (B2B/trade)"
      }
    ],
    "recommendedNextAction": "IGNORE",
    "firstSeen": "2026-09-02",
    "lastResearched": "2026-09-02",
    "history": [
      {
        "scanDate": "2026-09-02",
        "score": 43,
        "confidence": 60,
        "priceRange": {},
        "reviewCount": null,
        "note": "Initial research pass"
      }
    ],
    "promotedToProductLab": false
  },
  {
    "id": "radar_040",
    "product": "Stone Window Sill / Ledge",
    "variant": "",
    "category": "Architectural",
    "tier": "Kill",
    "opportunityScore": 17,
    "confidenceScore": 60,
    "scoreBreakdown": {
      "demandEvidence": {
        "score": 20,
        "why": "Mature, low-margin construction-trade commodity, wrong channel entirely."
      },
      "contributionProfit": {
        "score": 10,
        "why": ""
      },
      "aovCac": {
        "score": 10,
        "why": ""
      },
      "differentiation": {
        "score": 5,
        "why": ""
      },
      "adContent": {
        "score": 15,
        "why": ""
      },
      "auScale": {
        "score": 15,
        "why": ""
      },
      "designerTrade": {
        "score": 5,
        "why": ""
      },
      "sourcing": {
        "score": 60,
        "why": ""
      },
      "operationalRisk": {
        "score": 60,
        "why": ""
      },
      "crossSell": {
        "score": 5,
        "why": ""
      }
    },
    "trendDirection": "New opportunity",
    "mainMarket": "US",
    "priceBand": {},
    "demandSignal": {
      "level": "Weak",
      "type": "Proxy / Signal",
      "description": "Mature, low-margin construction-trade commodity, wrong channel entirely."
    },
    "competitors": [],
    "reviews": {
      "positiveThemes": [],
      "complaints": [],
      "purchaseMotivations": []
    },
    "trendSignals": [],
    "marketGap": {
      "description": "Mature, low-margin construction-trade commodity, wrong channel entirely.",
      "gapScore": 5
    },
    "economicsPotential": {
      "retailPriceRangeEstimate": "Not established",
      "aovBand": "Low",
      "paidAcquisitionSuitability": "Weak",
      "grossMarginPotentialCategory": "Estimate: Weak",
      "freightDifficulty": "Moderate",
      "packagingDifficulty": "Moderate",
      "damageRisk": "Moderate",
      "crossSellPotential": "Low"
    },
    "operatingRisks": [],
    "designerTradeSignals": [],
    "auPotential": "Low",
    "nzPotential": "Low",
    "tradePotential": "Low",
    "sources": [
      {
        "url": "#",
        "title": "Tile Outlets, DW Tile & Stone, STONEXCHANGE (trade)"
      }
    ],
    "recommendedNextAction": "IGNORE",
    "firstSeen": "2026-09-02",
    "lastResearched": "2026-09-02",
    "history": [
      {
        "scanDate": "2026-09-02",
        "score": 17,
        "confidence": 60,
        "priceRange": {},
        "reviewCount": null,
        "note": "Initial research pass"
      }
    ],
    "promotedToProductLab": false
  },
  {
    "id": "radar_041",
    "product": "Marble Wall Cladding / Feature Panels",
    "variant": "",
    "category": "Architectural",
    "tier": "Kill",
    "opportunityScore": 21,
    "confidenceScore": 60,
    "scoreBreakdown": {
      "demandEvidence": {
        "score": 25,
        "why": "Real market growth is in non-stone PVC/composite alternatives — undercuts the \"real stone\" pitch."
      },
      "contributionProfit": {
        "score": 15,
        "why": ""
      },
      "aovCac": {
        "score": 25,
        "why": ""
      },
      "differentiation": {
        "score": 15,
        "why": ""
      },
      "adContent": {
        "score": 35,
        "why": ""
      },
      "auScale": {
        "score": 20,
        "why": ""
      },
      "designerTrade": {
        "score": 10,
        "why": ""
      },
      "sourcing": {
        "score": 15,
        "why": ""
      },
      "operationalRisk": {
        "score": 30,
        "why": ""
      },
      "crossSell": {
        "score": 15,
        "why": ""
      }
    },
    "trendDirection": "New opportunity",
    "mainMarket": "AU",
    "priceBand": {},
    "demandSignal": {
      "level": "Weak",
      "type": "Proxy / Signal",
      "description": "Real market growth is in non-stone PVC/composite alternatives — undercuts the \"real stone\" pitch."
    },
    "competitors": [],
    "reviews": {
      "positiveThemes": [],
      "complaints": [],
      "purchaseMotivations": []
    },
    "trendSignals": [],
    "marketGap": {
      "description": "Real market growth is in non-stone PVC/composite alternatives — undercuts the \"real stone\" pitch.",
      "gapScore": 15
    },
    "economicsPotential": {
      "retailPriceRangeEstimate": "Not established",
      "aovBand": "Low",
      "paidAcquisitionSuitability": "Weak",
      "grossMarginPotentialCategory": "Estimate: Weak",
      "freightDifficulty": "High",
      "packagingDifficulty": "High",
      "damageRisk": "High",
      "crossSellPotential": "Low"
    },
    "operatingRisks": [
      "Real market growth is in non-stone PVC/composite alternatives — undercuts the \"real stone\" pitch."
    ],
    "designerTradeSignals": [],
    "auPotential": "Low",
    "nzPotential": "Low",
    "tradePotential": "Low",
    "sources": [
      {
        "url": "#",
        "title": "Sketch Australia, LUXWORLD Perth, Wet Wall Works"
      }
    ],
    "recommendedNextAction": "IGNORE",
    "firstSeen": "2026-09-02",
    "lastResearched": "2026-09-02",
    "history": [
      {
        "scanDate": "2026-09-02",
        "score": 21,
        "confidence": 60,
        "priceRange": {},
        "reviewCount": null,
        "note": "Initial research pass"
      }
    ],
    "promotedToProductLab": false
  },
  {
    "id": "radar_042",
    "product": "Marble Switch Plates & Outlet Covers",
    "variant": "",
    "category": "Architectural",
    "tier": "Kill",
    "opportunityScore": 19,
    "confidenceScore": 60,
    "scoreBreakdown": {
      "demandEvidence": {
        "score": 20,
        "why": "Too low-value/off-brand for a premium furniture label."
      },
      "contributionProfit": {
        "score": 5,
        "why": ""
      },
      "aovCac": {
        "score": 5,
        "why": ""
      },
      "differentiation": {
        "score": 10,
        "why": ""
      },
      "adContent": {
        "score": 20,
        "why": ""
      },
      "auScale": {
        "score": 15,
        "why": ""
      },
      "designerTrade": {
        "score": 5,
        "why": ""
      },
      "sourcing": {
        "score": 75,
        "why": ""
      },
      "operationalRisk": {
        "score": 90,
        "why": ""
      },
      "crossSell": {
        "score": 10,
        "why": ""
      }
    },
    "trendDirection": "New opportunity",
    "mainMarket": "US",
    "priceBand": {
      "low": 12.99,
      "high": 35,
      "currency": "$"
    },
    "demandSignal": {
      "level": "Weak",
      "type": "Proxy / Signal",
      "description": "Too low-value/off-brand for a premium furniture label."
    },
    "competitors": [],
    "reviews": {
      "positiveThemes": [],
      "complaints": [],
      "purchaseMotivations": []
    },
    "trendSignals": [],
    "marketGap": {
      "description": "Too low-value/off-brand for a premium furniture label.",
      "gapScore": 10
    },
    "economicsPotential": {
      "retailPriceRangeEstimate": "$12.99-35",
      "aovBand": "Low",
      "paidAcquisitionSuitability": "Weak",
      "grossMarginPotentialCategory": "Estimate: Weak",
      "freightDifficulty": "Low",
      "packagingDifficulty": "Moderate",
      "damageRisk": "Low",
      "crossSellPotential": "Low"
    },
    "operatingRisks": [],
    "designerTradeSignals": [],
    "auPotential": "Low",
    "nzPotential": "Low",
    "tradePotential": "Low",
    "sources": [
      {
        "url": "#",
        "title": "Switch Hits, Stone Wall Plates, Houzz"
      }
    ],
    "recommendedNextAction": "IGNORE",
    "firstSeen": "2026-09-02",
    "lastResearched": "2026-09-02",
    "history": [
      {
        "scanDate": "2026-09-02",
        "score": 19,
        "confidence": 60,
        "priceRange": {
          "low": 12.99,
          "high": 35,
          "currency": "$"
        },
        "reviewCount": null,
        "note": "Initial research pass"
      }
    ],
    "promotedToProductLab": false
  },
  {
    "id": "radar_043",
    "product": "Stone Fireplace Surround / Mantel",
    "variant": "",
    "category": "Architectural",
    "tier": "Kill",
    "opportunityScore": 36,
    "confidenceScore": 60,
    "scoreBreakdown": {
      "demandEvidence": {
        "score": 35,
        "why": "Structurally bespoke/quote-and-install — the opposite direction from the stated goal."
      },
      "contributionProfit": {
        "score": 50,
        "why": ""
      },
      "aovCac": {
        "score": 60,
        "why": ""
      },
      "differentiation": {
        "score": 40,
        "why": ""
      },
      "adContent": {
        "score": 55,
        "why": ""
      },
      "auScale": {
        "score": 25,
        "why": ""
      },
      "designerTrade": {
        "score": 15,
        "why": ""
      },
      "sourcing": {
        "score": 10,
        "why": ""
      },
      "operationalRisk": {
        "score": 15,
        "why": ""
      },
      "crossSell": {
        "score": 10,
        "why": ""
      }
    },
    "trendDirection": "New opportunity",
    "mainMarket": "AU",
    "priceBand": {},
    "demandSignal": {
      "level": "Weak",
      "type": "Proxy / Signal",
      "description": "Structurally bespoke/quote-and-install — the opposite direction from the stated goal."
    },
    "competitors": [],
    "reviews": {
      "positiveThemes": [],
      "complaints": [],
      "purchaseMotivations": []
    },
    "trendSignals": [],
    "marketGap": {
      "description": "Structurally bespoke/quote-and-install — the opposite direction from the stated goal.",
      "gapScore": 40
    },
    "economicsPotential": {
      "retailPriceRangeEstimate": "Not established",
      "aovBand": "High",
      "paidAcquisitionSuitability": "Moderate-Good",
      "grossMarginPotentialCategory": "Estimate: Weak",
      "freightDifficulty": "High",
      "packagingDifficulty": "High",
      "damageRisk": "High",
      "crossSellPotential": "Low"
    },
    "operatingRisks": [
      "Structurally bespoke/quote-and-install — the opposite direction from the stated goal."
    ],
    "designerTradeSignals": [],
    "auPotential": "Low",
    "nzPotential": "Low",
    "tradePotential": "Low",
    "sources": [
      {
        "url": "#",
        "title": "Elsa Home and Beauty AU, Avant Stone AU"
      }
    ],
    "recommendedNextAction": "IGNORE",
    "firstSeen": "2026-09-02",
    "lastResearched": "2026-09-02",
    "history": [
      {
        "scanDate": "2026-09-02",
        "score": 36,
        "confidence": 60,
        "priceRange": {},
        "reviewCount": null,
        "note": "Initial research pass"
      }
    ],
    "promotedToProductLab": false
  }
];
