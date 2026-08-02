# prototype/tui.py
"""Throwaway TUI shell over core.py — drive the interaction loop by hand.

Run:  python3 prototype/tui.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import core  # noqa: E402

B = "\x1b[1m"; D = "\x1b[2m"; R = "\x1b[0m"; RED = "\x1b[31m"; GRN = "\x1b[32m"; YEL = "\x1b[33m"


def _trunc(s, n):
    return s if len(s) <= n else s[: n - 1] + "…"


def _status_color(st):
    return {"KNOWN": GRN, "INFERRED": YEL, "UNKNOWN": RED}[st]


def render(s):
    out = []
    out.append(f"{B}CAREER EVIDENCE AGENT{R} {D}— MVP interaction loop prototype{R}")
    out.append(f"{D}revision P{s['revision']} · {len(s['evidence'])} evidence "
               f"({sum(1 for e in s['evidence'] if e['status'] != 'active')} "
               f"inactive) · recs: {s['rec_stale'] and 'STALE' or 'current'}{R}")
    for ch in s["changes"]:
        out.append(f"  {D}{ch}{R}")
    out.append("")

    if s["view"] == "profile":
        out.append(f"{B}PROFILE{R} {D}— claims, revisioned snapshot P{s['revision']}{R}")
        for cap in core.CAPABILITIES:
            c = s["claims"].get(cap["name"])
            if not c:
                out.append(f"  {RED}UNKNOWN{R}   —      {cap['name']}  {D}— no evidence{R}")
                continue
            st = core._status_of(c["confidence"])
            ev = ",".join(f"e{e['id']}" for e in c["evidence"])
            corr = f" {D}(corrected){R}" if c["corrected"] else ""
            out.append(f"  {_status_color(st)}{st:<9}{R} {c['confidence']:.2f}  "
                       f"{cap['name']} — \"{_trunc(c['text'], 34)}\" {D}({ev}){R}{corr}")
    elif s["view"] == "map":
        out.append(f"{B}CAPABILITY MAP{R} {D}— current profile vs role profile: {s['role']}{R}")
        for cap in core.CAPABILITIES:
            st = core._cap_status(s["claims"], cap["name"])
            mark = {"supported": GRN + "SUPPORTED", "adjacent": YEL + "ADJACENT ",
                    "missing": RED + "MISSING  "}[st]
            c = s["claims"].get(cap["name"])
            ev = ",".join(f"e{e['id']}" for e in c["evidence"]) if c else "—"
            out.append(f"  {mark}{R} {cap['name']:<22} {D}{ev}{R}")
    elif s["view"] == "recs":
        if not s["recommendations"]:
            out.append(f"{B}RECOMMENDATIONS{R} {D}— none yet, press [g] to generate from the capability map{R}")
            out.append(f"  {D}they become STALE whenever the profile revision changes{R}")
        else:
            stale = s["rec_stale"] or s["rec_from_revision"] != s["revision"]
            out.append(f"{B}RECOMMENDATIONS{R} {D}— from profile revision P{s['rec_from_revision']}"
                       f"{' ' + RED + 'STALE — profile changed, press [g]' + R if stale else ''}{R}")
            for r in s["recommendations"]:
                out.append(f"  {B}P{r['priority']}{R} {r['kind']:<16} {_trunc(r['text'], 48)}")

    out.append("")
    out.append(f"{B}[a]{R} add evidence {D}(share more context){R}  "
               f"{B}[p]{R} profile  {B}[c]{R} capability map  {B}[r]{R} recommendations  "
               f"{B}[g]{R} generate recs")
    out.append(f"{B}[x]{R} correct claim  {B}[t]{R} retract evidence  "
               f"{B}[e]{R} erase evidence  {B}[q]{R} quit")
    return "\n".join(out)


def _prompt(label):
    print(f"\n{D}{label}{R}")
    return input("> ").strip()


def _apply(state, action):
    try:
        return core.reducer(state, action)
    except Exception as exc:
        print(f"{RED}error: {exc}{R}")
        return state


def _to_int(v):
    try:
        return int(v)
    except ValueError:
        return None


def main():
    s = core.initial_state()
    while True:
        print("\033[2J\033[H", end="")
        print(render(s))
        k = _prompt("[a]dd evidence  [p]rofile  [c]apability map  [r]ecs  [g]enerate recs  "
                    "[x]correct  [t]retract  [e]rase  [q]uit")
        if k == "q":
            break
        if k == "a":
            s = _apply(s, {"type": "add_evidence", "kind": "note",
                           "text": _prompt("Paste the new context/evidence (enter cancels):")})
        elif k == "x":
            cap = _prompt("Claim to correct (capability name, e.g. 'AI/LLM product work'):")
            txt = _prompt("Your correction (what is actually true):")
            if cap and txt:
                s = _apply(s, {"type": "correct", "claim_id": cap, "text": txt})
        elif k == "t":
            eid = _to_int(_prompt("Evidence id to retract (see e# on claims):"))
            if eid:
                s = _apply(s, {"type": "retract", "evidence_id": eid})
        elif k == "e":
            eid = _to_int(_prompt("Evidence id to erase (permanently removes source + dependent data):"))
            if eid:
                s = _apply(s, {"type": "erase", "evidence_id": eid})
        elif k == "c":
            s = _apply(s, {"type": "show", "view": "map"})
        elif k == "r":
            s = _apply(s, {"type": "show", "view": "recs"})
        elif k == "p":
            s = _apply(s, {"type": "show", "view": "profile"})
        elif k == "g":
            s = _apply(s, {"type": "recompute_recs"})
    print("bye")


if __name__ == "__main__":
    main()
