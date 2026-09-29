RULE.md — coding agent rules for this project
═══════════════════════════════════════════════════════════════════════════

SCOPE
─────
Focus only on engineering skills. No product redesign, no scope expansion,
no "improvement" of the spec. If the spec is ambiguous, grill — do not guess
and do not substitute your own idea.

═══════════════════════════════════════════════════════════════════════════

PHASE 0 — ACTIVE GRILL (before anything else)
──────────────────────────────────────────────
Actively grill the user. Ask sharp, numbered questions about ambiguity,
contradictions, and missing pieces. One question per line. 
- Write your questions to a file named `q1q5.txt`. 
- If the file disappears upon next scan, look for `answerq1q5.txt` to read the user's answers.
- If `q1q5.txt` remains unanswered in the directory, proceed autonomously with your best judgment.
- Once `answerq1q5.txt` has been read and its decisions absorbed, delete it too — same as the user deletes `q1q5.txt`. Deletion is the handshake: an answer file that still exists has not been consumed yet.
No filler, no praise, no restating the request.

═══════════════════════════════════════════════════════════════════════════

PHASE 1 — READ
───────────────
Read `TASK.md` (the prompt) thoroughly.
Analyze the `TRADING-COMPANEY/PLANNING` project folder, the `sitemap-complete` folder, and the `ENDGOAL-PROJECT/ENDGOAL-PROJECT.TXT` file. 
Do NOT modify them. Do NOT start coding before these are fully read and understood.

═══════════════════════════════════════════════════════════════════════════

PHASE 2 — WRITE / UPDATE PLAN-TO-DO.md
──────────────────────────────
Manage `PLAN-TO-DO.md` with this exact structure:

    example task 1 coding  [ ]
    example task 1 testing [ ]
    example task 2 coding  [ ]
    example task 2 testing [ ]

Rules for the file:
- If `PLAN-TO-DO.md` already exists, append to the list. Do not overwrite or recreate it.
- Every task has exactly two lines: `coding` and `testing`.
- Format: `<task name> coding [ ]` and `<task name> testing [ ]`.
- One task per logical unit of work. Small. Testable.
- No nested bullets, no prose inside the file. Just the task list.

═══════════════════════════════════════════════════════════════════════════

PHASE 3 — SWARM REVIEW
───────────────────────
Call the swarm code-reviewer agent to review, correct, and modify the `PLAN-TO-DO.md` list.

- This MUST be done every single time a task from `PLAN-TO-DO.md` is completed to review the work and update the file.
- Trigger is code, not turns: a swarm review is dispatched ONLY when code or scripts were actually written or changed. Docs, planning, git paperwork, and status turns need no reviewer fan-out — validate findings inline. The reviewers review code; they never write code.
- The code-reviewer agent is the ONLY writer allowed to correct or modify task text in `PLAN-TO-DO.md`.
- The coding agent proposes; the code-reviewer agent corrects.

═══════════════════════════════════════════════════════════════════════════

CHECKBOX OWNERSHIP
──────────────────
The AI coding agent may READ `PLAN-TO-DO.md` but MUST NOT:

    ✗ tick a box to [x]
    ✗ mark a box with an x
    ✗ modify checkbox state in any way
    ✗ add or remove [ ] lines

Only the USER may mark checkboxes. The user marks a task complete when
they accept the work. The checkbox is the user's acceptance gate, not
the agent's progress bar.

═══════════════════════════════════════════════════════════════════════════

EXECUTION LOOP (tidy version)
──────────────────────────────
think → write small → verify → think → write small → verify → commit → repeat

Concretely:
  1. Think   — plan ≤5 bullets. State assumptions.
  2. Write   — one logical change. One file if possible.
  3. Verify  — run tests / lint / reproduce the behavior.
  4. Commit  — only after green. Clear message.
  5. Repeat  — next thought is based on reality, not hope.

Anti-patterns to avoid:
  ✗ think think think write write write (big-bang rewrite)
  ✗ skipping verify
  ✗ marking checkboxes
  ✗ writing on a dirty tree without a checkpoint
  ✗ full-file rewrites when a patch would do
  ✗ system file-write timeout → retry without checking (timeouts often succeeded)

Slogan:
  Think a little, write a little, verify a lot.

═══════════════════════════════════════════════════════════════════════════

HARD RULES
──────────
- Never commit red.
- One logical change per commit.
- If a change touches >2 files, stop and split into smaller commits.
- If diff > ~100 lines without a test run, halt.
- Never silently reconcile conflicts with existing docs — list them.
- After each commit, report: hash, files changed, test command, result,
  next step. If blocked, state blocker and ask.
- Ensure CSS and JS are thoroughly applied to match the design views in `ENDGOAL-PROJECT`.

═══════════════════════════════════════════════════════════════════════════

SESSION START
─────────────
Every session begins with:
  1. Checkpoint the dirty tree. Confirm `git status` clean.
  2. Read `TASK.md`, `TRADING-COMPANEY/PLANNING`, `sitemap-complete`, and `ENDGOAL-PROJECT`.
  3. Grill the user (Phase 0) if anything is ambiguous via `q1q5.txt`.
  4. Write or update `PLAN-TO-DO.md` (Phase 2).
  5. Call the swarm code-reviewer agent (Phase 3).
  6. Wait for user to accept the plan.
  7. Enter the execution loop. One task at a time.
  8. Stop after each task. Report. Wait for user to tick the box.
  9. If your memory is full or becomes 97 percent or more, put all important logs inside the project folder.
The user ticks the box. Not you.
