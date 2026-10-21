"""Original score + SFX + dialogue mix for the reel (all synthesised here, so
no third-party licensing applies). 120 BPM, F minor, funky-house / hip-hop
hybrid: Rhodes (FM) chords, syncopated filtered bass, 4/4 kick, claps, hats.

Writes stems to build/out/: voice.wav, music.wav, sfx.wav, mix_premaster.wav
"""
import os, subprocess, sys
import numpy as np
from scipy import signal
sys.path.insert(0, os.path.dirname(__file__))
import edl

SR = 44100
T_TOTAL = edl.TOTAL / edl.FPS
N = int(T_TOTAL * SR) + SR
OUT = os.path.join(os.path.dirname(__file__), "out")
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)

BEAT_S = 0.5
T0 = edl.GRID0 / edl.FPS          # first downbeat
def bar_t(b): return T0 + b * 4 * BEAT_S
def step_t(b, s, swing=0.54):
    # 16th steps with light swing on the off-16ths
    base = bar_t(b) + (s // 2) * BEAT_S / 2
    return base + (swing * BEAT_S / 2 if s % 2 else 0)

def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)
def S(t): return int(round(t * SR))

def stereo(): return np.zeros((N, 2), np.float32)

def add(buf, x, t, gain=1.0, pan=0.0):
    i = S(t)
    if i >= N: return
    if x.ndim == 1:
        l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        x = np.stack([x * l * 1.414, x * r * 1.414], 1)
    n = min(len(x), N - i)
    if i < 0:
        x = x[-i:]; n = min(len(x), N); i = 0
    buf[i:i + n] += (x[:n] * gain).astype(np.float32)

def env_ad(n, a, d):
    t = np.arange(n) / SR
    e = np.minimum(t / max(a, 1e-4), 1.0) * np.exp(-np.maximum(t - a, 0) / d)
    return e

def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, hi], 'band', fs=SR, output='sos'); return signal.sosfilt(sos, x)
def hp(x, f, order=2):
    sos = signal.butter(order, f, 'high', fs=SR, output='sos'); return signal.sosfilt(sos, x)
def lp(x, f, order=2):
    sos = signal.butter(order, f, 'low', fs=SR, output='sos'); return signal.sosfilt(sos, x)

def reverb_ir(seconds=1.6, decay=0.45, seed=1):
    r = np.random.default_rng(seed)
    n = int(seconds * SR); t = np.arange(n) / SR
    ir = np.stack([r.standard_normal(n), r.standard_normal(n)], 1) * np.exp(-t / decay)[:, None]
    ir = lp(ir.T, 7000).T * 0.03
    ir[:int(0.012 * SR)] = 0  # pre-delay
    return ir

def reverb(x, wet=0.25, **kw):
    ir = reverb_ir(**kw)
    y = np.stack([signal.fftconvolve(x[:, c], ir[:, c])[:len(x)] for c in range(2)], 1)
    return x + wet * y.astype(np.float32)

# ---------------------------------------------------------------- instruments
def kick(level=1.0):
    n = int(0.5 * SR); t = np.arange(n) / SR
    f = 46 + 120 * np.exp(-t * 32)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6.5)
    click = hp(rng.standard_normal(n) * np.exp(-t * 400), 2500) * 0.25
    return np.tanh(1.6 * (body + click)) * level

def clap():
    n = int(0.35 * SR); t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    e = np.zeros(n)
    for d in (0.0, 0.009, 0.018):
        e += (t >= d) * np.exp(-np.maximum(t - d, 0) * 180)
    e += (t >= 0.026) * np.exp(-np.maximum(t - 0.026, 0) * 16) * 0.5
    return bp(noise * e, 900, 3200) * 0.9

def hat(open_=False):
    n = int((0.25 if open_ else 0.06) * SR); t = np.arange(n) / SR
    x = hp(rng.standard_normal(n), 7500, 3) * np.exp(-t * (14 if open_ else 70))
    return x * (0.32 if open_ else 0.22)

def shaker():
    n = int(0.08 * SR); t = np.arange(n) / SR
    return bp(rng.standard_normal(n), 5000, 11000) * env_ad(n, 0.012, 0.025) * 0.12

def rhodes(midi, dur, vel=1.0, bright=1.0):
    f = mtof(midi); n = int((dur + 0.6) * SR); t = np.arange(n) / SR
    idx = (1.6 * bright) * np.exp(-t * 6) + 0.25
    car = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * t))
    tine = np.sin(2 * np.pi * f * 7.0 * t) * np.exp(-t * 30) * 0.08 * bright
    rel = np.clip(1 - (t - dur) / 0.25, 0, 1) if dur > 0 else 1
    e = np.minimum(t / 0.003, 1) * np.exp(-t * 1.6) * rel
    trem = 1 + 0.12 * np.sin(2 * np.pi * 4.5 * t)
    return (car + tine) * e * trem * vel * 0.16

def bass_note(midi, dur, vel=1.0, cutoff=1600):
    f0 = mtof(midi); n = int((dur + 0.05) * SR); t = np.arange(n) / SR
    fc = 260 + cutoff * np.exp(-t * 14)
    y = np.zeros(n)
    for k in range(1, 40):
        if k * f0 > 5000: break
        y += np.sin(2 * np.pi * k * f0 * t) / k / (1 + (k * f0 / fc) ** 4)
    sub = np.sin(2 * np.pi * f0 * t) * 0.6
    e = np.minimum(t / 0.004, 1) * np.clip(1 - (t - dur) / 0.03, 0, 1) * (0.75 + 0.25 * np.exp(-t * 8))
    return np.tanh(1.8 * (y + sub) * e) * vel * 0.42

def pad(midis, dur, cutoff=900, att=0.6):
    n = int((dur + 1.0) * SR); t = np.arange(n) / SR
    y = np.zeros((n, 2))
    for m in midis:
        for det, ch in ((-0.09, 0), (0.09, 1), (0.0, 0), (0.0, 1)):
            f = mtof(m + det)
            ph = rng.uniform(0, 2 * np.pi)
            for k in range(1, 12):
                if k * f > cutoff * 3: break
                y[:, ch] += np.sin(2 * np.pi * k * f * t + ph * k) / k / (1 + (k * f / cutoff) ** 2)
    e = np.minimum(t / att, 1) * np.clip(1 - (t - dur) / 0.9, 0, 1)
    return (y * e[:, None] * 0.035).astype(np.float32)

def impact(level=1.0, freq=43.65, decay=0.9):
    n = int(2.4 * SR); t = np.arange(n) / SR
    f = freq + freq * 1.6 * np.exp(-t * 18)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / decay)
    boom = np.tanh(2.2 * boom)  # harmonics so phones can hear it
    crash = hp(rng.standard_normal(n), 3000) * np.exp(-t * 3.2) * 0.12
    thump = lp(rng.standard_normal(n), 180) * np.exp(-t * 22) * 0.9
    return (boom * 0.85 + crash + thump) * level

def riser(dur, f0=300, f1=6000, level=0.35):
    n = int(dur * SR); t = np.arange(n) / SR
    x = rng.standard_normal(n)
    out = np.zeros(n); blk = 1024
    for i in range(0, n, blk):
        fr = f0 * (f1 / f0) ** (i / n)
        seg = x[max(0, i - 2048):i + blk]
        y = bp(seg, fr * 0.7, min(fr * 1.4, 18000))
        out[i:i + blk] = y[-len(x[i:i + blk]):]
    e = (t / dur) ** 2.2
    return out * e * level

def whoosh(dur=0.45, level=0.25, up=True):
    n = int(dur * SR); t = np.arange(n) / SR
    x = rng.standard_normal(n); out = np.zeros(n); blk = 512
    for i in range(0, n, blk):
        p = i / n if up else 1 - i / n
        fr = 400 * (12 ** p)
        seg = x[max(0, i - 2048):i + blk]
        out[i:i + blk] = bp(seg, fr * 0.6, min(fr * 1.8, 18000))[-len(x[i:i + blk]):]
    e = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    return out * e * level

def type_click(var=0):
    r = np.random.default_rng(100 + var)
    n = int(0.09 * SR); t = np.arange(n) / SR
    tick = bp(r.standard_normal(n), 2800, 7500) * np.exp(-t * 420) * 0.9
    body = np.sin(2 * np.pi * (1750 + r.uniform(-120, 120)) * t) * np.exp(-t * 160) * 0.18
    thock = np.sin(2 * np.pi * (210 + r.uniform(-15, 15)) * t) * np.exp(-t * 60) * 0.22
    return (tick + body + thock) * r.uniform(0.85, 1.0)

def shimmer(dur=1.2, level=0.06):
    # reverse-reverb style air swell for logo fade-ins
    n = int(dur * SR); t = np.arange(n) / SR
    x = hp(rng.standard_normal(n), 5000) * (t / dur) ** 3
    return x * level

# ---------------------------------------------------------------- arrangement
CH = {  # voicings
    'Fm9':  [53, 56, 60, 63, 67],
    'Db9':  [49, 53, 56, 60, 63],
    'Eb69': [51, 55, 58, 60, 65],
}
ROOT = {'Fm9': 41, 'Db9': 37, 'Eb69': 39}   # bass roots (F2 / Db2 / Eb2)
BARS = ['Fm9', 'Db9', 'Eb69', 'Fm9', 'Db9', 'Fm9', 'Db9', 'Fm9', 'Db9']
BASS_PAT = [(0, 0, 2), (3, 12, 1), (6, 0, 1), (7, 3, 1), (10, 0, 2), (12, 7, 1), (14, 10, 1), (15, 12, 1)]

def build_music():
    drums, keys, bass, padbus = stereo(), stereo(), stereo(), stereo()
    drop_t, break_t, reveal_t = edl.f2s(edl.DROP), edl.f2s(edl.BREAK), edl.f2s(edl.REVEAL)
    card_t, done_t = edl.f2s(edl.CARD), edl.f2s(edl.TITLE_DONE)

    # Intro pickup: soft pad swell into bar 0
    add(padbus, pad(CH['Fm9'], 0.6, cutoff=700, att=0.5), 0.0, 0.8)
    for b, name in enumerate(BARS):
        bt = bar_t(b)
        if bt >= done_t - 1e-6: break
        intro = bt < drop_t - 1e-6
        endcard = bt >= card_t - 1e-6
        # chords
        if intro or endcard:
            add(padbus, pad(CH[name], 2.0, cutoff=800 if intro else 650), bt, 1.0)
            for i, m in enumerate(CH[name]):
                add(keys, rhodes(m, 1.6, 0.8, bright=0.6), bt + i * 0.012, 1.0, pan=-0.3 + 0.15 * i)
            # light syncopated re-hit on the "and" of 3
            for i, m in enumerate(CH[name][1:]):
                add(keys, rhodes(m, 0.35, 0.55, bright=0.5), bt + 2.25 * BEAT_S + i * 0.01, 1.0, pan=0.2)
        else:
            for s in (2, 6, 10, 14):            # funky off-beat stabs
                t = step_t(b, s)
                if break_t <= t < reveal_t: continue
                for i, m in enumerate(CH[name]):
                    add(keys, rhodes(m, 0.16, 0.95, bright=1.1), t + i * 0.004, 1.0, pan=-0.25 + 0.12 * i)
            add(padbus, pad(CH[name], 2.0, cutoff=1400, att=0.2), bt, 0.55)
        # bass
        for s, semi, ln in BASS_PAT:
            t = step_t(b, s)
            if break_t <= t < reveal_t: continue
            if intro and s not in (0, 10): continue
            if endcard and s not in (0, 6, 10): continue
            dur = ln * BEAT_S / 4 * (0.9 if not intro else 3.0)
            add(bass, bass_note(ROOT[BARS[b]] + semi, dur, 0.9 if not intro else 0.55,
                                cutoff=1700 if not (intro or endcard) else 500), t)
        # drums
        for beat in range(4):
            t = bt + beat * BEAT_S
            if not intro and not endcard and not (break_t <= t < reveal_t):
                add(drums, kick(), t, 0.95)
                if beat in (1, 3): add(drums, clap(), t, 0.55, pan=0.05)
                add(drums, hat(True), t + BEAT_S / 2, 0.75, pan=0.25)
            if endcard and bt < done_t:
                add(drums, kick(0.5), t, 0.5)      # heartbeat pulse under typing
        for s in range(16):
            t = step_t(b, s)
            if break_t <= t < reveal_t: continue
            if intro and t > 1.0:
                add(drums, shaker(), t, 0.7 if s % 2 else 1.0, pan=0.3)
            elif not intro and not endcard and s % 2:
                add(drums, hat(False), t, 0.7, pan=-0.2)

    music = drums * 1.0 + keys * 1.0 + bass * 0.9 + padbus * 1.0
    music = reverb(music, wet=0.18, seconds=1.4, decay=0.35)

    # filter automation: intro dark, end card closes down
    t = np.arange(N) / SR
    lo = lp(music.T, 1500).T
    mix_lp = np.clip(1 - (t - card_t) / 0.6, 0, 1)            # bright section weight
    mix_lp = np.where(t < drop_t, 0.0, mix_lp)                  # intro fully filtered
    music = lo * (1 - mix_lp[:, None]) + music * mix_lp[:, None]

    # one-shots
    hits = stereo()
    add(hits, riser(edl.f2s(edl.DROP) - 4.8, 400, 9000, 0.22), 4.8)              # into drop
    add(hits, impact(0.55, decay=0.5), drop_t)
    add(hits, riser(break_t + 0.5 - edl.f2s(edl.ENGRAVE), 250, 12000, 0.4), edl.f2s(edl.ENGRAVE))
    add(hits, impact(1.0, decay=0.9), reveal_t)
    add(hits, impact(0.45, decay=0.6), card_t)
    add(hits, riser(done_t - (done_t - 1.0), 600, 8000, 0.12), done_t - 1.0)
    add(hits, impact(1.15, freq=43.65, decay=1.4), done_t)                        # final bass hit
    hits = reverb(hits, wet=0.3, seconds=2.2, decay=0.6, seed=4)
    music = music + hits

    # gain automation: quiet under the voice, energy from the drop
    g = np.ones(N, np.float32)
    g[t < drop_t] = 0.32
    ramp = (t >= drop_t - 0.45) & (t < drop_t)
    g[ramp] = 0.32 + 0.2 * ((t[ramp] - (drop_t - 0.45)) / 0.45) ** 2
    g[(t >= break_t) & (t < reveal_t)] = 1.0
    music *= g[:, None]
    # fade out tail
    f0, f1 = edl.f2s(edl.FADE0), edl.f2s(edl.TOTAL)
    music *= np.clip(1 - (t - f0) / (f1 - f0), 0, 1)[:, None] ** 1.5
    return music

