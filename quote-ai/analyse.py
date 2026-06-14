"""
Stone Quote AI - Core Prototype
Usage: python analyse.py <plan.pdf> [--output results.json]

Extracts all stone measurements from an architectural plan PDF
and outputs a structured quote ready to compare against Moraware.
"""

import sys
import os
import json
import base64
import argparse
from pathlib import Path
from datetime import datetime

import fitz  # pymupdf
from PIL import Image
import io
import anthropic
from dotenv import load_dotenv

load_dotenv()

SYSTEM_PROMPT = """You are an expert stone fabrication estimator with 20+ years experience reading architectural plans for granite/stone benchtop quotes.

Your job: extract EVERY piece of information needed to quote stone work from this plan.

You must be precise and never guess. If a dimension is unclear, flag it.

Extract:
1. All benchtop/countertop areas (location, length mm, depth mm, shape)
2. Waterfall ends (location, height mm)
3. Splashbacks (location, width mm, height mm)
4. Edge lengths per edge type (standard, waterfall, exposed)
5. Cutouts: sinks (single/double/undermount), cooktops (size), taps
6. Stone thickness (20mm, 30mm, 40mm or noted)
7. Any pricing notes (mitre joins, special edges, radius corners, etc.)
8. Which page/area of the plan each item was found

RULES:
- If a dimension is explicitly written on the plan → confidence: high
- If you calculated from scale bar → confidence: medium, flag it
- If you estimated or inferred → confidence: low, MUST flag with reason
- If totally unclear → list it as unresolved, do not guess
- Report all dimensions in millimetres
- Calculate m² for each area (length × depth / 1,000,000)

Output ONLY valid JSON matching this exact schema:
{
  "job_summary": {
    "total_stone_m2": 0.0,
    "total_edge_length_m": 0.0,
    "waterfall_count": 0,
    "splashback_count": 0,
    "cutout_count": 0,
    "plan_pages_analysed": 0,
    "unresolved_items": 0
  },
  "benchtops": [
    {
      "id": "B1",
      "location": "kitchen island",
      "shape": "rectangle",
      "length_mm": 3200,
      "depth_mm": 900,
      "area_m2": 2.88,
      "thickness_mm": 20,
      "edge_type": "standard",
      "exposed_edges": ["front", "left end"],
      "edge_length_m": 4.1,
      "notes": "",
      "confidence": "high",
      "source": "page 2, kitchen plan, dimension noted as 3200 x 900",
      "flags": []
    }
  ],
  "waterfalls": [
    {
      "id": "W1",
      "location": "island left end",
      "height_mm": 900,
      "depth_mm": 700,
      "area_m2": 0.63,
      "notes": "",
      "confidence": "high",
      "source": "page 2, elevation drawing",
      "flags": []
    }
  ],
  "splashbacks": [
    {
      "id": "S1",
      "location": "behind cooktop",
      "width_mm": 900,
      "height_mm": 600,
      "area_m2": 0.54,
      "notes": "",
      "confidence": "high",
      "source": "page 3, kitchen elevation",
      "flags": []
    }
  ],
  "cutouts": [
    {
      "id": "C1",
      "type": "sink_undermount_single",
      "location": "main kitchen bench",
      "width_mm": 450,
      "length_mm": 380,
      "notes": "undermount, verify exact model with client",
      "confidence": "medium",
      "source": "page 2, symbol noted",
      "flags": ["sink model not specified - confirm undermount dimensions"]
    }
  ],
  "unresolved": [
    {
      "item": "window sill",
      "reason": "dimension not noted on plan, scale bar measurement inconsistent",
      "page": "page 4",
      "action_needed": "measure on site or confirm with builder"
    }
  ],
  "pricing_notes": [
    "mitre join required at corner B1/B2",
    "radius corner noted on island bench - confirm radius with client"
  ]
}"""


