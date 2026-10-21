import os
import numpy as np, cv2
HERE = os.path.dirname(os.path.abspath(__file__))
out = lambda n: os.path.join(HERE, n)
im = cv2.imread(os.path.join(HERE, '..', 'collab-graphic-supplied.webp'))
L = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32)
H, W = L.shape
bg = cv2.medianBlur(L.astype(np.uint8), 41).astype(np.float32)
hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)

def region(y0, y1, x0, x1):
    r = np.zeros_like(L, bool); r[y0:y1, x0:x1] = True; return r

def big(m, amin):
    n, lab, st, _ = cv2.connectedComponentsWithStats(m.astype(np.uint8), 8)
    keep = np.zeros(n, bool); keep[1:] = st[1:, cv2.CC_STAT_AREA] >= amin
    return keep[lab]

# text block (title, rule, coming soon)
txt = big(((L - bg) > 22) & region(972, 1100, 180, 770), 12)
title = txt & region(972, 1014, 150, 800)
rule = ((L - bg) > 6) & region(1026, 1054, 270, 685)
soon = txt & region(1066, 1100, 305, 640)
# logos: bright strokes + saturated bag, plus dark outlines next to them
logo_zone = region(660, 935, 90, 870)
bright = ((L - bg) > 20) | ((hsv[..., 1] > 60) & (hsv[..., 2] > 60))
logo = bright & logo_zone
logo = cv2.morphologyEx(logo.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8)) > 0
# fill bag interior holes
ff = logo.astype(np.uint8).copy(); cnts, _ = cv2.findContours(ff, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
logo_f = np.zeros_like(ff); cv2.drawContours(logo_f, [c for c in cnts if cv2.contourArea(c) > 2000], -1, 1, -1)
logo = (logo | (logo_f > 0)) & logo_zone
boxes = {'pp': (760, 875, 105, 425), 'x': (662, 928, 448, 508), 'uf': (676, 885, 552, 842)}
def big(m, amin):
    n, lab, st, _ = cv2.connectedComponentsWithStats(m.astype(np.uint8), 8)
    keep = np.zeros(n, bool); keep[1:] = st[1:, cv2.CC_STAT_AREA] >= amin
    return keep[lab]
logo_parts = {n: big(logo & region(*b), 400) for n, b in boxes.items() if n != 'x'}
xcol = ((L - bg) > 10) & (region(662, 928, 470, 486) | region(768, 812, 455, 502))
logo_parts['x'] = xcol
logo = logo_parts['pp'] | logo_parts['x'] | logo_parts['uf']

k = lambda n: np.ones((n, n), np.uint8)
dil = lambda m, n: cv2.dilate(m.astype(np.uint8), k(n)) > 0
inpaint_mask = dil(title, 7) | dil(soon, 7) | dil(rule, 9) | dil(logo, 11)
clean = cv2.inpaint(im, inpaint_mask.astype(np.uint8) * 255, 9, cv2.INPAINT_TELEA)
# re-grain the inpainted area so it doesn't look smudged
rng = np.random.default_rng(3)
noise = rng.normal(0, 2.2, clean.shape).astype(np.float32)
soft = cv2.GaussianBlur(inpaint_mask.astype(np.float32), (0, 0), 3)[..., None]
clean = np.clip(clean.astype(np.float32) + noise * soft, 0, 255).astype(np.uint8)

np.savez_compressed(out('card_masks.npz'), title=dil(title, 5), rule=dil(rule, 5), soon=dil(soon, 5),
                    logo=dil(logo, 9), inpaint=inpaint_mask,
                    **{'logo_' + n: dil(m, 9) for n, m in logo_parts.items()})
cv2.imwrite(out('card_orig.png'), im); cv2.imwrite(out('card_clean.png'), clean)
vis = im.copy(); vis[inpaint_mask] = (0.5 * vis[inpaint_mask] + [0, 0, 120]).astype(np.uint8)
cv2.imwrite(out('card_maskvis.png'), np.hstack([vis, clean])[560:1200])
