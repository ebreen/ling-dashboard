# Phase 1: Foundation & Static UI - Implementation Plan

## Goal
Build pixel-perfect static UI matching the reference screenshot exactly.

---

## Technical Stack
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Fonts:** JetBrains Mono (primary), Inter (secondary if needed)
- **Graph:** D3.js for memory visualization

---

## Component Architecture

### Layout Components
```
App
├── Header (fixed, full-width)
├── MainLayout (flex, full height minus header)
│   ├── ChatPanel (55% width, flex column)
│   │   ├── ChatTabs
│   │   ├── ChatMessages (scrollable)
│   │   └── ChatInput
│   └── DashboardPanel (45% width, grid)
│       ├── ActivityFeed
│       ├── MemoryGraph
│       ├── AgentsTable
│       └── RecentMemories
```

### Color Tokens (Tailwind Config)
```javascript
colors: {
  background: {
    deepest: '#0A0A0A',
    dark: '#0D0D0D',
    panel: '#111111',
    card: '#171717',
    hover: '#222222',
  },
  text: {
    primary: '#E5E5E5',
    secondary: '#999999',
    muted: '#666666',
  },
  accent: {
    orange: '#E07020',
    'orange-hover': '#D96C1A',
    green: '#22C55E',
  },
  border: {
    subtle: '#2A2A2A',
    divider: '#333333',
    active: '#404040',
  }
}
```

---

## File Structure
```
ling-dashboard/
├── .planning/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── MainLayout.tsx
│   │   │   ├── ChatPanel.tsx
│   │   │   └── DashboardPanel.tsx
│   │   ├── chat/
│   │   │   ├── ChatTabs.tsx
│   │   │   ├── ChatMessages.tsx
│   │   │   ├── ChatMessage.tsx
│   │   │   └── ChatInput.tsx
│   │   ├── dashboard/
│   │   │   ├── ActivityFeed.tsx
│   │   │   ├── ActivityItem.tsx
│   │   │   ├── MemoryGraph.tsx
│   │   │   ├── AgentsTable.tsx
│   │   │   └── RecentMemories.tsx
│   │   └── shared/
│   │       ├── Badge.tsx
│   │       └── StatusIndicator.tsx
│   ├── hooks/
│   │   └── useMemoryGraph.ts
│   ├── types/
│   │   └── index.ts
│   ├── data/
│   │   └── demoData.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## Implementation Steps

### 1. Project Setup (10 min)
- Initialize Vite + React + TypeScript
- Install dependencies
- Configure Tailwind with custom colors
- Setup fonts (JetBrains Mono)

### 2. Types & Data (15 min)
- Define TypeScript interfaces
- Create demo data matching screenshot exactly

### 3. Layout Components (30 min)
- Header with exact styling
- Main layout structure
- Panel containers

### 4. Chat Panel (45 min)
- Chat tabs (CHAT/DIGEST/NEWS)
- Message list with proper alignment
- Individual message component
- Input area with placeholder

### 5. Dashboard Panel (30 min)
- Grid layout structure
- Section containers

### 6. Activity Feed (20 min)
- List layout
- Badge component (MAIN/CRON)
- Activity item styling

### 7. Memory Graph (45 min)
- D3.js setup
- Node/link data structure
- Animation loop
- Responsive sizing

### 8. Agents Table (20 min)
- Table layout
- Status indicators
- Runtime formatting

### 9. Recent Memories (15 min)
- Grid layout
- Memory card styling
- Timestamp formatting

### 10. Polish (20 min)
- Scrollbar styling
- Hover effects
- Animation refinements
- Final visual check against screenshot

---

## Demo Data Requirements

### Chat Messages (5 messages)
1. User: "which tables do we need to store episodes? should episodes be tied to a session or independent?"
2. Agent: "episodes should be **independent** with a `session_id` foreign key. we need: `episodes`, `episode_tags`, `episode_links`"
3. User: "spawn two agents to implement the sqlite schema and api endpoints in parallel"
4. Agent: "spawning two ralphs to work in parallel..." + 2 spawn badges
5. Agent: "both agents done! **worked for 2.5s**" + results

### Activity Feed (6 items)
- MAIN: social-scrape (2026-01-31)
- CRON: openclaw-upgrade (2026-01-31)
- MAIN: bootstrap-limit (2026-01-31)
- MAIN: linkedin-rapidapi (2026-01-31)
- CRON: episode-system (2026-01-30)
- MAIN: lancedb-hardening (2026-01-30)

### Agents (2 items)
- ralph-router: run, ~2m31s, default
- ralph-api: run, ~2m32s, default

### Recent Memories (4 items)
- "episodes table schema with foreign keys to sessions" (16m ago)
- "spawn pattern for parallel agent execution" (24m ago)
- "sqlite migration strategy using better-sqlite3" (1h ago)
- "api endpoint design for episode crud operations" (2h ago)

---

## Visual Checklist

### Header
- [ ] Logo/brain icon (orange)
- [ ] Navigation tabs with correct spacing
- [ ] Stats bar with monospace formatting
- [ ] Exact colors and borders

### Chat Panel
- [ ] Tab bar with active indicator (orange underline)
- [ ] Message alignment (left content, right timestamps)
- [ ] Avatar styling (user vs agent)
- [ ] Code inline formatting
- [ ] Spawn badges with green dots
- [ ] Input placeholder styling

### Activity Feed
- [ ] Badge colors (orange MAIN, gray CRON)
- [ ] Monospace titles
- [ ] Proper spacing between items

### Memory Graph
- [ ] Orange nodes
- [ ] Connecting lines
- [ ] Animation/movement
- [ ] Proper sizing within container

### Agents Table
- [ ] Column headers
- [ ] Green status dots
- [ ] Monospace runtime
- [ ] Row hover effects

### Recent Memories
- [ ] Card layout
- [ ] Timestamp styling
- [ ] Grid arrangement

---

## Success Metrics
- Side-by-side comparison with screenshot shows 95%+ match
- All animations smooth (60fps)
- No layout shifts on resize
- Pixel-perfect spacing and colors
