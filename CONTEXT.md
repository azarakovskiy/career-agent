# Career Evidence Agent — Domain Context

## Purpose

Career Evidence Agent is an evidence-first career-resilience coach. It helps a person understand what they can credibly demonstrate, which capabilities are adjacent to their experience, what evidence is missing, and what practical work or learning would improve their employability.

The initial product is a personal, local-first tool. Its longer-term direction may support changing labor-market relevance, additional roles, multiple users, and externally hosted persistence.

## Glossary

### Person

The individual whose work history, capabilities, and career goals are being assessed. The initial MVP is for one person using their own local workspace.

### Interaction turn

An immutable user-and-agent exchange retained as source history. User-authored content can produce candidate Evidence items; agent-generated summaries or interpretations are not Evidence unless the person explicitly confirms them.

### Evidence item

A source that supports or fails to support a claim about the person. Examples include a CV statement, repository, technical article, project artifact, or user-provided interaction. Evidence items retain their source and provenance and are not silently rewritten.

Each upload or submission is a distinct immutable Evidence item. For example, a newly uploaded CV is new evidence rather than an in-place edit of the previous CV; the earlier item remains preserved and may be linked to the newer item as a revision or supersession relationship.

For successive CV revisions, the newest revision is the current source for profile derivation while prior revisions remain historical evidence. Leaving a fact out of a newer CV does not by itself retract that fact; retraction requires an explicit correction or removal decision.

Evidence provenance distinguishes when the system recorded an item from when its source was observed and, when known, the interval during which it was valid. Date precision is preserved, and unavailable dates remain unknown rather than being inferred from upload time.

Processing the same Evidence item with the same extractor context is idempotent: retries do not duplicate claims or provenance links. A new upload remains a distinct Evidence item even when its content is identical to an earlier upload.

### Profile claim

A normalized statement about the person derived from one or more evidence items or explicitly supplied by the person. A claim records its provenance and the extractor's confidence; Known, Inferred, or Unknown is derived from the current confidence and evidence context rather than stored as a separate status.

Each normalized proposition has a stable Profile claim identity. New Evidence items attach to that identity; changes from recomputation are captured in revisioned Current-profile snapshots. A materially different proposition is a new linked claim.

A claim links every relevant supporting and contradicting Evidence item. Confidence is recomputed from the full set, and unresolved conflicts remain visible rather than being silently discarded.

When active Evidence conflicts for the same time period, the person chooses which item is current; timestamps may inform the choice but never resolve it automatically. The other active item remains linked as conflicting provenance until the person retracts or erases it, except that confirming one side of the conflict automatically erases the competing item and its dependent derived data.

Evidence derived under different extractor or model contexts may contribute to the same stable claim; each context remains visible in provenance and is not silently replaced by the newest one.

Claim provenance includes the source Evidence item, the relevant source span or Interaction turn when available, the relationship (supports, contradicts, or corrects), observation times, and extraction/model context with confidence.

For time-varying facts, a claim retains time-bounded observations linked to their Evidence items. The model distinguishes when an observation was recorded from when it was valid; the Current profile selects the observation valid now while preserving past observations. Different valid periods are not conflicts by themselves.

An explicit user correction is a new immutable user-authored Evidence item with a corrects/revises link to the prior claim or Evidence item. The original remains preserved unless the person explicitly chooses erasure, and the Current profile is recomputed from the correction.

If the correction conflicts with older Evidence, the person explicitly chooses whether to retract that older item or erase it; the system does not silently choose between historical preservation and permanent deletion.

Explicit user confirmation is also immutable user-sourced Evidence with the strongest evidence weight. Confidence is still recomputed through the normal path, and the displayed status follows from that result rather than a hidden override.

Selecting one side of a conflict is explicit confirmation of that Evidence: it adds a new strongest user-sourced Evidence item linked to the selected and competing items and creates a new Current-profile revision.

User-requested removal has two meanings: retraction preserves an Evidence item for provenance but excludes it from current derivation; erasure permanently removes the source and dependent derived data, retaining only minimal reference metadata when needed for coherence.

### Current profile

The persistent, evolving set of profile claims used for the latest analysis. Every evidence, correction, retraction, or erasure change creates a new revisioned snapshot; the profile is derived from evidence and user input, not a replacement for the original evidence items. When no active support remains, a retracted claim stays historical but is excluded from the active profile; downstream capability evaluation represents it as Unknown, while erasure removes dependent derived claim data. When a conflict awaits the person’s choice, the last selected value remains active but is marked conflicted and stale.

### Role stereotype

An umbrella description of a kind of role that many concrete job positions fall under, e.g. "AI-era Senior Software Engineer" covers "Staff Backend Engineer at a fintech" and "Senior Full-Stack Engineer at a startup". The MVP compares the person's current profile against one selected role stereotype; concrete job positions are a separate, later concern.

### Job position

A concrete, specific opening or role at a company, e.g. "Senior Backend Engineer at Acme Payments, 2025 posting". Job positions are not part of the MVP role contract: the MVP compares against the role stereotype, and job-specific tailoring is out of scope.

### Role profile

A transparent, versioned description of a role stereotype: its capabilities, evidence expectations, and other criteria used for comparison. In the MVP, the person selects one role profile; the system does not discover the role autonomously.

### Evidence expectation

