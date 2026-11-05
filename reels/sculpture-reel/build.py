"""Prime Piece sculpture reel: 1080x1920, 30 fps, 5.0 s.

Four slow camera moves over the product photos, joined by soft dissolves,
ending on the Carrara plinth with the logo. Silent (add music in Instagram).

Run:  python3 build.py            -> renders/prime-piece-sculpture-reel.mp4
      python3 build.py --stills   -> renders/stills/*.png (check frames only)
"""
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
W, H, FPS = 1080, 1920, 30
ASPECT = W / H
XFADE = 9  # frames of dissolve between shots (0.3 s)


def ease(t, k=0.45):
    """Mostly linear with a soft ease, so motion never fully stops inside a dissolve."""
    s = t * t * (3 - 2 * t)
    return (1 - k) * t + k * s


def lerp(a, b, t):
    return a + (b - a) * t


# Each shot: source photo, length in frames, and the camera at start/end as
# (centre x, centre y, crop height) in source pixels. Crop width follows 9:16.
SHOTS = [
    # White plaster: tilt up from the plinth to the hands, easing in a touch.
    dict(src="sculpture-white.jpg", frames=40,
         a=(525, 900, 1120), b=(525, 600, 1060)),
    # Gold: slow lateral slide past the profile.
    dict(src="sculpture-gold.jpg", frames=40,
         a=(330, 560, 960), b=(430, 540, 940)),
    # Bronze pair: pull back to reveal both pieces.
    dict(src="sculpture-bronze-pair.jpg", frames=40,
         a=(560, 700, 1080), b=(560, 760, 1380)),
    # Empty Carrara plinth: gentle push-in, logo settles above it.
    dict(src="plinth-carrara.jpg", frames=57,
         a=(545, 760, 1448), b=(560, 800, 1300)),
]

LOGO_IN = (118, 140)  # frames over which the logo fades in (on the last shot)


def load_sources():
    out = {}
    for s in SHOTS:
        im = Image.open(HERE / "source" / s["src"]).convert("RGB")
        out[s["src"]] = im
    return out


def render_shot_frame(im, cam):
    cx, cy, ch = cam
    cw = ch * ASPECT
    # keep the crop inside the photo
    cw = min(cw, im.width)
    ch = cw / ASPECT
    x0 = min(max(cx - cw / 2, 0), im.width - cw)
    y0 = min(max(cy - ch / 2, 0), im.height - ch)
    sx = cw / W
    sy = ch / H
    # Affine maps output pixel -> source pixel; bicubic keeps sub-pixel motion smooth.
    return im.transform((W, H), Image.AFFINE, (sx, 0, x0, 0, sy, y0),
                        resample=Image.BICUBIC)


def build_timeline():
    """Returns per-frame list of [(shot_index, local_t, weight), ...]."""
    starts, t = [], 0
    for s in SHOTS:
        starts.append(t)
        t += s["frames"] - XFADE
    total = t + XFADE
    frames = []
    for f in range(total):
        layers = []
        for i, s in enumerate(SHOTS):
            lf = f - starts[i]
            if 0 <= lf < s["frames"]:
                w = 1.0
                if i > 0 and lf < XFADE:
                    w = (lf + 1) / (XFADE + 1)
                layers.append((i, lf / (s["frames"] - 1), w))
        frames.append(layers)
    return frames


def vignette_mask():
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    nx = (x - W / 2) / (W / 2)
    ny = (y - H / 2) / (H / 2)
    r = np.sqrt(nx * nx * 0.9 + ny * ny * 0.55)
    v = 1 - 0.16 * np.clip((r - 0.55) / 0.75, 0, 1) ** 1.6
    return v[..., None]


def load_logo():
    logo = Image.open(ROOT / "brand-kit/01-Logos/prime-piece-logo-charcoal.png").convert("RGBA")
    target_w = 400
    logo = logo.resize((target_w, round(logo.height * target_w / logo.width)), Image.LANCZOS)
    return logo


def main():
    stills = "--stills" in sys.argv
    srcs = load_sources()
    timeline = build_timeline()
    vig = vignette_mask()
    logo = load_logo()
    rng = np.random.default_rng(7)
    out_dir = HERE / "renders"
    out_dir.mkdir(exist_ok=True)

    if stills:
        (out_dir / "stills").mkdir(exist_ok=True)
        pick = {0, 20, 39, 45, 70, 100, 125, 149}
        ff = None
    else:
        out = out_dir / "prime-piece-sculpture-reel.mp4"
        ff = subprocess.Popen([
            "ffmpeg", "-y", "-loglevel", "error",
            "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
            "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-profile:v", "high",
            "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709",
            "-color_trc", "bt709", "-movflags", "+faststart", str(out)],
            stdin=subprocess.PIPE)

    for f, layers in enumerate(timeline):
        if stills and f not in pick:
            continue
        acc = None
        for i, t, w in layers:
            s = SHOTS[i]
            e = ease(t)
            cam = tuple(lerp(a, b, e) for a, b in zip(s["a"], s["b"]))
            fr = render_shot_frame(srcs[s["src"]], cam)
            fr = fr.filter(ImageFilter.UnsharpMask(radius=1.4, percent=45, threshold=2))
            arr = np.asarray(fr, dtype=np.float32)
            acc = arr if acc is None else acc * (1 - w) + arr * w

        # logo on the closing shot, drifting up a few pixels as it fades in
        if f >= LOGO_IN[0]:
            p = min(1.0, (f - LOGO_IN[0]) / (LOGO_IN[1] - LOGO_IN[0]))
            p = p * p * (3 - 2 * p)
            la = np.asarray(logo, dtype=np.float32)
            lh, lw = la.shape[:2]
            x = (W - lw) // 2
            y = int(round(300 + 14 * (1 - p)))
            alpha = la[..., 3:4] / 255.0 * p * 0.92
            region = acc[y:y + lh, x:x + lw]
            acc[y:y + lh, x:x + lw] = region * (1 - alpha) + la[..., :3] * alpha

        acc = acc * vig
        acc += rng.normal(0, 1.6, (H, W, 1)).astype(np.float32)  # fine luma grain
        frame = np.clip(acc, 0, 255).astype(np.uint8)

        if stills:
            Image.fromarray(frame).save(out_dir / "stills" / f"f{f:03d}.png")
        else:
            ff.stdin.write(frame.tobytes())

    if ff:
        ff.stdin.close()
        ff.wait()
        print("wrote", out, f"({len(timeline)} frames, {len(timeline) / FPS:.2f}s)")


if __name__ == "__main__":
    main()
