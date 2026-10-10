"""Build the welcome page and operations app without external dependencies."""

import argparse
from html import escape
from pathlib import Path

SOURCE = Path(__file__).resolve().parent
JS_FILES = (
    "data.js", "core.js", "app.js", "views.js", "views2.js", "views3.js",
    "letters.js", "lex.js", "automatic-legal.js", "live-store.js", "live.js", "live-actions.js",
)


def build():
    html = (SOURCE / "index.src.html").read_text(encoding="utf-8")
    css = (SOURCE / "styles.css").read_text(encoding="utf-8")
    js = "\n".join((SOURCE / name).read_text(encoding="utf-8") for name in JS_FILES)
    js = js.replace("/*EMBLEM*/", (SOURCE / "logo_b64.txt").read_text(encoding="utf-8").strip())
    html = html.replace("/*FAV*/", (SOURCE / "fav_b64.txt").read_text(encoding="utf-8").strip())
    welcome = (SOURCE / "welcome.src.html").read_text(encoding="utf-8")
    return html.replace("/*CSS*/", css).replace("/*JS*/", js).replace("/*WELCOME*/", escape(welcome, quote=True))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, help="Build only the operations app to a custom path")
    parser.add_argument("--check", action="store_true", help="Check the existing output without writing it")
    args = parser.parse_args()
    content = build()
    outputs = {args.output: content} if args.output else {
        SOURCE.parent / "index.html": content,
        SOURCE.parent / "home.html": content,
    }
    for output, html in outputs.items():
        content = html.encode("utf-8")
        if args.check:
            if not output.is_file() or output.read_bytes() != content:
                parser.exit(1, f"{output.name} is missing or out of date. Run build.py.\n")
            print(f"OK: {output.name} matches its sources byte for byte")
        else:
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_bytes(content)
            print(f"Built {output} ({len(content)} bytes)")
