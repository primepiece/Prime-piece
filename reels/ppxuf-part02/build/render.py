"""Frame renderer for the Prime Piece x Ugly Face reel.

Reads src.mp4 (real footage only - no generated imagery), cuts it per edl.py,
upscales to 1080x1920, applies a light natural grade, overlays subtitles and
editorial labels, and builds the animated end card from the supplied graphic
(original logo/title pixels; the static title is masked out on a clean plate).

Usage: python3 render.py [--frames a:b] [--stills f1,f2,...] [--out path.mp4]
"""
import os, sys, subprocess, argparse
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont, ImageFilter
sys.path.insert(0, os.path.dirname(__file__))
import edl

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
W, H, FPS = edl.W, edl.H, edl.FPS
INTER = "/usr/share/fonts/truetype/inter"

def find_font(name):
    out = subprocess.run(["fc-match", "-f", "%{file}", name], capture_output=True, text=True).stdout
    return out

F_SUB = find_font("Inter:style=SemiBold")
F_LABEL = os.path.join(ROOT, "fonts", "Lora.ttf")
ACCENT = (217, 164, 110)

def smooth(x):
    x = np.clip(x, 0.0, 1.0); return x * x * (3 - 2 * x)
def ease_out(x):
    x = np.clip(x, 0.0, 1.0); return 1 - (1 - x) ** 3

# ------------------------------------------------------------------ source
def load_source():
    src = os.path.join(ROOT, "src.mp4")
    w, h = 512, 910
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3)

def lut(contrast=1.0, lift=0.0, gamma=1.0, shoulder=0.0):
    x = np.arange(256) / 255.0
    y = x ** gamma
    y = 0.5 + (y - 0.5) * contrast + lift
    if shoulder:  # soft highlight roll-off for the blown car windows
        k = 0.78
        y = np.where(y > k, k + (1 - k) * np.tanh((y - k) / (1 - k) * (1 + shoulder)) / np.tanh(1 + shoulder), y)
    return np.clip(y * 255, 0, 255).astype(np.uint8)

GRADES = {
    "talk": lut(contrast=1.04, gamma=1.03, shoulder=0.8),
    "crate": lut(contrast=1.05, gamma=1.02, shoulder=0.5),
    "stone": lut(contrast=1.07, gamma=1.02),
}
def grade_for(label):
    if label.startswith("talk") or label.startswith("hand"): return GRADES["talk"]
    if label == "crate": return GRADES["crate"]
    return GRADES["stone"]

_grain = np.random.default_rng(11).normal(0, 1, (8, H, W)).astype(np.float32)

def footage_frame(frames, f):
    for o0, o1, s0, s1, label in edl.VIDEO:
        if o0 <= f < o1: break
    if s0 is None:
        return np.zeros((H, W, 3), np.float32), label
    t = s0 + (f - o0) / (o1 - o0) * (s1 - s0)
    fi = t * 30.0
    i0 = int(np.floor(fi)); a = fi - i0
    i0 = min(max(i0, 0), len(frames) - 1); i1 = min(i0 + 1, len(frames) - 1)
    speed = (s1 - s0) / ((o1 - o0) / FPS)
    if speed < 0.99 and a > 0.05:     # frame-blend for gentle slow motion
        img = frames[i0].astype(np.float32) * (1 - a) + frames[i1].astype(np.float32) * a
        img = img.astype(np.uint8)
    else:
        img = frames[min(int(round(fi)), len(frames) - 1)]
    img = cv2.LUT(img, grade_for(label))
    up = cv2.resize(img, (W, H), interpolation=cv2.INTER_LANCZOS4).astype(np.float32)
    blur = cv2.GaussianBlur(up, (0, 0), 1.6)
    up = up + 0.55 * (up - blur)                      # restore micro-contrast after 2.1x upscale
    up += _grain[f % 8][..., None] * 2.2              # fine grain to unify the upscale
    return up, label

