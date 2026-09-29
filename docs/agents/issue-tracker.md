# Issue tracker: Local Markdown

Issues and specs for this repo live as markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The spec is `.scratch/<feature-slug>/spec.md`
- Implementation issues are one file per ticket at `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`, never a single combined tickets file
- Triage and workflow state lives in **three separate lines** near the top of each issue file — never mix their vocabularies:
  - `Status:` — the five triage roles from `triage-labels.md` (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`) **plus `resolved`** once the ticket is implemented/answered. This is the only line triage reads.
  - `Category:` — triage's category role: exactly one of `bug` / `enhancement` (see `triage-labels.md`).
  - `Claim:` — wayfinder's claim state (`claimed` while worked, absent otherwise). `claimed` never goes in `Status:` (it would overwrite triage state); `resolved` never goes in `Claim:`.
- Comments and conversation history append to the bottom of the file under a `## Comments` heading

## Discovery — where to look for incoming work

- **In the tracker:** `.scratch/<feature-slug>/issues/NN-*.md` with a `Status:` line (this is what triage queries).
- **Not yet filed (legacy/in-flight, still outside the tracker):**
  - `PLANNING/BUG-REPORT.md` — the real incoming bug report (10 findings). Its `Status: CONFIRMED/SUSPECTED` lines are **verification states, not triage roles**; when filing its findings, use `Status: needs-triage` and put verification in a separate `Verified:` line.
  - `.scratch/T1-completion.md` — a completion note, not an issue; rename/move to `<feature-slug>/completion.md` if it ever needs to be found by convention.

## When a skill says "publish to the issue tracker"

Create a new file under `.scratch/<feature-slug>/` (creating the directory if needed).

## When a skill says "fetch the relevant ticket"

Read the file at the referenced path. The user will normally pass the path or the issue number directly.

**Bare `#N` / `Closes #N` resolution:** every effort directory numbers from `01`, so a bare number is ambiguous. Grep `.scratch/*/issues/NN-*.md` for that number; if it matches in more than one directory, ask the user which effort — never guess. Files directly under `.scratch/` (no `issues/` subdirectory) are notes, not issues — ignore them when resolving numbers.

**Query (what triage calls "query the issue tracker"):** grep `^Status:` across `.scratch/*/issues/*.md` and bucket the files by value.

**Close:** set `Status: wontfix` (declined) or `Status: resolved` (done) and append a one-line reason under `## Comments`.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a file with one **child** file per ticket.

- **Label mapping (local tracker)**: the skills' `wayfinder:map` label IS the `map.md` file itself; a ticket's `wayfinder:<type>` is its `Type:` line — no GitHub-style label files exist or are needed.

- **Map**: `.scratch/<effort>/map.md` (the Notes / Decisions-so-far / Fog body).
- **Child ticket**: `.scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the question in the body. A `Type:` line records the ticket type (`research`/`prototype`/`grilling`/`task`); a `Claim:` line records `claimed` while it is being worked; completion sets `Status: resolved`.
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every file it lists shows `Status: resolved`.
- **Frontier**: scan `.scratch/<effort>/issues/` for files that are open, unblocked, and unclaimed; first by number wins.
- **Claim**: set `Claim: claimed` and save before any work.
- **Resolve**: append the answer under an `## Answer` heading, set `Status: resolved`, then append a context pointer (gist + link) to the map's Decisions-so-far in `map.md`.
