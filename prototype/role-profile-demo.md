# PROTOTYPE — Role profile (role stereotype) document demo

> **Question this answers:** what does a versioned Role profile look like as a shipped document
> for the MVP?
>
> **Decisions embodied (from grilling on wayfinder ticket #4):** the comparison target is a *role
> stereotype*, not a job position · the profile is a versioned *data document*, not code ·
> exemplar position shortlist · flat capability list: name + relevance tier + one-line
> description + evidence expectation · authoring metadata for transparency.
>
> **Throwaway.** This file will be deleted or folded into the role-profile contract ticket's
> resolution. Nothing here is implemented.

---

# AI-era Senior Software Engineer

| | |
| --- | --- |
| **role id** | `ai-era-senior-software-engineer` |
| **version** | `1.0.0` |
| **status** | active |
| **authored** | 2026-08-02 — bundled with the MVP (authoring contract still open) |

## Role context

A senior software engineer who treats AI tooling as a first-class part of the workflow:
designs systems, ships with modern practices, and communicates impact beyond code. This
profile describes the *kind of role*, not one specific opening.

**Exemplar positions** (illustrative, not exhaustive):

- Staff Backend Engineer (fintech)
- Senior Full-Stack Engineer (startup)
- Platform Engineer (scale-up)

## Capabilities

### Systems design — `high`

Designing systems that hold up under production load and evolve over time.
**Evidence expectation:** designed and shipped a system others depend on (a service, a schema,
a migration path) with visible trade-offs.

### Cloud infrastructure — `high`

Running software on modern infrastructure and owning its operations.
**Evidence expectation:** operated a workload in production on cloud/Kubernetes with measurable
reliability work.

### AI/LLM product work — `high`

Shipping products that use AI/LLM capabilities.
**Evidence expectation:** built or shipped something using LLMs/agents/RAG and can talk about the
concrete trade-offs.

### Testing & CI/CD — `medium`

Keeping delivery fast and safe through automated checks.
**Evidence expectation:** maintained CI/CD pipelines and meaningful test suites on a real project.

### Product impact — `medium`

Turning engineering work into outcomes the product or user feels.
**Evidence expectation:** can point to shipped work with a measured effect.

### Mentoring — `medium`

Raising the people around you.
**Evidence expectation:** mentored or coached others through concrete situations.

### Public speaking — `low`

Communicating to groups outside the immediate team.
**Evidence expectation:** talks, workshops, or other public technical presence.
*(low = nice-to-have; a gap here is not a recommendation driver)*

## Version history

| Version | What changed |
|---|---|
| `1.0.0` | Initial authored profile, bundled with the MVP. |

## How the MVP renders it (sketch)

Capability map for a demo person, after onboarding + one share interaction:

```
AI-era Senior Software Engineer (v1.0.0)
───────────────────────────────────────
Systems design        ✓ supported  (0.85 — cv line "architected…")
Cloud infrastructure  ✓ supported  (0.70 — cv)
AI/LLM product work   ○ adjacent   (0.40 — inferred from "agent" in notes)
Testing & CI/CD       ○ adjacent   (0.60 — cv, no suite detail)
Product impact        ✓ supported  (0.70 — cv "led team shipping")
Mentoring             ✗ missing    (no evidence yet)
Public speaking       ✗ missing · low — not a priority gap

2 supported · 2 adjacent · 2 missing — recommendations target the
high/medium gaps (AI/LLM product work, Mentoring), not Public speaking.
```

## Superseded

All open questions were decided in the grilling session that produced this demo; the decisions live in the resolution of wayfinder ticket #4 (Define the versioned role-profile contract for the MVP). This file is kept as the accepted document-shape artifact.