A plain-language statement, carried by each capability in a role profile, of what would establish that capability (e.g. "designed and shipped a system others depend on"). Evidence expectations are advisory: they are shown to the person to read, and do not mechanically gate Known/Inferred/Unknown status.

### Capability

A meaningful ability relevant to a role profile. A capability may be supported by Known evidence, suggested by Inferred evidence, or remain Unknown.

### Capability map

The comparison of the current profile against a role profile, including supported, adjacent, and missing capabilities with traceable evidence.

### Recommendation

A derived, prioritized suggestion for a portfolio project, work activity, or learning action. Recommendations are generated from a specific Current-profile revision, Role profile, and evaluation/model version; they are not authoritative source data and become stale when that profile revision changes. Recommendations may continue from a conflicted profile revision but must carry a visible warning.

Recommendations are quality-gated rather than quota-driven: the displayed set may be smaller than five, and every item must be specific, feasible, role-linked, evidence-producing, clearly explained, and safe under its stated evidence basis. A recommendation can be grounded in Known evidence, high-confidence Inferred evidence, or an uncertainty-aware verification/demonstration action. The action itself must meet the quality gate even when its evidence basis is uncertain.

### Recommendation quality gate

The conjunctive contract that decides whether a candidate Recommendation is useful enough to show. A candidate is omitted when any required dimension fails: `not_specific`, `not_feasible`, `not_evidence_producing`, `not_role_linked`, `unsafe_basis`, or `insufficient_context`. The primary view shows only the most useful one or two omission diagnostics, with a plain-language reason and an unblocker; these are diagnostic fields, not additional evidence statuses.

### Known / Inferred / Unknown

The evidence-status vocabulary:

- **Known**: supported by concrete, traceable evidence or explicit user confirmation.
- **Inferred**: plausible from adjacent evidence but not directly established.
- **Unknown**: not established by available evidence.

Automatic extraction records a confidence score and provenance for the source and extraction context; the current confidence and evidence context determine whether the claim is presented as Known, Inferred, or Unknown. A confidence score alone never makes a claim Known. Known requires explicit user confirmation or at least one concrete, inspectable source that directly supports the claim. A score of `0.70` or higher is the initial threshold for high-confidence Inferred recommendations, not a replacement for the semantic statuses.

Automatic learning may propose candidate interpretations, but low-confidence interpretations are non-persistent and cannot modify existing profile data. A high-confidence inference cannot silently override a Known claim; it remains a visible conflict until the person explicitly confirms, corrects, retracts, or erases. Uncertainty, conflict, and stale state are orthogonal display markers, not additional core statuses. The agent abstains at the smallest affected level when provenance or evidence is insufficient, preserving unaffected outputs and explaining what would unblock the result.

Every displayed claim and capability assessment has an inspectable provenance trace, including the Evidence item, source excerpt or span when available, interaction turn, relationship, observation/validity time, and extraction/model context. Recommendations identify their capability and evidence gap and explain why the action follows. Explanations are compact for straightforward Known cases and fuller for inferred, conflicting, or mechanism-specific cases; they expose decision-relevant evidence without hidden chain-of-thought.

Changing the extractor or model does not reprocess existing Evidence in the MVP. Existing claims retain their original extraction context; the new context applies only to newly processed Evidence.

### Derivation context

The immutable identifiers recorded on every derived artifact: extractor/model and version, prompt/template and version, evaluation-policy version, and selected Role profile and version. A new context applies only when derivation is explicitly run; historical Evidence, claims, analyses, and recommendations remain reproducible and unchanged.

### Role-profile drift

The deterministic difference between the Role profile version used by an existing analysis and the current selected version. Patch changes cover corrections or metadata; minor changes cover wording, evidence-expectation, or exemplar refinements; major changes add, remove, rename, or materially re-tier capabilities. Existing analyses and recommendations become visibly stale but are not recomputed automatically. The person decides when to recompute, with the exact capability-level diff and drift severity shown.

### Nuance evaluation

A judgment-focused evaluation of capability matching that tests transferable experience, narrow mechanism gaps, explicit evidence citations, direct versus transferable versus missing capability, clear decision explanations, and actionable next steps. The initial evaluation contract is hybrid: deterministic versioned JSON fixtures assert exact structured behavior, while nuance cases use a versioned model, prompt, and rubric. Required rubric dimensions are conjunctive; an aggregate score cannot compensate for a missing safety-critical dimension. LLM judges may pass cases automatically, with results and evidence retained for audit.

### Local-first persistence

The MVP stores the person’s source evidence, profile state, provenance, and generated outputs in the person’s local workspace. The domain model should keep a clear storage boundary so the same durable state can later be persisted in an external database for multi-user or hosted operation.

### Market relevance

A future capability that keeps role profiles and capability expectations aligned with the changing job market. It is not autonomous market discovery in the MVP.

## Agreed MVP boundaries

- CV-only onboarding is sufficient to start.
- Additional user interactions may add profile knowledge and improve later recommendations.
- New profile information causes recommendations to be recalculated from the current profile.
- Original evidence and generated outputs remain separate.
- The MVP uses one user-selected, versioned role profile.
- Automatic learning is allowed, but profile claims retain provenance and Known/Inferred/Unknown status.
- Local-first persistence is required; hosted multi-user storage is a later evolution.
