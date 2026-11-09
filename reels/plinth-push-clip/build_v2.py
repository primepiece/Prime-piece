"""v2: phone clip first (top-down push over the slabs), then a push-in on the
Carrara plinth on the black vanity. 1080x1920, 30 fps, ~2.7 s, silent.

Run:  python3 build_v2.py   -> renders/prime-piece-plinth-push-v2.mp4
"""
import subprocess
import numpy as np
from PIL import Image, ImageFilter
from build import HERE, W, H, FPS, camera, crop, vignette

CLIP_FRAMES = 40      # output frames of phone footage
CLIP_SPEED = 1.5      # source frames per output frame (2 s of footage -> 1.33 s)
STILL_FRAMES = 45
XF = 5                # crossfade frames
SUB = 8               # motion-blur samples on the still
SHOT = dict(start=(600, 724, 1448), end=(700, 860, 700))


def ease_out(t):
    return 1 - (1 - t) ** 2.6


def clip_frames():
    p = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(HERE / "source/slab-phone-clip.mp4"),
                        "-t", "2.1", "-vf", f"scale={W}:{H}:flags=lanczos", "-f", "rawvideo",
                        "-pix_fmt", "rgb24", "-"], capture_output=True, check=True)
    a = np.frombuffer(p.stdout, np.uint8).reshape(-1, H, W, 3)
    out = []
    for i in range(CLIP_FRAMES):
        s = i * CLIP_SPEED
        j = int(s); fr = s - j
        f0 = a[min(j, len(a) - 1)].astype(np.float32)
        f1 = a[min(j + 1, len(a) - 1)].astype(np.float32)
        img = Image.fromarray(((1 - fr) * f0 + fr * f1).astype(np.uint8))
        # slight digital push so the footage keeps moving into the cut
        z = 1 + 0.06 * i / (CLIP_FRAMES - 1)
        img = crop(img, (W / 2, H / 2, H / z))
        out.append(np.asarray(img.filter(ImageFilter.UnsharpMask(1.6, 60, 2)), np.float32))
    return out


def still_frames():
    im = Image.open(HERE / "source/plinth-vanity-2.webp").convert("RGB")
    out = []
    for f in range(STILL_FRAMES):
        acc = np.zeros((H, W, 3), np.float32)
        for k in range(SUB):
            t = min(max((f + (k / (SUB - 1) - 0.5) * 0.9) / (STILL_FRAMES - 1), 0), 1)
            acc += np.asarray(crop(im, camera(SHOT, ease_out(t))), np.float32)
        img = Image.fromarray((acc / SUB).astype(np.uint8))
        out.append(np.asarray(img.filter(ImageFilter.UnsharpMask(1.4, 40, 2)), np.float32))
    return out


def main():
    a, b = clip_frames(), still_frames()
    frames = a[:-XF]
    for i in range(XF):
        w = (i + 1) / (XF + 1)
        frames.append(a[len(a) - XF + i] * (1 - w) + b[i] * w)
    frames += b[XF:]
    vig, rng = vignette(), np.random.default_rng(5)
    out = HERE / "renders/prime-piece-plinth-push-v2.mp4"
    ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
                           "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "slow",
                           "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(out)],
                          stdin=subprocess.PIPE)
    for fr in frames:
        fr = fr * vig + rng.normal(0, 1.6, (H, W, 1)).astype(np.float32)
        ff.stdin.write(np.clip(fr, 0, 255).astype(np.uint8).tobytes())
    ff.stdin.close(); ff.wait()
    print("wrote", out, f"{len(frames)} frames, {len(frames) / FPS:.2f}s")


if __name__ == "__main__":
    main()
