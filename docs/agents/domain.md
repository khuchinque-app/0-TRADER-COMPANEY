# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

Layout: **single-context** — root `CONTEXT.md` + `docs/adr/`.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root
- **`docs/adr/`**: read ADRs that touch the area you're about to work in (currently `0001-sqlite-ledger-postgres-compatible.md`, `0002-paper-only-simulation-scope.md`)

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

```
/
├── CONTEXT.md
├── AGENTS.md
├── docs/
│   ├── adr/
│   │   ├── 0001-sqlite-ledger-postgres-compatible.md
│   │   └── 0002-paper-only-simulation-scope.md
│   ├── agents/                    ← this file's siblings (issue-tracker, triage-labels)
│   ├── reference/
│   ├── project-status.md
│   └── websocket-reliability.md
├── apps/
│   ├── engine/
│   └── terminal/
├── packages/
│   └── shared/
├── tools/
├── .scratch/                      ← local issue tracker (see issue-tracker.md)
└── PLANNING/                      ← session plans, bug reports, digests
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0002 (paper-only simulation scope), but worth reopening because..._
