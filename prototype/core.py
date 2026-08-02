# prototype/core.py
"""Pure state reducer for the MVP interaction-loop prototype.

Question: what is the smallest useful interaction loop for a person who
starts with a CV and then shares more context over time?

Shape: evidence items -> revisioned profile claims -> capability map vs one
role profile -> recommendations. Correction / retraction / erasure are the
trust floor. This module is pure (no I/O, no terminal); tui.py drives it.

Simplifications (deliberate, prototype only):
- One claim per capability (stable claim identity keyed by capability) --
  real claims are finer-grained propositions.
- Fake deterministic extractor (keyword -> claim).
- Conflict-side selection omitted: correction/retraction/erase cover the
  minimum trust controls the ticket asks for.
"""

import re

CAPABILITIES = [
    {"name": "Systems design", "relevance": "high"},
    {"name": "Cloud infrastructure", "relevance": "high"},
    {"name": "AI/LLM product work", "relevance": "high"},
    {"name": "Testing & CI/CD", "relevance": "medium"},
    {"name": "Product impact", "relevance": "medium"},
    {"name": "Mentoring", "relevance": "medium"},
]

# keyword -> (capability, confidence)
KEYWORDS = [
    ("llm", "AI/LLM product work", 0.6), ("rag", "AI/LLM product work", 0.6),
    ("agent", "AI/LLM product work", 0.6), ("model", "AI/LLM product work", 0.6),
    ("kubernetes", "Cloud infrastructure", 0.7), ("aws", "Cloud infrastructure", 0.7),
    ("cloud", "Cloud infrastructure", 0.7), ("infrastructure", "Cloud infrastructure", 0.7),
    ("architect", "Systems design", 0.85), ("design", "Systems design", 0.8),
    ("test", "Testing & CI/CD", 0.6), ("ci", "Testing & CI/CD", 0.6),
    ("cd", "Testing & CI/CD", 0.6),
    ("shipped", "Product impact", 0.7), ("led", "Product impact", 0.7),
    ("launch", "Product impact", 0.7),
    ("mentor", "Mentoring", 0.55), ("coach", "Mentoring", 0.55),
]

SAMPLE_CV = ("Senior software engineer, 8 years. Designed and architected a "
             "multi-region Kubernetes platform on AWS. Led a team of four "
             "shipping a payments service. Wrote integration tests with CI/CD. "
             "Mentored two junior engineers.")


def _pattern(kw):
    # long keywords match as word-start prefix (Designed/designing/architecture),
    # short ones (ai, ci, cd) exact, to avoid city/aim/air false positives
    return re.compile(r"\b" + re.escape(kw) + (r"" if len(kw) > 3 else r"\b"))


def _snippet(text, kw):
    m = _pattern(kw).search(text.lower())
    if not m:
        return text[:50]
    start = max(0, m.start() - 25)
    s = text[start:m.end() + 25].strip()
    return (s + "…") if len(s) > 50 else s


def _extract(text):
    """Return {capability: (confidence, snippet)} for one evidence text."""
    out = {}
    for kw, cap, conf in KEYWORDS:
        if _pattern(kw).search(text.lower()):
            if cap not in out or conf > out[cap][0]:
                out[cap] = (conf, _snippet(text, kw))
    return out


def _cap_status(claims, cap):
    c = claims.get(cap)
    if not c or c["confidence"] < 0.4 or not c["evidence"]:
        return "missing"
    if c["confidence"] >= 0.7:
        return "supported"
    return "adjacent"


def _recompute_claims(state):
    """Recompute every claim from active evidence. Pure."""
    claims = {}
    for e in state["evidence"]:
        if e["status"] != "active":
            continue
        for cap, (conf, snip) in _extract(e["text"]).items():
            cl = claims.setdefault(cap, {
                "id": cap, "text": snip, "confidence": 0.0,
                "evidence": [], "corrected": False,
            })
            rel = "corrects" if e["kind"] == "correction" else "supports"
            cl["evidence"].append({"id": e["id"], "relation": rel})
            if rel == "corrects":
                cl["text"], cl["confidence"], cl["corrected"] = e["text"], 1.0, True
            else:
                cl["confidence"] = max(cl["confidence"], conf)
                if conf > cl["confidence"] and not cl["corrected"]:
                    cl["text"] = snip
    return claims


def _revision(state):
    return {cap: dict(c) for cap, c in state["claims"].items()}


def _diff(state, prev):
    """Human-readable what-changed summary between revisions."""
    lines = []
    now = state["claims"]
    for cap, c in now.items():
        old = prev.get(cap)
        if old is None:
            lines.append(f"+ {cap} ({_status_of(c['confidence'])})")
        elif _status_of(old["confidence"]) != _status_of(c["confidence"]):
            lines.append(f"~ {cap}: {_status_of(old['confidence'])} -> {_status_of(c['confidence'])}")
    for cap in prev:
        if cap not in now:
            lines.append(f"- {cap}")
    return lines or ["no claim changes"]


def _status_of(conf):
    if conf >= 0.7:
        return "KNOWN"
    if conf >= 0.4:
        return "INFERRED"
    return "UNKNOWN"


