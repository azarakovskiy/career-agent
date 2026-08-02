#!/usr/bin/env python3
# prototype/tui.py
"""Prototype v3 shell over core.py — one screen showing the whole pipeline,
state saved to disk after every action, simulated service latency.

The data is fake but the serving model is not: steps the real product would
hand to an LLM (claim extraction, recommendation ranking) take ~2s with a
staged spinner; code-served steps (file read, retract/erase recompute, save)
are near-instant. --fast skips every delay for quick demos.

Run:            python3 prototype/tui.py          (interactive)
                python3 prototype/tui.py --fast   (skip simulated delays)
                python3 prototype/tui.py --scenario   (scripted test, exit code)
                python3 prototype/tui.py --reset      (wipe saved state, start fresh)
"""

import json
import os
import sys
import time

BASE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE)
import core  # noqa: E402

B = "\x1b[1m"; D = "\x1b[2m"; R = "\x1b[0m"
RED = "\x1b[31m"; GRN = "\x1b[32m"; YEL = "\x1b[33m"

FAST = "--fast" in sys.argv  # skip simulated delays (quick demos)

# Simulated serving delays. Fractions are when each stage label appears.
EXTRACT = [("reading evidence…", 0.02), ("extracting claims…", 0.35),
           ("scoring confidence…", 0.8)]          # ~2.2s — LLM-bound
RECS = [("evaluating capability map…", 0.05), ("ranking opportunities…", 0.6),
        ("writing recommendations…", 0.85)]       # ~1.8s — LLM-bound
RECOMPUTE = [("recomputing claims…", 0.02)]       # ~0.3s — deterministic
READ_FILE = [("reading file…", 0.02)]             # ~0.15s — code


def _c(st):
    return {"KNOWN": GRN, "INFERRED": YEL, "UNKNOWN": RED,
            "SUPPORTED": GRN, "ADJACENT": YEL, "MISSING": RED}[st]


def _trunc(s, n):
    return s if len(s) <= n else s[: n - 1] + "…"


def _busy(stages, total):
    """Simulate an async service call: staged status lines + spinner, then clear.
    Returns elapsed seconds. All theater — the reducer already ran."""
    start = time.monotonic()
    frames = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"
    shown, i = 0, 0
    while True:
        el = time.monotonic() - start
        if el >= total:
            break
        while shown < len(stages) and el >= stages[shown][1] * total:
            sys.stdout.write("\r" + " " * 40 + "\r")
            print(f"  {D}{stages[shown][0]}{R}")
            shown += 1
        sys.stdout.write(f"\r  {frames[i % len(frames)]} {el:4.1f}s ")
        sys.stdout.flush()
        i += 1
        time.sleep(0.08)
    sys.stdout.write("\r" + " " * 40 + "\r")
    return time.monotonic() - start


def render(s):
    L = []
    L.append(f"{B}CAREER EVIDENCE AGENT - prototype v3{R}   "
             f"{D}saved: {os.path.basename(core.STATE_FILE)} · revision P{s['revision']}{R}")
    L.append(f"{B}TIMELINE{R}  {_trunc(core.timeline(s), 80)}")
    for i, ch in enumerate(s["changes"]):
        L.append(f"{D}{'LAST CHANGE' if i == 0 else '           '}  {ch}{R}")
    L.append("")

    L.append(f"{B}EVIDENCE{R} {D}({len(s['evidence'])} items · immutable — "
             f"retract/erase never rewrite originals){R}")
    for e in s["evidence"]:
        mark = f"{GRN}active{R}" if e["status"] == "active" else f"{D}retracted{R}"
        L.append(f"  {e['id']:<2}{e['kind']:<11}{mark}  {_trunc(' '.join(e['text'].split()), 62)}")

    L.append("")
    L.append(f"{B}PROFILE{R} {D}(claims from current revision P{s['revision']}){R}")
    L.append(f"  {'#':<3}{'STATUS':<9}{'CONF':<6}{'CAPABILITY':<24}EVIDENCE")
    for i, cap in enumerate(core.CAPABILITIES, 1):
        c = s["claims"].get(cap["name"])
        if not c or not c["evidence"]:
            L.append(f"  {i:<3}{RED}UNKNOWN{R}   {'—':<6}{cap['name']:<24}{D}no active evidence{R}")
            continue
        st = core._status_of(c["confidence"])
        ev = " ".join(f"e{e['id']}" for e in c["evidence"]) + (" (corrected)" if c["corrected"] else "")
        L.append(f"  {i:<3}{_c(st)}{st:<9}{R}{c['confidence']:<6.2f}{cap['name']:<24}{D}{ev}{R}")

    L.append("")
    L.append(f"{B}CAPABILITY MAP{R} {D}(current profile vs role: {s['role']}){R}")
    for st in ("SUPPORTED", "ADJACENT", "MISSING"):
        caps = [cap["name"] for cap in core.CAPABILITIES
                if core._cap_status(s["claims"], cap["name"]) == st.lower()]
        L.append(f"  {_c(st)}{st:<10}{R}{' · '.join(caps) if caps else D + '—' + R}")

    L.append("")
    if s["recommendations"]:
        stale = s["rec_stale"] or s["rec_from_revision"] != s["revision"]
        note = f"generated from P{s['rec_from_revision']}"
        if stale:
            note += f" · {RED}STALE{R}{D} — profile moved to P{s['revision']}, press [5]{R}"
        L.append(f"{B}RECOMMENDATIONS{R} {D}({note}){R}")
        for r in s["recommendations"]:
            L.append(f"  {B}P{r['priority']}{R}  {r['kind']:<16}{_trunc(r['text'], 50)}")
    else:
        L.append(f"{B}RECOMMENDATIONS{R} {D}(none yet — press [5]){R}")

    L.append("")
    L.append(f"{B}[1]{R} add evidence   {B}[2]{R} correct claim   {B}[3]{R} retract evidence   "
             f"{B}[4]{R} erase evidence")
    L.append(f"{B}[5]{R} regenerate recs   {B}[6]{R} export profile   {B}[0]{R} quit")
    return "\n".join(L)


