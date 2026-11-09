"""Prime Piece plinth clip: 1080x1920, 30 fps, 2.6 s, silent.

Opens on the Carrara plinth styled on the black vanity, pushes into the
marble face, and comes back out of the same stone in the workshop
(a push-through match cut). Zoom blur comes from averaging sub-frames
across a virtual shutter, so it follows the camera speed.

Run:  python3 build.py            -> renders/prime-piece-plinth-push.mp4
      python3 build.py --stills   -> renders/stills/*.png (check frames only)
"""
import math
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

HERE = Path(__file__).resolve().parent
W, H, FPS = 1080, 1920, 30
ASPECT = W / H
TOTAL = 78        # 2.6 s
CUT = 40          # first frame of the workshop shot
SUBFRAMES = 10    # motion-blur samples per frame
SHUTTER = 0.9     # fraction of a frame the shutter is open

# Camera = (centre x, centre y, crop height) in source pixels; width follows 9:16.
# A: vanity. Wide, then a slow drift that speeds up into the cube's right face.
A = dict(src="plinth-vanity.jpg", start=(600, 724, 1448), end=(750, 900, 220))
# B: workshop. Starts tight on the front face (below the tape), eases back out.
B = dict(src="plinth-workshop.jpg", start=(530, 830, 200), end=(530, 770, 1420))


def ease_in(t):
    # gentle drift for the first half, then accelerate hard into the stone
    return 0.18 * t + 0.82 * t ** 3.2


def ease_out(t):
    return 1 - (1 - t) ** 3.4


def camera(shot, s):
    """s in [0,1]: zoom is interpolated in log space so it reads as constant speed."""
    (x0, y0, h0), (x1, y1, h1) = shot["start"], shot["end"]
    h = math.exp(math.log(h0) + (math.log(h1) - math.log(h0)) * s)
    k = (math.log(h0) - math.log(h)) / (math.log(h0) - math.log(h1))
    return x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, h


def cam_at(f):
    """Camera for a (possibly fractional) frame time."""
    if f < CUT:
        t = min(max(f / (CUT - 1), 0), 1)
        return "A", camera(A, ease_in(t))
    t = min(max((f - CUT) / (TOTAL - 1 - CUT), 0), 1)
    return "B", camera(B, ease_out(t))


def crop(im, cam):
    cx, cy, ch = cam
    cw = min(ch * ASPECT, im.width)
    ch = cw / ASPECT
    x0 = min(max(cx - cw / 2, 0), im.width - cw)
    y0 = min(max(cy - ch / 2, 0), im.height - ch)
    return im.transform((W, H), Image.AFFINE, (cw / W, 0, x0, 0, ch / H, y0),
                        resample=Image.BICUBIC)


def vignette():
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    nx, ny = (x - W / 2) / (W / 2), (y - H / 2) / (H / 2)
    r = np.sqrt(nx * nx * 0.9 + ny * ny * 0.55)
    return (1 - 0.16 * np.clip((r - 0.55) / 0.75, 0, 1) ** 1.6)[..., None]


def main():
    stills = "--stills" in sys.argv
    srcs = {k: Image.open(HERE / "source" / s["src"]).convert("RGB") for k, s in (("A", A), ("B", B))}
    vig = vignette()
    rng = np.random.default_rng(11)
    out_dir = HERE / "renders"
    out_dir.mkdir(exist_ok=True)
    pick = {0, 15, 30, 36, 39, 40, 43, 50, 77}

    ff = None
    if stills:
        (out_dir / "stills").mkdir(exist_ok=True)
    else:
        out = out_dir / "prime-piece-plinth-push.mp4"
        ff = subprocess.Popen([
            "ffmpeg", "-y", "-loglevel", "error",
            "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
            "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-profile:v", "high",
            "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709",
            "-color_trc", "bt709", "-movflags", "+faststart", str(out)],
            stdin=subprocess.PIPE)

    for f in range(TOTAL):
        if stills and f not in pick:
            continue
        acc = np.zeros((H, W, 3), np.float32)
        for i in range(SUBFRAMES):
            # shutter centred on the frame; samples never straddle the cut
            ft = f + (i / (SUBFRAMES - 1) - 0.5) * SHUTTER
            ft = min(ft, CUT - 1) if f < CUT else max(ft, CUT)
            key, cam = cam_at(ft)
            acc += np.asarray(crop(srcs[key], cam), np.float32)
        acc /= SUBFRAMES

        # soften the hard cut: a 3-frame lift in exposure hides the stone swap
        flash = {38: 0.05, 39: 0.10, 40: 0.10, 41: 0.05}.get(f, 0)
        if flash:
            acc = acc + (255 - acc) * flash

        img = Image.fromarray(np.clip(acc, 0, 255).astype(np.uint8))
        img = img.filter(ImageFilter.UnsharpMask(radius=1.4, percent=40, threshold=2))
        arr = np.asarray(img, np.float32) * vig
        arr += rng.normal(0, 1.6, (H, W, 1)).astype(np.float32)
        frame = np.clip(arr, 0, 255).astype(np.uint8)

        if stills:
            Image.fromarray(frame).save(out_dir / "stills" / f"f{f:03d}.png")
        else:
            ff.stdin.write(frame.tobytes())

    if ff:
        ff.stdin.close()
        ff.wait()
        print("wrote", out, f"({TOTAL} frames, {TOTAL / FPS:.2f}s)")


if __name__ == "__main__":
    main()
