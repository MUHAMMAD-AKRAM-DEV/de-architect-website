#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generate the ten stills for the section 3 fly-through (assets/img/flight/).

The reel in index.html plays whatever is in assets/img/flight/shot-01.jpg …
shot-10.jpg, so this script just replaces those files. Nothing else needs
touching — js/flight.js reads the number of <figure class="fshot"> elements
and follows.

Setup
-----
    pip install google-genai pillow
    # then put your key in ~/.claude/.env  (GEMINI_API_KEY=...)
    # or:  export GEMINI_API_KEY="..."

Usage
-----
    python tools/generate-flight-shots.py              # all ten, Nano Banana Pro
    python tools/generate-flight-shots.py --only 4     # just shot-04
    python tools/generate-flight-shots.py --only 4 5 6 # a few
    python tools/generate-flight-shots.py --flash      # cheaper/faster model
    python tools/generate-flight-shots.py --dry-run    # print prompts, call nothing

Every shot shares STYLE and SUBJECT so the ten frames read as one building
photographed at one time of day, rather than ten unrelated houses. If a shot
comes back wrong, regenerate just that one with --only; the others are
untouched.
"""

import argparse
import io
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "assets" / "img" / "flight"

MODEL_PRO = "gemini-3-pro-image-preview"     # Nano Banana Pro
MODEL_FLASH = "gemini-2.5-flash-image"       # Nano Banana
ASPECT = "16:9"
JPEG_QUALITY = 88
TARGET_W = 1920                              # downscaled to this before saving


def load_key():
    """GEMINI_API_KEY from the environment, or any of the usual .env files."""
    key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if key:
        return key
    for p in (Path.home() / ".claude" / ".env",
              Path.home() / ".claude" / "skills" / ".env",
              ROOT / ".env"):
        if p.exists():
            for line in p.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                if k.strip() in ("GEMINI_API_KEY", "GOOGLE_API_KEY"):
                    return v.strip().strip('"').strip("'")
    return None


# --------------------------------------------------------------------------
# The style bible. Repeated verbatim in every prompt — this is what keeps the
# ten frames looking like one commission.
# --------------------------------------------------------------------------
STYLE = (
    "Photorealistic architectural photography, full-frame camera, 24mm tilt-shift lens, "
    "blue hour just after sunset. Warm interior light glowing against a deep indigo sky. "
    "Materials: travertine, honed limestone, white oak floors, walnut joinery, brushed bronze, "
    "book-matched marble, sheer linen. Colour grade with warm amber highlights and deep plum "
    "and wine shadows. Immaculate, calm, expensive, editorial architectural magazine quality, "
    "ultra sharp, high dynamic range, natural light falloff. "
    "No text, no lettering, no signage, no logos, no watermarks, no visible faces."
)

SUBJECT = (
    "The subject throughout is one specific contemporary luxury villa: a long low horizontal "
    "stone volume with a cantilevered second storey above the entrance, full-height glazing, "
    "slender vertical bronze fins across one side of the facade and a warm vertical timber screen "
    "across the other, deep flat roof overhang, set on a private walled urban plot with a lit "
    "city skyline of towers rising behind it."
)

SHOTS = [
    (1, "High aerial drone view looking down at the whole walled villa plot from about sixty "
        "metres up and off to one side. The lit villa sits in the middle of its compound with a "
        "paved forecourt in front and a turquoise lit swimming pool behind. A dense city of lit "
        "apartment blocks and glass towers surrounds the plot to the horizon."),

    (2, "Descending drone view over the gated entrance forecourt. Large travertine paving, a long "
        "still black reflecting pool mirroring the facade, clipped hedges in stone planters, low "
        "bollard lights, mature olive trees, a dark car on the driveway. The villa facade is lit "
        "from within, the bronze fins catching the last of the light."),

    (3, "Low approach at eye level straight toward the front entrance. The tall pivot door stands "
        "open with warm light spilling across the stone threshold. Bronze fins to one side, timber "
        "screen to the other, a glimpse of the oak-floored hall and a console with a vase inside."),

    (4, "Wide interior of the double-height living room at dusk. Deep linen sectional sofa, "
        "book-matched marble coffee table, large abstract artwork, floor-to-ceiling glazing "
        "looking out to the lit pool terrace and the city skyline, oak floor, sheer curtains, "
        "recessed cove lighting, a large fiddle-leaf fig."),

    (5, "Interior design detail: styled walnut shelving with integrated warm lighting, ceramics "
        "and stacked books, a sculptural floor lamp, a marble side table, layered wool rug on oak "
        "boards, the glazing and dusk city softly out of focus behind."),

    (6, "An open-plan working area within the same villa — a long walnut table used as a desk, "
        "leather chairs, integrated joinery wall, glazing to a courtyard, warm task lighting. "
        "Calm, corporate but domestic, the feel of a private studio."),

    (7, "A renovated wing of the same villa where original exposed structure meets new work: an "
        "old brick or board-marked concrete wall carefully restored, set against crisp new plaster, "
        "bronze-framed glazing and a new oak floor. Warm dusk light raking across the old surface."),

    (8, "Exterior terrace and landscape at dusk. Travertine paving meeting planted beds, sculptural "
        "specimen trees uplit from below, a long stone bench, clipped hedging, the villa's glazing "
        "glowing warm on the left, city towers lit behind."),

    (9, "A wide architectural vista straight down the length of the villa's open plan, from the "
        "entrance hall through living and dining to the glazing at the far end and the pool beyond. "
        "Perfectly symmetrical one-point perspective, every space furnished and lit, showing the "
        "whole plan at once."),

    (10, "The rear of the villa at night from across the swimming pool. The lit turquoise pool in "
         "the foreground with light strips glowing under the water, a timber pergola over an outdoor "
         "lounge to one side, sun loungers to the other, the fully glazed rear elevation of the villa "
         "glowing warm gold, the lit city skyline rising behind the garden wall."),
]


def build_prompt(desc):
    return f"{STYLE}\n\n{SUBJECT}\n\nThis frame: {desc}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", type=int, nargs="+", help="Shot numbers to (re)generate, e.g. --only 4 7")
    ap.add_argument("--flash", action="store_true", help="Use the faster/cheaper Nano Banana model")
    ap.add_argument("--dry-run", action="store_true", help="Print the prompts and exit")
    ap.add_argument("--out", type=str, default=str(OUT_DIR), help="Output directory")
    args = ap.parse_args()

    wanted = set(args.only) if args.only else {n for n, _ in SHOTS}
    todo = [(n, d) for n, d in SHOTS if n in wanted]
    if not todo:
        sys.exit("Nothing to do — check --only")

    if args.dry_run:
        for n, d in todo:
            print(f"\n===== shot-{n:02d} " + "=" * 52)
            print(build_prompt(d))
        return

    key = load_key()
    if not key:
        sys.exit("GEMINI_API_KEY not found. Put it in ~/.claude/.env or export it, then rerun.")

    try:
        from google import genai
        from google.genai import types
    except ImportError:
        sys.exit("google-genai is not installed. Run:  pip install google-genai pillow")
    try:
        from PIL import Image
    except ImportError:
        sys.exit("Pillow is not installed. Run:  pip install google-genai pillow")

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    client = genai.Client(api_key=key)
    model = MODEL_FLASH if args.flash else MODEL_PRO
    print(f"Model: {model}   Aspect: {ASPECT}   Shots: {[n for n, _ in todo]}\n")

    failures = []
    for n, desc in todo:
        print(f"[{n:02d}/10] generating…", flush=True)
        try:
            resp = client.models.generate_content(
                model=model,
                contents=build_prompt(desc),
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE", "TEXT"],
                    image_config=types.ImageConfig(aspect_ratio=ASPECT),
                ),
            )
            blob = None
            for cand in (resp.candidates or []):
                for part in (cand.content.parts or []):
                    if getattr(part, "inline_data", None) and part.inline_data.data:
                        blob = part.inline_data.data
                        break
                if blob:
                    break
            if not blob:
                failures.append((n, "no image in response"))
                print("        no image returned")
                continue

            img = Image.open(io.BytesIO(blob)).convert("RGB")
            if img.width > TARGET_W:
                img = img.resize((TARGET_W, round(img.height * TARGET_W / img.width)), Image.LANCZOS)
            path = out / f"shot-{n:02d}.jpg"
            img.save(path, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
            print(f"        {path.relative_to(ROOT)}  {img.width}x{img.height}  {path.stat().st_size // 1024} KB")
        except Exception as e:
            failures.append((n, str(e)))
            print(f"        failed: {e}")

    print()
    if failures:
        print("Failed:", ", ".join(f"shot-{n:02d} ({why})" for n, why in failures))
        print("Rerun just those with:  python tools/generate-flight-shots.py --only " +
              " ".join(str(n) for n, _ in failures))
    else:
        print("All done. Reload the page — index.html already points at these files.")


if __name__ == "__main__":
    main()
