--- PROJECT_SUMMARY.md (原始)


+++ PROJECT_SUMMARY.md (修改后)
# Project Summary: 0-TRADER-COMPANEY Comprehensive Prompt

## What Was Created

I've successfully merged your existing project context with the new route-mirror exchange build instructions into **one comprehensive, unified prompt**.

## Files Created

### 1. `COMPREHENSIVE_PROJECT_PROMPT.md`
A complete markdown document containing:
- **Part A**: Full project context (existing architecture, services, database, APIs, milestones M0-M5)
- **Part B**: New build instructions for the route-mirror exchange on port 22221
- **Part C**: Milestones M6-M10 with acceptance criteria
- **Part D**: Remaining TODO items from the original build
- **Part E**: Deployment commands
- **Part F**: Agent lanes and logging rules

### 2. `src/promptData.ts`
TypeScript module exporting the full prompt as a string array, making it easy to:
- Import into React components
- Copy to clipboard
- Display in the web dashboard

### 3. `src/App.tsx` (Updated)
Interactive web dashboard with 6 tabs:
- **🏠 Overview**: Project identity, running services, key decisions
- **🏗️ Architecture**: Monorepo structure, database schema, tech stack
- **🔨 New Build**: Mission, hard rules, route map, milestones M6-M10, agent lanes
- **⚡ API**: Existing endpoints + new MEXC market API routes
- **📋 TODO**: Priority tasks organized by phase
- **📄 Full Prompt**: Complete merged prompt with copy button

## Key Features of the Merged Prompt

### Project Context (What Exists)
- **4 running services**: Backend (11110), Terminal (22220), Engine (3001), Static (2217)
- **Database**: SQLite with 21 tables, double-entry ledger, WAL mode
- **Completed**: Milestones M0-M5, 183/183 tests passing, 5/5 smoke tests
- **Tech stack**: Next.js 14, Express.js, TypeScript, Tailwind CSS, PM2

### New Build (What's Next)
- **Mission**: Add `apps/exchange` on port 22221 mirroring indodax.com paths 1:1
- **Data source**: MEXC public spot API (NO private endpoints, NO API keys)
- **Hard rules**:
  - MEXC = public endpoints only
  - Mirror paths, not identity (brand = "Simulasi Exchange")
  - Persistent simulation banner on every page
  - Browser never calls MEXC directly
- **~477 trading pairs** from Indodax sitemap
- **Route states**: LIVE (200), NO_FEED (200 with warning), 404 (not in manifest)

### Milestones M6-M10
- **M6**: gen-routes.mjs + routes.json + skeleton
- **M7**: packages/mexc-client + /api/market/* + cache
- **M8**: /market + /market/{PAIR} pages
- **M9**: depth_chart, chart pages + order form
- **M10**: smoke script + PM2 save + docs

### Agent Lanes
- **VPS agent** (@Herme_KhuChinQue_bot): ops/deploy (gen-routes, PM2, smoke tests)
- **Local agent** (@Herme_ChinQue_bot): code (apps/exchange, packages, backend routes)

## How to Use

### Option 1: Copy from Web Dashboard
1. Open the built web app (dist/index.html)
2. Navigate to the "📄 Full Prompt" tab
3. Click the "📋 Copy" button
4. Paste into any AI assistant

### Option 2: Copy from Markdown File
1. Open `COMPREHENSIVE_PROJECT_PROMPT.md`
2. Copy the entire content
3. Paste into any AI assistant

### Option 3: Import Programmatically
```typescript
import { FULL_PROMPT } from './src/promptData';
// Use FULL_PROMPT string in your application
```

## What Makes This Prompt Robust

1. **Complete context**: AI agents understand the full project state
2. **Clear boundaries**: Hard rules prevent mistakes (no MEXC keys, no brand copying)
3. **Specific deliverables**: Each milestone has clear acceptance criteria
4. **Agent coordination**: Lane split prevents conflicts
5. **Deployment ready**: Includes all commands to build and run
6. **Self-contained**: No external dependencies needed to understand the project

## Next Steps

1. **Copy the prompt** from the web dashboard or markdown file
2. **Paste into your AI agents** (VPS + local)
3. **Start with M6**: Generate routes and create the exchange skeleton
4. **Follow the milestones** sequentially through M10
5. **Run smoke tests** to verify each milestone

## Technical Details

- **Build tool**: Vite + React + TypeScript + Tailwind CSS
- **Output**: Static HTML/CSS/JS bundle in `dist/`
- **Size**: ~178 KB JS (gzipped: ~57 KB)
- **Browser support**: Modern browsers (ES2020+)

---

**Status**: ✅ Build successful, ready to use
**Last updated**: October 9, 2026
**Project**: 0-TRADER-COMPANEY
**VPS**: 187.127.178.20
