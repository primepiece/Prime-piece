"""Original instrumental for the Prime Piece Christmas Release reel.

Everything here is synthesised from scratch (no samples, loops or third-party
recordings), so the track is an original work made for Prime Piece and is free
to use commercially.

120 BPM (one beat = 0.5 s), D major. Every picture cut lands on a percussion
hit and a bell note:

    0.0  red    1.0  green    2.0  white      the colour reveal (kick + bell)
    3.0  red    4.5  green    6.0  white      longer holds (kick/snap + bell)
    7.5  the collection                       bell arpeggio
    10.0 end card                             final chord, rings out to 12.5

Run:  python3 music/compose.py   (writes assets/music/christmas-release.wav)
"""

import os
import wave

import numpy as np
from scipy import signal

SR = 48000
LENGTH = 12.5
N = int(SR * LENGTH)
rng = np.random.default_rng(20261225)  # seeded: identical output every run

OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "music", "christmas-release.wav")


def hz(note):
    names = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}
    name, octave = note[:-1], int(note[-1])
    midi = 12 * (octave + 1) + names[name]
    return 440.0 * 2 ** ((midi - 69) / 12)


def place(bus, start, sound, pan=0.0):
    """Mix a mono sound into a stereo bus at `start` seconds with constant-power pan."""
    i = int(round(start * SR))
    if i >= N:
        return
    s = sound[: N - i]
    left = np.cos((pan + 1) * np.pi / 4)
    right = np.sin((pan + 1) * np.pi / 4)
    bus[0, i : i + len(s)] += s * left
    bus[1, i : i + len(s)] += s * right


def butter(x, kind, freq, order=2):
    sos = signal.butter(order, freq, btype=kind, fs=SR, output="sos")
    return signal.sosfilt(sos, x)


# ---------------------------------------------------------------- instruments


def piano(note, dur, vel=0.6):
    """Warm felt-ish piano: inharmonic partials, two-stage decay, detuned unison, soft hammer."""
    f0 = hz(note)
    n = int(SR * (dur + 1.6))
    t = np.arange(n) / SR
    out = np.zeros(n)
    B = 0.00035
    pitch_decay = (f0 / 261.6) ** 0.45
    for k in range(1, 16):
        fk = k * f0 * np.sqrt(1 + B * k * k)
        if fk > 12000:
            break
        amp = (1.0 / k**1.25) * np.exp(-(k - 1) * (0.55 - 0.35 * vel))
        fast = (1.1 + 0.45 * k) * pitch_decay
        slow = (0.22 + 0.06 * k) * pitch_decay
        envk = 0.6 * np.exp(-t * fast) + 0.4 * np.exp(-t * slow)
        det = 1 + 0.00045 * (1 if k % 2 else -1)
        ph = rng.uniform(0, 2 * np.pi)
        out += amp * envk * (np.sin(2 * np.pi * fk * t + ph) + 0.8 * np.sin(2 * np.pi * fk * det * t + ph * 0.7))
    hammer = butter(rng.standard_normal(n), "lowpass", min(4000, f0 * 6)) * np.exp(-t * 90) * 0.06
    out += hammer
    attack = np.clip(t / 0.004, 0, 1)
    release = np.clip(1 - (t - dur) / 0.35, 0, 1)  # damper
    return out * attack * release * vel


def chord(notes, start, dur, vel=0.5, spread=0.012, bus=None):
    for j, nt in enumerate(notes):
        pan = -0.35 + 0.7 * j / max(1, len(notes) - 1)
        place(bus, start + j * spread, piano(nt, dur, vel * (0.85 + 0.15 * (j == len(notes) - 1))), pan)


def bell(note, vel=0.5, ring=3.2):
    """Celesta / glockenspiel blend: bar modes plus a soft harmonic body."""
    f0 = hz(note)
    n = int(SR * ring)
    t = np.arange(n) / SR
    partials = [  # ratio, amplitude, decay per second
        (1.0, 1.0, 1.1),
        (2.0, 0.18, 2.6),
        (2.756, 0.30, 3.8),
        (4.0, 0.10, 5.0),
        (5.404, 0.10, 8.0),
        (8.933, 0.04, 14.0),
    ]
    out = np.zeros(n)
    for r, a, d in partials:
        f = f0 * r
        if f > 16000:
            continue
        out += a * np.exp(-t * d) * np.sin(2 * np.pi * f * t + rng.uniform(0, 2 * np.pi))
    strike = butter(rng.standard_normal(n), "highpass", 2500) * np.exp(-t * 260) * 0.05
    out += strike
    out *= np.clip(t / 0.0015, 0, 1)
    return out * vel