def pdf_to_images(pdf_path: str, dpi: int = 200) -> list[dict]:
    """Convert each PDF page to a base64 image for the vision model."""
    doc = fitz.open(pdf_path)
    pages = []

    for page_num, page in enumerate(doc):
        mat = fitz.Matrix(dpi / 72, dpi / 72)
        pix = page.get_pixmap(matrix=mat)
        img_data = pix.tobytes("png")

        # Resize if too large (Claude has image size limits)
        img = Image.open(io.BytesIO(img_data))
        max_dim = 4096
        if max(img.size) > max_dim:
            ratio = max_dim / max(img.size)
            new_size = (int(img.size[0] * ratio), int(img.size[1] * ratio))
            img = img.resize(new_size, Image.LANCZOS)
            buf = io.BytesIO()
            img.save(buf, format="PNG")
            img_data = buf.getvalue()

        b64 = base64.standard_b64encode(img_data).decode("utf-8")
        pages.append({
            "page_num": page_num + 1,
            "width": img.size[0],
            "height": img.size[1],
            "b64": b64
        })
        print(f"  Converted page {page_num + 1} ({img.size[0]}x{img.size[1]}px)")

    doc.close()
    return pages


def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract any machine-readable text from PDF (CAD exports often have this)."""
    doc = fitz.open(pdf_path)
    text_parts = []
    for page_num, page in enumerate(doc):
        text = page.get_text()
        if text.strip():
            text_parts.append(f"--- Page {page_num + 1} text ---\n{text}")
    doc.close()
    return "\n".join(text_parts) if text_parts else ""


def analyse_plan(pdf_path: str, api_key: str) -> dict:
    """Core analysis function - sends plan to Claude and returns structured quote."""

    client = anthropic.Anthropic(api_key=api_key)

    print(f"\nLoading PDF: {pdf_path}")
    pages = pdf_to_images(pdf_path)
    print(f"Extracted {len(pages)} page(s)")

    # Also try to get machine-readable text (helps with CAD PDFs)
    pdf_text = extract_text_from_pdf(pdf_path)
    if pdf_text:
        print(f"Found machine-readable text ({len(pdf_text)} chars) - will include for accuracy")

    # Build message content - all pages as images
    content = []

    for page in pages:
        content.append({
            "type": "text",
            "text": f"Page {page['page_num']} of {len(pages)}:"
        })
        content.append({
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": "image/png",
                "data": page["b64"]
            }
        })

    # Add extracted text if available
    if pdf_text:
        content.append({
            "type": "text",
            "text": f"\nMachine-readable text extracted from PDF (use this to verify dimensions):\n{pdf_text}"
        })

    content.append({
        "type": "text",
        "text": "\nAnalyse this stone fabrication plan. Extract all information needed for a stone quote. Output ONLY the JSON as specified - no other text."
    })

    print(f"\nSending to Claude for analysis...")

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": content}]
    )

    raw = response.content[0].text.strip()

    # Strip markdown code blocks if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()

    try:
        result = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"WARNING: Could not parse JSON response: {e}")
        print("Raw response saved to debug_response.txt")
        with open("debug_response.txt", "w") as f:
            f.write(raw)
        result = {"error": "parse_failed", "raw": raw}

    # Add metadata
    result["_meta"] = {
        "pdf_file": str(Path(pdf_path).name),
        "pages_processed": len(pages),
        "analysed_at": datetime.now().isoformat(),
        "model": "claude-sonnet-4-6",
        "had_machine_text": bool(pdf_text)
    }

    return result


def print_summary(result: dict):
    """Print a human-readable summary to terminal."""

    if "error" in result:
        print(f"\nERROR: {result['error']}")
        return

    print("\n" + "="*60)
    print("STONE QUOTE EXTRACTION RESULTS")
    print("="*60)

    summary = result.get("job_summary", {})
    print(f"\nJOB SUMMARY:")
    print(f"  Total stone area:    {summary.get('total_stone_m2', 0):.2f} m²")
    print(f"  Total edge length:   {summary.get('total_edge_length_m', 0):.1f} m")
    print(f"  Waterfalls:          {summary.get('waterfall_count', 0)}")
    print(f"  Splashbacks:         {summary.get('splashback_count', 0)}")
    print(f"  Cutouts:             {summary.get('cutout_count', 0)}")
    print(f"  Unresolved items:    {summary.get('unresolved_items', 0)}")

    benchtops = result.get("benchtops", [])
    if benchtops:
        print(f"\nBENCHTOPS ({len(benchtops)} found):")
        for b in benchtops:
            flag_str = " ⚠ FLAGS: " + ", ".join(b.get("flags", [])) if b.get("flags") else ""
            conf_icon = "✓" if b.get("confidence") == "high" else ("~" if b.get("confidence") == "medium" else "!")
            print(f"  [{conf_icon}] {b['id']}: {b.get('location','?')}")
            print(f"       {b.get('length_mm','?')} x {b.get('depth_mm','?')} mm = {b.get('area_m2','?'):.2f} m²  |  edge: {b.get('edge_length_m','?')} m")
            print(f"       Source: {b.get('source','?')}{flag_str}")

    waterfalls = result.get("waterfalls", [])
    if waterfalls:
        print(f"\nWATERFALLS ({len(waterfalls)} found):")
        for w in waterfalls:
            print(f"  {w['id']}: {w.get('location','?')} - {w.get('height_mm','?')} x {w.get('depth_mm','?')} mm = {w.get('area_m2','?'):.2f} m²")

    splashbacks = result.get("splashbacks", [])
    if splashbacks:
        print(f"\nSPLASHBACKS ({len(splashbacks)} found):")
        for s in splashbacks:
            print(f"  {s['id']}: {s.get('location','?')} - {s.get('width_mm','?')} x {s.get('height_mm','?')} mm = {s.get('area_m2','?'):.2f} m²")

    cutouts = result.get("cutouts", [])
    if cutouts:
        print(f"\nCUTOUTS ({len(cutouts)} found):")
        for c in cutouts:
            flags = " ⚠ " + ", ".join(c.get("flags", [])) if c.get("flags") else ""
            print(f"  {c['id']}: {c.get('type','?')} @ {c.get('location','?')}{flags}")

    unresolved = result.get("unresolved", [])
    if unresolved:
        print(f"\nUNRESOLVED - NEEDS MANUAL CHECK ({len(unresolved)} items):")
        for u in unresolved:
            print(f"  ⚠  {u.get('item','?')}: {u.get('reason','?')}")
            print(f"     Action: {u.get('action_needed','?')}")

    notes = result.get("pricing_notes", [])
    if notes:
        print(f"\nPRICING NOTES:")
        for n in notes:
            print(f"  • {n}")

    meta = result.get("_meta", {})
    print(f"\n{'='*60}")
    print(f"Analysed: {meta.get('pdf_file','?')}  |  {meta.get('pages_processed','?')} page(s)  |  {meta.get('analysed_at','?')[:19]}")
    print("="*60)


def main():
    parser = argparse.ArgumentParser(description="Extract stone quote from architectural PDF")
    parser.add_argument("pdf", help="Path to the PDF plan file")
    parser.add_argument("--output", "-o", help="Save full JSON results to this file")
    parser.add_argument("--api-key", help="Anthropic API key (or set ANTHROPIC_API_KEY env var)")
    args = parser.parse_args()

    api_key = args.api_key or os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERROR: No API key. Set ANTHROPIC_API_KEY in .env or pass --api-key")
        sys.exit(1)

    if not Path(args.pdf).exists():
        print(f"ERROR: File not found: {args.pdf}")
        sys.exit(1)

    result = analyse_plan(args.pdf, api_key)

    print_summary(result)

    output_path = args.output or f"quote_{Path(args.pdf).stem}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(output_path, "w") as f:
        json.dump(result, f, indent=2)
    print(f"\nFull results saved to: {output_path}")


if __name__ == "__main__":
    main()
