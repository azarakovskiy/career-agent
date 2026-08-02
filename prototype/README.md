# MVP interaction loop — prototype v3

Asset for wayfinder ticket [Choose the MVP interaction loop and local interface](https://github.com/azarakovskiy/career-agent/issues/3).

**Question.** What is the smallest useful interaction loop for a person who starts with a
CV and then shares more context over time — and which local surface ships it first?

**Proposed loop (5 beats).** Onboard with a CV → see the extracted profile → share more
context (repeat) → see the capability map vs one role profile → see recommendations.
Correction / retraction / erasure are the trust floor. Every change creates a revisioned
snapshot with a what-changed diff; recommendations are marked STALE until regenerated.

## Run it

```bash
python3 prototype/tui.py             # interactive — one screen, full state
python3 prototype/tui.py --fast      # skip simulated service delays (quick demo)
python3 prototype/tui.py --scenario  # scripted test of the whole loop (exit code)
python3 prototype/tui.py --reset     # wipe saved state, start fresh
python3 prototype/core.py            # pure-state self-check
```

Interactive menu: `[1]` add evidence (paste text **or** a file name under `cv/`, read-only)
· `[2]` correct claim · `[3]` retract evidence · `[4]` erase evidence · `[5]` regenerate
recs · `[6]` export profile · `[0]` quit.

## What v2 changed (user feedback)

| Complaint | Fix |
| --- | --- |
| Navigation confusing (hidden views) | One screen shows the whole pipeline — evidence, profile, capability map, recommendations — no views to flip between; numbered menu |
| Data flow confusing | `TIMELINE` header shows every revision and its diff (`P1 5 claims · P2 +AI/LLM…`); provenance arrows (`e1 e2`) on every claim; STALE banner ties profile changes to recommendations |
| Data not saved | State persists to `prototype/state.json` after every action, loaded on start (`--reset` to wipe); `[6]` exports a markdown profile snapshot |
| Hard to test | `--scenario` replays a scripted 8-step loop with assertions and a save/load round-trip check; the reducer stays pure and portable |

## What v3 added (user feedback: richer, more real experience)

| Feedback | Fix |
| --- | --- |
| Wants the experience to imitate the real product | Simulated service latency: steps the real product would serve with an LLM (claim extraction, recommendation ranking) take ~2s with staged status + spinner; code-served steps (file read, retract/erase recompute, save) are near-instant. The same contrast the real product shows |
| Fake data is fine — the feel should be real | Fresh start walks the real onboarding path: choose a CV (built-in sample or a file under `cv/`), watch `reading CV… → extracting claims… → scoring confidence…` |
| Live feedback | Every action ends with a timing line (`done in 2.2s — simulated LLM extraction`) |
| Demos must stay fast | `--fast` skips every delay; `--scenario` stays deterministic (never sleeps) |
| More believable demo data | Richer multi-year sample CV (still 5 claims, AI/LLM gap intact) + second read-only file `cv/quarterly-review.md` |

## Files

- `core.py` — pure reducer `(state, action) => state`, plus `serialize`/`deserialize`
  (a concrete candidate for the local-first persistence representation question on the
  wayfinder map). No I/O — the part worth keeping.
- `tui.py` — throwaway shell: rendering, menu, persistence, scenario runner.
- `cv/sample-notes.md` — sample evidence for the read-only file-ingestion path (fills the AI/LLM gap).
- `cv/quarterly-review.md` — second read-only evidence file (strengthens existing claims).
- `WEB_VARIANT.md` — the same loop as a local web app (ASCII wireframes).

## Simplifications (prototype only)

- One claim per capability (stable claim identity keyed by capability); real claims are
  finer-grained propositions.
- Fake deterministic keyword extractor — stands in for the real extraction pipeline.
- Conflict-side selection omitted (evidence-lifecycle contract covers it); retract/erase/
  correct cover the minimum trust controls.
- Simulated latency is cosmetic theater in `tui.py` only — the reducer stays pure and
  instant; `--scenario` and the `core.py` self-check never sleep.

## NOTES — verdict (from the HITL session, resolved on the ticket)

- Interface decided: **CLI first**; web shell deferred beyond the MVP (map Out of scope).
- Loop beats kept: all 5 (onboard → profile → share → capability map → recommendations);
  what-changed diff feedback kept.
- Trust controls sufficient: yes — correct / retract / erase; conflict-side selection stays
  under the evidence-lifecycle contract, not re-prototyped.
- Repeat interaction: free-form paste/upload. Guided evidence prompts: future effort (out of
  scope on the map).
- v3 iteration (user feedback: "richer experience, imitate serving delays, more real-life
  feel even with fake data"): simulated latency, onboarding CV chooser, richer demo data.
  Verdict pending on the ticket.
