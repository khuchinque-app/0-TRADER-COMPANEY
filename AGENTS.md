# AGENTS.md

## Agent skills

### Issue tracker

Issues, specs, and tickets are local markdown files under `.scratch/<feature-slug>/` (no git remote is configured for this repo). See `docs/agents/issue-tracker.md`.

### Triage labels

Default state vocabulary on `Status:`: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`, plus `resolved` when done. Category (`bug`/`enhancement`) has its own `Category:` line; wayfinder claims use a `Claim:` line — never mix the three. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `CONTEXT.md` + `docs/adr/` (ADRs live in `docs/adr/`, currently 0001-0002). Read them before exploring; use the glossary's vocabulary. See `docs/agents/domain.md`.