def build_sfx():
    sfx = stereo()
    add(sfx, whoosh(0.35, 0.10), edl.f2s(83) - 0.2)                 # into crate shot
    add(sfx, whoosh(0.42, 0.22), edl.f2s(184) - 0.05)               # hand wipe into drop
    add(sfx, whoosh(0.30, 0.10, up=False), edl.f2s(edl.ENGRAVE) - 0.12)
    # logo fade-ins on the end card
    card = edl.f2s(edl.CARD)
    for k, dt in enumerate((0.25, 0.55, 0.85)):
        add(sfx, shimmer(1.0, 0.013), card + dt, pan=(-0.4, 0.0, 0.4)[k])
    # typing
    for k, f in enumerate(edl.glyph_frames()):
        add(sfx, type_click(k), edl.f2s(f), 0.55, pan=-0.35 + 0.7 * k / 15)
    # rule wipe "shing"
    n = int(0.6 * SR); tt = np.arange(n) / SR
    shing = hp(rng.standard_normal(n), 6000) * np.sin(np.pi * np.clip(tt / 0.6, 0, 1)) ** 2 * 0.05
    add(sfx, shing, edl.f2s(edl.TITLE_DONE))
    return reverb(sfx, wet=0.15, seconds=1.0, decay=0.25, seed=9)

def build_voice():
    src = os.path.join(os.path.dirname(__file__), "..", "src.mp4")
    raw = os.path.join(OUT, "voice_proc.wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-ac", "1", "-ar", str(SR), "-af",
                    "highpass=f=95,lowpass=f=12500,afftdn=nr=12:nf=-42,"
                    "equalizer=f=3200:t=q:w=1.2:g=2.5,equalizer=f=250:t=q:w=1:g=-2,"
                    "acompressor=threshold=-24dB:ratio=3:attack=4:release=90:makeup=5dB",
                    "-f", "f32le", raw.replace('.wav', '.f32')], check=True)
    x = np.fromfile(raw.replace('.wav', '.f32'), np.float32)
    v = np.zeros(N, np.float32)
    fade = int(0.012 * SR)
    for out_f, s0, s1 in edl.VOICE:
        seg = x[S(s0):S(s1)].copy()
        seg[:fade] *= np.linspace(0, 1, fade); seg[-fade * 3:] *= np.linspace(1, 0, fade * 3)
        i = S(edl.f2s(out_f)); v[i:i + len(seg)] += seg[:N - i]
    v /= np.abs(v).max() + 1e-9
    return np.stack([v, v], 1) * 0.5

def wav(path, x):
    x = np.clip(x, -1, 1)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-",
                    "-c:a", "pcm_s24le", path], input=x.astype(np.float32).tobytes(), check=True)

if __name__ == "__main__":
    n_out = int(T_TOTAL * SR)
    voice = build_voice()[:n_out]
    music = build_music()[:n_out]
    sfx = build_sfx()[:n_out]
    pk = max(np.abs(music).max(), 1e-9)
    music = music / pk * 0.7
    wav(os.path.join(OUT, "voice.wav"), voice)
    wav(os.path.join(OUT, "music.wav"), music)
    wav(os.path.join(OUT, "sfx.wav"), sfx)
    mix = voice + music + sfx
    mix = np.tanh(mix * 1.1) / 1.1
    wav(os.path.join(OUT, "mix_premaster.wav"), mix)
    print("ok", mix.shape, float(np.abs(mix).max()))