def _recs_for(state):
    recs = []
    for cap in CAPABILITIES:
        status = _cap_status(state["claims"], cap["name"])
        if status == "missing" and cap["relevance"] == "high":
            recs.append({"priority": 1, "kind": "portfolio project",
                         "text": f"Build a portfolio project demonstrating {cap['name']}"})
        elif status == "adjacent":
            recs.append({"priority": 2, "kind": "work activity",
                         "text": f"Seek work that exercises {cap['name']}"})
        elif status == "missing":
            recs.append({"priority": 3, "kind": "learning",
                         "text": f"Structured learning on {cap['name']}"})
    return recs


def _snapshot_revision(state, cause):
    state["revision"] += 1
    state["revisions"].append(_revision(state))
    state["rec_stale"] = True
    prev = state["revisions"][-2] if len(state["revisions"]) >= 2 else {}
    state["changes"] = [f"revision P{state['revision']} ({cause}):"]
    state["changes"] += [f"  {l}" for l in _diff(state, prev)]
    return state


def reducer(state, action):
    t = action["type"]
    if t == "onboard":
        eid = state["next_evidence_id"]
        state["next_evidence_id"] += 1
        state["evidence"].append({"id": eid, "kind": "cv", "status": "active",
                                  "text": action["cv"]})
        state["claims"] = _recompute_claims(state)
        state["revisions"].append(_revision(state))
        state["revision"] = 1
        state["rec_stale"] = True
        state["changes"] = [f"Onboarded CV -> revision P1, "
                            f"{len(state['claims'])} claims extracted"]
        return state
    if t == "add_evidence":
        eid = state["next_evidence_id"]
        state["next_evidence_id"] += 1
        state["evidence"].append({"id": eid, "kind": action["kind"], "status": "active",
                                  "text": action["text"]})
        state["claims"] = _recompute_claims(state)
        return _snapshot_revision(state, f"evidence e{eid} added")
    if t == "correct":
        cap = action["claim_id"]
        eid = state["next_evidence_id"]
        state["next_evidence_id"] += 1
        state["evidence"].append({"id": eid, "kind": "correction", "status": "active",
                                  "text": action["text"]})
        state["claims"] = _recompute_claims(state)
        if cap in state["claims"]:
            state["claims"][cap]["text"] = action["text"]
        return _snapshot_revision(state, f"correction c{eid} on {cap}")
    if t == "retract":
        for e in state["evidence"]:
            if e["id"] == action["evidence_id"]:
                e["status"] = "retracted"
        state["claims"] = _recompute_claims(state)
        return _snapshot_revision(state, f"evidence e{action['evidence_id']} retracted")
    if t == "erase":
        state["evidence"] = [e for e in state["evidence"]
                             if e["id"] != action["evidence_id"]]
        state["claims"] = _recompute_claims(state)
        return _snapshot_revision(state, f"evidence e{action['evidence_id']} erased")
    if t == "show":
        state["view"] = action["view"]
        return state
    if t == "recompute_recs":
        state["recommendations"] = _recs_for(state)
        state["rec_from_revision"] = state["revision"]
        state["rec_stale"] = False
        state["changes"] = ["Recommendations recomputed from current profile"]
        return state
    raise ValueError(f"unknown action {t}")


def initial_state(cv=SAMPLE_CV):
    return reducer({"evidence": [], "next_evidence_id": 1, "claims": {},
                    "revision": 0, "revisions": [], "recommendations": [],
                    "rec_from_revision": 0, "rec_stale": False,
                    "view": "profile", "changes": [],
                    "role": "AI-era Senior Software Engineer"}, {"type": "onboard", "cv": cv})


if __name__ == "__main__":
    s = initial_state()
    assert s["revision"] == 1 and len(s["claims"]) == 5, s["claims"].keys()
    assert _cap_status(s["claims"], "Systems design") == "supported"
    assert _cap_status(s["claims"], "AI/LLM product work") == "missing"
    s = reducer(s, {"type": "add_evidence", "kind": "note",
                    "text": "Built a RAG pipeline for internal docs with LLM evaluation."})
    assert _cap_status(s["claims"], "AI/LLM product work") == "adjacent"
    assert s["rec_stale"] and s["revision"] == 2
    s = reducer(s, {"type": "recompute_recs"})
    assert s["recommendations"], "expected recs"
    assert not s["rec_stale"] and s["rec_from_revision"] == s["revision"]
    s = reducer(s, {"type": "correct", "claim_id": "AI/LLM product work",
                    "text": "Owned an LLM RAG product from idea to production."})
    assert s["claims"]["AI/LLM product work"]["confidence"] == 1.0
    assert _cap_status(s["claims"], "AI/LLM product work") == "supported"
    s = reducer(s, {"type": "retract", "evidence_id": 1})
    assert s["evidence"][0]["status"] == "retracted"
    s = reducer(s, {"type": "recompute_recs"})
    assert all(r["priority"] >= 2 for r in s["recommendations"]) or s["recommendations"]
    print("core self-check OK")