# ------------------------------------------------------------------ text
def render_sub(parts, size=58):
    font = ImageFont.truetype(F_SUB, size)
    total = sum(font.getlength(t) for t, _ in parts)
    pad = 40
    img = Image.new("RGBA", (int(total) + pad * 2, size + pad * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    x = pad
    for t, acc in parts:
        d.text((x, pad), t, font=font, fill=(*ACCENT, 255) if acc else (255, 255, 255, 255))
        x += font.getlength(t)
    a = np.array(img).astype(np.float32)
    alpha = a[..., 3]
    sh1 = cv2.GaussianBlur(alpha, (0, 0), 9) * 0.55
    sh2 = cv2.GaussianBlur(np.roll(alpha, 2, 0), (0, 0), 1.5) * 0.45
    sh = np.clip(np.maximum(sh1, sh2), 0, 255)
    rgb = a[..., :3] * (alpha[..., None] / 255.0)
    out_a = alpha + sh * (1 - alpha / 255.0)
    out_rgb = rgb  # shadow is black
    return out_rgb, out_a / 255.0

def render_label(num, text):
    f_num = ImageFont.truetype(F_LABEL, 30)
    f_txt = ImageFont.truetype(F_LABEL, 34)
    track = 9
    def tracked_w(s, f): return sum(f.getlength(c) + track for c in s) - track
    wn, wt = tracked_w(num, f_num), tracked_w(text, f_txt)
    gap, rule = 22, 56
    w = int(wn + gap + rule + gap + wt) + 60
    img = Image.new("RGBA", (w, 110), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    x = 30
    for c in num:
        d.text((x, 36), c, font=f_num, fill=(255, 255, 255, 235)); x += f_num.getlength(c) + track
    x += gap - track
    d.line([(x, 58), (x + rule, 58)], fill=(255, 255, 255, 200), width=2); x += rule + gap
    for c in text:
        d.text((x, 33), c, font=f_txt, fill=(255, 255, 255, 255)); x += f_txt.getlength(c) + track
    a = np.array(img).astype(np.float32); alpha = a[..., 3]
    sh = cv2.GaussianBlur(alpha, (0, 0), 7) * 0.5
    out_a = alpha + sh * (1 - alpha / 255.0)
    return a[..., :3] * (alpha[..., None] / 255.0), out_a / 255.0

def over(frame, rgb, a, x, y, opacity=1.0, wipe=1.0):
    h, w = a.shape
    x0, y0 = max(x, 0), max(y, 0); x1, y1 = min(x + w, W), min(y + h, H)
    if x1 <= x0 or y1 <= y0: return
    sa = a[y0 - y:y1 - y, x0 - x:x1 - x] * opacity
    if wipe < 1.0:
        cols = np.arange(x1 - x0) / max(w, 1)
        sa = sa * smooth((wipe * 1.15 - cols) / 0.15)[None, :]
    sr = rgb[y0 - y:y1 - y, x0 - x:x1 - x] * opacity
    if wipe < 1.0: sr = sr * smooth((wipe * 1.15 - np.arange(x1 - x0) / max(w, 1)) / 0.15)[None, :, None]
    region = frame[y0:y1, x0:x1]
    region *= (1 - sa[..., None]); region += sr

SUB_IMGS = [render_sub(p) for _, _, p in edl.SUBS]
LABEL_IMGS = [render_label(n, t) for _, _, n, t in edl.LABELS]
SUB_Y = 1300

def overlay_text(frame, f):
    t = f / FPS
    for (t0, t1, _), (rgb, a) in zip(edl.SUBS, SUB_IMGS):
        if t0 - 0.01 <= t < t1:
            k_in = ease_out((t - t0) / 0.16); k_out = smooth((t1 - t) / 0.08)
            dy = int(round((1 - k_in) * 14))
            over(frame, rgb, a, (W - a.shape[1]) // 2, SUB_Y + dy, opacity=k_in * k_out)
    for (f0, f1, _, _), (rgb, a) in zip(edl.LABELS, LABEL_IMGS):
        if f0 <= f < f1:
            wipe = ease_out((f - f0) / 10); op = smooth((f1 - f) / 6)
            frame *= 1 - (SCRIM * smooth((f - f0) / 6) * op)[:, None, None]
            over(frame, rgb, a, 44, 1430, opacity=op, wipe=wipe)

# soft editorial scrim behind the lower-left labels (keeps white serif legible on pale marble)
SCRIM = 0.42 * smooth((np.arange(H) - 1180) / 520.0) * (1 - 0.6 * smooth((np.arange(H) - 1700) / 220.0))

# ------------------------------------------------------------------ end card
class EndCard:
    def __init__(self):
        b = os.path.join(HERE)
        orig = cv2.cvtColor(cv2.imread(os.path.join(b, "card_orig.png")), cv2.COLOR_BGR2RGB)
        clean = cv2.cvtColor(cv2.imread(os.path.join(b, "card_clean.png")), cv2.COLOR_BGR2RGB)
        m = np.load(os.path.join(b, "card_masks.npz"))
        sx = W / orig.shape[1]
        up = lambda im: cv2.resize(im, (W, H), interpolation=cv2.INTER_LANCZOS4).astype(np.float32)
        upm = lambda mk, feather=1.4: cv2.GaussianBlur(
            cv2.resize(mk.astype(np.float32), (W, H), interpolation=cv2.INTER_LINEAR), (0, 0), feather)
        self.orig, self.clean = up(orig), up(clean)
        self.m_pp, self.m_x, self.m_uf = upm(m["logo_pp"]), upm(m["logo_x"]), upm(m["logo_uf"])
        self.m_rule, self.m_soon = upm(m["rule"]), upm(m["soon"])
        title = upm(m["title"])
        # glyph column groups measured on the native graphic (16 glyphs)
        groups = [(190, 208), (216, 238), (248, 268), (277, 297), (328, 345), (357, 372), (404, 437),
                  (468, 488), (499, 521), (533, 552), (582, 602), (612, 631), (640, 662), (673, 691),
                  (701, 722), (733, 751)]
        xs = np.arange(W) / sx
        self.glyphs = []
        for a, bnd in groups:
            col = smooth((xs - (a - 5)) / 2.0) * smooth(((bnd + 5) - xs) / 2.0)
            self.glyphs.append(title * col[None, :])
        self.gframes = edl.glyph_frames()
        union = np.clip(self.m_pp + self.m_x + self.m_uf + self.m_rule + self.m_soon + title, 0, 1)
        diff = np.abs(self.orig - self.clean).mean(2)
        core = (diff > 14).astype(np.float32) * union
        self.core = cv2.GaussianBlur(core, (0, 0), 2.0)
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        ang = np.deg2rad(32)
        self.axis = (xx * np.cos(ang) + yy * np.sin(ang)) / (W * np.cos(ang) + H * np.sin(ang))
        self.lum = (self.clean.mean(2) / 255.0)
        rcx = (232 + 712) / 2 * sx
        self.rule_dist = np.abs(np.arange(W) - rcx) / ((712 - 232) / 2 * sx)

    def frame(self, f):
        lf = f - edl.CARD
        t = lf / FPS
        # logos fade in (original pixels; no redraw)
        a_pp = smooth((lf - 8) / 30); a_x = smooth((lf - 16) / 27); a_uf = smooth((lf - 25) / 30)
        A = self.m_pp * a_pp + self.m_x * a_x + self.m_uf * a_uf
        for g, gf in zip(self.glyphs, self.gframes):
            A = A + g * np.clip((f - gf + 1) / 2.0, 0, 1)   # crisp 2-frame type-on
        rw = ease_out((f - edl.TITLE_DONE) / 12)
        if rw > 0:
            A = A + self.m_rule * smooth((rw - self.rule_dist) / 0.08)[None, :]
        A = A + self.m_soon * smooth((f - edl.TITLE_DONE - 5) / 14)
        A = np.clip(A, 0, 1)[..., None]
        img = self.clean * (1 - A) + self.orig * A
        # cinematic light: a soft warm band drifting across the marble
        p = -0.35 + 1.7 * (t / 6.3)
        band = np.exp(-((self.axis - p) / 0.16) ** 2)
        band2 = 0.5 * np.exp(-((self.axis - (p - 0.75)) / 0.3) ** 2)
        hit = 0.12 * np.exp(-max(f - edl.TITLE_DONE, 0) / 7.0) if f >= edl.TITLE_DONE else 0.0
        light = (band + band2) * (0.55 + 1.6 * self.lum) * 0.34 + hit
        light *= (1 - self.core)
        warm = np.array([1.0, 0.94, 0.84], np.float32)
        img = img * (1 + light[..., None] * warm) + (band * 7.0 * (1 - self.core))[..., None] * warm
        # open from black, fade to black at the end
        k = smooth(lf / 15) * (1 - smooth((f - edl.FADE0) / (edl.FADE1 - edl.FADE0)))
        return img * k

# ------------------------------------------------------------------ main
def render_frame(frames, card, f):
    if f >= edl.CARD:
        return card.frame(f)
    img, label = footage_frame(frames, f)
    # build-up: engraving shot sinks into black before the reveal
    if edl.ENGRAVE <= f < edl.BREAK:
        k = 1 - 0.85 * smooth((f - (edl.BREAK - 16)) / 16)
        img *= k
    overlay_text(img, f)
    return img

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--frames", default=f"0:{edl.TOTAL}")
    ap.add_argument("--stills", default="")
    ap.add_argument("--out", default=os.path.join(HERE, "out", "video_only.mp4"))
    args = ap.parse_args()
    frames = load_source()
    card = EndCard()
    if args.stills:
        for f in map(int, args.stills.split(",")):
            img = np.clip(render_frame(frames, card, f), 0, 255).astype(np.uint8)
            cv2.imwrite(os.path.join(HERE, "out", f"still_{f:03d}.png"), cv2.cvtColor(img, cv2.COLOR_RGB2BGR))
        return
    a, b = map(int, args.frames.split(":"))
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
                            "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                            "-c:v", "libx264", "-preset", "slow", "-crf", "12", "-pix_fmt", "yuv420p",
                            "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
                            args.out], stdin=subprocess.PIPE)
    for f in range(a, b):
        img = np.clip(render_frame(frames, card, f) + 0.5, 0, 255).astype(np.uint8)
        enc.stdin.write(img.tobytes())
        if f % 60 == 0: print("frame", f, flush=True)
    enc.stdin.close(); enc.wait()

if __name__ == "__main__":
    main()
