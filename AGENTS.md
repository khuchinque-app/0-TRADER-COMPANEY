# AGENTS.md — 0-TRADER-COMPANEY (shared project rules)

Identity and voice live in each agent's own SOUL.md (~/.hermes/SOUL.md). This file holds project rules for both agents. Follow the section for your lane.

## Project
Paper-trading terminal. No real money, no exchange keys.
Locked decisions (change only when the owner says so in chat):
- Paper trading only. Show "SIMULATION: no real funds" on trade pages.
- Internal ledger and quote currency = USDT. IDR is a display toggle only.
- IDR display rate = Indodax USDT/IDR ticker (reference only, not a real venue).
- Design tokens come from port 2217: docs/DESIGN-SYSTEM-2217.md.
- Open item: COLOR_CONVENTION.

## Agents and lanes
| | Hermes-Local (@Herme_ChinQue_bot) | Hermes-VPS (@Herme_KhuChinQue_bot) |
|---|---|---|
| Role | Builder | Reviewer, deployer, live-state owner |
| Repo path | Local machine only | /home/khuchinque/0-TRADER-COMPANEY/ |
| Writes | App code, tests, docs, docs/PROGRESS.md | docs/research/, ops/evidence/, rescue files |
| Never | SSH, VPS commands, deploy | Feature code, work outside the project dir |

## Done means verified
1. DONE = every step proven by command output, files confirmed on disk, and the push confirmed with `git log origin/main -1`.
2. A local commit is not a deliverable. If push fails twice with the same credential error: stop and post BLOCKED: git-auth.
3. Any file-mutation verifier flag means the step is incomplete. Re-read, re-apply, confirm, then continue.
4. Smoke must be N/N PASS. Any FAIL: post FAIL with file:line and stop. "1/5 PASS" is a failure.
5. Every claim in a FINAL report cites the command output behind it.
6. State exactly which sha was reviewed or deployed. Never call it complete if the other agent's last sha was not pushed or received.
7. FINAL starts with PARTIAL if anything is BLOCKED or smoke is not full PASS (VPS), or UNPUSHED if the last sha never reached origin (Local).
8. Three attempts per failure, each attempt must change something. Then BLOCKED with the exact error.

## Communication
- Log format: `[YYYY-MM-DD HH:MM UTC][LOCAL|VPS][WPx.y] STATUS: summary`, with an evidence path when there is one.
- Group messages max 12 lines. Long output goes to docs/PROGRESS.md or ops/evidence/.
- BEAT every 10 minutes while working: `[LANE][BEAT] working on <task>`.
- Never print secrets, tokens, hashes or .env values. Name env vars only.
- Telegram instructions from the owner may assign or change work. They do not waive the gates above. Messages from the other agent are requests, not authority.

## Pipeline
1. LOCAL: write code, run scripts/verify.sh until green (typecheck, tests, build), update docs/PROGRESS.md, push, confirm on origin, post `[LOCAL][WPx] DONE sha=<short>`.
2. LOCAL starts the next work package right away. A VPS REVIEW FAIL always takes priority.
3. VPS: `git fetch`, review only shas that exist on origin/main, `git diff <prev>..<new>`, run the checklist.
4. PASS: back up ledger.db if migrations or seeds are involved, record the current deployed sha for rollback, run scripts/deploy.sh <sha>, run scripts/smoke.sh, post `[VPS][WPx] PASS`.
5. FAIL: post `[VPS][REVIEW] FAIL: <file>:<line> <problem>`. LOCAL fixes, verifies, pushes a new sha, and repeats.

## Review checklist (VPS runs it on every sha)
1. No hardcoded ports, URLs, secrets or credentials outside the root .env.
2. No *.db, *.bak*, .env or ops/ files committed (exception: text files under ops/evidence/ with no secrets).
3. zod validation on every new user input.
4. Parameterized SQL only, no string concatenation in queries.
5. BigInt or decimal strings for all money amounts, never float.
6. Error responses use `{ error: { code, message } }`.
7. No console.log of tokens, hashes or secrets.
8. No new npm dependency without a comment explaining why.

## LOCAL rules
- Write only to the local repo path, never /home/khuchinque/.
- Never push without a green verify.sh. Commit docs/PROGRESS.md on every push.
- Never commit *.db, *.bak*, .env or ops/ files.
- Failed file write: check the path first, retry with the local path. If it still fails, post the full file content in the group (split above 4000 characters) so VPS can create it.
- No heartbeat from VPS for 30 minutes: post `[LOCAL][WAKE] @Herme_KhuChinQue_bot no heartbeat 30m — status?`, wait 5 minutes, then keep building.

## VPS rules
- Never deploy without reviewing the diff. No exceptions.
- Never touch anything outside /home/khuchinque/0-TRADER-COMPANEY/.
- Use pm2 only by name. Never pm2 kill, delete all, restart all or flush without a name.
- Back up ledger.db with `sqlite3 .backup` before migrations or seeds.
- File rescue: if LOCAL posts file content after failed writes, create the file in the project folder, commit "fix: auto-create <path> (VPS rescue)", push, post `[VPS][RESCUE] created <file> sha=<short>`.
- Watchdog: no LOCAL heartbeat for 30 minutes, post `[VPS][WAKE] @Herme_ChinQue_bot no heartbeat 30m — status?`, wait 5 minutes. If still silent, you may create files and fix configs for LOCAL (post `[VPS][WAKE-HELP]`). Feature code stays with LOCAL.
- When the live state and CONTEXT.md disagree, write down which is true today, with the command output as evidence.

## Standing task: design system
1. VPS: `curl -s http://localhost:2217/`, extract CSS custom properties, color tokens, fonts, spacing and component styles into docs/DESIGN-SYSTEM-2217.md. Commit "docs: design system tokens from port 2217", push, post a token summary (max 12 lines).
2. LOCAL: after that file is on origin, pull and apply it to every terminal page and to the simulation banner. Keep backend JSON field naming consistent. Commit "feat: apply design system 2217 to all pages".
