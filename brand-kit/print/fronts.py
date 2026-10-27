# Builds the print fronts from the supplied voucher artwork (brand-kit/social/assets/voucher-*.webp).
# The only change to the artwork is clearing the two placeholders James writes over by hand:
# "PP-XXXX-XXXX" inside the dashed code box and "3 years from purchase" under VALID UNTIL. Both sit
# on a flat background, so they're filled with that colour. Everything else is the artwork as
# supplied, scaled to 300 dpi at 150 x 90 mm, with a 3 mm bleed made by mirroring the edges
# (the bleed is trimmed off). Run: python3 fronts.py
from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np

HERE = Path(__file__).parent
SRC = HERE.parent / 'social' / 'assets'
DPI = 300
MM = DPI / 25.4
TRIM = (round(150 * MM), round(90 * MM))   # 1772 x 1063
BLEED = round(3 * MM)                      # 35 px

# Placeholder boxes in the 1400 x 840 artwork (measured; same on all three cards).
CLEAR = [(598, 567, 846, 601),   # PP-XXXX-XXXX
         (994, 571, 1213, 601)]  # 3 years from purchase

for value in (100, 200, 500):
    art = Image.open(SRC / f'voucher-{value}.webp').convert('RGB')
    assert art.size == (1400, 840)
    d = ImageDraw.Draw(art)
    for box in CLEAR:
        bg = art.getpixel((box[0] - 4, box[1] + 10)) if box[0] > 900 else art.getpixel((960, 585))
        d.rectangle(box, fill=bg)
    art = art.resize(TRIM, Image.LANCZOS)
    a = np.pad(np.asarray(art), ((BLEED, BLEED), (BLEED, BLEED), (0, 0)), mode='reflect')
    out = Image.fromarray(a)
    out.save(HERE / 'out' / f'card-front-{value}_300dpi_bleed.png', dpi=(DPI, DPI))
    print(value, out.size)
