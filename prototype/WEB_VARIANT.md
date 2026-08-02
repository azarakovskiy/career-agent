# Web-app variant of the same interaction loop

Prototype asset for ticket **Choose the MVP interaction loop and local interface** (#3).
The loop is identical to the CLI prototype; this is what the same five beats look like
as a **local web app** (`localhost`, no server, data stays in the workspace). ASCII
wireframes, one screen per beat — react to the *shape*, not the pixels.

## 1. Onboarding — point at your CV (and pick a role profile)

```text
┌────────────────────────────────────────────────────────────────┐
│ Career Evidence Agent                    [profile: AI-era SWE ▾]│
├────────────────────────────────────────────────────────────────┤
│                                                                │
│   Start with your CV — nothing else needed.                    │
│                                                                │
│   ┌────────────────────────────────────────────────────────┐   │
│   │ 📄 /career-evidence/cv-2026-02.pdf        [Change…]    │   │
│   └────────────────────────────────────────────────────────┘   │
│      (read-only view of your CV folder — we never write there) │
│                                                                │
│   Comparing against:  AI-era Senior Software Engineer          │
│   (one versioned role profile; you can swap it later)          │
│                                                                │
│                              [ Build my profile ]              │
└────────────────────────────────────────────────────────────────┘
```text

One form, two decisions (which CV, which role). Same as CLI `--cv <path>` + role select.

## 2. Profile — the claims the agent extracted

```text
┌─ Current profile · revision P1 ─────────────────────────────────┐
│ 5 claims from 1 evidence item                          (P1 ✓)   │
│                                                                │
│  ● KNOWN   0.85  Systems design          "Designed and architected…"  ⚙  ⚖
│  ● KNOWN   0.70  Cloud infrastructure    "…multi-region Kubernetes…"   ⚙  ⚖
│  ○ INFERRED 0.60  Testing & CI/CD        "…integration tests with CI/CD" ⚙  ⚖
│  ● KNOWN   0.70  Product impact          "…Led a team of four…"         ⚙  ⚖
│  ○ INFERRED 0.55  Mentoring              "…Mentored two junior engineers." ⚙  ⚖
│  ◌ UNKNOWN  —     AI/LLM product work    no evidence yet                 ⚖
│                                                                │
│  ⚙ edit claim (creates a correction, keeps the original)       │
│  ⚖ evidence provenance — which source supports/contradicts     │
└────────────────────────────────────────────────────────────────┘
```text

## 3. Share more — the repeat interaction

```text
┌─ Add evidence ──────────────────────────────────────────────────┐
│  Paste a note · upload a file · answer a prompt                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Built a RAG pipeline for internal docs with LLM          │   │
│  │ evaluation.                                              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                     [ Add as evidence ]         │
└────────────────────────────────────────────────────────────────┘
```text

After submit — the **profile-update feedback** (the diff banner):

```text
┌─ Revision P2 · what changed ────────────────────────────────────┐
│  ✓ AI/LLM product work  INFERRED → (new)                        │
│  Recommendations are now STALE — [ regenerate ]                 │
└────────────────────────────────────────────────────────────────┘
```text

## 4. Capability map — you vs the role

```text
┌─ Capability map · vs AI-era Senior Software Engineer ───────────┐
│ SUPPORTED                          ADJACENT          MISSING    │
│ ┌─────────────────────┐  ┌──────────────────────┐ ┌───────────┐ │
│ │ Systems design  ⚖e1 │  │ Testing & CI/CD ⚖e1  │ │ AI/LLM    │ │
│ │ Cloud infra     ⚖e1 │  │ Mentoring      ⚖e1   │ │ product   │ │
│ │ Product impact  ⚖e1 │  └──────────────────────┘ │ work      │ │
│ └─────────────────────┘                           └───────────┘ │
│ three columns, each item traces to its evidence (⚖)             │
└────────────────────────────────────────────────────────────────┘
```text

## 5. Recommendations — derived, and honest about staleness

```text
┌─ Recommendations · from profile revision P2 ─────────────────────┐
│ ┌ P1 ─────────────────────────────────────────────────────────┐  │
│ │ Portfolio project  Build something that ships an LLM/RAG    │  │
│ │                   product end-to-end (missing + high value) │  │
│ └─────────────────────────────────────────────────────────────┘  │
│ ┌ P2 ─────────────────────────────────────────────────────────┐  │
│ │ Work activity     Seek work exercising Testing & CI/CD      │  │
│ └─────────────────────────────────────────────────────────────┘  │
│ ┌ P3 ─────────────────────────────────────────────────────────┐  │
│ │ Learning          Structured learning on Mentoring          │  │
│ └─────────────────────────────────────────────────────────────┘  │
│  ⚠ STALE — profile changed since P2 · [ regenerate ]           │
└────────────────────────────────────────────────────────────────┘
```text

## Trust controls (minimum)

| Control | Web app | CLI |
| --- | --- | --- |
| Correct a claim | ⚙ on the claim → typed correction | `[x]` |
| Retract evidence | "hide from profile" on the evidence item | `[t]` |
| Erase evidence | "delete permanently" (explicit confirm) | `[e]` |
| See provenance | ⚖ tooltip / drawer | evidence ids `(e1)` |

Same semantics both surfaces — the loop is surface-independent; only the ergonomics differ.

## Interface decision — CLI vs local web app

| | CLI | Local web app |
| --- | --- | --- |
| Build cost (MVP) | ~one file, stdlib | static HTML/JS + file read, still small |
| Feels right for | the agent driving (me), scripting, git | a person reviewing profile/map/recs |
| Correction ergonomics | keyboard prompts | click + edit |
| Where data lives | workspace files (same) | workspace files (same) |
| Run story | one command in a terminal | `localhost` tab, no server |

The loop is the same; this ticket decides which surface *ships first*. The CLI proves the
loop cheapest; the web app proves the feel. A third option exists: **CLI to prove the loop,
web shell later** — the CLI prototype IS the loop spec.
