# Printed gift voucher files

These are the print files for the +$25 printed gift card offered at checkout. Send `PRINT-SPEC.pdf` and the five PDFs in `out/` to printers for quotes.

| File | What it is | Size (with 3 mm bleed) |
|---|---|---|
| `out/card-front-100.pdf`, `-200`, `-500` | Card fronts: the supplied voucher artwork at 300 dpi | 156 × 96 mm (trims to 150 × 90) |
| `out/card-back.pdf` | Shared back: logo, "Choose your one of one.", how to spend it, lines for a note | 156 × 96 mm |
| `out/envelope-band.pdf` | Band that wraps a C6 envelope, reading "A gift, one of one" | 351 × 46 mm (trims to 345 × 40) |
| `PRINT-SPEC.pdf` | One-page quote request: sizes, stock, quantities and timing | A4 |

`*_preview.png` files are only for looking at the designs. Don't print from them.

## The one change to the artwork

The card fronts are the supplied artwork with one change: the two placeholders, "PP-XXXX-XXXX" in the dashed code box and "3 years from purchase" under Valid until, are cleared to the flat background. That's because each card's real code and date are written by hand. Nothing else is touched. The 3 mm bleed is made by mirroring the edges and is trimmed off.

## Filling in a card

When a printed card is ordered, James gets an email with the steps:

1. Write the code, the valid-until date and To / From on the front. Use a white gel pen on the dark $500 card.
2. Write the message on the back.
3. Seal the card in the envelope, add the band, then post it or hold it for pickup.

## Rebuilding

```
python3 fronts.py   # fronts from ../social/assets/voucher-*.webp
node build.cjs      # every src/*.html to out/*.pdf + preview
node spec.cjs       # PRINT-SPEC.pdf
```

The fonts are the brand TTFs in `../02-Fonts`, embedded in the PDFs.

The fronts are scaled up from the 1400 × 840 artwork. If you have the original design file at a higher resolution, swap it in for sharper small text.

The logo is a 560 px PNG, which is enough at 40 mm wide on the back. A vector logo would be better.
