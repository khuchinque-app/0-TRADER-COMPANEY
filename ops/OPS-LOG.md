## STATUS
Milestone: M1 (Auth) in progress
Working on: WP2 (Backend auth routes, .env, deploy scripts)
Blocked: none
Deployed on VPS: fff52fd (pre-phase)
Open FAILs: none

## WP0 Summary
- R1: Backend holding ledger.lock (PID 3054376). Engine also holds it (PID 3054693). Both can read; writes need coordination.
- R2: Terminal build valid. Next.js 16.0.1, BUILD_ID present, no errors.
- R5: git ls-remote origin success -> public clone or SSH key works.
- R6: *.db not tracked by git. Safe to keep live DB.
- PM2: backend (11110), terminal (22220), engine (3001) - all online.
- Other projects PM2 apps observed (not touched).

## WP2 Progress
- Auth login works via engine port 3001
- Backend port 11110 needs auth routes added (register, login, me)
- Missing: .env, deploy scripts, markets endpoint on backend
- Next: create backend auth routes, update ecosystem.config.js, create .env
