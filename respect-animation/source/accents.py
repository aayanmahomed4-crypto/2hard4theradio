"""Accent layer for Kokoro: phonemize with an espeak dialect, then apply accent rules to the IPA.

Each accent = (espeak base dialect, ordered list of regex rules). Rules work on the phoneme
string word by word; stress marks (ˈ ˌ) may sit before a vowel, so vowel rules allow them.
"""
import re
from kokoro_onnx.tokenizer import Tokenizer

Tokenizer()  # configures the bundled espeak-ng library for phonemizer
from phonemizer.backend import EspeakBackend  # noqa: E402

S = "[ˈˌ]?"            # optional stress mark
V = "[aeiouɑɒɔəɐɛɜɪʊʌæøɨ]"  # vowel nucleus start
END = r"(?=[\s.,?!;:]|$)"   # end of word

ACCENTS = {
    # Jamaican English: Caribbean base (TH-stopping, -in'), monophthong FACE/GOAT, STRUT→ɔ, LOT→a,
    # NURSE→ɔ, final -er→a, final consonant-cluster reduction.
    "jamaican": ("en-029", [
        (r"θ", "t"), (r"ð", "d"),
        (r"eɪ", "eː"), (r"[oə]ʊ", "oː"),
        (r"ʌ", "ɔ"), (r"ɒ", "a"), (r"ɜː?", "ɔ"), (r"ɑː", "aː"),
        (r"ɪə", "iː"), (r"eə", "eː"),
        ("FINAL_SCHWA_A", None),
        (r"(?<=[sn])t" + END, ""), (r"(?<=n)d" + END, ""), (r"(?<=l)d" + END, ""),
        (r"(?<=[kf])t" + END, ""),
        (r"ɪŋ" + END, "ɪn"),
    ]),
    # Russian-accented English: rhotic base, TH→s/z, w→v, h→x, trilled r, no reduced/lax vowels,
    # final devoicing.
    "russian": ("en-us", [
        (r"ɚ", "ər"), (r"ɝ", "ər"), (r"ɾ", "t"),
        (r"θ", "s"), (r"ð", "z"), (r"[wʍ]", "v"), (r"h", "x"), (r"ɹ", "r"),
        (r"ŋ", "n"),
        (r"æ", "ɛ"), (r"ʌ", "a"), (r"ɑː?", "a"), (r"ɔː?", "o"), (r"oʊ", "o"), (r"eɪ", "ej"),
        (r"aɪ", "aj"), (r"ɔɪ", "oj"), (r"aʊ", "au"),
        (r"iː", "i"), (r"ɪ", "i"), (r"ᵻ", "i"), (r"uː", "u"), (r"ʊ", "u"), (r"ɜː?", "ø"), (r"ə", "ɐ"),
        (r"b" + END, "p"), (r"d" + END, "t"), (r"ɡ" + END, "k"), (r"v" + END, "f"), (r"z" + END, "s"),
        (r"ʒ" + END, "ʃ"), (r"dʒ" + END, "tʃ"),
    ]),
    # Liverpool (Scouse): Northern base (STRUT ʊ, short BATH), fronted GOAT, NURSE=SQUARE ɛː,
    # k-lenition to [x] after vowels, -ing with a hard g, tense happY.
    "liverpool": ("en-gb-x-gbclan", [
        (r"oː", "ɛʊ"), (r"eː", "eɪ"),
        (r"ɜː", "ɛː"), (r"eə", "ɛː"),
        (r"(?<=[aeiouɑɒɔəɐɛɜɪʊʌː])k(?=[\s.,?!;:]|$|[aeiouɑɒɔəɐɛɜɪʊʌ])", "x"),
        (r"ɪn" + END, "ɪŋɡ"),
        (r"(?<![aeɔoʌɑɒəɐɛ])ɪ" + END, "iː"),
    ]),
    # Australian English: RP-like non-rhotic base with shifted diphthongs, fronted START,
    # raised TRAP, centring diphthongs as long vowels, schwa → ɐ, flapped /t/ between vowels.
    "australian": ("en-gb", [
        (r"eɪ", "æɪ"), (r"aɪ", "ɑɪ"), (r"əʊ", "ɐʊ"), (r"aʊ", "æʊ"),
        (r"iː", "ɪi"),
        (r"ɑː", "aː"),
        (r"(?<![ɑæɐ])a(?![ɪʊː])", "æ"),
        (r"ɪə", "ɪː"), (r"eə", "eː"), (r"ʊə", "ʊː"),
        (r"ə" + END, "ɐ"),
        (r"(?<=[aeiouɑɒɔəɐɛɜɪʊʌæː])t(?=" + S + V + ")", "ɾ"),
        (r"(?<=[aeiouɑɒɔəɐɛɜɪʊʌæː])t (?=" + S + V + ")", "ɾ "),
    ]),
}

_BACKENDS = {}


def phonemes(text, accent, vocab=None):
    base, rules = ACCENTS[accent]
    if base not in _BACKENDS:
        _BACKENDS[base] = EspeakBackend(base, preserve_punctuation=True, with_stress=True)
    ph = _BACKENDS[base].phonemize([text])[0].strip()
    ph = ph.replace("̪", "")  # drop dental diacritic (not in Kokoro's vocab)
    for pat, rep in rules:
        if pat == "FINAL_SCHWA_A":
            # stressed (content) words ending consonant+schwa: better → bɛta; leaves "to", "for" alone
            ph = " ".join(re.sub(r"(?<=[^aeiouɑɒɔəɐɛɜɪʊʌæːˈˌ])ə(?=[.,?!;:]*$)", "a", w) if re.search("[ˈˌ]", w) else w for w in ph.split(" "))
        else:
            ph = re.sub(pat, rep, ph)
    if vocab is not None:
        ph = "".join(c for c in ph if c in vocab)
    return ph


if __name__ == "__main__":
    import sys
    s = sys.argv[1] if len(sys.argv) > 1 else "Okay, serious question. What actually makes a relationship healthy? Thanks for listening, that's okay."
    for a in ACCENTS:
        print(f"{a:11s}", phonemes(s, a))
