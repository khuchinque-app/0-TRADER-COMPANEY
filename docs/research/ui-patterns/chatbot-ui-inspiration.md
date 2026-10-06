# Chatbot UI Patterns Research
**Date:** 2026-10-06 23:50 UTC  
**Purpose:** Find inspiration for Trading Company's AI agent UI with workflow visualization

---

## 🎯 Target Features

1. **Chat Interface** — Conversational UI for agent interaction
2. **Tabs System** — Separate panels for different contexts
3. **Workflow Visualization** — Show agent progress as visual steps
4. **Real-time Updates** — Live status updates as agent works
5. **Git Integration** — Show commits, branches, PRs in UI

---

## 📚 Research Findings

### 1. OpenClaw Mission Control
**Source:** https://github.com/openclaw/mission-control (hypothetical)
**Features:**
- Multi-agent fleet management
- Task scheduling dashboard
- Real-time agent status indicators
- Workflow builder with visual nodes
- WebSocket live updates

**Key UI Patterns:**
```
┌─────────────────────────────────────────┐
│  [Agent 1] [Agent 2] [Agent 3]          │ <- Tab selector
├─────────────────────────────────────────┤
│  Status: 🟢 Running                     │
│  Progress: ████████░░ 80%               │
├─────────────────────────────────────────┤
│  Timeline:                              │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐      │
│  │ Init│─▶CodeGen│─▶Test │─▶Deploy│     │
│  └─────┘ └─────┘ └─────┘ └─────┘      │
├─────────────────────────────────────────┤
│  Log Output:                            │
│  > Building...                          │
│  > Tests passing...                     │
│  > Deploying...                         │
└─────────────────────────────────────────┘
```

### 2. Qwen Code Studio
**Source:** https://qwenlm.github.io/qwen-code-docs/
**Features:**
- Chat-style coding interface
- Real-time file editing
- Web search integration
- Worktree isolation for parallel tasks
- Built-in terminal

**Key UI Patterns:**
```
┌─────────────────────────────────────────┐
│  💬 Chat          📁 Files    ⚙️ Settings│
├──────────────┬──────────────────────────┤
│              │                          │
│  User:       │  📄 index.ts             │
│  Fix bug     │  ─────────────────       │
│              │  line 42: typo fix       │
│  ─────────   │  line 45: add import     │
│  AI:         │                          │
│  Fixed!      │  📄 package.json         │
│  (preview)   │  dependencies updated    │
│              │                          │
├──────────────┴──────────────────────────┤
│  [Terminal] [Preview] [Issues]          │ <- Bottom tabs
└─────────────────────────────────────────┘
```

### 3. Claude Code / Cursor AI
**Features:**
- Sidebar with conversation history
- File tree navigation
- Inline code editing
- Terminal integration
- Task list sidebar

**Key UI Patterns:**
```
┌─────────┬───────────────────────────────┐
│ History │  💭 "Build a login form"      │
│         │                               │
│ Task 1  │  ✅ Created auth/page.tsx     │
│ Task 2  │  ✅ Added validation          │
│ Task 3  │  🔄 Testing...                │
└─────────┴───────────────────────────────┘
```

---

## 🎨 Vice City Theme Adaptation

### Tab Styles
```css
.tab-active {
  background: linear-gradient(135deg, #FF5CA8, #BC6CFF);
  color: white;
  box-shadow: 0 0 20px rgba(255, 92, 168, 0.5);
}

.tab-inactive {
  background: rgba(11, 15, 43, 0.8);
  color: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(0, 240, 255, 0.2);
}
```

### Progress Steps
```css
.step-complete {
  color: #00FF88;
  text-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
}

.step-active {
  color: #00F0FF;
  animation: pulse-cyan 2s infinite;
}

.step-pending {
  color: rgba(255, 255, 255, 0.3);
}
```

---

## 📋 Recommended Implementation

### Component Structure
```
app/agent-chat/
├── page.tsx                 # Main chat interface
├── components/
│   ├── ChatPanel.tsx        # Message list
│   ├── MessageInput.tsx     # Input area
│   ├── AgentTabs.tsx        # Tab navigation
│   ├── WorkflowView.tsx     # Progress visualization
│   └── TerminalView.tsx     # Output terminal
└── hooks/
    └── useAgentStream.ts    # WebSocket/ SSE handler
```

### Key Features to Build
1. **Multi-tab interface** — Chat, Workflow, Terminal, Git
2. **Real-time streaming** — Server-sent events for agent responses
3. **Progress visualization** — Step-by-step workflow display
4. **Git integration** — Show commits, diffs, PRs
5. **Agent status** — Online/offline, busy/idle indicators

---

## 🔧 Technical Stack

- **Frontend:** Next.js 14 + TypeScript
- **Styling:** Tailwind v4 + Vice City theme
- **Real-time:** Server-Sent Events (SSE) or WebSocket
- **State:** Zustand or React Query
- **Icons:** Lucide React

---

## 📊 Implementation Priority

| Feature | Priority | Effort |
|---------|----------|--------|
| Basic chat UI | P0 | 2 days |
| Tab navigation | P0 | 1 day |
| Workflow visualization | P1 | 3 days |
| Real-time updates | P1 | 2 days |
| Git integration | P2 | 2 days |
| Advanced features | P3 | 4 days |

---

**Next Steps:**
1. Create basic chat interface component
2. Add tab navigation
3. Implement workflow visualization
4. Connect to agent backend API

---
*Research completed: 2026-10-06*
