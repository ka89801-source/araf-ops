"""Build the supplied preview without dependencies or machine-specific paths."""

import argparse
from pathlib import Path

SOURCE = Path(__file__).resolve().parent
JS_FILES = (
    "data.js", "core.js", "app.js", "views.js", "views2.js", "views3.js",
    "letters.js", "lex.js",
)


def build():
    html = (SOURCE / "index.src.html").read_text(encoding="utf-8")
    css = (SOURCE / "styles.css").read_text(encoding="utf-8")
    js = "\n".join((SOURCE / name).read_text(encoding="utf-8") for name in JS_FILES)
    js = js.replace("/*EMBLEM*/", (SOURCE / "logo_b64.txt").read_text(encoding="utf-8").strip())
    html = html.replace("/*FAV*/", (SOURCE / "fav_b64.txt").read_text(encoding="utf-8").strip())
    return html.replace("/*CSS*/", css).replace("/*JS*/", js)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=SOURCE.parent / "index.html")
    parser.add_argument("--check", action="store_true", help="Check the existing output without writing it")
    args = parser.parse_args()
    content = build().encode("utf-8")
    if args.check:
        if not args.output.is_file() or args.output.read_bytes() != content:
            parser.exit(1, "Preview HTML is missing or out of date. Run build.py.\n")
        print("OK: preview HTML matches its sources byte for byte")
    else:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_bytes(content)
        print(f"Built {args.output} ({len(content)} bytes)")
