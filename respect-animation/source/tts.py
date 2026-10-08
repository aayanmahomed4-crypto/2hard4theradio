import json, sys, os, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
D = sys.argv[1]
k = Kokoro(os.path.join(sys.argv[2], "kokoro-v1.0.onnx"), os.path.join(sys.argv[2], "voices-v1.0.bin"))
CAST = {  # character -> (voice, speed)
    "N": ("bf_emma", 1.0),
    "Alex": ("bf_alice", 1.08),
    "Maya": ("bf_lily", 1.06),
    "Sam": ("bm_fable", 1.06),
    "Jordan": ("bm_daniel", 1.06),
}
lines = json.load(open(os.path.join(D, "lines.json")))["lines"]
os.makedirs(os.path.join(D, "voice"), exist_ok=True)
durs = {}
for ln in lines:
    voice, speed = CAST[ln["who"]]
    text = ln["text"].replace("“", '"').replace("”", '"')
    a, sr = k.create(text, voice=voice, speed=speed, lang="en-gb")
    a = np.asarray(a, dtype=np.float32)
    thr = 0.01 * np.max(np.abs(a))
    idx = np.where(np.abs(a) > thr)[0]
    a = a[max(0, idx[0] - int(0.03 * sr)): min(len(a), idx[-1] + int(0.08 * sr))]
    a = a / (np.max(np.abs(a)) + 1e-9) * 0.89
    sf.write(os.path.join(D, "voice", ln["id"] + ".wav"), a, sr)
    durs[ln["id"]] = {"dur": round(len(a) / sr, 3)}
    print(ln["id"], ln["who"], f"{len(a)/sr:.2f}s", ln["text"][:50])
open(os.path.join(D, "voice.js"), "w").write("window.VOICE = " + json.dumps(durs) + ";\n")
