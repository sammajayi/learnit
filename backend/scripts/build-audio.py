# Records every phrase the lesson player speaks as an mp3, so pronunciation does not depend on the voices a
# learner's device happens to have (Brave hides them, many Linux and Android setups have none for Spanish/French).
#
#   uv run --with piper-tts --with lameenc backend/scripts/build-audio.py
#
# Run from the repo root after changing lesson content. Only phrases without a file are recorded, so a re-run
# is quick; pass --force to record everything again. Files go to frontend/public/audio/<speechLang>/<id>.mp3,
# where <id> is audioId() below. frontend/lib/speech.ts computes the same id, so the two must stay identical.
#
# Voices (Piper, https://github.com/rhasspy/piper), downloaded on first run to ~/.cache/learnit-tts:
#   es-ES  es_MX-claude-high    Apache-2.0 (Mexican Spanish: the course teaches Latin American Spanish)
#   fr-FR  fr_FR-siwis-medium   dataset CC-BY 4.0, SIWIS French Speech Synthesis Database (credited in README)
import argparse, glob, io, json, os, sys, urllib.request, wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONTENT = ROOT / "backend/src/content"
OUT = ROOT / "frontend/public/audio"
CACHE = Path.home() / ".cache/learnit-tts"
HF = "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0"
VOICES = {
    "es-ES": "es/es_MX/claude/high/es_MX-claude-high",  # Latin American, as the course teaches; files stay keyed by speechLang
    "fr-FR": "fr/fr_FR/siwis/medium/fr_FR-siwis-medium",
}


def audio_id(lang: str, text: str) -> str:
    """FNV-1a, 32 bit, over the UTF-8 bytes of "<lang>|<text>", as 8 hex digits. Must match frontend/lib/speech.ts."""
    h = 0x811C9DC5
    for b in f"{lang}|{text.strip()}".encode("utf-8"):
        h ^= b
        h = (h * 0x01000193) & 0xFFFFFFFF
    return f"{h:08x}"


def phrases():
    """(speechLang, text) for everything the lesson player can speak: multiple-choice prompts and new-word cards."""
    out = set()
    for f in sorted(glob.glob(str(CONTENT / "*/unit*.json"))):
        unit = json.loads(Path(f).read_text(encoding="utf-8"))
        lang = unit["speechLang"]
        exercises = [e for l in unit["lessons"] for e in l["exercises"]] + unit["checkpoint"]["pool"]
        out.update((lang, e["speak"].strip()) for e in exercises if e.get("type") == "mc" and e.get("speak"))
        out.update((lang, w["target"].strip()) for l in unit["lessons"] for w in l.get("intro") or [])
    return sorted(out)


def voice(lang: str):
    from piper import PiperVoice
    path = VOICES[lang]
    model = CACHE / (Path(path).name + ".onnx")
    for suffix in (".onnx", ".onnx.json"):
        dest = CACHE / (Path(path).name + suffix)
        if not dest.exists():
            CACHE.mkdir(parents=True, exist_ok=True)
            print(f"downloading {dest.name}", file=sys.stderr)
            part = dest.with_name(dest.name + ".part")  # so a failed download never leaves a broken model behind
            urllib.request.urlretrieve(f"{HF}/{path}{suffix}", part)
            part.rename(dest)
    return PiperVoice.load(str(model))


def to_mp3(v, text: str) -> bytes:
    import lameenc
    from piper import SynthesisConfig
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        v.synthesize_wav(text, w, syn_config=SynthesisConfig(length_scale=1.1))  # a touch slower than natural, for learners
    buf.seek(0)
    with wave.open(buf, "rb") as w:
        pcm, rate, channels = w.readframes(w.getnframes()), w.getframerate(), w.getnchannels()
    enc = lameenc.Encoder()
    enc.set_bit_rate(48)
    enc.set_in_sample_rate(rate)
    enc.set_channels(channels)
    enc.set_quality(2)
    return enc.encode(pcm) + enc.flush()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="record every phrase again")
    args = ap.parse_args()

    todo = phrases()
    ids = {}
    for lang, text in todo:
        i = audio_id(lang, text)
        if ids.get((lang, i), text) != text:
            sys.exit(f"id collision in {lang}: {text!r} and {ids[(lang, i)]!r}. Change audio_id and speech.ts together.")
        ids[(lang, i)] = text

    loaded = {}
    made = 0
    for lang, text in todo:
        dest = OUT / lang / f"{audio_id(lang, text)}.mp3"
        if dest.exists() and not args.force:
            continue
        if lang not in loaded:
            loaded[lang] = voice(lang)
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(to_mp3(loaded[lang], text))
        made += 1

    # Files no phrase uses any more (content was edited).
    wanted = {OUT / lang / f"{i}.mp3" for (lang, i) in ids}
    stale = [p for p in OUT.glob("*/*.mp3") if p not in wanted]
    for p in stale:
        p.unlink()
    print(f"{len(todo)} phrases, {made} recorded, {len(stale)} stale removed")


if __name__ == "__main__":
    main()
