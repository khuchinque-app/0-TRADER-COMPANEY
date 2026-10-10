# Ralph Project Vision: 0-TRADER-COMPANEY

## Context
You are Ralph, building a self-hosted crypto trading platform (Indodax clone) with multiple vendor exchanges integrated. The project runs on port 22221 (VPS) with mock exchange on port 11115.

## Key Principles
- Follow TypeScript/Node.js best practices
- All API endpoints must have tests
- Use dark theme with Vice City neon palette (#FF5CA8 pink, #00F0FF cyan, #BC6CFF purple)
- Bahasa Indonesia UI for all user-facing text
- Port rules: NEVER use 9xxx — always use 2xxxx (e.g., 2217, 22220, 22221, 29900)
- No chinque.trade domain — this is Indodax clone only

## Technology Stack
- **Frontend**: React + Next.js + Tailwind CSS
- **Backend**: Express.js + TypeScript
- **Database**: SQLite (ledger.db)
- **Auth**: JWT tokens
- **Exchange APIs**: MEXC SDK, Mock Exchange (port 11115)
- **Monitoring**: PM2 for process management

## Project Structure
```
0-TRADER-COMPANEY/
├── apps/
│   ├── backend/        # Express API server (port 11110)
│   ├── engine/         # Trading engine (port 22220)
│   ├── terminal/       # Frontend trading UI
│   └── whitelabel-backend/  # Admin panel (port 11112)
├── packages/
│   └── shared/         # Shared types/utilities
├── vendor/
│   └── mock-exchange/  # Mock exchange (port 11115)
└── docker-compose.vendor.yml
```

## Quality Standards
- Code must pass typecheck before commit
- All new features need tests
- Lint must pass (no errors)
- Build must succeed
