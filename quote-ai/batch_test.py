"""
Batch Test Runner
Usage: python batch_test.py jobs.csv

CSV format:
  pdf_path, actual_m2, actual_edge_m, actual_cutouts, job_name

Runs all jobs and produces an accuracy summary report.
"""

import sys
import csv
import json
import os
import time
from pathlib import Path
from datetime import datetime
from analyse import analyse_plan
from dotenv import load_dotenv

load_dotenv()


def run_batch(csv_path: str):
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERROR: Set ANTHROPIC_API_KEY in .env")
        sys.exit(1)

    results = []
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_dir = Path(f"batch_results_{timestamp}")
    output_dir.mkdir(exist_ok=True)

    with open(csv_path) as f:
        reader = csv.DictReader(f)
        jobs = list(reader)

    print(f"Running {len(jobs)} jobs...")

    for i, job in enumerate(jobs):
        pdf = job["pdf_path"].strip()
        actual_m2 = float(job["actual_m2"])
        actual_edge = float(job["actual_edge_m"])
        actual_cutouts = int(job.get("actual_cutouts", 0))
        job_name = job.get("job_name", Path(pdf).stem)

        print(f"\n[{i+1}/{len(jobs)}] {job_name}")

        try:
            result = analyse_plan(pdf, api_key)
            summary = result.get("job_summary", {})

            ai_m2 = summary.get("total_stone_m2", 0)
            ai_edge = summary.get("total_edge_length_m", 0)
            ai_cutouts = summary.get("cutout_count", 0)

            m2_error = abs(ai_m2 - actual_m2) / actual_m2 * 100 if actual_m2 else 0
            edge_error = abs(ai_edge - actual_edge) / actual_edge * 100 if actual_edge else 0
            cutout_match = ai_cutouts == actual_cutouts

            out_path = output_dir / f"{job_name}_{i+1}.json"
            with open(out_path, "w") as f:
                json.dump(result, f, indent=2)

            results.append({
                "job": job_name,
                "m2_error_pct": round(m2_error, 1),
                "edge_error_pct": round(edge_error, 1),
                "cutout_match": cutout_match,
                "unresolved": len(result.get("unresolved", [])),
                "pass": m2_error < 10 and edge_error < 10,
                "output_file": str(out_path)
            })

            status = "PASS ✓" if m2_error < 10 and edge_error < 10 else "REVIEW ⚠"
            print(f"  {status}  m²: {m2_error:.1f}% error  |  edge: {edge_error:.1f}% error")

        except Exception as e:
            print(f"  ERROR: {e}")
            results.append({"job": job_name, "error": str(e), "pass": False})

        # Rate limit buffer
        if i < len(jobs) - 1:
            time.sleep(2)

    # Summary report
    passed = sum(1 for r in results if r.get("pass"))
    total = len(results)
    avg_m2_error = sum(r.get("m2_error_pct", 0) for r in results if "m2_error_pct" in r) / max(total, 1)
    avg_edge_error = sum(r.get("edge_error_pct", 0) for r in results if "edge_error_pct" in r) / max(total, 1)

    print(f"\n{'='*60}")
    print(f"BATCH RESULTS: {passed}/{total} passed (within 10% tolerance)")
    print(f"Average m² error:   {avg_m2_error:.1f}%")
    print(f"Average edge error: {avg_edge_error:.1f}%")
    print(f"{'='*60}")

    report_path = output_dir / "summary.json"
    with open(report_path, "w") as f:
        json.dump({"summary": {"passed": passed, "total": total,
                               "avg_m2_error_pct": avg_m2_error,
                               "avg_edge_error_pct": avg_edge_error},
                   "jobs": results}, f, indent=2)
    print(f"Full report: {report_path}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python batch_test.py jobs.csv")
        sys.exit(1)
    run_batch(sys.argv[1])