def _save(s):
    try:
        with open(core.STATE_FILE, "w", encoding="utf-8") as f:
            json.dump(core.serialize(s), f, indent=2)
    except OSError as exc:
        s["changes"] = [f"warning: could not save state: {exc}"]


def _read_evidence():
    """Paste one line, or a path under the allow-listed cv/ root (read-only)."""
    inp = input("  paste text, or a file name under cv/ (read, never modified): ").strip()
    if not inp:
        return None, None
    p = os.path.join(core.CV_DIR, inp)
    real = os.path.realpath(p)
    if os.path.isfile(p) and real.startswith(os.path.realpath(core.CV_DIR)):
        try:
            with open(p, encoding="utf-8") as f:
                return "file", f.read()
        except OSError as exc:
            return "note", f"(could not read {inp}: {exc})"
    return "note", inp


def _to_int(v):
    try:
        return int(v)
    except ValueError:
        return None


def _export(s):
    lines = [f"# Career Evidence Agent — profile export (revision P{s['revision']})", ""]
    lines.append("## Claims")
    for cap in core.CAPABILITIES:
        c = s["claims"].get(cap["name"])
        if not c or not c["evidence"]:
            lines.append(f"- **{cap['name']}**: UNKNOWN — no active evidence")
            continue
        ev = ", ".join(f"e{e['id']}" for e in c["evidence"])
        lines.append(f"- **{cap['name']}**: {core._status_of(c['confidence'])} "
                     f"(conf {c['confidence']:.2f}) — {ev}")
    lines.append("")
    lines.append("## Capability map")
    for st in ("SUPPORTED", "ADJACENT", "MISSING"):
        caps = [cap["name"] for cap in core.CAPABILITIES
                if core._cap_status(s["claims"], cap["name"]) == st.lower()]
        lines.append(f"- {st}: {', '.join(caps) or '—'}")
    lines.append("")
    lines.append("## Recommendations")
    for r in s["recommendations"]:
        lines.append(f"- P{r['priority']} ({r['kind']}): {r['text']}")
    try:
        with open(core.EXPORT_FILE, "w", encoding="utf-8") as f:
            f.write("\n".join(lines) + "\n")
        s["changes"] = [f"exported profile to {os.path.basename(core.EXPORT_FILE)}"]
    except OSError as exc:
        s["changes"] = [f"export failed: {exc}"]


def _maybe_busy(s, stages, total, what):
    if FAST:
        return s
    el = _busy(stages, total)
    s["changes"].append(f"done in {el:.1f}s — simulated {what}")
    return s


def _dispatch(s, k):
    if k in ("0", "q", "quit"):
        raise SystemExit
    try:
        if k == "1":
            kind, text = _read_evidence()
            if text:
                if not FAST and kind == "file":
                    _busy(READ_FILE, 0.15)
                s = core.reducer(s, {"type": "add_evidence", "kind": kind, "text": text})
                s = _maybe_busy(s, EXTRACT, 2.2, "LLM extraction")
        elif k == "2":
            n = _to_int(input("  claim # (see PROFILE): ").strip())
            if n is not None and 1 <= n <= len(core.CAPABILITIES):
                cap = core.CAPABILITIES[n - 1]["name"]
                txt = input("  what is actually true? ").strip()
                if txt:
                    s = core.reducer(s, {"type": "correct", "claim_id": cap, "text": txt})
                    s = _maybe_busy(s, EXTRACT, 2.2, "LLM extraction")
        elif k == "3":
            eid = _to_int(input("  evidence id (see EVIDENCE): ").strip())
            if eid:
                s = core.reducer(s, {"type": "retract", "evidence_id": eid})
                s = _maybe_busy(s, RECOMPUTE, 0.3, "deterministic recompute")
        elif k == "4":
            eid = _to_int(input("  evidence id (see EVIDENCE): ").strip())
            if eid:
                s = core.reducer(s, {"type": "erase", "evidence_id": eid})
                s = _maybe_busy(s, RECOMPUTE, 0.3, "deterministic recompute")
        elif k == "5":
            s = core.reducer(s, {"type": "recompute_recs"})
            s = _maybe_busy(s, RECS, 1.8, "LLM ranking")
        elif k == "6":
            _export(s)
        else:
            s["changes"] = [f"unknown choice '{k}' — pick a number from the menu"]
            return s
    except Exception as exc:
        s["changes"] = [f"error: {exc}"]
        return s
    _save(s)
    return s


