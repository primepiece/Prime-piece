# Gift voucher social designs

Every design is HTML in `src/` using the brand's own font files, rendered to `out/` at its exact size. Open
`out/_all-designs-contact-sheet.jpg` to see them all at once.

| File | Format | Use it |
|---|---|---|
| `01-their-taste.png` | IG post 1080×1440 | Launch week, any time |
| `carousel-1.png` … `carousel-4.png` | IG carousel, 4 slides | Launch week (Sat 7 Nov): "What will they choose?" |
| `11-poll-story.png` | IG Story | Launch week (Fri 6 Nov): add Instagram's poll sticker in the gap ("Blue" / "Burgundy") |
| `03-what-will-they-choose.png` | IG post | The single-image version of the carousel |
| `04-our-pick.png` | IG post | Launch week (Mon 9 Nov) and again in December |
| `10-real-stone.png` | IG post | Any time: why each voucher looks different |
| `05-specific-taste-pinterest.png` | Pinterest 1000×1500 | Pin to a "Gift ideas" board, linking to the gift vouchers page |
| `06-corporate-facebook.png` | Facebook / LinkedIn 1200×630 | Corporate outreach week (9–13 Nov), and in the corporate emails |
| `07-email-header.png` | Email header (1200×480, shows at 600×240) | Top of the launch email |
| `02-no-cut-off-story.png` | IG Story | Last-minute phase (16–24 Dec) |
| `08-forgot-someone-story.png` | IG Story | Last-minute phase (16–24 Dec) |
| `09-counter-flyer-a4.pdf` | A4 print | The showroom counter (`.png` is a preview) |

Stories: add a link sticker to primepiece.co.nz/gift-vouchers.html over the bottom third.

## Rebuilding

```
# PNG designs (from this folder)
PUPPETEER_CORE=<path to puppeteer-core> node render.cjs src/<file>.html
# print designs (the A4 flyer)
node render-pdf.cjs src/09-counter-flyer-a4.html
```

Shared fonts, colours and voucher styling live in `src/base.css`. The voucher artwork is used as supplied,
never cropped or recoloured.
