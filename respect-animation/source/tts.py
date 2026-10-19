import json, sys, os, numpy as np, soundfile as sf
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from accents import phonemes
from kokoro_onnx import Kokoro
D = sys.argv[1]
k = Kokoro(os.path.join(sys.argv[2], "kokoro-v1.0.onnx"), os.path.join(sys.argv[2], "voices-v1.0.bin"))
CAST = {  # character -> (voice, speed, accent)
    "N": ("bf_emma", 1.0, None),            # narrator: British English
    "Alex": ("af_heart", 1.0, "jamaican"),
    "Sam": ("am_michael", 0.98, "russian"),
    "Maya": ("af_bella", 0.95, "liverpool"),
    "Jordan": ("am_puck", 0.95, "australian"),
}
lines = json.load(open(os.path.join(D, "lines.json")))["lines"]
os.makedirs(os.path.join(D, "voice"), exist_ok=True)
durs = {}
for ln in lines:
    voice, speed, accent = CAST[ln["who"]]
    text = ln["text"].replace("“", '"').replace("”", '"')
    if accent:
        a, sr = k.create(phonemes(text, accent, k.tokenizer.vocab), voice=voice, speed=speed, is_phonemes=True)
    else:
        a, sr = k.create(text, voice=voice, speed=speed, lang="en-gb")
    a = np.asarray(a, dtype=np.float32)
    thr = 0.004 * np.max(np.abs(a))
    idx = np.where(np.abs(a) > thr)[0]
    a = a[max(0, idx[0] - int(0.08 * sr)): min(len(a), idx[-1] + int(0.12 * sr))]
    a = a / (np.max(np.abs(a)) + 1e-9) * 0.89
    sf.write(os.path.join(D, "voice", ln["id"] + ".wav"), a, sr)
    durs[ln["id"]] = {"dur": round(len(a) / sr, 3)}
    print(ln["id"], ln["who"], f"{len(a)/sr:.2f}s", ln["text"][:50])
open(os.path.join(D, "voice.js"), "w").write("window.VOICE = " + json.dumps(durs) + ";\n")
