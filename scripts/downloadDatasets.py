#!/usr/bin/env python3
"""
Download RAGTruth + HaluBench from HuggingFace (Parquet) and convert
to Quorum benchmark format.

Usage: python scripts/downloadDatasets.py [--ragtruth N] [--halubench N]

Defaults: 2500 from each (5000 total).
Outputs:
  backend/data/ragtruth_2500.json
  backend/data/halubench_2500.json
  backend/data/benchmark_5000.json  (combined, shuffled)
"""

import argparse
import json
import os
import random
import sys
import tempfile
import urllib.request
from pathlib import Path

import pandas as pd

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR.parent / "backend" / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

RAGTRUTH_PARQUET = "https://huggingface.co/datasets/wandb/RAGTruth-processed/resolve/refs%2Fconvert%2Fparquet/default/train/0000.parquet"
HALUBENCH_PARQUET = "https://huggingface.co/datasets/PatronusAI/HaluBench/resolve/refs%2Fconvert%2Fparquet/default/test/0000.parquet"

RAGTRUTH_TASK_DOMAIN = {
    "Summary": "general",
    "QA": "general",
    "Data2txt": "technical",
}

HALUBENCH_DOMAIN = {
    "FinanceBench": "financial",
    "PubMedQA": "medical",
    "CovidQA": "medical",
    "DROP": "general",
    "HaluEval": "general",
    "RAGTruth": "general",
}


def download_parquet(url: str, label: str) -> pd.DataFrame:
    print(f"  Downloading {label} parquet...")
    with tempfile.NamedTemporaryFile(suffix=".parquet", delete=False) as f:
        tmp_path = f.name
    try:
        urllib.request.urlretrieve(url, tmp_path)
        df = pd.read_parquet(tmp_path)
        print(f"  Downloaded: {len(df)} rows")
        return df
    finally:
        os.unlink(tmp_path)


def stratified_sample(df: pd.DataFrame, n: int, label_col: str) -> pd.DataFrame:
    pass_df = df[df[label_col] == "PASS"]
    fail_df = df[df[label_col] == "FAIL"]

    fail_ratio = len(fail_df) / len(df)
    target_fail = round(n * max(0.35, min(0.50, fail_ratio)))
    target_pass = n - target_fail

    actual_pass = min(target_pass, len(pass_df))
    actual_fail = min(target_fail, len(fail_df))

    sampled = pd.concat([
        pass_df.sample(n=actual_pass, random_state=42),
        fail_df.sample(n=actual_fail, random_state=42),
    ]).sample(frac=1, random_state=42).reset_index(drop=True)

    return sampled


# ── RAGTruth conversion ─────────────────────────────────────────────────────

def ragtruth_verdict(row) -> str:
    labels = row.get("hallucination_labels_processed", {})
    if isinstance(labels, str):
        import ast
        labels = ast.literal_eval(labels) if labels else {}
    ec = labels.get("evident_conflict", 0) or 0
    bi = labels.get("baseless_info", 0) or 0
    return "FAIL" if (ec > 0 or bi > 0) else "PASS"


def convert_ragtruth(df: pd.DataFrame) -> list[dict]:
    cases = []
    for idx, row in df.iterrows():
        labels = row.get("hallucination_labels_processed", {})
        if isinstance(labels, str):
            import ast
            labels = ast.literal_eval(labels) if labels else {}
        ec = labels.get("evident_conflict", 0) or 0
        bi = labels.get("baseless_info", 0) or 0
        has_hal = ec > 0 or bi > 0
        verdict = "FAIL" if has_hal else "PASS"

        if has_hal:
            if ec > 0 and bi > 0:
                fm = "mixed_hallucination"
            elif ec > 0:
                fm = "evident_conflict"
            else:
                fm = "baseless_info"
        else:
            fm = "correct"

        cases.append({
            "id": f"ragtruth-{len(cases)+1:05d}",
            "domain": RAGTRUTH_TASK_DOMAIN.get(row.get("task_type", ""), "general"),
            "difficulty": "medium",
            "input": row.get("query", ""),
            "actualOutput": row.get("output", ""),
            "retrievalContext": [row.get("context", "")],
            "humanVerdict": verdict,
            "humanRationale": (
                f"RAGTruth: {fm} (ec={ec}, bi={bi})"
                if has_hal else
                "RAGTruth: no hallucination detected by human annotators"
            ),
            "failureMode": fm,
            "source": "ragtruth",
            "sourceModel": row.get("model", ""),
            "taskType": row.get("task_type", ""),
        })
    return cases


# ── HaluBench conversion ────────────────────────────────────────────────────

