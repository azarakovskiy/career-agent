#!/usr/bin/env python3
# prototype/tui.py
"""Prototype v2 shell over core.py — one screen showing the whole pipeline,
state saved to disk after every action.

Run:            python3 prototype/tui.py          (interactive)
                python3 prototype/tui.py --scenario   (scripted test, exit code)
                python3 prototype/tui.py --reset      (wipe saved state, start fresh)
"""

import json
import os
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE)
import core  # noqa: E402

B = "\x1b[1m"; D = "\x1b[2m"; R = "\x1b[0m"
RED = "\x1b[31m"; GRN = "\x1b[32m"; YEL = "\x1b[33m"


def _c(st):
    return {"KNOWN": GRN, "INFERRED": YEL, "UNKNOWN": RED,
            "SUPPORTED": GRN, "ADJACENT": YEL, "MISSING": RED}[st]


def _trunc(s, n):
    return s if len(s) <= n else s[: n - 1] + "…"


def render(s):
    L = []
    L.append(f"{B}CAREER EVIDENCE AGENT — prototype v2{R}   "
             f"{D}saved: {os.path.basename(core.STATE_FILE)} · revision P{s['revision']}{R}")
    L.append(f"{B}TIMELINE{R}  {_trunc(core.timeline(s), 80)}")
    for i, ch in enumerate(s["changes"]):
        L.append(f"{D}{'LAST CHANGE' if i == 0 else '           '}  {ch}{R}")
    L.append("")

    L.append(f"{B}EVIDENCE{R} {D}({len(s['evidence'])} items · immutable — "
             f"retract/erase never rewrite originals){R}")
    for e in s["evidence"]:
        mark = f"{GRN}active{R}" if e["status"] == "active" else f"{D}retracted{R}"
        L.append(f"  {e['id']:<2}{e['kind']:<11}{mark}  {_trunc(e['text'], 62)}")

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


def _dispatch(s, k):
    if k in ("0", "q", "quit"):
        raise SystemExit
    try:
        if k == "1":
            kind, text = _read_evidence()
            if text:
                s = core.reducer(s, {"type": "add_evidence", "kind": kind, "text": text})
        elif k == "2":
            n = _to_int(input("  claim # (see PROFILE): ").strip())
            if n is not None and 1 <= n <= len(core.CAPABILITIES):
                cap = core.CAPABILITIES[n - 1]["name"]
                txt = input("  what is actually true? ").strip()
                if txt:
                    s = core.reducer(s, {"type": "correct", "claim_id": cap, "text": txt})
        elif k == "3":
            eid = _to_int(input("  evidence id (see EVIDENCE): ").strip())
            if eid:
                s = core.reducer(s, {"type": "retract", "evidence_id": eid})
        elif k == "4":
            eid = _to_int(input("  evidence id (see EVIDENCE): ").strip())
            if eid:
                s = core.reducer(s, {"type": "erase", "evidence_id": eid})
        elif k == "5":
            s = core.reducer(s, {"type": "recompute_recs"})
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
        s = core.initial_state()
        _save(s)
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
