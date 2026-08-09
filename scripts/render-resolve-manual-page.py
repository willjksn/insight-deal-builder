#!/usr/bin/env python3
"""Render one page of the indexed Resolve manual PDF to a PNG (cached)."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

try:
    import pymupdf
except ImportError:
    try:
        import fitz as pymupdf  # type: ignore
    except ImportError:
        print("Install PyMuPDF: py -3 -m pip install pymupdf", file=sys.stderr)
        raise SystemExit(1)

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "resolve-manual"
MANIFEST = DATA / "manifest.json"
CACHE = DATA / "pages"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("page", type=int, help="1-based PDF page number")
    ap.add_argument("--dpi", type=float, default=200.0)
    ap.add_argument("--out", type=Path, default=None, help="Output PNG path")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    if args.page < 1:
        print("page must be >= 1", file=sys.stderr)
        return 1
    if not MANIFEST.is_file():
        print("manifest missing — index the manual first", file=sys.stderr)
        return 1

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    pdf_path = Path(manifest.get("sourceFile") or "")
    if not pdf_path.is_file():
        print(f"PDF not found: {pdf_path}", file=sys.stderr)
        return 1

    CACHE.mkdir(parents=True, exist_ok=True)
    dpi_tag = int(round(args.dpi))
    out = Path(args.out) if args.out else CACHE / f"page-{args.page}-dpi{dpi_tag}.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    if out.is_file() and not args.force:
        print(str(out))
        return 0

    doc = pymupdf.open(pdf_path)
    try:
        if args.page > doc.page_count:
            print(f"page {args.page} out of range (max {doc.page_count})", file=sys.stderr)
            return 1
        page = doc.load_page(args.page - 1)
        zoom = max(0.5, min(3.5, args.dpi / 72.0))
        pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), alpha=False)
        pix.save(str(out))
    finally:
        doc.close()

    print(str(out))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
