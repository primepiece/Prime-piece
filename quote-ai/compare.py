"""
Quote Comparison Tool
Usage: python compare.py <ai_result.json> <actual_m2> <actual_edge_m>

Scores the AI result against what the real Moraware quote had.
Use this to track accuracy across your 50 test jobs.
"""

import sys
import json
from pathlib import Path


def score_job(ai_json_path: str, actual_m2: float, actual_edge_m: float, actual_cutouts: int = None):
    with open(ai_json_path) as f:
        result = json.load(f)

    summary = result.get("job_summary", {})
    ai_m2 = summary.get("total_stone_m2", 0)
    ai_edge = summary.get("total_edge_length_m", 0)
    ai_cutouts = summary.get("cutout_count", 0)

    m2_error = abs(ai_m2 - actual_m2) / actual_m2 * 100 if actual_m2 else 0
    edge_error = abs(ai_edge - actual_edge_m) / actual_edge_m * 100 if actual_edge_m else 0

    print(f"\nACCURACY REPORT: {Path(ai_json_path).name}")
    print("-" * 50)
    print(f"{'Metric':<20} {'AI':<12} {'Actual':<12} {'Error'}")
    print(f"{'Stone area (m²)':<20} {ai_m2:<12.2f} {actual_m2:<12.2f} {m2_error:.1f}%")
    print(f"{'Edge length (m)':<20} {ai_edge:<12.1f} {actual_edge_m:<12.1f} {edge_error:.1f}%")
    if actual_cutouts is not None:
        cutout_match = "✓" if ai_cutouts == actual_cutouts else f"✗ (AI got {ai_cutouts})"
        print(f"{'Cutouts':<20} {ai_cutouts:<12} {actual_cutouts:<12} {cutout_match}")

    unresolved = len(result.get("unresolved", []))
    flags = sum(len(b.get("flags", [])) for b in result.get("benchtops", []))
    flags += sum(len(c.get("flags", [])) for c in result.get("cutouts", []))
    print(f"\nUnresolved items flagged: {unresolved}")
    print(f"Total flags raised:       {flags}")

    overall = "PASS ✓" if m2_error < 10 and edge_error < 10 else "REVIEW NEEDED ⚠"
    print(f"\nOverall: {overall}  (within 10% tolerance)")

    return {"m2_error_pct": m2_error, "edge_error_pct": edge_error, "unresolved": unresolved}


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python compare.py <result.json> <actual_m2> <actual_edge_m> [actual_cutouts]")
        sys.exit(1)

    cutouts = int(sys.argv[4]) if len(sys.argv) > 4 else None
    score_job(sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), cutouts)
