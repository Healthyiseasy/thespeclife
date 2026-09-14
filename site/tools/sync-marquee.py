#!/usr/bin/env python3
"""Regenerate the marquee's MIRROR list from its SOURCE list.

The top strip loops seamlessly by holding two identical copies of the name list
and translating the track -50%. Only the SOURCE copy is authored; this script
rewrites the MIRROR copy to match it.

    Edit:  the <ul> between <!-- MARQUEE:SOURCE --> and <!-- /MARQUEE:SOURCE -->
    Run:   python3 tools/sync-marquee.py

Build-time only. Nothing here is served to the browser.
"""

import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
PAGE = HERE.parent / "index.html"

SOURCE = re.compile(
    r"(<!-- MARQUEE:SOURCE -->\s*)(<ul class=\"marquee__list\">.*?</ul>)(\s*<!-- /MARQUEE:SOURCE -->)",
    re.S,
)
MIRROR = re.compile(
    r"(<!-- MARQUEE:MIRROR[^>]*-->\s*)(<ul class=\"marquee__list\">.*?</ul>)(\s*<!-- /MARQUEE:MIRROR -->)",
    re.S,
)


def main() -> int:
    html = PAGE.read_text(encoding="utf-8")

    src = SOURCE.search(html)
    if not src:
        print("error: MARQUEE:SOURCE markers not found in index.html", file=sys.stderr)
        return 1
    if not MIRROR.search(html):
        print("error: MARQUEE:MIRROR markers not found in index.html", file=sys.stderr)
        return 1

    source_list = src.group(2)
    updated = MIRROR.sub(
        lambda m: m.group(1) + source_list + m.group(3),
        html,
        count=1,
    )

    names = re.findall(r"<li>(.*?)</li>", source_list, re.S)

    if updated == html:
        print(f"already in sync — {len(names)} names")
        return 0

    PAGE.write_text(updated, encoding="utf-8")
    print(f"mirror updated — {len(names)} names")
    print("  first:", names[0].strip())
    print("  last: ", names[-1].strip())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