def jingle(vel=0.5):
    """A small sleigh-bell shake: clusters of high metallic partials with micro onsets."""
    n = int(SR * 0.45)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for onset in (0.0, 0.011, 0.024, 0.041):
        o = int(onset * SR)
        tt = t[: n - o]
        burst = np.zeros(n - o)
        for _ in range(9):
            f = rng.uniform(4200, 10500)
            burst += np.sin(2 * np.pi * f * tt + rng.uniform(0, 6.28)) * np.exp(-tt * rng.uniform(18, 34))
        burst += butter(rng.standard_normal(n - o), "bandpass", [5500, 11000]) * np.exp(-tt * 70) * 0.8
        out[o:] += burst * (1.0 if onset == 0 else 0.55)
    return butter(out, "highpass", 3500) * vel / 9


def kick(vel=0.5):
    n = int(SR * 0.6)
    t = np.arange(n) / SR
    f = 44 + 62 * np.exp(-t * 32)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * 7.5)
    click = butter(rng.standard_normal(n), "lowpass", 2200) * np.exp(-t * 300) * 0.12
    return (body + click) * np.clip(t / 0.002, 0, 1) * vel


def snap(vel=0.5):
    """Soft brushed rim / finger-snap."""
    n = int(SR * 0.35)
    t = np.arange(n) / SR
    noise = butter(rng.standard_normal(n), "bandpass", [1200, 6500]) * np.exp(-t * 38)
    tone = np.sin(2 * np.pi * 1650 * t) * np.exp(-t * 90) * 0.25
    return (noise + tone) * np.clip(t / 0.001, 0, 1) * vel


def bass(note, dur, vel=0.5):
    f0 = hz(note)
    n = int(SR * (dur + 0.4))
    t = np.arange(n) / SR
    out = np.sin(2 * np.pi * f0 * t) + 0.22 * np.sin(4 * np.pi * f0 * t) + 0.06 * np.sin(6 * np.pi * f0 * t)
    env = np.clip(t / 0.012, 0, 1) * (0.55 + 0.45 * np.exp(-t * 1.6)) * np.clip(1 - (t - dur) / 0.25, 0, 1)
    return out * env * vel


def reverb_ir(seconds=2.4):
    n = int(SR * seconds)
    t = np.arange(n) / SR
    ir = np.zeros((2, n))
    for ch in range(2):
        early = butter(rng.standard_normal(n), "lowpass", 7000) * np.exp(-t * 6.0)
        late = butter(rng.standard_normal(n), "lowpass", 2600) * np.exp(-t * 2.6)
        ir[ch] = 0.35 * early + 0.65 * late
        ir[ch, : int(0.018 * SR)] = 0  # pre-delay
        ir[ch] /= np.sqrt(np.sum(ir[ch] ** 2))
    return ir


# ---------------------------------------------------------------- the score

piano_bus = np.zeros((2, N))
bell_bus = np.zeros((2, N))
drum_bus = np.zeros((2, N))
bass_bus = np.zeros((2, N))

# Harmony, one chord per 2 s bar (half-note restrikes so the 1 s cuts in the reveal each get a chord).
progression = [
    (0.0, ["D3", "A3", "C#4", "E4", "F#4"], "D2"),  # Dmaj9
    (2.0, ["B2", "F#3", "A3", "C#4", "D4"], "B1"),  # Bm9
    (4.0, ["G2", "D3", "F#3", "A3", "B3"], "G2"),  # Gmaj9
    (6.0, ["A2", "E3", "G3", "B3", "D4"], "A2"),  # A11 (sus)
    (8.0, ["E2", "B2", "D3", "F#3", "G3"], "E2"),  # Em9
    (9.0, ["A2", "E3", "G3", "C#4", "E4"], "A2"),  # A13 -> home
]
for start, notes, root in progression:
    span = 1.0 if start >= 8.0 else 2.0
    chord(notes, start, span - 0.04, vel=0.55, bus=piano_bus)
    if span == 2.0:  # soft restrike on beat 3, a touch quieter
        chord(notes[1:], start + 1.0, 0.96, vel=0.38, bus=piano_bus)
    place(bass_bus, start, bass(root, span - 0.05, 0.9))

