# Builds the clean plate + feathered mask used to remove Runway's burned-in hook line (see README, "The presenter footage").
# Build a clean background plate for the hook region and a feathered mask.
import glob, sys
import numpy as np
from PIL import Image, ImageFilter
S = sys.argv[1]
OFF = 60  # crop offset used when dumping frames
frames = np.stack([np.asarray(Image.open(p).convert('RGB')) for p in sorted(glob.glob(S + '/pl/*.png'))])
plate = np.median(frames, axis=0).astype(np.uint8)          # 260x720 region, rows 60..320 of source
full = np.zeros((1280, 720, 4), np.uint8)
full[OFF:OFF + 260, :, :3] = plate
# Mask: hook text box plus its outline, staying clear of the top of her head (x>=420, y>216).
m = np.zeros((1280, 720), np.uint8)
m[106:232, 132:425] = 255
m[106:219, 425:592] = 255
mask = Image.fromarray(m).filter(ImageFilter.GaussianBlur(3))
full[:, :, 3] = np.asarray(mask)
Image.fromarray(full, 'RGBA').save(S + '/hook-plate.png')
# Head-intrusion check: does anything in the live frames differ from the plate inside the mask, apart from the text?
live = np.stack([np.asarray(Image.open(p).convert('RGB')) for p in sorted(glob.glob(S + '/a0/*.png'))]).astype(int)
band = (slice(217 - OFF, 232 - OFF), slice(420, 585))  # just below the mask edge, where hair would appear
d = np.abs(live[:, band[0], band[1]] - plate[band[0], band[1]].astype(int)).mean(axis=(1, 2, 3))
print('diff just under mask edge per frame (min/max):', round(d.min(), 1), round(d.max(), 1))
inside = (slice(205 - OFF, 216 - OFF), slice(560, 585))  # inside mask, right of the text
d2 = np.abs(live[:, inside[0], inside[1]] - plate[inside[0], inside[1]].astype(int)).mean(axis=(1, 2, 3))
print('diff inside mask beside text (min/max):', round(d2.min(), 1), round(d2.max(), 1))
