import sys, os, glob, numpy as np, soundfile as sf
from scipy.signal import resample_poly
from pocketsphinx import Decoder
dec = Decoder(samprate=16000)
def rec(path):
    a, sr = sf.read(path, dtype="float32")
    if a.ndim > 1: a = a.mean(1)
    a = resample_poly(a, 16000, sr)
    pcm = (np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes()
    dec.start_utt(); dec.process_raw(pcm, full_utt=True); dec.end_utt()
    return dec.hyp().hypstr if dec.hyp() else ""
for p in sorted(glob.glob(os.path.join(sys.argv[1], "*.wav"))):
    print(f"{os.path.basename(p):22s} -> {rec(p)}")
