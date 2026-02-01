# Ling AI Agent Dashboard - Phase 1 Context

**Gathered:** 2026-02-01
**Status:** Deep analysis complete, ready for planning

---

## Visual Reference Analysis

### What This Is
A sophisticated AI agent orchestration dashboard called "Ling" that provides:
- Real-time chat interface with AI agents
- Activity feed tracking agent operations
- Memory graph visualization showing relationships between memories
- Active agent monitoring with runtime stats
- Knowledge/memory management system

### Exact Layout Structure

**Header (Full Width):**
- Height: ~60px
- Background: #111111 (near black)
- Left: Logo (orange brain icon) + Navigation tabs: Files | Graph | Costs | Cascade
- Right: Status bar with monospace stats: "opus | 572 memories | 228 episodes | — today | next: 9:00pm | 6:54 PM"

**Left Panel - Chat Interface (~55% width):**
- Background: #0D0D0D (deep black)
- Tab bar: CHAT (active with orange underline) | DIGEST | NEWS
- Message area with timestamp alignment (right-aligned: 18:50, 18:51)
- Message format:
  - User: "you" label, white text
  - Agent: "ling 🧠" label, orange text for "ling"
  - Code inline formatting with monospace
  - Spawn badges with "DONE" status indicators (green dot)
- Input area at bottom with placeholder "Message ling..."
- Helper text: "Enter send · Shift+Enter newline"

**Right Panel - Dashboard (~45% width):**
Split into sections:

1. **Activity Feed** (top section)
   - Badge + Title + Date format
   - Badges: "MAIN" (orange background), "CRON" (gray background)
   - Monospace titles: "2026-01-31-social-scrape", etc.
   - Full-width list, scrollable

2. **Memory Graph** (middle, larger)
   - Particle/network visualization
   - Orange dots (#E07020) with connecting lines
   - Animated/scattered pattern
   - Takes ~60% of right panel width

3. **Agents Table** (middle-right)
   - Headers: AGENT | STATUS | TIME | MODEL
   - Rows show: ralph-router, ralph-api
   - Status: "run" with green indicator
   - Runtime: "~2m31s" format
   - Model: "default"

4. **Recent Memories** (bottom section)
   - Card-based layout
   - Timestamps like "16m ago", "24m ago"
   - Memory content previews
   - Grid layout (2 columns implied)

### Exact Color Palette

**Backgrounds:**
- Deepest: #0A0A0A (input fields)
- Dark: #0D0D0D (main chat bg)
- Panel: #111111 (header)
- Card: #171717 / #1A1A1A (elevated surfaces)
- Hover: #222222

**Text:**
- Primary: #E5E5E5 (off-white)
- Secondary: #999999 (gray)
- Muted: #666666 (timestamps, metadata)
- Agent name: #E07020 (orange)

**Accents:**
- Orange primary: #E07020 (burnt orange)
- Orange hover: #D96C1A
- Status green: #22C55E (bright green dot)
- Badge MAIN: subtle orange/amber bg
- Badge CRON: #374151 (dark gray)

**Borders:**
- Subtle: #2A2A2A
- Divider: #333333
- Active: #404040

### Typography

**Font Family:**
- Primary: JetBrains Mono or Fira Code (monospace throughout)
- Possibly Inter or similar for some UI elements
- Everything is monospace-dominant

**Sizes:**
- Header nav: 13-14px
- Tab labels: 12px uppercase
- Message text: 14px
- Timestamps: 11px
- Badges: 10px uppercase
- Stats bar: 12px monospace

**Weights:**
- Labels/headers: 600 (semibold)
- Body: 400 (regular)
- Badges: 700 (bold)

### Interactions & Features Implied

1. **Chat System:**
   - Real-time messaging
   - Command parsing ("spawn two agents")
   - Task tracking with completion badges
   - Code formatting support

2. **Agent Orchestration:**
   - Multiple agents can run simultaneously
   - Status monitoring (run/stopped/error)
   - Runtime tracking
   - Model assignment

3. **Memory System:**
   - Graph-based memory visualization
   - Episode tracking (228 episodes)
   - Memory count (572 memories)
   - Recent memory recall

4. **Activity Tracking:**
   - Categorized by type (MAIN, CRON)
   - Timestamped operations
   - Named operations (social-scrape, etc.)

5. **Navigation:**
   - Tab switching (Files, Graph, Costs, Cascade)
   - Chat/Digest/News switching
   - Likely routing between views

---

## Implementation Decisions

### Tech Stack
- **Framework:** React + TypeScript (proper component architecture)
- **Styling:** Tailwind CSS with custom color tokens
- **State:** Zustand or Redux for agent/memory state
- **Graph:** D3.js or React Force Graph for memory visualization
- **Real-time:** WebSocket or Server-Sent Events for live updates
- **Backend:** Node.js + Express API
- **Database:** SQLite or PostgreSQL for memories/episodes

### Architecture
- Single-page application (SPA)
- Component-based structure
- Real-time data synchronization
- Responsive layout (but desktop-first given complexity)

### Features Phase 1 (MVP)
1. Static layout matching screenshot exactly
2. Dark theme with exact color palette
3. Chat interface (static/demo data)
4. Activity feed (static data)
5. Memory graph visualization (animated nodes)
6. Agents table (static data)
7. Recent memories grid

### Features Phase 2 (Functional)
1. Real chat interface with API
2. Live agent spawning/monitoring
3. Real memory graph from qmd
4. Activity feed from git/system
5. WebSocket connections

---

## Deferred to Future Phases
- User authentication
- Multi-user support
- Mobile responsiveness
- Advanced graph filtering
- Cost tracking integration
- Cascade view implementation
- Episode timeline view
