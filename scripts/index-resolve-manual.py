#!/usr/bin/env python3
"""Extract DaVinci Resolve Reference Manual PDF into local searchable chunks.

Writes (gitignored) data/resolve-manual/:
  - manifest.json
  - chunks.jsonl  (one JSON object per line)

Usage:
  py -3 scripts/index-resolve-manual.py "C:\\path\\to\\DaVinci Resolve.pdf"
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:
    print("Install PyMuPDF: py -3 -m pip install pymupdf", file=sys.stderr)
    raise SystemExit(1)

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "data" / "resolve-manual"
CHUNK_CHARS = 1100
OVERLAP = 160


def normalize(text: str) -> str:
    text = text.replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def chunk_page(page_num: int, text: str) -> list[dict]:
    text = normalize(text)
    if len(text) < 40:
        return []
    chunks = []
    start = 0
    part = 0
    while start < len(text):
        end = min(len(text), start + CHUNK_CHARS)
        if end < len(text):
            # break on whitespace when possible
            cut = text.rfind(" ", start + CHUNK_CHARS // 2, end)
            if cut > start:
                end = cut
        piece = text[start:end].strip()
        if len(piece) >= 40:
            part += 1
            chunks.append(
                {
                    "id": f"p{page_num}-{part}",
                    "page": page_num,
                    "text": piece,
                }
            )
        if end >= len(text):
            break
        start = max(end - OVERLAP, start + 1)
    return chunks


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf", type=Path, help="Path to DaVinci Resolve Reference Manual PDF")
    ap.add_argument("--max-pages", type=int, default=0, help="Debug: stop after N pages")
    args = ap.parse_args()
    pdf = args.pdf.expanduser().resolve()
    if not pdf.is_file():
        print(f"PDF not found: {pdf}", file=sys.stderr)
        return 1

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    chunks_path = OUT_DIR / "chunks.jsonl"
    manifest_path = OUT_DIR / "manifest.json"

    doc = fitz.open(pdf)
    total = doc.page_count
    limit = min(total, args.max_pages) if args.max_pages else total
    print(f"Indexing {limit}/{total} pages from {pdf.name}...", flush=True)

    count = 0
    with chunks_path.open("w", encoding="utf-8") as out:
        for i in range(limit):
            page = doc.load_page(i)
            text = page.get_text("text") or ""
            # PDF page index is 0-based; manuals cite 1-based page numbers as printed.
            # We store PDF page number (1-based index in file) for "open to page".
            page_num = i + 1
            for ch in chunk_page(page_num, text):
                out.write(json.dumps(ch, ensure_ascii=False) + "\n")
                count += 1
            if (i + 1) % 100 == 0 or i + 1 == limit:
                print(f"  pages {i + 1}/{limit} -> {count} chunks", flush=True)

    doc.close()
    manifest = {
        "sourceFile": str(pdf),
        "sourceName": pdf.name,
        "pageCount": limit,
        "chunkCount": count,
        "manualLabel": "DaVinci Resolve Reference Manual",
        "indexedWith": "pymupdf",
    }
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Done. {count} chunks -> {chunks_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
