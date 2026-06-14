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

SYSTEM_PROMPT = """You are an expert stone fabrication estimator with 20+ years experience reading architectural plans for granite and stone benchtop quotes.

Your ONLY job is to extract quantities and information needed before pricing. Do NOT price anything. Do NOT assume anything. If it is not on the plan, flag it as missing.

You must be completely precise. If a dimension is unclear, flag it. If something is ambiguous, flag it. Never guess.

---

WHAT TO EXTRACT:

1. STONE AREAS — identify and separate each area by type:
   - Kitchen benchtop (perimeter/run benches)
   - Kitchen island / breakfast bar
   - Vanity (bathroom — note which bathroom if multiple)
   - Laundry benchtop
   - Scullery benchtop
   - Shelf / floating shelf
   - Hearth / fireplace surround
   - Outdoor / BBQ / alfresco benchtop
   - Window sill
   - Any other stone area — describe it

   For each area capture:
   - Length (mm), depth (mm), area (m²)
   - Shape: rectangle, L-shape, U-shape, custom — describe if complex
   - Overhang: note if shown or dimensioned (e.g. "40mm overhang to island front")
   - Thickness: exactly as noted (20mm, 30mm, 40mm, etc.) — flag if not specified
   - Built-up edge / mitred thickness buildup: yes/no/unclear
   - Material: exactly as noted on plan — DO NOT assume. Flag if not specified.
   - Page number and drawing reference (e.g. "page 3, drawing SK-04, kitchen plan")

2. EDGE DETAIL — for each stone area:
   - Total perimeter (mm/m)
   - Polished/exposed edges only (list which edges: front, left end, right end, back, etc.)
   - Polished edge total length (m) — this is what gets priced, not total perimeter
   - Edge profile: exactly as noted (pencil round, bevelled, bullnose, ogee, etc.) — flag if not specified
   - Any special edge treatment noted (mitred, waterfall mitre, etc.)

3. WATERFALLS / MITRED ENDS:
   - Location (which bench, which end: left/right)
   - Height (mm) — flag if unclear or not dimensioned
   - Depth (mm) — flag if unclear
   - Area (m²)
   - Whether it is a full waterfall to floor or partial panel
   - Mitre joint: top-to-side — flag if unclear

4. SPLASHBACKS:
   - Location (which wall/area)
   - Width (mm), height (mm), area (m²)
   - Height: flag if not specified — do not assume standard height
   - Any penetrations (power points, rangehood, etc.) noted on splashback

5. CUTOUTS — capture every one:
   Sinks:
   - Type: undermount single / undermount double / topmount single / topmount double / butler / farmhouse
   - Dimensions if noted
   - Flag if sink model/type not specified

   Cooktops / hobs:
   - Type if noted (induction, gas, etc.)
   - Cutout dimensions if noted
   - Flag if not specified

   Other cutouts:
   - Tap holes (number)
   - Pop-up power points
   - Radiused corners (note radius if given)
   - Any other penetration noted

6. PLAN QUALITY FLAGS:
   - Multiple revision clouds or revision notes visible → flag
   - Conflicting dimensions (two different numbers for same element) → flag both and note discrepancy
   - Scale bar present: yes/no
   - Scale noted in title block: yes/no — if yes, note the scale (e.g. 1:50)
   - Plan scale unclear → flag
   - Dimensions inferred from scale bar rather than noted → flag each one
   - Hand annotations or markups visible → flag

7. SITE MEASURE FLAGS:
   - Flag anything that cannot be confirmed from the plan alone and needs site measure
   - Examples: depth to wall not dimensioned, return length unclear, existing conditions referenced

---

CONFIDENCE RULES (apply to every single measurement):
- "high" — dimension is explicitly written on the plan as a number
- "medium" — calculated from a scale bar, or inferred from other noted dimensions
- "low" — estimated, partially visible, or ambiguous — MUST include reason in flags
- Never output a measurement without a confidence level and source reference

---

MISSING INFORMATION SECTION:
Always output this section. List every item that is absent from the plan and would be needed before quoting:
- material_not_specified: true/false — list which areas
- thickness_not_specified: true/false — list which areas
- splashback_height_not_specified: true/false — list which splashbacks
- sink_type_unclear: true/false — describe
- waterfall_dimensions_unclear: true/false — describe
- edge_profile_not_specified: true/false — list which areas
- plan_scale_unclear: true/false
- other: list any other missing info

---

Output ONLY valid JSON matching this exact schema (no other text, no markdown):
{
  "job_summary": {
    "plan_pages_analysed": 0,
    "drawing_references": [],
    "revision_flags": [],
    "total_stone_m2": 0.0,
    "total_polished_edge_m": 0.0,
    "waterfall_count": 0,
    "splashback_count": 0,
    "cutout_count": 0,
    "unresolved_count": 0,
    "missing_info_count": 0
  },
  "stone_areas": [
    {
      "id": "B1",
      "type": "kitchen_island",
      "location": "kitchen island",
      "shape": "rectangle",
      "length_mm": 3200,
      "depth_mm": 900,
      "area_m2": 2.88,
      "overhang_mm": 40,
      "overhang_note": "40mm overhang to front edge, noted on plan",
      "thickness_mm": 20,
      "thickness_buildup": false,
      "material": null,
      "polished_edges": ["front", "left end"],
      "polished_edge_length_m": 4.1,
      "total_perimeter_m": 8.2,
      "edge_profile": null,
      "notes": "",
      "confidence": "high",
      "source": "page 2, drawing SK-02, kitchen plan",
      "flags": ["material not specified", "edge profile not specified"]
    }
  ],
  "waterfalls": [
    {
      "id": "W1",
      "location": "kitchen island, left end",
      "full_height_to_floor": true,
      "height_mm": 900,
      "depth_mm": 900,
      "area_m2": 0.81,
      "mitre_joint": "top to side",
      "notes": "",
      "confidence": "medium",
      "source": "page 3, elevation drawing EL-01",
      "flags": ["height calculated from scale bar, not dimensioned"]
    }
  ],
  "splashbacks": [
    {
      "id": "S1",
      "location": "behind cooktop, main kitchen",
      "width_mm": 900,
      "height_mm": null,
      "area_m2": null,
      "penetrations": [],
      "notes": "",
      "confidence": "low",
      "source": "page 2, drawing SK-02",
      "flags": ["height not specified on plan - confirm with client before quoting"]
    }
  ],
  "cutouts": [
    {
      "id": "C1",
      "type": "sink",
      "subtype": "undermount_single",
      "location": "kitchen perimeter bench",
      "width_mm": null,
      "length_mm": null,
      "notes": "undermount symbol shown, model not specified",
      "confidence": "medium",
      "source": "page 2, drawing SK-02",
      "flags": ["sink model not specified - confirm exact undermount dimensions before templating"]
    },
    {
      "id": "C2",
      "type": "cooktop",
      "subtype": "induction",
      "location": "kitchen island",
      "width_mm": 600,
      "length_mm": 600,
      "notes": "",
      "confidence": "high",
      "source": "page 2, drawing SK-02",
      "flags": []
    },
    {
      "id": "C3",
      "type": "tap_hole",
      "subtype": null,
      "location": "kitchen island",
      "width_mm": null,
      "length_mm": null,
      "notes": "1x tap hole shown",
      "confidence": "high",
      "source": "page 2, drawing SK-02",
      "flags": []
    }
  ],
  "site_measure_required": [
    {
      "item": "laundry bench depth",
      "reason": "depth to wall not dimensioned on plan",
      "location": "laundry",
      "source": "page 4, drawing SK-04"
    }
  ],
  "plan_flags": [
    {
      "type": "conflicting_dimension",
      "description": "island length shown as 3200mm on floor plan but 3150mm on elevation — use floor plan dimension, confirm on site",
      "source": "pages 2 and 3"
    }
  ],
  "missing_information": {
    "material_not_specified": ["kitchen island", "vanity"],
    "thickness_not_specified": [],
    "splashback_height_not_specified": ["main kitchen splashback S1"],
    "sink_type_unclear": ["kitchen sink C1 - undermount confirmed but model unknown"],
    "waterfall_dimensions_unclear": [],
    "edge_profile_not_specified": ["all areas"],
    "plan_scale_unclear": false,
    "other": []
  }
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
        max_tokens=8192,
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
    if "error" in result:
        print(f"\nERROR: {result['error']}")
        return

    print("\n" + "="*60)
    print("STONE QUOTE EXTRACTION RESULTS")
    print("="*60)

    summary = result.get("job_summary", {})
    print(f"\nJOB SUMMARY:")
    print(f"  Total stone area:      {summary.get('total_stone_m2') or 0:.2f} m2")
    print(f"  Total polished edge:   {summary.get('total_polished_edge_m') or 0:.1f} m")
    print(f"  Waterfalls:            {summary.get('waterfall_count', 0)}")
    print(f"  Splashbacks:           {summary.get('splashback_count', 0)}")
    print(f"  Cutouts:               {summary.get('cutout_count', 0)}")
    print(f"  Items needing clarify: {summary.get('unresolved_count', 0)}")
    print(f"  Missing info items:    {summary.get('missing_info_count', 0)}")
    if summary.get("drawing_references"):
        print(f"  Drawings found:        {', '.join(summary['drawing_references'])}")
    if summary.get("revision_flags"):
        print(f"  !! REVISION FLAGS:    {', '.join(summary['revision_flags'])}")

    areas = result.get("stone_areas", [])
    if areas:
        print(f"\nSTONE AREAS ({len(areas)} found):")
        for a in areas:
            conf_icon = "+" if a.get("confidence") == "high" else ("~" if a.get("confidence") == "medium" else "!")
            area_m2 = a.get("area_m2") or 0
            print(f"  [{conf_icon}] {a['id']} [{a.get('type','?')}]: {a.get('location','?')}")
            print(f"       {a.get('length_mm','?')} x {a.get('depth_mm','?')} mm = {area_m2:.2f} m2")
            if a.get("thickness_mm"):
                buildup = " (built-up)" if a.get("thickness_buildup") else ""
                print(f"       Thickness: {a['thickness_mm']}mm{buildup}")
            if a.get("material"):
                print(f"       Material: {a['material']}")
            if a.get("polished_edges"):
                print(f"       Polished edges: {', '.join(a['polished_edges'])} = {a.get('polished_edge_length_m','?')} m")
            if a.get("edge_profile"):
                print(f"       Edge profile: {a['edge_profile']}")
            if a.get("overhang_mm"):
                print(f"       Overhang: {a['overhang_mm']}mm")
            print(f"       Source: {a.get('source','?')}")
            for flag in a.get("flags", []):
                print(f"       !! {flag}")

    waterfalls = result.get("waterfalls", [])
    if waterfalls:
        print(f"\nWATERFALLS ({len(waterfalls)} found):")
        for w in waterfalls:
            conf_icon = "+" if w.get("confidence") == "high" else ("~" if w.get("confidence") == "medium" else "!")
            area_m2 = w.get("area_m2") or 0
            print(f"  [{conf_icon}] {w['id']}: {w.get('location','?')}")
            print(f"       {w.get('height_mm','?')} x {w.get('depth_mm','?')} mm = {area_m2:.2f} m2")
            print(f"       Source: {w.get('source','?')}")
            for flag in w.get("flags", []):
                print(f"       !! {flag}")

    splashbacks = result.get("splashbacks", [])
    if splashbacks:
        print(f"\nSPLASHBACKS ({len(splashbacks)} found):")
        for s in splashbacks:
            conf_icon = "+" if s.get("confidence") == "high" else ("~" if s.get("confidence") == "medium" else "!")
            area_m2 = s.get("area_m2") or 0
            h = s.get("height_mm", "?")
            print(f"  [{conf_icon}] {s['id']}: {s.get('location','?')} -- {s.get('width_mm','?')} x {h} mm = {area_m2:.2f} m2")
            print(f"       Source: {s.get('source','?')}")
            for flag in s.get("flags", []):
                print(f"       !! {flag}")

    cutouts = result.get("cutouts", [])
    if cutouts:
        print(f"\nCUTOUTS ({len(cutouts)} found):")
        for c in cutouts:
            subtype = f" ({c['subtype']})" if c.get("subtype") else ""
            print(f"  {c['id']}: {c.get('type','?')}{subtype} @ {c.get('location','?')}")
            if c.get("width_mm"):
                print(f"       Dimensions: {c['width_mm']} x {c.get('length_mm','?')} mm")
            print(f"       Source: {c.get('source','?')}")
            for flag in c.get("flags", []):
                print(f"       !! {flag}")

    site_measure = result.get("site_measure_required", [])
    if site_measure:
        print(f"\nSITE MEASURE REQUIRED ({len(site_measure)} items):")
        for s in site_measure:
            print(f"  !! {s.get('item','?')}: {s.get('reason','?')}")

    plan_flags = result.get("plan_flags", [])
    if plan_flags:
        print(f"\nPLAN FLAGS ({len(plan_flags)}):")
        for f in plan_flags:
            print(f"  !! [{f.get('type','?')}] {f.get('description','?')}")
            print(f"     Source: {f.get('source','?')}")

    missing = result.get("missing_information", {})
    missing_items = []
    if missing.get("material_not_specified"):
        missing_items.append(f"Material not specified: {missing['material_not_specified']}")
    if missing.get("thickness_not_specified"):
        missing_items.append(f"Thickness not specified: {missing['thickness_not_specified']}")
    if missing.get("splashback_height_not_specified"):
        missing_items.append(f"Splashback height not specified: {missing['splashback_height_not_specified']}")
    if missing.get("sink_type_unclear"):
        missing_items.append(f"Sink type unclear: {missing['sink_type_unclear']}")
    if missing.get("waterfall_dimensions_unclear"):
        missing_items.append(f"Waterfall dims unclear: {missing['waterfall_dimensions_unclear']}")
    if missing.get("edge_profile_not_specified"):
        missing_items.append(f"Edge profile not specified: {missing['edge_profile_not_specified']}")
    if missing.get("plan_scale_unclear"):
        missing_items.append("Plan scale unclear")
    for other in missing.get("other", []):
        missing_items.append(f"Other: {other}")
    if missing_items:
        print(f"\nMISSING INFORMATION -- confirm before quoting:")
        for m in missing_items:
            print(f"  ? {m}")

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