# Light right-hand eighth-note figure through the middle section (gives the "longer holds" a gentle pulse).
figure = {3.0: "F#5", 3.5: "E5", 4.0: "D5", 4.5: "F#5", 5.0: "A5", 5.5: "F#5", 6.0: "E5", 6.5: "G5", 7.0: "B5"}
for t0, nt in figure.items():
    place(piano_bus, t0, piano(nt, 0.45, 0.22), 0.25)

# Final chord on the end card, held to the end.
chord(["D3", "A3", "C#4", "E4", "F#4", "A4"], 10.0, 2.4, vel=0.6, spread=0.018, bus=piano_bus)
place(bass_bus, 10.0, bass("D2", 2.3, 0.95))

# Bells: one note on every cut.
cut_bells = [
    (0.0, "A5", 0.55), (1.0, "D6", 0.55), (2.0, "F#6", 0.6),  # three colours, rising
    (3.0, "E6", 0.5), (4.5, "D6", 0.5), (6.0, "C#6", 0.5),  # one of each
]
for t0, nt, v in cut_bells:
    place(bell_bus, t0, bell(nt, v), 0.15)
# The collection: a quick sparkle up the D major chord, landing on the cut at 7.5.
for k, nt in enumerate(["D6", "F#6", "A6", "D7"]):
    place(bell_bus, 7.5 + k * 0.125, bell(nt, 0.42 - 0.04 * k, 2.6), -0.2 + 0.15 * k)
place(bell_bus, 8.5, bell("B5", 0.3), 0.2)
place(bell_bus, 9.0, bell("A5", 0.3), 0.2)
place(bell_bus, 9.5, bell("C#6", 0.32), 0.2)
# End card: low and high bell together.
place(bell_bus, 10.0, bell("D5", 0.45, 3.0), -0.1)
place(bell_bus, 10.0, bell("A6", 0.4, 3.0), 0.15)
place(bell_bus, 10.015, bell("D6", 0.35, 3.0), 0.0)

# Beat: kick on beats 1 and 3, a brushed snap on 2 and 4 from bar 2, jingles on the off-beats in the middle.
for b in range(20):  # beats 0..9.5 s
    t0 = b * 0.5
    if b % 2 == 0:
        place(drum_bus, t0, kick(0.85 if t0 < 3 else 0.75))
    elif t0 >= 3.0:
        place(drum_bus, t0, snap(0.35), 0.1)
for k in range(int((10.0 - 3.0) / 0.25)):
    t0 = 3.0 + k * 0.25
    if abs((t0 * 2) - round(t0 * 2)) > 1e-6:  # off-beat sixteenths/eighths only
        place(drum_bus, t0, jingle(0.55 if (t0 * 4) % 2 == 1 else 0.35), 0.35)
place(drum_bus, 10.0, kick(0.7))

# ---------------------------------------------------------------- mix

def rms_db(x):
    return 20 * np.log10(np.sqrt(np.mean(x[np.abs(x) > 1e-6] ** 2)) + 1e-12)


def set_level(bus, target_db):
    return bus * 10 ** ((target_db - rms_db(bus)) / 20)


piano_bus = set_level(butter(piano_bus, "highpass", 70), -20)
bell_bus = set_level(bell_bus, -25)
drum_bus = set_level(drum_bus, -25)
bass_bus = set_level(butter(bass_bus, "lowpass", 400), -28)

dry = piano_bus + bell_bus + drum_bus + bass_bus
send = 0.55 * piano_bus + 0.8 * bell_bus + 0.25 * drum_bus
ir = reverb_ir()
wet = np.stack([signal.fftconvolve(send[c], ir[c])[:N] for c in range(2)])
mix = dry + 0.32 * wet
mix = butter(mix, "highpass", 38)  # nothing useful below this on a phone

# Fade the tail so the film ends cleanly.
t = np.arange(N) / SR
mix *= np.clip((LENGTH - t) / 0.9, 0, 1)

mix /= np.max(np.abs(mix)) + 1e-9
mix = np.tanh(1.3 * mix) / np.tanh(1.3)  # gentle saturation
mix *= 0.61  # about -14 LUFS integrated (Instagram)

os.makedirs(os.path.dirname(OUT), exist_ok=True)
pcm = (np.clip(mix.T, -1, 1) * 32767).astype("<i2")
with wave.open(OUT, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("wrote", os.path.abspath(OUT))
