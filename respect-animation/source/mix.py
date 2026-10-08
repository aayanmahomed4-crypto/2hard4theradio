"""Build the soundtrack: voices + generated music bed (ducked under speech) + light sound effects.
usage: python3 mix.py <anim_dir> <out.wav>
"""
import json, os, sys
import numpy as np
import soundfile as sf
from scipy.signal import butter, lfilter, resample_poly

D, OUT = sys.argv[1], sys.argv[2]
SR = 48000
meta = json.load(open(os.path.join(D, "lines.json")))
TOTAL = meta["total"] + 0.5
N = int(TOTAL * SR)
rng = np.random.default_rng(7)

def env_adsr(n, a, r, sr=SR):
    e = np.ones(n)
    na, nr = int(a * sr), int(r * sr)
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, nr)
    return e

def note(freq, dur, amps=(1, 0.35, 0.15, 0.06), detune=0.0):
    t = np.arange(int(dur * SR)) / SR
    s = np.zeros_like(t)
    for h, a in enumerate(amps, 1):
        for d in (-detune, detune) if detune else (0,):
            s += a * np.sin(2 * np.pi * freq * h * (1 + d) * t + rng.uniform(0, 6.28))
    return s

def midi(m):
    return 440 * 2 ** ((m - 69) / 12)

def lowpass(x, fc):
    b, a = butter(2, fc / (SR / 2))
    return lfilter(b, a, x)

# ------------------------------------------------------------ music
BRIGHT = [[48, 60, 64, 67], [43, 59, 62, 67], [45, 57, 60, 64], [41, 57, 60, 65]]   # C  G  Am F
DARK = [[45, 57, 60, 64], [41, 53, 57, 60], [38, 50, 53, 57], [40, 52, 56, 59]]     # Am F  Dm E

def music_segment(dur, dark):
    n = int(dur * SR)
    out = np.zeros(n + SR * 8)
    def put(s0, v):
        v = v[: max(0, len(out) - s0)]
        out[s0:s0 + len(v)] += v
    prog, clen = (DARK, 3.2) if dark else (BRIGHT, 2.5)
    t, i = 0.0, 0
    while t < dur + 0.1:
        chord = prog[i % 4]
        start = int(t * SR)
        L = clen + 1.2
        for m in chord:
            f = midi(m - (12 if dark else 0))
            v = note(f, L, amps=(1, 0.3, 0.12, 0.05), detune=0.0025) * env_adsr(int(L * SR), 0.6, 1.2)
            put(start, v * (0.16 if m < 50 else 0.10))
        if not dark:  # soft plucked arpeggio
            pat = [chord[1] + 12, chord[2] + 12, chord[3] + 12, chord[2] + 12, chord[1] + 24, chord[3] + 12, chord[2] + 12, chord[3] + 12]
            step = clen / 8
            for k, m in enumerate(pat):
                L2 = 0.9
                tt = np.arange(int(L2 * SR)) / SR
                v = note(midi(m), L2, amps=(1, 0.18, 0.05)) * np.exp(-tt / 0.22) * np.minimum(1, tt / 0.004)
                s0 = start + int(k * step * SR)
                put(s0, v * 0.05)
        else:  # low drone pulse
            tt = np.arange(int(clen * SR)) / SR
            v = np.sin(2 * np.pi * midi(chord[0] - 12) * tt) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.5 * tt)) * 0.10
            put(start, v)
        t += clen
        i += 1
    out = lowpass(out[:n], 3200 if not dark else 1800)
    return out

music = np.zeros(N)
for sc in meta["scenes"]:
    s0, dur = sc["start"], sc["dur"]
    seg = music_segment(dur + 1.0, sc["bg"] == "dark")
    fade = int(0.6 * SR)
    seg[:fade] *= np.linspace(0, 1, fade)
    seg[-fade:] *= np.linspace(1, 0, fade)
    a = int(max(0, s0 - 0.3) * SR)
    seg = seg[: max(0, min(len(seg), N - a))]
    music[a:a + len(seg)] += seg
music /= np.max(np.abs(music)) + 1e-9
music *= 0.16  # quiet bed

# ------------------------------------------------------------ voices
voice = np.zeros(N)
active = np.zeros(N)
for vs in meta["starts"]:
    a, sr = sf.read(os.path.join(D, "voice", vs["id"] + ".wav"), dtype="float32")
    if sr != SR:
        a = resample_poly(a, SR, sr)
    s0 = int(vs["start"] * SR)
    a = a[: max(0, N - s0)]
    voice[s0:s0 + len(a)] += a * 0.9
    active[s0:s0 + len(a)] = 1

# ducking envelope (fast attack, slow release)
win = int(0.25 * SR)
duck = np.convolve(active, np.ones(win) / win, mode="same")
duck = np.clip(duck * 3, 0, 1)
music *= 1 - 0.55 * duck

# ------------------------------------------------------------ sound effects
sfx = np.zeros(N)
def add(at, x):
    s0 = int(at * SR)
    x = x[: max(0, N - s0)]
    sfx[s0:s0 + len(x)] += x

for ev in meta["sfx"]:
    t = ev["t"]
    if ev["type"] == "pop":
        L = 0.16; tt = np.arange(int(L * SR)) / SR
        f = 620 + 700 * tt / L
        x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.05) * 0.16
        add(t + 0.02, x)
    elif ev["type"] == "freeze":
        L = 0.5; tt = np.arange(int(L * SR)) / SR
        noise = lowpass(rng.standard_normal(len(tt)), 2500) * np.exp(-tt / 0.12) * 0.35
        thump = np.sin(2 * np.pi * 70 * tt) * np.exp(-tt / 0.09) * 0.45
        add(t, noise + thump)
    elif ev["type"] == "flag":
        L = 0.45; tt = np.arange(int(L * SR)) / SR
        x = np.sin(2 * np.pi * (95 - 40 * tt) * tt) * np.exp(-tt / 0.12) * 0.42
        x += lowpass(rng.standard_normal(len(tt)), 900) * np.exp(-tt / 0.02) * 0.15
        add(t, x)

mix = voice + music + sfx
# gentle fade in/out and peak safety
fi, fo = int(0.4 * SR), int(2.0 * SR)
mix[:fi] *= np.linspace(0, 1, fi)
mix[-fo:] *= np.linspace(1, 0, fo)
peak = np.max(np.abs(mix))
if peak > 0.97:
    mix *= 0.97 / peak
stereo = np.stack([mix, mix], axis=1).astype(np.float32)
sf.write(OUT, stereo, SR)
rms = lambda x: 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
print(f"wrote {OUT}: {TOTAL:.1f}s peak {np.max(np.abs(mix)):.2f} voice RMS {rms(voice[active > 0]):.1f} dB music RMS {rms(music):.1f} dB")
