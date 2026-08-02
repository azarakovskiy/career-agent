# MVP interaction loop — prototype

Asset for wayfinder ticket [Choose the MVP interaction loop and local interface](https://github.com/azarakovskiy/career-agent/issues/3).

**Question.** What is the smallest useful interaction loop for a person who starts with a
CV and then shares more context over time — and which local surface ships it first?

**Proposed loop (5 beats).** Onboard with a CV → see the extracted profile → share more
context (repeat) → see the capability map vs one role profile → see recommendations.
Correction / retraction / erasure are the trust floor. Everything else from the
glossary/decisions (#2, #8) is honored: immutable evidence, revisioned profiles,
what-changed feedback, stale-until-regenerated recommendations, Known/Inferred/Unknown.

## Run it

```bash
python3 prototype/tui.py        # drive the loop by hand
python3 prototype/core.py       # self-check of the pure state machine
```

Keys: `[a]` add evidence · `[p]` profile · `[c]` capability map · `[r]` recommendations ·
`[g]` generate recs · `[x]` correct claim · `[t]` retract evidence · `[e]` erase evidence · `[q]` quit

## Files

- `core.py` — pure reducer `(state, action) => state`; portable, no I/O. The part worth
  keeping past the prototype.
- `tui.py` — throwaway terminal shell over core.
- `WEB_VARIANT.md` — the same loop as a local web app (ASCII wireframes), for the
  interface decision.

## Simplifications (prototype only)

- One claim per capability (stable claim identity keyed by capability); real claims are
  finer-grained propositions.
- Fake deterministic keyword extractor — stands in for the real extraction pipeline.
- Conflict-side selection omitted (decision #2 covers it); retract/erase/correct cover
  the minimum trust controls.

## NOTES — verdict (fill in after the HITL session)

- Interface decided:
- Loop beats kept / cut:
- Trust controls sufficient?:
