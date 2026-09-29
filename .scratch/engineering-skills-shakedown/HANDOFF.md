# HANDOFF — Engineering-Skills Shakedown (TRADING-COMPANEY)

Session 20260925_181357_36d9d7, profile herme-khuchinque.

## Done to date
- Config written: AGENTS.md, docs/agents/{issue-tracker,triage-labels,domain}.md. issue-tracker.md now has THREE slots (Status: 5 roles + resolved / Category: bug|enhancement / Claim: claimed), bare-#N disambiguation, Query/Close recipes, Discovery section.
- Toolchain wired: codegraph 1.6.0 MCP enabled, rtk 0.50 + Hermes plugin rtk-rewrite, graphify graph clean (matches HEAD; final ~870 nodes / 1180 edges / 117 communities; 0 style_grafik, 0 dist-alias duplicates).
- 5-lane swarm audit of 18 engineering skills: 1 BLOCKER (Status: double-book), ~15 MAJOR — all fixed by patch batches 1+2 (2026-09-25 ~21:1x). Known residue: code-review still fetches ONLY commit-message #refs (keyword-stripping reads NEXT line — typos like `Closes #6a43f7b` still resolve to wrong spec); 5 skills x 1 instance of #NN,NN numeric format per lane 2 but unmigrated (to-tickets local template uses NN-only Blocked by:).
- Verification baseline: npm run typecheck (root) GREEN? unknown pre-run — see G1. No root test script exists (lane-2 finding #9: AGENTS.md now documents this).

## Next phase plan (from user: "continue the progress; call your code-reviewer agents")
Phase G1-G2 / B1-B2 / Mix in .scratch/engineering-skills-shakedown/: baseline gates + scanner loop, then crash/typecheck-fix batches, then the mixed-agents expectation pack. Read HANDOFF.md in that dir (R3 ticket) for the exact ticket set and dispatch plan once tickets exist.

## Dispatch quotas
fish=65293 tokens LEFT of 90k. Reserve for ONE final per-batch review lane. Prefer cheap reads (read_file) over big sh(1) dumps; rtk read/grep -r for large files.