def _choose_cv():
    """Fresh start: let the user point at a CV, like the real product."""
    try:
        files = sorted(f for f in os.listdir(core.CV_DIR) if f.endswith(".md"))
    except OSError:
        files = []
    print(f"{B}Onboarding{R} — point me at your CV "
          f"{D}(read-only view of {os.path.basename(core.CV_DIR)}/){R}")
    print(f"  {B}[1]{R} built-in sample CV — senior platform engineer, 8 yrs")
    for i, f in enumerate(files, 2):
        print(f"  {B}[{i}]{R} {D}cv/{f}{R}")
    try:
        n = _to_int(input("  pick a CV: ").strip())
    except (EOFError, KeyboardInterrupt):
        return core.SAMPLE_CV
    if n is not None and 2 <= n <= 1 + len(files):
        p = os.path.join(core.CV_DIR, files[n - 2])
        try:
            with open(p, encoding="utf-8") as f:
                return f.read()
        except OSError:
            pass
    return core.SAMPLE_CV


def main():
    if "--reset" in sys.argv:
        try:
            os.remove(core.STATE_FILE)
        except FileNotFoundError:
            pass
    if os.path.exists(core.STATE_FILE):
        try:
            with open(core.STATE_FILE, encoding="utf-8") as f:
                s = core.deserialize(json.load(f))
        except (OSError, ValueError):
            s = core.initial_state()
            s["changes"] = [f"saved state unreadable — started fresh"]
            _save(s)
        else:
            if not FAST:
                print("\033[2J\033[H", end="")
                print(f"{B}Career Evidence Agent — prototype v3{R}")
                _busy([("loading saved state…", 0.02)], 0.6)
    else:
        print("\033[2J\033[H", end="")
        cv = _choose_cv()
        st = core.fresh_state()
        s = core.reducer(st, {"type": "onboard", "cv": cv})
        _save(s)
        if not FAST:
            el = _busy([("reading CV…", 0.05), ("extracting claims…", 0.35),
                        ("scoring confidence…", 0.85)], 2.4)
            s["changes"].append(f"profile built in {el:.1f}s — simulated LLM extraction")
    while True:
        print("\033[2J\033[H", end="")
        print(render(s))
        try:
            k = input("> ").strip()
        except (EOFError, KeyboardInterrupt):
            print("bye")
            return
        s = _dispatch(s, k)


SCENARIO = [
    ("onboard sample CV -> 5 claims", {"type": "onboard", "cv": core.SAMPLE_CV},
     lambda s: len(s["claims"]) == 5 and s["revision"] == 1),
    ("add RAG evidence -> AI/LLM adjacent", {"type": "add_evidence", "kind": "note",
     "text": "Built a RAG pipeline for internal docs with LLM evaluation."},
     lambda s: core._cap_status(s["claims"], "AI/LLM product work") == "adjacent"
     and s["revision"] == 2),
    ("regenerate recommendations", {"type": "recompute_recs"},
     lambda s: not s["rec_stale"] and s["rec_from_revision"] == s["revision"]),
    ("share more -> recommendations go stale", {"type": "add_evidence", "kind": "note",
     "text": "Mentored a team of three this quarter."},
     lambda s: s["rec_stale"] and s["revision"] == 3),
    ("correct AI/LLM claim -> KNOWN 1.0", {"type": "correct",
     "claim_id": "AI/LLM product work",
     "text": "Owned an LLM RAG product from idea to production."},
     lambda s: s["claims"]["AI/LLM product work"]["confidence"] == 1.0),
    ("retract CV -> Systems design missing", {"type": "retract", "evidence_id": 1},
     lambda s: s["evidence"][0]["status"] == "retracted"
     and core._cap_status(s["claims"], "Systems design") == "missing"),
    ("erase RAG note", {"type": "erase", "evidence_id": 2},
     lambda s: all(e["id"] != 2 for e in s["evidence"])),
]


def run_scenario():
    s = core.fresh_state()
    passed = 0
    for name, action, check in SCENARIO:
        s = core.reducer(s, action)
        ok = bool(check(s))
        print(f"  {'OK ' if ok else 'FAIL'}  {name}")
        passed += ok
    ok = core.roundtrip(s)
    print(f"  {'OK ' if ok else 'FAIL'}  save/load round-trip preserves state")
    passed += ok
    print(f"{passed}/{len(SCENARIO) + 1} passed")
    sys.exit(0 if passed == len(SCENARIO) + 1 else 1)


if __name__ == "__main__":
    if "--scenario" in sys.argv:
        run_scenario()
    else:
        main()