def convert_halubench(df: pd.DataFrame) -> list[dict]:
    cases = []
    for _, row in df.iterrows():
        verdict = "PASS" if row.get("label") == "PASS" else "FAIL"
        src = row.get("source_ds", "")
        cases.append({
            "id": f"halubench-{len(cases)+1:05d}",
            "domain": HALUBENCH_DOMAIN.get(src, "general"),
            "difficulty": "medium",
            "input": row.get("question", ""),
            "actualOutput": row.get("answer", ""),
            "retrievalContext": [row.get("passage", "")],
            "humanVerdict": verdict,
            "humanRationale": (
                f"HaluBench ({src}): answer is faithful to passage"
                if verdict == "PASS" else
                f"HaluBench ({src}): answer contains hallucination"
            ),
            "failureMode": "correct" if verdict == "PASS" else "hallucination",
            "source": "halubench",
            "sourceDataset": src,
        })
    return cases


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ragtruth", type=int, default=2500)
    parser.add_argument("--halubench", type=int, default=2500)
    args = parser.parse_args()

    total = args.ragtruth + args.halubench
    print(f"Downloading: RAGTruth ({args.ragtruth}) + HaluBench ({args.halubench}) = {total} cases\n")

    # RAGTruth
    print("[1/4] RAGTruth")
    rt_df = download_parquet(RAGTRUTH_PARQUET, "RAGTruth")

    rt_df["_verdict"] = rt_df.apply(
        lambda r: ragtruth_verdict(r.to_dict()), axis=1
    )
    good = rt_df[rt_df["quality"] == "good"]
    print(f"  Good-quality: {len(good)} / {len(rt_df)}")

    rt_sampled = stratified_sample(good, args.ragtruth, "_verdict")
    rt_cases = convert_ragtruth(rt_sampled)
    n_pass = sum(1 for c in rt_cases if c["humanVerdict"] == "PASS")
    n_fail = sum(1 for c in rt_cases if c["humanVerdict"] == "FAIL")
    print(f"  Sampled: {len(rt_cases)} ({n_pass} PASS, {n_fail} FAIL)\n")

    # HaluBench
    print("[2/4] HaluBench")
    hb_df = download_parquet(HALUBENCH_PARQUET, "HaluBench")

    hb_df["_verdict"] = hb_df["label"].apply(lambda x: "PASS" if x == "PASS" else "FAIL")
    hb_sampled = stratified_sample(hb_df, args.halubench, "_verdict")
    hb_cases = convert_halubench(hb_sampled)
    n_pass = sum(1 for c in hb_cases if c["humanVerdict"] == "PASS")
    n_fail = sum(1 for c in hb_cases if c["humanVerdict"] == "FAIL")
    print(f"  Sampled: {len(hb_cases)} ({n_pass} PASS, {n_fail} FAIL)\n")

    # Save individual
    print("[3/4] Saving datasets...")
    rt_path = DATA_DIR / f"ragtruth_{args.ragtruth}.json"
    hb_path = DATA_DIR / f"halubench_{args.halubench}.json"
    rt_path.write_text(json.dumps(rt_cases, indent=2, ensure_ascii=False), encoding="utf-8")
    hb_path.write_text(json.dumps(hb_cases, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"  Wrote {rt_path}")
    print(f"  Wrote {hb_path}")

    # Combined
    print("[4/4] Building combined dataset...")
    combined = rt_cases + hb_cases
    random.seed(42)
    random.shuffle(combined)
    for i, c in enumerate(combined, 1):
        c["id"] = f"bench-{i:05d}"

    combined_path = DATA_DIR / f"benchmark_{total}.json"
    combined_path.write_text(json.dumps(combined, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"  Wrote {combined_path}")

    # Summary
    domains = {}
    for c in combined:
        domains[c["domain"]] = domains.get(c["domain"], 0) + 1
    tp = sum(1 for c in combined if c["humanVerdict"] == "PASS")
    tf = sum(1 for c in combined if c["humanVerdict"] == "FAIL")

    print(f"\n=== Summary ===")
    print(f"Total: {len(combined)} cases")
    print(f"PASS: {tp} ({round(tp/len(combined)*100)}%)")
    print(f"FAIL: {tf} ({round(tf/len(combined)*100)}%)")
    print(f"Domains: {json.dumps(domains)}")
    sources = {}
    for c in combined:
        sources[c["source"]] = sources.get(c["source"], 0) + 1
    print(f"Sources: {json.dumps(sources)}")
    print(f"\nDone. Ready for: node scripts/runBenchmark.js")


if __name__ == "__main__":
    main()
